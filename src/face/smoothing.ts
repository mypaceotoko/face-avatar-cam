import { BLENDSHAPE_CHANNELS, type BlendshapeMap, type BlendshapeName } from './types';

// Per-channel exponential moving average. Higher alpha = snappier.
//
// Tuning rationale:
//  - Mouth and jaw drive lip-sync; they MUST be fast (>=0.7) so syllables
//    don't blur into a slow open/close. The previous defaults (0.4-0.55)
//    flattened speech.
//  - Blinks need to be near-instant (>=0.85) or they fade in/out instead of
//    snapping like a real eyelid.
//  - Brows are also bumped because they carry most of the emotional read.
//  - On top of the per-channel alpha we apply a "snap" multiplier when the
//    delta is large, so genuine fast motion arrives even faster.
const ALPHA: Record<BlendshapeName, number> = {
  jawOpen: 0.86,  // raised for snappier lip-sync (was 0.78)
  jawLeft: 0.58,
  jawRight: 0.58,
  jawForward: 0.52,
  mouthClose: 0.65,
  mouthSmileLeft: 0.65,
  mouthSmileRight: 0.65,
  mouthFrownLeft: 0.52,
  mouthFrownRight: 0.52,
  mouthPucker: 0.60,
  mouthFunnel: 0.60,
  mouthDimpleLeft: 0.45,
  mouthDimpleRight: 0.45,
  mouthStretchLeft: 0.55,
  mouthStretchRight: 0.55,
  mouthRollUpper: 0.45,
  mouthRollLower: 0.45,
  mouthShrugUpper: 0.45,
  mouthShrugLower: 0.45,
  mouthUpperUpLeft: 0.62,
  mouthUpperUpRight: 0.62,
  mouthLowerDownLeft: 0.68,
  mouthLowerDownRight: 0.68,
  mouthLeft: 0.45,
  mouthRight: 0.45,
  tongueOut: 0.6,
  eyeBlinkLeft: 0.88,
  eyeBlinkRight: 0.88,
  eyeSquintLeft: 0.6,
  eyeSquintRight: 0.6,
  eyeWideLeft: 0.7,
  eyeWideRight: 0.7,
  eyeLookInLeft: 0.55,
  eyeLookOutLeft: 0.55,
  eyeLookInRight: 0.55,
  eyeLookOutRight: 0.55,
  eyeLookUpLeft: 0.55,
  eyeLookDownLeft: 0.55,
  eyeLookUpRight: 0.55,
  eyeLookDownRight: 0.55,
  browInnerUp: 0.6,
  browOuterUpLeft: 0.6,
  browOuterUpRight: 0.6,
  browDownLeft: 0.6,
  browDownRight: 0.6,
  cheekPuff: 0.45,
  cheekSquintLeft: 0.5,
  cheekSquintRight: 0.5,
  noseSneerLeft: 0.5,
  noseSneerRight: 0.5,
};

/** Channels where a sudden large delta should snap (blink, jaw, smile). */
const SNAP_THRESHOLD = 0.18;
const SNAP_BOOST = 1.7;

export class BlendshapeSmoother {
  private state: BlendshapeMap;

  constructor() {
    this.state = {} as BlendshapeMap;
    for (const k of BLENDSHAPE_CHANNELS) this.state[k] = 0;
  }

  update(target: BlendshapeMap): BlendshapeMap {
    for (const k of BLENDSHAPE_CHANNELS) {
      const cur = this.state[k];
      const t = target[k];
      let a = ALPHA[k];
      if (Math.abs(t - cur) > SNAP_THRESHOLD) {
        a = Math.min(1, a * SNAP_BOOST);
      }
      this.state[k] = cur + (t - cur) * a;
    }
    return this.state;
  }

  values(): BlendshapeMap {
    return this.state;
  }

  reset() {
    for (const k of BLENDSHAPE_CHANNELS) this.state[k] = 0;
  }
}

/** Time-independent EMA helper for scalars (used for head pose smoothing). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
