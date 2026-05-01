import * as THREE from 'three';

// Reference image is the iOS Memoji creation screen — yellow emoji-style skin,
// dark brown sculpted hair, big eyes with chocolate-brown irises, pink mouth.
// All colours below are picked from that look but rendered with custom Three.js
// geometry only (no Apple assets, no VRM, all original meshes).
export const PALETTE = {
  skin: 0xf6c945,
  skinShade: 0xcaa017,
  cheek: 0xf2b56a, // warmer skin tone for the cheek puff that lifts on smile
  hair: 0x3a2218,
  hairHighlight: 0x4d2d1d,
  brow: 0x2c1810,
  sclera: 0xffffff,
  // Slightly brighter, more saturated brown — readable iris is the
  // single biggest "is this thing alive" cue at thumbnail size.
  iris: 0x6a3a1d,
  pupil: 0x0a0a0a,
  hilite: 0xffffff,
  lip: 0xc24c50,
  mouthCavity: 0x4a1414,
  tongue: 0xe46a7a,
  teeth: 0xf6f1e6,
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
  const skin = new THREE.MeshStandardMaterial({
    color: PALETTE.skin,
    roughness: 0.42,
    metalness: 0.0,
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
