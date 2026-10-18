import type { FaceState } from "../face/types";
/** Same contain rectangle as createBackgroundPlane, projected from 120cm to
 * the avatar plane at 55cm. No crop or guessed camera intrinsics are involved. */
export function fitFaceToVideo(
  fit: NonNullable<FaceState["fit"]>,
  planeWidth: number,
  planeHeight: number,
  yaw: number,
  coverage: number,
) {
  const width = (planeWidth * 55) / 120,
    height = (planeHeight * 55) / 120;
  const size =
    Math.max(
      (fit.width * width) / (1.6 * Math.max(0.55, Math.cos(yaw))),
      (fit.height * height) / 1.92,
    ) * coverage;
  return {
    x: (fit.x - 0.5) * width,
    y: (0.5 - fit.y) * height,
    z: -55,
    scale: Math.min(35, Math.max(2, size)),
  };
}
