# VOICEVOX TTS Server for Cloud Run

VOICEVOX を使用したテキスト音声合成 API サーバです。Google Cloud Run にデプロイして使用できます。

## 機能

- FastAPI ベースの REST API
- VOICEVOX Engine を内蔵（起動時に自動起動）
- POST/GET 両方のリクエストに対応
- 話者選択、速度、音高、抑揚、音量の調整が可能
- ヘルスチェックエンドポイント
- 話者一覧取得

## API エンドポイント

### GET /
ヘルスチェック用のルートエンドポイント

### GET /health
VOICEVOX Engine への接続確認

### GET /speakers
利用可能な話者一覧を取得

### POST /synthesis
テキストから音声を合成（JSON リクエスト）

リクエストボディ:
```json
{
  "text": "こんにちは、VOICEVOX です",
  "speaker": 1,
  "speed_scale": 1.0,
  "pitch_scale": 0.0,
  "intonation_scale": 1.0,
  "volume_scale": 1.0
}
```

### GET /synthesis
テキストから音声を合成（クエリパラメータ）

使用例:
```
/synthesis?text=こんにちは&speaker=1&speed_scale=1.0
```

パラメータ:
- `text`: 音声合成するテキスト（必須）
- `speaker`: 話者ID（デフォルト: 1）
- `speed_scale`: 話速 0.5-2.0（デフォルト: 1.0）
- `pitch_scale`: 音高 -0.15-0.15（デフォルト: 0.0）
- `intonation_scale`: 抑揚 0.0-2.0（デフォルト: 1.0）
- `volume_scale`: 音量 0.0-2.0（デフォルト: 1.0）

## Cloud Run へのデプロイ

### 前提条件

1. Google Cloud アカウントと有効なプロジェクト
2. gcloud CLI のインストールと認証
3. Cloud Build API と Cloud Run API の有効化

### デプロイ手順

#### 1. Google Cloud プロジェクトの設定

```bash
# プロジェクトIDを設定
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# 必要な API を有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 2. Cloud Build を使用したデプロイ

```bash
# Cloud Build でビルドとデプロイを実行
gcloud builds submit --config cloudbuild.yaml
```

このコマンドで以下が自動的に実行されます:
- Docker イメージのビルド
- Container Registry へのプッシュ
- Cloud Run へのデプロイ

#### 3. 手動デプロイ（オプション）

Cloud Build を使わない場合:

```bash
# Docker イメージのビルド
docker build -t gcr.io/$PROJECT_ID/voicevox-tts-server .

# Container Registry にプッシュ
docker push gcr.io/$PROJECT_ID/voicevox-tts-server

# Cloud Run にデプロイ
gcloud run deploy voicevox-tts-server \
  --image gcr.io/$PROJECT_ID/voicevox-tts-server \
  --platform managed \
  --region asia-northeast1 \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300s \
  --max-instances 10 \
  --allow-unauthenticated
```

### デプロイ設定の調整

`cloudbuild.yaml` でデプロイ設定をカスタマイズできます:

- `--memory`: メモリ量（推奨: 4Gi 以上）
- `--cpu`: CPU 数（推奨: 2 以上）
- `--timeout`: タイムアウト時間
- `--max-instances`: 最大インスタンス数
- `--region`: デプロイリージョン
- `--allow-unauthenticated`: 認証なしでアクセスを許可

## ローカルでの開発・テスト

### 依存関係のインストール

```bash
pip install -r requirements.txt
```

### ローカルで VOICEVOX Engine を起動

別のターミナルで VOICEVOX Engine を起動する必要があります:

```bash
# VOICEVOX Engine をダウンロードして起動
# https://github.com/VOICEVOX/voicevox_engine/releases
```

### TTS サーバの起動

```bash
python main.py
```

サーバは http://localhost:8080 で起動します。

### Docker での起動

```bash
# イメージのビルド
docker build -t voicevox-tts-server .

# コンテナの起動
docker run -p 8080:8080 voicevox-tts-server
```

## 使用例

### cURL での使用

```bash
# 話者一覧を取得
curl https://your-service-url.run.app/speakers

# GET リクエストで音声合成
curl "https://your-service-url.run.app/synthesis?text=こんにちは" \
  --output speech.wav

# POST リクエストで音声合成
curl -X POST https://your-service-url.run.app/synthesis \
  -H "Content-Type: application/json" \
  -d '{
    "text": "こんにちは、VOICEVOXです",
    "speaker": 1,
    "speed_scale": 1.2
  }' \
  --output speech.wav
```

### Python での使用

```python
import requests

url = "https://your-service-url.run.app/synthesis"

# POST リクエスト
response = requests.post(url, json={
    "text": "こんにちは、VOICEVOXです",
    "speaker": 1,
    "speed_scale": 1.0
})

with open("speech.wav", "wb") as f:
    f.write(response.content)
```

## 主要な話者 ID

- 1: 四国めたん（ノーマル）
- 3: ずんだもん（ノーマル）
- 8: 春日部つむぎ（ノーマル）

完全な話者リストは `/speakers` エンドポイントで取得できます。

## 料金について

Cloud Run の料金は以下の要素で決まります:
- リクエスト数
- CPU 使用時間
- メモリ使用量
- ネットワーク送信量

詳細は [Cloud Run の料金](https://cloud.google.com/run/pricing) を参照してください。

## トラブルシューティング

### デプロイが失敗する場合

1. メモリ不足: `--memory` を 4Gi 以上に設定
2. タイムアウト: `--timeout` を延長
3. ビルド時間が長い: `cloudbuild.yaml` の `timeout` を延長

### 音声合成が遅い場合

- CPU 数を増やす（`--cpu 4` など）
- `CPU_NUM_THREADS` 環境変数を調整

## ライセンス

このプロジェクトは MIT ライセンスです。

VOICEVOX Engine は [LGPL v3](https://github.com/VOICEVOX/voicevox_engine/blob/master/LGPL_LICENSE) および [各キャラクターの利用規約](https://voicevox.hiroshiba.jp/term/)に従います。

## 参考リンク

- [VOICEVOX](https://voicevox.hiroshiba.jp/)
- [VOICEVOX Engine](https://github.com/VOICEVOX/voicevox_engine)
- [Google Cloud Run](https://cloud.google.com/run)
