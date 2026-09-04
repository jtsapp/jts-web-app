'use client'

// Данные раздела «Караоке» Практики: каталог, разметка треков и прогресс.
//
// Каталог приходит из API (`/mobile/karaoke`) — материал заводит методист через
// админку, статической копии в public/ нет намеренно, иначе у каталога станет
// два источника правды (та же логика, что у комиксов).
//
// Разметка лежит отдельным JSON в MinIO: строки с таймкодами не нужны каталогу
// и весят десятки килобайт на трек. Кэш — на время жизни вкладки: возвращаться
// к треку студент будет, а меняться разметка между заходами не может.

import { getKaraokeTracks, getKaraokeTrack } from '../../api.js'
import { KARAOKE_KEY as KEY } from '../practiceKeys.js'
import { normalizeTracks, normalizeTrack, normalizeLyrics } from './karaokeShape.js'

let _indexPromise = null
// Map, а не объект: ключ — slug трека, а «constructor» и «valueOf» паттерну
// slug'а (^[a-z0-9-]{2,120}$) вполне удовлетворяют. У объекта такой ключ
// нашёлся бы в прототипе, и вместо разметки вернулась бы функция.
const _lyricsCache = new Map()

export function loadKaraokeIndex(token, onFresh) {
  if (!_indexPromise) {
    _indexPromise = getKaraokeTracks(token, (fresh) => onFresh?.(normalizeTracks(fresh)))
      .then(normalizeTracks)
      .catch(() => [])
  }
  return _indexPromise
}

export function loadKaraokeTrack(token, id) {
  return getKaraokeTrack(token, id)
    .then(normalizeTrack)
    .catch(() => null)
}

/**
 * Разметка трека.
 *
 * Бэкенд отдаёт её инлайном, но только в ответе на ОДИН трек: в каталоге её
 * нет намеренно — это десятки килобайт на карточку, которую никто не читает.
 * Поэтому при открытии трека доспрашиваем `/mobile/karaoke/{id}`.
 *
 * Файлом в MinIO разметка не лежит: её пришлось бы читать через `fetch`, а на
 * это браузеру нужен CORS у бакета, которого там нет (аудио и обложке он не
 * нужен — их тянут теги `<audio>`/`<img>`).
 */
export async function loadLyrics(track, token) {
  const key = track?.slug || track?.id
  if (!key) return null
  if (_lyricsCache.has(key)) return _lyricsCache.get(key)

  const result = await (async () => {
    if (track.lyrics) return normalizeLyrics(track.lyrics)
    if (track.id == null) return null
    const full = await loadKaraokeTrack(token, track.id)
    return full?.lyrics ? normalizeLyrics(full.lyrics) : null
  })()

  _lyricsCache.set(key, result)
  return result
}

// ── Прогресс ────────────────────────────────────────────────────────────────
// Живёт в localStorage: результат исполнения — вещь личная и на бэкенде пока
// не нужна (см. §7 контракта). Форма из ТЗ раздела 9.

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!raw || typeof raw !== 'object') return { version: 1, tracks: {} }
    return { version: 1, streak: raw.streak, tracks: raw.tracks || {} }
  } catch {
    return { version: 1, tracks: {} }
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
}

export function trackProgress(slug) {
  const t = read().tracks[slug]
  return {
    stars: t?.stars || 0,
    best: t?.best || {},
    attempts: t?.attempts || 0,
    weakLines: t?.weakLines || [],
    warmupDone: Boolean(t?.warmupDone),
  }
}

export function karaokeStreak() {
  return read().streak || { days: 0, lastDate: '' }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Стрик: любой завершённый режим засчитывает день. Продлеваем только если
// прошлый засчитанный день — вчерашний; тот же день ничего не меняет, разрыв
// начинает счёт заново.
function bumpStreak(streak) {
  const d = today()
  if (streak?.lastDate === d) return streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const days = streak?.lastDate === yesterday ? (streak.days || 0) + 1 : 1
  return { days, lastDate: d }
}

/**
 * Звёзды за трек. В первой версии доступны две из пяти: остальные три ТЗ
 * вешает на Hot Seat и Fill the Gap, которых пока нет. Считаем по лучшему
 * баллу, а не по последнему: сорванная попытка не должна отбирать звезду.
 */
export function starsFor(best) {
  let stars = 0
  if ((best?.full || 0) >= 60) stars = 1
  if ((best?.full || 0) >= 75) stars = 2
  return stars
}

export function saveWarmup(slug) {
  if (!slug) return
  const state = read()
  const t = (state.tracks[slug] = state.tracks[slug] || {})
  t.warmupDone = true
  state.streak = bumpStreak(state.streak)
  write(state)
}

/** Результат Full Karaoke. Лучший балл только растёт. */
export function saveKaraokeResult(slug, { score, weakLines }) {
  if (!slug) return trackProgress(slug)
  const state = read()
  const t = (state.tracks[slug] = state.tracks[slug] || {})
  t.best = t.best || {}
  t.best.full = Math.max(t.best.full || 0, Math.round(score) || 0)
  t.attempts = (t.attempts || 0) + 1
  if (Array.isArray(weakLines)) t.weakLines = weakLines.slice(0, 5)
  t.stars = starsFor(t.best)
  state.streak = bumpStreak(state.streak)
  write(state)
  return trackProgress(slug)
}
