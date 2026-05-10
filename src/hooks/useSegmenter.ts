import { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

// Lightweight selfie segmenter (256×256, float16) — fast on mobile GPUs.
// We pull confidence (not category) so we get smooth edges instead of a
// stair-stepped binary mask. A CPU-side temporal EMA smooths frame-to-frame
// jitter so the silhouette feels stable / sharp rather than wobbly.
const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// Temporal smoothing weight for the *new* frame. 0.65 = blend 65% new with
// 35% previous frame. Higher = more responsive but more flicker; lower =
// silkier but laggier. 0.65 is a good "snappy + stable" balance.
const TEMPORAL_ALPHA = 0.65;

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
    // Persistent EMA buffer for temporal smoothing — re-allocated only when
    // the mask resolution changes.
    let prevMask: Float32Array | null = null;
    let prevW = 0;
    let prevH = 0;

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
              const w = mask.width;
              const h = mask.height;
              const arr = mask.getAsFloat32Array();
              // Allocate / reset the EMA buffer when the mask resolution
              // changes (e.g. camera switch).
              if (!prevMask || prevW !== w || prevH !== h) {
                prevMask = new Float32Array(arr); // seed with first frame
                prevW = w;
                prevH = h;
              }
              // Temporal EMA: out = α·new + (1−α)·prev. Reduces frame-to-frame
              // boundary wobble — stable silhouette reads as sharper than a
              // jittery one even when single-frame sharpness is identical.
              const a = TEMPORAL_ALPHA;
              const inv = 1 - a;
              const out = new Float32Array(arr.length);
              for (let i = 0; i < arr.length; i++) {
                const v = a * arr[i] + inv * prevMask[i];
                out[i] = v;
                prevMask[i] = v;
              }
              maskRef.current = {
                data: out,
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
      prevMask = null;
      maskRef.current = { data: null, width: 0, height: 0, frameId: 0 };
    };
  }, [active, enabled, videoRef]);

  return { status, error, maskRef };
}
