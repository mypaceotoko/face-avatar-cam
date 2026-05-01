import {
  BLENDSHAPE_CHANNELS,
  type BlendshapeMap,
  type BlendshapeName,
} from './types';

// Capture neutral blendshape values over a short window and subtract them so
// "no expression" maps to 0 even if the user has a default smile, raised brows
// at rest, etc. Capped to [0, 1] after subtraction.
//
// We DELIBERATELY only calibrate channels that have a meaningful "rest"
// reading — and clamp each offset at MAX_OFFSET. Reason: if the user happens
// to be mid-smile when they hit calibrate (or MediaPipe reads a strong jaw
// value at rest), the previous unbounded subtraction would zero-out future
// expressions. Now the worst case is a small permanent bias that the
// amplifier in expression.ts compensates for.

export type CalibrationStatus = 'idle' | 'capturing' | 'done';

const CALIBRATED_CHANNELS: ReadonlyArray<BlendshapeName> = [
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthLeft',
  'mouthRight',
  'mouthPucker',
  'mouthFunnel',
  'mouthStretchLeft',
  'mouthStretchRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'browDownLeft',
  'browDownRight',
  'eyeSquintLeft',
  'eyeSquintRight',
];
const CALIBRATED_SET = new Set<string>(CALIBRATED_CHANNELS);
const MAX_OFFSET = 0.12;

export class Calibration {
  private offsets: BlendshapeMap;
  private samples = 0;
  private capturing = false;
  private endAt = 0;
  private accum: BlendshapeMap;

  constructor() {
    this.offsets = zero();
    this.accum = zero();
  }

  start(durationMs = 1500) {
    this.capturing = true;
    this.samples = 0;
    this.accum = zero();
    this.endAt = performance.now() + durationMs;
  }

  reset() {
    this.offsets = zero();
    this.capturing = false;
    this.samples = 0;
  }

  /** Feed one sample. Returns true if a capture window just finished. */
  feed(bs: BlendshapeMap, now: number): boolean {
    if (!this.capturing) return false;
    for (const k of BLENDSHAPE_CHANNELS) this.accum[k] += bs[k];
    this.samples += 1;
    if (now >= this.endAt && this.samples > 0) {
      for (const k of BLENDSHAPE_CHANNELS) {
        if (!CALIBRATED_SET.has(k)) {
          this.offsets[k] = 0;
          continue;
        }
        const mean = this.accum[k] / this.samples;
        this.offsets[k] = mean > MAX_OFFSET ? MAX_OFFSET : mean;
      }
      this.capturing = false;
      return true;
    }
    return false;
  }

  apply(bs: BlendshapeMap): BlendshapeMap {
    for (const k of BLENDSHAPE_CHANNELS) {
      const off = this.offsets[k];
      if (off === 0) continue;
      const v = bs[k] - off;
      bs[k] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    return bs;
  }

  status(): CalibrationStatus {
    if (this.capturing) return 'capturing';
    return this.samples > 0 ? 'done' : 'idle';
  }
}

function zero(): BlendshapeMap {
  const o = {} as BlendshapeMap;
  for (const k of BLENDSHAPE_CHANNELS) o[k] = 0;
  return o;
}
