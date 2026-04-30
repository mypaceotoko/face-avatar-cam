// Centralised expression channel names so smoothing, calibration, and the
// avatar rig agree on what to read.

export const BLENDSHAPE_CHANNELS = [
  'jawOpen',
  'mouthClose',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
  'mouthFunnel',
  'eyeBlinkLeft',
  'eyeBlinkRight',
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
