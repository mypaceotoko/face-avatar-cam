// Expression engine.
//
// Converts the raw, smoothed BlendshapeMap from FaceLandmarker into a
// performance-oriented ExpressionState that the avatar rig can render with
// big, readable motion. Three jobs:
//
//  1. Amplify per-channel values. MediaPipe blendshapes plateau around
//     0.4-0.55 for fully-committed expressions, so we apply a noise-floor
//     subtract and a gain so the avatar reaches its full deformation range.
//  2. Recognise emotion blends (happy / laughing / surprised / angry / sad /
//     confused / neutral) and inject overlay strength into the channels that
//     read clearly on a phone screen — bigger smile when "happy", bigger
//     jaw-drop when "surprised", etc.
//  3. Add idle motion: random blinks, micro-saccades, breath bob. Without
//     this the avatar locks into a freeze-frame the moment the user holds
//     still.
//
// The engine is stateful (owns RNG / timing) but pure w.r.t. the input map.

import {
  EMOTION_NAMES,
  emptyExpressionState,
  type BlendshapeMap,
  type EmotionName,
  type EmotionWeights,
  type ExpressionState,
  type Viseme,
} from './types';

// --- Amplification curves ---------------------------------------------------
// MediaPipe outputs are not calibrated to a 0..1 perceptual range. These
// curves subtract a small noise floor and apply a gain, then clamp.
function amp(v: number, gain: number, knee = 0.04): number {
  const x = v - knee;
  if (x <= 0) return 0;
  const y = (x * gain) / Math.max(0.001, 1 - knee);
  return y > 1 ? 1 : y;
}

// Stronger curve for jaw — readable mouth open is the #1 priority.
// Gain 3.2, knee 0.015 so even small jaw drops register as visible open,
// giving crisp lip-sync.
function ampMouth(v: number): number {
  return amp(v, 3.2, 0.015);
}
function ampSmile(v: number): number {
  return amp(v, 2.4, 0.05);
}
function ampBrow(v: number): number {
  return amp(v, 2.3, 0.05);
}
function ampBlink(v: number): number {
  // Blink mostly saturates fast; we still gain it slightly so partial closes
  // (for a "tired" or "smiling-eye" look) pop.
  return amp(v, 1.6, 0.02);
}
function ampGeneric(v: number): number {
  return amp(v, 2.0, 0.05);
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// --- Idle motion ------------------------------------------------------------
class IdleMotion {
  private nextBlinkAt: number;
  private blinkPhase = 0; // 0 = idle, climbs to 1 then back to 0 over ~140ms
  private blinkActive = false;
  private blinkStart = 0;
  private gazeTargetX = 0;
  private gazeTargetY = 0;
  private gazeX = 0;
  private gazeY = 0;
  private nextGazeAt = 0;
  private startTime: number;

  constructor(now: number) {
    this.startTime = now;
    this.nextBlinkAt = now + 1500 + Math.random() * 2200;
    this.nextGazeAt = now + 600 + Math.random() * 1200;
  }

  tick(now: number, dt: number) {
    // Random blink: short pulse 0->1->0 over ~140ms, every 2.5 to 5.5s.
    if (!this.blinkActive && now >= this.nextBlinkAt) {
      this.blinkActive = true;
      this.blinkStart = now;
    }
    if (this.blinkActive) {
      const t = (now - this.blinkStart) / 140;
      if (t >= 1) {
        this.blinkActive = false;
        this.blinkPhase = 0;
        this.nextBlinkAt = now + 2500 + Math.random() * 3000;
      } else {
        // Triangle 0->1@center->0
        this.blinkPhase = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
      }
    } else {
      this.blinkPhase = 0;
    }

    // Micro-saccade: pick a small offset target every 0.6-1.8s and lerp.
    if (now >= this.nextGazeAt) {
      this.gazeTargetX = (Math.random() * 2 - 1) * 0.18;
      this.gazeTargetY = (Math.random() * 2 - 1) * 0.12;
      this.nextGazeAt = now + 600 + Math.random() * 1200;
    }
    const k = 1 - Math.exp(-dt / 0.18); // ~180ms time constant
    this.gazeX += (this.gazeTargetX - this.gazeX) * k;
    this.gazeY += (this.gazeTargetY - this.gazeY) * k;
  }

  state(now: number) {
    const breathT = (now - this.startTime) / 1000;
    return {
      blinkPulse: this.blinkPhase,
      gazeDriftX: this.gazeX,
      gazeDriftY: this.gazeY,
      // 4s breathing cycle, range ~ -0.5..0.5
      breath: Math.sin((breathT / 4) * Math.PI * 2) * 0.5,
    };
  }
}

// --- Emotion classification -------------------------------------------------
// Each emotion gets a raw score from a hand-tuned blend of channels; we then
// normalise so the dominant emotion + neutral sum to 1, and expose the full
// vector so the rig can mix overlays.
function classifyEmotions(
  bs: BlendshapeMap,
  mouthOpen: number,
  smile: number,
  frown: number,
): EmotionWeights {
  const browDown = (ampBrow(bs.browDownLeft) + ampBrow(bs.browDownRight)) * 0.5;
  const browInner = ampBrow(bs.browInnerUp);
  const browOuter = (ampBrow(bs.browOuterUpLeft) + ampBrow(bs.browOuterUpRight)) * 0.5;
  const wide = (ampGeneric(bs.eyeWideLeft) + ampGeneric(bs.eyeWideRight)) * 0.5;
  const cheek =
    (ampGeneric(bs.cheekSquintLeft) + ampGeneric(bs.cheekSquintRight)) * 0.5;
  const stretch =
    (ampGeneric(bs.mouthStretchLeft) + ampGeneric(bs.mouthStretchRight)) * 0.5;
  const sneer = (ampGeneric(bs.noseSneerLeft) + ampGeneric(bs.noseSneerRight)) * 0.5;

  // Tuned for *readability*: every emotion needs to score high enough to
  // dominate the mix when the user clearly performs it. Coefficients here are
  // bumped (vs. the previous calmer set) so the corresponding overlay can move
  // the geometry visibly even when MediaPipe is undershooting the channel.
  const happy = clamp01(smile * 0.95 + cheek * 0.5 + browOuter * 0.20);
  const laughing = clamp01(smile * mouthOpen * 1.8 + cheek * 0.35);
  const surprised = clamp01(mouthOpen * 0.55 + wide * 0.7 + browInner * 0.45 - smile * 0.4);
  // Anger: brow-down is the core cue; sneer + stretch reinforce. Big boost
  // here so a real frown classifies as anger instead of bleeding into "sad".
  const angry = clamp01(browDown * 1.10 + sneer * 0.40 + stretch * 0.30 - smile * 0.4);
  // Sad: frown corners + inner-brow-up (the universal ▲ shape). Boosted so
  // a soft pout reads as sad instead of neutral.
  const sad = clamp01(frown * 0.95 + browInner * 0.65 - smile * 0.5);
  const browAsym = Math.abs(
    ampBrow(bs.browOuterUpLeft) - ampBrow(bs.browOuterUpRight),
  );
  // Confused / 困り顔: asymmetric brows OR slight inner-up + slight stretch +
  // not-smiling. Sneer/stretch contribution lets a worried mouth (corners
  // pulled in/back without the inner-brow-up) still classify as confused.
  const confused = clamp01(
    browAsym * 1.8 + browInner * 0.40 * (1 - smile) + (sneer + stretch) * 0.15,
  );

  const sum = happy + laughing + surprised + angry + sad + confused;
  const out = {} as EmotionWeights;
  for (const n of EMOTION_NAMES) out[n] = 0;
  if (sum < 0.05) {
    out.neutral = 1;
    return out;
  }
  // Soft cap so a single dominant emotion can reach 1, but blends still mix.
  const norm = Math.min(1, sum) / sum;
  out.happy = happy * norm;
  out.laughing = laughing * norm;
  out.surprised = surprised * norm;
  out.angry = angry * norm;
  out.sad = sad * norm;
  out.confused = confused * norm;
  out.neutral = clamp01(1 - (out.happy + out.laughing + out.surprised + out.angry + out.sad + out.confused));
  return out;
}

function dominantEmotion(e: EmotionWeights): { name: EmotionName; intensity: number } {
  let name: EmotionName = 'neutral';
  let best = -1;
  for (const n of EMOTION_NAMES) {
    if (e[n] > best) {
      best = e[n];
      name = n;
    }
  }
  return { name, intensity: best > 0 ? best : 0 };
}

function detectViseme(open: number, wide: number, pucker: number): Viseme {
  if (pucker > 0.45 && open < 0.2) return 'pucker';
  if (open > 0.7 && wide > 0.25) return 'shout';
  if (open > 0.55) {
    if (wide > 0.15) return 'smile-open';
    if (wide < -0.2) return 'O';
    return 'A';
  }
  if (open > 0.25) {
    if (wide < -0.15) return 'U';
    if (wide > 0.15) return 'E';
    return 'A';
  }
  if (wide > 0.25) return 'I';
  return 'closed';
}

export class ExpressionEngine {
  private idle: IdleMotion;
  private lastTs = 0;
  private prevJawOpen = 0;
  private speak = 0;
  private prevEmotion: EmotionWeights;

  constructor() {
    const now = performance.now();
    this.idle = new IdleMotion(now);
    this.prevEmotion = emptyExpressionState().emotions;
  }

  /**
   * Compute the performance state. Pass in the SMOOTHED blendshape map so
   * the amplifier doesn't re-amplify noise.
   */
  compute(bs: BlendshapeMap, detected: boolean, now: number): ExpressionState {
    const dt = this.lastTs > 0 ? Math.min(0.1, (now - this.lastTs) / 1000) : 1 / 60;
    this.lastTs = now;
    this.idle.tick(now, dt);
    const idle = this.idle.state(now);

    if (!detected) {
      const out = emptyExpressionState();
      out.detected = false;
      out.idle = idle;
      out.timestampMs = now;
      return out;
    }

    // -------- Mouth ------------------------------------------------------
    const jawOpenAmp = ampMouth(bs.jawOpen);
    const lowerDrop = ampGeneric((bs.mouthLowerDownLeft + bs.mouthLowerDownRight) * 0.5);
    const upperRaise = ampGeneric((bs.mouthUpperUpLeft + bs.mouthUpperUpRight) * 0.5);
    const open = clamp01(jawOpenAmp * 0.85 + lowerDrop * 0.3);
    const close = clamp01(bs.mouthClose * 1.2);
    const smileL = ampSmile(bs.mouthSmileLeft);
    const smileR = ampSmile(bs.mouthSmileRight);
    const smile = (smileL + smileR) * 0.5;
    const frownL = ampGeneric(bs.mouthFrownLeft);
    const frownR = ampGeneric(bs.mouthFrownRight);
    const frown = (frownL + frownR) * 0.5;
    const pucker = ampGeneric(bs.mouthPucker);
    const funnel = ampGeneric(bs.mouthFunnel);
    const stretch =
      (ampGeneric(bs.mouthStretchLeft) + ampGeneric(bs.mouthStretchRight)) * 0.5;
    const wide = clamp01(smile + stretch * 0.7) - clamp01(pucker + funnel * 0.6);
    const shoutness = clamp01(open * 1.2 + smile * 0.6 - 0.4);
    const shiftX = bs.mouthRight - bs.mouthLeft;

    // Speak intensity: tracks how rapidly the jaw is moving + current open.
    // Acts as a "is this person mid-syllable" heuristic. Used by the rig to
    // bias the lower lip and tongue.
    const jawDelta = Math.abs(bs.jawOpen - this.prevJawOpen);
    this.prevJawOpen = bs.jawOpen;
    const speakTarget = clamp01(jawDelta * 9 + open * 0.3);
    this.speak = this.speak + (speakTarget - this.speak) * Math.min(1, dt * 10);

    const cornerUp = clamp01(smile - frown * 0.6);
    const cornerDown = clamp01(frown - smile * 0.6);

    const teethVisible = clamp01(open * 1.4 - 0.05 + smile * 0.4);
    const viseme = detectViseme(open, wide + smile * 0.3, pucker + funnel * 0.4);

    // -------- Eyes -------------------------------------------------------
    const blinkL = ampBlink(bs.eyeBlinkLeft);
    const blinkR = ampBlink(bs.eyeBlinkRight);
    const squintL = ampGeneric(bs.eyeSquintLeft + bs.cheekSquintLeft * 0.7);
    const squintR = ampGeneric(bs.eyeSquintRight + bs.cheekSquintRight * 0.7);
    const wideL = ampGeneric(bs.eyeWideLeft);
    const wideR = ampGeneric(bs.eyeWideRight);
    const leftYaw = bs.eyeLookOutLeft - bs.eyeLookInLeft;
    const rightYaw = bs.eyeLookInRight - bs.eyeLookOutRight;
    const lookX = clamp01Sym((leftYaw + rightYaw) * 0.5 * 1.3);
    const lookYRaw =
      ((bs.eyeLookUpLeft + bs.eyeLookUpRight) -
        (bs.eyeLookDownLeft + bs.eyeLookDownRight)) *
      0.5;
    const lookY = clamp01Sym(lookYRaw * 1.3);

    // -------- Brows ------------------------------------------------------
    const raiseL = ampBrow(bs.browOuterUpLeft);
    const raiseR = ampBrow(bs.browOuterUpRight);
    const downL = ampBrow(bs.browDownLeft);
    const downR = ampBrow(bs.browDownRight);
    const innerUp = ampBrow(bs.browInnerUp);
    const asymmetry = clamp01Sym(raiseL - raiseR + (downR - downL));

    // -------- Cheeks ----------------------------------------------------
    const cheekPuff = ampGeneric(bs.cheekPuff);
    const cheekRaiseL = ampGeneric(bs.cheekSquintLeft + bs.mouthSmileLeft * 0.7);
    const cheekRaiseR = ampGeneric(bs.cheekSquintRight + bs.mouthSmileRight * 0.7);

    // -------- Emotions ---------------------------------------------------
    const emotionsRaw = classifyEmotions(bs, open, smile, frown);
    // Small temporal smoothing on emotion vector so we don't flicker between
    // happy/laughing on every frame.
    const emoAlpha = Math.min(1, dt * 6);
    const emotions = {} as EmotionWeights;
    for (const n of EMOTION_NAMES) {
      const prev = this.prevEmotion[n] ?? 0;
      emotions[n] = prev + (emotionsRaw[n] - prev) * emoAlpha;
    }
    this.prevEmotion = emotions;
    const dom = dominantEmotion(emotions);

    // -------- Apply emotion overlay BIAS to channels --------------------
    // Overlays are ADDED to the user's measured motion. Coefficients are tuned
    // so a confidently classified emotion drives the geometry far enough to
    // read on a phone screen even when the user under-performs.
    const eHappy = emotions.happy + emotions.laughing * 0.7;
    const eLaugh = emotions.laughing;
    const eSurp = emotions.surprised;
    const eAngry = emotions.angry;
    const eSad = emotions.sad;
    const eConf = emotions.confused;

    const finalSmile = clamp01(smile + eHappy * 0.55);
    const finalSmileL = clamp01(smileL + eHappy * 0.55);
    const finalSmileR = clamp01(smileR + eHappy * 0.55);
    // Frown gets a much stronger sad bias + a touch from angry/confused so
    // sad/troubled mouths actually droop on the avatar.
    const finalFrown = clamp01(frown + eSad * 0.80 + eAngry * 0.20 + eConf * 0.20);
    const finalOpen = clamp01(open + eLaugh * 0.28 + eSurp * 0.22);
    // Anger and happy both squint the eyes; this sells the "怒" furrow.
    const finalSquintL = clamp01(squintL + eHappy * 0.40 + eAngry * 0.40);
    const finalSquintR = clamp01(squintR + eHappy * 0.40 + eAngry * 0.40);
    const finalWideL = clamp01(wideL + eSurp * 0.55);
    const finalWideR = clamp01(wideR + eSurp * 0.55);
    const finalRaiseL = clamp01(raiseL + eSurp * 0.45 + eHappy * 0.10);
    const finalRaiseR = clamp01(raiseR + eSurp * 0.45 + eHappy * 0.10);
    // Brow-down: anger drives it hard; this is the dominant readable cue for 怒.
    const finalDownL = clamp01(downL + eAngry * 0.80);
    const finalDownR = clamp01(downR + eAngry * 0.80);
    // Inner-brow-up: the ▲ "sad/troubled" eyebrows. Boost on sad and confused
    // so 困り顔 reads instantly. Surprise also lifts inner brows.
    const finalInnerUp = clamp01(innerUp + eSad * 0.85 + eSurp * 0.30 + eConf * 0.65);
    const finalCheekL = clamp01(cheekRaiseL + eHappy * 0.55);
    const finalCheekR = clamp01(cheekRaiseR + eHappy * 0.55);
    const finalCornerUp = clamp01(cornerUp + eHappy * 0.55);
    // Corner-down: sad pulls hard, anger pulls some, confused a touch.
    const finalCornerDown = clamp01(cornerDown + eSad * 0.70 + eAngry * 0.30 + eConf * 0.20);

    // Inject random idle blink on top of the measured one. Take whichever is
    // bigger so a real blink wins over the timer-driven one.
    const blinkBoost = idle.blinkPulse;
    const finalBlinkL = Math.max(blinkL, blinkBoost);
    const finalBlinkR = Math.max(blinkR, blinkBoost);

    return {
      detected: true,
      mouth: {
        open: finalOpen,
        wide,
        smile: finalSmile,
        smileL: finalSmileL,
        smileR: finalSmileR,
        frown: finalFrown,
        pucker,
        funnel,
        stretch,
        upperRaise,
        lowerDrop: clamp01(lowerDrop + close * 0.0),
        cornerUp: finalCornerUp,
        cornerDown: finalCornerDown,
        shoutness: clamp01(shoutness + eLaugh * 0.3),
        shiftX,
        speakIntensity: this.speak,
        viseme,
        teethVisible: clamp01(teethVisible + eLaugh * 0.2),
      },
      eyes: {
        blinkL: finalBlinkL,
        blinkR: finalBlinkR,
        squintL: finalSquintL,
        squintR: finalSquintR,
        wideL: finalWideL,
        wideR: finalWideR,
        lookX,
        lookY,
      },
      brows: {
        raiseL: finalRaiseL,
        raiseR: finalRaiseR,
        downL: finalDownL,
        downR: finalDownR,
        innerUp: finalInnerUp,
        asymmetry,
      },
      cheeks: {
        puff: cheekPuff,
        raiseL: finalCheekL,
        raiseR: finalCheekR,
      },
      emotions,
      dominant: dom.name,
      intensity: dom.intensity,
      idle,
      timestampMs: now,
    };
  }
}

function clamp01Sym(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
