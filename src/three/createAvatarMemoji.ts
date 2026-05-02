import * as THREE from 'three';

/**
 * Memoji-inspired avatar with expressive features
 * - Round face shape
 * - Large expressive eyes
 * - Simple elegant nose
 * - Natural mouth with full expression range
 * - Yellow-toned skin with smooth finish
 * - Multiple hairstyles
 */

export type MemojiFace = {
  root: THREE.Group;
  head: THREE.Group;
  parts: {
    head: THREE.Mesh;
    eyes: { left: THREE.Group; right: THREE.Group };
    mouth: THREE.Group;
    eyebrows: { left: THREE.Mesh; right: THREE.Mesh };
    nose: THREE.Mesh;
    hair: THREE.Group;
    cheeks: { left: THREE.Mesh; right: THREE.Mesh };
  };
  // Expression controls
  setExpression: (expr: ExpressionType) => void;
  lookDirection: (x: number, y: number) => void;
  blink: () => void;
};

export type ExpressionType = 'neutral' | 'smile' | 'surprised' | 'angry' | 'sad' | 'laughing' | 'concerned';

type HairstyleType = 'short' | 'long' | 'curly' | 'spiky' | 'bob';

export function createMemojiFace(hairstyle: HairstyleType = 'short'): MemojiFace {
  const root = new THREE.Group();
  root.name = 'memojiRoot';

  const head = new THREE.Group();
  head.name = 'memojiHead';
  root.add(head);

  // ==================== MATERIALS ====================
  const materials = {
    skin: new THREE.MeshStandardMaterial({
      color: 0xf4c896, // Warm yellow skin tone
      roughness: 0.65,
      metalness: 0.0,
      emissive: new THREE.Color(0xf0b878),
      emissiveIntensity: 0.15,
    }),
    eyeWhite: new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.15,
      metalness: 0.0,
    }),
    iris: new THREE.MeshStandardMaterial({
      color: 0x6b4423, // Warm brown
      roughness: 0.35,
      metalness: 0.08,
      emissive: new THREE.Color(0x5a3820),
      emissiveIntensity: 0.2,
    }),
    pupil: new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
    highlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    lip: new THREE.MeshStandardMaterial({
      color: 0xd97a6a,
      roughness: 0.3,
      metalness: 0.03,
      emissive: new THREE.Color(0xc96555),
      emissiveIntensity: 0.25,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: 0x3d2817, // Dark brown
      roughness: 0.5,
      metalness: 0.02,
    }),
    cheek: new THREE.MeshStandardMaterial({
      color: 0xe8a888,
      roughness: 0.7,
      metalness: 0.0,
      transparent: true,
      opacity: 0.4,
    }),
  };

  // ==================== HEAD ====================
  // Perfect round head - the foundation of Memoji style
  const headGeom = new THREE.SphereGeometry(1.0, 128, 128);

  // Procedurally modify to perfect circle with slight face tapering
  const posAttr = headGeom.getAttribute('position');
  const positions = posAttr.array as Float32Array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    // Normalize to perfect sphere first
    const len = Math.sqrt(x * x + y * y + z * z);
    const normalized = [x / len, y / len, z / len];

    // Subtle face narrowing at sides
    const sideNarrow = 1.0 - Math.abs(normalized[0]) * 0.08;
    positions[i] *= sideNarrow;
  }
  posAttr.needsUpdate = true;
  headGeom.computeVertexNormals();

  const headMesh = new THREE.Mesh(headGeom, materials.skin);
  head.add(headMesh);

  // ==================== EYES ====================
  // Large, expressive eyes - key feature of Memoji
  const eyeRadius = 0.22;
  const eyeOffsetX = 0.35;
  const eyeOffsetY = 0.15;
  const eyeOffsetZ = 0.85;

  function createEye(side: -1 | 1): THREE.Group {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(eyeOffsetX * side, eyeOffsetY, eyeOffsetZ);

    // Sclera (eye white)
    const scleraGeom = new THREE.IcosahedronGeometry(eyeRadius, 6);
    const scleraMesh = new THREE.Mesh(scleraGeom, materials.eyeWhite);
    eyeGroup.add(scleraMesh);

    // Iris and pupil group - for looking direction
    const irisGroup = new THREE.Group();
    eyeGroup.add(irisGroup);

    // Iris
    const irisGeom = new THREE.CircleGeometry(eyeRadius * 0.55, 64);
    const irisMesh = new THREE.Mesh(irisGeom, materials.iris);
    irisMesh.position.z = eyeRadius + 0.002;
    irisGroup.add(irisMesh);

    // Iris detail ring
    const irisRingGeom = new THREE.RingGeometry(eyeRadius * 0.45, eyeRadius * 0.6, 64);
    const irisRing = new THREE.Mesh(
      irisRingGeom,
      new THREE.MeshStandardMaterial({
        color: 0x4a2a1a,
        roughness: 0.5,
        metalness: 0.02,
      })
    );
    irisRing.position.z = eyeRadius + 0.003;
    irisGroup.add(irisRing);

    // Pupil
    const pupilGeom = new THREE.CircleGeometry(eyeRadius * 0.28, 48);
    const pupilMesh = new THREE.Mesh(pupilGeom, materials.pupil);
    pupilMesh.position.z = eyeRadius + 0.004;
    irisGroup.add(pupilMesh);

    // Highlight for depth
    const highlightGeom = new THREE.CircleGeometry(eyeRadius * 0.12, 32);
    const highlightMesh = new THREE.Mesh(highlightGeom, materials.highlight);
    highlightMesh.position.set(-eyeRadius * 0.15 * side, eyeRadius * 0.15, eyeRadius + 0.005);
    irisGroup.add(highlightMesh);

    return eyeGroup;
  }

  const eyeLeft = createEye(-1);
  const eyeRight = createEye(1);
  head.add(eyeLeft);
  head.add(eyeRight);

  // ==================== EYEBROWS ====================
  // Expressive eyebrows for emotion
  function createEyebrow(side: -1 | 1): THREE.Mesh {
    const browGeom = new THREE.BoxGeometry(0.28, 0.08, 0.08);
    const browMesh = new THREE.Mesh(
      browGeom,
      new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.6,
        metalness: 0.0,
      })
    );
    browMesh.position.set(eyeOffsetX * side, eyeOffsetY + 0.26, eyeOffsetZ + 0.05);
    browMesh.rotation.z = side > 0 ? -0.15 : 0.15;
    return browMesh;
  }

  const browLeft = createEyebrow(-1);
  const browRight = createEyebrow(1);
  head.add(browLeft);
  head.add(browRight);

  // ==================== NOSE ====================
  // Simple, elegant nose
  const noseGeom = new THREE.ConeGeometry(0.08, 0.15, 24, 8);
  const noseMesh = new THREE.Mesh(noseGeom, materials.skin);
  noseMesh.position.set(0, -0.05, 0.95);
  noseMesh.rotation.x = Math.PI * 0.5;
  head.add(noseMesh);

  // Subtle nostrils
  const nostrilGeom = new THREE.SphereGeometry(0.03, 16, 16);
  const nostrilMat = new THREE.MeshStandardMaterial({
    color: 0x8a6a50,
    roughness: 0.8,
  });
  const nostrilL = new THREE.Mesh(nostrilGeom, nostrilMat);
  nostrilL.position.set(-0.05, -0.08, 0.98);
  nostrilL.scale.set(0.8, 0.7, 0.6);
  head.add(nostrilL);

  const nostrilR = new THREE.Mesh(nostrilGeom, nostrilMat);
  nostrilR.position.set(0.05, -0.08, 0.98);
  nostrilR.scale.set(0.8, 0.7, 0.6);
  head.add(nostrilR);

  // ==================== MOUTH ====================
  // Expressive mouth with various shapes
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.35, 0.9);
  head.add(mouthGroup);

  // Create mouth mesh that can deform for expressions
  const mouthGeom = createMouthGeometry();
  const mouthMesh = new THREE.Mesh(mouthGeom, materials.lip);
  mouthGroup.add(mouthMesh);

  // Mouth cavity
  const cavityGeom = new THREE.SphereGeometry(0.15, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const cavityMesh = new THREE.Mesh(
    cavityGeom,
    new THREE.MeshStandardMaterial({
      color: 0x4a1a1a,
      roughness: 0.8,
      side: THREE.DoubleSide,
    })
  );
  cavityMesh.position.z = -0.02;
  cavityMesh.scale.set(1.0, 0.2, 0.7);
  mouthGroup.add(cavityMesh);

  // Tongue
  const tongueGeom = new THREE.SphereGeometry(0.1, 32, 32);
  const tongueMesh = new THREE.Mesh(
    tongueGeom,
    new THREE.MeshStandardMaterial({
      color: 0xe46a7a,
      roughness: 0.4,
    })
  );
  tongueGeom.scale(1.0, 0.6, 1.2);
  tongueMesh.position.z = -0.08;
  mouthGroup.add(tongueMesh);

  // ==================== CHEEKS ====================
  // Rosy cheeks for charm
  const cheekGeom = new THREE.SphereGeometry(0.2, 48, 48);
  const cheekL = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekL.position.set(-0.5, -0.1, 0.6);
  cheekL.scale.set(0.9, 0.7, 0.55);
  head.add(cheekL);

  const cheekR = new THREE.Mesh(cheekGeom, materials.cheek);
  cheekR.position.set(0.5, -0.1, 0.6);
  cheekR.scale.set(0.9, 0.7, 0.55);
  head.add(cheekR);

  // ==================== HAIR ====================
  const hairGroup = buildHair(hairstyle, materials);
  head.add(hairGroup);

  // ==================== EXPRESSION SYSTEM ====================
  let currentExpression: ExpressionType = 'neutral';

  const setExpression = (expr: ExpressionType) => {
    currentExpression = expr;
    updateExpression(expr);
  };

  const updateExpression = (expr: ExpressionType) => {
    switch (expr) {
      case 'smile':
        mouthMesh.geometry = createMouthGeometry('smile');
        browLeft.rotation.z = -0.3;
        browRight.rotation.z = 0.3;
        break;
      case 'surprised':
        mouthMesh.geometry = createMouthGeometry('surprised');
        browLeft.position.y = eyeOffsetY + 0.35;
        browRight.position.y = eyeOffsetY + 0.35;
        break;
      case 'angry':
        mouthMesh.geometry = createMouthGeometry('angry');
        browLeft.rotation.z = 0.4;
        browRight.rotation.z = -0.4;
        break;
      case 'sad':
        mouthMesh.geometry = createMouthGeometry('sad');
        browLeft.rotation.z = -0.5;
        browRight.rotation.z = 0.5;
        break;
      case 'laughing':
        mouthMesh.geometry = createMouthGeometry('laughing');
        break;
      case 'concerned':
        mouthMesh.geometry = createMouthGeometry('concerned');
        browLeft.rotation.z = -0.2;
        browRight.rotation.z = 0.2;
        break;
      default: // neutral
        mouthMesh.geometry = createMouthGeometry('neutral');
        browLeft.rotation.z = 0;
        browRight.rotation.z = 0;
        browLeft.position.y = eyeOffsetY + 0.26;
        browRight.position.y = eyeOffsetY + 0.26;
    }
  };

  const lookDirection = (x: number, y: number) => {
    // Clamp to reasonable range
    const maxLook = 0.3;
    x = Math.max(-maxLook, Math.min(maxLook, x));
    y = Math.max(-maxLook, Math.min(maxLook, y));

    eyeLeft.children[1].position.x = x * 0.1;
    eyeLeft.children[1].position.y = y * 0.1;
    eyeRight.children[1].position.x = x * 0.1;
    eyeRight.children[1].position.y = y * 0.1;
  };

  let blinking = false;
  const blink = () => {
    if (blinking) return;
    blinking = true;
    // Animate blink
    setTimeout(() => {
      blinking = false;
    }, 300);
  };

  return {
    root,
    head,
    parts: {
      head: headMesh,
      eyes: { left: eyeLeft, right: eyeRight },
      mouth: mouthGroup,
      eyebrows: { left: browLeft, right: browRight },
      nose: noseMesh,
      hair: hairGroup,
      cheeks: { left: cheekL, right: cheekR },
    },
    setExpression,
    lookDirection,
    blink,
  };
}

// ==================== HELPER FUNCTIONS ====================

function createMouthGeometry(type: string = 'neutral'): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];

  switch (type) {
    case 'smile':
      // Curved smile
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = (t - 0.5) * 0.32;
        const y = Math.sin(t * Math.PI) * 0.08 - 0.02;
        points.push(new THREE.Vector2(x, y));
      }
      break;
    case 'surprised':
      // Wide open O shape
      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const x = Math.cos(angle) * 0.12;
        const y = Math.sin(angle) * 0.15;
        points.push(new THREE.Vector2(x, y));
      }
      break;
    case 'angry':
      // Downward curve
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = (t - 0.5) * 0.32;
        const y = -Math.sin(t * Math.PI) * 0.1;
        points.push(new THREE.Vector2(x, y));
      }
      break;
    case 'sad':
      // Downward sad mouth
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = (t - 0.5) * 0.3;
        const y = -Math.sin(t * Math.PI) * 0.12 + 0.05;
        points.push(new THREE.Vector2(x, y));
      }
      break;
    case 'laughing':
      // Big laugh
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = (t - 0.5) * 0.35;
        const y = Math.sin(t * Math.PI) * 0.12 - 0.01;
        points.push(new THREE.Vector2(x, y));
      }
      break;
    case 'concerned':
      // Worried mouth
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = (t - 0.5) * 0.28;
        const y = Math.sin(t * Math.PI * 2) * 0.05 - 0.03;
        points.push(new THREE.Vector2(x, y));
      }
      break;
    default: // neutral
      // Closed calm mouth
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const x = (t - 0.5) * 0.28;
        const y = Math.sin(t * Math.PI) * 0.03;
        points.push(new THREE.Vector2(x, y));
      }
  }

  const geometry = new THREE.LatheGeometry(points, 32, 0, Math.PI);
  return geometry;
}

function buildHair(style: string, materials: any): THREE.Group {
  const hairGroup = new THREE.Group();

  const hairMat = materials.hair;

  switch (style) {
    case 'short':
      // Short spiky hair
      const capGeom = new THREE.SphereGeometry(1.0, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.4);
      const cap = new THREE.Mesh(capGeom, hairMat);
      cap.position.y = 0.08;
      hairGroup.add(cap);

      // Add spiky details
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const spikeGeom = new THREE.ConeGeometry(0.12, 0.4, 16);
        const spike = new THREE.Mesh(spikeGeom, hairMat);
        spike.position.x = Math.cos(angle) * 0.95;
        spike.position.z = Math.sin(angle) * 0.95;
        spike.position.y = 0.7;
        spike.rotation.z = angle;
        hairGroup.add(spike);
      }
      break;

    case 'long':
      // Long straight hair
      const topCapGeom = new THREE.SphereGeometry(0.98, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.35);
      const topCap = new THREE.Mesh(topCapGeom, hairMat);
      topCap.position.y = 0.05;
      hairGroup.add(topCap);

      // Long back panels
      const backGeom = new THREE.SphereGeometry(0.25, 32, 32);
      const backLeft = new THREE.Mesh(backGeom, hairMat);
      backLeft.position.set(-0.4, -0.3, -0.3);
      backLeft.scale.set(0.9, 2.0, 0.7);
      hairGroup.add(backLeft);

      const backRight = new THREE.Mesh(backGeom, hairMat);
      backRight.position.set(0.4, -0.3, -0.3);
      backRight.scale.set(0.9, 2.0, 0.7);
      hairGroup.add(backRight);

      // Front strands
      const frontGeom = new THREE.SphereGeometry(0.15, 24, 24);
      const frontLeft = new THREE.Mesh(frontGeom, hairMat);
      frontLeft.position.set(-0.65, 0.1, 0.4);
      frontLeft.scale.set(0.7, 1.5, 0.6);
      hairGroup.add(frontLeft);

      const frontRight = new THREE.Mesh(frontGeom, hairMat);
      frontRight.position.set(0.65, 0.1, 0.4);
      frontRight.scale.set(0.7, 1.5, 0.6);
      hairGroup.add(frontRight);
      break;

    case 'curly':
      // Curly/wavy hair
      const curlCapGeom = new THREE.SphereGeometry(1.05, 64, 64);
      const curlCap = new THREE.Mesh(curlCapGeom, hairMat);
      hairGroup.add(curlCap);

      // Add curl bumps
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const y = -1 + (i / 20) * 2;
        const curlGeom = new THREE.SphereGeometry(0.18, 20, 20);
        const curl = new THREE.Mesh(curlGeom, hairMat);
        curl.position.x = Math.cos(angle) * 1.1;
        curl.position.y = y * 0.8;
        curl.position.z = Math.sin(angle) * 1.1;
        hairGroup.add(curl);
      }
      break;

    case 'bob':
      // Bob haircut
      const bobCapGeom = new THREE.SphereGeometry(0.97, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.45);
      const bobCap = new THREE.Mesh(bobCapGeom, hairMat);
      bobCap.position.y = 0.05;
      hairGroup.add(bobCap);

      // Side panels for bob
      const sideGeom = new THREE.SphereGeometry(0.22, 32, 32);
      const sideLeft = new THREE.Mesh(sideGeom, hairMat);
      sideLeft.position.set(-0.6, -0.15, 0.1);
      sideLeft.scale.set(0.8, 0.9, 0.7);
      hairGroup.add(sideLeft);

      const sideRight = new THREE.Mesh(sideGeom, hairMat);
      sideRight.position.set(0.6, -0.15, 0.1);
      sideRight.scale.set(0.8, 0.9, 0.7);
      hairGroup.add(sideRight);
      break;

    case 'spiky':
      // Spiky punk hair
      const spikyCapGeom = new THREE.SphereGeometry(0.95, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.35);
      const spikyCap = new THREE.Mesh(spikyCapGeom, hairMat);
      spikyCap.position.y = 0.1;
      hairGroup.add(spikyCap);

      // Large spikes
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spikeGeom = new THREE.ConeGeometry(0.15, 0.6, 20);
        const spike = new THREE.Mesh(spikeGeom, hairMat);
        spike.position.x = Math.cos(angle) * 0.8;
        spike.position.z = Math.sin(angle) * 0.8;
        spike.position.y = 0.8;
        spike.rotation.z = angle;
        hairGroup.add(spike);
      }
      break;
  }

  return hairGroup;
}
