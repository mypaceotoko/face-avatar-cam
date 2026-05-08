import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'error';

export type CameraMode = 'front' | 'back' | 'back-wide';

export const CAMERA_MODE_LABEL: Record<CameraMode, string> = {
  front: 'インカメ',
  back: 'アウトカメ',
  'back-wide': 'アウトカメ (広角)',
};

const ALL_MODES: CameraMode[] = ['front', 'back', 'back-wide'];

export type UseCameraResult = {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  status: CameraStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  mode: CameraMode;
  availableModes: CameraMode[];
  setMode: (mode: CameraMode) => Promise<void>;
};

type ZoomCapability = { min: number; max: number; step?: number };
type ZoomSettings = { zoom?: number };

const baseVideo = (deviceId?: string): MediaTrackConstraints => ({
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 60 },
});

const FRONT_RE = /(front|user|self|前面|内側|内[側カ])/i;
const BACK_RE = /(back|rear|environment|背面|外側|外[側カ])/i;
const WIDE_RE = /(ultra[\s-]?wide|\bwide\b|広角|超広角)/i;

type DeviceMap = Partial<Record<CameraMode, string>>;

// Picks one deviceId per logical mode by inspecting labels. Labels are only
// populated after the first getUserMedia grant, so callers must enumerate
// after the initial stream is live.
async function classifyDevices(): Promise<DeviceMap> {
  if (!navigator.mediaDevices?.enumerateDevices) return {};
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
    const map: DeviceMap = {};

    // Prefer the most specific match (back+wide) over just "back".
    for (const cam of cams) {
      const label = cam.label;
      if (BACK_RE.test(label) && WIDE_RE.test(label)) {
        if (!map['back-wide']) map['back-wide'] = cam.deviceId;
      }
    }
    for (const cam of cams) {
      const label = cam.label;
      if (BACK_RE.test(label) && !WIDE_RE.test(label)) {
        if (!map.back) map.back = cam.deviceId;
      }
    }
    for (const cam of cams) {
      const label = cam.label;
      if (FRONT_RE.test(label) && !BACK_RE.test(label)) {
        if (!map.front) map.front = cam.deviceId;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function constraintsFor(mode: CameraMode, devices: DeviceMap): MediaStreamConstraints {
  const id = devices[mode];
  if (id) {
    return { audio: true, video: baseVideo(id) };
  }
  if (mode === 'front') {
    return { audio: true, video: { ...baseVideo(), facingMode: 'user' } };
  }
  // back / back-wide fallback when no matching deviceId surfaced — let the OS
  // pick any rear camera. Wide is handled afterwards via applyConstraints.
  return {
    audio: true,
    video: { ...baseVideo(), facingMode: { ideal: 'environment' } },
  };
}

// iOS Safari: video must have playsinline + muted + autoplay to render in-page.
// getUserMedia must be triggered by a user gesture (Start button).
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeState] = useState<CameraMode>('front');
  const [availableModes, setAvailableModes] = useState<CameraMode[]>(['front']);
  const devicesRef = useRef<DeviceMap>({});

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

  // Try a sub-1.0 zoom on the live track (ultra-wide on Android multi-lens
  // cameras). Best effort — silently no-op if the platform doesn't expose it.
  const tryApplyWideZoom = useCallback(async () => {
    const s = streamRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
      zoom?: ZoomCapability;
    };
    if (caps.zoom && caps.zoom.min < 1) {
      try {
        await track.applyConstraints({
          advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet & ZoomSettings],
        });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const refreshAvailableModes = useCallback(async () => {
    devicesRef.current = await classifyDevices();
    const modes = ALL_MODES.filter((m) => {
      if (m === 'front') return true; // front is always assumed available
      return !!devicesRef.current[m];
    });
    setAvailableModes(modes);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus('starting');
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        constraintsFor('front', devicesRef.current),
      );
      await attachStream(s);
      setModeState('front');
      setStatus('ready');
      // Labels become available after the first permission grant.
      void refreshAvailableModes();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  }, [attachStream, refreshAvailableModes]);

  const stop = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setModeState('front');
    setAvailableModes(['front']);
    devicesRef.current = {};
  }, []);

  const setMode = useCallback(
    async (next: CameraMode) => {
      if (next === mode) return;
      const prev = streamRef.current;
      if (!prev) return;

      try {
        // iOS Safari refuses simultaneous getUserMedia on two cameras, so the
        // old tracks are released before requesting the new stream.
        prev.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const constraints = constraintsFor(next, devicesRef.current);
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        await attachStream(s);
        setModeState(next);
        if (next === 'back-wide' && !devicesRef.current['back-wide']) {
          // No dedicated wide deviceId — try widening via the zoom constraint.
          await tryApplyWideZoom();
        }
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        // Best-effort fallback: try to bring the previous mode back so the
        // user isn't left with a black screen.
        try {
          const fallback = await navigator.mediaDevices.getUserMedia(
            constraintsFor(mode, devicesRef.current),
          );
          await attachStream(fallback);
        } catch {
          setStatus('error');
        }
      }
    },
    [attachStream, mode, tryApplyWideZoom],
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
    mode,
    availableModes,
    setMode,
  };
}
