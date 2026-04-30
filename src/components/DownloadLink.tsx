import type { Recording } from '../hooks/useRecorder';

type Props = {
  recording: Recording | null;
  onClear: () => void;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function DownloadLink({ recording, onClear }: Props) {
  if (!recording) return null;
  return (
    <div className="download-card">
      <video src={recording.url} controls className="download-card__preview" />
      <div className="download-card__meta">
        <span>{formatDuration(recording.durationMs)}</span>
        <span>{formatBytes(recording.sizeBytes)}</span>
      </div>
      <div className="download-card__actions">
        <a className="btn btn--primary" href={recording.url} download={recording.filename}>
          ダウンロード
        </a>
        <button className="btn" onClick={onClear}>
          破棄
        </button>
      </div>
    </div>
  );
}
