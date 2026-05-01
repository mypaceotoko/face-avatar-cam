import { BLENDSHAPE_CHANNELS, type BlendshapeMap, type BlendshapeName } from './types';

// Per-channel exponential moving average. Higher alpha = snappier.
// Blinks are deliberately fast so they read as a real blink, not a fade.
const ALPHA: Record<BlendshapeName, number> = {
  jawOpen: 0.55,
  jawLeft: 0.4,
  jawRight: 0.4,
  jawForward: 0.4,
  mouthClose: 0.4,
  mouthSmileLeft: 0.45,
  mouthSmileRight: 0.45,
  mouthFrownLeft: 0.4,
  mouthFrownRight: 0.4,
  mouthPucker: 0.4,
  mouthFunnel: 0.4,
  mouthDimpleLeft: 0.35,
  mouthDimpleRight: 0.35,
  mouthStretchLeft: 0.4,
  mouthStretchRight: 0.4,
  mouthRollUpper: 0.35,
  mouthRollLower: 0.35,
  mouthShrugUpper: 0.35,
  mouthShrugLower: 0.35,
  mouthUpperUpLeft: 0.4,
  mouthUpperUpRight: 0.4,
  mouthLowerDownLeft: 0.4,
  mouthLowerDownRight: 0.4,
  mouthLeft: 0.35,
  mouthRight: 0.35,
  tongueOut: 0.55,
  eyeBlinkLeft: 0.7,
  eyeBlinkRight: 0.7,
  eyeSquintLeft: 0.5,
  eyeSquintRight: 0.5,
  eyeWideLeft: 0.55,
  eyeWideRight: 0.55,
  eyeLookInLeft: 0.5,
  eyeLookOutLeft: 0.5,
  eyeLookInRight: 0.5,
  eyeLookOutRight: 0.5,
  eyeLookUpLeft: 0.5,
  eyeLookDownLeft: 0.5,
  eyeLookUpRight: 0.5,
  eyeLookDownRight: 0.5,
  browInnerUp: 0.45,
  browOuterUpLeft: 0.45,
  browOuterUpRight: 0.45,
  browDownLeft: 0.45,
  browDownRight: 0.45,
  cheekPuff: 0.35,
  cheekSquintLeft: 0.4,
  cheekSquintRight: 0.4,
  noseSneerLeft: 0.4,
  noseSneerRight: 0.4,
};

export class BlendshapeSmoother {
  private state: BlendshapeMap;

  constructor() {
    this.state = {} as BlendshapeMap;
    for (const k of BLENDSHAPE_CHANNELS) this.state[k] = 0;
  }

  update(target: BlendshapeMap): BlendshapeMap {
    for (const k of BLENDSHAPE_CHANNELS) {
      const a = ALPHA[k];
      this.state[k] = this.state[k] + (target[k] - this.state[k]) * a;
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
