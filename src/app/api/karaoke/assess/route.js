// Оценка дубля караоке одним запросом: multipart { audio (16 кГц mono WAV всего
// дубля), segments (JSON [{ id, from, to, text }]) } → слова с временем и
// точностью произношения.
//
// Куски режет клиент: только он знает, где в ЗАПИСИ звучит какая строка
// (паузы, перемотки и скорость трека в запись не попадают — см.
// practice/karaoke/alignment.js). Каждый кусок — отдельная оценка Azure по
// эталону из строк этого куска, параллельно: песня целиком не успела бы за
// 100 с, после которых Cloudflare на проде рвёт запрос (524), а кусками по
// полминуты — успевает.
//
// Оценка — всё или ничего: кусок без ответа (сбой, не уложились) превратил бы
// его строки в «не спето», хотя студент их пел. Тогда тот же WAV распознаём
// обычным STT и отдаём только текст — слова всё равно оценятся, а запись
// уходит с устройства ОДИН раз, как обещано на экране перед стартом.

import {
  assessAgainstReference,
  isAzureSpeechConfigured,
  extractPcm,
  pcmToWav,
  transcribeWavFast,
  transcribeWav,
} from '@/lib/ielts/azure-pronunciation.js'
import { transcribeWavSoniox, isSonioxConfigured } from '@/lib/soniox-stt.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

// Лимит тела обязан быть НИЖЕ client_max_body_size у nginx (32m), иначе прокси
// отдаёт голый 413. 25 МБ WAV — это 13 минут: пятиминутная песня на 0,75×
// укладывается с запасом.
const MAX_BYTES = 25 * 1024 * 1024
const MAX_SEGMENTS = 120
const MAX_SEGMENT_SEC = 120
const MAX_TEXT = 1000
// Сколько кусков оцениваем одновременно. Ограничение Azure на параллельные
// сессии (S0) на порядок выше, а шесть потоков укладывают четырёхминутную
// песню секунд в тридцать.
const CONCURRENCY = 6
// Потолок на всю оценку и порог, после которого на запасное распознавание
// времени уже нет: до 524 от Cloudflare остаётся 100 с на всё вместе.
const ASSESS_BUDGET_MS = 70_000
const FALLBACK_IF_UNDER_MS = 40_000

const bad = (error, status = 400) => Response.json({ error }, { status })

function parseSegments(raw, durationSec) {
  let list
  try {
    list = JSON.parse(String(raw || ''))
  } catch {
    return null
  }
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_SEGMENTS) return null
  const out = []
  for (const s of list) {
    const id = Number(s?.id)
    const from = Number(s?.from)
    const to = Number(s?.to)
    const text = typeof s?.text === 'string' ? s.text.trim().slice(0, MAX_TEXT) : ''
    const ok =
      Number.isInteger(id) &&
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from >= 0 &&
      to > from &&
      to - from <= MAX_SEGMENT_SEC &&
      // Полсекунды люфта: клиентские часы и длина декодированного WAV
      // расходятся на пару кадров.
      from < durationSec + 0.5 &&
      text
    if (!ok) return null
    // Кусок, почти целиком лежащий за концом записи (часы клиента обогнали
    // декодер), — пустой, а не сбой: иначе он ронял бы оценку всего дубля.
    const end = Math.min(to, durationSec)
    out.push({ id, from, to: end, text, empty: end - from < 0.1 })
  }
  return out
}

/** Пул из `limit` параллельных задач; порядок результатов — как у входа. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const lane = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
  return out
}

const r3 = (x) => Math.round(x * 1000) / 1000

async function assessSegments(parsed, segments) {
  const rate = parsed.sampleRate || 16000
  const results = await mapLimit(segments, CONCURRENCY, async (s) => {
    if (s.empty) return { id: s.id, transcript: '', words: [] }
    const a = Math.floor(s.from * rate) * 2
    const b = Math.min(parsed.pcm.length, Math.ceil(s.to * rate) * 2)
    const wav = pcmToWav(parsed.pcm.subarray(a, b), rate)
    // Одна повторная попытка: единичный обрыв сокета не должен стоить студенту
    // всей оценки.
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await assessAgainstReference(wav, s.text, { continuous: true, prosody: false, strict: true }).catch(
        (e) => {
          console.error('[karaoke.assess] azure failed', e)
          return null
        },
      )
      if (r) {
        return {
          id: s.id,
          transcript: r.transcript || '',
          // Время — в секундах всей записи, а не куска: так клиент сразу
          // переводит его во время трека по своей карте.
          words: (r.words || []).map((w) => ({
            word: w.word,
            accuracy: w.accuracy,
            error: w.error,
            start: Number.isFinite(w.start) ? r3(w.start + s.from) : null,
            end: Number.isFinite(w.end) ? r3(w.end + s.from) : null,
          })),
        }
      }
    }
    return null
  })
  return results.every(Boolean) ? results : null
}

async function transcribeFallback(buf) {
  // Сюда попадаем, когда не справился Azure, поэтому первым пробуем Soniox:
  // при сбое Azure его же распознавание скорее всего лежит тоже.
  if (isSonioxConfigured()) {
    const text = await transcribeWavSoniox(buf).catch(() => null)
    if (text) return text
  }
  if (isAzureSpeechConfigured()) {
    return (await transcribeWavFast(buf).catch(() => null)) ?? (await transcribeWav(buf).catch(() => null))
  }
  return null
}

export async function POST(request) {
  // Оценка — только для залогиненных: Azure платный. Гость поёт с оценкой по
  // /api/transcribe, как раньше (слова без произношения).
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let form
  try {
    form = await request.formData()
  } catch {
    return bad("Expected multipart/form-data with 'audio' and 'segments'.")
  }
  const file = form.get('audio')
  if (!(file instanceof File) || file.size === 0) return bad("Missing 'audio' file field.")
  if (file.size > MAX_BYTES) return bad('Audio too large.', 413)

  const buf = Buffer.from(await file.arrayBuffer())
  const parsed = extractPcm(buf)
  if (!parsed || parsed.pcm.length === 0) return bad('Audio must be a 16-bit PCM WAV.', 415)
  const durationSec = parsed.pcm.length / 2 / (parsed.sampleRate || 16000)
  const segments = parseSegments(form.get('segments'), durationSec)
  if (!segments) return bad("Bad 'segments'.")

  // Токен сверяем с бэкендом ДО платного вызова: одного заголовка Bearer мало,
  // иначе Azure жёг бы любой выдуманный токен.
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  const t0 = Date.now()
  let assessed = null
  if (isAzureSpeechConfigured()) {
    let timer
    const budget = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), ASSESS_BUDGET_MS)
    })
    assessed = await Promise.race([assessSegments(parsed, segments), budget])
    clearTimeout(timer)
  }
  const secs = segments.reduce((s, x) => s + (x.to - x.from), 0)
  console.info(
    `[karaoke.assess] ${segments.length} кусков, ${Math.round(secs)} с аудио за ${Math.round((Date.now() - t0) / 1000)} с — ${assessed ? 'оценено' : 'без оценки'}`,
  )

  if (assessed) {
    return Response.json({
      mode: 'assessed',
      segments: assessed,
      transcript: assessed
        .map((s) => s.transcript)
        .filter(Boolean)
        .join(' '),
    })
  }

  if (Date.now() - t0 < FALLBACK_IF_UNDER_MS) {
    const transcript = await transcribeFallback(buf)
    if (transcript != null) return Response.json({ mode: 'transcript', transcript })
  }
  return Response.json({ mode: 'none' })
}
