import type { CameraStatus } from '../hooks/useCamera';
import type { RecorderStatus } from '../hooks/useRecorder';
import type { SegmenterStatus } from '../hooks/useSegmenter';

type Props = {
  camStatus: CameraStatus;
  camError: string | null;
  faceStatus: string;
  faceError: string | null;
  recStatus: RecorderStatus;
  tracking: boolean;
  calibrating: boolean;
  debug: boolean;
  greenScreen: boolean;
  segmenterStatus: SegmenterStatus;
  segmenterError: string | null;
  onStart: () => void;
  onStop: () => void;
  onToggleTracking: () => void;
  onCalibrate: () => void;
  onToggleRec: () => void;
  onToggleDebug: () => void;
  onToggleGreenScreen: () => void;
};

export function ControlPanel({
  camStatus,
  camError,
  faceStatus,
  faceError,
  recStatus,
  tracking,
  calibrating,
  debug,
  greenScreen,
  segmenterStatus,
  segmenterError,
  onStart,
  onStop,
  onToggleTracking,
  onCalibrate,
  onToggleRec,
  onToggleDebug,
  onToggleGreenScreen,
}: Props) {
  return (
    <div className="controls">
      {camStatus !== 'ready' ? (
        <button
          className="btn btn--primary"
          onClick={onStart}
          disabled={camStatus === 'starting'}
        >
          {camStatus === 'starting' ? '起動中…' : 'カメラ開始'}
        </button>
      ) : (
        <>
          <button className="btn" onClick={onStop}>
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
          <button
            className={`btn ${greenScreen ? 'btn--green' : ''}`}
            onClick={onToggleGreenScreen}
            disabled={greenScreen && segmenterStatus === 'loading'}
          >
            グリーンバック {greenScreen ? 'ON' : 'OFF'}
          </button>
          {recStatus !== 'unsupported' && (
            <button
              className={`btn ${recStatus === 'recording' ? 'btn--danger' : 'btn--primary'}`}
              onClick={onToggleRec}
            >
              {recStatus === 'recording' ? '録画停止' : '録画開始'}
            </button>
          )}
        </>
      )}
      <button className="btn btn--ghost" onClick={onToggleDebug}>
        Debug {debug ? 'OFF' : 'ON'}
      </button>
      <span className="status">
        cam:{camStatus}
        {camError ? ` — ${camError}` : ''} / face:{faceStatus}
        {faceError ? ` — ${faceError}` : ''}
        {greenScreen && ` / seg:${segmenterStatus}`}
        {segmenterError ? ` — ${segmenterError}` : ''}
        {recStatus === 'unsupported' && ' / rec:unsupported'}
      </span>
    </div>
  );
}
