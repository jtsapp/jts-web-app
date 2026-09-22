'use client'

// Клиентская обёртка оценки фразы: WAV + эталонный текст → POST на
// /api/shadowing/assess, нормализует ответ. Вся тяжёлая логика (Azure/Claude) —
// на сервере; здесь только транспорт и приведение формы.
//
// Оценка платная и доступна только залогиненным, поэтому запросы идут с
// Bearer-токеном. Лимита на число оценок нет (снят 22.09.2026, см.
// lib/db/shadowingBudget.js); отказ сервера пробрасываем ошибкой с code/status.

import { trimSilenceWav } from './trimWav.js'

function num(v) {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
}

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

// wavBlob — 16кГц mono WAV (blobToWav16kMono из lib/ielts-audio.js).
// refText — текст фразы (эталон). lang — язык интерфейса для совета.
// mode: 'phrase' (эталон-режим, послово) или 'whole' (целый отрывок, continuous).
// token — Bearer залогиненного пользователя (без него сервер вернёт 401).
export async function assessTake(wavBlob, refText, lang = 'ru', mode = 'phrase', token = null) {
  // Обрезаем тишину перед отправкой: Azure берёт за секунды аудио (best-effort).
  const audio = await trimSilenceWav(wavBlob)
  const form = new FormData()
  form.append('audio', audio, 'take.wav')
  form.append('text', refText || '')
  form.append('lang', lang)
  form.append('mode', mode)

  const res = await fetch('/api/shadowing/assess', {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const d = await readJson(res)
  if (!res.ok) {
    const err = new Error(d.error || `assess failed ${res.status}`)
    err.status = res.status
    err.code = d.error || null
    throw err
  }

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
