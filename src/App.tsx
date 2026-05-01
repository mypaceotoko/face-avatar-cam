import { useEffect, useRef, useState } from 'react';
import { CameraView } from './components/CameraView';
import { ControlPanel } from './components/ControlPanel';
import { DebugOverlay } from './components/DebugOverlay';
import { DownloadLink } from './components/DownloadLink';
import { useAvatarRig } from './hooks/useAvatarRig';
import { useCamera } from './hooks/useCamera';
import { useFaceLandmarker } from './hooks/useFaceLandmarker';
import { useRecorder } from './hooks/useRecorder';
import { useSegmenter } from './hooks/useSegmenter';
import { useThreeScene } from './hooks/useThreeScene';

export function App() {
  const { videoRef, stream, status, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debug, setDebug] = useState(false);
  const [tracking, setTrackingState] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [greenScreen, setGreenScreen] = useState(false);

  // Mirror the green-screen flag into a ref so the render loop can poll it
  // without re-running the scene effect on every toggle.
  const greenScreenRef = useRef(false);
  useEffect(() => {
    greenScreenRef.current = greenScreen;
  }, [greenScreen]);

  const sceneActive = status === 'ready';
  const segmenter = useSegmenter(videoRef, sceneActive, greenScreen);
  const { mirrorRoot } = useThreeScene(
    canvasRef,
    videoRef,
    sceneActive,
    segmenter.maskRef,
    greenScreenRef,
  );

  const {
    status: faceStatus,
    error: faceError,
    refs: faceRefs,
  } = useFaceLandmarker(videoRef, sceneActive);

  const avatar = useAvatarRig(mirrorRoot, faceRefs.state);
  const recorder = useRecorder(canvasRef, stream);

  const onToggleTracking = () => {
    const next = !tracking;
    setTrackingState(next);
    avatar.setTracking(next);
  };

  const onCalibrate = () => {
    setCalibrating(true);
    avatar.startCalibration(1500);
    window.setTimeout(() => setCalibrating(false), 1500);
  };

  const onToggleRec = () => {
    if (recorder.status === 'recording') recorder.stop();
    else recorder.start();
  };

  const onToggleGreenScreen = () => setGreenScreen((g) => !g);

  return (
    <div className="app">
      <div className="stage">
        <CameraView ref={videoRef} />
        <canvas ref={canvasRef} className="render-canvas" />
        <DebugOverlay
          stateRef={faceRefs.state}
          expressionRef={avatar.expression}
          fpsRef={faceRefs.fps}
          visible={debug}
        />
        {calibrating && <div className="calibrate-banner">無表情で 1.5 秒キープ…</div>}
        {greenScreen && segmenter.status === 'loading' && (
          <div className="calibrate-banner">グリーンバック準備中…</div>
        )}
        {recorder.status === 'recording' && (
          <div className="rec-indicator">
            <span className="rec-indicator__dot" /> REC
          </div>
        )}
        {status === 'idle' && !error && (
          <div className="hint">
            「カメラ開始」をタップして撮影開始
            <br />
            <small>iOS は Safari + HTTPS が必要です</small>
          </div>
        )}
        <DownloadLink recording={recorder.recording} onClear={recorder.clear} />
      </div>

      <ControlPanel
        camStatus={status}
        camError={error}
        faceStatus={faceStatus}
        faceError={faceError}
        recStatus={recorder.status}
        tracking={tracking}
        calibrating={calibrating}
        debug={debug}
        greenScreen={greenScreen}
        segmenterStatus={segmenter.status}
        segmenterError={segmenter.error}
        onStart={() => void start()}
        onStop={stop}
        onToggleTracking={onToggleTracking}
        onCalibrate={onCalibrate}
        onToggleRec={onToggleRec}
        onToggleDebug={() => setDebug((d) => !d)}
        onToggleGreenScreen={onToggleGreenScreen}
      />
    </div>
  );
}
