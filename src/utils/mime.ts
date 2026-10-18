// Prefer explicit H.264 MP4 for Photos compatibility. Generic MP4 can select
// VP9 on Chromium, so prefer WebM there when no H.264 encoder is available.
// Safari can still fall back to its native generic MP4 encoder.
const CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4;codecs=avc1.42E01E",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
];

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

export function fileExtensionForMime(mime: string): string {
  if (mime.startsWith("video/mp4")) return "mp4";
  return "webm";
}

/** captureStream is missing on some iOS Safari builds even when MediaRecorder
 *  itself exists; both must work for in-browser recording. */
export function canRecordCanvas(): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  if (
    typeof HTMLCanvasElement === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
    return false;
  }
  return pickMimeType() !== null;
}
