// Soniox async speech-to-text (REST) для короткого аудио — разговорный тест
// уровня и IELTS Speaking Part 1. Раньше STT шёл через Azure
// (azure-pronunciation), но AZURE_SPEECH_KEY на проде не задан → транскрипт был
// пустой. Soniox уже настроен (тот же SONIOX_API_KEY, что у голосового агента),
// поэтому распознаём им.
//
// Контракт как у transcribeWav: WAV-буфер на вход, распознанный текст на выход;
// '' при ЛЮБОЙ проблеме — экран теста тогда деградирует (пустой транскрипт), а
// не падает.
//
// Поток Soniox async: upload файла → create transcription → poll до completed →
// fetch transcript. Файл/транскрипцию за собой чистим (DELETE), чтобы не копить.

const BASE = 'https://api.soniox.com'
const MODEL = process.env.SONIOX_STT_MODEL || 'stt-async-v5'

export function isSonioxConfigured() {
  return Boolean(process.env.SONIOX_API_KEY)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function transcribeWavSoniox(wav, { lang = 'en', timeoutMs = 25000 } = {}) {
  const key = process.env.SONIOX_API_KEY
  if (!key) return ''
  if (!wav || wav.length === 0) return ''
  const auth = { Authorization: `Bearer ${key}` }
  let fileId = null
  let transcriptionId = null
  try {
    // 1) upload
    const form = new FormData()
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav')
    const upRes = await fetch(`${BASE}/v1/files`, { method: 'POST', headers: auth, body: form })
    if (!upRes.ok) {
      console.error('[soniox-stt] upload', upRes.status)
      return ''
    }
    fileId = (await upRes.json())?.id
    if (!fileId) return ''

    // 2) create transcription
    const crRes = await fetch(`${BASE}/v1/transcriptions`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, file_id: fileId, language_hints: [lang] }),
    })
    if (!crRes.ok) {
      console.error('[soniox-stt] create', crRes.status)
      return ''
    }
    transcriptionId = (await crRes.json())?.id
    if (!transcriptionId) return ''

    // 3) poll
    const deadline = Date.now() + timeoutMs
    let status = 'pending'
    while (Date.now() < deadline) {
      await sleep(700)
      const stRes = await fetch(`${BASE}/v1/transcriptions/${transcriptionId}`, { headers: auth })
      if (!stRes.ok) {
        console.error('[soniox-stt] status', stRes.status)
        return ''
      }
      const st = await stRes.json()
      status = st?.status
      if (status === 'completed') break
      if (status === 'error') {
        console.error('[soniox-stt] transcription error', st?.error_message)
        return ''
      }
    }
    if (status !== 'completed') {
      console.error('[soniox-stt] timeout')
      return ''
    }

    // 4) transcript — токены склеиваем по порядку (у каждого свой text со своими
    // пробелами); нормализуем пробелы на всякий случай.
    const trRes = await fetch(`${BASE}/v1/transcriptions/${transcriptionId}/transcript`, {
      headers: auth,
    })
    if (!trRes.ok) {
      console.error('[soniox-stt] transcript', trRes.status)
      return ''
    }
    const tr = await trRes.json()
    const tokens = Array.isArray(tr?.tokens) ? tr.tokens : []
    return tokens
      .map((t) => (typeof t?.text === 'string' ? t.text : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
  } catch (e) {
    console.error('[soniox-stt] failed', e)
    return ''
  } finally {
    // best-effort очистка — не копим файлы/транскрипции на стороне Soniox.
    if (fileId) fetch(`${BASE}/v1/files/${fileId}`, { method: 'DELETE', headers: auth }).catch(() => {})
    if (transcriptionId)
      fetch(`${BASE}/v1/transcriptions/${transcriptionId}`, { method: 'DELETE', headers: auth }).catch(() => {})
  }
}
