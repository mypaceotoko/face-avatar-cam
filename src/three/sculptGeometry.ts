import * as THREE from "three";
import type { AvatarSettings } from "../avatar/settings";

export type SculptExpression = {
  open: number;
  smileL: number;
  smileR: number;
  pucker: number;
  sad: number;
  puff: number;
};
export const NEUTRAL: SculptExpression = {
  open: 0,
  smileL: 0,
  smileR: 0,
  pucker: 0,
  sad: 0,
  puff: 0,
};
export const MORPHS = [
  "open",
  "smileL",
  "smileR",
  "pucker",
  "sad",
  "puff",
] as const;
const gauss = (x: number, y: number, sx: number, sy: number) =>
  Math.exp(-((x / sx) ** 2 + (y / sy) ** 2));
export function faceWidth(y: number, s: AvatarSettings) {
  return 0.8 * s.faceWidth * (1 - (0.17 + 0.1 * (1 - s.jaw)) * Math.max(0, -y));
}
/** An anatomical height field: continuous nose bridge/alar wings, sockets,
 * malar fat pads, muzzle and chin. The back is a separate matching hemisphere. */
export function faceDepth(x: number, y: number, s: AvatarSettings) {
  const radial = Math.max(
    0,
    1 - (x / faceWidth(y, s)) ** 2 - (y / (y < 0 ? 0.88 : 1.04)) ** 2,
  );
  let z = 0.67 * Math.sqrt(radial);
  z += 0.065 * gauss(Math.abs(x) - 0.42, y + 0.16, 0.24, 0.24); // cheek
  z -= 0.025 * gauss(Math.abs(x) - 0.3, y - 0.17, 0.23, 0.19); // orbit
  z += 0.055 * gauss(x, y + 0.38, 0.32, 0.19); // muzzle
  z += 0.045 * gauss(x, y + 0.72, 0.25, 0.18); // chin
  const n = 0.8 + s.nose * 0.4;
  z +=
    n *
    (0.075 * gauss(x, y - 0.03, 0.095, 0.28) +
      0.13 * gauss(x, y + 0.115, 0.12, 0.095) +
      0.04 * gauss(Math.abs(x) - 0.1, y + 0.14, 0.065, 0.06));
  return z;
}
export function mouthPoint(t: number, s: AvatarSettings, e: SculptExpression) {
  const c = Math.cos(t),
    sn = Math.sin(t);
  const smile = c < 0 ? e.smileL : e.smileR;
  const width = 0.225 * (1 + 0.2 * smile - 0.42 * e.pucker);
  const x = width * c;
  const arch = (0.012 + 0.09 * smile - 0.065 * e.sad) * c * c;
  const cupid =
    sn > 0 ? 0.009 * Math.exp(-(((Math.abs(c) - 0.3) / 0.22) ** 2)) : 0;
  const y =
    -0.375 +
    arch +
    (0.003 + 0.025 * e.pucker) * sn +
    (sn < 0 ? 0.255 : 0.025) * e.open * sn +
    cupid;
  const z = faceDepth(x, y + e.open * 0.1, s) + 0.028 + 0.075 * e.pucker;
  return new THREE.Vector3(x, y, z);
}
/** Consistent UV grid, winding and morph-normal generation shared by face/lips/hair. */
export function surface(
  nu: number,
  nv: number,
  sample: (u: number, v: number) => THREE.Vector3,
) {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      positions.push(...sample(i / nu, j / nv).toArray());
      uv.push(i / nu, j / nv);
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i,
        b = a + nu + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  smoothSeams(g, nu, nv);
  return g;
}
/** Weld shading (not topology) along periodic seams and collapsed poles. */
export function smoothSeams(g: THREE.BufferGeometry, nu: number, nv: number) {
  const p = g.getAttribute("position"),
    n = g.getAttribute("normal");
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    normal = new THREE.Vector3();
  for (let row = 0; row <= nv; row++) {
    const first = row * (nu + 1),
      last = first + nu;
    a.fromBufferAttribute(p, first);
    b.fromBufferAttribute(p, last);
    if (a.distanceToSquared(b) > 1e-9) continue;
    let pole = true;
    for (let i = first; i <= last; i++) {
      b.fromBufferAttribute(p, i);
      if (a.distanceToSquared(b) > 1e-9) {
        pole = false;
        break;
      }
    }
    if (pole) {
      normal.set(0, 0, 0);
      for (let i = first; i <= last; i++)
        normal.add(b.fromBufferAttribute(n, i));
      normal.normalize();
      for (let i = first; i <= last; i++)
        n.setXYZ(i, normal.x, normal.y, normal.z);
    } else {
      normal
        .fromBufferAttribute(n, first)
        .add(b.fromBufferAttribute(n, last))
        .normalize();
      n.setXYZ(first, normal.x, normal.y, normal.z);
      n.setXYZ(last, normal.x, normal.y, normal.z);
    }
  }
}
export function morphSurface(
  nu: number,
  nv: number,
  sample: (u: number, v: number, e: SculptExpression) => THREE.Vector3,
) {
  const g = surface(nu, nv, (u, v) => sample(u, v, NEUTRAL));
  g.morphAttributes.position = [];
  g.morphAttributes.normal = [];
  for (const key of MORPHS) {
    const target = surface(nu, nv, (u, v) =>
      sample(u, v, { ...NEUTRAL, [key]: 1 }),
    );
    g.morphAttributes.position.push(target.getAttribute("position"));
    g.morphAttributes.normal.push(target.getAttribute("normal"));
    target.dispose();
  }
  return g;
}
export function skinTint(g: THREE.BufferGeometry) {
  const p = g.getAttribute("position"),
    colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const blush =
      0.23 * gauss(Math.abs(p.getX(i)) - 0.43, p.getY(i) + 0.16, 0.2, 0.18) +
      0.1 * gauss(p.getX(i), p.getY(i) + 0.12, 0.12, 0.1);
    colors.push(1, 1 - blush, 1 - blush * 0.85);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}
export function createFace(s: AvatarSettings) {
  return skinTint(
    morphSurface(96, 64, (u, v, e) => {
      v = Math.sin((v * Math.PI) / 2);
      const t = u * Math.PI * 2;
      const outerY = (Math.sin(t) < 0 ? 0.88 : 1.04) * Math.sin(t);
      const outerX = faceWidth(outerY, s) * Math.cos(t);
      const inner = mouthPoint(t, s, e);
      // Rings concentrate around the lips, then spread evenly over the face.
      const x = THREE.MathUtils.lerp(inner.x, outerX, v);
      let y = THREE.MathUtils.lerp(inner.y, outerY, v);
      y -= e.open * 0.045 * Math.max(0, -outerY) * (1 - v);
      let z = faceDepth(x, y + e.open * 0.08 * (1 - v), s);
      z +=
        (inner.z - faceDepth(inner.x, inner.y + e.open * 0.08, s)) *
        (1 - v) ** 5;
      z += 0.04 * e.puff * gauss(Math.abs(x) - 0.42, y + 0.16, 0.23, 0.2);
      y +=
        0.035 *
        (x < 0 ? e.smileL : e.smileR) *
        gauss(Math.abs(x) - 0.38, y + 0.18, 0.27, 0.25);
      return new THREE.Vector3(x, y, z);
    }),
  );
}
export function createLips(s: AvatarSettings) {
  return morphSurface(96, 8, (u, v, e) => {
    const t = u * Math.PI * 2,
      p = mouthPoint(t, s, e);
    const thickness =
      (0.024 + s.lips * 0.022) * (Math.abs(Math.sin(t)) * 0.75 + 0.25);
    p.x += Math.cos(t) * thickness * v;
    p.y += Math.sin(t) * thickness * v;
    p.z += 0.006 + Math.sin(v * Math.PI) * (0.022 + s.lips * 0.014) - v * 0.012;
    return p;
  });
}
