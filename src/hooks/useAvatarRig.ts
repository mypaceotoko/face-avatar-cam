import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { Calibration } from "../face/calibration";
import { BlendshapeSmoother } from "../face/smoothing";
import { emptyBlendshapes, type FaceState } from "../face/types";
import { applyExpression, applyHeadPose } from "../three/applyExpression";
import { createAvatar, type AvatarRig } from "../three/createAvatar";
import type { AvatarSettings } from "../avatar/settings";
import { expressionChannels } from "../avatar/expressions";
import { fitFaceToVideo } from "../three/fitFaceToVideo";
import type { ThreeRefs } from "./useThreeScene";
export type RigOptions = {
  settings: AvatarSettings;
  cameraActive: boolean;
  tracking: boolean;
  expression: string;
  yaw: number;
  pitch: number;
};
export function useAvatarRig(
  parent: THREE.Group | null,
  faceStateRef: React.MutableRefObject<FaceState>,
  sceneRef: React.MutableRefObject<ThreeRefs>,
  options: RigOptions,
) {
  const rigRef = useRef<AvatarRig | null>(null),
    latest = useRef(options);
  latest.current = options;
  const calibration = useRef(new Calibration());
  useEffect(() => {
    if (!parent) return;
    const rig = createAvatar(options.settings);
    rig.root.position.z = -55;
    parent.add(rig.root);
    rigRef.current = rig;
    const smoother = new BlendshapeSmoother(),
      raw = emptyBlendshapes();
    const target = new THREE.Vector3(),
      quat = new THREE.Quaternion(),
      euler = new THREE.Euler();
    let raf = 0,
      previous = performance.now(),
      lastSample = -1;
    let previewName = "",
      previewBs = emptyBlendshapes();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      const alpha = 1 - Math.exp(-dt * 18),
        o = latest.current,
        fs = faceStateRef.current,
        scene = sceneRef.current;
      const camera = scene.camera;
      if (!camera) return;
      const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 55,
        viewW = viewH * camera.aspect;
      if (o.cameraActive && o.tracking) {
        const fresh = fs.detected && now - fs.timestampMs < 500;
        rig.root.visible = fresh;
        if (!fresh) return;
        applyHeadPose(rig, fs.headMatrix, alpha, false);
        if (fs.fit && scene.background) {
          const bg = scene.background.mesh.scale;
          const yaw = euler.setFromQuaternion(rig.root.quaternion, "YXZ").y;
          const fit = fitFaceToVideo(
            fs.fit,
            bg.x,
            bg.y,
            yaw,
            o.settings.coverage,
          );
          target.set(fit.x, fit.y, fit.z);
          rig.root.position.lerp(target, alpha);
          rig.root.scale.lerp(target.setScalar(fit.scale), alpha);
        }
        if (fs.timestampMs !== lastSample) {
          calibration.current.feed(fs.bs, now);
          lastSample = fs.timestampMs;
        }
        Object.assign(raw, fs.bs);
        calibration.current.apply(raw);
        applyExpression(rig, smoother.update(raw, dt));
      } else {
        rig.root.visible = true;
        target.set(0, 0.5, -55);
        rig.root.position.lerp(target, alpha);
        quat.setFromEuler(euler.set(o.pitch, o.yaw, 0));
        rig.root.quaternion.slerp(quat, alpha);
        rig.root.scale.setScalar(Math.min(viewH / 2.8, viewW / 2.4) * 0.85);
        if (previewName !== o.expression) {
          previewName = o.expression;
          previewBs = expressionChannels(o.expression);
        }
        applyExpression(rig, smoother.update(previewBs, dt));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      parent.remove(rig.root);
      rig.dispose();
      rigRef.current = null;
    };
  }, [parent, faceStateRef, sceneRef, options.settings]);
  const startCalibration = useCallback(
    (durationMs = 1500) => calibration.current.start(durationMs),
    [],
  );
  return {
    rig: rigRef,
    startCalibration,
    resetCalibration: () => calibration.current.reset(),
  };
}
