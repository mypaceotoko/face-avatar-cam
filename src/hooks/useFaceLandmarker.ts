import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { extractFaceState } from '../face/extractFaceState';
import { emptyFaceState, type FaceState } from '../face/types';

export type FaceLandmarkerStatus = 'idle' | 'loading' | 'ready' | 'error';

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
// Hosted by Google. We can swap to /models/face_landmarker.task in public/ to
// run fully offline; CDN keeps the repo small.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

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
  const [status, setStatus] = useState<FaceLandmarkerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<FaceState>(emptyFaceState());
  const fpsRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;

    let landmarker: FaceLandmarker | null = null;
    let raf = 0;
    let cancelled = false;
    let lastVideoTimeMs = -1;
    let lastFpsT = performance.now();
    let frameCount = 0;

    (async () => {
      setStatus('loading');
      setError(null);
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        setStatus('ready');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus('error');
        return;
      }

      const tick = () => {
        if (cancelled || !landmarker) return;
        if (
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTimeMs &&
          video.videoWidth > 0
        ) {
          lastVideoTimeMs = video.currentTime;
          const now = performance.now();
          try {
            const result = landmarker.detectForVideo(video, now);
            stateRef.current = extractFaceState(result, now);
          } catch {
            // detection can fail mid-stream during resolution changes — ignore.
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
    };
  }, [active, videoRef]);

  return { status, error, refs: { state: stateRef, fps: fpsRef } };
}
