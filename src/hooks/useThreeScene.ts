import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createBackgroundPlane,
  type BackgroundPlane,
} from "../three/createBackgroundPlane";
import {
  createSceneCamera,
  updateCameraAspect,
} from "../three/alignCameraToVideo";
export type ThreeRefs = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  mirrorRoot: THREE.Group | null;
  background: BackgroundPlane | null;
};
export function useThreeScene(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  videoRef: React.RefObject<HTMLVideoElement>,
  cameraActive: boolean,
  mirrored = true,
) {
  const refs = useRef<ThreeRefs>({
    renderer: null,
    scene: null,
    camera: null,
    mirrorRoot: null,
    background: null,
  });
  const options = useRef({ cameraActive, mirrored });
  options.current = { cameraActive, mirrored };
  const [mirrorRoot, setMirrorRoot] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const stats = useRef({ fps: 0, triangles: 0, calls: 0, dpr: 1 });
  useEffect(() => {
    const canvas = canvasRef.current,
      video = videoRef.current;
    if (!canvas || !video) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "default",
      });
    } catch {
      setError(
        "3D表示を開始できません。Safariを更新して、ページを開き直してください。",
      );
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let dpr = Math.min(devicePixelRatio, coarse ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8ded4");
    const camera = createSceneCamera(1),
      mirror = new THREE.Group();
    scene.add(mirror);
    scene.add(new THREE.HemisphereLight(0xfff4e8, 0x85748b, 2.0));
    const key = new THREE.DirectionalLight(0xfff3e5, 2.6);
    key.position.set(-30, 45, 65);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe6eeff, 1.15);
    fill.position.set(40, 10, 30);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffddbf, 2.2);
    rim.position.set(20, 30, -75);
    scene.add(rim);
    const background = createBackgroundPlane(video);
    mirror.add(background.mesh);
    refs.current = { renderer, scene, camera, mirrorRoot: mirror, background };
    setMirrorRoot(mirror);
    let lost = false,
      raf = 0,
      last = 0,
      start = performance.now(),
      frames = 0,
      slowWindows = 0;
    const resize = () => {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      updateCameraAspect(camera, w / h);
      background.resize(
        camera,
        120,
        video.videoWidth && video.videoHeight
          ? video.videoWidth / video.videoHeight
          : w / h,
      );
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setContextLost(true);
    };
    const onRestored = () => {
      lost = false;
      setContextLost(false);
      resize();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    video.addEventListener("loadedmetadata", resize);
    resize();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (
        lost ||
        document.hidden ||
        now - last < (coarse ? 1000 / 30 : 1000 / 60) - 1
      )
        return;
      last = now;
      mirror.scale.x =
        options.current.cameraActive && options.current.mirrored ? -1 : 1;
      background.mesh.visible =
        options.current.cameraActive && video.readyState >= 2;
      renderer.render(scene, camera);
      frames++;
      if (now - start > 2000) {
        const fps = (frames * 1000) / (now - start);
        stats.current = {
          fps,
          triangles: renderer.info.render.triangles,
          calls: renderer.info.render.calls,
          dpr,
        };
        // Hysteresis: only reduce after sustained slow rendering; no oscillation.
        slowWindows = fps < (coarse ? 25 : 42) ? slowWindows + 1 : 0;
        if (slowWindows >= 2 && dpr > 1) {
          dpr = Math.max(1, dpr - 0.25);
          renderer.setPixelRatio(dpr);
          resize();
          slowWindows = 0;
        }
        frames = 0;
        start = now;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      video.removeEventListener("loadedmetadata", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      background.dispose();
      renderer.dispose();
      refs.current = {
        renderer: null,
        scene: null,
        camera: null,
        mirrorRoot: null,
        background: null,
      };
    };
  }, [canvasRef, videoRef]);
  return { refs, mirrorRoot, error, contextLost, stats };
}
