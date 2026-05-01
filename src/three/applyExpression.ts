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
  const smileL = bs.mouthSmileLeft;
  const smileR = bs.mouthSmileRight;
  const smile = (smileL + smileR) * 0.5;
  const frownL = bs.mouthFrownLeft;
  const frownR = bs.mouthFrownRight;
  const frown = (frownL + frownR) * 0.5;
  const pucker = bs.mouthPucker;
  const funnel = bs.mouthFunnel;
  const stretch = (bs.mouthStretchLeft + bs.mouthStretchRight) * 0.5;
  const sneer = (bs.noseSneerLeft + bs.noseSneerRight) * 0.5;
  const upperUp = (bs.mouthUpperUpLeft + bs.mouthUpperUpRight) * 0.5;
  const lowerDown = (bs.mouthLowerDownLeft + bs.mouthLowerDownRight) * 0.5;
  const mouthShiftX = (bs.mouthRight - bs.mouthLeft) * 0.05;

  // Mouth cavity opens with jaw and wide stretch (laughing); narrows on pucker.
  rig.parts.mouthCavity.scale.set(
    d.mouthCavityScale.x * (1 - 0.4 * pucker + 0.3 * stretch + 0.2 * smile),
    d.mouthCavityScale.y + open * 1.2 + lowerDown * 0.25,
    d.mouthCavityScale.z * (1 + 0.3 * pucker + 0.15 * funnel),
  );

  // Outer lips: widen on smile/stretch, pinch on pucker, droop slightly on frown.
  rig.parts.lipsOuter.scale.set(
    d.lipsOuterScale.x * (1 - 0.4 * pucker + 0.35 * smile + 0.25 * stretch - 0.1 * frown),
    d.lipsOuterScale.y * (1 + 0.6 * open + 0.25 * upperUp + 0.25 * lowerDown) * (1 - 0.3 * close),
    d.lipsOuterScale.z * (1 + 0.25 * pucker + 0.15 * funnel),
  );
  // Smile rotates the torus forward at the bottom for a deeper curve; frown
  // rotates the opposite way for a downturned mouth.
  rig.parts.lipsOuter.rotation.set(
    d.lipsOuterRotation.x - smile * 0.25 + frown * 0.35,
    d.lipsOuterRotation.y,
    d.lipsOuterRotation.z + (smileL - smileR) * 0.1 + (frownR - frownL) * 0.08,
  );

  // Mouth group: corners ride up with smile, droop with frown; horizontal shift
  // for asymmetric mouthLeft/mouthRight; jaw drop pulls the whole mouth down.
  rig.parts.mouthGroup.position.set(
    d.mouthGroup.position.x + mouthShiftX,
    d.mouthGroup.position.y + 0.04 * smile - 0.05 * frown - 0.05 * open,
    d.mouthGroup.position.z + 0.01 * pucker,
  );

  // Tongue: hidden behind the lips at rest, slides forward + down when out.
  // Only visible when the mouth is also open so it doesn't poke through the lips.
  const tongueOut = bs.tongueOut * Math.min(1, open * 1.5 + 0.2);
  rig.parts.tongue.position.set(
    d.tonguePosition.x,
    d.tonguePosition.y - 0.04 * tongueOut,
    d.tonguePosition.z + 0.18 * tongueOut,
  );
  rig.parts.tongue.scale.set(
    d.tongueScale.x * (1 + 0.1 * tongueOut),
    d.tongueScale.y * (1 + 0.5 * tongueOut),
    d.tongueScale.z * (1 + 0.4 * tongueOut),
  );

  // Eyelids (blink + squint) -----------------------------------------------
  // scale.y = 1 fully covers the eye; 0.05 stays out of the way at rest.
  // Squint and cheekSquint also pull the lid down (laugh/cry tighten the eye).
  const squintExtraL = bs.eyeSquintLeft * 0.5 + bs.cheekSquintLeft * 0.4;
  const squintExtraR = bs.eyeSquintRight * 0.5 + bs.cheekSquintRight * 0.4;
  const lidL = Math.min(1, bs.eyeBlinkLeft + squintExtraL);
  const lidR = Math.min(1, bs.eyeBlinkRight + squintExtraR);
  rig.parts.lidLeftUpper.scale.y = d.lidLeftScale.y + (1.0 - d.lidLeftScale.y) * lidL;
  rig.parts.lidRightUpper.scale.y = d.lidRightScale.y + (1.0 - d.lidRightScale.y) * lidR;

  // Eye widening (surprise / fear) scales the eyeball up slightly.
  const wideL = bs.eyeWideLeft;
  const wideR = bs.eyeWideRight;
  rig.parts.eyeLeft.scale.set(
    d.eyeLeftScale.x * (1 + 0.12 * wideL),
    d.eyeLeftScale.y * (1 + 0.18 * wideL),
    d.eyeLeftScale.z,
  );
  rig.parts.eyeRight.scale.set(
    d.eyeRightScale.x * (1 + 0.12 * wideR),
    d.eyeRightScale.y * (1 + 0.18 * wideR),
    d.eyeRightScale.z,
  );

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
  // Anger: sharp inner-down. Sad/cry: inner-up + outer-down. Sneer drags the
  // inner edge further down, so we add a small extra to browDown when sneering.
  const angerL = bs.browDownLeft + sneer * 0.4;
  const angerR = bs.browDownRight + sneer * 0.4;
  const browLY =
    bs.browOuterUpLeft * 0.05 + bs.browInnerUp * 0.04 - angerL * 0.05 - frownL * 0.015;
  const browRY =
    bs.browOuterUpRight * 0.05 + bs.browInnerUp * 0.04 - angerR * 0.05 - frownR * 0.015;
  // Inner brows pinch toward centre on anger; flare outward on sad (browInnerUp).
  const browLX = -angerL * 0.04 + bs.browInnerUp * 0.015 * -1;
  const browRX = angerR * 0.04 + bs.browInnerUp * 0.015;
  rig.parts.browLeft.position.set(
    d.browLeft.position.x + browLX,
    d.browLeft.position.y + browLY,
    d.browLeft.position.z,
  );
  // Anger tilts the inner end of the brow down (positive z-rotation on the
  // left brow lifts the inner end visually; negate to drop it).
  rig.parts.browLeft.rotation.set(
    d.browLeft.rotation.x,
    d.browLeft.rotation.y,
    d.browLeft.rotation.z + bs.browOuterUpLeft * 0.18 - angerL * 0.35 + bs.browInnerUp * 0.15,
  );
  rig.parts.browRight.position.set(
    d.browRight.position.x + browRX,
    d.browRight.position.y + browRY,
    d.browRight.position.z,
  );
  rig.parts.browRight.rotation.set(
    d.browRight.rotation.x,
    d.browRight.rotation.y,
    d.browRight.rotation.z - bs.browOuterUpRight * 0.18 + angerR * 0.35 - bs.browInnerUp * 0.15,
  );

  // Nose: sneer scrunches it slightly (visual cue for anger / disgust).
  rig.parts.nose.scale.set(
    1.0 * (1 - sneer * 0.06),
    0.95 * (1 - sneer * 0.1),
    0.85 * (1 + sneer * 0.05),
  );
}
