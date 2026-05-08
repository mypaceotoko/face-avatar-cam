import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'error';

export type UseCameraResult = {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  status: CameraStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  wideAngle: boolean;
  wideAngleSupported: boolean;
  setWideAngle: (on: boolean) => Promise<void>;
};

type ZoomCapability = { min: number; max: number; step?: number };
type ZoomSettings = { zoom?: number };

const baseVideo = (deviceId?: string): MediaTrackConstraints => ({
  ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 60 },
});

const PREFERRED_CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: baseVideo(),
};

const WIDE_LABEL_PATTERNS = [
  /ultra[\s-]?wide/i,
  /\bwide\b/i,
  /広角/,
  /超広角/,
];

// Try to find a front-facing wide-angle camera by label. enumerateDevices() only
// reveals labels after the user has granted permission once.
async function findWideAngleDeviceId(currentDeviceId?: string): Promise<string | null> {
  if (!navigator.mediaDevices?.enumerateDevices) return null;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
    // Prefer labels that include both "front/user/前面" and a wide hint.
    const frontHint = /(front|user|self|前面|内[側カ])/i;
    const wide = cams.find(
      (d) =>
        d.deviceId !== currentDeviceId &&
        WIDE_LABEL_PATTERNS.some((re) => re.test(d.label)) &&
        frontHint.test(d.label),
    );
    if (wide) return wide.deviceId;
    // Fallback: any "wide" labelled cam other than the current one.
    const anyWide = cams.find(
      (d) => d.deviceId !== currentDeviceId && WIDE_LABEL_PATTERNS.some((re) => re.test(d.label)),
    );
    return anyWide?.deviceId ?? null;
  } catch {
    return null;
  }
}

// iOS Safari: video must have playsinline + muted + autoplay to render in-page.
// getUserMedia must be triggered by a user gesture (Start button).
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [wideAngle, setWideAngleState] = useState(false);
  const [wideAngleSupported, setWideAngleSupported] = useState(false);
  const wideDeviceIdRef = useRef<string | null>(null);
  const normalDeviceIdRef = useRef<string | null>(null);

  const attachStream = useCallback(async (s: MediaStream) => {
    streamRef.current = s;
    setStream(s);
    const v = videoRef.current;
    if (v) {
      v.srcObject = s;
      v.muted = true;
      v.playsInline = true;
      await v.play().catch(() => {
        v.addEventListener(
          'loadedmetadata',
          () => {
            void v.play();
          },
          { once: true },
        );
      });
    }
  }, []);

  // Probe whether wide-angle is achievable: either a sub-1.0 zoom range, or a
  // separate wide-labelled device. Run after the first stream is live so the
  // device labels are populated.
  const probeWideAngle = useCallback(async () => {
    const s = streamRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (!track) return;
    normalDeviceIdRef.current = track.getSettings().deviceId ?? null;

    let supported = false;

    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
      zoom?: ZoomCapability;
    };
    if (caps.zoom && typeof caps.zoom.min === 'number' && caps.zoom.min < 1) {
      supported = true;
    }

    const wideId = await findWideAngleDeviceId(normalDeviceIdRef.current ?? undefined);
    wideDeviceIdRef.current = wideId;
    if (wideId) supported = true;

    setWideAngleSupported(supported);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus('starting');
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia(PREFERRED_CONSTRAINTS);
      await attachStream(s);
      setStatus('ready');
      // Labels become available after the first permission grant; safe to probe now.
      void probeWideAngle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  }, [attachStream, probeWideAngle]);

  const stop = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setWideAngleState(false);
    setWideAngleSupported(false);
    wideDeviceIdRef.current = null;
    normalDeviceIdRef.current = null;
  }, []);

  const setWideAngle = useCallback(
    async (on: boolean) => {
      const s = streamRef.current;
      if (!s) return;
      const track = s.getVideoTracks()[0];
      if (!track) return;

      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        zoom?: ZoomCapability;
      };
      const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & ZoomSettings;

      // Path 1: same-device zoom (e.g. Android sub-1.0 zoom maps to ultrawide).
      if (caps.zoom && caps.zoom.min < 1) {
        const target = on ? caps.zoom.min : Math.min(1, caps.zoom.max);
        if (typeof settings.zoom !== 'number' || Math.abs(settings.zoom - target) > 1e-3) {
          try {
            await track.applyConstraints({
              advanced: [{ zoom: target } as MediaTrackConstraintSet & ZoomSettings],
            });
            setWideAngleState(on);
            return;
          } catch {
            // fall through to device-swap path
          }
        } else {
          setWideAngleState(on);
          return;
        }
      }

      // Path 2: swap to a separately-enumerated wide-angle device.
      const targetId = on ? wideDeviceIdRef.current : normalDeviceIdRef.current;
      if (!targetId) {
        // No way to honour the request; leave state alone.
        return;
      }
      try {
        // Stop the old tracks before starting new — iOS Safari refuses
        // simultaneous getUserMedia on two cameras.
        s.getTracks().forEach((t) => t.stop());
        const next = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: baseVideo(targetId),
        });
        await attachStream(next);
        setWideAngleState(on);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    },
    [attachStream],
  );

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    videoRef,
    stream,
    status,
    error,
    start,
    stop,
    wideAngle,
    wideAngleSupported,
    setWideAngle,
  };
}
