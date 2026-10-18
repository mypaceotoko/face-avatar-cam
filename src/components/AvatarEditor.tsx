import { useState } from "react";
import {
  DEFAULT_SETTINGS,
  PRESETS,
  SKIN_TONES,
  type AvatarSettings,
} from "../avatar/settings";
export function AvatarEditor({
  settings,
  onChange,
}: {
  settings: AvatarSettings;
  onChange: (s: AvatarSettings) => void;
}) {
  const [tab, setTab] = useState("face");
  const update = <K extends keyof AvatarSettings>(
    key: K,
    value: AvatarSettings[K],
  ) => onChange({ ...settings, [key]: value });
  function slider(
    key:
      | "faceWidth"
      | "jaw"
      | "eyeSize"
      | "eyeShape"
      | "browArch"
      | "nose"
      | "lips",
    label: string,
    min = 0,
    max = 1,
  ) {
    return (
      <label className="slider-field" key={key}>
        <span>{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          step="0.01"
          value={settings[key]}
          onChange={(e) => update(key, Number(e.target.value))}
        />
        <output>
          {Math.round(((settings[key] - min) / (max - min)) * 100)}
        </output>
      </label>
    );
  }
  function swatches(
    key: "skin" | "hair" | "iris",
    colors: string[],
    label: string,
  ) {
    return (
      <fieldset className="swatch-field">
        <legend>{label}</legend>
        <div className="swatches">
          {colors.map((color, i) => (
            <button
              key={color}
              className={`swatch ${settings[key] === color ? "selected" : ""}`}
              style={{ background: color }}
              aria-label={`${label} ${i + 1}`}
              aria-pressed={settings[key] === color}
              onClick={() => update(key, color)}
            />
          ))}
          <label className="custom-color" title={`${label}を自由に選ぶ`}>
            ＋
            <input
              aria-label={`${label}を自由に選ぶ`}
              type="color"
              value={settings[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        </div>
      </fieldset>
    );
  }
  return (
    <section className="editor" aria-label="アバター編集">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h2>あなたらしい表情に。</h2>
        </div>
        <button
          className="text-btn"
          onClick={() => onChange({ ...DEFAULT_SETTINGS })}
        >
          リセット
        </button>
      </div>
      <div className="preset-row">
        {PRESETS.map((p, i) => (
          <button
            key={p.name}
            className="preset"
            onClick={() => onChange({ ...p.settings })}
          >
            <span
              className="preset-dot"
              style={{ background: p.settings.skin, color: p.settings.hair }}
            >
              {["H", "A", "N"][i]}
            </span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="editor-tabs" role="tablist" aria-label="編集カテゴリ">
        {[
          ["face", "顔と肌"],
          ["eyes", "目と眉"],
          ["hair", "ヘア"],
        ].map(([key, label]) => (
          <button
            key={key}
            id={`tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="editor-panel"
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="editor-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="editor-fields"
      >
        {tab === "face" && (
          <>
            {swatches("skin", SKIN_TONES, "肌のトーン")}
            {slider("faceWidth", "顔の幅", 0.88, 1.12)}
            {slider("jaw", "顎の丸み")}
            {slider("nose", "鼻の立体感")}
            {slider("lips", "唇の厚み")}
          </>
        )}
        {tab === "eyes" && (
          <>
            {swatches(
              "iris",
              ["#85552c", "#39291d", "#648076", "#7b93aa", "#948353"],
              "瞳の色",
            )}
            {slider("eyeSize", "目の大きさ", 0.85, 1.15)}
            {slider("eyeShape", "目の丸み")}
            {slider("browArch", "眉のアーチ")}
          </>
        )}
        {tab === "hair" && (
          <>
            {swatches(
              "hair",
              [
                "#493025",
                "#241b1a",
                "#714937",
                "#aa7443",
                "#d8b985",
                "#604455",
              ],
              "髪の色",
            )}
            <fieldset className="swatch-field">
              <legend>髪型</legend>
              <div className="segmented">
                {(
                  [
                    ["bob", "ボブ"],
                    ["short", "ショート"],
                    ["long", "ロング"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={settings.hairstyle === key}
                    onClick={() => update("hairstyle", key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="editor-note">
              立体的な毛束と、やわらかなブラウン。
              <br />
              ドラッグして横顔も確かめられます。
            </p>
          </>
        )}
      </div>
      <p className="save-note">設定はこのブラウザに自動保存されます</p>
    </section>
  );
}
