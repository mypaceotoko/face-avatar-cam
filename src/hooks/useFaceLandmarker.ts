import { useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { extractFaceState } from "../face/extractFaceState";
import { emptyFaceState, type FaceState } from "../face/types";

export type FaceLandmarkerStatus = "idle" | "loading" | "ready" | "error";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
// Hosted by Google. We can swap to /models/face_landmarker.task in public/ to
// run fully offline; CDN keeps the repo small.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

export type FaceLandmarkerRefs = {
  state: React.MutableRefObject<FaceState>;
  fps: React.MutableRefObject<number>;
};

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
): {
  status: FaceLandmarkerStatus;
  error: string | null;
  refs: FaceLandmarkerRefs;
} {
  const [status, setStatus] = useState<FaceLandmarkerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<FaceState>(emptyFaceState());
  const fpsRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      stateRef.current = emptyFaceState();
      fpsRef.current = 0;
      setStatus("idle");
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    let landmarker: FaceLandmarker | null = null;
    let raf = 0;
    let cancelled = false;
    let lastVideoTimeMs = -1;
    let lastFpsT = performance.now();
    let frameCount = 0;
    let lastDetection = 0;
    let detectionInterval = 1000 / 24;

    (async () => {
      setStatus("loading");
      setError(null);
      try {
        const { FaceLandmarker, FilesetResolver } =
          await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        if (cancelled) return;
        const create = (delegate: "GPU" | "CPU") =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
        try {
          landmarker = await create("GPU");
        } catch {
          if (cancelled) return;
          landmarker = await create("CPU");
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        console.error("Face tracking initialization failed", e);
        setError(
          "顔トラッキングを開始できません。通信を確認し、カメラを再起動してください。",
        );
        setStatus("error");
        return;
      }

      const tick = () => {
        if (cancelled || !landmarker) return;
        if (
          !document.hidden &&
          performance.now() - lastDetection >= detectionInterval &&
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTimeMs &&
          video.videoWidth > 0
        ) {
          lastVideoTimeMs = video.currentTime;
          const now = performance.now();
          lastDetection = now;
          try {
            const result = landmarker.detectForVideo(video, now);
            stateRef.current = extractFaceState(
              result,
              now,
              video.videoWidth / video.videoHeight,
            );
            detectionInterval = Math.max(
              1000 / 24,
              Math.min(1000 / 12, (performance.now() - now) * 1.5),
            );
          } catch {
            stateRef.current = emptyFaceState();
          }
          frameCount += 1;
          if (now - lastFpsT >= 500) {
            fpsRef.current = (frameCount * 1000) / (now - lastFpsT);
            lastFpsT = now;
            frameCount = 0;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      landmarker?.close();
      landmarker = null;
      stateRef.current = emptyFaceState();
      fpsRef.current = 0;
    };
  }, [active, videoRef]);

  return { status, error, refs: { state: stateRef, fps: fpsRef } };
}
