// Каталог того, что Луна может открыть по просьбе ученика (29.10.2026), — для модели и
// для сверки её метки. Собирается на сервере только под просьбу (intent.js): видов,
// о которых спросили, и уровня, о котором речь.
//
// Строка каталога — адрес (refs.js) и название по-человечески, у урока курса ещё и
// статус: «пройден», «следующий» или «закрыт». Статус считает то же правило, что и
// тропа (learning/courseLock.js), по тем же данным бэкенда (модуль уровня, квота,
// прогресс), — поэтому «урок закрыт» Луна говорит ровно тогда, когда его не откроет
// и тропа. Бэкенд не ответил — статусов нет вовсе: тропа всё равно проверит сама, а
// «закрыт» по несобранным данным было бы враньём.
//
// Источники — те же, что у экранов: статика public/ (курс, грамматика, ситуации,
// слова, воркбуки), бэкенд (игры грамматики, шэдоуинг из админки, домашка, живые
// уроки — с токеном ученика; тексты «Чтения» — публично, иначе с диска).

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { BACKEND_URL } from '../../auth-server.js'
import { courseTrail } from '../../../learning/courseData.js'
import { pickLevelModule } from '../../../learning/lessonModule.js'
import { lessonUnlocked } from '../../../learning/courseLock.js'
import { LESSONS as SHADOWING_LESSONS } from '../../../practice/shadowing/lessons.js'
import { hasAudio } from '../../../practice/books/audioFilter.js'
import { normalizeTracks } from '../../../practice/karaoke/karaokeShape.js'
import { TALES } from '../../../data/practiceLibrary.js'
import { parseItemRef } from './refs.js'

// Грамматика B1 — 145 тем: даже названиями это ~2 тыс. токенов, дальше незачем.
export const MAX_LINES = 160
const BACKEND_TIMEOUT_MS = 4000
const COURSE_LEVELS = new Set(['a0', 'a1', 'a2', 'b1', 'b2'])
const PRACTICE_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const HOMEWORK_DONE = new Set(['SUBMITTED', 'CHECKED', 'COMPLETED', 'GRADED'])
// «Грамматика · игры» делит материал на свои ступени L1–L5 (0 → A1 … B2 → C1).
const GGAME_STEP = { A0: 'L1', A1: 'L1', A2: 'L2', B1: 'L3', B2: 'L4', C1: 'L5' }

const fileCache = new Map()

// Каталоги материала одни на всех учеников (книжки, комиксы, бандлы предлогов и
// произношения…): на «открой Остров сокровищ» роут собирает их все разом, а бандлы
// тяжёлые — поэтому 5 минут держим в памяти по адресу, без токена. Личное (домашка,
// расписание, прогресс курса) сюда не попадает. Пустой ответ не кэшируется: «бэкенд не
// ответил» не должно залипать.
const SHARED_TTL_MS = 5 * 60_000
const SHARED_PATHS = new Set([
  '/mobile/audio-lessons', '/mobile/comics', '/mobile/karaoke', '/mobile/speed-reading/texts', '/mobile/listen',
  '/mobile/cartoons', '/mobile/prepositions', '/mobile/pronunciation', '/mobile/grammar-games', '/mobile/shadowing',
])
const sharedCache = new Map()

/** Доступ к данным — параметром: тесту — подмена, роуту — диск и бэкенд. */
export const defaultDeps = {
  async readJson(rel) {
    if (!fileCache.has(rel)) {
      const p = readFile(path.join(process.cwd(), 'public', rel), 'utf8').then(JSON.parse)
      fileCache.set(rel, p)
      p.catch(() => fileCache.delete(rel))
    }
    return fileCache.get(rel)
  },
  async listDirs(rel) {
    const entries = await readdir(path.join(process.cwd(), 'public', rel), { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()
  },
  // null — бэкенд не ответил или ответил не то: «не знаем», а не «пусто».
  async getJson(p, token) {
    if (SHARED_PATHS.has(p)) {
      const hit = sharedCache.get(p)
      if (hit && Date.now() - hit.at < SHARED_TTL_MS) return hit.data
      const data = await defaultDeps.fetchJson(p, token)
      if (data != null) sharedCache.set(p, { at: Date.now(), data })
      return data
    }
    return defaultDeps.fetchJson(p, token)
  },
  async fetchJson(p, token) {
    try {
      const res = await fetch(`${BACKEND_URL}${p}`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        cache: 'no-store',
      })
      return res.ok ? await res.json() : null
    } catch {
      return null
    }
  },
}

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const quote = (s) => `«${strip(s)}»`
// short — для подписи кнопки «Открыть: …» (labelOf): вид вещи словом языка интерфейса,
// номер и короткое название. Подпись собирает сервер: язык ученика он знает.
const item = (ref, kind, title, extra = '', short = {}) => ({ ref, kind, title, line: `- ${ref} — ${title}${extra}`, short })

const WORD = {
  lesson: { ru: 'урок', kk: 'сабақ', en: 'lesson' },
  test: { ru: 'тест', kk: 'тест', en: 'test' },
  exam: { ru: 'финальный экзамен', kk: 'қорытынды емтихан', en: 'final exam' },
  grammar: { ru: 'тема', kk: 'тақырып', en: 'topic' },
  ggame: { ru: 'игра', kk: 'ойын', en: 'game' },
  reading: { ru: 'текст', kk: 'мәтін', en: 'text' },
  book: { ru: 'книга', kk: 'кітап', en: 'book' },
  comic: { ru: 'комикс', kk: 'комикс', en: 'comic' },
  karaoke: { ru: 'караоке', kk: 'караоке', en: 'karaoke' },
  tale: { ru: 'сказка', kk: 'ертегі', en: 'fairy tale' },
  speedread: { ru: 'скорочтение', kk: 'жылдам оқу', en: 'speed reading' },
  listen: { ru: 'Just to Listen', kk: 'Just to Listen', en: 'Just to Listen' },
  writing: { ru: 'письмо', kk: 'жазу', en: 'writing' },
  arcade: { ru: 'игра', kk: 'ойын', en: 'game' },
  cartoon: { ru: 'мультфильм', kk: 'мультфильм', en: 'cartoon' },
  prep: { ru: 'предлоги', kk: 'предлогтар', en: 'prepositions' },
  pron: { ru: 'произношение', kk: 'айтылым', en: 'pronunciation' },
  situation: { ru: 'ситуация', kk: 'жағдай', en: 'situation' },
  shadowing: { ru: 'шэдоуинг', kk: 'шэдоуинг', en: 'shadowing' },
  words: { ru: 'слова', kk: 'сөздер', en: 'words' },
  workbook: { ru: 'воркбук', kk: 'воркбук', en: 'workbook' },
  homework: { ru: 'домашка', kk: 'үй жұмысы', en: 'homework' },
  live: { ru: 'урок с преподавателем', kk: 'мұғаліммен сабақ', en: 'lesson with teacher' },
}

/** Подпись кнопки: «урок 5 “Why we spend”». Кавычки — “”: «» в служебном хвосте заняты. */
export function labelOf(it, lang = 'ru') {
  const { word = it.kind, n, name } = it.short || {}
  const l = lang === 'kk' || lang === 'en' ? lang : 'ru'
  const parts = [WORD[word]?.[l] || WORD[word]?.ru || '', n != null ? String(n) : '', name ? `“${strip(name)}”` : '']
  const label = parts.filter(Boolean).join(' ')
  return label.length > 78 ? `${label.slice(0, 76)}…”` : label
}

async function courseItems(level, { token, deps }) {
  const lvl = String(level || '').toLowerCase()
  if (!COURSE_LEVELS.has(lvl)) return []
  const LEVEL = lvl.toUpperCase()
  const index = await deps.readJson(`course/${lvl}/index.json`).catch(() => null)
  if (!index) return []
  const trail = courseTrail(index)
  const exam = await deps.readJson(`exam/${lvl}/exam.json`).catch(() => null)
  if (exam && trail.length) trail.push({ code: 'EXAM', kind: 'exam' })

  // Статусы — по тем же данным, что у тропы (KingdomInteriorPage): модуль уровня,
  // его квота и прогресс. Нет модуля — тропа ведёт прогресс только на устройстве, и
  // серверу его не узнать: статусов нет.
  let lock = null
  const modules = await deps.getJson('/mobile/lesson-modules', token)
  const mod = Array.isArray(modules) ? pickLevelModule(modules, LEVEL) : null
  if (mod) {
    const [quota, progress] = await Promise.all([
      deps.getJson(`/mobile/content-quota?contentType=LESSON_MODULE&contentId=${mod.id}`, token),
      deps.getJson(`/mobile/lesson-modules/${mod.id}/progress`, token),
    ])
    if (progress && Array.isArray(progress.done)) {
      lock = { done: new Set(progress.done.map(String)), moduleLocked: Boolean(mod.locked), moduleQuota: quota?.limit ?? null }
    }
  }

  let nextShown = false
  return trail.map((node, i) => {
    const ref = `course.${LEVEL}.${node.code}`
    const title =
      node.kind === 'lesson'
        ? `урок ${node.n} ${quote(node.title)} (юнит ${node.unit})${node.blurb ? `: ${strip(node.blurb)}` : ''}`
        : node.kind === 'exam'
          ? 'финальный экзамен уровня'
          : String(node.code).startsWith('T')
            ? `тест юнита ${node.unit}`
            : `тест ${quote(node.title)}`
    let status = ''
    let locked = false
    if (lock) {
      if (lock.done.has(node.code)) status = ' · пройден'
      else if (!lessonUnlocked(i, { trail, ...lock })) {
        status = ' · закрыт'
        locked = true
      } else if (!nextShown) {
        status = ' · следующий'
        nextShown = true
      }
    }
    const short =
      node.kind === 'lesson'
        ? { word: 'lesson', n: node.n, name: node.title }
        : node.kind === 'exam'
          ? { word: 'exam' }
          : String(node.code).startsWith('T')
            ? { word: 'test', name: `Unit ${node.unit}` }
            : { word: 'test', name: node.title }
    return { ...item(ref, 'course', title, status, short), locked }
  })
}

async function grammarItems(level, { deps }) {
  const index = await deps.readJson('practice/grammar/index.json').catch(() => null)
  const lvl = String(level || '').toLowerCase()
  const levels = index?.[lvl] ? [lvl] : (index?.levels || []).map((l) => l.code)
  return levels.flatMap((code) =>
    (index?.[code]?.units || []).map((u) =>
      item(`grammar.${code}.${u.id}`, 'grammar', quote(u.title), u.secName ? ` (${strip(u.secName)}, ${code.toUpperCase()})` : ` (${code.toUpperCase()})`, { name: u.title }),
    ),
  )
}

async function ggameItems(level, { token, deps, lang = 'ru' }) {
  const data = await deps.getJson('/mobile/grammar-games', token)
  const topics = Array.isArray(data?.topics) ? data.topics : []
  const ranges = new Map((data?.levels || []).map((l) => [l.id, l.range]))
  const step = GGAME_STEP[String(level || '').toUpperCase()]
  // Тем немного — все; много — только ступень уровня ученика.
  const pool = topics.length > 40 && step ? topics.filter((t) => t.lv === step) : topics
  return pool
    .filter((t) => t?.id)
    .map((t) => {
      const title = t.title?.ru || t.title?.en || t.id
      const own = t.title?.[lang] || title
      const sub = t.sub?.ru || t.sub?.en || ''
      return item(`ggame.${t.id}`, 'ggame', quote(title), `${sub ? `: ${strip(sub)}` : ''} (игра, ${t.lv}${ranges.get(t.lv) ? `, ${ranges.get(t.lv)}` : ''})`, { name: own })
    })
}

async function readingItems(level, { deps }) {
  const lvl = String(level || '').toLowerCase() === 'a0' ? 'a1' : String(level || '').toLowerCase()
  const levels = PRACTICE_LEVELS.includes(lvl) ? [lvl] : PRACTICE_LEVELS
  const lists = await Promise.all(
    levels.map(async (code) => {
      // Тексты переехали в админку: сначала бэкенд, пока пакет не залит — диск (как экран).
      const remote = await deps.getJson(`/practice-content/reading/${code}`, null)
      if (Array.isArray(remote) && remote.length) return remote
      const disk = await deps.readJson(`practice/reading/${code}.json`).catch(() => null)
      return disk?.texts || []
    }),
  )
  return lists.flat().filter((t) => t?.id).map((t) => item(`reading.${t.id}`, 'reading', quote(t.title), t.genre ? ` (${t.genre})` : '', { name: t.title }))
}

// Книжки — каталог Практики (/mobile/audio-lessons, только kind BOOK): все уровни, а не
// уровень ученика — книгу просят по названию, и уровень на обложке ученик не помнит.
// Автор и уровень — модели, чтобы «Питер Пэн» и «книжку Барри» сошлись с Peter Pan.
async function bookItems(_level, { token, deps }) {
  const data = await deps.getJson('/mobile/audio-lessons', token)
  const list = Array.isArray(data) ? data : data?.content || data?.items || []
  return list
    .filter((b) => b?.id != null && strip(b.title) && b.isActive !== false)
    .map((b) => {
      const about = [strip(b.author), String(b.level || '').toUpperCase(), hasAudio(b) ? 'есть аудио' : ''].filter(Boolean).join(', ')
      return item(`book.${b.id}`, 'book', quote(b.title), about ? ` (${about})` : '', { name: b.title })
    })
}

const listOf = (data) => (Array.isArray(data) ? data : data?.content || data?.items || [])
// Название на языке ученика из { ru, kk, en } или строки; для модели — русское.
const titleIn = (t, lang = 'ru') => (t && typeof t === 'object' ? t[lang] || t.ru || t.en || t.kk || '' : String(t ?? ''))
const lvl2 = (level) => {
  const l = String(level || '').toLowerCase()
  return l === 'a0' ? 'a1' : l
}

// Комиксы — каталог Практики (/mobile/comics). Адрес — slug: закладка чтения держится
// за него, id при перезаливке меняется (comicsShape.js). Помеченные «18+» экран сейчас
// прячет от всех (visibleComics без профиля) — их и здесь нет.
async function comicItems(_level, { token, deps }) {
  const list = listOf(await deps.getJson('/mobile/comics', token))
  return list
    .filter((c) => c && strip(c.title || c.name) && !(c.adultOnly || c.isAdult || c.adult))
    .map((c) => {
      const key = /^[A-Za-z0-9_-]{1,48}$/.test(String(c.slug || '')) ? String(c.slug) : c.id != null ? String(c.id) : ''
      const title = c.title || c.name
      return key ? item(`comic.${key}`, 'comic', quote(title), c.author ? ` (${strip(c.author)})` : '', { name: title }) : null
    })
    .filter(Boolean)
}

// Караоке (/mobile/karaoke) — разбор тот же, что у экрана: трек без фонограммы не играет
// и в каталоге не нужен. Адрес — slug (ключ прогресса), как и у карточки.
async function karaokeItems(_level, { token, deps }) {
  return normalizeTracks(await deps.getJson('/mobile/karaoke', token))
    .filter((k) => k.slug && /^[A-Za-z0-9_-]{1,48}$/.test(k.slug))
    .map((k) => item(`karaoke.${k.slug}`, 'karaoke', quote(k.title), ` (${[k.artist, k.level].filter(Boolean).join(', ')})`.replace(' ()', ''), { name: k.title }))
}

// Сказки — десять, статикой (practiceLibrary.js), как и карточки в Практике.
async function taleItems() {
  return TALES.map((tl) => item(`tale.${tl.id}`, 'tale', quote(tl.title), '', { name: tl.title }))
}

async function speedreadItems(level, { token, deps, lang = 'ru' }) {
  const list = listOf(await deps.getJson('/mobile/speed-reading/texts', token))
  return list
    .filter((t) => t?.id != null && /^[A-Za-z0-9_-]{1,48}$/.test(String(t.id)) && strip(titleIn(t.title)))
    .map((t) => item(`speedread.${t.id}`, 'speedread', quote(titleIn(t.title)), t.level ? ` (${String(t.level).toUpperCase()})` : '', { name: titleIn(t.title, lang) }))
}

// Just to Listen: наборы уровней и профессий (/mobile/listen).
async function listenItems(_level, { token, deps, lang = 'ru' }) {
  const data = await deps.getJson('/mobile/listen', token)
  const sets = [...(data?.levels || []).map((s) => [s, 'уровень']), ...(data?.fields || []).map((s) => [s, 'профессия'])]
  return sets
    .filter(([s]) => s?.id != null && /^[A-Za-z0-9_-]{1,48}$/.test(String(s.id)))
    .map(([s, what]) => {
      const name = titleIn(s.name, 'ru') || String(s.id)
      return item(`listen.${s.id}`, 'listen', quote(name), ` (${what})`, { name: titleIn(s.name, lang) || String(s.id) })
    })
}

// Письмо по шагам: жанры уровня (30 на уровень), у A2 — ещё A2+.
async function writingItems(level, { deps }) {
  const l = lvl2(level)
  const levels = l === 'a2' ? ['a2', 'a2p'] : ['a1', 'a2', 'b1', 'b2', 'c1'].includes(l) ? [l] : ['b1']
  const lists = await Promise.all(levels.map((code) => deps.readJson(`practice/writing/${code}.json`).catch(() => null)))
  return lists.flatMap((data, i) =>
    (data?.seeds || [])
      .filter((s) => s?.id && /^[A-Za-z0-9_-]{1,48}$/.test(s.id))
      .map((s) => item(`writing.${levels[i]}.${s.id}`, 'writing', quote(s.title), s.sub ? `: ${strip(s.sub)}` : '', { name: s.title })),
  )
}

async function arcadeItems() {
  return [
    item('arcade.speak', 'arcade', '«Speak or Die»', ': говори без пауз, пока бензопила не догнала', { name: 'Speak or Die' }),
    item('arcade.runner', 'arcade', '«Word Rush»', ': бегун по дорожкам, вбегай в перевод слова', { name: 'Word Rush' }),
  ]
}

// Cartoon World (/mobile/cartoons): четыре источника каталога, id — как у движка
// (cartoons/engine.js: library и фильмы — свой id, строки каталога — cat-<yt>, добавленные —
// ext-<yt>). Удалённые с YouTube (unavailable) не предлагаем. Видео сотни — длинный список
// режется уровнем ученика.
async function cartoonItems(level, { token, deps }) {
  const data = await deps.getJson('/mobile/cartoons', token)
  if (!data) return []
  const gone = new Set((data.unavailable || []).map((v) => v?.id).filter(Boolean))
  const all = [
    ...(data.library?.entries || []).map((e) => ({ id: e.id, level: e.level, series: e.series, title: e.title })),
    ...(data.data?.episodes || []).map((e) => ({ id: e.id, level: e.level, series: '', title: e.title })),
    ...(data.catalog?.rows || []).map((r) => ({ id: `cat-${r[1]}`, level: r[0], series: r[2], title: r[3] })),
    ...(data.extra?.rows || []).map((e) => ({ id: `ext-${e.yt}`, level: e.level, series: e.series, title: e.title })),
  ].filter((v) => v.id && !gone.has(v.id) && /^[A-Za-z0-9_-]{1,48}$/.test(String(v.id)) && strip(v.title))
  const L = String(level || '').toUpperCase()
  const pool = all.length > MAX_LINES && L ? all.filter((v) => String(v.level).toUpperCase() === L) : all
  return pool.map((v) => {
    const name = v.series ? `${v.series} — ${v.title}` : v.title
    return item(`cartoon.${v.id}`, 'cartoon', quote(name), v.level ? ` (${v.level})` : '', { name })
  })
}

// Prepositions World: уроки категорий (/mobile/prepositions, course.cats[].lessons[]).
async function prepItems(_level, { token, deps, lang = 'ru' }) {
  const data = await deps.getJson('/mobile/prepositions', token)
  return (data?.course?.cats || []).flatMap((c) =>
    (c.lessons || [])
      .filter((l) => l?.id && /^[A-Za-z0-9_-]{1,48}$/.test(String(l.id)))
      .map((l) => {
        const en = titleIn(l.title, 'en')
        const ru = titleIn(l.title, 'ru')
        const name = en && ru && en !== ru ? `${en} / ${ru}` : en || ru || String(l.id)
        return item(`prep.${l.id}`, 'prep', quote(name), c.title ? ` (${strip(titleIn(c.title))})` : '', { name: titleIn(l.title, lang) || name })
      }),
  )
}

// Pronunciation World: темы уровней (/mobile/pronunciation, levels[].modules[], id «A1.3»).
async function pronItems(level, { token, deps, lang = 'ru' }) {
  const data = await deps.getJson('/mobile/pronunciation', token)
  const L = String(level || '').toUpperCase()
  const levels = data?.levels || []
  const own = levels.filter((l) => String(l.id).toUpperCase() === L)
  return (own.length ? own : levels).flatMap((l) =>
    (l.modules || [])
      .filter((m) => /^[A-C]\d\.\d{1,3}$/.test(String(m?.id || '')))
      .map((m) => item(`pron.${m.id}`, 'pron', quote(titleIn(m.title)), ` (${l.id})`, { name: titleIn(m.title_t || m.title, lang) || titleIn(m.title) })),
  )
}

async function situationItems(level, { deps, lang = 'ru' }) {
  const lvl = String(level || '').toLowerCase() === 'a0' ? 'a1' : String(level || '').toLowerCase()
  const levels = PRACTICE_LEVELS.includes(lvl) ? [lvl] : PRACTICE_LEVELS
  const lists = await Promise.all(
    levels.map(async (code) => {
      const data = await deps.readJson(`practice/situations/${code}.json`).catch(() => null)
      return (data?.items || []).map((s) => {
        const ru = s.title?.ru || s.title?.en || `ситуация ${s.id}`
        const own = (lang === 'kk' ? s.title?.kz || s.title?.kk : s.title?.[lang]) || ru
        return item(`situation.${code}.${s.id}`, 'situation', quote(ru), s.title?.en && s.title.en !== ru ? ` (${strip(s.title.en)}, ${code.toUpperCase()})` : ` (${code.toUpperCase()})`, { name: own })
      })
    }),
  )
  return lists.flat()
}

async function shadowingItems(_level, { token, deps }) {
  const local = SHADOWING_LESSONS.map((l) => item(`shadowing.${l.id}`, 'shadowing', quote(l.title), l.short ? ` (${strip(l.short)})` : '', { name: l.short || l.title }))
  const remote = await deps.getJson('/mobile/shadowing', token)
  const seen = new Set(SHADOWING_LESSONS.map((l) => l.id))
  const extra = (Array.isArray(remote) ? remote : [])
    .filter((r) => typeof r?.slug === 'string' && r.slug.includes('-') && !seen.has(r.slug) && strip(r.title))
    .map((r) => item(`shadowing.${r.slug}`, 'shadowing', quote(r.title), r.speaker ? ` (${strip(r.speaker)})` : '', { name: r.speaker || r.title }))
  return [...local, ...extra]
}

async function wordsItems(_level, { deps }) {
  const meta = await deps.readJson('practice/words/meta.json').catch(() => null)
  return (meta?.sections || []).flatMap((s) =>
    (s.scenes || []).map((sc) => item(`words.${sc.id}`, 'words', quote(sc.name), ` (${strip(s.name)})`, { name: sc.name })),
  )
}

// Воркбуки уровнями, а у уровня, о котором речь, — ещё и уроками: «открой урок 5 воркбука».
async function workbookItems(level, { deps }) {
  const dirs = (await deps.listDirs('practice/workbook').catch(() => [])).filter((d) => /^(a0|a1|a2|b1|b2|c1)$/.test(d))
  const levels = dirs.map((d) => item(`workbook.${d}`, 'workbook', `воркбук ${d.toUpperCase()}`, '', { n: d.toUpperCase() }))
  const own = String(level || '').toLowerCase()
  if (!dirs.includes(own)) return levels
  const index = await deps.readJson(`practice/workbook/${own}/index.json`).catch(() => null)
  const lessons = Object.entries(index?.lessons || {})
    .filter(([n]) => /^\d{1,3}$/.test(n))
    .map(([n, l]) =>
      item(`workbook.${own}.${n}`, 'workbook', `урок ${n} ${quote(l.title)} воркбука ${own.toUpperCase()}`, l.unit ? ` (юнит ${l.unit})` : '', { word: 'lesson', n, name: l.title }),
    )
  return [...levels, ...lessons]
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })
}

async function homeworkItems(_level, { token, deps }) {
  const list = await deps.getJson('/admin/homework/my', token)
  return (Array.isArray(list) ? list : [])
    .filter((h) => h?.id != null && !HOMEWORK_DONE.has(String(h.status || '').toUpperCase()))
    .slice(0, 15)
    .map((h) => item(`homework.${h.id}`, 'homework', quote(h.title || 'домашняя работа'), h.dueDate ? ` (до ${fmtDate(h.dueDate)})` : '', { name: h.title }))
}

async function liveItems(_level, { token, deps, now = Date.now() }) {
  const list = await deps.getJson('/admin/lessons/occurrences', token)
  return (Array.isArray(list) ? list : [])
    .filter((o) => o?.lessonId != null && new Date(o.scheduledAt).getTime() >= now - 2 * 3600_000)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5)
    .map((o) => item(`live.${o.lessonId}`, 'live', `урок ${fmtDate(o.scheduledAt)}`, o.teacherName ? ` с ${strip(o.teacherName)}` : '', { n: fmtDate(o.scheduledAt) }))
}

const BUILDERS = {
  course: courseItems,
  grammar: grammarItems,
  ggame: ggameItems,
  reading: readingItems,
  book: bookItems,
  comic: comicItems,
  karaoke: karaokeItems,
  tale: taleItems,
  speedread: speedreadItems,
  listen: listenItems,
  writing: writingItems,
  arcade: arcadeItems,
  cartoon: cartoonItems,
  prep: prepItems,
  pron: pronItems,
  situation: situationItems,
  shadowing: shadowingItems,
  words: wordsItems,
  workbook: workbookItems,
  homework: homeworkItems,
  live: liveItems,
}

const HEADERS = {
  course: (level) => `Уроки курса ${level || ''}`.trim(),
  grammar: () => 'Темы грамматики (Практика)',
  ggame: () => '«Грамматика · игры»',
  reading: () => 'Тексты «Чтения»',
  // Книгу не назвали («какую-нибудь книжку», «книжки») — не выбирать за ученика, а
  // открыть весь список: просьба «открой книжку» — это просьба о выборе.
  book: () => 'Книжки (Практика → Чтение; книгу не назвали — открой весь список книжек: [[OPEN_NOW books]])',
  comic: () => 'Комиксы (Практика → Чтение; комикс не назвали — весь список: [[OPEN_NOW comics]])',
  karaoke: () => 'Караоке (песню не назвали — весь список: [[OPEN_NOW karaoke]])',
  tale: () => 'Сказки (сказку не назвали — весь список: [[OPEN_NOW tales]])',
  speedread: () => '«Скорочтение» — тексты',
  listen: () => 'Just to Listen — наборы для диктанта',
  writing: (level) => `«Письмо по шагам» — жанры ${String(level || '').toUpperCase()}`.trim(),
  arcade: () => '«Аркада» — игры',
  cartoon: () => 'Cartoon World — мультфильмы (мультфильм не назвали — весь раздел: [[OPEN_NOW cartoons]])',
  prep: () => 'Prepositions World — уроки предлогов',
  pron: () => 'Pronunciation World — темы произношения',
  situation: () => 'Ситуации (разговорная практика)',
  shadowing: () => 'Уроки шэдоуинга',
  words: () => 'Сцены «Слов в картинках»',
  workbook: () => 'Воркбуки',
  homework: () => 'Домашняя работа ученика (не сданная)',
  live: () => 'Живые уроки с преподавателем (ближайшие)',
}

/**
 * Каталог видов kinds для уровня level: текст для контекста модели и адреса для сверки.
 * Вид, который не собрался (нет файла, бэкенд молчит), просто пропадает.
 */
export async function buildItemCatalog({ kinds, level, token, lang = 'ru', deps = defaultDeps, now }) {
  const uniq = [...new Set(kinds)].filter((k) => BUILDERS[k])
  const lists = await Promise.all(uniq.map((k) => BUILDERS[k](level, { token, deps, now, lang }).catch(() => [])))
  const items = new Map()
  const sections = []
  uniq.forEach((kind, i) => {
    const list = lists[i].slice(0, MAX_LINES)
    if (!list.length) return
    for (const it of list) items.set(it.ref, { ...it, label: labelOf(it, lang) })
    sections.push(`${HEADERS[kind](level)}:\n${list.map((it) => it.line).join('\n')}`)
  })
  return { text: sections.length ? sections.join('\n') : null, items }
}

/** Вещь по адресу — когда каталога в этом запросе нет (ученик ответил «да» на её «Открыть?»). */
export async function resolveItem(ref, { token, lang = 'ru', deps = defaultDeps, now } = {}) {
  const parsed = parseItemRef(ref)
  if (!parsed) return null
  const { items } = await buildItemCatalog({ kinds: [parsed.kind], level: parsed.level, token, lang, deps, now })
  return items.get(ref) || null
}
