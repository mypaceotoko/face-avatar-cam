import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Calibration } from '../face/calibration';
import { ExpressionEngine } from '../face/expression';
import { BlendshapeSmoother } from '../face/smoothing';
import {
  emptyBlendshapes,
  emptyExpressionState,
  type BlendshapeMap,
  type ExpressionState,
  type FaceState,
} from '../face/types';
import { applyExpression, applyHeadPose } from '../three/applyExpression';
import { type CharacterType } from '../three/avatarCharacters';
import { createAvatar, type AvatarRig } from '../three/createAvatar';

const HEAD_SCALE_CM = 14;
const PLACEHOLDER_Z_CM = -55;

export type AvatarController = {
  rig: React.MutableRefObject<AvatarRig | null>;
  /** Current performance state — updated every frame, exposed for debug UI. */
  expression: React.MutableRefObject<ExpressionState>;
  setTracking: (on: boolean) => void;
  isTracking: () => boolean;
  startCalibration: (durationMs?: number) => void;
  resetCalibration: () => void;
};

export function useAvatarRig(
  parent: THREE.Group | null,
  faceStateRef: React.MutableRefObject<FaceState>,
  characterType: CharacterType = 'child',
): AvatarController {
  const rigRef = useRef<AvatarRig | null>(null);
  const trackingRef = useRef(true);
  const smootherRef = useRef(new BlendshapeSmoother());
  const calibrationRef = useRef(new Calibration());
  const engineRef = useRef(new ExpressionEngine());
  const scratchBs = useRef<BlendshapeMap>(emptyBlendshapes());
  const expressionRef = useRef<ExpressionState>(emptyExpressionState());

  useEffect(() => {
    if (!parent) return;

    const rig = createAvatar(characterType);
    rig.root.scale.setScalar(HEAD_SCALE_CM);
    rig.root.position.set(0, 0, PLACEHOLDER_Z_CM);
    parent.add(rig.root);
    rigRef.current = rig;

    // Reset smoothing and calibration so every character starts from a
    // neutral baseline rather than inheriting the previous character's state.
    smootherRef.current.reset();
    calibrationRef.current.reset();

    let raf = 0;
    const tick = () => {
      const r = rigRef.current;
      if (r) {
        const fs = faceStateRef.current;
        const now = performance.now();
        if (trackingRef.current && fs.detected) {
          applyHeadPose(r, fs.headMatrix);
          const raw = scratchBs.current;
          const src = fs.bs;
          for (const k in src) {
            (raw as unknown as Record<string, number>)[k] = (
              src as unknown as Record<string, number>
            )[k];
          }
          calibrationRef.current.feed(fs.bs, now);
          calibrationRef.current.apply(raw);
          const smoothed = smootherRef.current.update(raw);
          const expr = engineRef.current.compute(smoothed, true, now);
          expressionRef.current = expr;
          applyExpression(r, expr);
        } else if (!trackingRef.current) {
          r.root.position.lerp(new THREE.Vector3(0, 0, PLACEHOLDER_Z_CM), 0.15);
          r.root.quaternion.slerp(new THREE.Quaternion(), 0.15);
          const smoothed = smootherRef.current.update(emptyBlendshapes());
          const expr = engineRef.current.compute(smoothed, true, now);
          expressionRef.current = expr;
          applyExpression(r, expr);
        } else {
          const smoothed = smootherRef.current.update(emptyBlendshapes());
          const expr = engineRef.current.compute(smoothed, false, now);
          expressionRef.current = expr;
          applyExpression(r, expr);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      parent.remove(rig.root);
      rig.dispose();
      rigRef.current = null;
    };
  }, [parent, faceStateRef, characterType]);

  const setTracking = useCallback((on: boolean) => {
    trackingRef.current = on;
  }, []);
  const isTracking = useCallback(() => trackingRef.current, []);
  const startCalibration = useCallback((durationMs?: number) => {
    calibrationRef.current.start(durationMs);
  }, []);
  const resetCalibration = useCallback(() => {
    calibrationRef.current.reset();
  }, []);

  return {
    rig: rigRef,
    expression: expressionRef,
    setTracking,
    isTracking,
    startCalibration,
    resetCalibration,
  };
}
