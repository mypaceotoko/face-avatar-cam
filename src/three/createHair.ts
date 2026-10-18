import * as THREE from "three";
import type { AvatarSettings } from "../avatar/settings";
import { surface } from "./sculptGeometry";

/** Closed sculpted ribbons follow combing curves. No texture alpha, strand
 * transparency, physics simulation or external assets. */
export function createHair(s: AvatarSettings, material: THREE.Material) {
  const hair = new THREE.Group();
  const length =
    s.hairstyle === "long" ? 1.5 : s.hairstyle === "short" ? 0.55 : 1.04;
  function tinted(g: THREE.BufferGeometry, seed: number) {
    const uv = g.getAttribute("uv"),
      colors = [];
    for (let i = 0; i < uv.count; i++) {
      const v =
        0.91 +
        0.09 * Math.sin(uv.getX(i) * Math.PI) +
        0.028 * Math.sin(uv.getX(i) * 27 + seed);
      colors.push(v, v * 0.98, v * 0.96);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }
  // Continuous crown, with a deliberate hairline above the brows.
  const cap = surface(96, 24, (u, v) => {
    const theta = u * Math.PI * 2;
    const front = Math.max(0, Math.cos(theta));
    const phi = v * (1.65 - 0.65 * front ** 4);
    const r = 1 + 0.008 * Math.cos(theta * 24) * Math.sin(phi);
    return new THREE.Vector3(
      0.86 * s.faceWidth * Math.sin(phi) * Math.sin(theta) * r,
      1.1 * Math.cos(phi) + 0.025,
      0.75 * Math.sin(phi) * Math.cos(theta) * r,
    );
  });
  hair.add(new THREE.Mesh(tinted(cap, 0), material));
  // Back and side curtain. Curves bend inward at the bob's ends.
  for (let i = 0; i < 18; i++) {
    const theta = 0.83 + ((Math.PI * 2 - 1.66) * (i + 0.5)) / 18;
    const half = ((Math.PI * 2 - 1.66) / 18) * 0.56;
    const g = surface(10, 24, (u, v) => {
      const a = theta + (u * 2 - 1) * half;
      const phi = 0.55 + Math.min(v / 0.45, 1) * 0.95;
      const radius =
        Math.sin(phi) * (1 - 0.09 * Math.max(0, (v - 0.75) / 0.25)) +
        0.025 * Math.sin(u * Math.PI);
      const x = 0.89 * s.faceWidth * radius * Math.sin(a);
      const y =
        v < 0.45 ? 1.11 * Math.cos(phi) : 0.08 - ((v - 0.45) / 0.55) * length;
      const z = 0.77 * radius * Math.cos(a) - 0.025;
      return new THREE.Vector3(
        x,
        y + 0.035 * Math.cos(u * Math.PI * 2) * v ** 8,
        z,
      );
    });
    hair.add(new THREE.Mesh(tinted(g, i), material));
  }
  // Solid swept fringe: oval cross sections, roots buried in the crown and
  // rounded ends. This avoids the floating paper edges of open ribbons.
  for (let i = 0; i < 7; i++) {
    const center = (i - 3) * 0.18;
    const endY = 0.46 + 0.04 * Math.cos(i * 1.3);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(center * 0.5, 0.98 - 0.11 * (center / 0.6) ** 2, 0.3),
      new THREE.Vector3(center * 0.78, 0.86, 0.48 - 0.11 * (center / 0.6) ** 2),
      new THREE.Vector3(center, 0.64, 0.65 - 0.16 * (center / 0.6) ** 2),
      new THREE.Vector3(center * 1.02, endY, 0.66 - 0.19 * (center / 0.6) ** 2),
    ]);
    const g = surface(20, 28, (u, v) => {
      const p = curve.getPoint(v),
        a = u * Math.PI * 2;
      const rounded =
        v > 0.95 ? Math.sqrt(Math.max(0, 1 - ((v - 0.95) / 0.05) ** 2)) : 1;
      const width =
        0.115 * (0.72 + 0.28 * Math.sin((v * Math.PI) / 2)) * rounded;
      p.x += Math.cos(a) * width;
      p.z += Math.sin(a) * 0.02 * rounded;
      p.x *= s.faceWidth;
      return p;
    });
    hair.add(new THREE.Mesh(tinted(g, i + 20), material));
  }
  // Surface patches are deliberately double sided at the thin ends.
  material.side = THREE.DoubleSide;
  return hair;
}
