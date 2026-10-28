// Потоковая озвучка ответа помощника: POST /api/assistant/speak заводит
// «билет» и сразу запускает синтез, а <audio src> забирает его по GET — с
// первых байт, как /api/tts. Отдельный GET нужен потому, что <audio> не умеет
// слать заголовок Authorization: проверка входа и лимит — в POST, а билет —
// одноразовый по смыслу адрес (случайный UUID, живёт пять минут: тур готовит
// следующий шаг заранее, а ученик может задержаться на текущем).
//
// Синтез идёт сразу при POST, а не при GET: очередь ответа готовит две фразы
// вперёд (voiceQueue.js, LOOKAHEAD), и к моменту, когда до фразы дойдёт
// очередь, её звук уже лежит здесь — играется с первого байта мгновенно.
// GET отдаёт накопленное и дальше идёт вслед за синтезом; повторный GET
// (Safari сначала пробует bytes=0-1, потом берёт целиком) начинает с начала.
//
// Формат — MP3. Поток Gemini отдаёт только PCM/Ogg Opus, а Ogg в Safari
// появился лишь в 18.4 и работает с оговорками; MP3 потоком <audio> играет
// везде — тем же путём уже звучит /api/tts. Кодер — lamejs (чистый JS, ~50×
// быстрее реального времени на 24 кГц моно). ElevenLabs у Айзере отдаёт MP3
// сам — её куски идут в билет как есть.

import crypto from 'node:crypto'

import { Mp3Encoder } from '@breezystack/lamejs'

export const SAMPLE_RATE = 24000
// 64 кбит/с для голоса 24 кГц на слух не отличим от PCM, а весит в 6 раз меньше.
export const MP3_KBPS = 64
export const TICKET_TTL_MS = 5 * 60_000
// Потолок памяти: билет — до ~20 с речи (300 символов) ≈ 160 КБ у Луны и
// ≈ 320 КБ у Айзере (ElevenLabs отдаёт MP3 128 кбит/с сам) — до ~64 МБ на все.
export const MAX_TICKETS = 200

/** PCM 16 бит → MP3 кусками; нечётный байт на стыке кусков переносится. */
export function createMp3Encoder({ sampleRate = SAMPLE_RATE, kbps = MP3_KBPS } = {}) {
  const enc = new Mp3Encoder(1, sampleRate, kbps)
  let carry = null
  return {
    push(pcm) {
      let buf = carry ? Buffer.concat([carry, pcm]) : pcm
      carry = null
      if (buf.length % 2) {
        carry = Buffer.from(buf.subarray(buf.length - 1))
        buf = buf.subarray(0, buf.length - 1)
      }
      if (!buf.length) return Buffer.alloc(0)
      // Копия, а не вид: кусок из сокета лежит с любого смещения, а Int16Array
      // требует чётного.
      const samples = new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length))
      return Buffer.from(enc.encodeBuffer(samples))
    },
    end() {
      return Buffer.from(enc.flush())
    },
  }
}

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * Хранилище билетов. run(sink) — синтез: пишет MP3 в sink.write и завершается
 * (или бросает). Билет без единого байта и с ошибкой — failed: GET решает, чем
 * его заменить.
 */
export function createSpeakStore({ ttlMs = TICKET_TTL_MS, maxTickets = MAX_TICKETS, now = () => Date.now() } = {}) {
  const tickets = new Map()

  const wake = (t) => {
    const list = [...t.waiters]
    t.waiters.clear()
    for (const fn of list) fn()
  }

  function open(meta, run) {
    const id = crypto.randomUUID()
    const openedAt = now()
    const t = { id, meta, chunks: [], size: 0, done: false, failed: false, error: null, firstMs: null, waiters: new Set() }
    tickets.set(id, t)
    // Map держит порядок вставки: первым уходит самый старый.
    while (tickets.size > maxTickets) tickets.delete(tickets.keys().next().value)
    const sink = {
      write(buf) {
        if (!buf?.length || t.done) return
        // Первый звук от заведения билета — то, что ученик ждёт сверх сети.
        if (t.firstMs == null) t.firstMs = now() - openedAt
        t.chunks.push(buf)
        t.size += buf.length
        wake(t)
      },
      firstMs: () => t.firstMs,
      ms: () => now() - openedAt,
    }
    Promise.resolve()
      .then(() => run(sink))
      .then(
        () => {
          t.done = true
          t.failed = t.size === 0
        },
        (e) => {
          t.done = true
          t.failed = t.size === 0
          t.error = e
        },
      )
      .finally(() => wake(t))
    setTimeout(() => tickets.delete(id), ttlMs).unref?.()
    return id
  }

  const get = (id) => (typeof id === 'string' && ID_RE.test(id) ? tickets.get(id) || null : null)

  /** Дождаться первого байта или конца синтеза. */
  function ready(t) {
    if (t.size > 0 || t.done) return Promise.resolve(t)
    return new Promise((resolve) => {
      const check = () => (t.size > 0 || t.done ? resolve(t) : t.waiters.add(check))
      t.waiters.add(check)
    })
  }

  /** Всё, что уже есть, и дальше — вслед за синтезом. */
  function stream(t) {
    let i = 0
    let waiter = null
    return new ReadableStream({
      async pull(controller) {
        for (;;) {
          if (i < t.chunks.length) {
            controller.enqueue(new Uint8Array(t.chunks[i++]))
            return
          }
          if (t.done) {
            controller.close()
            return
          }
          await new Promise((resolve) => {
            waiter = resolve
            t.waiters.add(resolve)
          })
          waiter = null
        }
      },
      cancel() {
        // Ученик оборвал фразу: синтез дописывает билет сам — повторный GET
        // (или Safari с Range) возьмёт готовое.
        if (waiter) t.waiters.delete(waiter)
      },
    })
  }

  return { open, get, ready, stream, size: () => tickets.size }
}

/**
 * Готовая запись с поддержкой Range: Safari запрашивает медиа кусками
 * (bytes=0-1 на пробу) и на готовый файл ждёт 206 — как cachedResponse в
 * /api/tts.
 */
export function bufferResponse(buf, request, headers = {}) {
  const base = { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', ...headers }
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '')
  if (m && (m[1] || m[2])) {
    const size = buf.length
    const start = Math.max(0, m[1] ? Number(m[1]) : size - Number(m[2]))
    const end = Math.min(size - 1, m[1] && m[2] ? Number(m[2]) : size - 1)
    if (start > end) {
      return new Response(null, { status: 416, headers: { ...base, 'content-range': `bytes */${size}` } })
    }
    return new Response(buf.subarray(start, end + 1), {
      status: 206,
      headers: { ...base, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
    })
  }
  return new Response(buf, { headers: { ...base, 'content-length': String(buf.length) } })
}
