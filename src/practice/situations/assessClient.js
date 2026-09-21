'use client'

// Клиентская обёртка разбора устного ответа: WAV + задание → POST на
// /api/practice/situations/assess. Вся тяжесть (STT, произношение, грейдер) —
// на сервере; здесь транспорт и приведение формы.
//
// Разбор платный и лимитируется на аккаунт, поэтому запрос идёт с Bearer.
// Отказы приходят кодами: 'daily_limit_reached' (429), 'recording_too_long'
// (413), 'too_short' (400), 'not_configured' (503), 'assess_failed' (502) —
// пробрасываем их как поле code, чтобы экран показал понятный текст, а не
// «ошибка 429».

import { trimSilenceWav } from '../shadowing/trimWav.js'

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function axis(v) {
  if (v == null) return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null
}

// Текущий дневной остаток (для «осталось N из 20» до записи). null — гость, нет
// БД или сбой: тогда счётчик просто не показываем.
export async function fetchBudget(token) {
  if (!token) return null
  try {
    const res = await fetch('/api/practice/situations/assess', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const d = await readJson(res)
    return d.budget || null
  } catch {
    return null
  }
}

/**
 * @param {Blob} wavBlob 16кГц mono WAV (blobToWav16kMono из lib/ielts-audio.js)
 * @param {{ level: string, task: string, title?: string, lang?: string, token?: string }} ctx
 */
export async function assessAnswer(wavBlob, { level, task, title = '', lang = 'ru', token = null }) {
  // Обрезаем тишину: STT и оценка произношения берут за секунды аудио.
  const audio = await trimSilenceWav(wavBlob)
  const form = new FormData()
  form.append('audio', audio, 'answer.wav')
  form.append('level', level || '')
  form.append('task', task || '')
  form.append('title', title)
  form.append('lang', lang)

  const res = await fetch('/api/practice/situations/assess', {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const d = await readJson(res)
  if (!res.ok) {
    const err = new Error(d.error || `assess failed ${res.status}`)
    err.status = res.status
    err.code = d.error || null
    err.budget = d.budget || null
    throw err
  }

  // Тишина вместо речи — не ошибка запроса: попытка не списана, экран
  // показывает «не расслышали».
  if (d.empty) return { empty: true, budget: d.budget || null }

  return {
    empty: false,
    transcript: typeof d.transcript === 'string' ? d.transcript : '',
    seconds: Number(d.seconds) || 0,
    overall: axis(d.overall),
    axes: {
      grammar: axis(d.axes?.grammar),
      pronunciation: axis(d.axes?.pronunciation),
      vocabulary: axis(d.axes?.vocabulary),
      fluency: axis(d.axes?.fluency),
      coherence: axis(d.axes?.coherence),
    },
    taskAchieved: d.taskAchieved !== false,
    errors: Array.isArray(d.errors)
      ? d.errors.map((e) => ({
          bad: String(e?.bad ?? ''),
          good: String(e?.good ?? ''),
          note: String(e?.note ?? ''),
        }))
      : [],
    recommendations: Array.isArray(d.recommendations)
      ? d.recommendations.filter((r) => typeof r === 'string' && r.trim())
      : [],
    summary: typeof d.summary === 'string' ? d.summary : '',
    budget: d.budget || null,
  }
}
