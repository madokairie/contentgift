# Content Gift — セットアップガイド

## クイックスタート（3ステップ）

### 1. 解凍 & 移動

```bash
unzip contentgift.zip
cd contentgift
```

### 2. APIキー設定

`.env.local` ファイルを作成:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-ここにAPIキーを貼り付け" > .env.local
```

> APIキーは https://console.anthropic.com/settings/keys から取得

### 3. 起動

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。完了!

> 画面右上の「📖 使い方」ボタンからアプリ内マニュアルも確認できます。

---

## 詳細セットアップ

### 前提条件

| 必要なもの | 入手先 |
|-----------|--------|
| Node.js v18+ | https://nodejs.org/ |
| Anthropic APIキー | https://console.anthropic.com/ |

### Node.jsのインストール確認

```bash
node -v
# v18.0.0 以上が表示されればOK
```

### ポートを変更する場合

```bash
npm run dev -- -p 3905
# http://localhost:3905 で開く
```

### 本番ビルド（高速化）

```bash
npm run build
npm start
```

---

## トラブルシューティング

### `npm install` でエラーが出る

```bash
node -v
# v18未満の場合は https://nodejs.org/ から最新LTSをダウンロード
```

### 起動時に `ANTHROPIC_API_KEY` エラー

`.env.local` ファイルが正しく作成されているか確認:

```bash
cat .env.local
# ANTHROPIC_API_KEY=sk-ant-... と表示されればOK
```

### アイデア生成やコンテンツ生成が失敗する

- APIキーが有効か確認（期限切れ、残高不足）
- インターネット接続を確認
- Anthropicのステータスを確認: https://status.anthropic.com/

### ポートが既に使用中

```bash
lsof -ti :3000
npm run dev -- -p 3001
```
