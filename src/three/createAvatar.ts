import * as THREE from "three";
import { DEFAULT_SETTINGS, type AvatarSettings } from "../avatar/settings";
import { createAvatarMaterials } from "./avatarMaterials";
import {
  createFace,
  createLips,
  faceWidth,
  faceDepth,
  morphSurface,
  mouthPoint,
  surface,
  MORPHS,
} from "./sculptGeometry";
import { createEye } from "./createEyes";
import { createHair } from "./createHair";

/** All geometry is authored here in local head units, +Z forward, +Y up.
 * Face/lips/cavity share a six-channel GPU morph rig; lids have shared boundaries. */
export function createAvatar(settings: AvatarSettings = DEFAULT_SETTINGS) {
  const materials = createAvatarMaterials(settings);
  const root = new THREE.Group(),
    head = new THREE.Group();
  root.add(head);
  root.name = "avatarRoot";
  head.name = "avatarHead";
  const skull = new THREE.Mesh(createFace(settings), materials.skin);
  head.add(skull);
  const back = new THREE.Mesh(
    surface(64, 32, (u, v) => {
      const t = u * Math.PI * 2,
        phi = (v * Math.PI) / 2,
        y = (Math.sin(t) < 0 ? 0.88 : 1.04) * Math.sin(t) * Math.sin(phi);
      return new THREE.Vector3(
        faceWidth(y, settings) * Math.cos(t) * Math.sin(phi),
        y,
        -0.68 * Math.cos(phi),
      );
    }),
    materials.skinPlain,
  );
  // The hemisphere is parameterized from back pole to the shared front silhouette.
  back.material.side = THREE.DoubleSide;
  head.add(back);
  const lips = new THREE.Mesh(createLips(settings), materials.lip);
  head.add(lips);
  const cavity = new THREE.Mesh(
    morphSurface(96, 8, (u, v, e) => {
      const p = mouthPoint(u * Math.PI * 2, settings, e);
      p.x *= 1 - v;
      p.y = THREE.MathUtils.lerp(p.y, -0.4 - e.open * 0.1, v);
      p.z -= 0.01 + 0.22 * Math.sin((v * Math.PI) / 2);
      return p;
    }),
    materials.mouth,
  );
  head.add(cavity);
  const teeth = new THREE.Mesh(
    morphSurface(40, 4, (u, v, e) => {
      const t = Math.acos((u * 2 - 1) * 0.91),
        p = mouthPoint(t, settings, e);
      p.y -= 0.004 + v * 0.065 * (1 - 0.2 * (u * 2 - 1) ** 2);
      p.z -= 0.018 + v * 0.008;
      return p;
    }),
    materials.teeth,
  );
  teeth.material.side = THREE.DoubleSide;
  head.add(teeth);
  const tongue = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12),
    materials.tongue,
  );
  tongue.scale.set(0.12, 0.025, 0.06);
  head.add(tongue);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      materials.skinPlain,
    );
    ear.position.set(side * 0.77 * settings.faceWidth, -0.015, 0.025);
    ear.scale.set(0.105, 0.19, 0.095);
    head.add(ear);
    const inset = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 12),
      materials.lip,
    );
    inset.position
      .copy(ear.position)
      .add(new THREE.Vector3(side * 0.025, 0, 0.072));
    inset.scale.set(0.047, 0.105, 0.025);
    head.add(inset);
    // Subtle nostril shadows, placed under the continuous nose, not separate spheres.
    const nostril = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 8),
      materials.nostril,
    );
    const x = side * 0.075;
    nostril.position.set(x, -0.164, faceDepth(x, -0.164, settings) + 0.002);
    nostril.scale.set(0.024, 0.01, 0.006);
    head.add(nostril);
  }
  const eyes = [
    createEye(-1, settings, materials.skinPlain, materials.brow),
    createEye(1, settings, materials.skinPlain, materials.brow),
  ] as const;
  eyes.forEach((e) => head.add(e.group));
  const brows = ([-1, 1] as const).map((side) => {
    const g = surface(32, 6, (u, v) => {
      const x = (u * 2 - 1) * 0.205;
      const y =
        0.018 +
        Math.sin(u * Math.PI) * (0.026 + 0.055 * settings.browArch) +
        (v - 0.5) * 0.035 * Math.sin(Math.PI * (0.08 + 0.84 * u));
      return new THREE.Vector3(
        x,
        y,
        faceDepth(x + side * 0.305 * settings.faceWidth, y + 0.38, settings) +
          0.012 +
          0.006 * Math.sin(v * Math.PI),
      );
    });
    const b = new THREE.Mesh(g, materials.brow);
    b.material.side = THREE.DoubleSide;
    b.position.set(side * 0.305 * settings.faceWidth, 0.38, 0);
    head.add(b);
    return b;
  });
  const hair = createHair(settings, materials.hair);
  head.add(hair);
  const morphMeshes = [skull, lips, cavity, teeth];
  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    head.traverse((o) => {
      if (o instanceof THREE.Mesh) geometries.add(o.geometry);
    });
    geometries.forEach((g) => g.dispose());
    eyes.forEach((e) => e.material.dispose());
    materials.dispose();
  };
  return {
    root,
    head,
    settings,
    materials,
    parts: { skull, lips, cavity, teeth, tongue, hair, eyes, brows },
    morphMeshes,
    morphNames: MORPHS,
    dispose,
  };
}
export type AvatarRig = ReturnType<typeof createAvatar>;
