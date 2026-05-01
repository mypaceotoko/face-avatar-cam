import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'error';

export type UseCameraResult = {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  status: CameraStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
};

const PREFERRED_CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
  },
};

// iOS Safari: video must have playsinline + muted + autoplay to render in-page.
// getUserMedia must be triggered by a user gesture (Start button).
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus('starting');
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia(PREFERRED_CONSTRAINTS);
      streamRef.current = s;
      setStream(s);
      const v = videoRef.current;
      if (v) {
        v.srcObject = s;
        v.muted = true;
        v.playsInline = true;
        await v.play().catch(() => {
          // Some browsers reject play() until metadata loads; retry once on loadedmetadata.
          v.addEventListener(
            'loadedmetadata',
            () => {
              void v.play();
            },
            { once: true },
          );
        });
      }
      setStatus('ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  }, []);

  const stop = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { videoRef, stream, status, error, start, stop };
}
