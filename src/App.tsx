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
import { type CharacterType } from './three/avatarCharacters';

export function App() {
  const {
    videoRef,
    stream,
    status,
    error,
    start,
    stop,
    mode,
    availableModes,
    setMode,
    torchOn,
    torchSupported,
    toggleTorch,
  } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debug, setDebug] = useState(false);
  const [tracking, setTrackingState] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [greenScreen, setGreenScreen] = useState(false);
  const [characterType, setCharacterType] = useState<CharacterType>('child');
  const [screenFlash, setScreenFlash] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Screen flash off when camera mode changes or stops
  useEffect(() => {
    setScreenFlash(false);
  }, [mode, status]);

  // Keep screen awake while flash is on
  useEffect(() => {
    if (screenFlash && 'wakeLock' in navigator) {
      (navigator.wakeLock as { request(t: string): Promise<WakeLockSentinel> })
        .request('screen')
        .then((lock) => { wakeLockRef.current = lock; })
        .catch(() => {});
    } else {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [screenFlash]);

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

  // Front camera frames are mirrored so the user reads them as a selfie. Back
  // camera frames are world-facing, so leave them un-mirrored. Toggling the
  // root flips both the video plane and the avatar in lock-step.
  useEffect(() => {
    if (!mirrorRoot) return;
    mirrorRoot.scale.x = mode === 'front' || mode === 'front-wide' ? -1 : 1;
  }, [mirrorRoot, mode]);

  const {
    status: faceStatus,
    error: faceError,
    refs: faceRefs,
  } = useFaceLandmarker(videoRef, sceneActive);

  const avatar = useAvatarRig(mirrorRoot, faceRefs.state, characterType);
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

  const lightOn = torchOn || screenFlash;
  const onToggleLight = () => {
    if (torchSupported) void toggleTorch();
    else setScreenFlash((f) => !f);
  };

  const onCycleCamera = () => {
    if (availableModes.length <= 1) return;
    const idx = availableModes.indexOf(mode);
    const next = availableModes[(idx + 1) % availableModes.length];
    void setMode(next);
  };

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
        {screenFlash && (
          <div className="screen-flash" onClick={() => setScreenFlash(false)}>
            <span className="screen-flash__hint">タップでライトOFF</span>
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
        characterType={characterType}
        cameraMode={mode}
        availableCameraModes={availableModes}
        onStart={() => void start()}
        onStop={stop}
        onToggleTracking={onToggleTracking}
        onCalibrate={onCalibrate}
        onToggleRec={onToggleRec}
        onToggleDebug={() => setDebug((d) => !d)}
        onToggleGreenScreen={onToggleGreenScreen}
        onCycleCamera={onCycleCamera}
        onCharacterChange={setCharacterType}
        lightOn={lightOn}
        onToggleLight={onToggleLight}
      />
    </div>
  );
}
