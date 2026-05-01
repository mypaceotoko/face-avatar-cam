import * as THREE from 'three';

export const PALETTE = {
  skin: 0xe8b89c,
  cheek: 0xd97a6b,
  hair: 0x2c1a12,
  brow: 0x2c1a12,
  sclera: 0xfaf6f0,
  iris: 0x5a3320,
  pupil: 0x0a0807,
  hilite: 0xffffff,
  lip: 0xb05a55,
  mouthCavity: 0x3a0e0e,
  tongue: 0xd86878,
  teeth: 0xf5ece0,
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

  // Skin emissive: warm tint derived from the base skin color so darker
  // characters don't fall to flat black under the two-light rig.
  const skinBase = new THREE.Color(p.skin);
  const emissiveSkin = skinBase.clone().multiplyScalar(0.14);

  const skin = new THREE.MeshStandardMaterial({
    color: p.skin,
    roughness: 0.78,
    metalness: 0.0,
    emissive: emissiveSkin,
    emissiveIntensity: 1.0,
  });
  const cheek = new THREE.MeshStandardMaterial({
    color: p.cheek,
    roughness: 0.55,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: p.hair,
    roughness: 0.58,
    metalness: 0.0,
  });
  const brow = new THREE.MeshStandardMaterial({
    color: p.brow,
    roughness: 0.6,
    metalness: 0.0,
  });
  const sclera = new THREE.MeshStandardMaterial({
    color: PALETTE.sclera,
    roughness: 0.25,
    metalness: 0.0,
  });
  const iris = new THREE.MeshStandardMaterial({
    color: p.iris,
    roughness: 0.5,
    metalness: 0.0,
  });
  const pupil = new THREE.MeshBasicMaterial({ color: PALETTE.pupil });
  const hilite = new THREE.MeshBasicMaterial({ color: PALETTE.hilite });
  const lip = new THREE.MeshStandardMaterial({
    color: p.lip,
    roughness: 0.42,
    metalness: 0.0,
  });
  const mouthCavity = new THREE.MeshStandardMaterial({
    color: PALETTE.mouthCavity,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const tongue = new THREE.MeshStandardMaterial({
    color: PALETTE.tongue,
    roughness: 0.5,
    metalness: 0.0,
  });
  const teeth = new THREE.MeshStandardMaterial({
    color: PALETTE.teeth,
    roughness: 0.3,
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
