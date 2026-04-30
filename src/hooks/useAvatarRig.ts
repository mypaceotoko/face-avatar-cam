import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createAvatar, type AvatarRig } from '../three/createAvatar';

/** How big the model-space (radius ~0.9) maps to centimetres. ~7.2cm radius =
 *  ~14.4cm head width, close to a real head. Tuned in Step 6 with calibration. */
const HEAD_SCALE_CM = 8;

/** Where the static placeholder avatar sits before face tracking is wired up.
 *  Roughly the distance MediaPipe reports for a face at arm's length. */
const PLACEHOLDER_Z_CM = -55;

export type AvatarRefs = {
  rig: React.MutableRefObject<AvatarRig | null>;
};

export function useAvatarRig(parent: THREE.Group | null): AvatarRefs {
  const rigRef = useRef<AvatarRig | null>(null);

  useEffect(() => {
    if (!parent) return;

    const rig = createAvatar();
    rig.root.scale.setScalar(HEAD_SCALE_CM);
    // Step 5: static placeholder pose. Step 6 overwrites this each frame from
    // FaceLandmarker's facialTransformationMatrix.
    rig.root.position.set(0, 0, PLACEHOLDER_Z_CM);
    parent.add(rig.root);
    rigRef.current = rig;

    return () => {
      parent.remove(rig.root);
      rig.dispose();
      rigRef.current = null;
    };
  }, [parent]);

  return { rig: rigRef };
}
