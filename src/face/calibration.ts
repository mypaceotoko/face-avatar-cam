import { BLENDSHAPE_CHANNELS, type BlendshapeMap } from './types';

// Capture neutral blendshape values over a short window and subtract them so
// "no expression" maps to 0 even if the user has a default smile, raised brows
// at rest, etc. Capped to [0, 1] after subtraction.

export type CalibrationStatus = 'idle' | 'capturing' | 'done';

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
        this.offsets[k] = this.accum[k] / this.samples;
      }
      this.capturing = false;
      return true;
    }
    return false;
  }

  apply(bs: BlendshapeMap): BlendshapeMap {
    for (const k of BLENDSHAPE_CHANNELS) {
      const v = bs[k] - this.offsets[k];
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
