import * as THREE from 'three';
import { createAvatarMaterials, type AvatarMaterials } from './avatarMaterials';

// Local model space: head ~0.9 unit radius. The caller scales the outer group
// to centimetres (~14) so the avatar matches a real face when the FaceLandmarker
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
    /** Pivot rotated around X by jawOpen so the lower face drops naturally. */
    jaw: THREE.Group;
    mouthGroup: THREE.Group;
    mouthCavity: THREE.Mesh;
    lipUpper: THREE.Mesh;
    lipLower: THREE.Mesh;
    teethUpper: THREE.Mesh;
    teethLower: THREE.Mesh;
    tongue: THREE.Mesh;
    lidLeftUpper: THREE.Mesh;
    lidRightUpper: THREE.Mesh;
    lidLeftLower: THREE.Mesh;
    lidRightLower: THREE.Mesh;
    browLeft: THREE.Mesh;
    browRight: THREE.Mesh;
    irisLeft: THREE.Group;
    irisRight: THREE.Group;
    eyeLeft: THREE.Group;
    eyeRight: THREE.Group;
    cheekLeft: THREE.Mesh;
    cheekRight: THREE.Mesh;
    hair: THREE.Group;
    neck: THREE.Mesh;
  };
  defaults: {
    jawRotation: THREE.Euler;
    mouthGroup: { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler };
    mouthCavityScale: THREE.Vector3;
    lipUpperPosition: THREE.Vector3;
    lipUpperScale: THREE.Vector3;
    lipUpperRotation: THREE.Euler;
    lipLowerPosition: THREE.Vector3;
    lipLowerScale: THREE.Vector3;
    lipLowerRotation: THREE.Euler;
    teethUpperPosition: THREE.Vector3;
    teethLowerPosition: THREE.Vector3;
    tonguePosition: THREE.Vector3;
    tongueScale: THREE.Vector3;
    lidLeftScale: THREE.Vector3;
    lidRightScale: THREE.Vector3;
    lidLowerLeftScale: THREE.Vector3;
    lidLowerRightScale: THREE.Vector3;
    browLeft: { position: THREE.Vector3; rotation: THREE.Euler };
    browRight: { position: THREE.Vector3; rotation: THREE.Euler };
    eyeLeftScale: THREE.Vector3;
    eyeRightScale: THREE.Vector3;
    cheekLeftPosition: THREE.Vector3;
    cheekRightPosition: THREE.Vector3;
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
  // Slightly elongated and pinched at the chin to read as a face rather than a
  // perfect ball. Higher subdivision keeps the silhouette clean.
  const skullGeom = new THREE.SphereGeometry(0.9, 64, 64);
  const skull = new THREE.Mesh(skullGeom, materials.skin);
  skull.scale.set(1.0, 1.08, 0.95);
  head.add(skull);

  // ---- Neck -----------------------------------------------------------------
  // Cylinder tucked under the chin; slightly darker skin tone makes the
  // chin-to-neck transition read without a hard line.
  const neckGeom = new THREE.CylinderGeometry(0.42, 0.55, 0.7, 32, 1, true);
  const neck = new THREE.Mesh(neckGeom, materials.skinShade);
  neck.position.set(0, -1.05, -0.05);
  head.add(neck);

  // ---- Nose -----------------------------------------------------------------
  const noseGeom = new THREE.SphereGeometry(0.11, 28, 28);
  const nose = new THREE.Mesh(noseGeom, materials.skin);
  nose.position.set(0, -0.06, 0.92);
  nose.scale.set(0.95, 1.05, 0.85);
  head.add(nose);

  // Tiny nostril shadow spheres add a hint of nose definition.
  const nostrilGeom = new THREE.SphereGeometry(0.025, 12, 12);
  const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x3a1d12 });
  const nostrilL = new THREE.Mesh(nostrilGeom, nostrilMat);
  nostrilL.position.set(-0.045, -0.12, 0.97);
  head.add(nostrilL);
  const nostrilR = new THREE.Mesh(nostrilGeom, nostrilMat);
  nostrilR.position.set(0.045, -0.12, 0.97);
  head.add(nostrilR);

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

  // ---- Cheeks ---------------------------------------------------------------
  // Soft pinkish blush spheres just below the eyes; semi-transparent so the
  // skin underneath still shows through.
  const cheekGeom = new THREE.SphereGeometry(0.18, 24, 24);
  const cheekLeft = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekLeft.position.set(-0.42, -0.18, 0.78);
  cheekLeft.scale.set(1.0, 0.6, 0.35);
  head.add(cheekLeft);
  const cheekRight = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekRight.position.set(0.42, -0.18, 0.78);
  cheekRight.scale.set(1.0, 0.6, 0.35);
  head.add(cheekRight);

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
  const irisGeom = new THREE.CircleGeometry(0.082, 32);
  const pupilGeom = new THREE.CircleGeometry(0.038, 24);
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

  // Lower lids: same geometry flipped under the eye. They barely show by
  // default but rise on squint/cheekSquint to give a real squint look.
  const lidLowerGeom = new THREE.SphereGeometry(
    sceleraR + 0.005,
    24,
    24,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  const lidLeftLower = new THREE.Mesh(lidLowerGeom, materials.skin);
  lidLeftLower.position.set(-eyeOffsetX, eyeY, eyeZ);
  lidLeftLower.scale.y = 0.08;
  head.add(lidLeftLower);
  const lidRightLower = new THREE.Mesh(lidLowerGeom, materials.skin);
  lidRightLower.position.set(eyeOffsetX, eyeY, eyeZ);
  lidRightLower.scale.y = 0.08;
  head.add(lidRightLower);

  // ---- Eyebrows (rounded boxes following the skull curvature) ---------------
  const browGeom = new THREE.BoxGeometry(0.26, 0.05, 0.06);
  const browLeft = new THREE.Mesh(browGeom, materials.brow);
  browLeft.position.set(-0.27, 0.32, 0.83);
  browLeft.rotation.set(0, -0.2, 0.05);
  head.add(browLeft);
  const browRight = new THREE.Mesh(browGeom, materials.brow);
  browRight.position.set(0.27, 0.32, 0.83);
  browRight.rotation.set(0, 0.2, -0.05);
  head.add(browRight);

  // ---- Jaw + Mouth ----------------------------------------------------------
  // jaw is a pivot at the cheek/ear line. Rotating it negative on X drops the
  // mouth + lower lip + tongue down and forward together — this is what gives
  // the lip-sync the visible "mouth opens" feeling, far more legible than just
  // scaling the cavity.
  const jaw = new THREE.Group();
  jaw.position.set(0, 0, 0);
  head.add(jaw);

  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.32, 0.82);
  jaw.add(mouthGroup);

  // Upper lip: half-torus, the upper arc only.
  const lipGeom = new THREE.TorusGeometry(0.16, 0.038, 16, 40, Math.PI);
  const lipUpper = new THREE.Mesh(lipGeom, materials.lipUpper);
  lipUpper.position.set(0, 0.0, 0);
  lipUpper.rotation.set(0, 0, 0); // upper half (y >= 0)
  lipUpper.scale.set(1.0, 0.55, 0.55);
  mouthGroup.add(lipUpper);

  // Lower lip: same half-torus rotated 180° so its arc is below.
  const lipLowerGeom = new THREE.TorusGeometry(0.16, 0.045, 16, 40, Math.PI);
  const lipLower = new THREE.Mesh(lipLowerGeom, materials.lipLower);
  lipLower.position.set(0, 0.0, 0);
  lipLower.rotation.set(0, 0, Math.PI);
  lipLower.scale.set(1.0, 0.7, 0.6);
  mouthGroup.add(lipLower);

  // Mouth cavity: dark interior visible when the lips part.
  const cavityGeom = new THREE.SphereGeometry(
    0.14,
    24,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI,
  );
  const mouthCavity = new THREE.Mesh(cavityGeom, materials.mouthCavity);
  mouthCavity.position.set(0, 0, -0.03);
  mouthCavity.scale.set(1.0, 0.18, 0.55);
  mouthGroup.add(mouthCavity);

  // Teeth: two flat blocks behind the lips. They stay hidden unless the mouth
  // opens, at which point the parted lips reveal them.
  const teethGeom = new THREE.BoxGeometry(0.22, 0.04, 0.04);
  const teethUpper = new THREE.Mesh(teethGeom, materials.teeth);
  teethUpper.position.set(0, 0.012, 0.0);
  mouthGroup.add(teethUpper);
  const teethLower = new THREE.Mesh(teethGeom, materials.teeth);
  teethLower.position.set(0, -0.012, 0.0);
  mouthGroup.add(teethLower);

  // Tongue
  const tongueGeom = new THREE.SphereGeometry(0.09, 20, 20);
  const tongue = new THREE.Mesh(tongueGeom, materials.tongue);
  tongue.position.set(0, -0.025, -0.05);
  tongue.scale.set(1.0, 0.5, 1.1);
  mouthGroup.add(tongue);

  const defaults = {
    jawRotation: jaw.rotation.clone(),
    mouthGroup: {
      position: mouthGroup.position.clone(),
      scale: mouthGroup.scale.clone(),
      rotation: mouthGroup.rotation.clone(),
    },
    mouthCavityScale: mouthCavity.scale.clone(),
    lipUpperPosition: lipUpper.position.clone(),
    lipUpperScale: lipUpper.scale.clone(),
    lipUpperRotation: lipUpper.rotation.clone(),
    lipLowerPosition: lipLower.position.clone(),
    lipLowerScale: lipLower.scale.clone(),
    lipLowerRotation: lipLower.rotation.clone(),
    teethUpperPosition: teethUpper.position.clone(),
    teethLowerPosition: teethLower.position.clone(),
    tonguePosition: tongue.position.clone(),
    tongueScale: tongue.scale.clone(),
    lidLeftScale: lidLeftUpper.scale.clone(),
    lidRightScale: lidRightUpper.scale.clone(),
    lidLowerLeftScale: lidLeftLower.scale.clone(),
    lidLowerRightScale: lidRightLower.scale.clone(),
    browLeft: {
      position: browLeft.position.clone(),
      rotation: browLeft.rotation.clone(),
    },
    browRight: {
      position: browRight.position.clone(),
      rotation: browRight.rotation.clone(),
    },
    eyeLeftScale: left.g.scale.clone(),
    eyeRightScale: right.g.scale.clone(),
    cheekLeftPosition: cheekLeft.position.clone(),
    cheekRightPosition: cheekRight.position.clone(),
  };

  const dispose = () => {
    [
      skullGeom,
      neckGeom,
      noseGeom,
      nostrilGeom,
      earGeom,
      cheekGeom,
      capGeom,
      tuftGeom,
      sceleraGeom,
      irisGeom,
      pupilGeom,
      hiliteGeom,
      lidGeom,
      lidLowerGeom,
      browGeom,
      lipGeom,
      lipLowerGeom,
      cavityGeom,
      teethGeom,
      tongueGeom,
    ].forEach((g) => g.dispose());
    nostrilMat.dispose();
    materials.dispose();
  };

  return {
    root,
    head,
    parts: {
      skull,
      nose,
      jaw,
      mouthGroup,
      mouthCavity,
      lipUpper,
      lipLower,
      teethUpper,
      teethLower,
      tongue,
      lidLeftUpper,
      lidRightUpper,
      lidLeftLower,
      lidRightLower,
      browLeft,
      browRight,
      irisLeft: left.irisRoot,
      irisRight: right.irisRoot,
      eyeLeft: left.g,
      eyeRight: right.g,
      cheekLeft,
      cheekRight,
      hair,
      neck,
    },
    defaults,
    materials,
    dispose,
  };
}
