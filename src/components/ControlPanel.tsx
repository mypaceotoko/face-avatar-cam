import { useState } from 'react';
import { CHARACTER_ORDER, CHARACTERS, type CharacterType } from '../three/avatarCharacters';
import {
  CAMERA_MODE_LABEL,
  type CameraMode,
  type CameraStatus,
} from '../hooks/useCamera';
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
  characterType: CharacterType;
  cameraMode: CameraMode;
  availableCameraModes: CameraMode[];
  onStart: () => void;
  onStop: () => void;
  onToggleTracking: () => void;
  onCalibrate: () => void;
  onToggleRec: () => void;
  onToggleDebug: () => void;
  onToggleGreenScreen: () => void;
  onCycleCamera: () => void;
  onCharacterChange: (type: CharacterType) => void;
  torchOn: boolean;
  torchSupported: boolean;
  onToggleTorch: () => void;
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
  characterType,
  cameraMode,
  availableCameraModes,
  onStart,
  onStop,
  onToggleTracking,
  onCalibrate,
  onToggleRec,
  onToggleDebug,
  onToggleGreenScreen,
  onCycleCamera,
  onCharacterChange,
  torchOn,
  torchSupported,
  onToggleTorch,
}: Props) {
  const cameraCycleDisabled = availableCameraModes.length <= 1;
  const [pickerOpen, setPickerOpen] = useState(false);
  const currentLabel = CHARACTERS[characterType].labelJa;
  return (
    <div className="controls">
      {/* Single trigger button — opens a modal grid picker. Keeps the
          control bar compact regardless of how many avatars are available. */}
      <button
        className="btn btn--face-trigger"
        onClick={() => setPickerOpen(true)}
        aria-label="アバターを選択"
      >
        <span className="btn__caption">アバター</span>
        <span className="btn__value">{currentLabel}</span>
        <span className="btn__chevron">▾</span>
      </button>

      {pickerOpen && (
        <div
          className="picker-backdrop"
          onClick={() => setPickerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="picker-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="picker-header">
              <span className="picker-title">アバターを選択</span>
              <button
                className="picker-close"
                onClick={() => setPickerOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="picker-grid">
              {CHARACTER_ORDER.map((type) => (
                <button
                  key={type}
                  className={`picker-cell ${characterType === type ? 'picker-cell--active' : ''}`}
                  onClick={() => {
                    onCharacterChange(type);
                    setPickerOpen(false);
                  }}
                >
                  {CHARACTERS[type].labelJa}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <button
            className="btn"
            onClick={onCycleCamera}
            disabled={cameraCycleDisabled}
            title={
              cameraCycleDisabled
                ? 'この端末では切り替え可能なカメラが見つかりません'
                : 'タップで次のカメラへ'
            }
          >
            {CAMERA_MODE_LABEL[cameraMode]}
          </button>
          {torchSupported && (
            <button
              className={`btn btn--torch ${torchOn ? 'btn--torch--on' : ''}`}
              onClick={onToggleTorch}
              aria-label={torchOn ? 'ライト OFF' : 'ライト ON'}
              title={torchOn ? 'ライトを消す' : 'ライトを点ける'}
            >
              {torchOn ? '🔦 ON' : '🔦 OFF'}
            </button>
          )}
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
