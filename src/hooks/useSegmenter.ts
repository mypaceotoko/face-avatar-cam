import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

// Multiclass selfie segmenter — separates background / hair / body-skin /
// face-skin / clothes / accessories. We combine all foreground classes into
// a single confidence mask, which gives noticeably tighter hair/clothing
// boundaries than the single-mask "selfie_segmenter" model. Floats are
// smoothly upsampled in the shader so the edges look clean even at 1080p.
const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

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
              const masks = result.confidenceMasks;
              if (!masks || masks.length === 0) return;
              // Multiclass returns one confidence mask per class
              // (0=bg, 1=hair, 2=body-skin, 3=face-skin, 4=clothes, 5=others).
              // Foreground confidence = 1 - background. This is more accurate
              // than thresholding the categoryMask because it preserves
              // per-pixel sub-class confidences at fuzzy boundaries (hair tips,
              // finger silhouettes).
              const bg = masks[0];
              const w = bg.width;
              const h = bg.height;
              const bgArr = bg.getAsFloat32Array();
              const fg = new Float32Array(bgArr.length);
              for (let i = 0; i < bgArr.length; i++) {
                fg[i] = 1 - bgArr[i];
              }
              maskRef.current = {
                data: fg,
                width: w,
                height: h,
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
