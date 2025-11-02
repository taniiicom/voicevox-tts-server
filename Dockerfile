# マルチステージビルドで VOICEVOX Engine と TTS サーバを統合
FROM ubuntu:22.04 as voicevox-builder

# VOICEVOX Engine のバージョン
ARG VOICEVOX_ENGINE_VERSION=0.25.0

# 必要なパッケージのインストール
RUN apt-get update && \
    apt-get install -y \
    wget \
    ca-certificates \
    p7zip-full \
    && rm -rf /var/lib/apt/lists/*

# VOICEVOX Engine のダウンロードと展開
WORKDIR /opt
RUN wget https://github.com/VOICEVOX/voicevox_engine/releases/download/${VOICEVOX_ENGINE_VERSION}/voicevox_engine-linux-cpu-x64-${VOICEVOX_ENGINE_VERSION}.7z.001 && \
    7z x voicevox_engine-linux-cpu-x64-${VOICEVOX_ENGINE_VERSION}.7z.001 && \
    rm voicevox_engine-linux-cpu-x64-${VOICEVOX_ENGINE_VERSION}.7z.001 && \
    mv linux-cpu-x64 voicevox_engine

# メインイメージ
FROM python:3.11-slim

# 作業ディレクトリの設定
WORKDIR /app

# システム依存関係のインストール
RUN apt-get update && \
    apt-get install -y \
    libgomp1 \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# VOICEVOX Engine のコピー
COPY --from=voicevox-builder /opt/voicevox_engine /opt/voicevox_engine

# Python 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY main.py .

# 起動スクリプトの作成
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# VOICEVOX Engine をバックグラウンドで起動\n\
echo "Starting VOICEVOX Engine..."\n\
cd /opt/voicevox_engine\n\
./run --host 127.0.0.1 --port 50021 --cpu_num_threads ${CPU_NUM_THREADS:-4} &\n\
VOICEVOX_PID=$!\n\
\n\
# VOICEVOX Engine の起動を待機\n\
echo "Waiting for VOICEVOX Engine to be ready..."\n\
for i in {1..30}; do\n\
  if curl -s http://localhost:50021/version > /dev/null 2>&1; then\n\
    echo "VOICEVOX Engine is ready!"\n\
    break\n\
  fi\n\
  echo "Waiting... ($i/30)"\n\
  sleep 2\n\
done\n\
\n\
# TTS サーバの起動\n\
echo "Starting TTS Server..."\n\
cd /app\n\
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}\n\
' > /app/start.sh && chmod +x /app/start.sh

# 必要なツールのインストール
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# 環境変数の設定
ENV VOICEVOX_ENGINE_URL=http://localhost:50021
ENV PORT=8080
ENV CPU_NUM_THREADS=4

# ポートの公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# コンテナ起動
CMD ["/app/start.sh"]
