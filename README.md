# Face Avatar Cam

ブラウザ完結で動く、顔だけ Memoji 風 3D アバターに置き換える撮影 Web アプリ。

> Step 1 の雛形のみ。続きは Step 2 以降で実装。

## 必要環境

- Node.js 18+
- ブラウザ: Chrome / Safari(iPhone Safari は iOS 16+ 推奨)
- HTTPS で動作(getUserMedia の要件)

## セットアップ

```bash
npm install
npm run dev
```

`https://localhost:5173` でアクセス。自己署名証明書のため初回は警告を承認する。

iPhone 実機テスト:同 LAN の PC で `npm run dev` し、PC の IP に HTTPS でアクセス。
