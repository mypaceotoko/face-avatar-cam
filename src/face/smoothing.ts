import { BLENDSHAPE_CHANNELS, type BlendshapeMap, type BlendshapeName } from './types';

// Per-channel exponential moving average. Higher alpha = snappier.
// Blinks are deliberately fast so they read as a real blink, not a fade.
const ALPHA: Record<BlendshapeName, number> = {
  jawOpen: 0.45,
  mouthClose: 0.35,
  mouthSmileLeft: 0.3,
  mouthSmileRight: 0.3,
  mouthPucker: 0.3,
  mouthFunnel: 0.3,
  eyeBlinkLeft: 0.65,
  eyeBlinkRight: 0.65,
  eyeLookInLeft: 0.4,
  eyeLookOutLeft: 0.4,
  eyeLookInRight: 0.4,
  eyeLookOutRight: 0.4,
  eyeLookUpLeft: 0.4,
  eyeLookDownLeft: 0.4,
  eyeLookUpRight: 0.4,
  eyeLookDownRight: 0.4,
  browInnerUp: 0.3,
  browOuterUpLeft: 0.3,
  browOuterUpRight: 0.3,
  browDownLeft: 0.3,
  browDownRight: 0.3,
  cheekPuff: 0.25,
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
