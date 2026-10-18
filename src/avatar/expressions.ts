import { emptyBlendshapes, type BlendshapeMap } from "../face/types";
export const EXPRESSIONS: Record<
  string,
  { label: string; channels: Partial<BlendshapeMap> }
> = {
  neutral: { label: "ニュートラル", channels: {} },
  smile: {
    label: "笑顔",
    channels: {
      mouthSmileLeft: 0.85,
      mouthSmileRight: 0.85,
      cheekSquintLeft: 0.35,
      cheekSquintRight: 0.35,
    },
  },
  laugh: {
    label: "大笑い",
    channels: {
      jawOpen: 0.9,
      mouthSmileLeft: 1,
      mouthSmileRight: 1,
      eyeSquintLeft: 0.7,
      eyeSquintRight: 0.7,
    },
  },
  surprise: {
    label: "驚き",
    channels: {
      jawOpen: 0.75,
      mouthFunnel: 0.5,
      browInnerUp: 0.8,
      browOuterUpLeft: 0.7,
      browOuterUpRight: 0.7,
      eyeWideLeft: 1,
      eyeWideRight: 1,
    },
  },
  angry: {
    label: "怒り",
    channels: {
      browDownLeft: 1,
      browDownRight: 1,
      mouthFrownLeft: 0.5,
      mouthFrownRight: 0.5,
    },
  },
  sad: {
    label: "悲しみ",
    channels: { browInnerUp: 1, mouthFrownLeft: 0.85, mouthFrownRight: 0.85 },
  },
  cry: {
    label: "泣き顔",
    channels: {
      browInnerUp: 1,
      mouthFrownLeft: 1,
      mouthFrownRight: 1,
      eyeSquintLeft: 0.8,
      eyeSquintRight: 0.8,
      jawOpen: 0.35,
    },
  },
  wink: {
    label: "ウインク",
    channels: { eyeBlinkLeft: 1, mouthSmileLeft: 0.6, mouthSmileRight: 0.3 },
  },
  blink: { label: "閉じる", channels: { eyeBlinkLeft: 1, eyeBlinkRight: 1 } },
  kiss: { label: "すぼめる", channels: { mouthPucker: 1 } },
};
export function expressionChannels(name: string) {
  return Object.assign(emptyBlendshapes(), EXPRESSIONS[name]?.channels);
}
