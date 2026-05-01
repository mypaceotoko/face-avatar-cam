# Face Avatar Cam

ブラウザ完結で動く、顔だけを Memoji 風 3D アバターに置き換える撮影 Web アプリ。

- インカメラを取得し、ユーザーの顔(顔まわり)だけをリアルタイムで自作 3D アバターに差し替えて表示する
- 体や背景はそのままカメラ映像が見える
- 口の開閉、まばたき、眉、視線、頭の姿勢に追従
- ブラウザ内で録画 → ダウンロード可能
- Vite + React + TypeScript + Three.js + MediaPipe Tasks Vision FaceLandmarker
- 外部の有料 API なし、Apple Memoji や VRM などの既存資産も使わずに、Three.js プリミティブだけで Memoji 風ルックを自作

## 必要環境

- Node.js 18+
- ブラウザ:
  - PC: Chrome / Edge / Safari (最新)
  - 実機: iPhone Safari (iOS 16+ 推奨)、Android Chrome
- HTTPS で動作(`getUserMedia` の要件)

## セットアップ

```bash
npm install
npm run dev
```

`https://localhost:5173` を開く(自己署名証明書のため初回は警告を承認)。

iPhone 実機テスト:同 LAN の PC で `npm run dev` し、PC の IP に HTTPS でアクセス。例:

```
https://192.168.1.10:5173
```

Vite の `@vitejs/plugin-basic-ssl` で自己署名証明書が発行されるため、iPhone 側でも一度警告を承認すれば使える。

## 使い方

1. 「カメラ開始」をタップ → カメラとマイク許可
2. 顔を正面に向け、無表情で **「キャリブレ」** をタップ(1.5 秒静止) — 表情の中立点が学習されます
3. 「追従 ON」状態で口・目・眉・頭の動きがアバターに反映
4. 「録画開始」→「録画停止」→ プレビューと「ダウンロード」が表示されます
5. 「Debug」をタップすると FPS と blendshape の値が見えます

## ファイル構成

```
src/
├── main.tsx                          # エントリ
├── App.tsx                           # 全体オーケストレーション
├── styles.css
├── components/
│   ├── CameraView.tsx                # 非表示の <video>(getUserMedia 結果)
│   ├── ControlPanel.tsx              # ボタン群
│   ├── DebugOverlay.tsx              # FPS + blendshape 可視化
│   └── DownloadLink.tsx              # 録画プレビュー + ダウンロード
├── hooks/
│   ├── useCamera.ts                  # getUserMedia + iOS playsinline
│   ├── useThreeScene.ts              # Three.js renderer / scene / camera
│   ├── useFaceLandmarker.ts          # MediaPipe ランナー(rAF ループ)
│   ├── useAvatarRig.ts               # アバター生成 + 毎フレーム適用
│   └── useRecorder.ts                # MediaRecorder ラッパー
├── three/
│   ├── createAvatar.ts               # Memoji 風メッシュ階層を構築
│   ├── avatarMaterials.ts            # 肌・髪・目・口などのマテリアル
│   ├── createBackgroundPlane.ts      # video → VideoTexture → Plane
│   ├── alignCameraToVideo.ts         # FOV/aspect 整合(63°)
│   └── applyExpression.ts            # blendshape → アバター transform
├── face/
│   ├── types.ts                      # FaceState / Blendshape 型
│   ├── extractFaceState.ts           # FaceLandmarker 結果 → FaceState
│   ├── smoothing.ts                  # チャネル別 EMA
│   └── calibration.ts                # 中立基準値の取得・差分適用
└── utils/
    └── mime.ts                       # MediaRecorder mime fallback
```

## どこで何をしているか

### カメラ
`useCamera.ts` で `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })`。iPhone Safari 対策で `<video>` には `playsinline / muted / autoplay` を必ず付ける。`<video>` 自体はオフスクリーンに置き、表示は Three.js 側の `VideoTexture` 経由。

### 顔トラッキング
`useFaceLandmarker.ts` で `@mediapipe/tasks-vision` の `FaceLandmarker` を `runningMode: 'VIDEO'` で起動。毎フレーム `detectForVideo(video, performance.now())` を呼び、

- `faceBlendshapes[0].categories`(jawOpen, eyeBlinkLeft 等の 0..1)
- `facialTransformationMatrixes[0].data`(列優先 16 要素、cm 単位)

を取得して `extractFaceState.ts` で `FaceState` に整形。

### 平滑化とキャリブレーション
`smoothing.ts` のチャネル別 EMA で表情のジッタを抑える。瞬き(`eyeBlinkLeft/Right`)は α=0.65 と速め、口・眉は α≈0.3 でゆっくり。
`calibration.ts` は短時間 blendshape を平均して中立値として保存し、適用時に差し引く。これでデフォルトで眉が上がっている人や口元が緩い人でも 0 が 0 になる。

### 3D アバター
`createAvatar.ts` で全部 Three.js プリミティブ(SphereGeometry / TorusGeometry / BoxGeometry / CircleGeometry)で組み立てる。Apple Memoji や VRM は使っていない。

主な構成:
- 黄色い球状の頭(emoji 風肌色 #f6c945、わずかに縦長)
- 11 個ほどの「毛束(クランプ)」を頭頂〜前髪に配置して彫刻調の Memoji 髪を再現
- 大きい白目 + ブラウンの虹彩 + 黒目 + 小さな白ハイライト
- 肌色の上まぶた(scale.y で blink)
- 太めのブラウン眉(blendshape で y 位置と回転)
- ピンクの唇(Torus を平らに潰す)+ 暗赤色の口腔(jawOpen で scale.y)

### 表情の反映
`applyExpression.ts` が blendshape を rig handles にマッピング:

| blendshape | 反映先 |
|---|---|
| jawOpen | mouthCavity / lipsOuter の scale.y |
| mouthClose | mouthGroup の縦スケール抑制 |
| mouthSmile* | mouthGroup の position.y を上げる |
| mouthPucker | 横を縮め奥に伸ばす |
| eyeBlink* | 上まぶたの scale.y |
| eyeLookIn/Out/Up/Down | irisRoot の rotation |
| browInnerUp / browOuterUp* / browDown* | 各眉の position.y と rotation.z |

### 顔位置合わせ
`createBackgroundPlane.ts` でカメラ映像を `VideoTexture` 化し、Three シーンの奥に `object-fit: contain` 相当で配置。`alignCameraToVideo.ts` でカメラ FOV を **63°(MediaPipe 仮想カメラと整合)**、シーン単位を **cm** に統一。`applyHeadPose` が `facialTransformationMatrix` を decompose して、translation と rotation だけアバター root にスムーズに適用(scale はアバター造形時の固定値を維持)。前面カメラ慣例の左右反転は `mirrorRoot.scale.x = -1` でまとめて適用。

### 合成と録画
背景の `VideoTexture` プレーンの上に 3D アバターが乗っているだけなので、頭まわりは自然にアバターで覆われ、首・肩・服・背景はカメラ映像のまま見える。
`useRecorder.ts` が `canvas.captureStream(30)` の映像トラックと `getUserMedia` のオーディオトラックを合成し、`MediaRecorder` で録画。`utils/mime.ts` が VP9/Opus → VP8 → WebM → mp4(H264/AAC)→ mp4 の順に対応 mime を試す。`canvas.captureStream` 自体が無いブラウザでは UI 上で「rec:unsupported」を表示。

## iOS Safari 注意点

- HTTPS が必須。LAN 越しのテストは `@vitejs/plugin-basic-ssl` の自己署名で OK
- カメラ許可は **必ずユーザータップ起点** で呼ぶ(本アプリでは「カメラ開始」)
- `<video>` には `playsinline + muted + autoplay`(本実装で対応済み)
- 古い iOS では `MediaRecorder` や `canvas.captureStream` が無い → 録画ボタンを自動で隠す
- 背景タブから戻ったとき WebGL コンテキストロストが起きることがある → `webglcontextlost` で `preventDefault` 済み

## 既知の制限・改善余地

- 顔の元映像は完全には消えていない(アバターが頭ごと覆って隠す形)。完全に置換するには Selfie Segmentation で元の顔領域を黒塗り or マスクするのが次の改善
- 端末ごとのカメラ画角差で位置がわずかにずれる。FOV を可変にしてキャリブレで合わせ込むことで改善可能
- 頭だけが浮いて見える → ネックメッシュやフェードで馴染ませる余地
- iOS Safari の録画は構成によって不安定。安定化には WebCodecs + Mp4Box.js による自前 mp4 生成が候補

## ライセンス / 著作権

3D アバターはすべて Three.js プリミティブからの自作。Apple Memoji の素材・モデルは一切使用していない。
