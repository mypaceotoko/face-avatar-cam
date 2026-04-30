import * as THREE from 'three';

// Scene units = centimeters. MediaPipe FaceLandmarker reports the face
// transformation matrix with a translation in cm using a virtual perspective
// camera roughly 63° vertical FOV. Matching that here makes the avatar's
// projected position align with the user's face in the video.
export const SCENE_FOV_DEG = 63;
export const SCENE_NEAR_CM = 1;
export const SCENE_FAR_CM = 2000;

export function createSceneCamera(aspect = 1): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(
    SCENE_FOV_DEG,
    aspect,
    SCENE_NEAR_CM,
    SCENE_FAR_CM,
  );
  cam.position.set(0, 0, 0);
  cam.lookAt(0, 0, -1);
  return cam;
}

export function updateCameraAspect(camera: THREE.PerspectiveCamera, aspect: number) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
