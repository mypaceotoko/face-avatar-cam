import { useRef } from 'react';
import { CameraView } from './components/CameraView';
import { useCamera } from './hooks/useCamera';
import { useThreeScene } from './hooks/useThreeScene';

export function App() {
  const { videoRef, status, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneActive = status === 'ready';
  useThreeScene(canvasRef, videoRef, sceneActive);

  return (
    <div className="app">
      <div className="stage">
        <CameraView ref={videoRef} />
        <canvas ref={canvasRef} className="render-canvas" />
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
        <span className="status">
          {status}
          {error ? ` — ${error}` : ''}
        </span>
      </div>
    </div>
  );
}
