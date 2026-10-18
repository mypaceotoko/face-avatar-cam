import type { CameraStatus } from "../hooks/useCamera";
import type { RecorderStatus } from "../hooks/useRecorder";
type Props = {
  camStatus: CameraStatus;
  recStatus: RecorderStatus;
  tracking: boolean;
  faceDetected: boolean;
  calibrating: boolean;
  audio: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  onFlip: () => void;
  onToggleTracking: () => void;
  onCalibrate: () => void;
  onToggleRec: () => void;
  onPhoto: () => void;
  onAudio: (on: boolean) => void;
};
export function ControlPanel(p: Props) {
  const ready = p.camStatus === "ready",
    busy = p.recStatus === "recording" || p.recStatus === "stopping";
  return (
    <div className="controls">
      <div className="capture-actions">
        <button
          className="btn btn--primary"
          onClick={ready ? p.onStop : p.onStart}
          disabled={
            p.camStatus === "starting" ||
            p.recStatus === "stopping" ||
            (!ready && busy)
          }
        >
          {ready
            ? "カメラ停止"
            : p.camStatus === "starting"
              ? "接続中…"
              : "カメラ開始"}
        </button>
        <button
          className="shutter"
          aria-label="写真撮影"
          onClick={p.onPhoto}
          disabled={p.disabled || busy}
        >
          <span />
        </button>
        <button
          className={`btn ${busy ? "btn--danger" : ""}`}
          onClick={p.onToggleRec}
          disabled={
            p.disabled ||
            p.recStatus === "unsupported" ||
            p.recStatus === "stopping"
          }
        >
          {p.recStatus === "recording"
            ? "■ 録画停止"
            : p.recStatus === "stopping"
              ? "保存中…"
              : "● 動画録画"}
        </button>
      </div>
      <div className="camera-options">
        {ready ? (
          <>
            <button
              onClick={p.onToggleTracking}
              aria-pressed={p.tracking}
              disabled={busy}
            >
              顔追従 {p.tracking ? "ON" : "OFF"}
            </button>
            <button
              onClick={p.onCalibrate}
              disabled={p.calibrating || !p.tracking || !p.faceDetected}
            >
              {p.calibrating ? "取得中…" : "表情を補正"}
            </button>
            <button onClick={p.onFlip} disabled={busy}>
              カメラ切替
            </button>
          </>
        ) : (
          <label>
            <input
              type="checkbox"
              checked={p.audio}
              disabled={busy}
              onChange={(e) => p.onAudio(e.target.checked)}
            />{" "}
            マイクを使う
          </label>
        )}
      </div>
      {p.recStatus === "unsupported" && (
        <p className="status">
          このブラウザは動画録画に対応していません。写真撮影をご利用ください。
        </p>
      )}
    </div>
  );
}
