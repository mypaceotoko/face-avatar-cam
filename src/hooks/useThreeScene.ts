import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createSceneCamera, updateCameraAspect } from '../three/alignCameraToVideo';
import { createBackgroundPlane, type BackgroundPlane } from '../three/createBackgroundPlane';
import type { MaskFrame } from './useSegmenter';

export type ThreeRefs = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  /** Mirror group: front-camera convention, scale.x = -1. Children: bg + avatar. */
  mirrorRoot: THREE.Group | null;
  background: BackgroundPlane | null;
};

const BG_DISTANCE_CM = 120;

export type UseThreeSceneResult = {
  refs: React.MutableRefObject<ThreeRefs>;
  /** State-backed handle so downstream hooks can react to scene readiness. */
  mirrorRoot: THREE.Group | null;
};

export function useThreeScene(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
  maskRef: React.MutableRefObject<MaskFrame>,
  greenScreenRef: React.MutableRefObject<boolean>,
): UseThreeSceneResult {
  const refs = useRef<ThreeRefs>({
    renderer: null,
    scene: null,
    camera: null,
    mirrorRoot: null,
    background: null,
  });
  const rafRef = useRef<number | null>(null);
  const [mirrorRoot, setMirrorRoot] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // required for canvas.captureStream on some browsers
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES Filmic gives a more cinematic specular roll-off so the avatar's
    // glossy highlights stop reading as plastic clipping. Exposure is held a
    // touch under 1 to compensate for the brighter env-lit skin.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    // Soft shadows on the avatar self-occlusion (hair on forehead, brow on
    // cheek, lid on eye) — the cheapest readable option on mobile.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const isCoarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarse ? 1.75 : 2));

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Procedural studio environment so the PBR materials get believable
    // reflections without shipping an HDR file. Used as scene.environment
    // only — the camera video stays as the visible background.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const camera = createSceneCamera(1);

    const mirror = new THREE.Group();
    mirror.scale.x = -1;
    scene.add(mirror);

    // Hemisphere supplies a warm sky / cool ground term so the skin reads as
    // lit by a room rather than by stage spotlights. Then a warm key from
    // above-camera-right (with shadows), a cool fill from camera-left, and a
    // back rim for separation.
    scene.add(new THREE.HemisphereLight(0xfff2dc, 0x222633, 0.6));
    const key = new THREE.DirectionalLight(0xffe8cf, 0.95);
    key.position.set(40, 80, 60);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 250;
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb6cdff, 0.32);
    fill.position.set(-60, 20, 40);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd6b0, 0.45);
    rim.position.set(0, 20, -80);
    scene.add(rim);

    const background = createBackgroundPlane(video);
    mirror.add(background.mesh);

    refs.current = { renderer, scene, camera, mirrorRoot: mirror, background };
    setMirrorRoot(mirror);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      updateCameraAspect(camera, aspect);
      const va =
        video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : aspect;
      background.resize(camera, BG_DISTANCE_CM, va);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    video.addEventListener('loadedmetadata', resize);
    resize();

    let lastMaskFrameId = -1;
    const tick = () => {
      const mf = maskRef.current;
      if (mf.frameId !== lastMaskFrameId && mf.data) {
        background.setMaskFrame(mf.data, mf.width, mf.height);
        lastMaskFrameId = mf.frameId;
      }
      background.setGreenScreen(greenScreenRef.current);

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      video.removeEventListener('loadedmetadata', resize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      background.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      refs.current = {
        renderer: null,
        scene: null,
        camera: null,
        mirrorRoot: null,
        background: null,
      };
      setMirrorRoot(null);
    };
  }, [active, canvasRef, videoRef, maskRef, greenScreenRef]);

  return { refs, mirrorRoot };
}
