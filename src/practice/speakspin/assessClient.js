'use client'

// Транспорт ИИ-разбора SpeakSpin: адаптер ai.adapter для движка (engine.js).
// Движок отдаёт запись как есть (webm/mp4 из MediaRecorder), а Azure нужен
// 16кГц mono WAV — переводим здесь, как «Ситуации», и срезаем тишину по краям:
// STT и оценка произношения берут деньги за секунды аудио.
//
// Ответ сервера — контракт прототипа v1, его проверяет сам движок
// (validateFeedback). Отказы сервера превращаем в Error с ключом строки
// (extraStrings.js) — движок покажет этот текст вместо общего «не удалось».

import { blobToWav16kMono } from '../../lib/ielts-audio.js'
import { trimSilenceWav } from '../shadowing/trimWav.js'

export const ASSESS_URL = '/api/practice/speakspin/assess'

const ERROR_KEYS = {
  401: 'loginToAnalyze',
  413: 'tooShort',
  429: 'dailyLimit',
  503: 'notConfigured',
}

export function errorKeyFor(status, code) {
  if (code === 'too_short') return 'tooShort'
  if (code === 'recording_too_long') return 'aiError'
  return ERROR_KEYS[status] || 'aiError'
}

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/** Адаптер для mountSpeakSpin(…, { ai: { adapter } }). */
export function createAssessAdapter(token, fetchImpl = (...a) => fetch(...a)) {
  return async function analyze(payload) {
    const { audioBlob, signal, ...metadata } = payload
    const wav = await trimSilenceWav(await blobToWav16kMono(audioBlob))
    const form = new FormData()
    form.append('audio', wav, `${metadata.attemptId}.wav`)
    // prompt не шлём: сервер берёт текст темы по topicId сам, иначе в промпт
    // грейдера уходил бы произвольный текст клиента.
    const { prompt, mimeType, ...meta } = metadata
    form.append('metadata', JSON.stringify(meta))
    const res = await fetchImpl(ASSESS_URL, {
      method: 'POST',
      body: form,
      signal,
      headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': metadata.attemptId },
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error(errorKeyFor(res.status, data?.error))
    return data
  }
}
