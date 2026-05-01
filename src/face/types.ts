// Centralised expression channel names so smoothing, calibration, and the
// avatar rig agree on what to read.

export const BLENDSHAPE_CHANNELS = [
  'jawOpen',
  'jawLeft',
  'jawRight',
  'jawForward',
  'mouthClose',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthPucker',
  'mouthFunnel',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthRollUpper',
  'mouthRollLower',
  'mouthShrugUpper',
  'mouthShrugLower',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthLeft',
  'mouthRight',
  'tongueOut',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'eyeLookInLeft',
  'eyeLookOutLeft',
  'eyeLookInRight',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookDownLeft',
  'eyeLookUpRight',
  'eyeLookDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'browDownLeft',
  'browDownRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'noseSneerLeft',
  'noseSneerRight',
] as const;

export type BlendshapeName = (typeof BLENDSHAPE_CHANNELS)[number];

export type BlendshapeMap = Record<BlendshapeName, number>;

export type FaceState = {
  detected: boolean;
  /** 16-element column-major matrix from FaceLandmarker (cm units). */
  headMatrix: Float32Array;
  bs: BlendshapeMap;
  timestampMs: number;
};

export function emptyBlendshapes(): BlendshapeMap {
  const out = {} as BlendshapeMap;
  for (const k of BLENDSHAPE_CHANNELS) out[k] = 0;
  return out;
}

export function emptyFaceState(): FaceState {
  return {
    detected: false,
    headMatrix: identityMatrix4(),
    bs: emptyBlendshapes(),
    timestampMs: 0,
  };
}

export function identityMatrix4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

// ---------------------------------------------------------------------------
// Higher-level "performance" state derived from blendshapes by ExpressionEngine.
// applyExpression reads this rather than the raw blendshape map so we can mix
// emotion overlays, visemes, and idle motion into a single coherent target.

export type Viseme =
  | 'closed'
  | 'A'
  | 'I'
  | 'U'
  | 'E'
  | 'O'
  | 'smile-open'
  | 'shout'
  | 'pucker';

export const EMOTION_NAMES = [
  'neutral',
  'happy',
  'laughing',
  'surprised',
  'angry',
  'sad',
  'confused',
] as const;
export type EmotionName = (typeof EMOTION_NAMES)[number];
export type EmotionWeights = Record<EmotionName, number>;

export type ExpressionState = {
  detected: boolean;
  mouth: {
    /** 0..1 vertical opening (jaw + lip drop combined, amplified) */
    open: number;
    /** -1..1 horizontal: positive = wide/smile, negative = pucker/funnel */
    wide: number;
    smile: number;
    smileL: number;
    smileR: number;
    frown: number;
    pucker: number;
    funnel: number;
    stretch: number;
    upperRaise: number;
    lowerDrop: number;
    cornerUp: number;
    cornerDown: number;
    /** Wide-open shouting amount (laugh / scream) */
    shoutness: number;
    shiftX: number;
    /** Smoothed instantaneous speech intensity (driven by jaw delta + open). */
    speakIntensity: number;
    viseme: Viseme;
    /** True when the mouth should reveal teeth/cavity. */
    teethVisible: number;
  };
  eyes: {
    blinkL: number;
    blinkR: number;
    /** 0..1 squint (laughing/angry tightens the eye). */
    squintL: number;
    squintR: number;
    wideL: number;
    wideR: number;
    /** -1..1; positive = looking to the model's right. */
    lookX: number;
    /** -1..1; positive = looking up. */
    lookY: number;
  };
  brows: {
    raiseL: number;
    raiseR: number;
    downL: number;
    downR: number;
    innerUp: number;
    /** -1..1 left/right asymmetry for "confused" tilt. */
    asymmetry: number;
  };
  cheeks: {
    puff: number;
    raiseL: number;
    raiseR: number;
  };
  emotions: EmotionWeights;
  dominant: EmotionName;
  /** 0..1 strength of the dominant emotion (after normalization). */
  intensity: number;
  /** Idle micro-motion overlays (added in addition to FaceLandmarker output). */
  idle: {
    blinkPulse: number;
    gazeDriftX: number;
    gazeDriftY: number;
    breath: number;
  };
  timestampMs: number;
};

export function emptyExpressionState(): ExpressionState {
  const emotions = {} as EmotionWeights;
  for (const k of EMOTION_NAMES) emotions[k] = 0;
  emotions.neutral = 1;
  return {
    detected: false,
    mouth: {
      open: 0,
      wide: 0,
      smile: 0,
      smileL: 0,
      smileR: 0,
      frown: 0,
      pucker: 0,
      funnel: 0,
      stretch: 0,
      upperRaise: 0,
      lowerDrop: 0,
      cornerUp: 0,
      cornerDown: 0,
      shoutness: 0,
      shiftX: 0,
      speakIntensity: 0,
      viseme: 'closed',
      teethVisible: 0,
    },
    eyes: {
      blinkL: 0,
      blinkR: 0,
      squintL: 0,
      squintR: 0,
      wideL: 0,
      wideR: 0,
      lookX: 0,
      lookY: 0,
    },
    brows: {
      raiseL: 0,
      raiseR: 0,
      downL: 0,
      downR: 0,
      innerUp: 0,
      asymmetry: 0,
    },
    cheeks: { puff: 0, raiseL: 0, raiseR: 0 },
    emotions,
    dominant: 'neutral',
    intensity: 0,
    idle: { blinkPulse: 0, gazeDriftX: 0, gazeDriftY: 0, breath: 0 },
    timestampMs: 0,
  };
}
