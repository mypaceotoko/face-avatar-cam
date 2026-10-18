import * as THREE from "three";
import type { AvatarSettings } from "../avatar/settings";
import { faceDepth, surface, smoothSeams } from "./sculptGeometry";

/** Curved ocular surface with a procedural radial iris. The aperture and both
 * lids share their boundary vertices, so a blink cannot expose a separate globe. */
export function createEye(
  side: -1 | 1,
  s: AvatarSettings,
  skin: THREE.Material,
  browMaterial: THREE.Material,
) {
  const group = new THREE.Group();
  const cx = side * 0.305 * s.faceWidth,
    cy = 0.17;
  group.position.set(cx, cy, 0);
  const w = 0.205 * s.eyeSize,
    h = (0.125 + 0.025 * s.eyeShape) * s.eyeSize;
  const gaze = { value: new THREE.Vector2() };
  const irisColor = { value: new THREE.Color(s.iris) };
  const material = new THREE.MeshStandardMaterial({
    color: "#fff7ee",
    roughness: 0.58,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.gaze = gaze;
    shader.uniforms.irisColor = irisColor;
    shader.vertexShader =
      "varying vec2 eyePoint;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\neyePoint = position.xy;",
      );
    shader.fragmentShader =
      "varying vec2 eyePoint; uniform vec2 gaze; uniform vec3 irisColor;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      vec2 p = (eyePoint - gaze) / ${(0.118 * s.eyeSize).toFixed(5)};
      float r = length(p); float a = atan(p.y,p.x);
      float fibers = sin(a*49.0 + sin(a*17.0)*2.0 + r*22.0)*.07 + sin(a*93.0-r*18.0)*.04;
      vec3 iris = irisColor*(.85 + fibers + .27*sin(r*3.14));
      iris = mix(iris,iris*vec3(1.35,1.1,.7),1.0-smoothstep(.32,.65,r));
      iris *= 1.0-.65*smoothstep(.82,1.0,r);
      iris = mix(vec3(.009,.006,.009),iris,smoothstep(.44,.49,r));
      diffuseColor.rgb = mix(diffuseColor.rgb,iris,1.0-smoothstep(.98,1.025,r));
      float catchlight = 1.0-smoothstep(.10,.16,length(p-vec2(-.30,.39)));
      catchlight += (1.0-smoothstep(.035,.075,length(p-vec2(.38,-.32))))*.8;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), clamp(catchlight,0.0,1.0));
    `,
      );
  };
  const zAt = (x: number, y: number) =>
    faceDepth(cx + x, cy + y, s) +
    0.018 +
    0.068 * Math.max(0, 1 - (x / w) ** 2 - (y / h) ** 2);
  let closure = 0;
  const edge = (t: number) => {
    const c = Math.cos(t),
      sn = Math.sin(t);
    const x = w * c;
    const tilt = side * 0.014 * c;
    const y =
      tilt + sn * h * (1 - closure) * (sn > 0 ? 1 : 0.78) - closure * 0.012;
    return new THREE.Vector3(x, y, zAt(x, y));
  };
  const whiteSample = (u: number, v: number) => {
    const p = edge(u * Math.PI * 2);
    p.x *= v;
    p.y *= v;
    p.z = zAt(p.x, p.y);
    return p;
  };
  const lidSample = (u: number, v: number) => {
    const t = u * Math.PI * 2,
      p = edge(t);
    const outerX = (w + 0.075) * Math.cos(t),
      outerY = (h + 0.065) * Math.sin(t);
    const x = THREE.MathUtils.lerp(p.x, outerX, v),
      y = THREE.MathUtils.lerp(p.y, outerY, v);
    const z =
      faceDepth(cx + x, cy + y, s) +
      0.004 +
      (p.z - faceDepth(cx + p.x, cy + p.y, s) + 0.003) * (1 - v) ** 2;
    return new THREE.Vector3(x, y, z);
  };
  const white = new THREE.Mesh(surface(64, 10, whiteSample), material);
  const lids = new THREE.Mesh(surface(64, 8, lidSample), skin);
  group.add(white, lids);
  const lashGeometry = surface(48, 4, (u, v) => {
    const t = u * Math.PI,
      p = edge(t);
    p.y += v * 0.012 * Math.sin(t);
    p.z += 0.009;
    return p;
  });
  const lash = new THREE.Mesh(lashGeometry, browMaterial);
  group.add(lash);
  function updateGeometry(
    g: THREE.BufferGeometry,
    nu: number,
    nv: number,
    fn: (u: number, v: number) => THREE.Vector3,
  ) {
    const pos = g.getAttribute("position");
    let i = 0;
    for (let j = 0; j <= nv; j++)
      for (let k = 0; k <= nu; k++) {
        const p = fn(k / nu, j / nv);
        pos.setXYZ(i++, p.x, p.y, p.z);
      }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    smoothSeams(g, nu, nv);
  }
  let previous = -1;
  return {
    group,
    material,
    update(blink: number, wide: number, x: number, y: number) {
      closure = THREE.MathUtils.clamp(
        blink - wide * 0.12 * (1 - blink),
        -0.12,
        1,
      );
      gaze.value.set(x * 0.045, y * 0.033);
      if (Math.abs(previous - closure) < 0.001) return;
      previous = closure;
      white.visible = closure < 0.995;
      updateGeometry(white.geometry, 64, 10, whiteSample);
      updateGeometry(lids.geometry, 64, 8, lidSample);
      updateGeometry(lash.geometry, 48, 4, (u, v) => {
        const t = u * Math.PI,
          p = edge(t);
        p.y += v * 0.012 * Math.sin(t);
        p.z += 0.009;
        return p;
      });
    },
  };
}
