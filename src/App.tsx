import { useRef, useState } from 'react';
import { CameraView } from './components/CameraView';
import { DebugOverlay } from './components/DebugOverlay';
import { useAvatarRig } from './hooks/useAvatarRig';
import { useCamera } from './hooks/useCamera';
import { useFaceLandmarker } from './hooks/useFaceLandmarker';
import { useThreeScene } from './hooks/useThreeScene';

export function App() {
  const { videoRef, status, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debug, setDebug] = useState(true);

  const sceneActive = status === 'ready';
  const { mirrorRoot } = useThreeScene(canvasRef, videoRef, sceneActive);

  const {
    status: faceStatus,
    error: faceError,
    refs: faceRefs,
  } = useFaceLandmarker(videoRef, sceneActive);

  useAvatarRig(mirrorRoot);

  return (
    <div className="app">
      <div className="stage">
        <CameraView ref={videoRef} />
        <canvas ref={canvasRef} className="render-canvas" />
        <DebugOverlay stateRef={faceRefs.state} fpsRef={faceRefs.fps} visible={debug} />
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
          <button className="btn" onClick={stop}>
            停止
          </button>
        )}
        <button className="btn" onClick={() => setDebug((d) => !d)}>
          Debug {debug ? 'OFF' : 'ON'}
        </button>
        <span className="status">
          cam:{status}
          {error ? ` — ${error}` : ''} / face:{faceStatus}
          {faceError ? ` — ${faceError}` : ''}
        </span>
      </div>
    </div>
  );
}
