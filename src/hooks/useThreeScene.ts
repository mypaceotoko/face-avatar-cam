import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createSceneCamera, updateCameraAspect } from '../three/alignCameraToVideo';
import { createBackgroundPlane, type BackgroundPlane } from '../three/createBackgroundPlane';

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
    // Phones with very high DPRs (3+) burn fill rate for little visible gain;
    // cap at 2 to keep the rAF loop comfortably above 30fps.
    const isCoarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarse ? 1.75 : 2));

    // iOS Safari intermittently loses the WebGL context when the page is
    // backgrounded; prevent the default so the browser tries to restore it.
    const onContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = createSceneCamera(1);

    const mirror = new THREE.Group();
    mirror.scale.x = -1;
    scene.add(mirror);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(0.4, 0.6, 1).multiplyScalar(50);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-0.4, 0.2, 1).multiplyScalar(50);
    scene.add(fill);

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

    const tick = () => {
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
  }, [active, canvasRef, videoRef]);

  return { refs, mirrorRoot };
}
