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
// uVideo (both come from the un-mirrored camera frame). uUseMask gates the
// chroma-key branch so the same plane handles "video only" and "green screen"
// without rebuilding materials.
//
// Refinement pipeline:
//   1. Cross-bilateral filter — at each output pixel sample a 5x5 grid of
//      neighbouring (mask, video) pairs. Weight each tap by both spatial
//      Gaussian and *color similarity to the centre's video color* so the
//      mask snaps to actual edges in the video. This recovers fine detail
//      (fingers, hair tips) that the 256×256 segmenter mask doesn't have.
//   2. Contrast push (sigmoid widening) — pulls grey/uncertain pixels toward
//      0 or 1 for メリハリ.
//   3. Tight smoothstep — a narrow 0.42→0.58 window so the matte transitions
//      crisply over only ~1px instead of fading over a wide band.
const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uVideo;
  uniform sampler2D uMask;
  uniform float uUseMask;
  uniform vec3 uBgColor;
  uniform vec2 uTexel;
  varying vec2 vUv;

  // Edge-aware (cross-bilateral) refinement of the upsampled mask.
  float refineMask(vec2 uv) {
    vec3 cCol = texture2D(uVideo, uv).rgb;
    float sumW = 0.0;
    float sumM = 0.0;
    // 5x5 kernel, 1.5-video-texel stride (≈covers the 4-px gap between
    // neighbouring 256×256 mask cells when the video is 1080p).
    for (int dy = -2; dy <= 2; dy++) {
      for (int dx = -2; dx <= 2; dx++) {
        vec2 off = vec2(float(dx), float(dy)) * uTexel * 1.5;
        vec2 nUv = uv + off;
        vec3 nCol = texture2D(uVideo, nUv).rgb;
        float nMask = texture2D(uMask, nUv).r;
        // Spatial Gaussian (sigma ≈ √(1/0.6))
        float r2 = float(dx * dx + dy * dy);
        float spatial = exp(-r2 * 0.30);
        // Color Gaussian — taps with very different video color from the
        // centre get heavily down-weighted, which is what snaps the mask
        // to real boundaries.
        vec3 dCol = cCol - nCol;
        float color = exp(-dot(dCol, dCol) / 0.020);
        float w = spatial * color;
        sumW += w;
        sumM += nMask * w;
      }
    }
    return sumM / max(sumW, 1e-5);
  }

  void main() {
    vec3 col = texture2D(uVideo, vUv).rgb;
    if (uUseMask > 0.5) {
      float m = refineMask(vUv);
      // メリハリ contrast widen (steeper sigmoid around 0.5)
      m = clamp((m - 0.5) * 1.8 + 0.5, 0.0, 1.0);
      // Crisp narrow threshold band — about 1px transition
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
  /** Tell the bilateral refinement how big a single video pixel is in UV. */
  setVideoSize: (width: number, height: number) => void;
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
    // Texel size of the *guide* texture (the video). Updated by
    // setVideoSize() once the video has known dimensions.
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
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

  const setVideoSize = (width: number, height: number) => {
    if (width > 0 && height > 0) {
      uniforms.uTexel.value.set(1 / width, 1 / height);
    }
  };

  const dispose = () => {
    videoTex.dispose();
    maskTex.dispose();
    geometry.dispose();
    material.dispose();
  };

  return { mesh, texture: videoTex, resize, setMaskFrame, setGreenScreen, setVideoSize, dispose };
}
