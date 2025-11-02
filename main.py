import os
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
import httpx
from typing import Optional

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VOICEVOX TTS Server",
    description="VOICEVOX を使用したテキスト音声合成サーバ",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では具体的なドメインを指定することを推奨
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# VOICEVOX Engine の URL（環境変数から取得、デフォルトは localhost）
VOICEVOX_ENGINE_URL = os.getenv("VOICEVOX_ENGINE_URL", "http://localhost:50021")


class SynthesisRequest(BaseModel):
    text: str = Field(..., description="音声合成するテキスト")
    speaker: int = Field(1, description="話者ID（デフォルト: 1 - 四国めたん ノーマル）")
    speed_scale: float = Field(1.0, ge=0.5, le=2.0, description="話速（0.5 - 2.0）")
    pitch_scale: float = Field(0.0, ge=-0.15, le=0.15, description="音高（-0.15 - 0.15）")
    intonation_scale: float = Field(1.0, ge=0.0, le=2.0, description="抑揚（0.0 - 2.0）")
    volume_scale: float = Field(1.0, ge=0.0, le=2.0, description="音量（0.0 - 2.0）")


@app.get("/")
async def root():
    """ヘルスチェック用エンドポイント"""
    return {
        "status": "ok",
        "message": "VOICEVOX TTS Server is running",
        "engine_url": VOICEVOX_ENGINE_URL
    }


@app.get("/health")
async def health_check():
    """VOICEVOX Engine への接続確認"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{VOICEVOX_ENGINE_URL}/version")
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "engine": response.json()
                }
            else:
                raise HTTPException(status_code=503, detail="VOICEVOX Engine is not responding correctly")
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"VOICEVOX Engine is not available: {str(e)}")


@app.get("/speakers")
async def get_speakers():
    """利用可能な話者一覧を取得"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{VOICEVOX_ENGINE_URL}/speakers")
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch speakers")
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch speakers: {e}")
        raise HTTPException(status_code=503, detail=f"VOICEVOX Engine is not available: {str(e)}")


@app.post("/synthesis")
async def synthesize_speech(request: SynthesisRequest):
    """
    テキストから音声を合成

    Returns:
        音声データ (WAV 形式)
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. 音声クエリの作成
            logger.info(f"Creating audio query for text: {request.text[:50]}...")
            query_response = await client.post(
                f"{VOICEVOX_ENGINE_URL}/audio_query",
                params={
                    "text": request.text,
                    "speaker": request.speaker
                }
            )

            if query_response.status_code != 200:
                raise HTTPException(
                    status_code=query_response.status_code,
                    detail=f"Failed to create audio query: {query_response.text}"
                )

            # 2. クエリパラメータの調整
            audio_query = query_response.json()
            audio_query["speedScale"] = request.speed_scale
            audio_query["pitchScale"] = request.pitch_scale
            audio_query["intonationScale"] = request.intonation_scale
            audio_query["volumeScale"] = request.volume_scale

            # 3. 音声合成
            logger.info(f"Synthesizing audio with speaker {request.speaker}...")
            synthesis_response = await client.post(
                f"{VOICEVOX_ENGINE_URL}/synthesis",
                params={"speaker": request.speaker},
                json=audio_query
            )

            if synthesis_response.status_code != 200:
                raise HTTPException(
                    status_code=synthesis_response.status_code,
                    detail=f"Failed to synthesize audio: {synthesis_response.text}"
                )

            logger.info("Audio synthesis completed successfully")
            return Response(
                content=synthesis_response.content,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f'attachment; filename="speech.wav"'
                }
            )

    except httpx.RequestError as e:
        logger.error(f"Request to VOICEVOX Engine failed: {e}")
        raise HTTPException(status_code=503, detail=f"VOICEVOX Engine is not available: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during synthesis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/synthesis")
async def synthesize_speech_get(
    text: str = Query(..., description="音声合成するテキスト"),
    speaker: int = Query(1, description="話者ID"),
    speed_scale: float = Query(1.0, ge=0.5, le=2.0, description="話速"),
    pitch_scale: float = Query(0.0, ge=-0.15, le=0.15, description="音高"),
    intonation_scale: float = Query(1.0, ge=0.0, le=2.0, description="抑揚"),
    volume_scale: float = Query(1.0, ge=0.0, le=2.0, description="音量")
):
    """
    GETメソッドでのテキスト音声合成

    使用例:
    /synthesis?text=こんにちは&speaker=1&speed_scale=1.0
    """
    request = SynthesisRequest(
        text=text,
        speaker=speaker,
        speed_scale=speed_scale,
        pitch_scale=pitch_scale,
        intonation_scale=intonation_scale,
        volume_scale=volume_scale
    )
    return await synthesize_speech(request)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
