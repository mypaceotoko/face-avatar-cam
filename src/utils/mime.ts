// MediaRecorder mimeType picker. mp4 is preferred so the saved clip is playable
// on iOS Photos / Files (which can't open WebM). Falls through to WebM on
// browsers whose MediaRecorder doesn't expose an mp4 encoder (older Chrome /
// Firefox).
const CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

export function fileExtensionForMime(mime: string): string {
  if (mime.startsWith('video/mp4')) return 'mp4';
  return 'webm';
}

/** captureStream is missing on some iOS Safari builds even when MediaRecorder
 *  itself exists; both must work for in-browser recording. */
export function canRecordCanvas(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  if (
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function'
  ) {
    return false;
  }
  return pickMimeType() !== null;
}
