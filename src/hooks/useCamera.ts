import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'error';

export type CameraMode = 'front' | 'front-wide' | 'back' | 'back-wide';

export const CAMERA_MODE_LABEL: Record<CameraMode, string> = {
  front: 'インカメ',
  'front-wide': 'インカメ (広角)',
  back: 'アウトカメ',
  'back-wide': 'アウトカメ (広角)',
};

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
  torchOn: boolean;
  torchSupported: boolean;
  toggleTorch: () => Promise<void>;
};

type ZoomCapability = { min: number; max: number; step?: number };
type ZoomSettings = { zoom?: number };
type TorchSettings = { torch?: boolean };

const baseVideo = (deviceId?: string): MediaTrackConstraints => ({
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 60 },
});

const FRONT_RE = /(front|user|self|前面|内側)/i;
const BACK_RE = /(back|rear|environment|背面|外側)/i;
// "Back Dual Wide Camera" / "Back Triple Camera" are virtual multi-lens
// devices on iPhone whose ultrawide is reached via zoom < 1 — not via a
// distinct deviceId — so plain "wide" must NOT count as a wide-back device.
// Only ultrawide / 超広角 labels qualify here.
const ULTRAWIDE_RE = /(ultra[\s-]?wide|超広角)/i;

type DeviceMap = Partial<Record<CameraMode, string>>;

async function classifyDevices(): Promise<DeviceMap> {
  if (!navigator.mediaDevices?.enumerateDevices) return {};
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
    const map: DeviceMap = {};
    for (const cam of cams) {
      if (BACK_RE.test(cam.label) && ULTRAWIDE_RE.test(cam.label) && !map['back-wide']) {
        map['back-wide'] = cam.deviceId;
      }
    }
    for (const cam of cams) {
      if (BACK_RE.test(cam.label) && !ULTRAWIDE_RE.test(cam.label) && !map.back) {
        map.back = cam.deviceId;
      }
    }
    for (const cam of cams) {
      if (FRONT_RE.test(cam.label) && !BACK_RE.test(cam.label) && !map.front) {
        map.front = cam.deviceId;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function frontConstraints(deviceId?: string): MediaStreamConstraints {
  if (deviceId) return { audio: true, video: baseVideo(deviceId) };
  return { audio: true, video: { ...baseVideo(), facingMode: 'user' } };
}

function backConstraints(deviceId?: string): MediaStreamConstraints {
  if (deviceId) return { audio: true, video: baseVideo(deviceId) };
  return {
    audio: true,
    video: { ...baseVideo(), facingMode: { ideal: 'environment' } },
  };
}

function constraintsFor(mode: CameraMode, devices: DeviceMap): MediaStreamConstraints {
  // iPhones expose only one front lens; "front-wide" reuses the same device
  // and engages a wider FOV via zoom < 1 once the stream is live.
  if (mode === 'front' || mode === 'front-wide') return frontConstraints(devices.front);
  if (mode === 'back-wide') {
    // Prefer dedicated ultrawide device; otherwise reuse the standard back
    // device and engage ultrawide via zoom after the stream is live.
    return backConstraints(devices['back-wide'] ?? devices.back);
  }
  return backConstraints(devices.back);
}

function getZoomCaps(track: MediaStreamTrack | undefined): ZoomCapability | null {
  if (!track) return null;
  const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
    zoom?: ZoomCapability;
  };
  return caps.zoom ?? null;
}

async function applyZoom(track: MediaStreamTrack, zoom: number): Promise<boolean> {
  try {
    await track.applyConstraints({
      advanced: [{ zoom } as MediaTrackConstraintSet & ZoomSettings],
    });
    return true;
  } catch {
    return false;
  }
}

function hasTorchCapability(track: MediaStreamTrack | undefined): boolean {
  if (!track) return false;
  const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
  return !!caps.torch;
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
  // Latched once we observe zoom.min < 1 on the live front track. iPhones
  // never expose a separate ultrawide front device, so this is the only
  // signal that the front lens can be widened.
  const frontCanWidenRef = useRef(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

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

  const recomputeAvailable = useCallback(() => {
    const modes: CameraMode[] = ['front'];
    if (frontCanWidenRef.current) modes.push('front-wide');
    const hasBackDevice = !!devicesRef.current.back || !!devicesRef.current['back-wide'];
    if (hasBackDevice) modes.push('back');
    const liveCaps = getZoomCaps(streamRef.current?.getVideoTracks()[0]);
    const liveTrackCanWiden = !!liveCaps && liveCaps.min < 1;
    if (devicesRef.current['back-wide'] || liveTrackCanWiden) modes.push('back-wide');
    setAvailableModes(modes);
  }, []);

  const probeFrontWiden = useCallback((track: MediaStreamTrack | undefined) => {
    const caps = getZoomCaps(track);
    if (caps && caps.min < 1) frontCanWidenRef.current = true;
  }, []);

  const refreshDevices = useCallback(async () => {
    devicesRef.current = await classifyDevices();
    recomputeAvailable();
  }, [recomputeAvailable]);

  const updateTorchSupport = useCallback((track: MediaStreamTrack | undefined) => {
    setTorchSupported(hasTorchCapability(track));
    setTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !hasTorchCapability(track)) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & TorchSettings],
      });
      setTorchOn(next);
    } catch {
      // torch not available in this context
    }
  }, [torchOn]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus('starting');
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia(frontConstraints());
      await attachStream(s);
      probeFrontWiden(s.getVideoTracks()[0]);
      updateTorchSupport(s.getVideoTracks()[0]);
      setModeState('front');
      setStatus('ready');
      void refreshDevices();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  }, [attachStream, probeFrontWiden, refreshDevices, updateTorchSupport]);

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
    frontCanWidenRef.current = false;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const setMode = useCallback(
    async (next: CameraMode) => {
      if (next === mode) return;
      const prev = streamRef.current;
      if (!prev) return;

      // Fast path: switch back ↔ back-wide on the same multi-lens device
      // by adjusting zoom only. Avoids a getUserMedia round-trip and the
      // permission re-check flicker on mobile.
      if (
        (mode === 'back' || mode === 'back-wide') &&
        (next === 'back' || next === 'back-wide') &&
        // Only if neither side has a dedicated deviceId — otherwise we want
        // to physically swap to that lens.
        !devicesRef.current['back-wide']
      ) {
        const track = prev.getVideoTracks()[0];
        const caps = getZoomCaps(track);
        if (track && caps && caps.min < 1) {
          const target = next === 'back-wide' ? caps.min : Math.min(1, caps.max);
          if (await applyZoom(track, target)) {
            setModeState(next);
            return;
          }
        }
        // fall through to full reopen
      }

      // Same fast path for front ↔ front-wide. iPhones never expose a
      // separate ultrawide front lens, so this is the only way to widen.
      if (
        (mode === 'front' || mode === 'front-wide') &&
        (next === 'front' || next === 'front-wide')
      ) {
        const track = prev.getVideoTracks()[0];
        const caps = getZoomCaps(track);
        if (track && caps && caps.min < 1) {
          const target = next === 'front-wide' ? caps.min : Math.min(1, caps.max);
          if (await applyZoom(track, target)) {
            setModeState(next);
            return;
          }
        }
      }

      try {
        // iOS Safari refuses simultaneous getUserMedia on two cameras.
        prev.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const s = await navigator.mediaDevices.getUserMedia(
          constraintsFor(next, devicesRef.current),
        );
        await attachStream(s);
        setModeState(next);
        setError(null);

        const track = s.getVideoTracks()[0];
        const caps = getZoomCaps(track);

        if (next === 'back-wide' && !devicesRef.current['back-wide'] && track && caps && caps.min < 1) {
          // No dedicated ultrawide device — engage ultrawide through zoom.
          await applyZoom(track, caps.min);
        } else if (next === 'back' && track && caps && caps.min < 1) {
          // Reset zoom to standard so we don't inherit a previous wide setting.
          await applyZoom(track, Math.min(1, caps.max));
        } else if (next === 'front-wide' && track && caps && caps.min < 1) {
          await applyZoom(track, caps.min);
        } else if (next === 'front' && track && caps && caps.min < 1) {
          await applyZoom(track, Math.min(1, caps.max));
        }

        if (next === 'front' || next === 'front-wide') probeFrontWiden(track);
        updateTorchSupport(track);

        // After the first back grant iOS can reveal additional labels, and
        // the freshly-opened track's zoom caps tell us whether this device
        // can engage ultrawide at all. Refresh both signals.
        await refreshDevices();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
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
    [attachStream, mode, probeFrontWiden, refreshDevices, updateTorchSupport],
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
    torchOn,
    torchSupported,
    toggleTorch,
  };
}
