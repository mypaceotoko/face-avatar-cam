import * as THREE from 'three';
import { createAvatarMaterials, type AvatarMaterials } from './avatarMaterials';

// Local model space: head ~0.9 unit radius. The caller scales the outer group
// to centimetres (~8) so the avatar matches a real face when the FaceLandmarker
// transformation matrix is applied.

export type AvatarRig = {
  /** Outer group placed in the scene. The caller writes the head matrix to
   *  this group. */
  root: THREE.Group;
  /** Inner pivot at the head center. Scale stays fixed; root is what receives
   *  the face matrix in Step 6. */
  head: THREE.Group;
  parts: {
    skull: THREE.Mesh;
    nose: THREE.Mesh;
    mouthGroup: THREE.Group;
    mouthCavity: THREE.Mesh;
    lipsOuter: THREE.Mesh;
    lidLeftUpper: THREE.Mesh;
    lidRightUpper: THREE.Mesh;
    browLeft: THREE.Mesh;
    browRight: THREE.Mesh;
    irisLeft: THREE.Group;
    irisRight: THREE.Group;
    hair: THREE.Group;
  };
  defaults: {
    mouthGroup: { position: THREE.Vector3; scale: THREE.Vector3 };
    mouthCavityScale: THREE.Vector3;
    lipsOuterScale: THREE.Vector3;
    lidLeftScale: THREE.Vector3;
    lidRightScale: THREE.Vector3;
    browLeft: { position: THREE.Vector3; rotation: THREE.Euler };
    browRight: { position: THREE.Vector3; rotation: THREE.Euler };
  };
  materials: AvatarMaterials;
  dispose: () => void;
};

export function createAvatar(): AvatarRig {
  const materials = createAvatarMaterials();
  const root = new THREE.Group();
  root.name = 'avatarRoot';

  const head = new THREE.Group();
  head.name = 'avatarHead';
  root.add(head);

  // ---- Skull ----------------------------------------------------------------
  const skullGeom = new THREE.SphereGeometry(0.9, 64, 64);
  const skull = new THREE.Mesh(skullGeom, materials.skin);
  skull.scale.set(1.0, 1.05, 0.95);
  head.add(skull);

  // ---- Nose -----------------------------------------------------------------
  const noseGeom = new THREE.SphereGeometry(0.1, 24, 24);
  const nose = new THREE.Mesh(noseGeom, materials.skin);
  nose.position.set(0, -0.05, 0.92);
  nose.scale.set(1.0, 0.95, 0.85);
  head.add(nose);

  // ---- Ears -----------------------------------------------------------------
  const earGeom = new THREE.SphereGeometry(0.13, 20, 20);
  const earLeft = new THREE.Mesh(earGeom, materials.skin);
  earLeft.position.set(-0.85, 0.0, 0.0);
  earLeft.scale.set(0.55, 1.0, 0.45);
  head.add(earLeft);
  const earRight = new THREE.Mesh(earGeom, materials.skin);
  earRight.position.set(0.85, 0.0, 0.0);
  earRight.scale.set(0.55, 1.0, 0.45);
  head.add(earRight);

  // ---- Hair (sculpted clumps) ----------------------------------------------
  const hair = new THREE.Group();
  hair.name = 'hair';
  // Main cap covering the upper back of the head
  const capGeom = new THREE.SphereGeometry(0.94, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const cap = new THREE.Mesh(capGeom, materials.hair);
  cap.position.set(0, 0.02, 0);
  hair.add(cap);

  // Tufts: small half-sphere clumps stacked across the front and crown to give
  // the chunky Memoji look. Each tuft is slightly different in size and angle.
  const tuftGeom = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const TUFTS: Array<{
    pos: [number, number, number];
    rot: [number, number, number];
    scale: [number, number, number];
  }> = [
    { pos: [-0.55, 0.62, 0.45], rot: [-0.5, 0.4, 0.4], scale: [0.32, 0.22, 0.32] },
    { pos: [-0.25, 0.72, 0.55], rot: [-0.6, 0.1, 0.15], scale: [0.34, 0.26, 0.34] },
    { pos: [0.05, 0.78, 0.55], rot: [-0.65, -0.05, -0.02], scale: [0.36, 0.28, 0.36] },
    { pos: [0.32, 0.74, 0.5], rot: [-0.6, -0.2, -0.2], scale: [0.34, 0.26, 0.34] },
    { pos: [0.6, 0.6, 0.4], rot: [-0.5, -0.45, -0.4], scale: [0.32, 0.22, 0.32] },
    { pos: [-0.45, 0.78, 0.2], rot: [-0.2, 0.4, 0.4], scale: [0.3, 0.22, 0.3] },
    { pos: [-0.05, 0.86, 0.25], rot: [-0.25, 0.0, 0.0], scale: [0.34, 0.24, 0.34] },
    { pos: [0.4, 0.82, 0.2], rot: [-0.2, -0.3, -0.35], scale: [0.32, 0.22, 0.32] },
    { pos: [-0.35, 0.5, 0.7], rot: [-0.9, 0.3, 0.3], scale: [0.22, 0.16, 0.22] },
    { pos: [0.15, 0.5, 0.78], rot: [-0.95, -0.05, 0.05], scale: [0.24, 0.18, 0.24] },
    { pos: [0.42, 0.48, 0.7], rot: [-0.9, -0.3, -0.3], scale: [0.22, 0.16, 0.22] },
  ];
  for (const t of TUFTS) {
    const m = new THREE.Mesh(tuftGeom, materials.hair);
    m.position.fromArray(t.pos);
    m.rotation.fromArray(t.rot);
    m.scale.fromArray(t.scale);
    hair.add(m);
  }
  head.add(hair);

  // ---- Eyes -----------------------------------------------------------------
  const eyeOffsetX = 0.27;
  const eyeY = 0.1;
  const eyeZ = 0.78;
  const sceleraR = 0.16;

  const sceleraGeom = new THREE.SphereGeometry(sceleraR, 32, 32);
  const irisGeom = new THREE.CircleGeometry(0.085, 32);
  const pupilGeom = new THREE.CircleGeometry(0.04, 24);
  const hiliteGeom = new THREE.CircleGeometry(0.018, 16);

  function makeEye(side: -1 | 1) {
    const g = new THREE.Group();
    g.position.set(eyeOffsetX * side, eyeY, eyeZ);

    const sclera = new THREE.Mesh(sceleraGeom, materials.sclera);
    g.add(sclera);

    const irisRoot = new THREE.Group();
    g.add(irisRoot);

    const iris = new THREE.Mesh(irisGeom, materials.iris);
    iris.position.set(0, 0, sceleraR + 0.001);
    irisRoot.add(iris);

    const pupil = new THREE.Mesh(pupilGeom, materials.pupil);
    pupil.position.set(0, 0, sceleraR + 0.002);
    irisRoot.add(pupil);

    const hilite = new THREE.Mesh(hiliteGeom, materials.hilite);
    hilite.position.set(-0.025 * side, 0.025, sceleraR + 0.003);
    irisRoot.add(hilite);

    return { g, irisRoot };
  }
  const left = makeEye(-1);
  const right = makeEye(1);
  head.add(left.g);
  head.add(right.g);

  // ---- Eyelids (skin-coloured upper hemispheres covering the eyes) ----------
  const lidGeom = new THREE.SphereGeometry(
    sceleraR + 0.005,
    24,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const lidLeftUpper = new THREE.Mesh(lidGeom, materials.skin);
  lidLeftUpper.position.set(-eyeOffsetX, eyeY, eyeZ);
  lidLeftUpper.scale.y = 0.05; // open by default — almost flat against the brow
  head.add(lidLeftUpper);
  const lidRightUpper = new THREE.Mesh(lidGeom, materials.skin);
  lidRightUpper.position.set(eyeOffsetX, eyeY, eyeZ);
  lidRightUpper.scale.y = 0.05;
  head.add(lidRightUpper);

  // ---- Eyebrows (rounded boxes following the skull curvature) ---------------
  const browGeom = new THREE.BoxGeometry(0.26, 0.05, 0.06);
  // Soften corners would need rounded box; box alone reads fine at distance.
  const browLeft = new THREE.Mesh(browGeom, materials.brow);
  browLeft.position.set(-0.27, 0.32, 0.83);
  browLeft.rotation.set(0, -0.2, 0.05);
  head.add(browLeft);
  const browRight = new THREE.Mesh(browGeom, materials.brow);
  browRight.position.set(0.27, 0.32, 0.83);
  browRight.rotation.set(0, 0.2, -0.05);
  head.add(browRight);

  // ---- Mouth ----------------------------------------------------------------
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.32, 0.82);
  head.add(mouthGroup);

  const lipsGeom = new THREE.TorusGeometry(0.16, 0.035, 16, 40);
  const lipsOuter = new THREE.Mesh(lipsGeom, materials.lip);
  lipsOuter.scale.set(1.0, 0.55, 0.6);
  // Slight smile baseline by tilting the torus forward at the bottom.
  lipsOuter.rotation.x = -0.1;
  mouthGroup.add(lipsOuter);

  const cavityGeom = new THREE.SphereGeometry(
    0.13,
    24,
    24,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  const mouthCavity = new THREE.Mesh(cavityGeom, materials.mouthCavity);
  mouthCavity.position.set(0, 0, -0.02);
  mouthCavity.scale.set(1.0, 0.18, 0.6);
  mouthGroup.add(mouthCavity);

  const defaults = {
    mouthGroup: {
      position: mouthGroup.position.clone(),
      scale: mouthGroup.scale.clone(),
    },
    mouthCavityScale: mouthCavity.scale.clone(),
    lipsOuterScale: lipsOuter.scale.clone(),
    lidLeftScale: lidLeftUpper.scale.clone(),
    lidRightScale: lidRightUpper.scale.clone(),
    browLeft: {
      position: browLeft.position.clone(),
      rotation: browLeft.rotation.clone(),
    },
    browRight: {
      position: browRight.position.clone(),
      rotation: browRight.rotation.clone(),
    },
  };

  const dispose = () => {
    [
      skullGeom,
      noseGeom,
      earGeom,
      capGeom,
      tuftGeom,
      sceleraGeom,
      irisGeom,
      pupilGeom,
      hiliteGeom,
      lidGeom,
      browGeom,
      lipsGeom,
      cavityGeom,
    ].forEach((g) => g.dispose());
    materials.dispose();
  };

  return {
    root,
    head,
    parts: {
      skull,
      nose,
      mouthGroup,
      mouthCavity,
      lipsOuter,
      lidLeftUpper,
      lidRightUpper,
      browLeft,
      browRight,
      irisLeft: left.irisRoot,
      irisRight: right.irisRoot,
      hair,
    },
    defaults,
    materials,
    dispose,
  };
}
