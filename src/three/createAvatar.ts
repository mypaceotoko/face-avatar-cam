import * as THREE from 'three';
import { CHARACTERS, type CharacterConfig, type CharacterType } from './avatarCharacters';
import { createAvatarMaterials, type AvatarMaterials } from './avatarMaterials';

// Avatar coordinate system: skull radius ≈ 0.9 units.
// The caller (useAvatarRig) scales the root to ~14 cm so it matches the
// FaceLandmarker transformation matrix.

export type AvatarRig = {
  root: THREE.Group;
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

export function createAvatar(characterType: CharacterType = 'child'): AvatarRig {
  const cfg = CHARACTERS[characterType];
  const materials = createAvatarMaterials({
    skin: cfg.skinColor,
    cheek: cfg.cheekColor,
    hair: cfg.hairColor,
    brow: cfg.browColor,
    iris: cfg.irisColor,
    lip: cfg.lipColor,
  });

  // Extra geometries/materials created for optional features, disposed alongside
  // the main ones.
  const xGeoms: THREE.BufferGeometry[] = [];
  const xMats: THREE.Material[] = [];

  const root = new THREE.Group();
  root.name = 'avatarRoot';
  const head = new THREE.Group();
  head.name = 'avatarHead';
  root.add(head);

  // ---- Skull (Head Base) ---------------------------------------------------
  // More sophisticated head shape: vertically stretched sphere for natural face
  const skullGeom = new THREE.IcosahedronGeometry(0.9, 6); // Higher subdivision
  const skull = new THREE.Mesh(skullGeom, materials.skin);
  skull.scale.set(cfg.headScaleX * 1.05, cfg.headScaleY * 1.12, cfg.headScaleZ * 0.98);

  // Add subtle face shape definition
  const posAttrib = skullGeom.getAttribute('position');
  const positions = posAttrib.array as Float32Array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const len = Math.sqrt(x * x + y * y + z * z);

    // Make face narrower, forehead/chin rounder
    const faceFactor = z > 0.3 ? 0.95 - Math.pow(z / 1.2, 2) * 0.15 : 1.0;
    positions[i] *= 0.9 + faceFactor * 0.1;
    positions[i + 2] = z * 0.98; // Slight depth
  }
  posAttrib.needsUpdate = true;
  skullGeom.computeVertexNormals();

  head.add(skull);

  // ---- Nose (Much smaller, subtle) -----------------------------------------
  // Use very small tapered cone for delicate Memoji-style nose
  const noseGeom = new THREE.ConeGeometry(cfg.noseRadius * 0.35, cfg.noseRadius * 0.6, 24, 12);
  const nose = new THREE.Mesh(noseGeom, materials.skin);
  nose.position.set(0, cfg.noseOffsetY - 0.01, cfg.noseZ + 0.02);
  nose.rotation.x = Math.PI * 0.5; // point down
  nose.scale.set(cfg.noseScaleX * 0.65, cfg.noseScaleY * 0.65, cfg.noseScaleZ * 0.6);
  xGeoms.push(noseGeom);
  head.add(nose);

  // ---- Nostrils (subtle detail) ----------------------------------------
  const nostrilGeom = new THREE.SphereGeometry(cfg.noseRadius * 0.08, 16, 16);
  const nostrilL = new THREE.Mesh(nostrilGeom, materials.mouthCavity);
  nostrilL.position.set(-cfg.noseRadius * 0.18, cfg.noseOffsetY - 0.02, cfg.noseZ + 0.04);
  nostrilL.scale.set(0.9, 0.8, 0.7);
  xGeoms.push(nostrilGeom);
  head.add(nostrilL);

  const nostrilR = new THREE.Mesh(nostrilGeom, materials.mouthCavity);
  nostrilR.position.set(cfg.noseRadius * 0.18, cfg.noseOffsetY - 0.02, cfg.noseZ + 0.04);
  nostrilR.scale.set(0.9, 0.8, 0.7);
  head.add(nostrilR);

  // ---- Ears -----------------------------------------------------------------
  const earGeom = new THREE.SphereGeometry(cfg.earRadius, 48, 48);
  const earLeft = new THREE.Mesh(earGeom, materials.skin);
  earLeft.position.set(-cfg.earOffsetX, 0.0, 0.0);
  earLeft.scale.set(0.55, 1.0, 0.45);
  head.add(earLeft);
  const earRight = new THREE.Mesh(earGeom, materials.skin);
  earRight.position.set(cfg.earOffsetX, 0.0, 0.0);
  earRight.scale.set(0.55, 1.0, 0.45);
  head.add(earRight);

  // ---- Hair -----------------------------------------------------------------
  const hair = buildHair(cfg, materials, xGeoms, xMats);
  head.add(hair);

  // ---- Permanent blush (woman only) -----------------------------------------
  if (cfg.hasBlush) {
    buildBlush(head, cfg, xGeoms, xMats);
  }

  // ---- Eyes (Larger, more prominent - Memoji style) ------------------------
  const sceleraR = cfg.eyeRadius * 1.18; // Make eyes significantly larger
  const eyeOffsetX = cfg.eyeOffsetX * 0.95; // Slightly closer together for human look
  const eyeY = cfg.eyeOffsetY * 1.05;
  const eyeZ = cfg.eyeZ * 0.98;

  const sceleraGeom = new THREE.IcosahedronGeometry(sceleraR, 5); // Much smoother eye
  const irisRadiusScaled = cfg.irisRadius * 1.15; // Larger iris for better proportion
  const irisGeom = new THREE.CircleGeometry(irisRadiusScaled, 64);
  const irisRingGeom = new THREE.RingGeometry(irisRadiusScaled * 0.88, irisRadiusScaled * 1.08, 64);
  const pupilGeom = new THREE.CircleGeometry(irisRadiusScaled * 0.45, 48);
  const hiliteGeom = new THREE.CircleGeometry(irisRadiusScaled * 0.22, 32);

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

    // Inner iris detail for more depth (darker ring)
    const irisDetailGeom = new THREE.RingGeometry(cfg.irisRadius * 0.75, cfg.irisRadius * 0.95, 48);
    const irisDetail = new THREE.Mesh(
      irisDetailGeom,
      new THREE.MeshStandardMaterial({
        color: 0x2a1810,
        roughness: 0.45,
        metalness: 0.02,
      }),
    );
    irisDetail.position.set(0, 0, sceleraR + 0.0012);
    irisRoot.add(irisDetail);
    xMats.push(irisDetail.material as THREE.Material);

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
    hilite.position.set(-0.03 * side, cfg.irisRadius * 0.32, sceleraR + 0.003);
    irisRoot.add(hilite);

    return { g, irisRoot, ring };
  }

  const left = makeEye(-1);
  const right = makeEye(1);
  head.add(left.g);
  head.add(right.g);

  // ---- Eyelids --------------------------------------------------------------
  const lidUpperGeom = new THREE.SphereGeometry(sceleraR + 0.005, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const lidLeftUpper = new THREE.Mesh(lidUpperGeom, materials.skin);
  lidLeftUpper.position.set(-eyeOffsetX, eyeY, eyeZ);
  lidLeftUpper.scale.y = 0.05;
  head.add(lidLeftUpper);
  const lidRightUpper = new THREE.Mesh(lidUpperGeom, materials.skin);
  lidRightUpper.position.set(eyeOffsetX, eyeY, eyeZ);
  lidRightUpper.scale.y = 0.05;
  head.add(lidRightUpper);

  const lidLowerGeom = new THREE.SphereGeometry(sceleraR + 0.005, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const lidLeftLower = new THREE.Mesh(lidLowerGeom, materials.skin);
  lidLeftLower.position.set(-eyeOffsetX, eyeY - sceleraR * 0.35, eyeZ);
  lidLeftLower.rotation.x = Math.PI;
  lidLeftLower.scale.y = 0.05;
  head.add(lidLeftLower);
  const lidRightLower = new THREE.Mesh(lidLowerGeom, materials.skin);
  lidRightLower.position.set(eyeOffsetX, eyeY - sceleraR * 0.35, eyeZ);
  lidRightLower.rotation.x = Math.PI;
  lidRightLower.scale.y = 0.05;
  head.add(lidRightLower);

  // ---- Eye socket shadows (deeper definition) --------------------------------
  const eyeShadowMat = new THREE.MeshStandardMaterial({
    color: 0x1a1410,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.15,
    side: THREE.FrontSide,
  });
  xMats.push(eyeShadowMat);

  // Deep shadow above eyes for sculpted look
  const shadowGeom = new THREE.SphereGeometry(sceleraR * 1.35, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.4);
  const shadowLeft = new THREE.Mesh(shadowGeom, eyeShadowMat);
  shadowLeft.position.set(-eyeOffsetX, eyeY + sceleraR * 0.35, eyeZ - 0.05);
  shadowLeft.scale.set(1.15, 0.5, 1.3);
  head.add(shadowLeft);

  const shadowRight = new THREE.Mesh(shadowGeom, eyeShadowMat);
  shadowRight.position.set(eyeOffsetX, eyeY + sceleraR * 0.35, eyeZ - 0.05);
  shadowRight.scale.set(1.15, 0.5, 1.3);
  head.add(shadowRight);

  // Undereye bags for more natural look
  const undereyelGeom = new THREE.SphereGeometry(sceleraR * 0.65, 20, 20);
  const undereyelMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a20,
    roughness: 0.8,
    metalness: 0.0,
    transparent: true,
    opacity: 0.12,
  });
  xMats.push(undereyelMat);

  const undereyeleft = new THREE.Mesh(undereyelGeom, undereyelMat);
  undereyeleft.position.set(-eyeOffsetX, eyeY - sceleraR * 0.5, eyeZ + 0.05);
  undereyeleft.scale.set(1.2, 0.4, 1.1);
  head.add(undereyeleft);

  const undereyelright = new THREE.Mesh(undereyelGeom, undereyelMat);
  undereyelright.position.set(eyeOffsetX, eyeY - sceleraR * 0.5, eyeZ + 0.05);
  undereyelright.scale.set(1.2, 0.4, 1.1);
  head.add(undereyelright);

  // ---- Eyelashes (woman only) -----------------------------------------------
  if (cfg.hasLashes) {
    buildLashes(head, cfg, xGeoms, xMats);
  }

  // ---- Eye makeup & accents (woman) ----------------------------------------
  if (cfg.hasEyeMakeup) {
    buildEyeMakeup(head, cfg, xGeoms, xMats);
  }
  if (cfg.hasEyeAccents) {
    buildEyeAccents(left.irisRoot, right.irisRoot, cfg, xGeoms, xMats);
  }

  // ---- Eyebrows -------------------------------------------------------------
  const browGeom = new THREE.BoxGeometry(cfg.browWidth, cfg.browHeight, cfg.browDepth);
  const browLeft = new THREE.Mesh(browGeom, materials.brow);
  browLeft.position.set(-cfg.browOffsetX, cfg.browOffsetY, cfg.browOffsetZ);
  browLeft.rotation.set(0, -cfg.browRotY, cfg.browRotZInner);
  head.add(browLeft);
  const browRight = new THREE.Mesh(browGeom, materials.brow);
  browRight.position.set(cfg.browOffsetX, cfg.browOffsetY, cfg.browOffsetZ);
  browRight.rotation.set(0, cfg.browRotY, -cfg.browRotZInner);
  head.add(browRight);

  // ---- Cheeks (more prominent, rosy) ------------------------------------------
  const cheekGeom = new THREE.SphereGeometry(cfg.cheekRadius * 1.15, 48, 48);
  const cheekLeft = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekLeft.position.set(-cfg.cheekOffsetX * 1.05, cfg.cheekOffsetY + 0.05, cfg.cheekOffsetZ * 1.1);
  cheekLeft.scale.set(0.85, 0.7, 0.6);
  head.add(cheekLeft);
  const cheekRight = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekRight.position.set(cfg.cheekOffsetX * 1.05, cfg.cheekOffsetY + 0.05, cfg.cheekOffsetZ * 1.1);
  cheekRight.scale.set(0.85, 0.7, 0.6);
  head.add(cheekRight);

  // ---- Beard (uncle / grandpa) ----------------------------------------------
  if (cfg.hasBeard) {
    buildBeard(head, cfg, xGeoms, xMats);
  }

  // ---- Mouth ----------------------------------------------------------------
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, cfg.mouthOffsetY, cfg.mouthOffsetZ);
  head.add(mouthGroup);

  const lipsGeom = new THREE.TorusGeometry(cfg.lipTorusRadius, cfg.lipTubeRadius, 32, 80);
  const lipsOuter = new THREE.Mesh(lipsGeom, materials.lip);
  lipsOuter.scale.set(1.0, 0.55, 0.6);
  lipsOuter.rotation.x = -0.1;
  mouthGroup.add(lipsOuter);

  const cavityR = cfg.lipTorusRadius * 0.89;
  const cavityGeom = new THREE.SphereGeometry(cavityR, 48, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const mouthCavity = new THREE.Mesh(cavityGeom, materials.mouthCavity);
  mouthCavity.position.set(0, 0, -0.02);
  mouthCavity.scale.set(1.0, 0.18, 0.6);
  mouthGroup.add(mouthCavity);

  const teethW = cfg.lipTorusRadius * 1.22;
  const teethGeom = new THREE.BoxGeometry(teethW, 0.05, 0.04);
  const teeth = new THREE.Mesh(teethGeom, materials.teeth);
  teeth.position.set(0, 0.025, 0.0);
  mouthGroup.add(teeth);

  const tongueGeom = new THREE.SphereGeometry(0.10, 40, 40);
  const tongue = new THREE.Mesh(tongueGeom, materials.tongue);
  tongue.position.set(0, -0.03, -0.04);
  tongue.scale.set(1.0, 0.55, 1.1);
  mouthGroup.add(tongue);

  // ---- Lip gloss (woman) ---------------------------------------------------
  if (cfg.hasLipGloss) {
    buildLipGloss(mouthGroup, cfg, xGeoms, xMats);
  }

  // ---- Glasses (grandpa) ----------------------------------------------------
  if (cfg.hasGlasses) {
    buildGlasses(head, cfg, xGeoms, xMats);
  }

  // ---- Wrinkles (grandpa) ---------------------------------------------------
  if (cfg.hasWrinkles) {
    buildWrinkles(head, cfg, xGeoms, xMats);
  }

  // ---- Defaults snapshot ----------------------------------------------------
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
    browLeft: { position: browLeft.position.clone(), rotation: browLeft.rotation.clone() },
    browRight: { position: browRight.position.clone(), rotation: browRight.rotation.clone() },
    eyeLeftScale: left.g.scale.clone(),
    eyeRightScale: right.g.scale.clone(),
    cheekLeft: { position: cheekLeft.position.clone(), scale: cheekLeft.scale.clone() },
    cheekRight: { position: cheekRight.position.clone(), scale: cheekRight.scale.clone() },
  };

  const dispose = () => {
    [
      skullGeom, noseGeom, earGeom, sceleraGeom, irisGeom, irisRingGeom,
      pupilGeom, hiliteGeom, lidUpperGeom, lidLowerGeom, browGeom, cheekGeom,
      lipsGeom, cavityGeom, teethGeom, tongueGeom,
      ...xGeoms,
    ].forEach((g) => g.dispose());
    (left.ring.material as THREE.Material).dispose();
    (right.ring.material as THREE.Material).dispose();
    xMats.forEach((m) => m.dispose());
    materials.dispose();
  };

  return {
    root,
    head,
    parts: {
      skull, nose, mouthGroup, mouthCavity, lipsOuter, teeth, tongue,
      lidLeftUpper, lidRightUpper, lidLeftLower, lidRightLower,
      browLeft, browRight,
      irisLeft: left.irisRoot, irisRight: right.irisRoot,
      eyeLeft: left.g, eyeRight: right.g,
      cheekLeft, cheekRight, hair,
    },
    defaults,
    materials,
    dispose,
  };
}

// ---------------------------------------------------------------------------
// Hair builders
// ---------------------------------------------------------------------------

function buildHair(
  cfg: CharacterConfig,
  materials: AvatarMaterials,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
): THREE.Group {
  const hair = new THREE.Group();
  hair.name = 'hair';

  if (cfg.hairStyle === 'child') {
    const capGeom = new THREE.SphereGeometry(0.94, 96, 96, 0, Math.PI * 2, 0, Math.PI * 0.55);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.02, 0);
    hair.add(cap);

    const tuftGeom = new THREE.SphereGeometry(1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55);
    xGeoms.push(tuftGeom);
    const TUFTS: Array<{ pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }> = [
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

  } else if (cfg.hairStyle === 'woman') {
    // Memoji-style long straight hair:
    //  1. Smooth cap on top (no clumpy tufts — clean center part)
    //  2. Two large side curtains hanging well below the chin
    //  3. Wide back panel to complete the volume
    //  4. Thin face-framing strips that frame the cheeks

    // --- smooth top cap: theta 0.38*PI keeps cap above eye level ---
    const capGeom = new THREE.SphereGeometry(0.972, 96, 96, 0, Math.PI * 2, 0, Math.PI * 0.38);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.05, 0);
    hair.add(cap);

    // --- main side curtains (left / right, mirrored) ---
    // Each is a wide, tall, thin ellipsoid — the "curtain" of long straight hair.
    const curtainGeom = new THREE.SphereGeometry(0.20, 32, 24);
    xGeoms.push(curtainGeom);
    for (const side of [-1, 1] as const) {
      const c = new THREE.Mesh(curtainGeom, materials.hair);
      c.position.set(side * 0.70, -0.70, 0.06);
      c.scale.set(1.65, 5.10, 0.54);  // ~0.66 wide, ~2.04 tall, ~0.22 deep
      c.rotation.set(0, side * 0.06, side * -0.04);
      hair.add(c);
    }

    // --- back panel (wide sheet behind the head) ---
    const backGeom = new THREE.SphereGeometry(0.22, 18, 14);
    xGeoms.push(backGeom);
    const back = new THREE.Mesh(backGeom, materials.hair);
    back.position.set(0, -0.80, -0.46);
    back.scale.set(2.30, 5.30, 0.48);  // ~1.01 wide, ~2.33 tall, ~0.21 deep
    hair.add(back);

    // --- face-framing strips (thin curtain close to cheeks) ---
    const frameGeom = new THREE.SphereGeometry(0.14, 14, 10);
    xGeoms.push(frameGeom);
    for (const side of [-1, 1] as const) {
      const f = new THREE.Mesh(frameGeom, materials.hair);
      f.position.set(side * 0.56, -0.44, 0.52);
      f.scale.set(0.82, 4.90, 0.36);  // ~0.23 wide, ~1.37 tall, ~0.10 deep
      f.rotation.set(-0.04, side * 0.10, side * -0.03);
      hair.add(f);
    }

    // --- side-swept bangs ---
    if (cfg.hasHairBangs) {
      const bangMat = new THREE.MeshStandardMaterial({ color: cfg.hairColor, roughness: 0.52, metalness: 0.0 });
      xMats.push(bangMat);

      // Main bang strip: sits on the forehead (between eye-top and cap-bottom)
      const bangGeom = new THREE.SphereGeometry(0.15, 16, 10);
      xGeoms.push(bangGeom);
      const bang = new THREE.Mesh(bangGeom, bangMat);
      bang.position.set(-0.10, 0.37, 0.75);
      bang.scale.set(2.50, 0.55, 0.22);
      bang.rotation.set(-0.18, 0.04, -0.06);
      hair.add(bang);

      // Wispy piece at left temple, just above the eye
      const bangWispGeom = new THREE.SphereGeometry(0.10, 12, 8);
      xGeoms.push(bangWispGeom);
      const wisp = new THREE.Mesh(bangWispGeom, bangMat);
      wisp.position.set(-0.44, 0.30, 0.72);
      wisp.scale.set(0.90, 0.48, 0.24);
      wisp.rotation.set(-0.22, 0.10, 0.14);
      hair.add(wisp);
    }

    // --- hair highlights (subtle lighter strands on side curtains) ---
    if (cfg.hasHairHighlights) {
      const hlColor = new THREE.Color(cfg.hairColor).lerp(new THREE.Color(0x9a7050), 0.40);
      const hlMat = new THREE.MeshStandardMaterial({ color: hlColor, roughness: 0.44, metalness: 0.0 });
      xMats.push(hlMat);

      const hlGeom = new THREE.SphereGeometry(0.055, 10, 8);
      xGeoms.push(hlGeom);

      for (const side of [-1, 1] as const) {
        // Two narrow highlight strands per side curtain
        for (const dx of [0.14, -0.10] as const) {
          const hl = new THREE.Mesh(hlGeom, hlMat);
          hl.position.set(side * (0.68 + dx), -0.68, 0.08);
          hl.scale.set(0.45, 5.00, 0.48);
          hl.rotation.set(0, side * 0.06, side * -0.04);
          hair.add(hl);
        }
      }
    }

  } else if (cfg.hairStyle === 'boyswept') {
    // Volumized chocolate-brown hair swept forward in chunky parallel rolls.
    // The look: thick rolls stacked from front to back, each roll a stretched
    // capsule pointing forward (+Z) so it reads as combed-forward bangs that
    // pile up over the forehead. Sides are kept short so the cheeks/ears show.

    // Base cap — slightly oversized to give the hair real volume.
    const capGeom = new THREE.SphereGeometry(0.97, 96, 96, 0, Math.PI * 2, 0, Math.PI * 0.50);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.06, 0);
    hair.add(cap);

    // Each roll is a thick capsule. radius ~0.11, length ~0.55, oriented along
    // its local Y axis; we rotate it so the long axis points forward and slightly
    // upward, giving the swept-forward "wave" silhouette of the reference.
    const rollGeom = new THREE.CapsuleGeometry(0.11, 0.42, 12, 24);
    xGeoms.push(rollGeom);

    // Format: [posX, posY, posZ, rotX, rotY, rotZ, sx, sy, sz]
    // posX spreads them across the head; rows from forelock to crown.
    const ROLLS: Array<[number, number, number, number, number, number, number, number, number]> = [
      // FORELOCK (front row — biggest, tipped forward, draping over forehead)
      [-0.50, 0.75, 0.65,  1.05,  0.45,  0.20,  1.05, 1.10, 1.00],
      [-0.25, 0.82, 0.72,  1.10,  0.18,  0.05,  1.10, 1.20, 1.00],
      [ 0.00, 0.85, 0.74,  1.12,  0.00,  0.00,  1.15, 1.25, 1.00],
      [ 0.25, 0.82, 0.72,  1.10, -0.18, -0.05,  1.10, 1.20, 1.00],
      [ 0.50, 0.75, 0.65,  1.05, -0.45, -0.20,  1.05, 1.10, 1.00],

      // SECOND ROW (sweep up and back, less tip)
      [-0.42, 0.92, 0.40,  0.78,  0.40,  0.20,  1.00, 1.05, 1.00],
      [-0.15, 0.98, 0.45,  0.80,  0.15,  0.05,  1.05, 1.15, 1.00],
      [ 0.15, 0.98, 0.45,  0.80, -0.15, -0.05,  1.05, 1.15, 1.00],
      [ 0.42, 0.92, 0.40,  0.78, -0.40, -0.20,  1.00, 1.05, 1.00],

      // CROWN ROW (mostly flat over the top, slight forward tilt)
      [-0.30, 1.00, 0.10,  0.50,  0.30,  0.15,  0.95, 1.00, 0.95],
      [ 0.00, 1.04, 0.12,  0.50,  0.00,  0.00,  1.00, 1.10, 1.00],
      [ 0.30, 1.00, 0.10,  0.50, -0.30, -0.15,  0.95, 1.00, 0.95],

      // SIDE WISPS (short, close to the temples)
      [-0.65, 0.55, 0.42,  0.85,  0.70,  0.55,  0.70, 0.65, 0.85],
      [ 0.65, 0.55, 0.42,  0.85, -0.70, -0.55,  0.70, 0.65, 0.85],
    ];

    for (const r of ROLLS) {
      const m = new THREE.Mesh(rollGeom, materials.hair);
      m.position.set(r[0], r[1], r[2]);
      m.rotation.set(r[3], r[4], r[5]);
      m.scale.set(r[6], r[7], r[8]);
      hair.add(m);
    }

  } else if (cfg.hairStyle === 'girllong') {
    // Memoji-style long wavy hair with one-sided flow.
    // Built from many overlapping pieces so it reads as a continuous, voluminous
    // mass — not separate strands. Hair wraps from crown down past the cheeks,
    // then cascades to chest height. Right side has more volume / wave.

    // === 1. TOP CAP — covers crown + extends past the temples ===
    // Larger theta range so the hair "helmet" comes down naturally to ear level.
    const capGeom = new THREE.SphereGeometry(0.99, 96, 96, 0, Math.PI * 2, 0, Math.PI * 0.55);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.02, -0.04);
    cap.scale.set(1.04, 1.0, 1.06);  // Slightly wider for fuller silhouette
    hair.add(cap);

    // === 2. CENTER PART HINT — small valley shape on top to suggest a part ===
    // (Done by a slightly recessed darker center sphere.)

    // === 3. FRONT FRAMING — covers temples and frames the face ===
    const frameGeom = new THREE.SphereGeometry(0.20, 32, 24);
    xGeoms.push(frameGeom);

    // Right temple frame (volumized, wave side)
    const frameR = new THREE.Mesh(frameGeom, materials.hair);
    frameR.position.set(0.62, 0.18, 0.30);
    frameR.scale.set(1.05, 1.50, 0.95);
    frameR.rotation.set(-0.10, 0.20, -0.18);
    hair.add(frameR);

    // Left temple frame (slightly smaller)
    const frameL = new THREE.Mesh(frameGeom, materials.hair);
    frameL.position.set(-0.62, 0.18, 0.30);
    frameL.scale.set(0.95, 1.40, 0.90);
    frameL.rotation.set(-0.10, -0.20, 0.18);
    hair.add(frameL);

    // === 4. SIDE CASCADES — overlapping strands flowing down each side ===
    // Multiple pieces stacked vertically with slight outward curve, so the
    // silhouette reads as flowing hair, not a flat curtain.
    const strandGeom = new THREE.SphereGeometry(0.16, 24, 18);
    xGeoms.push(strandGeom);

    // RIGHT side cascade (wave side — more pieces, more outward curve)
    const RIGHT_STRANDS: Array<[number, number, number, number, number, number, number, number, number]> = [
      // posX, posY, posZ, rotX, rotY, rotZ, sx, sy, sz
      [ 0.74, -0.10, 0.18,  0.00,  0.10, -0.10,  1.10, 1.55, 0.85 ],  // Upper
      [ 0.78, -0.55, 0.10,  0.00,  0.15, -0.15,  1.15, 1.65, 0.85 ],  // Mid
      [ 0.84, -1.00, 0.02,  0.05,  0.20, -0.22,  1.20, 1.70, 0.80 ],  // Lower
      [ 0.92, -1.40, -0.05, 0.05,  0.25, -0.30,  1.25, 1.55, 0.75 ],  // Lower-end (wave outward)
      [ 0.98, -1.72, -0.10, 0.10,  0.30, -0.40,  1.30, 1.30, 0.70 ],  // Tip (curls out)
    ];
    for (const r of RIGHT_STRANDS) {
      const m = new THREE.Mesh(strandGeom, materials.hair);
      m.position.set(r[0], r[1], r[2]);
      m.rotation.set(r[3], r[4], r[5]);
      m.scale.set(r[6], r[7], r[8]);
      hair.add(m);
    }

    // LEFT side cascade (calmer, fewer pieces, hair tucked behind ear-ish)
    const LEFT_STRANDS: Array<[number, number, number, number, number, number, number, number, number]> = [
      [-0.70, -0.10, 0.18,  0.00, -0.10,  0.10,  1.05, 1.50, 0.80 ],
      [-0.72, -0.55, 0.08,  0.00, -0.12,  0.12,  1.10, 1.60, 0.80 ],
      [-0.75, -1.00, -0.02, 0.00, -0.15,  0.18,  1.10, 1.55, 0.75 ],
      [-0.78, -1.40, -0.10, 0.05, -0.18,  0.22,  1.15, 1.40, 0.70 ],
    ];
    for (const r of LEFT_STRANDS) {
      const m = new THREE.Mesh(strandGeom, materials.hair);
      m.position.set(r[0], r[1], r[2]);
      m.rotation.set(r[3], r[4], r[5]);
      m.scale.set(r[6], r[7], r[8]);
      hair.add(m);
    }

    // === 5. BACK VOLUME — fills the area behind the head ===
    // Three stacked back panels for natural curved volume.
    const backGeom = new THREE.SphereGeometry(0.30, 24, 18);
    xGeoms.push(backGeom);

    // Upper back (behind crown)
    const backTop = new THREE.Mesh(backGeom, materials.hair);
    backTop.position.set(0.05, -0.10, -0.60);
    backTop.scale.set(2.20, 1.80, 1.10);
    hair.add(backTop);

    // Middle back (behind shoulders)
    const backMid = new THREE.Mesh(backGeom, materials.hair);
    backMid.position.set(0.08, -0.85, -0.55);
    backMid.scale.set(2.30, 2.20, 1.00);
    hair.add(backMid);

    // Lower back (long ends, slightly off-center for asymmetry)
    const backLow = new THREE.Mesh(backGeom, materials.hair);
    backLow.position.set(0.10, -1.55, -0.45);
    backLow.scale.set(2.10, 1.50, 0.85);
    hair.add(backLow);

    // === 6. FRONT-OF-EAR WISPS — small pieces in front of the ear ===
    // These add the visual connection between the cap and the side cascades.
    const wispGeom = new THREE.SphereGeometry(0.12, 16, 12);
    xGeoms.push(wispGeom);

    // Right wisp (in front of right ear, where wave begins)
    const wispR = new THREE.Mesh(wispGeom, materials.hair);
    wispR.position.set(0.66, 0.45, 0.20);
    wispR.scale.set(1.20, 1.30, 1.10);
    wispR.rotation.set(-0.15, 0.15, -0.10);
    hair.add(wispR);

    // Left wisp
    const wispL = new THREE.Mesh(wispGeom, materials.hair);
    wispL.position.set(-0.66, 0.45, 0.20);
    wispL.scale.set(1.10, 1.20, 1.05);
    wispL.rotation.set(-0.15, -0.15, 0.10);
    hair.add(wispL);

  } else if (cfg.hairStyle === 'man') {
    // Shorter cap with slight recession at the front.
    const capGeom = new THREE.SphereGeometry(0.91, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.46);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.05, 0);
    hair.add(cap);

    const tuftGeom = new THREE.SphereGeometry(1, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.50);
    xGeoms.push(tuftGeom);
    const TUFTS: Array<{ pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }> = [
      { pos: [-0.20, 0.74, 0.48], rot: [-0.58, 0.12, 0.12], scale: [0.32, 0.24, 0.32] },
      { pos: [0.06, 0.80, 0.50], rot: [-0.62, 0.0, 0.0], scale: [0.34, 0.26, 0.34] },
      { pos: [0.30, 0.74, 0.44], rot: [-0.58, -0.18, -0.18], scale: [0.32, 0.24, 0.32] },
      { pos: [-0.42, 0.66, 0.36], rot: [-0.48, 0.36, 0.36], scale: [0.26, 0.18, 0.26] },
      { pos: [0.44, 0.64, 0.34], rot: [-0.46, -0.36, -0.36], scale: [0.26, 0.18, 0.26] },
      { pos: [0.0, 0.84, 0.20], rot: [-0.22, 0.0, 0.0], scale: [0.30, 0.22, 0.30] },
    ];
    for (const t of TUFTS) {
      const m = new THREE.Mesh(tuftGeom, materials.hair);
      m.position.fromArray(t.pos);
      m.rotation.fromArray(t.rot);
      m.scale.fromArray(t.scale);
      hair.add(m);
    }

  } else {
    // grandpa: just side wisps — no full cap on top (shows skin through).
    const wispGeom = new THREE.SphereGeometry(0.18, 12, 12);
    xGeoms.push(wispGeom);
    const WISPS: Array<{ pos: [number, number, number]; scale: [number, number, number]; rot: [number, number, number] }> = [
      { pos: [0.76, 0.32, 0.10], scale: [0.22, 0.15, 0.14], rot: [0.0, 0.0, 0.30] },
      { pos: [0.82, 0.48, -0.08], scale: [0.18, 0.13, 0.12], rot: [0.0, 0.0, 0.22] },
      { pos: [0.78, 0.18, 0.30], scale: [0.20, 0.14, 0.14], rot: [-0.10, 0.0, 0.22] },
      { pos: [0.68, 0.58, 0.18], scale: [0.16, 0.11, 0.11], rot: [0.0, 0.0, 0.18] },
      // Back wisps
      { pos: [0.38, 0.18, -0.86], scale: [0.20, 0.12, 0.10], rot: [0.4, 0.0, 0.0] },
    ];
    for (const w of WISPS) {
      for (const side of [-1, 1] as const) {
        const m = new THREE.Mesh(wispGeom, materials.hair);
        m.position.set(w.pos[0] * side, w.pos[1], w.pos[2]);
        m.scale.fromArray(w.scale);
        m.rotation.set(w.rot[0], w.rot[1], w.rot[2] * side);
        hair.add(m);
      }
    }
  }

  return hair;
}

// ---------------------------------------------------------------------------
// Eyelashes (woman)
// ---------------------------------------------------------------------------

function buildLashes(
  head: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  // Tapered cone-like lashes: thin tip, wider base. Reused across all lashes
  // and scaled per-instance for length variation.
  const upperGeom = new THREE.CylinderGeometry(0.0012, 0.006, 1.0, 6);
  xGeoms.push(upperGeom);
  // Lower lashes: shorter and stubbier
  const lowerGeom = new THREE.CylinderGeometry(0.001, 0.004, 1.0, 6);
  xGeoms.push(lowerGeom);

  const lashMat = new THREE.MeshStandardMaterial({
    color: 0x0a0606,
    roughness: 0.5,
    metalness: 0.0,
  });
  xMats.push(lashMat);

  // ---- Upper lashes: 11 per eye, fanned with curve ----
  const UPPER_COUNT = 11;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < UPPER_COUNT; i++) {
      const t = i / (UPPER_COUNT - 1); // 0..1 across the lash line
      // outerness: 0 at inner corner of eye, 1 at outer corner
      const outerness = side === -1 ? t : 1 - t;
      // Length: outer corner lashes are dramatically longer (key Memoji cue)
      const len = 0.055 + outerness * 0.060;
      // Horizontal position across the eye (sin curve so they cluster nicely)
      const xRel = (t - 0.5) * cfg.eyeOffsetX * 1.18;
      const lash = new THREE.Mesh(upperGeom, lashMat);
      lash.position.set(
        side * cfg.eyeOffsetX + xRel,
        cfg.eyeOffsetY + cfg.eyeRadius * 0.92,
        cfg.eyeZ + cfg.eyeRadius * 0.16,
      );
      lash.scale.set(1.0, len, 1.0);
      // Rotation: tilted back, fanned outward, outer lashes angle more
      const tiltX = -0.42 - outerness * 0.20;
      const fanZ = -side * (t - 0.5) * 1.45;
      const yawY = side * outerness * 0.18;
      lash.rotation.set(tiltX, yawY, fanZ);
      head.add(lash);
    }
  }

  // ---- Lower lashes: 4 per eye, very subtle ----
  const LOWER_COUNT = 4;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < LOWER_COUNT; i++) {
      const t = (i + 0.5) / LOWER_COUNT; // 0.125..0.875
      const outerness = side === -1 ? t : 1 - t;
      const xRel = (t - 0.5) * cfg.eyeOffsetX * 0.95;
      const lash = new THREE.Mesh(lowerGeom, lashMat);
      lash.position.set(
        side * cfg.eyeOffsetX + xRel,
        cfg.eyeOffsetY - cfg.eyeRadius * 0.85,
        cfg.eyeZ + cfg.eyeRadius * 0.18,
      );
      // Lower lashes are short
      const len = 0.020 + outerness * 0.014;
      lash.scale.set(0.85, len, 0.85);
      // Pointing down-and-out
      const tiltX = 0.45 + outerness * 0.15;
      const fanZ = side * (t - 0.5) * 0.9;
      lash.rotation.set(tiltX, 0, fanZ);
      head.add(lash);
    }
  }
}

// ---------------------------------------------------------------------------
// Permanent blush (woman) — always-visible rose discs on each cheek
// ---------------------------------------------------------------------------

function buildBlush(
  head: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  // Two-layer blush: an inner saturated dot inside a soft outer halo for
  // that natural Memoji "glowing cheeks" gradient.
  const blushColor = new THREE.Color(cfg.blushColor);

  // Inner saturated layer
  const innerMat = new THREE.MeshStandardMaterial({
    color: cfg.blushColor,
    transparent: true,
    opacity: 0.42,
    roughness: 0.65,
    emissive: blushColor.clone().multiplyScalar(0.18),
    emissiveIntensity: 1.0,
    metalness: 0.0,
  });
  xMats.push(innerMat);

  // Outer soft halo (lighter, larger, fading)
  const haloColor = blushColor.clone().lerp(new THREE.Color(0xffeeee), 0.3);
  const outerMat = new THREE.MeshStandardMaterial({
    color: haloColor,
    transparent: true,
    opacity: 0.20,
    roughness: 0.75,
    metalness: 0.0,
  });
  xMats.push(outerMat);

  const innerGeom = new THREE.SphereGeometry(0.18, 20, 14);
  xGeoms.push(innerGeom);
  const outerGeom = new THREE.SphereGeometry(0.26, 20, 14);
  xGeoms.push(outerGeom);

  for (const side of [-1, 1] as const) {
    // Outer halo (slightly behind so it appears around the inner dot)
    const halo = new THREE.Mesh(outerGeom, outerMat);
    halo.position.set(
      side * (cfg.cheekOffsetX - 0.06),
      cfg.cheekOffsetY + 0.05,
      cfg.cheekOffsetZ + 0.10,
    );
    halo.scale.set(1.10, 0.92, 0.11);
    head.add(halo);

    // Inner saturated center
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.set(
      side * (cfg.cheekOffsetX - 0.06),
      cfg.cheekOffsetY + 0.05,
      cfg.cheekOffsetZ + 0.13,
    );
    inner.scale.set(1.05, 0.88, 0.12);
    head.add(inner);
  }
}

// ---------------------------------------------------------------------------
// Eye makeup (woman) — soft shadow above lid + thin eyeliner
// ---------------------------------------------------------------------------

function buildEyeMakeup(
  head: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  // --- Eyeshadow: warm peach-pink dome above each upper lid ---
  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0xd28a90,
    transparent: true,
    opacity: 0.20,
    roughness: 0.85,
    metalness: 0.0,
  });
  xMats.push(shadowMat);

  const shadowGeom = new THREE.SphereGeometry(
    cfg.eyeRadius + 0.012,
    20,
    12,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.42,
  );
  xGeoms.push(shadowGeom);

  for (const side of [-1, 1] as const) {
    const shadow = new THREE.Mesh(shadowGeom, shadowMat);
    shadow.position.set(
      side * cfg.eyeOffsetX,
      cfg.eyeOffsetY + cfg.eyeRadius * 0.15,
      cfg.eyeZ - 0.005,
    );
    shadow.scale.set(1.05, 0.55, 1.0);
    head.add(shadow);
  }

  // --- Eyeliner: thin dark crescent along the upper lash line ---
  const linerMat = new THREE.MeshStandardMaterial({
    color: 0x1a0d0d,
    roughness: 0.6,
    metalness: 0.0,
  });
  xMats.push(linerMat);

  const linerGeom = new THREE.SphereGeometry(cfg.eyeRadius + 0.008, 22, 8);
  xGeoms.push(linerGeom);

  for (const side of [-1, 1] as const) {
    const liner = new THREE.Mesh(linerGeom, linerMat);
    liner.position.set(
      side * cfg.eyeOffsetX,
      cfg.eyeOffsetY + cfg.eyeRadius * 0.83,
      cfg.eyeZ + 0.005,
    );
    // Very thin in Y (just a line), tilted slightly back
    liner.scale.set(1.05, 0.045, 0.55);
    liner.rotation.set(-0.18, 0, 0);
    head.add(liner);
  }
}

// ---------------------------------------------------------------------------
// Lip detail (woman) — cupid's bow accent + glossy lower-lip highlight
// ---------------------------------------------------------------------------

function buildLipGloss(
  mouthGroup: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  // --- Cupid's bow: small darker accent that defines the upper-lip peak ---
  const bowColor = new THREE.Color(cfg.lipColor).multiplyScalar(0.78);
  const bowMat = new THREE.MeshStandardMaterial({
    color: bowColor,
    roughness: 0.45,
    metalness: 0.0,
  });
  xMats.push(bowMat);

  const bowGeom = new THREE.SphereGeometry(0.020, 12, 10);
  xGeoms.push(bowGeom);

  for (const offsetX of [-0.018, 0.018] as const) {
    const bow = new THREE.Mesh(bowGeom, bowMat);
    bow.position.set(offsetX, cfg.lipTorusRadius * 0.18, 0.02);
    bow.scale.set(1.0, 0.55, 0.5);
    mouthGroup.add(bow);
  }

  // --- Lower-lip gloss: a bright thin curved highlight ---
  const glossMat = new THREE.MeshStandardMaterial({
    color: 0xffd6dc,
    transparent: true,
    opacity: 0.55,
    roughness: 0.05,
    metalness: 0.05,
    emissive: 0xff9aa0,
    emissiveIntensity: 0.12,
  });
  xMats.push(glossMat);

  // Half-torus arc for the gloss line on lower lip
  const glossGeom = new THREE.TorusGeometry(
    cfg.lipTorusRadius * 0.62,
    0.010,
    8,
    24,
    Math.PI * 0.85,
  );
  xGeoms.push(glossGeom);

  const gloss = new THREE.Mesh(glossGeom, glossMat);
  gloss.position.set(0, -cfg.lipTorusRadius * 0.05, 0.035);
  // Rotate so the arc opens upward, sitting on the lower lip
  gloss.rotation.set(0, 0, Math.PI);
  gloss.scale.set(1.0, 0.35, 0.6);
  mouthGroup.add(gloss);
}

// ---------------------------------------------------------------------------
// Eye accents (woman) — bigger highlight + accent dot + soft inner glow ring
// ---------------------------------------------------------------------------

function buildEyeAccents(
  irisLeft: THREE.Group,
  irisRight: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  // Soft inner glow: a lighter ring around the pupil for iris depth.
  const glowColor = new THREE.Color(cfg.irisColor).lerp(
    new THREE.Color(0xfff0d8),
    0.55,
  );
  const glowMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: 0.42,
  });
  xMats.push(glowMat);

  const glowGeom = new THREE.RingGeometry(
    cfg.irisRadius * 0.50,
    cfg.irisRadius * 0.86,
    32,
  );
  xGeoms.push(glowGeom);

  // Larger primary catchlight
  const mainGeom = new THREE.CircleGeometry(cfg.irisRadius * 0.30, 18);
  xGeoms.push(mainGeom);

  // Small accent highlight on the opposite side
  const accentGeom = new THREE.CircleGeometry(cfg.irisRadius * 0.13, 14);
  xGeoms.push(accentGeom);

  const whiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
  });
  xMats.push(whiteMat);

  const targets: Array<[THREE.Group, -1 | 1]> = [
    [irisLeft, -1],
    [irisRight, 1],
  ];
  for (const [iris, side] of targets) {
    // Glow ring sits slightly above the iris disc.
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.set(0, 0, cfg.eyeRadius + 0.0025);
    iris.add(glow);

    // Big catchlight up-and-outer
    const main = new THREE.Mesh(mainGeom, whiteMat);
    main.position.set(
      -0.045 * side,
      cfg.irisRadius * 0.42,
      cfg.eyeRadius + 0.005,
    );
    iris.add(main);

    // Small accent on the opposite side
    const accent = new THREE.Mesh(accentGeom, whiteMat);
    accent.position.set(
      0.05 * side,
      -cfg.irisRadius * 0.32,
      cfg.eyeRadius + 0.0055,
    );
    iris.add(accent);
  }
}

// ---------------------------------------------------------------------------
// Beard (uncle = stubble, grandpa = full)
// ---------------------------------------------------------------------------

function buildBeard(
  head: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  const beardMat = new THREE.MeshStandardMaterial({
    color: cfg.beardColor,
    roughness: 0.9,
    metalness: 0.0,
  });
  xMats.push(beardMat);

  if (cfg.beardStyle === 'stubble') {
    // Flat mesh covering the lower jaw area, sitting just proud of the skin.
    const g = new THREE.SphereGeometry(0.62, 24, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.34);
    xGeoms.push(g);
    const mesh = new THREE.Mesh(g, beardMat);
    mesh.position.set(0, -0.26, 0.48);
    mesh.scale.set(cfg.headScaleX * 0.97, 0.88, 0.62);
    head.add(mesh);
  } else if (cfg.beardStyle === 'full') {
    // Main beard covering lower face.
    const g = new THREE.SphereGeometry(0.65, 24, 16, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.40);
    xGeoms.push(g);
    const mesh = new THREE.Mesh(g, beardMat);
    mesh.position.set(0, -0.30, 0.46);
    mesh.scale.set(cfg.headScaleX * 0.98, 0.92, 0.66);
    head.add(mesh);

    // Chin puff extending below the jaw.
    const chinG = new THREE.SphereGeometry(0.20, 18, 14);
    xGeoms.push(chinG);
    const chin = new THREE.Mesh(chinG, beardMat);
    chin.position.set(0, -0.66, 0.54);
    chin.scale.set(0.95, 0.78, 0.68);
    head.add(chin);
  }
}

// ---------------------------------------------------------------------------
// Glasses (grandpa)
// ---------------------------------------------------------------------------

function buildGlasses(
  head: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1c1410,
    roughness: 0.5,
    metalness: 0.35,
  });
  xMats.push(frameMat);

  const FRAME_R = cfg.eyeRadius * 1.18;
  const TUBE_R = 0.018;
  const frameGeom = new THREE.TorusGeometry(FRAME_R, TUBE_R, 10, 32);
  xGeoms.push(frameGeom);

  const ey = cfg.eyeOffsetY;
  const ez = cfg.eyeZ + 0.04; // slightly in front of eye plane

  for (const side of [-1, 1] as const) {
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(cfg.eyeOffsetX * side, ey, ez);
    frame.rotation.x = 0.05;
    head.add(frame);
  }

  // Bridge connecting the two frames.
  const bridgeW = cfg.eyeOffsetX * 2 - FRAME_R * 2 - 0.02;
  const bridgeGeom = new THREE.BoxGeometry(Math.max(0.02, bridgeW), TUBE_R * 1.8, TUBE_R * 1.8);
  xGeoms.push(bridgeGeom);
  const bridge = new THREE.Mesh(bridgeGeom, frameMat);
  bridge.position.set(0, ey, ez);
  head.add(bridge);

  // Temple arms extending to the sides of the head.
  const armGeom = new THREE.BoxGeometry(0.55, TUBE_R * 1.5, TUBE_R * 1.5);
  xGeoms.push(armGeom);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeom, frameMat);
    arm.position.set(side * (cfg.eyeOffsetX + FRAME_R + 0.26), ey, ez - 0.04);
    arm.rotation.set(0, side * 0.1, 0);
    head.add(arm);
  }
}

// ---------------------------------------------------------------------------
// Wrinkles / age lines (grandpa)
// ---------------------------------------------------------------------------

function buildWrinkles(
  head: THREE.Group,
  cfg: CharacterConfig,
  xGeoms: THREE.BufferGeometry[],
  xMats: THREE.Material[],
) {
  // Dark-tinted skin material for the crease lines.
  const wrinkleMat = new THREE.MeshStandardMaterial({
    color: cfg.skinColor,
    emissive: new THREE.Color(0x0a0500),
    emissiveIntensity: 1.0,
    roughness: 0.92,
    metalness: 0.0,
  });
  xMats.push(wrinkleMat);

  const ey = cfg.eyeOffsetY;
  const ez = cfg.eyeZ;

  // Crow's feet: 3 short arcs radiating from each outer eye corner.
  const crowGeom = new THREE.TorusGeometry(0.060, 0.007, 5, 14, Math.PI * 0.55);
  xGeoms.push(crowGeom);
  for (const side of [-1, 1] as const) {
    const baseX = side * (cfg.eyeOffsetX + cfg.eyeRadius * 0.8);
    for (let i = 0; i < 3; i++) {
      const crow = new THREE.Mesh(crowGeom, wrinkleMat);
      crow.position.set(
        baseX + side * i * 0.022,
        ey - 0.02 - i * 0.038,
        ez - 0.06 + i * 0.018,
      );
      crow.rotation.set(0.2, side * (-0.5 - i * 0.15), side * 0.35);
      head.add(crow);
    }
  }

  // Nasolabial folds: curved creases from nose to mouth corners.
  const foldGeom = new THREE.TorusGeometry(0.21, 0.008, 5, 18, Math.PI * 0.50);
  xGeoms.push(foldGeom);
  for (const side of [-1, 1] as const) {
    const fold = new THREE.Mesh(foldGeom, wrinkleMat);
    fold.position.set(side * 0.26, -0.08, 0.76);
    fold.rotation.set(-0.12, side * 0.52, side * 1.28);
    head.add(fold);
  }
}
