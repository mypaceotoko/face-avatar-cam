import { useEffect, useState } from 'react';
import {
  EMOTION_NAMES,
  type EmotionName,
  type ExpressionState,
  type FaceState,
} from '../face/types';

type Props = {
  stateRef: React.MutableRefObject<FaceState>;
  expressionRef: React.MutableRefObject<ExpressionState>;
  fpsRef: React.MutableRefObject<number>;
  visible: boolean;
};

// Compact debug view of the engine output. Three sections:
//   - status (fps / detected / dominant emotion / viseme)
//   - core channel bars (mouth open, smile, blink, brows...)
//   - emotion bars (happy, angry, ...)
const EMOTION_COLOR: Record<EmotionName, string> = {
  neutral: '#666',
  happy: '#ffd24a',
  laughing: '#ff8a4a',
  surprised: '#4ab3ff',
  angry: '#ff5a5a',
  sad: '#5a8aff',
  confused: '#b08aff',
};

export function DebugOverlay({ stateRef, expressionRef, fpsRef, visible }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [visible]);
  if (!visible) return null;

  const s = stateRef.current;
  const e = expressionRef.current;
  const fps = fpsRef.current;

  const channels: Array<[string, number]> = [
    ['mouth.open', e.mouth.open],
    ['mouth.smile', e.mouth.smile],
    ['mouth.frown', e.mouth.frown],
    ['mouth.pucker', e.mouth.pucker],
    ['mouth.wide', (e.mouth.wide + 1) / 2],
    ['mouth.speak', e.mouth.speakIntensity],
    ['mouth.shout', e.mouth.shoutness],
    ['mouth.teeth', e.mouth.teethVisible],
    ['eye.blinkL', e.eyes.blinkL],
    ['eye.blinkR', e.eyes.blinkR],
    ['eye.squintL', e.eyes.squintL],
    ['eye.squintR', e.eyes.squintR],
    ['eye.wideL', e.eyes.wideL],
    ['eye.wideR', e.eyes.wideR],
    ['eye.lookX', (e.eyes.lookX + 1) / 2],
    ['eye.lookY', (e.eyes.lookY + 1) / 2],
    ['brow.raiseL', e.brows.raiseL],
    ['brow.raiseR', e.brows.raiseR],
    ['brow.downL', e.brows.downL],
    ['brow.downR', e.brows.downR],
    ['brow.innerUp', e.brows.innerUp],
    ['cheek.raiseL', e.cheeks.raiseL],
    ['cheek.raiseR', e.cheeks.raiseR],
  ];

  return (
    <div className="debug-overlay" data-tick={tick}>
      <div className="debug-row">
        <span>fps</span>
        <span className="debug-bar">
          <span className="debug-bar__fill" style={{ width: `${Math.min(60, fps) / 60 * 100}%` }} />
        </span>
        <span className="debug-num">{fps.toFixed(0)}</span>
      </div>
      <div className="debug-row">
        <span>detected</span>
        <span>{s.detected ? 'yes' : 'no'}</span>
        <span />
      </div>
      <div className="debug-row">
        <span>viseme</span>
        <span>{e.mouth.viseme}</span>
        <span />
      </div>
      <div className="debug-row">
        <span>emotion</span>
        <span style={{ color: EMOTION_COLOR[e.dominant] }}>{e.dominant}</span>
        <span className="debug-num">{e.intensity.toFixed(2)}</span>
      </div>
      <div className="debug-divider" />
      {EMOTION_NAMES.map((n) => {
        const v = e.emotions[n] ?? 0;
        return (
          <div className="debug-row" key={`emo-${n}`}>
            <span>{n}</span>
            <span className="debug-bar">
              <span
                className="debug-bar__fill"
                style={{ width: `${Math.min(1, v) * 100}%`, background: EMOTION_COLOR[n] }}
              />
            </span>
            <span className="debug-num">{v.toFixed(2)}</span>
          </div>
        );
      })}
      <div className="debug-divider" />
      {channels.map(([k, v]) => (
        <div className="debug-row" key={k}>
          <span>{k}</span>
          <span className="debug-bar">
            <span className="debug-bar__fill" style={{ width: `${Math.min(1, v) * 100}%` }} />
          </span>
          <span className="debug-num">{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
