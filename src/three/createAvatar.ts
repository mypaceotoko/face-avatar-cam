import * as THREE from 'three';
import { createAvatarMaterials, type AvatarMaterials } from './avatarMaterials';

// Local model space: head ~0.9 unit radius. The caller scales the outer group
// to centimetres (~14) so the avatar matches a real face when the
// FaceLandmarker transformation matrix is applied.
//
// Avatar parts grew during the expression pass:
//   - Bigger eyes (sceleraR 0.18, eyeOffsetX 0.30) for a more readable iris
//     at thumbnail size.
//   - Lower eyelids: skin half-spheres that rise on squint to give a real
//     "eye smile" instead of just closing from the top.
//   - Cheeks: faded skin lobes that bloom on smile/laugh so the corners of
//     the mouth get supported.
//   - Teeth: a flat row behind the lips, alpha 0 by default; faded in by
//     applyExpression when the mouth opens.
//   - Mouth corner anchors so the grin/frown rotation reads at distance.

export type AvatarRig = {
  /** Outer group placed in the scene. The caller writes the head matrix to
   *  this group. */
  root: THREE.Group;
  /** Inner pivot at the head center. */
  head: THREE.Group;
  parts: {
    skull: THREE.Mesh;
    nose: THREE.Mesh;
    mouthGroup: THREE.Group;
    mouthCavity: THREE.Mesh;
    lipsOuter: THREE.Mesh;
    teeth: THREE.Mesh;
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
  };
  defaults: {
    mouthGroup: { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler };
    mouthCavityScale: THREE.Vector3;
    lipsOuterScale: THREE.Vector3;
    lipsOuterRotation: THREE.Euler;
    teethScale: THREE.Vector3;
    teethPosition: THREE.Vector3;
    tonguePosition: THREE.Vector3;
    tongueScale: THREE.Vector3;
    lidLeftUpperScale: THREE.Vector3;
    lidRightUpperScale: THREE.Vector3;
    lidLeftLowerScale: THREE.Vector3;
    lidRightLowerScale: THREE.Vector3;
    lidLeftLowerPosition: THREE.Vector3;
    lidRightLowerPosition: THREE.Vector3;
    browLeft: { position: THREE.Vector3; rotation: THREE.Euler };
    browRight: { position: THREE.Vector3; rotation: THREE.Euler };
    eyeLeftScale: THREE.Vector3;
    eyeRightScale: THREE.Vector3;
    cheekLeft: { position: THREE.Vector3; scale: THREE.Vector3 };
    cheekRight: { position: THREE.Vector3; scale: THREE.Vector3 };
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
  const capGeom = new THREE.SphereGeometry(0.94, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const cap = new THREE.Mesh(capGeom, materials.hair);
  cap.position.set(0, 0.02, 0);
  hair.add(cap);

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
  // Bumped from 0.16/0.27 to give the avatar a more cartoony, expressive read
  // at small sizes — eye area is the #1 driver of perceived emotion.
  const eyeOffsetX = 0.30;
  const eyeY = 0.10;
  const eyeZ = 0.78;
  const sceleraR = 0.18;

  const sceleraGeom = new THREE.SphereGeometry(sceleraR, 32, 32);
  const irisGeom = new THREE.CircleGeometry(0.11, 32);
  const irisRingGeom = new THREE.RingGeometry(0.10, 0.115, 32);
  const pupilGeom = new THREE.CircleGeometry(0.052, 24);
  const hiliteGeom = new THREE.CircleGeometry(0.022, 16);

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

    // Dark outer ring for a stronger iris silhouette.
    const ring = new THREE.Mesh(
      irisRingGeom,
      new THREE.MeshBasicMaterial({ color: 0x1a0d04 }),
    );
    ring.position.set(0, 0, sceleraR + 0.0015);
    irisRoot.add(ring);

    const pupil = new THREE.Mesh(pupilGeom, materials.pupil);
    pupil.position.set(0, 0, sceleraR + 0.002);
    irisRoot.add(pupil);

    const hilite = new THREE.Mesh(hiliteGeom, materials.hilite);
    hilite.position.set(-0.03 * side, 0.035, sceleraR + 0.003);
    irisRoot.add(hilite);

    return { g, irisRoot, ring };
  }
  const left = makeEye(-1);
  const right = makeEye(1);
  head.add(left.g);
  head.add(right.g);

  // ---- Eyelids --------------------------------------------------------------
  // Upper lid: sits just above the eye, scale.y=0.05 at rest, ~1.0 closed.
  const lidUpperGeom = new THREE.SphereGeometry(
    sceleraR + 0.005,
    24,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const lidLeftUpper = new THREE.Mesh(lidUpperGeom, materials.skin);
  lidLeftUpper.position.set(-eyeOffsetX, eyeY, eyeZ);
  lidLeftUpper.scale.y = 0.05;
  head.add(lidLeftUpper);
  const lidRightUpper = new THREE.Mesh(lidUpperGeom, materials.skin);
  lidRightUpper.position.set(eyeOffsetX, eyeY, eyeZ);
  lidRightUpper.scale.y = 0.05;
  head.add(lidRightUpper);

  // Lower lid: lower hemisphere; rises on squint. We position the lower half
  // sphere "downside up" (rotation) so its open edge faces up.
  const lidLowerGeom = new THREE.SphereGeometry(
    sceleraR + 0.005,
    24,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const lidLeftLower = new THREE.Mesh(lidLowerGeom, materials.skin);
  lidLeftLower.position.set(-eyeOffsetX, eyeY - sceleraR * 0.35, eyeZ);
  lidLeftLower.rotation.x = Math.PI; // flip so the dome points down
  lidLeftLower.scale.y = 0.05;
  head.add(lidLeftLower);
  const lidRightLower = new THREE.Mesh(lidLowerGeom, materials.skin);
  lidRightLower.position.set(eyeOffsetX, eyeY - sceleraR * 0.35, eyeZ);
  lidRightLower.rotation.x = Math.PI;
  lidRightLower.scale.y = 0.05;
  head.add(lidRightLower);

  // ---- Eyebrows -------------------------------------------------------------
  // Slightly bigger and a touch higher than before; the bolder Z gives a real
  // shadow line that reads at thumbnail size.
  const browGeom = new THREE.BoxGeometry(0.30, 0.07, 0.07);
  const browLeft = new THREE.Mesh(browGeom, materials.brow);
  browLeft.position.set(-0.30, 0.36, 0.83);
  browLeft.rotation.set(0, -0.18, 0.06);
  head.add(browLeft);
  const browRight = new THREE.Mesh(browGeom, materials.brow);
  browRight.position.set(0.30, 0.36, 0.83);
  browRight.rotation.set(0, 0.18, -0.06);
  head.add(browRight);

  // ---- Cheeks --------------------------------------------------------------
  // Alpha-faded skin lobes; rise + fade in on smile/laugh to support corner-up.
  const cheekGeom = new THREE.SphereGeometry(0.22, 20, 20);
  const cheekLeft = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekLeft.position.set(-0.45, -0.15, 0.65);
  cheekLeft.scale.set(0.7, 0.6, 0.5);
  head.add(cheekLeft);
  const cheekRight = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekRight.position.set(0.45, -0.15, 0.65);
  cheekRight.scale.set(0.7, 0.6, 0.5);
  head.add(cheekRight);

  // ---- Mouth ----------------------------------------------------------------
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.34, 0.82);
  head.add(mouthGroup);

  // Outer lips: a torus we squash + rotate to read as a mouth shape. Slightly
  // taller default than before so the mouth has visible volume even at rest.
  const lipsGeom = new THREE.TorusGeometry(0.18, 0.045, 16, 48);
  const lipsOuter = new THREE.Mesh(lipsGeom, materials.lip);
  lipsOuter.scale.set(1.0, 0.55, 0.6);
  lipsOuter.rotation.x = -0.1;
  mouthGroup.add(lipsOuter);

  // Mouth cavity: dark hemisphere behind the lips. Stretches vertically when
  // jaw opens. Default scale.y is small so the closed mouth doesn't show black.
  const cavityGeom = new THREE.SphereGeometry(
    0.16,
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

  // Teeth: thin upper-row plate sitting just inside the lip torus. Faded in by
  // applyExpression when teethVisible > 0.
  const teethGeom = new THREE.BoxGeometry(0.22, 0.05, 0.04);
  const teeth = new THREE.Mesh(teethGeom, materials.teeth);
  teeth.position.set(0, 0.025, 0.0);
  mouthGroup.add(teeth);

  // Tongue: tucked behind the lower lip, slides forward on tongueOut.
  const tongueGeom = new THREE.SphereGeometry(0.10, 20, 20);
  const tongue = new THREE.Mesh(tongueGeom, materials.tongue);
  tongue.position.set(0, -0.03, -0.04);
  tongue.scale.set(1.0, 0.55, 1.1);
  mouthGroup.add(tongue);

  const defaults = {
    mouthGroup: {
      position: mouthGroup.position.clone(),
      scale: mouthGroup.scale.clone(),
      rotation: mouthGroup.rotation.clone(),
    },
    mouthCavityScale: mouthCavity.scale.clone(),
    lipsOuterScale: lipsOuter.scale.clone(),
    lipsOuterRotation: lipsOuter.rotation.clone(),
    teethScale: teeth.scale.clone(),
    teethPosition: teeth.position.clone(),
    tonguePosition: tongue.position.clone(),
    tongueScale: tongue.scale.clone(),
    lidLeftUpperScale: lidLeftUpper.scale.clone(),
    lidRightUpperScale: lidRightUpper.scale.clone(),
    lidLeftLowerScale: lidLeftLower.scale.clone(),
    lidRightLowerScale: lidRightLower.scale.clone(),
    lidLeftLowerPosition: lidLeftLower.position.clone(),
    lidRightLowerPosition: lidRightLower.position.clone(),
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
    cheekLeft: {
      position: cheekLeft.position.clone(),
      scale: cheekLeft.scale.clone(),
    },
    cheekRight: {
      position: cheekRight.position.clone(),
      scale: cheekRight.scale.clone(),
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
      irisRingGeom,
      pupilGeom,
      hiliteGeom,
      lidUpperGeom,
      lidLowerGeom,
      browGeom,
      cheekGeom,
      lipsGeom,
      cavityGeom,
      teethGeom,
      tongueGeom,
    ].forEach((g) => g.dispose());
    // The dark iris-ring uses an inline material; dispose it too.
    (left.ring.material as THREE.Material).dispose();
    (right.ring.material as THREE.Material).dispose();
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
      teeth,
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
    },
    defaults,
    materials,
    dispose,
  };
}
