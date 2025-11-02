'use client';

import { useState, useEffect } from 'react';

interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: Array<{
    name: string;
    id: number;
  }>;
}

export default function TTSForm() {
  const [text, setText] = useState('こんにちは、VOICEVOXです');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState(1);
  const [speedScale, setSpeedScale] = useState(1.0);
  const [pitchScale, setPitchScale] = useState(0.0);
  const [intonationScale, setIntonationScale] = useState(1.0);
  const [volumeScale, setVolumeScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      const response = await fetch(`${apiUrl}/speakers`);
      if (!response.ok) throw new Error('話者一覧の取得に失敗しました');
      const data = await response.json();
      setSpeakers(data);
    } catch (err) {
      console.error('Failed to fetch speakers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 既存の音声URLをクリーンアップ
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }

    try {
      const response = await fetch(`${apiUrl}/synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          speaker: selectedSpeaker,
          speed_scale: speedScale,
          pitch_scale: pitchScale,
          intonation_scale: intonationScale,
          volume_scale: volumeScale,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`音声合成に失敗しました: ${errorText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '音声合成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getSpeakerName = (speakerId: number) => {
    for (const speaker of speakers) {
      const style = speaker.styles.find(s => s.id === speakerId);
      if (style) {
        return `${speaker.name} (${style.name})`;
      }
    }
    return `話者 ${speakerId}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          VOICEVOX テキスト音声合成
        </h1>

        <div className="mb-4 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
          <p className="font-semibold">接続先API:</p>
          <p className="font-mono text-xs">{apiUrl}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テキスト
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              話者
            </label>
            <select
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {speakers.map((speaker) =>
                speaker.styles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {speaker.name} ({style.name})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                話速: {speedScale.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speedScale}
                onChange={(e) => setSpeedScale(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音高: {pitchScale.toFixed(2)}
              </label>
              <input
                type="range"
                min="-0.15"
                max="0.15"
                step="0.01"
                value={pitchScale}
                onChange={(e) => setPitchScale(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                抑揚: {intonationScale.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={intonationScale}
                onChange={(e) => setIntonationScale(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音量: {volumeScale.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={volumeScale}
                onChange={(e) => setVolumeScale(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            {loading ? '生成中...' : '音声を生成'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {audioUrl && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">生成された音声</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <audio controls className="w-full mb-3">
                <source src={audioUrl} type="audio/wav" />
                お使いのブラウザは音声再生に対応していません。
              </audio>
              <a
                href={audioUrl}
                download={`voicevox_${getSpeakerName(selectedSpeaker)}_${Date.now()}.wav`}
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                ダウンロード
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
