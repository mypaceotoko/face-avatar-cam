import { useCallback, useEffect, useRef, useState } from "react";
import {
  canRecordCanvas,
  fileExtensionForMime,
  pickMimeType,
} from "../utils/mime";
export type RecorderStatus =
  "unsupported" | "idle" | "recording" | "stopping" | "error";
export type Recording = {
  url: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  durationMs: number;
  blob: Blob;
  kind: "photo" | "video";
};
export function useRecorder(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  cameraStream: MediaStream | null,
) {
  const [status, setStatus] = useState<RecorderStatus>(() =>
    canRecordCanvas() ? "idle" : "unsupported",
  );
  const [error, setError] = useState<string | null>(null),
    [recording, setRecording] = useState<Recording | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    ownedStream = useRef<MediaStream | null>(null),
    mounted = useRef(true);
  const release = useCallback(() => {
    ownedStream.current?.getTracks().forEach((t) => t.stop());
    ownedStream.current = null;
    recorder.current = null;
  }, []);
  const save = useCallback(
    (blob: Blob, kind: "photo" | "video", durationMs = 0) => {
      if (!mounted.current) return;
      if (!blob.size) {
        setError("映像を保存できませんでした。もう一度お試しください。");
        setStatus("error");
        return;
      }
      const ext = kind === "photo" ? "png" : fileExtensionForMime(blob.type);
      setRecording({
        url: URL.createObjectURL(blob),
        filename: `face-avatar-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
        mime: blob.type,
        sizeBytes: blob.size,
        durationMs,
        blob,
        kind,
      });
    },
    [],
  );
  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || recorder.current || !canRecordCanvas()) return;
    const mime = pickMimeType();
    if (!mime) {
      setError(
        "このブラウザは動画録画に対応していません。写真撮影をご利用ください。",
      );
      return;
    }
    try {
      const composed = canvas.captureStream(30);
      ownedStream.current = composed;
      // Clones are owned by this recorder; cleanup never stops the camera mic.
      cameraStream
        ?.getAudioTracks()
        .forEach((t) => composed.addTrack(t.clone()));
      const r = new MediaRecorder(composed, {
        mimeType: mime,
        videoBitsPerSecond: 4_000_000,
      });
      const chunks: BlobPart[] = [];
      let failed = false;
      const started = performance.now();
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        release();
        if (!mounted.current) return;
        if (!failed) {
          save(
            new Blob(chunks, { type: r.mimeType || mime }),
            "video",
            performance.now() - started,
          );
          setStatus(chunks.length ? "idle" : "error");
        }
      };
      r.onerror = () => {
        failed = true;
        setError(
          "録画に失敗しました。カメラを停止せず、もう一度録画できます。",
        );
        setStatus("error");
        if (r.state !== "inactive") r.stop();
        release();
      };
      recorder.current = r;
      r.start(1000);
      setStatus("recording");
      setError(null);
    } catch (e) {
      release();
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [canvasRef, cameraStream, release, save]);
  const stop = useCallback(() => {
    const r = recorder.current;
    if (r && r.state !== "inactive") {
      setStatus("stopping");
      r.stop();
    }
  }, []);
  const takePhoto = useCallback(() => {
    setError(null);
    try {
      canvasRef.current?.toBlob((blob) => {
        if (blob) save(blob, "photo");
        else setError("写真を作成できませんでした。");
      }, "image/png");
    } catch {
      setError("写真を作成できませんでした。ページを再読み込みしてください。");
    }
  }, [canvasRef, save]);
  useEffect(
    () => () => {
      if (recording) URL.revokeObjectURL(recording.url);
    },
    [recording],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const r = recorder.current;
      if (r) {
        r.onstop = null;
        r.onerror = null;
        r.ondataavailable = null;
        if (r.state !== "inactive") r.stop();
      }
      release();
    };
  }, [release]);
  return {
    status,
    error,
    recording,
    start,
    stop,
    takePhoto,
    clear: () => setRecording(null),
  };
}
