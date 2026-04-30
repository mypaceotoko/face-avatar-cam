import { useEffect, useState } from 'react';
import { BLENDSHAPE_CHANNELS, type FaceState } from '../face/types';

type Props = {
  stateRef: React.MutableRefObject<FaceState>;
  fpsRef: React.MutableRefObject<number>;
  visible: boolean;
};

const DISPLAY_KEYS = [
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
] as const satisfies readonly (typeof BLENDSHAPE_CHANNELS)[number][];

export function DebugOverlay({ stateRef, fpsRef, visible }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [visible]);
  if (!visible) return null;
  const s = stateRef.current;
  const fps = fpsRef.current;
  return (
    <div className="debug-overlay" data-tick={tick}>
      <div className="debug-row">
        <span>FPS</span>
        <span>{fps.toFixed(0)}</span>
      </div>
      <div className="debug-row">
        <span>detected</span>
        <span>{s.detected ? 'yes' : 'no'}</span>
      </div>
      {DISPLAY_KEYS.map((k) => {
        const v = s.bs[k] ?? 0;
        return (
          <div className="debug-row" key={k}>
            <span>{k}</span>
            <span className="debug-bar">
              <span className="debug-bar__fill" style={{ width: `${Math.min(1, v) * 100}%` }} />
            </span>
            <span className="debug-num">{v.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}
