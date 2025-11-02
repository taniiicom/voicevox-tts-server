# VOICEVOX TTS Frontend

VOICEVOX TTS サーバのフロントエンド（Next.js）

## 機能

- テキスト入力による音声合成
- 話者選択
- 話速、音高、抑揚、音量の調整
- 生成された音声の再生とダウンロード
- 環境変数による API URL の設定

## セットアップ

### 依存関係のインストール

```bash
cd frontend
npm install
```

### 環境変数の設定

`.env.local` ファイルを作成して、VOICEVOX TTS API の URL を設定します：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
# ローカル開発時
NEXT_PUBLIC_API_URL=http://localhost:8080

# Cloud Run デプロイ先を使用する場合
# NEXT_PUBLIC_API_URL=https://your-service-url.run.app
```

## 開発

開発サーバーを起動：

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## ビルド

プロダクションビルド：

```bash
npm run build
npm start
```

## デプロイ

### Vercel へのデプロイ

1. GitHub リポジトリにプッシュ
2. Vercel で新規プロジェクトをインポート
3. 環境変数 `NEXT_PUBLIC_API_URL` に Cloud Run の URL を設定
4. デプロイ

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|--------------|
| `NEXT_PUBLIC_API_URL` | VOICEVOX TTS API の URL | `http://localhost:8080` |

## 使い方

1. テキストボックスに音声合成したいテキストを入力
2. 話者を選択
3. 必要に応じて話速、音高、抑揚、音量を調整
4. 「音声を生成」ボタンをクリック
5. 生成された音声が再生され、ダウンロード可能になります

## 技術スタック

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

## ライセンス

MIT License
