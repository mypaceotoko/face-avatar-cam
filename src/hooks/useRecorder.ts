import { useCallback, useEffect, useRef, useState } from 'react';
import { canRecordCanvas, fileExtensionForMime, pickMimeType } from '../utils/mime';

export type RecorderStatus = 'unsupported' | 'idle' | 'recording' | 'error';

export type Recording = {
  url: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  durationMs: number;
};

export type UseRecorderResult = {
  status: RecorderStatus;
  error: string | null;
  recording: Recording | null;
  start: () => void;
  stop: () => void;
  clear: () => void;
};

export function useRecorder(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  cameraStream: MediaStream | null,
): UseRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>(() =>
    canRecordCanvas() ? 'idle' : 'unsupported',
  );
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const composedStreamRef = useRef<MediaStream | null>(null);

  const start = useCallback(() => {
    if (status === 'unsupported') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (recorderRef.current) return;

    const mime = pickMimeType();
    if (!mime) {
      setStatus('error');
      setError('Recording mime type not supported');
      return;
    }

    try {
      const videoStream = canvas.captureStream(30);
      const composed = new MediaStream();
      videoStream.getVideoTracks().forEach((t) => composed.addTrack(t));
      const audioTrack = cameraStream?.getAudioTracks()[0];
      if (audioTrack) composed.addTrack(audioTrack);
      composedStreamRef.current = composed;

      const recorder = new MediaRecorder(composed, {
        mimeType: mime,
        videoBitsPerSecond: 4_000_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const durationMs = performance.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const ext = fileExtensionForMime(mime);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `face-avatar-${ts}.${ext}`;
        setRecording({ url, filename, mime, sizeBytes: blob.size, durationMs });
        setStatus('idle');
        recorderRef.current = null;
        composedStreamRef.current = null;
      };
      recorder.onerror = () => {
        setStatus('error');
        setError('MediaRecorder error');
      };
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      recorder.start(1000);
      setStatus('recording');
      setError(null);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [canvasRef, cameraStream, status]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (!r) return;
    if (r.state !== 'inactive') r.stop();
  }, []);

  const clear = useCallback(() => {
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (recording) URL.revokeObjectURL(recording.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, recording, start, stop, clear };
}
