import { CameraView } from './components/CameraView';
import { useCamera } from './hooks/useCamera';

export function App() {
  const { videoRef, status, error, start, stop } = useCamera();

  return (
    <div className="app">
      <div className="stage">
        <CameraView ref={videoRef} mirrored />
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
