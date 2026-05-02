import * as THREE from 'three';

// =============================================================================
// MEMOJI-STYLE PALETTE
// =============================================================================
// Tuned to feel like Apple's Memoji: warm yellow skin, dark chocolate hair,
// glossy 3D feel, soft pink lips, big chocolate eyes.
// =============================================================================
export const PALETTE = {
  skin: 0xf4c896,         // warm Memoji yellow
  cheek: 0xff9985,
  hair: 0x3d2817,         // dark chocolate brown
  brow: 0x3d2817,
  sclera: 0xfaf6ee,       // slightly warm white
  iris: 0x4a2a14,         // chocolate brown
  pupil: 0x0a0807,
  hilite: 0xffffff,
  lip: 0xc77065,          // soft warm pink
  mouthCavity: 0x3a0e0e,
  tongue: 0xe46a7a,
  teeth: 0xfdf2dc,
};

export type AvatarMaterials = {
  skin: THREE.MeshStandardMaterial;
  cheek: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  brow: THREE.MeshStandardMaterial;
  sclera: THREE.MeshStandardMaterial;
  iris: THREE.MeshStandardMaterial;
  pupil: THREE.MeshBasicMaterial;
  hilite: THREE.MeshBasicMaterial;
  lip: THREE.MeshStandardMaterial;
  mouthCavity: THREE.MeshStandardMaterial;
  tongue: THREE.MeshStandardMaterial;
  teeth: THREE.MeshStandardMaterial;
  dispose: () => void;
};

export type ColorOverrides = Partial<{
  skin: number;
  cheek: number;
  hair: number;
  brow: number;
  iris: number;
  lip: number;
}>;

export function createAvatarMaterials(overrides: ColorOverrides = {}): AvatarMaterials {
  const p = { ...PALETTE, ...overrides };

  // Skin: smooth, glossy Memoji feel.
  // Lower roughness = shinier (Memoji has a noticeable specular highlight).
  // Warm emissive ensures it never falls dark in shadow.
  const skinBase = new THREE.Color(p.skin);
  const emissiveSkin = skinBase.clone().multiplyScalar(0.18);

  const skin = new THREE.MeshStandardMaterial({
    color: p.skin,
    roughness: 0.42,           // Memoji-glossy
    metalness: 0.0,
    emissive: emissiveSkin,
    emissiveIntensity: 1.0,
  });

  // Cheek blush — additive overlay sphere
  const cheek = new THREE.MeshStandardMaterial({
    color: p.cheek,
    roughness: 0.5,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
  });

  // Hair: glossy chocolate, very smooth
  const hair = new THREE.MeshStandardMaterial({
    color: p.hair,
    roughness: 0.38,
    metalness: 0.05,
    emissive: new THREE.Color(p.hair).multiplyScalar(0.12),
    emissiveIntensity: 0.6,
  });

  const brow = new THREE.MeshStandardMaterial({
    color: p.brow,
    roughness: 0.5,
    metalness: 0.0,
  });

  // Sclera (eye white): subtle warmth, glossy
  const sclera = new THREE.MeshStandardMaterial({
    color: PALETTE.sclera,
    roughness: 0.18,
    metalness: 0.0,
    emissive: new THREE.Color(0xf5e6d6),
    emissiveIntensity: 0.18,
  });

  // Iris: rich, slightly luminous brown
  const iris = new THREE.MeshStandardMaterial({
    color: p.iris,
    roughness: 0.3,
    metalness: 0.08,
    emissive: new THREE.Color(p.iris).multiplyScalar(0.25),
    emissiveIntensity: 0.5,
  });

  const pupil = new THREE.MeshBasicMaterial({ color: PALETTE.pupil });
  const hilite = new THREE.MeshBasicMaterial({ color: PALETTE.hilite });

  // Lips: glossy, juicy
  const lip = new THREE.MeshStandardMaterial({
    color: p.lip,
    roughness: 0.28,
    metalness: 0.04,
    emissive: new THREE.Color(p.lip).multiplyScalar(0.18),
    emissiveIntensity: 0.5,
  });

  const mouthCavity = new THREE.MeshStandardMaterial({
    color: PALETTE.mouthCavity,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const tongue = new THREE.MeshStandardMaterial({
    color: PALETTE.tongue,
    roughness: 0.4,
    metalness: 0.02,
  });

  const teeth = new THREE.MeshStandardMaterial({
    color: PALETTE.teeth,
    roughness: 0.25,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
  });

  const dispose = () => {
    [skin, cheek, hair, brow, sclera, iris, pupil, hilite, lip, mouthCavity, tongue, teeth].forEach(
      (m) => m.dispose(),
    );
  };

  return { skin, cheek, hair, brow, sclera, iris, pupil, hilite, lip, mouthCavity, tongue, teeth, dispose };
}
