import * as THREE from 'three';

// Tuned away from the iOS Memoji yellow toward a warm human-skin palette while
// keeping the stylised character look. Skin is a soft peach with a tinted
// shade for cheeks; lips, gums, and tongue use natural mucosa colours; eyes
// keep the big-iris Memoji proportions but with a deeper brown.
export const PALETTE = {
  skin: 0xe8b89c,
  skinShade: 0xc88f72,
  cheek: 0xd97a6b,
  hair: 0x2c1a12,
  hairHighlight: 0x4a2d1d,
  brow: 0x2c1a12,
  sclera: 0xfaf6f0,
  iris: 0x4a2a18,
  pupil: 0x0a0807,
  hilite: 0xffffff,
  lipUpper: 0xa9534b,
  lipLower: 0xc2685c,
  mouthCavity: 0x3a0e0e,
  tongue: 0xd86878,
  teeth: 0xf5ece0,
};

export type AvatarMaterials = {
  skin: THREE.MeshStandardMaterial;
  skinShade: THREE.MeshStandardMaterial;
  cheek: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  brow: THREE.MeshStandardMaterial;
  sclera: THREE.MeshStandardMaterial;
  iris: THREE.MeshStandardMaterial;
  pupil: THREE.MeshBasicMaterial;
  hilite: THREE.MeshBasicMaterial;
  lipUpper: THREE.MeshStandardMaterial;
  lipLower: THREE.MeshStandardMaterial;
  mouthCavity: THREE.MeshStandardMaterial;
  tongue: THREE.MeshStandardMaterial;
  teeth: THREE.MeshStandardMaterial;
  dispose: () => void;
};

export function createAvatarMaterials(): AvatarMaterials {
  // Skin: high roughness so it reads as matte human skin, with a tiny emissive
  // tint so cheeks/jaw never fall to pure black under our two-light rig.
  const skin = new THREE.MeshStandardMaterial({
    color: PALETTE.skin,
    roughness: 0.78,
    metalness: 0.0,
    emissive: 0x2a1208,
    emissiveIntensity: 0.18,
  });
  // Slightly darker variant used for the neck so the chin->neck transition is
  // visible without us having to draw a hard line.
  const skinShade = new THREE.MeshStandardMaterial({
    color: PALETTE.skinShade,
    roughness: 0.82,
    metalness: 0.0,
    emissive: 0x1a0a06,
    emissiveIntensity: 0.15,
  });
  const cheek = new THREE.MeshStandardMaterial({
    color: PALETTE.cheek,
    roughness: 0.72,
    metalness: 0.0,
    transparent: true,
    opacity: 0.55,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: PALETTE.hair,
    roughness: 0.5,
    metalness: 0.0,
  });
  const brow = new THREE.MeshStandardMaterial({
    color: PALETTE.brow,
    roughness: 0.6,
    metalness: 0.0,
  });
  const sclera = new THREE.MeshStandardMaterial({
    color: PALETTE.sclera,
    roughness: 0.18,
    metalness: 0.0,
  });
  const iris = new THREE.MeshStandardMaterial({
    color: PALETTE.iris,
    roughness: 0.45,
    metalness: 0.0,
  });
  const pupil = new THREE.MeshBasicMaterial({ color: PALETTE.pupil });
  const hilite = new THREE.MeshBasicMaterial({ color: PALETTE.hilite });
  const lipUpper = new THREE.MeshStandardMaterial({
    color: PALETTE.lipUpper,
    roughness: 0.38,
    metalness: 0.0,
  });
  const lipLower = new THREE.MeshStandardMaterial({
    color: PALETTE.lipLower,
    roughness: 0.36,
    metalness: 0.0,
  });
  const mouthCavity = new THREE.MeshStandardMaterial({
    color: PALETTE.mouthCavity,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const tongue = new THREE.MeshStandardMaterial({
    color: PALETTE.tongue,
    roughness: 0.45,
    metalness: 0.0,
  });
  const teeth = new THREE.MeshStandardMaterial({
    color: PALETTE.teeth,
    roughness: 0.3,
    metalness: 0.0,
  });

  const dispose = () => {
    [
      skin,
      skinShade,
      cheek,
      hair,
      brow,
      sclera,
      iris,
      pupil,
      hilite,
      lipUpper,
      lipLower,
      mouthCavity,
      tongue,
      teeth,
    ].forEach((m) => m.dispose());
  };

  return {
    skin,
    skinShade,
    cheek,
    hair,
    brow,
    sclera,
    iris,
    pupil,
    hilite,
    lipUpper,
    lipLower,
    mouthCavity,
    tongue,
    teeth,
    dispose,
  };
}
