import { BLENDSHAPE_CHANNELS, type BlendshapeMap, type BlendshapeName } from './types';

// Per-channel exponential moving average. Higher alpha = snappier.
// Blinks are deliberately fast so they read as a real blink, not a fade.
// Speech-driving channels (jawOpen, lip shape) run high so the avatar mouths
// words in time with the audio rather than dragging behind it.
const ALPHA: Record<BlendshapeName, number> = {
  jawOpen: 0.85,
  jawLeft: 0.55,
  jawRight: 0.55,
  jawForward: 0.55,
  mouthClose: 0.65,
  mouthSmileLeft: 0.55,
  mouthSmileRight: 0.55,
  mouthFrownLeft: 0.5,
  mouthFrownRight: 0.5,
  mouthPucker: 0.6,
  mouthFunnel: 0.6,
  mouthDimpleLeft: 0.45,
  mouthDimpleRight: 0.45,
  mouthStretchLeft: 0.55,
  mouthStretchRight: 0.55,
  mouthRollUpper: 0.5,
  mouthRollLower: 0.5,
  mouthShrugUpper: 0.45,
  mouthShrugLower: 0.45,
  mouthUpperUpLeft: 0.55,
  mouthUpperUpRight: 0.55,
  mouthLowerDownLeft: 0.6,
  mouthLowerDownRight: 0.6,
  mouthLeft: 0.45,
  mouthRight: 0.45,
  tongueOut: 0.65,
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
