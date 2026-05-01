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
  rig.root.position.lerp(_pos, poseLerp);
  _slerpQ.copy(rig.root.quaternion).slerp(_quat, poseLerp);
  rig.root.quaternion.copy(_slerpQ);
}

/** Map smoothed blendshapes onto the avatar rig handles. Mouth amplitude is
 *  intentionally exaggerated compared to the raw blendshapes so the lip-sync
 *  reads clearly on a small phone screen. */
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

  // Effective jaw open: jawOpen + funnel/stretch contribute a little so vowels
  // like "oo" / "ee" still split the lips visibly even when jawOpen is small.
  const jawDrop = Math.min(1, open + funnel * 0.25 + lowerDown * 0.2);

  // Jaw pivot — drops the lower face by up to ~22°, which is the difference
  // between a Memoji that "talks" vs. one that just stretches its mouth.
  rig.parts.jaw.rotation.x = d.jawRotation.x - jawDrop * 0.38;

  // Mouth cavity opens dramatically with jaw; widens on stretch (laughing),
  // narrows on pucker (kissing). Doubled vs. the original so the dark interior
  // is unambiguously visible during speech.
  rig.parts.mouthCavity.scale.set(
    d.mouthCavityScale.x * (1 - 0.4 * pucker + 0.3 * stretch + 0.2 * smile),
    d.mouthCavityScale.y + jawDrop * 2.4 + lowerDown * 0.3,
    d.mouthCavityScale.z * (1 + 0.3 * pucker + 0.15 * funnel),
  );

  // Upper lip: rises slightly on jaw open + upperUp; widens on smile/stretch.
  rig.parts.lipUpper.position.set(
    d.lipUpperPosition.x,
    d.lipUpperPosition.y + jawDrop * 0.04 + upperUp * 0.05,
    d.lipUpperPosition.z,
  );
  rig.parts.lipUpper.scale.set(
    d.lipUpperScale.x * (1 - 0.4 * pucker + 0.35 * smile + 0.25 * stretch - 0.1 * frown),
    d.lipUpperScale.y * (1 + 0.15 * upperUp - 0.2 * close),
    d.lipUpperScale.z * (1 + 0.25 * pucker + 0.15 * funnel),
  );
  rig.parts.lipUpper.rotation.set(
    d.lipUpperRotation.x,
    d.lipUpperRotation.y,
    d.lipUpperRotation.z + (smileL - smileR) * 0.08,
  );

  // Lower lip: drops with jaw and lowerDown — this is the main lip-sync motion.
  rig.parts.lipLower.position.set(
    d.lipLowerPosition.x,
    d.lipLowerPosition.y - jawDrop * 0.32 - lowerDown * 0.1,
    d.lipLowerPosition.z,
  );
  rig.parts.lipLower.scale.set(
    d.lipLowerScale.x * (1 - 0.4 * pucker + 0.35 * smile + 0.25 * stretch - 0.1 * frown),
    d.lipLowerScale.y * (1 + 0.4 * jawDrop + 0.2 * lowerDown - 0.25 * close),
    d.lipLowerScale.z * (1 + 0.25 * pucker + 0.15 * funnel),
  );
  rig.parts.lipLower.rotation.set(
    d.lipLowerRotation.x,
    d.lipLowerRotation.y,
    d.lipLowerRotation.z + (frownR - frownL) * 0.08,
  );

  // Teeth follow the jaw drop a touch so they ride with the lower lip.
  rig.parts.teethUpper.position.set(
    d.teethUpperPosition.x,
    d.teethUpperPosition.y - jawDrop * 0.02,
    d.teethUpperPosition.z,
  );
  rig.parts.teethLower.position.set(
    d.teethLowerPosition.x,
    d.teethLowerPosition.y - jawDrop * 0.18,
    d.teethLowerPosition.z,
  );

  // Mouth group: corners ride up with smile, droop with frown; horizontal
  // shift for asymmetric mouthLeft/mouthRight.
  rig.parts.mouthGroup.position.set(
    d.mouthGroup.position.x + mouthShiftX,
    d.mouthGroup.position.y + 0.04 * smile - 0.05 * frown,
    d.mouthGroup.position.z + 0.01 * pucker,
  );

  // Tongue: hidden behind the lips at rest, slides forward + down when out.
  // Only visible when the mouth is also open so it doesn't poke through the lips.
  const tongueOut = bs.tongueOut * Math.min(1, jawDrop * 1.5 + 0.2);
  rig.parts.tongue.position.set(
    d.tonguePosition.x,
    d.tonguePosition.y - 0.04 * tongueOut - jawDrop * 0.05,
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

  // Lower lid: rises modestly on squint to give a real squint silhouette.
  const lowerLidL = Math.min(1, bs.eyeSquintLeft * 0.85 + bs.cheekSquintLeft * 0.6);
  const lowerLidR = Math.min(1, bs.eyeSquintRight * 0.85 + bs.cheekSquintRight * 0.6);
  rig.parts.lidLeftLower.scale.y =
    d.lidLowerLeftScale.y + (0.55 - d.lidLowerLeftScale.y) * lowerLidL;
  rig.parts.lidRightLower.scale.y =
    d.lidLowerRightScale.y + (0.55 - d.lidLowerRightScale.y) * lowerLidR;

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
  const leftYaw = (bs.eyeLookOutLeft - bs.eyeLookInLeft) * 0.35;
  const rightYaw = (bs.eyeLookInRight - bs.eyeLookOutRight) * 0.35;
  const leftPitch = (bs.eyeLookDownLeft - bs.eyeLookUpLeft) * 0.3;
  const rightPitch = (bs.eyeLookDownRight - bs.eyeLookUpRight) * 0.3;
  rig.parts.irisLeft.rotation.set(leftPitch, leftYaw, 0);
  rig.parts.irisRight.rotation.set(rightPitch, rightYaw, 0);

  // Brows -------------------------------------------------------------------
  const angerL = bs.browDownLeft + sneer * 0.4;
  const angerR = bs.browDownRight + sneer * 0.4;
  const browLY =
    bs.browOuterUpLeft * 0.05 + bs.browInnerUp * 0.04 - angerL * 0.05 - frownL * 0.015;
  const browRY =
    bs.browOuterUpRight * 0.05 + bs.browInnerUp * 0.04 - angerR * 0.05 - frownR * 0.015;
  const browLX = -angerL * 0.04 + bs.browInnerUp * 0.015 * -1;
  const browRX = angerR * 0.04 + bs.browInnerUp * 0.015;
  rig.parts.browLeft.position.set(
    d.browLeft.position.x + browLX,
    d.browLeft.position.y + browLY,
    d.browLeft.position.z,
  );
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
    0.95 * (1 - sneer * 0.06),
    1.05 * (1 - sneer * 0.1),
    0.85 * (1 + sneer * 0.05),
  );
}
