import { useRef, useState } from 'react';
import { CameraView } from './components/CameraView';
import { DebugOverlay } from './components/DebugOverlay';
import { DownloadLink } from './components/DownloadLink';
import { useAvatarRig } from './hooks/useAvatarRig';
import { useCamera } from './hooks/useCamera';
import { useFaceLandmarker } from './hooks/useFaceLandmarker';
import { useRecorder } from './hooks/useRecorder';
import { useThreeScene } from './hooks/useThreeScene';

export function App() {
  const { videoRef, stream, status, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debug, setDebug] = useState(false);
  const [tracking, setTrackingState] = useState(true);
  const [calibrating, setCalibrating] = useState(false);

  const sceneActive = status === 'ready';
  const { mirrorRoot } = useThreeScene(canvasRef, videoRef, sceneActive);

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

  return (
    <div className="app">
      <div className="stage">
        <CameraView ref={videoRef} />
        <canvas ref={canvasRef} className="render-canvas" />
        <DebugOverlay stateRef={faceRefs.state} fpsRef={faceRefs.fps} visible={debug} />
        {calibrating && <div className="calibrate-banner">無表情で 1.5 秒キープ…</div>}
        {recorder.status === 'recording' && (
          <div className="rec-indicator">
            <span className="rec-indicator__dot" /> REC
          </div>
        )}
        <DownloadLink recording={recorder.recording} onClear={recorder.clear} />
      </div>

      <div className="controls">
        {status !== 'ready' ? (
          <button
            className="btn btn--primary"
            onClick={() => void start()}
            disabled={status === 'starting'}
          >
            {status === 'starting' ? '起動中…' : 'カメラ開始'}
          </button>
        ) : (
          <>
            <button className="btn" onClick={stop}>
              停止
            </button>
            <button
              className={`btn ${tracking ? 'btn--primary' : ''}`}
              onClick={onToggleTracking}
            >
              追従 {tracking ? 'ON' : 'OFF'}
            </button>
            <button className="btn" onClick={onCalibrate} disabled={calibrating}>
              {calibrating ? '取得中…' : 'キャリブレ'}
            </button>
            {recorder.status !== 'unsupported' && (
              <button
                className={`btn ${recorder.status === 'recording' ? 'btn--danger' : 'btn--primary'}`}
                onClick={onToggleRec}
              >
                {recorder.status === 'recording' ? '録画停止' : '録画開始'}
              </button>
            )}
          </>
        )}
        <button className="btn btn--ghost" onClick={() => setDebug((d) => !d)}>
          Debug {debug ? 'OFF' : 'ON'}
        </button>
        <span className="status">
          cam:{status}
          {error ? ` — ${error}` : ''} / face:{faceStatus}
          {faceError ? ` — ${faceError}` : ''}
          {recorder.status === 'unsupported' && ' / rec:unsupported'}
        </span>
      </div>
    </div>
  );
}
