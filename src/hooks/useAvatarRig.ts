import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Calibration } from '../face/calibration';
import { BlendshapeSmoother } from '../face/smoothing';
import { emptyBlendshapes, type FaceState, type BlendshapeMap } from '../face/types';
import { applyExpression, applyHeadPose } from '../three/applyExpression';
import { createAvatar, type AvatarRig } from '../three/createAvatar';

const HEAD_SCALE_CM = 8;
const PLACEHOLDER_Z_CM = -55;

export type AvatarController = {
  rig: React.MutableRefObject<AvatarRig | null>;
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
  const scratchBs = useRef<BlendshapeMap>(emptyBlendshapes());

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
        if (trackingRef.current && fs.detected) {
          applyHeadPose(r, fs.headMatrix);
          // Copy raw blendshapes into a scratch object; calibration mutates
          // the values; smoother holds rolling state.
          const raw = scratchBs.current;
          const src = fs.bs;
          for (const k in src) {
            (raw as unknown as Record<string, number>)[k] = (
              src as unknown as Record<string, number>
            )[k];
          }
          calibrationRef.current.feed(fs.bs, performance.now());
          calibrationRef.current.apply(raw);
          const smoothed = smootherRef.current.update(raw);
          applyExpression(r, smoothed);
        } else if (!trackingRef.current) {
          // Tracking off: park at the placeholder pose and decay expression.
          r.root.position.lerp(new THREE.Vector3(0, 0, PLACEHOLDER_Z_CM), 0.15);
          r.root.quaternion.slerp(new THREE.Quaternion(), 0.15);
          applyExpression(r, smootherRef.current.update(emptyBlendshapes()));
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

  return { rig: rigRef, setTracking, isTracking, startCalibration, resetCalibration };
}
