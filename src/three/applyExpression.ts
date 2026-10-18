import * as THREE from "three";
import type { BlendshapeMap } from "../face/types";
import type { AvatarRig } from "./createAvatar";
const matrix = new THREE.Matrix4(),
  position = new THREE.Vector3(),
  rotation = new THREE.Quaternion(),
  scale = new THREE.Vector3();
export function applyHeadPose(
  rig: AvatarRig,
  data: Float32Array,
  alpha = 0.4,
  translate = true,
) {
  matrix.fromArray(data).decompose(position, rotation, scale);
  if (translate) rig.root.position.lerp(position, alpha);
  rig.root.quaternion.slerp(rotation, alpha);
}
export function applyExpression(rig: AvatarRig, bs: BlendshapeMap) {
  const open = Math.max(0, bs.jawOpen * (1 - bs.mouthClose));
  const smileL = bs.mouthSmileLeft,
    smileR = bs.mouthSmileRight;
  const pucker = Math.max(bs.mouthPucker, bs.mouthFunnel * 0.7);
  const sad = (bs.mouthFrownLeft + bs.mouthFrownRight) * 0.5;
  const weights = [
    open,
    smileL * (1 - pucker),
    smileR * (1 - pucker),
    pucker,
    sad,
    bs.cheekPuff,
  ];
  rig.morphMeshes.forEach((mesh) =>
    weights.forEach((w, i) => {
      mesh.morphTargetInfluences![i] = w;
    }),
  );
  rig.parts.teeth.visible = open > 0.1;
  rig.parts.tongue.visible = open > 0.3;
  rig.parts.tongue.position.set(
    0,
    -0.405 - open * 0.19,
    0.66 + bs.tongueOut * 0.1,
  );
  const blinkL = Math.min(
    1,
    bs.eyeBlinkLeft + 0.35 * bs.eyeSquintLeft + 0.16 * smileL,
  );
  const blinkR = Math.min(
    1,
    bs.eyeBlinkRight + 0.35 * bs.eyeSquintRight + 0.16 * smileR,
  );
  rig.parts.eyes[0].update(
    blinkL,
    bs.eyeWideLeft,
    bs.eyeLookInLeft - bs.eyeLookOutLeft,
    bs.eyeLookUpLeft - bs.eyeLookDownLeft,
  );
  rig.parts.eyes[1].update(
    blinkR,
    bs.eyeWideRight,
    bs.eyeLookOutRight - bs.eyeLookInRight,
    bs.eyeLookUpRight - bs.eyeLookDownRight,
  );
  rig.parts.brows.forEach((b, i) => {
    const side = i === 0 ? -1 : 1,
      down = i === 0 ? bs.browDownLeft : bs.browDownRight,
      up = i === 0 ? bs.browOuterUpLeft : bs.browOuterUpRight;
    b.position.y = 0.38 + bs.browInnerUp * 0.065 + up * 0.055 - down * 0.055;
    b.rotation.z = side * (down * 0.28 - bs.browInnerUp * 0.27 + up * 0.12);
  });
}
