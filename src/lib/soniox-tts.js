// Soniox text-to-speech для кнопок «послушать» по всему приложению (роут
// /api/tts). Раньше эти кнопки читал браузерный синтез — голос устройства, то
// есть лотерея: на Windows и Android это часто eSpeak-робот, а английского
// голоса может не быть вовсе.
//
// Три вещи тут неочевидны:
//
// 1. Звук отдаётся ПОТОКОМ. REST Soniox (tts-rt.soniox.com/tts) шлёт mp3 по
//    мере синтеза: первый байт через ~0.6 с, а фраза на восемь секунд целиком —
//    только через семь (замер 23.09.2026). Ждать файл целиком значило бы
//    семь секунд тишины после нажатия.
// 2. Готовая запись кэшируется на диске. Одно и то же слово словаря слушают
//    сотни учеников, и платить за его синтез каждый раз незачем. Кэш
//    заполняется второй веткой того же потока (tee), так что первый слушатель
//    ничего не ждёт.
// 3. Синтез ограничен по частоте. У Soniox лимит запросов в минуту — на
//    ОРГАНИЗАЦИЮ, а на той же организации живёт голос тьютора. Пачка кнопок
//    «послушать» не должна отнимать у тьютора голос (см. make-lesson-audio.js:
//    упёрлись на сотом слове подряд). Сверх лимита — 429, и клиент читает
//    голосом устройства.

import crypto from 'node:crypto'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const env = (name) => (process.env[name] ?? '').replace(/^\uFEFF/, '').trim()

export const sonioxKey = () => env('SONIOX_API_KEY')
// tts-rt-v1 объявлен устаревшим (снятие 31.08.2026) и сейчас лишь псевдоним
// v2 — просим v2 напрямую, чтобы снятие псевдонима не уронило озвучку.
const model = () => env('SONIOX_TTS_MODEL') || 'tts-rt-v2'

// Сколько ждём заголовков ответа. Только их: тело идёт в темпе синтеза, и
// общий таймаут обрезал бы длинную запись посередине.
const HEADERS_TIMEOUT_MS = 15_000

/* ── Дисковый кэш ─────────────────────────────────────────────────────── */

// В контейнере это /tmp: переживает перезапуск процесса, но не передеплой —
// для кэша этого хватает, записи просто снова наберутся.
const cacheDir = () => env('TTS_CACHE_DIR') || path.join(os.tmpdir(), 'jts-tts')
const cacheMaxBytes = () => (Number(env('TTS_CACHE_MAX_MB')) || 512) * 1024 * 1024
const PRUNE_EVERY = 200

let writes = 0

export function cacheKey(n) {
  return crypto
    .createHash('sha1')
    .update([model(), n.voice, n.lang, n.speed, n.text].join('\u0000'))
    .digest('hex')
}

const cachePath = (key) => path.join(cacheDir(), `${key}.mp3`)

export async function readCached(key) {
  try {
    return await fsp.readFile(cachePath(key))
  } catch {
    return null
  }
}

// Запись MP3 начинается с ID3-тега (у Soniox — всегда) или с кадровой
// синхронизации 0xFFE. Всё остальное — не звук (обрыв, JSON ошибки), и класть
// его в кэш значит неделю отдавать тишину тем, кто нажмёт на это слово.
export function looksLikeMp3(buf) {
  if (!buf || buf.length < 256) return false
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
}

export async function writeCached(key, buf) {
  if (!looksLikeMp3(buf)) return
  const dir = cacheDir()
  await fsp.mkdir(dir, { recursive: true })
  // Через временный файл: читатель не должен увидеть недописанную запись.
  const tmp = path.join(dir, `${key}.${process.pid}.${Date.now()}.part`)
  await fsp.writeFile(tmp, buf)
  await fsp.rename(tmp, cachePath(key))
  if (++writes % PRUNE_EVERY === 0) pruneCache().catch(() => {})
}

// Кэш не бесконечный: при переполнении выкидываем самые давние записи, пока
// не останется 80% лимита.
export async function pruneCache() {
  const dir = cacheDir()
  const names = await fsp.readdir(dir).catch(() => [])
  const files = []
  let total = 0
  for (const name of names) {
    if (!name.endsWith('.mp3')) continue
    try {
      const st = await fsp.stat(path.join(dir, name))
      files.push({ name, size: st.size, mtime: st.mtimeMs })
      total += st.size
    } catch {
      /* файл убрали параллельно */
    }
  }
  const max = cacheMaxBytes()
  if (total <= max) return
  files.sort((a, b) => a.mtime - b.mtime)
  for (const f of files) {
    if (total <= max * 0.8) break
    await fsp.unlink(path.join(dir, f.name)).catch(() => {})
    total -= f.size
  }
}

/* ── Лимит на всю организацию ─────────────────────────────────────────── */

// Считаем только настоящие походы в Soniox (промахи кэша). Счётчик в памяти
// процесса — на одном контейнере это точный лимит.
const perMinute = () => Number(env('TTS_SONIOX_PER_MIN')) || 50
const recent = []

export function takeSonioxSlot(now = Date.now()) {
  while (recent.length && now - recent[0] >= 60_000) recent.shift()
  if (recent.length >= perMinute()) return false
  recent.push(now)
  return true
}

/* ── Синтез ───────────────────────────────────────────────────────────── */

/**
 * Открыть поток синтеза. Возвращает { body } — ReadableStream с mp3 — или
 * { status }, если провайдер отказал: 503 (нет ключа, ключ мёртв или кончились
 * деньги — чинить надо не запрос), 429 (лимит), 502 (всё остальное).
 */
export async function openSonioxStream(n) {
  const key = sonioxKey()
  if (!key) return { status: 503 }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HEADERS_TIMEOUT_MS)
  let res
  try {
    res = await fetch('https://tts-rt.soniox.com/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model(),
        voice: n.voice,
        language: n.lang,
        text: n.text,
        speed: n.speed,
        audio_format: 'mp3',
      }),
      signal: ctrl.signal,
    })
  } catch (e) {
    console.warn('[tts] soniox unreachable:', e?.message || e)
    return { status: 502 }
  } finally {
    clearTimeout(timer)
  }
  if (res.ok && res.body) return { body: res.body }
  const detail = await res.text().catch(() => '')
  // 401 — ключ отозван, 402 — кончился баланс организации (инцидент
  // 05.09.2026 начался именно с него). Оба — не про этот запрос, и в логе их
  // надо различать, а не видеть общее «TTS failed».
  console.warn(`[tts] soniox ${res.status}: ${detail.slice(0, 200)}`)
  if (res.status === 429) return { status: 429 }
  if (res.status === 401 || res.status === 402 || res.status === 403) return { status: 503 }
  return { status: 502 }
}

/** Дочитать поток в буфер (вторая ветка tee — для кэша). */
export async function collectStream(stream) {
  const reader = stream.getReader()
  const chunks = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}
