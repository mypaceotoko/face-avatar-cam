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

  // ---- Skull ----------------------------------------------------------------
  const skullGeom = new THREE.SphereGeometry(0.9, 64, 64);
  const skull = new THREE.Mesh(skullGeom, materials.skin);
  skull.scale.set(cfg.headScaleX, cfg.headScaleY, cfg.headScaleZ);
  head.add(skull);

  // ---- Nose -----------------------------------------------------------------
  const noseGeom = new THREE.SphereGeometry(cfg.noseRadius, 24, 24);
  const nose = new THREE.Mesh(noseGeom, materials.skin);
  nose.position.set(0, cfg.noseOffsetY, cfg.noseZ);
  nose.scale.set(cfg.noseScaleX, cfg.noseScaleY, cfg.noseScaleZ);
  head.add(nose);

  // ---- Ears -----------------------------------------------------------------
  const earGeom = new THREE.SphereGeometry(cfg.earRadius, 20, 20);
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

  // ---- Eyes -----------------------------------------------------------------
  const sceleraR = cfg.eyeRadius;
  const eyeOffsetX = cfg.eyeOffsetX;
  const eyeY = cfg.eyeOffsetY;
  const eyeZ = cfg.eyeZ;

  const sceleraGeom = new THREE.SphereGeometry(sceleraR, 32, 32);
  const irisGeom = new THREE.CircleGeometry(cfg.irisRadius, 32);
  const irisRingGeom = new THREE.RingGeometry(cfg.irisRadius * 0.91, cfg.irisRadius * 1.045, 32);
  const pupilGeom = new THREE.CircleGeometry(cfg.irisRadius * 0.47, 24);
  const hiliteGeom = new THREE.CircleGeometry(cfg.irisRadius * 0.20, 16);

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
  const lidUpperGeom = new THREE.SphereGeometry(sceleraR + 0.005, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const lidLeftUpper = new THREE.Mesh(lidUpperGeom, materials.skin);
  lidLeftUpper.position.set(-eyeOffsetX, eyeY, eyeZ);
  lidLeftUpper.scale.y = 0.05;
  head.add(lidLeftUpper);
  const lidRightUpper = new THREE.Mesh(lidUpperGeom, materials.skin);
  lidRightUpper.position.set(eyeOffsetX, eyeY, eyeZ);
  lidRightUpper.scale.y = 0.05;
  head.add(lidRightUpper);

  const lidLowerGeom = new THREE.SphereGeometry(sceleraR + 0.005, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
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

  // ---- Eyelashes (woman only) -----------------------------------------------
  if (cfg.hasLashes) {
    buildLashes(head, cfg, xGeoms, xMats);
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

  // ---- Cheeks ---------------------------------------------------------------
  const cheekGeom = new THREE.SphereGeometry(cfg.cheekRadius, 20, 20);
  const cheekLeft = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekLeft.position.set(-cfg.cheekOffsetX, cfg.cheekOffsetY, cfg.cheekOffsetZ);
  cheekLeft.scale.set(0.7, 0.6, 0.5);
  head.add(cheekLeft);
  const cheekRight = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekRight.position.set(cfg.cheekOffsetX, cfg.cheekOffsetY, cfg.cheekOffsetZ);
  cheekRight.scale.set(0.7, 0.6, 0.5);
  head.add(cheekRight);

  // ---- Beard (uncle / grandpa) ----------------------------------------------
  if (cfg.hasBeard) {
    buildBeard(head, cfg, xGeoms, xMats);
  }

  // ---- Mouth ----------------------------------------------------------------
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, cfg.mouthOffsetY, cfg.mouthOffsetZ);
  head.add(mouthGroup);

  const lipsGeom = new THREE.TorusGeometry(cfg.lipTorusRadius, cfg.lipTubeRadius, 16, 48);
  const lipsOuter = new THREE.Mesh(lipsGeom, materials.lip);
  lipsOuter.scale.set(1.0, 0.55, 0.6);
  lipsOuter.rotation.x = -0.1;
  mouthGroup.add(lipsOuter);

  const cavityR = cfg.lipTorusRadius * 0.89;
  const cavityGeom = new THREE.SphereGeometry(cavityR, 24, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const mouthCavity = new THREE.Mesh(cavityGeom, materials.mouthCavity);
  mouthCavity.position.set(0, 0, -0.02);
  mouthCavity.scale.set(1.0, 0.18, 0.6);
  mouthGroup.add(mouthCavity);

  const teethW = cfg.lipTorusRadius * 1.22;
  const teethGeom = new THREE.BoxGeometry(teethW, 0.05, 0.04);
  const teeth = new THREE.Mesh(teethGeom, materials.teeth);
  teeth.position.set(0, 0.025, 0.0);
  mouthGroup.add(teeth);

  const tongueGeom = new THREE.SphereGeometry(0.10, 20, 20);
  const tongue = new THREE.Mesh(tongueGeom, materials.tongue);
  tongue.position.set(0, -0.03, -0.04);
  tongue.scale.set(1.0, 0.55, 1.1);
  mouthGroup.add(tongue);

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
  _xMats: THREE.Material[],
): THREE.Group {
  const hair = new THREE.Group();
  hair.name = 'hair';

  if (cfg.hairStyle === 'child') {
    const capGeom = new THREE.SphereGeometry(0.94, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.55);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.02, 0);
    hair.add(cap);

    const tuftGeom = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
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

    // --- smooth top cap ---
    const capGeom = new THREE.SphereGeometry(0.972, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.58);
    xGeoms.push(capGeom);
    const cap = new THREE.Mesh(capGeom, materials.hair);
    cap.position.set(0, 0.015, 0);
    hair.add(cap);

    // --- main side curtains (left / right, mirrored) ---
    // Each is a wide, tall, thin ellipsoid — the "curtain" of long straight hair.
    const curtainGeom = new THREE.SphereGeometry(0.20, 18, 14);
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
  const lashGeom = new THREE.BoxGeometry(0.014, 0.072, 0.010);
  xGeoms.push(lashGeom);
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x0c0808, roughness: 0.7 });
  xMats.push(lashMat);

  const COUNT = 7;
  const halfSpan = cfg.eyeOffsetX * 0.88;
  const step = (halfSpan * 2) / (COUNT - 1);

  for (const side of [-1, 1] as const) {
    const cx = cfg.eyeOffsetX * side;
    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1); // 0..1
      const lx = (-halfSpan + step * i) * side; // local x offset within eye
      // Outer lashes angle more outward; use a gentle fan.
      const fanAngle = (t - 0.5) * 0.7 * side;
      const lash = new THREE.Mesh(lashGeom, lashMat);
      lash.position.set(
        cx + lx * 0.55,
        cfg.eyeOffsetY + cfg.eyeRadius * 0.92,
        cfg.eyeZ + 0.01,
      );
      lash.rotation.set(-0.3, 0, fanAngle);
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
  const blushMat = new THREE.MeshStandardMaterial({
    color: cfg.blushColor,
    transparent: true,
    opacity: 0.30,
    roughness: 0.7,
    metalness: 0.0,
  });
  xMats.push(blushMat);

  // Two very flat ellipsoid discs sitting on the face surface of the skull.
  const blushGeom = new THREE.SphereGeometry(0.22, 18, 14);
  xGeoms.push(blushGeom);

  for (const side of [-1, 1] as const) {
    const b = new THREE.Mesh(blushGeom, blushMat);
    b.position.set(
      side * (cfg.cheekOffsetX - 0.06),
      cfg.cheekOffsetY + 0.04,
      cfg.cheekOffsetZ + 0.12,
    );
    // Very flat disk pressed against the skin surface.
    b.scale.set(1.05, 0.86, 0.12);
    head.add(b);
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
