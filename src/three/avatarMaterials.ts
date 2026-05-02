import * as THREE from 'three';

// Reference image is the iOS Memoji creation screen — yellow emoji-style skin,
// dark brown sculpted hair, big eyes with chocolate-brown irises, pink mouth.
// All colours below are picked from that look but rendered with custom Three.js
// geometry only (no Apple assets, no VRM, all original meshes).
export const PALETTE = {
  skin: 0xf6c945,
  skinShade: 0xcaa017,
  hair: 0x3a2218,
  hairHighlight: 0x4d2d1d,
  brow: 0x3a2218,
  sclera: 0xffffff,
  iris: 0x4a2a1a,
  pupil: 0x0a0a0a,
  hilite: 0xffffff,
  lip: 0xc97a6a,
  mouthCavity: 0x5a1a1a,
  tongue: 0xe46a7a,
};

export type AvatarMaterials = {
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  brow: THREE.MeshStandardMaterial;
  sclera: THREE.MeshStandardMaterial;
  iris: THREE.MeshStandardMaterial;
  pupil: THREE.MeshBasicMaterial;
  hilite: THREE.MeshBasicMaterial;
  lip: THREE.MeshStandardMaterial;
  mouthCavity: THREE.MeshStandardMaterial;
  tongue: THREE.MeshStandardMaterial;
  dispose: () => void;
};

export function createAvatarMaterials(): AvatarMaterials {
  const skin = new THREE.MeshStandardMaterial({
    color: PALETTE.skin,
    roughness: 0.38,
    metalness: 0.0,
    emissiveIntensity: 0.05,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: PALETTE.hair,
    roughness: 0.48,
    metalness: 0.02,
    emissiveIntensity: 0.08,
  });
  const brow = new THREE.MeshStandardMaterial({
    color: PALETTE.brow,
    roughness: 0.55,
    metalness: 0.01,
  });
  const sclera = new THREE.MeshStandardMaterial({
    color: PALETTE.sclera,
    roughness: 0.15,
    metalness: 0.0,
  });
  const iris = new THREE.MeshStandardMaterial({
    color: PALETTE.iris,
    roughness: 0.35,
    metalness: 0.05,
    emissiveIntensity: 0.1,
  });
  const pupil = new THREE.MeshBasicMaterial({ color: PALETTE.pupil });
  const hilite = new THREE.MeshBasicMaterial({ color: PALETTE.hilite });
  const lip = new THREE.MeshStandardMaterial({
    color: PALETTE.lip,
    roughness: 0.35,
    metalness: 0.02,
    emissiveIntensity: 0.12,
  });
  const mouthCavity = new THREE.MeshStandardMaterial({
    color: PALETTE.mouthCavity,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const tongue = new THREE.MeshStandardMaterial({
    color: PALETTE.tongue,
    roughness: 0.4,
    metalness: 0.01,
    emissiveIntensity: 0.08,
  });

  const dispose = () => {
    [skin, hair, brow, sclera, iris, pupil, hilite, lip, mouthCavity, tongue].forEach((m) =>
      m.dispose(),
    );
  };

  return { skin, hair, brow, sclera, iris, pupil, hilite, lip, mouthCavity, tongue, dispose };
}
