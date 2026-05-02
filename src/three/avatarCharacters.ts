export type CharacterType = 'child' | 'boy' | 'girl' | 'woman' | 'uncle' | 'grandpa';

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
  hairStyle: 'child' | 'boyswept' | 'girllong' | 'woman' | 'man' | 'grandpa';
  // Special decorative features
  hasLashes: boolean;
  hasBlush: boolean;   // permanent rose cheek circles (Memoji-style)
  blushColor: number;
  // Beauty / Memoji-quality detailing
  hasEyeMakeup: boolean;       // soft eyeshadow + thin eyeliner
  hasLipGloss: boolean;        // cupid's bow accent + glossy lower lip
  hasHairBangs: boolean;       // side-swept front bangs
  hasHairHighlights: boolean;  // subtle lighter strands embedded in hair
  hasEyeAccents: boolean;      // larger iris highlight + glow ring + accent dot
  hasBeard: boolean;
  beardColor: number;
  beardStyle: 'none' | 'stubble' | 'full';
  hasGlasses: boolean;
  hasWrinkles: boolean;
}

// =============================================================================
// MEMOJI-STYLE CHARACTER CONFIGS
// =============================================================================
// All characters are tuned to match Apple's Memoji aesthetic:
// - Round, almost spherical heads
// - LARGE expressive eyes (key Memoji signature)
// - Tiny, simple nose
// - Warm yellow-toned skin
// - Smooth glossy 3D feel
// =============================================================================

export const CHARACTERS: Record<CharacterType, CharacterConfig> = {
  child: {
    labelJa: '子供',
    // Perfectly round Memoji-style head
    headScaleX: 1.00,
    headScaleY: 1.04,
    headScaleZ: 0.98,
    // BIG Memoji eyes — much larger than before
    eyeRadius: 0.245,
    eyeOffsetX: 0.310,
    eyeOffsetY: 0.085,
    eyeZ: 0.760,
    // Big chocolate iris fills most of the eye
    irisRadius: 0.165,
    // Soft chunky brows that read clearly
    browWidth: 0.32,
    browHeight: 0.062,
    browDepth: 0.075,
    browOffsetX: 0.310,
    browOffsetY: 0.380,
    browOffsetZ: 0.800,
    browRotY: 0.16,
    browRotZInner: 0.04,
    // Tiny button nose (Memoji-style)
    noseRadius: 0.055,
    noseOffsetY: -0.08,
    noseZ: 0.945,
    noseScaleX: 0.85,
    noseScaleY: 0.90,
    noseScaleZ: 0.70,
    earRadius: 0.12,
    earOffsetX: 0.88,
    // Mouth — slightly higher and softer
    mouthOffsetY: -0.32,
    mouthOffsetZ: 0.825,
    lipTorusRadius: 0.140,
    lipTubeRadius: 0.038,
    // Plump cheeks
    cheekRadius: 0.22,
    cheekOffsetX: 0.46,
    cheekOffsetY: -0.12,
    cheekOffsetZ: 0.66,
    // === Memoji warm yellow skin tone ===
    skinColor: 0xf4c896,    // signature Memoji yellow-warm
    cheekColor: 0xe89580,
    hairColor: 0x3d2817,    // rich dark brown
    irisColor: 0x4a2a14,    // warm chocolate
    lipColor: 0xc77065,     // soft warm lip
    browColor: 0x3d2817,
    hairStyle: 'child',
    hasLashes: false,
    hasBlush: true,         // gentle blush — Memoji always has it
    blushColor: 0xff9985,
    hasEyeMakeup: false,
    hasLipGloss: false,
    hasHairBangs: false,
    hasHairHighlights: false,
    hasEyeAccents: false,
    hasBeard: false,
    beardColor: 0x1a0d06,
    beardStyle: 'none',
    hasGlasses: false,
    hasWrinkles: false,
  },

  // Reference: chubby-cheeked boy with volumized swept-back chocolate hair,
  // big chocolate eyes, peachy skin, soft natural mouth.
  boy: {
    labelJa: '少年',
    // Round, slightly chubby head — fuller cheeks/jaw than the child preset
    headScaleX: 1.04,
    headScaleY: 1.04,
    headScaleZ: 1.00,
    // Big Memoji eyes
    eyeRadius: 0.235,
    eyeOffsetX: 0.300,
    eyeOffsetY: 0.080,
    eyeZ: 0.770,
    irisRadius: 0.158,
    // Thicker natural brows arched gently — the dominant feature in the ref
    browWidth: 0.30,
    browHeight: 0.062,
    browDepth: 0.075,
    browOffsetX: 0.300,
    browOffsetY: 0.355,
    browOffsetZ: 0.810,
    browRotY: 0.16,
    browRotZInner: 0.05,
    // Tiny rounded nose
    noseRadius: 0.060,
    noseOffsetY: -0.07,
    noseZ: 0.945,
    noseScaleX: 0.92,
    noseScaleY: 0.95,
    noseScaleZ: 0.78,
    earRadius: 0.13,
    earOffsetX: 0.91,
    // Soft closed mouth — slightly higher and narrower than child
    mouthOffsetY: -0.34,
    mouthOffsetZ: 0.825,
    lipTorusRadius: 0.122,
    lipTubeRadius: 0.034,
    // Round, full cheeks — pushed forward more than child for chubby look
    cheekRadius: 0.24,
    cheekOffsetX: 0.50,
    cheekOffsetY: -0.13,
    cheekOffsetZ: 0.62,
    // Peachy ivory skin to match reference (slightly less yellow than child)
    skinColor: 0xf5cdaf,
    cheekColor: 0xeb9c8a,
    // Rich chocolate hair, slightly cooler than child's brown
    hairColor: 0x432817,
    irisColor: 0x4a2a14,
    lipColor: 0xc97f72,
    browColor: 0x432817,
    hairStyle: 'boyswept',
    hasLashes: false,
    hasBlush: true,
    blushColor: 0xff9985,
    hasEyeMakeup: false,
    hasLipGloss: false,
    hasHairBangs: false,
    hasHairHighlights: false,
    hasEyeAccents: false,
    hasBeard: false,
    beardColor: 0x1a0d06,
    beardStyle: 'none',
    hasGlasses: false,
    hasWrinkles: false,
  },

  // Reference: friendly girl with warm bright yellow skin, large brown Memoji eyes,
  // long dark brown wavy hair flowing to one side, soft gentle expression
  girl: {
    labelJa: '少女',
    // Round head with gentle proportions
    headScaleX: 1.02,
    headScaleY: 1.05,
    headScaleZ: 0.99,
    // Large expressive Memoji eyes with warm brown irises
    eyeRadius: 0.240,
    eyeOffsetX: 0.305,
    eyeOffsetY: 0.085,
    eyeZ: 0.770,
    irisRadius: 0.162,
    // Soft, natural-looking brows — straight-ish and gentle
    browWidth: 0.28,
    browHeight: 0.056,
    browDepth: 0.070,
    browOffsetX: 0.305,
    browOffsetY: 0.360,
    browOffsetZ: 0.810,
    browRotY: 0.15,
    browRotZInner: 0.05,
    // Small, round nose (not assertive)
    noseRadius: 0.058,
    noseOffsetY: -0.065,
    noseZ: 0.943,
    noseScaleX: 0.90,
    noseScaleY: 0.93,
    noseScaleZ: 0.76,
    earRadius: 0.12,
    earOffsetX: 0.90,
    // Soft, subtle mouth with gentle smile
    mouthOffsetY: -0.330,
    mouthOffsetZ: 0.828,
    lipTorusRadius: 0.118,
    lipTubeRadius: 0.030,
    // Soft, approachable cheeks
    cheekRadius: 0.22,
    cheekOffsetX: 0.48,
    cheekOffsetY: -0.11,
    cheekOffsetZ: 0.64,
    // Bright warm yellow skin (Memoji emoji-style)
    skinColor: 0xf4d896,
    cheekColor: 0xff9985,
    // Dark chocolate brown hair
    hairColor: 0x3d2817,
    irisColor: 0x4a2a14,
    lipColor: 0xc77065,
    browColor: 0x3d2817,
    hairStyle: 'girllong',
    hasLashes: false,
    hasBlush: true,
    blushColor: 0xff9985,
    hasEyeMakeup: false,
    hasLipGloss: false,
    hasHairBangs: false,
    hasHairHighlights: false,
    hasEyeAccents: false,
    hasBeard: false,
    beardColor: 0x1a0d06,
    beardStyle: 'none',
    hasGlasses: false,
    hasWrinkles: false,
  },

  woman: {
    labelJa: '女性',
    // Round but slightly more oval — feminine
    headScaleX: 0.96,
    headScaleY: 1.05,
    headScaleZ: 0.95,
    // Large doe eyes — biggest in the lineup
    eyeRadius: 0.250,
    eyeOffsetX: 0.295,
    eyeOffsetY: 0.100,
    eyeZ: 0.770,
    irisRadius: 0.175,
    // Thin elegant arched brows
    browWidth: 0.26,
    browHeight: 0.040,
    browDepth: 0.045,
    browOffsetX: 0.295,
    browOffsetY: 0.395,
    browOffsetZ: 0.815,
    browRotY: 0.14,
    browRotZInner: 0.10,
    // Tiny refined nose
    noseRadius: 0.045,
    noseOffsetY: -0.07,
    noseZ: 0.935,
    noseScaleX: 0.78,
    noseScaleY: 0.82,
    noseScaleZ: 0.65,
    earRadius: 0.10,
    earOffsetX: 0.85,
    mouthOffsetY: -0.300,
    mouthOffsetZ: 0.835,
    lipTorusRadius: 0.155,
    lipTubeRadius: 0.050,
    cheekRadius: 0.21,
    cheekOffsetX: 0.42,
    cheekOffsetY: -0.09,
    cheekOffsetZ: 0.69,
    // Slightly lighter porcelain-yellow
    skinColor: 0xfdd6a8,
    cheekColor: 0xff9088,
    hairColor: 0x2a1612,
    irisColor: 0x4a2a14,
    lipColor: 0xc46878,
    browColor: 0x2a1612,
    hairStyle: 'woman',
    hasLashes: true,
    hasBlush: true,
    blushColor: 0xff9088,
    hasEyeMakeup: true,
    hasLipGloss: true,
    hasHairBangs: true,
    hasHairHighlights: true,
    hasEyeAccents: true,
    hasBeard: false,
    beardColor: 0x1e0e06,
    beardStyle: 'none',
    hasGlasses: false,
    hasWrinkles: false,
  },

  uncle: {
    labelJa: 'おじさん',
    // Slightly fuller, square-ish round head
    headScaleX: 1.04,
    headScaleY: 1.02,
    headScaleZ: 0.99,
    // Eyes still large but slightly smaller than child/woman
    eyeRadius: 0.215,
    eyeOffsetX: 0.320,
    eyeOffsetY: 0.075,
    eyeZ: 0.755,
    irisRadius: 0.140,
    // Heavier masculine brows
    browWidth: 0.34,
    browHeight: 0.078,
    browDepth: 0.082,
    browOffsetX: 0.320,
    browOffsetY: 0.345,
    browOffsetZ: 0.785,
    browRotY: 0.17,
    browRotZInner: 0.04,
    // Small but prominent-ish nose
    noseRadius: 0.070,
    noseOffsetY: -0.075,
    noseZ: 0.950,
    noseScaleX: 0.95,
    noseScaleY: 0.98,
    noseScaleZ: 0.78,
    earRadius: 0.14,
    earOffsetX: 0.90,
    mouthOffsetY: -0.355,
    mouthOffsetZ: 0.795,
    lipTorusRadius: 0.135,
    lipTubeRadius: 0.038,
    cheekRadius: 0.24,
    cheekOffsetX: 0.48,
    cheekOffsetY: -0.15,
    cheekOffsetZ: 0.64,
    // Tan Memoji skin
    skinColor: 0xd4a070,
    cheekColor: 0xc77565,
    hairColor: 0x2a1810,
    irisColor: 0x3a2010,
    lipColor: 0xa56050,
    browColor: 0x2a1810,
    hairStyle: 'man',
    hasLashes: false,
    hasBlush: false,
    blushColor: 0xff8888,
    hasEyeMakeup: false,
    hasLipGloss: false,
    hasHairBangs: false,
    hasHairHighlights: false,
    hasEyeAccents: false,
    hasBeard: true,
    beardColor: 0x1e1208,
    beardStyle: 'stubble',
    hasGlasses: false,
    hasWrinkles: false,
  },

  grandpa: {
    labelJa: 'おじいちゃん',
    headScaleX: 1.02,
    headScaleY: 1.02,
    headScaleZ: 0.98,
    eyeRadius: 0.205,
    eyeOffsetX: 0.305,
    eyeOffsetY: 0.075,
    eyeZ: 0.760,
    irisRadius: 0.135,
    browWidth: 0.355,
    browHeight: 0.088,
    browDepth: 0.090,
    browOffsetX: 0.305,
    browOffsetY: 0.330,
    browOffsetZ: 0.785,
    browRotY: 0.16,
    browRotZInner: 0.03,
    noseRadius: 0.078,
    noseOffsetY: -0.080,
    noseZ: 0.955,
    noseScaleX: 0.98,
    noseScaleY: 1.00,
    noseScaleZ: 0.82,
    earRadius: 0.15,
    earOffsetX: 0.89,
    mouthOffsetY: -0.365,
    mouthOffsetZ: 0.785,
    lipTorusRadius: 0.130,
    lipTubeRadius: 0.036,
    cheekRadius: 0.23,
    cheekOffsetX: 0.45,
    cheekOffsetY: -0.16,
    cheekOffsetZ: 0.63,
    skinColor: 0xc89878,
    cheekColor: 0xb87060,
    hairColor: 0xc8c0b8,    // silver-gray
    irisColor: 0x506575,
    lipColor: 0x956055,
    browColor: 0xd2cac2,
    hairStyle: 'grandpa',
    hasLashes: false,
    hasBlush: false,
    blushColor: 0xff8888,
    hasEyeMakeup: false,
    hasLipGloss: false,
    hasHairBangs: false,
    hasHairHighlights: false,
    hasEyeAccents: false,
    hasBeard: true,
    beardColor: 0xd2cac2,
    beardStyle: 'full',
    hasGlasses: true,
    hasWrinkles: true,
  },
};

export const CHARACTER_ORDER: CharacterType[] = ['child', 'boy', 'girl', 'woman', 'uncle', 'grandpa'];
