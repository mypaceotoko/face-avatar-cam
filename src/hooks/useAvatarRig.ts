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

    const rig = createAvatar();
    rig.root.scale.setScalar(HEAD_SCALE_CM);
    rig.root.position.set(0, 0, PLACEHOLDER_Z_CM);
    parent.add(rig.root);
    rigRef.current = rig;

    let raf = 0;
    const tick = () => {
      const r = rigRef.current;
      if (r) {
        const fs = faceStateRef.current;
        const now = performance.now();
        if (trackingRef.current && fs.detected) {
          applyHeadPose(r, fs.headMatrix);
          // Copy raw blendshapes so calibration can mutate the working copy.
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
          // Tracking off: park at the placeholder pose, decay the smoother
          // toward zero, then run the engine on the decaying values so idle
          // blinks/breath keep going.
          r.root.position.lerp(new THREE.Vector3(0, 0, PLACEHOLDER_Z_CM), 0.15);
          r.root.quaternion.slerp(new THREE.Quaternion(), 0.15);
          const smoothed = smootherRef.current.update(emptyBlendshapes());
          const expr = engineRef.current.compute(smoothed, true, now);
          expressionRef.current = expr;
          applyExpression(r, expr);
        } else {
          // Tracking on but no face detected: ease everything off but keep
          // the avatar present so the user gets feedback that it's looking.
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
  }, [parent, faceStateRef]);

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
