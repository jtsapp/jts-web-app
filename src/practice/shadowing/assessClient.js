'use client'

// Клиентская обёртка оценки фразы: WAV + эталонный текст → POST на
// /api/shadowing/assess, нормализует ответ. Вся тяжёлая логика (Azure/Claude) —
// на сервере; здесь только транспорт и приведение формы.

import { trimSilenceWav } from './trimWav.js'

function num(v) {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
}

// wavBlob — 16кГц mono WAV (blobToWav16kMono из lib/ielts-audio.js).
// refText — текст фразы (эталон). lang — язык интерфейса для совета.
export async function assessTake(wavBlob, refText, lang = 'ru') {
  // Обрезаем тишину перед отправкой: Azure берёт за секунды аудио (best-effort).
  const audio = await trimSilenceWav(wavBlob)
  const form = new FormData()
  form.append('audio', audio, 'take.wav')
  form.append('text', refText || '')
  form.append('lang', lang)

  const res = await fetch('/api/shadowing/assess', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`assess failed ${res.status}`)
  const d = await res.json()

  return {
    overall: num(d.overall),
    accuracy: num(d.accuracy),
    fluency: num(d.fluency),
    prosody: num(d.prosody),
    completeness: num(d.completeness),
    words: Array.isArray(d.words)
      ? d.words.map((w) => ({
          word: String(w.word ?? ''),
          accuracy: num(w.accuracy),
          error: String(w.error ?? 'None'),
        }))
      : [],
    transcript: typeof d.transcript === 'string' ? d.transcript : '',
    tip: typeof d.tip === 'string' ? d.tip : '',
    mock: !!d.mock,
  }
}
