import * as THREE from 'three';

// Tuned away from the iOS Memoji yellow toward a warm human-skin palette while
// keeping the stylised character look. The avatar still uses the same rig
// (single lipsOuter torus, fade-in cheeks, fade-in teeth, big readable iris)
// but the colours read as a person rather than an emoji.
export const PALETTE = {
  skin: 0xe8b89c,
  skinShade: 0xc88f72, // used by the neck so the chin->neck transition reads
  cheek: 0xd97a6b, // pinker blush that fades in on smile/laugh
  hair: 0x2c1a12,
  hairHighlight: 0x4a2d1d,
  brow: 0x2c1a12,
  sclera: 0xfaf6f0,
  // Readable mid-brown iris — still the single biggest "alive" cue at
  // thumbnail size, but warmer than a saturated chocolate brown.
  iris: 0x5a3320,
  pupil: 0x0a0807,
  hilite: 0xffffff,
  lip: 0xb05a55, // toned-down rose, closer to natural lip than primary red
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
  const cheek = new THREE.MeshStandardMaterial({
    color: PALETTE.cheek,
    roughness: 0.55,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0, // faded in by applyExpression on smile/laugh.
  });
  const hair = new THREE.MeshStandardMaterial({
    color: PALETTE.hair,
    roughness: 0.55,
    metalness: 0.0,
  });
  const brow = new THREE.MeshStandardMaterial({
    color: PALETTE.brow,
    roughness: 0.6,
    metalness: 0.0,
  });
  const sclera = new THREE.MeshStandardMaterial({
    color: PALETTE.sclera,
    roughness: 0.25,
    metalness: 0.0,
  });
  const iris = new THREE.MeshStandardMaterial({
    color: PALETTE.iris,
    roughness: 0.5,
    metalness: 0.0,
  });
  const pupil = new THREE.MeshBasicMaterial({ color: PALETTE.pupil });
  const hilite = new THREE.MeshBasicMaterial({ color: PALETTE.hilite });
  const lip = new THREE.MeshStandardMaterial({
    color: PALETTE.lip,
    roughness: 0.45,
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
    opacity: 0.0, // revealed by applyExpression when the mouth opens.
  });

  const dispose = () => {
    [skin, cheek, hair, brow, sclera, iris, pupil, hilite, lip, mouthCavity, tongue, teeth].forEach(
      (m) => m.dispose(),
    );
  };

  return {
    skin,
    cheek,
    hair,
    brow,
    sclera,
    iris,
    pupil,
    hilite,
    lip,
    mouthCavity,
    tongue,
    teeth,
    dispose,
  };
}
