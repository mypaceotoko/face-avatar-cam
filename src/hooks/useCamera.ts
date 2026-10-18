import { useCallback, useEffect, useRef, useState } from "react";
export type CameraStatus = "idle" | "starting" | "ready" | "error";
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null),
    generation = useRef(0),
    pending = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null),
    [status, setStatus] = useState<CameraStatus>("idle"),
    [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [audio, setAudio] = useState(false);
  const stop = useCallback(() => {
    generation.current++;
    pending.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  const start = useCallback(
    async (mode: "user" | "environment" = facing) => {
      if (pending.current || streamRef.current) return;
      const token = ++generation.current;
      pending.current = true;
      setStatus("starting");
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("カメラには HTTPS 接続と対応ブラウザが必要です。");
        const video = {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        };
        let s: MediaStream;
        try {
          s = await navigator.mediaDevices.getUserMedia({ video, audio });
        } catch (e) {
          if (token !== generation.current) return;
          if (!audio) throw e;
          s = await navigator.mediaDevices.getUserMedia({
            video,
            audio: false,
          });
          setError("マイクが利用できないため、音声なしで撮影します。");
        }
        if (token !== generation.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          v.muted = true;
          v.playsInline = true;
          await v.play();
        }
        if (token !== generation.current) return;
        setStream(s);
        setFacing(mode);
        setStatus("ready");
      } catch (e) {
        if (token !== generation.current) return;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStream(null);
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "カメラを許可してください。Safariのサイト設定で許可した後、もう一度お試しください。"
            : name === "NotFoundError"
              ? "カメラが見つかりません。プレビューと写真保存は引き続き利用できます。"
              : e instanceof Error
                ? e.message
                : String(e),
        );
        setStatus("error");
      } finally {
        if (token === generation.current) pending.current = false;
      }
    },
    [facing, audio],
  );
  const flip = useCallback(async () => {
    const next = facing === "user" ? "environment" : "user";
    stop();
    await start(next);
  }, [facing, start, stop]);
  useEffect(
    () => () => {
      generation.current++;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  return {
    videoRef,
    stream,
    status,
    error,
    start,
    stop,
    flip,
    facing,
    audio,
    setAudio,
  };
}
