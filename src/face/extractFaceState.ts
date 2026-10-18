import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  BLENDSHAPE_CHANNELS,
  type BlendshapeMap,
  emptyBlendshapes,
  emptyFaceState,
  identityMatrix4,
  type FaceState,
} from "./types";

const CHANNEL_SET = new Set<string>(BLENDSHAPE_CHANNELS);

export function extractFaceState(
  result: FaceLandmarkerResult | null,
  timestampMs: number,
  videoAspect = 1,
): FaceState {
  if (
    !result ||
    !result.faceBlendshapes ||
    result.faceBlendshapes.length === 0
  ) {
    return emptyFaceState();
  }

  const bs: BlendshapeMap = emptyBlendshapes();
  const cats = result.faceBlendshapes[0]?.categories ?? [];
  for (const c of cats) {
    if (c.categoryName && CHANNEL_SET.has(c.categoryName)) {
      bs[c.categoryName as keyof BlendshapeMap] = c.score;
    }
  }

  let headMatrix = identityMatrix4();
  const matData = result.facialTransformationMatrixes?.[0]?.data;
  if (matData && matData.length === 16) {
    headMatrix = new Float32Array(matData);
  }

  const landmarks = result.faceLandmarks?.[0];
  const top = landmarks?.[10],
    chin = landmarks?.[152];
  const left = landmarks?.[234],
    right = landmarks?.[454];
  const fit =
    top && chin && left && right
      ? {
          x: (left.x + right.x) / 2,
          y: (top.y + chin.y) / 2,
          width: Math.hypot(right.x - left.x, (right.y - left.y) / videoAspect),
          height: Math.hypot((chin.x - top.x) * videoAspect, chin.y - top.y),
        }
      : undefined;
  return {
    detected: Boolean(matData && fit),
    fit,
    headMatrix,
    bs,
    timestampMs,
  };
}
