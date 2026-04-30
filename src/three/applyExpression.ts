import * as THREE from 'three';
import type { BlendshapeMap } from '../face/types';
import type { AvatarRig } from './createAvatar';

const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _slerpQ = new THREE.Quaternion();

/** Apply head pose. Decompose so we can keep our own scale (HEAD_SCALE_CM)
 *  while taking the rotation+translation from the FaceLandmarker matrix. */
export function applyHeadPose(
  rig: AvatarRig,
  matrixData: Float32Array,
  poseLerp = 0.4,
) {
  _m.fromArray(matrixData);
  _m.decompose(_pos, _quat, _scl);
  // smooth toward target
  rig.root.position.lerp(_pos, poseLerp);
  _slerpQ.copy(rig.root.quaternion).slerp(_quat, poseLerp);
  rig.root.quaternion.copy(_slerpQ);
  // scale stays fixed (set when avatar was created)
}

/** Map smoothed blendshapes onto the avatar rig handles. */
export function applyExpression(rig: AvatarRig, bs: BlendshapeMap) {
  const d = rig.defaults;

  // Mouth ------------------------------------------------------------------
  const open = bs.jawOpen;
  const close = bs.mouthClose;
  const smile = (bs.mouthSmileLeft + bs.mouthSmileRight) * 0.5;
  const pucker = bs.mouthPucker;

  rig.parts.mouthCavity.scale.set(
    d.mouthCavityScale.x * (1 - 0.4 * pucker),
    d.mouthCavityScale.y + open * 1.0,
    d.mouthCavityScale.z * (1 + 0.3 * pucker),
  );
  rig.parts.lipsOuter.scale.set(
    d.lipsOuterScale.x * (1 - 0.35 * pucker),
    d.lipsOuterScale.y * (1 + 0.55 * open) * (1 - 0.25 * close),
    d.lipsOuterScale.z * (1 + 0.2 * pucker),
  );
  rig.parts.mouthGroup.position.set(
    d.mouthGroup.position.x,
    d.mouthGroup.position.y + 0.025 * smile,
    d.mouthGroup.position.z,
  );

  // Eyelids (blink) ---------------------------------------------------------
  // scale.y = 1 fully covers the eye; 0.05 stays out of the way at rest.
  rig.parts.lidLeftUpper.scale.y =
    d.lidLeftScale.y + (1.0 - d.lidLeftScale.y) * bs.eyeBlinkLeft;
  rig.parts.lidRightUpper.scale.y =
    d.lidRightScale.y + (1.0 - d.lidRightScale.y) * bs.eyeBlinkRight;

  // Eye gaze ----------------------------------------------------------------
  // For the LEFT eye (user's left, screen right after mirror), looking IN
  // means rotating its iris toward +x in local space; with our mirror group
  // that maps correctly because the mirror only flips visuals, not local axes.
  const leftYaw = (bs.eyeLookOutLeft - bs.eyeLookInLeft) * 0.35;
  const rightYaw = (bs.eyeLookInRight - bs.eyeLookOutRight) * 0.35;
  const leftPitch = (bs.eyeLookDownLeft - bs.eyeLookUpLeft) * 0.3;
  const rightPitch = (bs.eyeLookDownRight - bs.eyeLookUpRight) * 0.3;
  rig.parts.irisLeft.rotation.set(leftPitch, leftYaw, 0);
  rig.parts.irisRight.rotation.set(rightPitch, rightYaw, 0);

  // Brows -------------------------------------------------------------------
  const browLY = bs.browOuterUpLeft * 0.04 + bs.browInnerUp * 0.025 - bs.browDownLeft * 0.03;
  const browRY = bs.browOuterUpRight * 0.04 + bs.browInnerUp * 0.025 - bs.browDownRight * 0.03;
  rig.parts.browLeft.position.set(
    d.browLeft.position.x,
    d.browLeft.position.y + browLY,
    d.browLeft.position.z,
  );
  rig.parts.browLeft.rotation.set(
    d.browLeft.rotation.x,
    d.browLeft.rotation.y,
    d.browLeft.rotation.z + bs.browOuterUpLeft * 0.15,
  );
  rig.parts.browRight.position.set(
    d.browRight.position.x,
    d.browRight.position.y + browRY,
    d.browRight.position.z,
  );
  rig.parts.browRight.rotation.set(
    d.browRight.rotation.x,
    d.browRight.rotation.y,
    d.browRight.rotation.z - bs.browOuterUpRight * 0.15,
  );
}
