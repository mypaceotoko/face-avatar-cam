import { useState } from "react";
import type { Recording } from "../hooks/useRecorder";
export function DownloadLink({
  recording,
  onClear,
}: {
  recording: Recording | null;
  onClear: () => void;
}) {
  const [error, setError] = useState("");
  if (!recording) return null;
  const file = new File([recording.blob], recording.filename, {
    type: recording.mime,
  });
  const canShare =
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });
  const share = async () => {
    try {
      await navigator.share({ files: [file], title: "Face Avatar Studio" });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError("共有できませんでした。ダウンロードをご利用ください。");
    }
  };
  return (
    <section className="download-card" aria-label="撮影結果">
      <div className="download-card__meta">
        <strong>
          {recording.kind === "photo" ? "写真ができました" : "録画ができました"}
        </strong>
        <button
          className="icon-btn"
          aria-label="撮影結果を閉じる"
          onClick={onClear}
        >
          ×
        </button>
      </div>
      {recording.kind === "photo" ? (
        <img
          src={recording.url}
          className="download-card__preview"
          alt="撮影したアバター"
        />
      ) : (
        <video
          src={recording.url}
          controls
          playsInline
          className="download-card__preview"
        />
      )}
      <div className="download-card__actions">
        <a
          className="btn btn--primary"
          href={recording.url}
          download={recording.filename}
        >
          保存
        </a>
        {canShare && (
          <button className="btn" onClick={() => void share()}>
            共有
          </button>
        )}
      </div>
      <small>
        iPhoneでは共有メニューから「画像／ビデオを保存」を選べます。
      </small>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
