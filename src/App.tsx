import { useEffect, useRef, useState } from "react";
import { CameraView } from "./components/CameraView";
import { ControlPanel } from "./components/ControlPanel";
import { DebugOverlay } from "./components/DebugOverlay";
import { DownloadLink } from "./components/DownloadLink";
import { AvatarEditor } from "./components/AvatarEditor";
import { useAvatarRig } from "./hooks/useAvatarRig";
import { useCamera } from "./hooks/useCamera";
import { useFaceLandmarker } from "./hooks/useFaceLandmarker";
import { useRecorder } from "./hooks/useRecorder";
import { useThreeScene } from "./hooks/useThreeScene";
import { loadSettings, SETTINGS_KEY } from "./avatar/settings";
import { EXPRESSIONS } from "./avatar/expressions";
export function App() {
  const camera = useCamera(),
    canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState(loadSettings),
    [expression, setExpression] = useState("neutral");
  const [tracking, setTracking] = useState(true),
    [calibrating, setCalibrating] = useState(false),
    [debug, setDebug] = useState(false);
  const [yaw, setYaw] = useState(0),
    [pitch, setPitch] = useState(0),
    [editing, setEditing] = useState(true),
    [storageError, setStorageError] = useState(false);
  const [detected, setDetected] = useState(false);
  const [renderStats, setRenderStats] = useState({
    fps: 0,
    triangles: 0,
    calls: 0,
    dpr: 1,
  });
  const drag = useRef<{
      x: number;
      y: number;
      yaw: number;
      pitch: number;
    } | null>(null),
    timer = useRef<number>();
  const active = camera.status === "ready",
    scene = useThreeScene(
      canvasRef,
      camera.videoRef,
      active,
      camera.facing === "user",
    );
  const face = useFaceLandmarker(camera.videoRef, active);
  const avatar = useAvatarRig(scene.mirrorRoot, face.refs.state, scene.refs, {
    settings,
    cameraActive: active,
    tracking,
    expression,
    yaw,
    pitch,
  });
  const recorder = useRecorder(canvasRef, camera.stream);
  const recording =
    recorder.status === "recording" || recorder.status === "stopping";
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [settings]);
  useEffect(() => {
    const id = window.setInterval(
      () =>
        setDetected(
          face.refs.state.current.detected &&
            performance.now() - face.refs.state.current.timestampMs < 500,
        ),
      250,
    );
    return () => clearInterval(id);
  }, [face.refs.state]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!debug) return;
    const id = window.setInterval(
      () => setRenderStats({ ...scene.stats.current }),
      1000,
    );
    return () => clearInterval(id);
  }, [debug, scene.stats]);
  useEffect(() => {
    if (scene.contextLost) recorder.stop();
  }, [scene.contextLost, recorder.stop]);
  const calibrate = () => {
    avatar.startCalibration();
    setCalibrating(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCalibrating(false), 1500);
  };
  const stop = () => {
    recorder.stop();
    camera.stop();
  };
  const message = scene.error || camera.error || face.error || recorder.error;
  return (
    <main className="app">
      <header className="app-header">
        <a className="brand" href="./" aria-label="Face Avatar Studio">
          <span className="brand-mark">f.</span>
          <span>
            FACE AVATAR<span className="brand-sub">EXPRESSION STUDIO</span>
          </span>
        </a>
        <span className="privacy-badge">
          <i /> ON DEVICE
        </span>
      </header>
      <div className="studio-layout">
        <section className="stage" aria-label="アバタープレビュー">
          <CameraView ref={camera.videoRef} />
          <canvas
            ref={canvasRef}
            className="render-canvas"
            aria-label="ドラッグでアバターを回転"
            onPointerDown={(e) => {
              if (active && tracking) return;
              drag.current = { x: e.clientX, y: e.clientY, yaw, pitch };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.009);
              setPitch(
                Math.max(
                  -0.5,
                  Math.min(
                    0.5,
                    drag.current.pitch + (e.clientY - drag.current.y) * 0.006,
                  ),
                ),
              );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          />
          <div className="stage-top">
            <span className="mode-badge">
              <i />
              {active ? "LIVE CAMERA" : "AVATAR PREVIEW"}
            </span>
            <button
              className="stage-button"
              onClick={() => setEditing(!editing)}
              aria-expanded={editing}
            >
              {editing ? "編集を閉じる" : "アバター編集"}
            </button>
          </div>
          {!active && (
            <div className="stage-caption">
              <span className="eyebrow">A LITTLE MORE YOU.</span>
              <h1>表情に、もうひとつの私。</h1>
              <p>ドラッグで回転 · カメラなしでも楽しめます</p>
            </div>
          )}
          {active && (
            <div className="tracking-hint" role="status">
              {face.status === "loading"
                ? "顔トラッキングを準備中…"
                : !tracking
                  ? "追従は停止中です"
                  : detected
                    ? "顔をトラッキング中"
                    : "顔を画面の中央に向けてください"}
            </div>
          )}
          {(!active || !tracking) && (
            <div className="view-angles" aria-label="プレビュー角度">
              {[
                [0, "正面"],
                [Math.PI / 4, "45°"],
                [Math.PI / 2, "横顔"],
              ].map(([a, label]) => (
                <button
                  key={label}
                  onClick={() => {
                    setYaw(Number(a));
                    setPitch(0);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {calibrating && (
            <div className="calibrate-banner">無表情で1.5秒キープ…</div>
          )}
          {scene.contextLost && (
            <div className="calibrate-banner" role="status">
              3D表示を復旧しています…
            </div>
          )}
          {recording && (
            <div className="rec-indicator">
              <span className="rec-indicator__dot" /> REC
            </div>
          )}
          {debug && (
            <div className="render-stats">
              描画 {renderStats.fps.toFixed(1)} fps · {renderStats.calls} draws
              · {(renderStats.triangles / 1000).toFixed(1)}k tris · DPR{" "}
              {renderStats.dpr}
            </div>
          )}
          <DebugOverlay
            stateRef={face.refs.state}
            fpsRef={face.refs.fps}
            visible={debug}
          />
          <DownloadLink
            recording={recorder.recording}
            onClear={recorder.clear}
          />
        </section>
        {editing && (
          <aside className="studio-sidebar">
            <fieldset disabled={recording} className="editor-container">
              <AvatarEditor settings={settings} onChange={setSettings} />
            </fieldset>
            <section className="expression-panel">
              <div className="section-heading">
                <h2>表情を試す</h2>
                <span className="eyebrow">EXPRESSION</span>
              </div>
              <div className="expression-list">
                {Object.entries(EXPRESSIONS).map(([key, item]) => (
                  <button
                    key={key}
                    disabled={active && tracking}
                    aria-pressed={expression === key}
                    onClick={() => setExpression(key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {active && tracking && (
                <p className="save-note">顔追従をOFFにすると表情を試せます</p>
              )}
            </section>
            {active && (
              <label className="coverage-control">
                顔を覆う範囲
                <input
                  type="range"
                  min="1"
                  max="1.4"
                  step=".01"
                  value={settings.coverage}
                  disabled={recording}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      coverage: Number(e.target.value),
                    })
                  }
                />
                <small>元の髪が見える場合は少し広げてください</small>
              </label>
            )}
          </aside>
        )}
      </div>
      {message && (
        <p className="error-banner" role="alert">
          {message}
        </p>
      )}
      {storageError && (
        <p className="error-banner" role="status">
          設定を保存できません。このタブ内でのみ保持されます。
        </p>
      )}
      <ControlPanel
        camStatus={camera.status}
        recStatus={recorder.status}
        tracking={tracking}
        calibrating={calibrating}
        audio={camera.audio}
        disabled={!scene.mirrorRoot || !!scene.error || scene.contextLost}
        onStart={() => void camera.start()}
        onStop={stop}
        onFlip={() => void camera.flip()}
        onToggleTracking={() => setTracking(!tracking)}
        onCalibrate={calibrate}
        onToggleRec={
          recorder.status === "recording" ? recorder.stop : recorder.start
        }
        onPhoto={recorder.takePhoto}
        onAudio={camera.setAudio}
      />
      <footer className="app-footer">
        <span>あなたの映像は、この端末の中に。</span>
        <button onClick={() => setDebug(!debug)}>
          診断 {debug ? "ON" : "OFF"}
        </button>
      </footer>
    </main>
  );
}
