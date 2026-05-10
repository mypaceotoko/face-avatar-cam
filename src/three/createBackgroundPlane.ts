import * as THREE from 'three';

// Standard chroma-key green (the same hue used in production green screens).
// Stored as linear because we draw with a non-toneMapped material.
const GREEN_HEX = 0x00b140;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// uMask is a single-channel float texture aligned to the same UV space as
// uVideo. uUseMask gates the chroma-key branch.
//
// メリハリ pipeline (lightweight — no per-pixel bilateral filter):
//   1. Sigmoid contrast widen — pulls grey/uncertain pixels toward 0 or 1.
//   2. Tight smoothstep (0.42 → 0.58) — narrow transition band so the
//      matte resolves over ≈1 pixel instead of fading across a wide band.
//
// Temporal stability is handled CPU-side in useSegmenter via an EMA over
// the raw mask buffer, which makes the silhouette read as sharp without
// requiring any expensive shader work.
const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uVideo;
  uniform sampler2D uMask;
  uniform float uUseMask;
  uniform vec3 uBgColor;
  varying vec2 vUv;

  void main() {
    vec3 col = texture2D(uVideo, vUv).rgb;
    if (uUseMask > 0.5) {
      float m = texture2D(uMask, vUv).r;
      // Sigmoid widen around 0.5 — ×2.0 contrast for メリハリ.
      m = clamp((m - 0.5) * 2.0 + 0.5, 0.0, 1.0);
      // Crisp narrow threshold band.
      m = smoothstep(0.42, 0.58, m);
      col = mix(uBgColor, col, m);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type BackgroundPlane = {
  mesh: THREE.Mesh;
  texture: THREE.VideoTexture;
  resize: (camera: THREE.PerspectiveCamera, distanceCm: number, videoAspect: number) => void;
  /** Upload a fresh mask frame (does nothing if data is null). */
  setMaskFrame: (data: Float32Array, width: number, height: number) => void;
  /** Toggle chroma-key composition. Falls back to video-only if no mask yet. */
  setGreenScreen: (on: boolean) => void;
  dispose: () => void;
};

export function createBackgroundPlane(video: HTMLVideoElement): BackgroundPlane {
  const videoTex = new THREE.VideoTexture(video);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.generateMipmaps = false;

  // 1×1 placeholder mask so the sampler is always valid. Replaced on the first
  // frame from the segmenter.
  let maskTex = new THREE.DataTexture(
    new Float32Array([0]) as unknown as BufferSource,
    1,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  maskTex.flipY = true; // VideoTexture flips Y by default; match it
  maskTex.minFilter = THREE.LinearFilter;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.needsUpdate = true;

  const greenColor = new THREE.Color(GREEN_HEX);

  const uniforms = {
    uVideo: { value: videoTex },
    uMask: { value: maskTex },
    uUseMask: { value: 0 },
    uBgColor: { value: greenColor },
  };

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;

  const resize = (
    camera: THREE.PerspectiveCamera,
    distanceCm: number,
    videoAspect: number,
  ) => {
    const vFov = (camera.fov * Math.PI) / 180;
    const viewH = 2 * Math.tan(vFov / 2) * distanceCm;
    const viewW = viewH * camera.aspect;
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

  let greenScreenOn = false;
  let hasMask = false;
  const updateUseMask = () => {
    uniforms.uUseMask.value = greenScreenOn && hasMask ? 1 : 0;
  };

  let currentW = 1;
  let currentH = 1;
  const setMaskFrame = (data: Float32Array, width: number, height: number) => {
    if (width !== currentW || height !== currentH) {
      maskTex.dispose();
      maskTex = new THREE.DataTexture(
        data as unknown as BufferSource,
        width,
        height,
        THREE.RedFormat,
        THREE.FloatType,
      );
      maskTex.flipY = true;
      maskTex.minFilter = THREE.LinearFilter;
      maskTex.magFilter = THREE.LinearFilter;
      maskTex.needsUpdate = true;
      uniforms.uMask.value = maskTex;
      currentW = width;
      currentH = height;
    } else {
      // Same shape — overwrite the data buffer in place (cheaper than a new
      // DataTexture on every frame).
      (maskTex.image as unknown as { data: Float32Array }).data = data;
      maskTex.needsUpdate = true;
    }
    hasMask = true;
    updateUseMask();
  };

  const setGreenScreen = (on: boolean) => {
    greenScreenOn = on;
    updateUseMask();
  };

  const dispose = () => {
    videoTex.dispose();
    maskTex.dispose();
    geometry.dispose();
    material.dispose();
  };

  return { mesh, texture: videoTex, resize, setMaskFrame, setGreenScreen, dispose };
}
