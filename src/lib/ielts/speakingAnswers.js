// Распознавание ответов Speaking для оценки — общее у банка (speaking/assess) и диагностики (diagnostic/assess).
// По каждому ответу параллельно: текст (Azure Fast → текст оценки произношения → Soniox, как в «Ситуациях») и
// произношение (Azure, кусками по минуте). Один ответ — одна независимая задача: битый файл, тишина или отказ
// распознавателя дают у ЭТОГО ответа пустой текст и `skipped`, а не роняют оценку остальных.
//
// Каждый ответ несёт и разбор для отладки (`reason`, `errors`, `ms`, `bytes`): «ИИ не оценил» почти всегда значит
// «распознаватель ничего не дал» — без этих полей в логе и в ответе роута причину было не отличить от сбоя модели.

import { assessPronunciationChunked, isAzureSpeechConfigured, transcribeWavFast } from './azure-pronunciation.js'
import { isSonioxConfigured, transcribeWavSoniox } from '../soniox-stt.js'
import { skipReason } from './speakingGrader.js'
import { pronunciationBand, wordsPerMinute } from '../../ielts/speaking/speaking.js'

const TIMED_OUT = Symbol('timeout')

// Обещание с потолком: по истечении — fallback. Сама работа не отменяется, но её больше не ждут.
export function withDeadline(promise, ms, fallback) {
  let timer
  return Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(fallback), ms)))]).finally(() => clearTimeout(timer))
}

const errText = (engine, e) => `${engine}: ${String(e?.message || e).slice(0, 120)}`

async function transcribe(buf, pronP, deadlineMs, errors) {
  if (isAzureSpeechConfigured()) {
    const fast = await transcribeWavFast(buf, { timeoutMs: deadlineMs }).catch((e) => {
      errors.push(errText('azure-fast', e))
      return null
    })
    if (fast != null) return { text: fast.trim(), stt: 'azure-fast' }
    const pron = await pronP
    const text = String(pron?.transcript || '').trim()
    if (text) return { text, stt: 'azure' }
  }
  if (isSonioxConfigured()) {
    const text = await transcribeWavSoniox(buf, { lang: 'en', timeoutMs: deadlineMs }).catch((e) => {
      errors.push(errText('soniox', e))
      return ''
    })
    return { text: String(text || '').trim(), stt: 'soniox' }
  }
  if (!isAzureSpeechConfigured()) errors.push('no stt engine configured')
  return { text: '', stt: null }
}

/**
 * items: [{ itemId, durationSec }], audio: Buffer | null по тем же индексам (null — файла не пришло).
 * Возвращает [{ itemId, durationSec, transcript, stt, wpm, accuracy, skipped, reason, errors, ms, bytes }] — никогда
 * не бросает. reason — почему ответ пропущен: no_file | stt_timeout | stt_failed | empty | too_short | not_english.
 */
export async function transcribeAnswers(items, audio, { deadlineMs = 40_000 } = {}) {
  return Promise.all(
    items.map(async (item, i) => {
      const buf = audio[i]
      const t0 = Date.now()
      const errors = []
      const empty = (reason) => ({ ...item, transcript: '', stt: null, wpm: null, accuracy: null, skipped: true, reason, errors, ms: Date.now() - t0, bytes: buf?.length || 0 })
      if (!buf?.length) return empty('no_file')
      try {
        const pronP = isAzureSpeechConfigured()
          ? withDeadline(assessPronunciationChunked(buf).catch((e) => (errors.push(errText('azure-pron', e)), null)), deadlineMs, null)
          : Promise.resolve(null)
        // текст тоже под потолком: Azure Fast → Soniox цепочкой могли бы занять два срока подряд
        const [res, pron] = await Promise.all([withDeadline(transcribe(buf, pronP, deadlineMs, errors), deadlineMs + 5_000, TIMED_OUT), pronP])
        if (res === TIMED_OUT) return empty('stt_timeout')
        const { text, stt } = res
        const why = skipReason(text)
        return {
          ...item,
          transcript: text,
          stt,
          wpm: wordsPerMinute(text, item.durationSec),
          accuracy: pron && !pron.mock ? pron.accuracy : null,
          skipped: !!why,
          // пустой текст при ошибке распознавателя — сбой сервиса, а не тишина ученика
          reason: why === 'empty' && errors.length ? 'stt_failed' : why,
          errors,
          ms: Date.now() - t0,
          bytes: buf.length,
        }
      } catch (e) {
        console.error('ielts speaking: answer transcription failed', item.itemId, e?.message || e)
        errors.push(errText('transcribe', e))
        return empty('stt_failed')
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

/** Ответы для отладки — без стенограмм (их длина и так видна по словам), чтобы лог не копил речь учеников. */
export const answersDebug = (per) =>
  per.map((a) => ({
    itemId: a.itemId,
    sec: a.durationSec,
    bytes: a.bytes,
    stt: a.stt,
    words: a.transcript ? a.transcript.split(/\s+/).filter(Boolean).length : 0,
    accuracy: a.accuracy,
    ms: a.ms,
    ...(a.skipped ? { skipped: a.reason || true } : {}),
    ...(a.errors?.length ? { errors: a.errors } : {}),
  }))
