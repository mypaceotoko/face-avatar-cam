import * as THREE from 'three';

export type BackgroundPlane = {
  mesh: THREE.Mesh;
  texture: THREE.VideoTexture;
  /** Resize plane to fill the view at a given camera distance. */
  resize: (camera: THREE.PerspectiveCamera, distanceCm: number, videoAspect: number) => void;
  dispose: () => void;
};

// Renders the video as a textured plane at a fixed distance behind the avatar.
// Object-fit: contain semantics — the plane uses videoAspect, while the canvas
// itself is sized to the same display rect via CSS.
export function createBackgroundPlane(video: HTMLVideoElement): BackgroundPlane {
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;

  const resize = (camera: THREE.PerspectiveCamera, distanceCm: number, videoAspect: number) => {
    // Plane height that fills the view at distance for the camera's vertical FOV
    const vFov = (camera.fov * Math.PI) / 180;
    const viewH = 2 * Math.tan(vFov / 2) * distanceCm;
    const viewW = viewH * camera.aspect;

    // object-fit: contain — fit the video within the view, preserving aspect
    let w: number;
    let h: number;
    if (videoAspect > camera.aspect) {
      w = viewW;
      h = viewW / videoAspect;
    } else {
      h = viewH;
      w = viewH * videoAspect;
    }
    mesh.scale.set(w, h, 1);
    mesh.position.set(0, 0, -distanceCm);
  };

  const dispose = () => {
    texture.dispose();
    geometry.dispose();
    material.dispose();
  };

  return { mesh, texture, resize, dispose };
}
