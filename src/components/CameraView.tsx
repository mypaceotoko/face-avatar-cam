import { forwardRef } from 'react';

// The video element is now invisible — its frames are uploaded to a
// VideoTexture and drawn through Three.js. We keep it in the DOM so getUserMedia
// playback and FaceLandmarker.detectForVideo work.
export const CameraView = forwardRef<HTMLVideoElement>(function CameraView(_props, ref) {
  return (
    <video
      ref={ref}
      className="camera-view camera-view--hidden"
      playsInline
      muted
      autoPlay
    />
  );
});
