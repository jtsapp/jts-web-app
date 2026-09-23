// Озвучка Soniox для всех кнопок «послушать», которые раньше читал браузерный
// синтез (Словарь, Воркбук, Чтение, Грамматика, Сказки, тест уровня, слова
// курса без записи, трансляция живого урока). Подробности — src/lib/soniox-tts.js.
//
// GET, а не POST, намеренно: адрес можно отдать прямо в <audio src>. Тогда
// play() зовётся синхронно в обработчике нажатия (iOS выдаёт разрешение на
// звук только так) и звук начинается с первых байт потока, а повтор того же
// слова браузер берёт из своего кэша, не спрашивая сервер. Параметры —
// src/lib/ttsShared.js (ttsUrl).
//
// Ответы: 200/206 audio/mpeg; 400 — нечего или нечем читать; 429 — лимит
// (клиент читает голосом устройства); 503 — Soniox не настроен или отказал по
// ключу/балансу; 502 — остальные сбои провайдера.

import { createRateLimiter } from '../../../lib/assistant/rateLimit.js'
import {
  cacheKey,
  collectStream,
  looksLikeMp3,
  openSonioxStream,
  readCached,
  sonioxKey,
  takeSonioxSlot,
  writeCached,
} from '../../../lib/soniox-tts.js'
import { normalizeTts, TTS_VOICES, VOICE } from '../../../lib/ttsShared.js'

export const runtime = 'nodejs'

// Неделя, а не год: синтез не детерминирован и изредка срывается (одна рамка
// курса вышла 23 с бормотания), и неудачная запись не должна жить у ученика
// вечно.
const AUDIO_CACHE = 'public, max-age=604800'

// Лимит на один адрес — только на промахи кэша, то есть на новые тексты.
// Класс за одним NAT слушает одни и те же слова: первый ученик синтезирует,
// остальные получают готовое и лимит не тратят.
const takeQuota = createRateLimiter({
  windowLimit: 300,
  windowMs: 10 * 60 * 1000,
  dayLimit: 3000,
})

// Синтезы, которые идут прямо сейчас: ключ → промис готовой записи (или null,
// если синтез сорвался). Один и тот же текст почти одновременно просят часто —
// подгрузка следующей реплики и её же play(), класс на одном задании, — и
// платить за него дважды незачем: второй ждёт первого и получает готовое.
const inflight = new Map()

function clientIp(request) {
  const h = request.headers
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  )
}

const fail = (status, error, extra = {}) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } })

// Готовую запись отдаём с поддержкой Range: Safari запрашивает медиа
// кусками (bytes=0-1 на пробу) и без ответа 206 может не заиграть вовсе.
function cachedResponse(buf, request) {
  const base = {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': AUDIO_CACHE,
    'Accept-Ranges': 'bytes',
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '')
  if (m && (m[1] || m[2])) {
    const size = buf.length
    let start = m[1] ? Number(m[1]) : size - Number(m[2])
    let end = m[1] && m[2] ? Number(m[2]) : size - 1
    start = Math.max(0, start)
    end = Math.min(size - 1, end)
    if (start > end) {
      return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${size}` } })
    }
    return new Response(buf.subarray(start, end + 1), {
      status: 206,
      headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    })
  }
  return new Response(buf, { headers: { ...base, 'Content-Length': String(buf.length) } })
}

export async function GET(request) {
  const q = new URL(request.url).searchParams
  const voice = q.get('v') || VOICE.us
  if (!TTS_VOICES.has(voice)) return fail(400, 'Unknown voice.')
  const n = normalizeTts({ text: q.get('t'), voice, lang: q.get('l'), speed: q.get('s') })
  if (!n) return fail(400, 'Text is required.')

  const key = cacheKey(n)
  const cached = await readCached(key)
  if (cached) return cachedResponse(cached, request)

  const pending = inflight.get(key)
  if (pending) {
    const buf = await pending
    if (buf) return cachedResponse(buf, request)
    // Первый синтез сорвался — пробуем сами, как обычный промах.
  }

  if (!sonioxKey()) return fail(503, 'TTS is not configured on the server.')

  const ip = clientIp(request)
  const quota = takeQuota(ip)
  if (!quota.ok) return fail(429, 'Too many requests.', { 'Retry-After': String(quota.retryAfterSec) })
  if (!takeSonioxSlot()) {
    // Упёрлись в общий лимит — синтеза не было, и адресу его не засчитываем.
    takeQuota.refund(ip)
    return fail(429, 'TTS is busy.', { 'Retry-After': '30' })
  }

  // Регистрируемся ДО похода в Soniox: между проверкой выше и этой строкой
  // нет ни одного await, так что параллельный запрос того же текста уже
  // увидит наш синтез и не закажет свой.
  let settle
  inflight.set(key, new Promise((resolve) => (settle = resolve)))
  const release = (buf) => {
    inflight.delete(key)
    settle(buf)
  }

  const up = await openSonioxStream(n)
  if (!up.body) {
    release(null)
    takeQuota.refund(ip)
    return fail(up.status, 'TTS failed.')
  }

  // Одна ветка — ученику, вторая — в кэш. Ученик ушёл посреди записи (нажал
  // следующее слово) — его ветку браузер отменит, а кэш всё равно допишется,
  // и следующее нажатие на это слово уже не пойдёт в Soniox.
  const [toClient, toCache] = up.body.tee()
  collectStream(toCache)
    .then(async (buf) => {
      if (!looksLikeMp3(buf)) return release(null)
      try {
        await writeCached(key, buf)
      } catch (e) {
        console.warn('[tts] cache write skipped:', e?.message || e)
      }
      release(buf)
    })
    .catch((e) => {
      console.warn('[tts] stream broke, not cached:', e?.message || e)
      release(null)
    })

  return new Response(toClient, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': AUDIO_CACHE },
  })
}
