// Распознавание ответов Speaking для оценки — общее у банка (speaking/assess) и диагностики (diagnostic/assess).
// По каждому ответу параллельно: текст (Azure Fast → текст оценки произношения → Soniox, как в «Ситуациях») и
// произношение (Azure, кусками по минуте). Один ответ — одна независимая задача: битый файл, тишина или отказ
// распознавателя дают у ЭТОГО ответа пустой текст и `skipped`, а не роняют оценку остальных.

import { assessPronunciationChunked, isAzureSpeechConfigured, transcribeWavFast } from './azure-pronunciation.js'
import { isSonioxConfigured, transcribeWavSoniox } from '../soniox-stt.js'
import { isUsableAnswer } from './speakingGrader.js'
import { pronunciationBand, wordsPerMinute } from '../../ielts/speaking/speaking.js'

// Обещание с потолком: по истечении — fallback. Сама работа не отменяется, но её больше не ждут.
export function withDeadline(promise, ms, fallback) {
  let timer
  return Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(fallback), ms)))]).finally(() => clearTimeout(timer))
}

async function transcribe(buf, pronP, deadlineMs) {
  if (isAzureSpeechConfigured()) {
    const fast = await transcribeWavFast(buf, { timeoutMs: deadlineMs }).catch(() => null)
    if (fast != null) return { text: fast.trim(), stt: 'azure-fast' }
    const pron = await pronP
    const text = String(pron?.transcript || '').trim()
    if (text) return { text, stt: 'azure' }
  }
  if (isSonioxConfigured()) {
    const text = await transcribeWavSoniox(buf, { lang: 'en', timeoutMs: deadlineMs }).catch(() => '')
    return { text: String(text || '').trim(), stt: 'soniox' }
  }
  return { text: '', stt: null }
}

/**
 * items: [{ itemId, durationSec }], audio: Buffer | null по тем же индексам (null — файла не пришло).
 * Возвращает [{ itemId, durationSec, transcript, stt, wpm, accuracy, skipped }] — никогда не бросает.
 */
export async function transcribeAnswers(items, audio, { deadlineMs = 40_000 } = {}) {
  return Promise.all(
    items.map(async (item, i) => {
      const buf = audio[i]
      const empty = { ...item, transcript: '', stt: null, wpm: null, accuracy: null, skipped: true }
      if (!buf?.length) return empty
      try {
        const pronP = isAzureSpeechConfigured() ? withDeadline(assessPronunciationChunked(buf).catch(() => null), deadlineMs, null) : Promise.resolve(null)
        // текст тоже под потолком: Azure Fast → Soniox цепочкой могли бы занять два срока подряд
        const [{ text, stt }, pron] = await Promise.all([withDeadline(transcribe(buf, pronP, deadlineMs), deadlineMs + 5_000, { text: '', stt: null }), pronP])
        return { ...item, transcript: text, stt, wpm: wordsPerMinute(text, item.durationSec), accuracy: pron && !pron.mock ? pron.accuracy : null, skipped: !isUsableAnswer(text) }
      } catch (e) {
        console.error('ielts speaking: answer transcription failed', item.itemId, e?.message || e)
        return empty
      }
    }),
  )
}

/** Произношение — только по внятным ответам: accuracy Azure на шуме или чужом языке — не про произношение ученика. */
export function answersPronunciation(per) {
  return pronunciationBand(per.filter((a) => !a.skipped).map((a) => ({ accuracy: a.accuracy, durationSec: a.durationSec })))
}

/** Что уходит на бэкенд в items работы: пропущенный ответ помечен, экран разбора покажет его без оценки. */
export const savedItems = (per) => per.map(({ itemId, durationSec, transcript, wpm, accuracy, skipped }) => ({ itemId, durationSec, transcript, wpm, accuracy, ...(skipped ? { skipped: true } : {}) }))
