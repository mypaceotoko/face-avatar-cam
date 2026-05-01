export type CharacterType = 'child' | 'woman' | 'uncle' | 'grandpa';

export interface CharacterConfig {
  labelJa: string;
  // Head geometry scales (applied to skull mesh)
  headScaleX: number;
  headScaleY: number;
  headScaleZ: number;
  // Sclera radius and eye position in head-group local space
  eyeRadius: number;
  eyeOffsetX: number;
  eyeOffsetY: number;
  eyeZ: number;
  irisRadius: number;
  // Eyebrow box geometry
  browWidth: number;
  browHeight: number;
  browDepth: number;
  browOffsetX: number;
  browOffsetY: number;
  browOffsetZ: number;
  browRotY: number;       // horizontal taper angle
  browRotZInner: number;  // slight upward arch toward inner corner
  // Nose sphere
  noseRadius: number;
  noseOffsetY: number;
  noseZ: number;
  noseScaleX: number;
  noseScaleY: number;
  noseScaleZ: number;
  // Ears
  earRadius: number;
  earOffsetX: number;
  // Mouth torus
  mouthOffsetY: number;
  mouthOffsetZ: number;
  lipTorusRadius: number;
  lipTubeRadius: number;
  // Cheeks
  cheekRadius: number;
  cheekOffsetX: number;
  cheekOffsetY: number;
  cheekOffsetZ: number;
  // Material colors
  skinColor: number;
  cheekColor: number;
  hairColor: number;
  irisColor: number;
  lipColor: number;
  browColor: number;
  // Hair style
  hairStyle: 'child' | 'woman' | 'man' | 'grandpa';
  // Special decorative features
  hasLashes: boolean;
  hasBeard: boolean;
  beardColor: number;
  beardStyle: 'none' | 'stubble' | 'full';
  hasGlasses: boolean;
  hasWrinkles: boolean;
}

export const CHARACTERS: Record<CharacterType, CharacterConfig> = {
  child: {
    labelJa: '子供',
    headScaleX: 1.0,
    headScaleY: 1.05,
    headScaleZ: 0.95,
    eyeRadius: 0.18,
    eyeOffsetX: 0.30,
    eyeOffsetY: 0.10,
    eyeZ: 0.78,
    irisRadius: 0.110,
    browWidth: 0.30,
    browHeight: 0.070,
    browDepth: 0.070,
    browOffsetX: 0.30,
    browOffsetY: 0.36,
    browOffsetZ: 0.83,
    browRotY: 0.18,
    browRotZInner: 0.06,
    noseRadius: 0.100,
    noseOffsetY: -0.05,
    noseZ: 0.92,
    noseScaleX: 1.00,
    noseScaleY: 0.95,
    noseScaleZ: 0.85,
    earRadius: 0.13,
    earOffsetX: 0.85,
    mouthOffsetY: -0.34,
    mouthOffsetZ: 0.82,
    lipTorusRadius: 0.180,
    lipTubeRadius: 0.045,
    cheekRadius: 0.22,
    cheekOffsetX: 0.45,
    cheekOffsetY: -0.15,
    cheekOffsetZ: 0.65,
    skinColor: 0xe8b89c,
    cheekColor: 0xd97a6b,
    hairColor: 0x2c1a12,
    irisColor: 0x5a3320,
    lipColor: 0xb05a55,
    browColor: 0x2c1a12,
    hairStyle: 'child',
    hasLashes: false,
    hasBeard: false,
    beardColor: 0x1a0d06,
    beardStyle: 'none',
    hasGlasses: false,
    hasWrinkles: false,
  },

  woman: {
    labelJa: '女性',
    headScaleX: 0.96,
    headScaleY: 1.06,
    headScaleZ: 0.92,
    eyeRadius: 0.175,
    eyeOffsetX: 0.285,
    eyeOffsetY: 0.115,
    eyeZ: 0.790,
    irisRadius: 0.118,
    browWidth: 0.26,
    browHeight: 0.052,
    browDepth: 0.058,
    browOffsetX: 0.285,
    browOffsetY: 0.375,
    browOffsetZ: 0.845,
    browRotY: 0.16,
    browRotZInner: 0.09,
    noseRadius: 0.082,
    noseOffsetY: -0.04,
    noseZ: 0.905,
    noseScaleX: 0.90,
    noseScaleY: 0.88,
    noseScaleZ: 0.78,
    earRadius: 0.11,
    earOffsetX: 0.82,
    mouthOffsetY: -0.32,
    mouthOffsetZ: 0.830,
    lipTorusRadius: 0.178,
    lipTubeRadius: 0.053,
    cheekRadius: 0.21,
    cheekOffsetX: 0.42,
    cheekOffsetY: -0.12,
    cheekOffsetZ: 0.67,
    skinColor: 0xf5c9a0,
    cheekColor: 0xe8857a,
    hairColor: 0x160a04,
    irisColor: 0x4a6275,
    lipColor: 0xc05878,
    browColor: 0x25140a,
    hairStyle: 'woman',
    hasLashes: true,
    hasBeard: false,
    beardColor: 0x160a04,
    beardStyle: 'none',
    hasGlasses: false,
    hasWrinkles: false,
  },

  uncle: {
    labelJa: 'おじさん',
    headScaleX: 1.07,
    headScaleY: 1.00,
    headScaleZ: 0.97,
    eyeRadius: 0.155,
    eyeOffsetX: 0.312,
    eyeOffsetY: 0.090,
    eyeZ: 0.770,
    irisRadius: 0.098,
    browWidth: 0.33,
    browHeight: 0.086,
    browDepth: 0.082,
    browOffsetX: 0.312,
    browOffsetY: 0.325,
    browOffsetZ: 0.800,
    browRotY: 0.19,
    browRotZInner: 0.05,
    noseRadius: 0.115,
    noseOffsetY: -0.06,
    noseZ: 0.935,
    noseScaleX: 1.10,
    noseScaleY: 1.00,
    noseScaleZ: 0.90,
    earRadius: 0.15,
    earOffsetX: 0.88,
    mouthOffsetY: -0.365,
    mouthOffsetZ: 0.805,
    lipTorusRadius: 0.165,
    lipTubeRadius: 0.042,
    cheekRadius: 0.24,
    cheekOffsetX: 0.47,
    cheekOffsetY: -0.17,
    cheekOffsetZ: 0.63,
    skinColor: 0xc8906a,
    cheekColor: 0xb87060,
    hairColor: 0x1a1005,
    irisColor: 0x38200e,
    lipColor: 0x9a5545,
    browColor: 0x1a1005,
    hairStyle: 'man',
    hasLashes: false,
    hasBeard: true,
    beardColor: 0x1e1208,
    beardStyle: 'stubble',
    hasGlasses: false,
    hasWrinkles: false,
  },

  grandpa: {
    labelJa: 'おじいちゃん',
    headScaleX: 1.04,
    headScaleY: 1.00,
    headScaleZ: 0.96,
    eyeRadius: 0.145,
    eyeOffsetX: 0.295,
    eyeOffsetY: 0.085,
    eyeZ: 0.775,
    irisRadius: 0.093,
    browWidth: 0.345,
    browHeight: 0.096,
    browDepth: 0.090,
    browOffsetX: 0.295,
    browOffsetY: 0.310,
    browOffsetZ: 0.800,
    browRotY: 0.18,
    browRotZInner: 0.04,
    noseRadius: 0.118,
    noseOffsetY: -0.065,
    noseZ: 0.945,
    noseScaleX: 1.12,
    noseScaleY: 1.03,
    noseScaleZ: 0.92,
    earRadius: 0.16,
    earOffsetX: 0.87,
    mouthOffsetY: -0.375,
    mouthOffsetZ: 0.795,
    lipTorusRadius: 0.155,
    lipTubeRadius: 0.040,
    cheekRadius: 0.23,
    cheekOffsetX: 0.44,
    cheekOffsetY: -0.18,
    cheekOffsetZ: 0.62,
    skinColor: 0xbf8565,
    cheekColor: 0xa96858,
    hairColor: 0xc0b8b0,
    irisColor: 0x506070,
    lipColor: 0x8a5048,
    browColor: 0xd0c8c0,
    hairStyle: 'grandpa',
    hasLashes: false,
    hasBeard: true,
    beardColor: 0xd0c8c0,
    beardStyle: 'full',
    hasGlasses: true,
    hasWrinkles: true,
  },
};

export const CHARACTER_ORDER: CharacterType[] = ['child', 'woman', 'uncle', 'grandpa'];
