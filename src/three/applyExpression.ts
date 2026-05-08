import * as THREE from 'three';
import type { ExpressionState } from '../face/types';
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
  poseLerp = 0.55,
) {
  _m.fromArray(matrixData);
  _m.decompose(_pos, _quat, _scl);
  rig.root.position.lerp(_pos, poseLerp);
  _slerpQ.copy(rig.root.quaternion).slerp(_quat, poseLerp);
  rig.root.quaternion.copy(_slerpQ);
}

/**
 * Map an ExpressionState onto the avatar rig handles.
 *
 * Magnitudes here are *deliberately large*. MediaPipe blendshapes saturate
 * around 0.4-0.55 even for fully-committed expressions, so the upstream
 * ExpressionEngine amplifies them; this function applies those amplified
 * values with stronger geometry deformation so the result reads on a phone
 * screen (e.g. lipsOuter.y can grow by 1.6x rather than the previous 0.6x).
 */
export function applyExpression(rig: AvatarRig, e: ExpressionState) {
  const d = rig.defaults;
  const m = e.mouth;
  const ey = e.eyes;
  const br = e.brows;
  const ch = e.cheeks;

  // ============= Mouth =====================================================
  // Vertical opening reaches ~2.6x baseline torus height fully open.
  const open = m.open;
  const wideAdd = clamp(m.smile + m.stretch * 0.6 - m.pucker - m.funnel * 0.5, -1, 1);
  const close = clamp(m.lowerDrop * 0.0, 0, 1); // placeholder for future close drive
  const pucker = m.pucker;
  const funnel = m.funnel;
  const smileL = m.smileL;
  const smileR = m.smileR;
  const smile = m.smile;
  const frown = m.frown;
  const upperUp = m.upperRaise;
  const lowerDown = m.lowerDrop;

  // Direct read of the emotion vector so we can drive shape-level overlays
  // (▲ sad eyebrows, ▽ anger furrow, droopy mouth, jaw-clench) without going
  // through the per-channel finals. These are clamped 0..1 already.
  // Gate each emotion through a confidence threshold so low-conviction
  // classifications (jitter, MP noise) don't perma-tilt the brows. Below the
  // gate the emotion contributes nothing to the rig; above it, it ramps to 1.
  const sadE = emoGate(e.emotions.sad);
  const angryE = emoGate(e.emotions.angry);
  const confusedE = emoGate(e.emotions.confused);

  // Outer lips: WIDE on smile, NARROW on pucker, TALL on open.
  // Anger compresses horizontally (jaw clench / lips pressed together).
  // Frown rotates the corners further down — the boost from 0.45 → 0.65 makes
  // a sad mouth visibly droop instead of just flattening.
  rig.parts.lipsOuter.scale.set(
    d.lipsOuterScale.x *
      (1 + 0.60 * smile + 0.45 * m.stretch - 0.55 * pucker - 0.25 * funnel) *
      (1 - 0.18 * angryE),
    d.lipsOuterScale.y *
      (1 + 2.2 * open + 0.55 * upperUp + 0.55 * lowerDown + 0.20 * sadE) *
      (1 - 0.3 * close),
    d.lipsOuterScale.z * (1 + 0.50 * pucker + 0.28 * funnel - 0.15 * smile),
  );
  rig.parts.lipsOuter.rotation.set(
    d.lipsOuterRotation.x - smile * 0.4 + frown * 0.65 - open * 0.12 + sadE * 0.12,
    d.lipsOuterRotation.y,
    d.lipsOuterRotation.z + (smileL - smileR) * 0.18 + m.shiftX * 0.08 + confusedE * 0.10,
  );

  // Mouth cavity: raised factor (2.4→3.2) so the dark interior opens
  // dramatically — contrast between closed and open drives the lip-sync read.
  rig.parts.mouthCavity.scale.set(
    d.mouthCavityScale.x * (1 - 0.4 * pucker + 0.35 * m.stretch + 0.2 * smile),
    d.mouthCavityScale.y + open * 3.2 + lowerDown * 0.7,
    d.mouthCavityScale.z * (1 + 0.3 * pucker + 0.15 * funnel),
  );

  // Mouth group: corners up on smile, drop hard on frown/sad/anger, jaw drops
  // whole group on open. Frown drop boosted 0.07 → 0.14 + extra direct sadE
  // bias so a 泣き顔 mouth sinks visibly toward the chin.
  rig.parts.mouthGroup.position.set(
    d.mouthGroup.position.x + m.shiftX * 0.06,
    d.mouthGroup.position.y +
      0.09 * smile -
      0.14 * frown -
      0.08 * open -
      0.05 * sadE -
      0.03 * angryE,
    d.mouthGroup.position.z + 0.012 * pucker,
  );

  // Teeth: scale + fade in with mouth open. Fade-in threshold lowered so
  // teeth appear earlier to reinforce the open-mouth contrast.
  const teethVis = clamp(open * 1.8 - 0.04 + smile * 0.45, 0, 1);
  rig.parts.teeth.scale.set(
    d.teethScale.x * (1 + 0.35 * smile - 0.3 * pucker),
    d.teethScale.y * (1 + 0.7 * open),
    d.teethScale.z,
  );
  rig.parts.teeth.position.set(
    d.teethPosition.x,
    d.teethPosition.y + 0.05 * open - 0.01 * frown + 0.01 * smile,
    d.teethPosition.z,
  );
  (rig.materials.teeth as THREE.MeshStandardMaterial).opacity = teethVis;
  (rig.materials.teeth as THREE.MeshStandardMaterial).transparent = teethVis < 0.99;

  // Tongue: hidden behind lips at rest, slides forward + down when out, and
  // gets a subtle bob with speakIntensity so prolonged "aaaa" doesn't look
  // dead.
  const speakBob = Math.sin(e.timestampMs * 0.012) * 0.012 * m.speakIntensity;
  const tongueOut = clamp(m.shoutness * 0.4 + open * 0.1, 0, 1);
  rig.parts.tongue.position.set(
    d.tonguePosition.x,
    d.tonguePosition.y - 0.05 * tongueOut + speakBob,
    d.tonguePosition.z + 0.18 * tongueOut,
  );
  rig.parts.tongue.scale.set(
    d.tongueScale.x * (1 + 0.1 * tongueOut),
    d.tongueScale.y * (1 + 0.5 * tongueOut),
    d.tongueScale.z * (1 + 0.4 * tongueOut),
  );

  // ============= Eyes ======================================================
  // Blink readability: when closeU is high we BOTH (a) drop the upper lid much
  // farther than before AND (b) collapse the eyeball Y scale so the white +
  // iris visibly disappear behind the lid. Without (b) the big Memoji-sized
  // sclera kept poking out and "blink" never read on screen.
  const closeUL = clamp(ey.blinkL + ey.squintL * 0.45, 0, 1);
  const closeUR = clamp(ey.blinkR + ey.squintR * 0.45, 0, 1);

  // Upper lid travels from baseline ~0.05 all the way to 1.45 so it fully
  // overshoots the sclera's top hemisphere on a hard blink.
  rig.parts.lidLeftUpper.scale.y =
    d.lidLeftUpperScale.y + (1.45 - d.lidLeftUpperScale.y) * closeUL;
  rig.parts.lidRightUpper.scale.y =
    d.lidRightUpperScale.y + (1.45 - d.lidRightUpperScale.y) * closeUR;

  // Lower lid: pumped contribution from blink (0.3 → 0.85) and bigger Y
  // growth (0.55 → 1.05) so it meets the upper lid in the middle of the eye
  // on a full blink instead of staying hidden under the eye.
  const closeLL = clamp(ey.squintL * 0.85 + ey.blinkL * 0.85, 0, 1);
  const closeLR = clamp(ey.squintR * 0.85 + ey.blinkR * 0.85, 0, 1);
  rig.parts.lidLeftLower.scale.y = d.lidLeftLowerScale.y + 1.05 * closeLL;
  rig.parts.lidRightLower.scale.y = d.lidRightLowerScale.y + 1.05 * closeLR;
  // Pull lower lid up further (0.06 → 0.13) so it visibly rises on a blink.
  rig.parts.lidLeftLower.position.y =
    d.lidLeftLowerPosition.y + 0.13 * closeLL;
  rig.parts.lidRightLower.position.y =
    d.lidRightLowerPosition.y + 0.13 * closeLR;

  // Eye widening on surprise + COLLAPSE on blink. The blink term squeezes
  // the eyeball vertically to ~5% of normal size so the iris/pupil literally
  // vanish during a blink. This is the change that makes "目を閉じた" obvious.
  const blinkSquishL = 1 - 0.95 * ey.blinkL;
  const blinkSquishR = 1 - 0.95 * ey.blinkR;
  rig.parts.eyeLeft.scale.set(
    d.eyeLeftScale.x * (1 + 0.13 * ey.wideL),
    d.eyeLeftScale.y * (1 + 0.20 * ey.wideL) * blinkSquishL,
    d.eyeLeftScale.z,
  );
  rig.parts.eyeRight.scale.set(
    d.eyeRightScale.x * (1 + 0.13 * ey.wideR),
    d.eyeRightScale.y * (1 + 0.20 * ey.wideR) * blinkSquishR,
    d.eyeRightScale.z,
  );

  // Eye gaze. Convert lookX/lookY (-1..1) into a small euler. Add idle
  // micro-saccade drift on top so the gaze never sits perfectly still.
  const gazeX = clamp(ey.lookX, -1, 1) + e.idle.gazeDriftX * 0.6;
  const gazeY = clamp(ey.lookY, -1, 1) + e.idle.gazeDriftY * 0.6;
  // For both eyes the local +x rotates iris to the right. Mirror group flips
  // visuals so we keep the mathematical convention.
  const yaw = -gazeX * 0.45;
  const pitch = -gazeY * 0.35;
  rig.parts.irisLeft.rotation.set(pitch, yaw, 0);
  rig.parts.irisRight.rotation.set(pitch, yaw, 0);

  // ============= Brows =====================================================
  // Two readability shape overlays:
  //   sadShape  → ▲ inner-up + outer-down (sad / 困り / 泣き)
  //   angerShape → ▽ inner-down + outer-up + brows pinched together (怒)
  // They ride on top of the per-channel signals so the user's own performance
  // still shows through, but the dominant emotion guarantees a clear silhouette.
  // Important: only emotion-gated values feed in here, so jitter at neutral
  // can't synthesise a phantom ▲.
  const sadShape = clamp(sadE + br.innerUp * 0.30 + confusedE * 0.40, 0, 1);
  const angerShape = clamp(angryE + (br.downL + br.downR) * 0.35, 0, 1);

  // Vertical position: anger drops the whole brow toward the eye; sad/innerUp
  // lifts the inner end (handled by rotation) but also drops the outer slightly.
  const browSadDrop = -sadShape * 0.025;
  const browAngerDrop = -angerShape * 0.030;
  const browLY =
    br.raiseL * 0.13 +
    br.innerUp * 0.10 -
    br.downL * 0.12 -
    frown * 0.02 +
    ey.wideL * 0.05 +
    browSadDrop +
    browAngerDrop;
  const browRY =
    br.raiseR * 0.13 +
    br.innerUp * 0.10 -
    br.downR * 0.12 -
    frown * 0.02 +
    ey.wideR * 0.05 +
    browSadDrop +
    browAngerDrop;
  // Inner brow X pinch on anger: left brow's center moves to the right
  // (positive), right brow's center moves to the left (negative). Slight
  // outward flare on sad keeps the ▲ silhouette readable.
  const browLX =
    -br.downL * 0.03 - br.innerUp * 0.020 + angerShape * 0.045 - sadShape * 0.015;
  const browRX =
    br.downR * 0.03 + br.innerUp * 0.020 - angerShape * 0.045 + sadShape * 0.015;
  rig.parts.browLeft.position.set(
    d.browLeft.position.x + browLX,
    d.browLeft.position.y + browLY,
    d.browLeft.position.z,
  );
  // Rotation Z drives the iconic brow shape:
  //   +Z on left  = inner end UP   = sad ▲ /
  //   -Z on left  = inner end DOWN = anger ▽ \
  // (Right brow uses opposite signs.)
  // Coefficients here are intentionally moderate: the user's own brow channels
  // (br.innerUp / br.downL,R / br.raiseL,R) carry the real-time motion, the
  // emotion shape overlays only top them off when an emotion clearly fires.
  rig.parts.browLeft.rotation.set(
    d.browLeft.rotation.x,
    d.browLeft.rotation.y,
    d.browLeft.rotation.z +
      br.raiseL * 0.35 -
      br.downL * 0.70 +
      br.innerUp * 0.28 +
      sadShape * 0.30 -
      angerShape * 0.25,
  );
  rig.parts.browRight.position.set(
    d.browRight.position.x + browRX,
    d.browRight.position.y + browRY,
    d.browRight.position.z,
  );
  rig.parts.browRight.rotation.set(
    d.browRight.rotation.x,
    d.browRight.rotation.y,
    d.browRight.rotation.z -
      br.raiseR * 0.35 +
      br.downR * 0.70 -
      br.innerUp * 0.28 -
      sadShape * 0.30 +
      angerShape * 0.25,
  );

  // ============= Cheeks ====================================================
  // Faded skin lobes that bloom on smile / laugh. Lift, scale, fade in.
  const chL = clamp(ch.raiseL, 0, 1);
  const chR = clamp(ch.raiseR, 0, 1);
  rig.parts.cheekLeft.position.set(
    d.cheekLeft.position.x,
    d.cheekLeft.position.y + 0.08 * chL,
    d.cheekLeft.position.z + 0.03 * chL,
  );
  rig.parts.cheekLeft.scale.set(
    d.cheekLeft.scale.x * (1 + 0.25 * chL),
    d.cheekLeft.scale.y * (1 + 0.4 * chL),
    d.cheekLeft.scale.z * (1 + 0.2 * chL),
  );
  rig.parts.cheekRight.position.set(
    d.cheekRight.position.x,
    d.cheekRight.position.y + 0.08 * chR,
    d.cheekRight.position.z + 0.03 * chR,
  );
  rig.parts.cheekRight.scale.set(
    d.cheekRight.scale.x * (1 + 0.25 * chR),
    d.cheekRight.scale.y * (1 + 0.4 * chR),
    d.cheekRight.scale.z * (1 + 0.2 * chR),
  );
  const cheekVis = (chL + chR) * 0.5;
  (rig.materials.cheek as THREE.MeshStandardMaterial).opacity = clamp(cheekVis * 0.55, 0, 0.55);

  // ============= Nose / sneer ============================================
  // Anger scrunches the nose more visibly (+ the dominant emotion contributes
  // directly so a classified 怒 always shows the scrunch, not just when both
  // brow-down channels happen to be high).
  const sneer = clamp(
    (br.downL + br.downR - br.raiseL - br.raiseR) * 0.5 + angerShape * 0.6,
    0,
    1,
  );
  rig.parts.nose.scale.set(
    1.0 * (1 - sneer * 0.10),
    0.95 * (1 - sneer * 0.14),
    0.85 * (1 + sneer * 0.08),
  );

  // ============= Tears (sad / 泣き顔) ====================================
  // Two glossy droplets on the lower outer eye corners. Threshold is high so
  // they only appear when the user is clearly committing to a sad / crying
  // expression — small pouts shouldn't summon waterworks.
  const tearOpacity = clamp(sadE * 1.6 - 0.55, 0, 0.85);
  const tearMatL = rig.parts.tearLeft.material as THREE.MeshStandardMaterial;
  const tearMatR = rig.parts.tearRight.material as THREE.MeshStandardMaterial;
  tearMatL.opacity = tearOpacity;
  tearMatR.opacity = tearOpacity;
  rig.parts.tearLeft.visible = tearOpacity > 0.02;
  rig.parts.tearRight.visible = tearOpacity > 0.02;
  // Slide the droplet down the cheek as the sadness deepens (animated tear).
  const tearSlide = sadE * 0.045;
  rig.parts.tearLeft.position.y = d.tearLeftPosition.y - tearSlide;
  rig.parts.tearRight.position.y = d.tearRightPosition.y - tearSlide;
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Confidence gate for emotion overlays. Below `thresh` the emotion contributes
// nothing — this keeps low-conviction classifications (jitter, MP noise) from
// leaking into the rig and producing a phantom ▲/▽ at neutral faces. Above
// `thresh` the value ramps from 0 → 1 across the remaining range.
function emoGate(v: number, thresh = 0.30): number {
  if (v <= thresh) return 0;
  return (v - thresh) / (1 - thresh);
}
