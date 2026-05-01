import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

// Selfie segmenter: 1 confidence mask (0..1) marking person vs. background.
// We pull confidence (not category) so we get smooth edges instead of a
// stair-stepped binary mask, which makes the green-screen edge look much
// closer to a real chroma key.
const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

export type SegmenterStatus = 'idle' | 'loading' | 'ready' | 'error';

export type MaskFrame = {
  data: Float32Array | null;
  width: number;
  height: number;
  /** Increments when a fresh mask arrives. The render loop uploads on change. */
  frameId: number;
};

export type UseSegmenterResult = {
  status: SegmenterStatus;
  error: string | null;
  maskRef: React.MutableRefObject<MaskFrame>;
};

export function useSegmenter(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
  enabled: boolean,
): UseSegmenterResult {
  const [status, setStatus] = useState<SegmenterStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const maskRef = useRef<MaskFrame>({ data: null, width: 0, height: 0, frameId: 0 });

  useEffect(() => {
    if (!active || !enabled) {
      setStatus('idle');
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    let segmenter: ImageSegmenter | null = null;
    let raf = 0;
    let cancelled = false;
    let lastVideoTime = -1;

    (async () => {
      setStatus('loading');
      setError(null);
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        segmenter = await ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
        if (cancelled) {
          segmenter.close();
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
        if (cancelled || !segmenter) return;
        if (
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTime &&
          video.videoWidth > 0
        ) {
          lastVideoTime = video.currentTime;
          try {
            segmenter.segmentForVideo(video, performance.now(), (result) => {
              const mask = result.confidenceMasks?.[0];
              if (!mask) return;
              // Copy the float buffer because MediaPipe will reuse it on the
              // next call once the callback returns.
              const arr = mask.getAsFloat32Array();
              const copy = new Float32Array(arr);
              maskRef.current = {
                data: copy,
                width: mask.width,
                height: mask.height,
                frameId: maskRef.current.frameId + 1,
              };
            });
          } catch {
            // Resolution changes mid-stream can throw; skip and retry next frame.
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      segmenter?.close();
      segmenter = null;
      maskRef.current = { data: null, width: 0, height: 0, frameId: 0 };
    };
  }, [active, enabled, videoRef]);

  return { status, error, maskRef };
}
