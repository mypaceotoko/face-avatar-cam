import { forwardRef } from 'react';

type Props = {
  mirrored?: boolean;
};

// Front camera is conventionally mirrored. Step 3 wraps this in a Three.js
// background plane; until then we just show the raw video.
export const CameraView = forwardRef<HTMLVideoElement, Props>(function CameraView(
  { mirrored = true },
  ref,
) {
  return (
    <video
      ref={ref}
      className="camera-view"
      style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
      playsInline
      muted
      autoPlay
    />
  );
});
