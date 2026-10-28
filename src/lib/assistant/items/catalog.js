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
const item = (ref, kind, title, extra = '') => ({ ref, kind, title, line: `- ${ref} — ${title}${extra}` })

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
    return { ...item(ref, 'course', title, status), locked }
  })
}

async function grammarItems(level, { deps }) {
  const index = await deps.readJson('practice/grammar/index.json').catch(() => null)
  const lvl = String(level || '').toLowerCase()
  const levels = index?.[lvl] ? [lvl] : (index?.levels || []).map((l) => l.code)
  return levels.flatMap((code) =>
    (index?.[code]?.units || []).map((u) =>
      item(`grammar.${code}.${u.id}`, 'grammar', quote(u.title), u.secName ? ` (${strip(u.secName)}, ${code.toUpperCase()})` : ` (${code.toUpperCase()})`),
    ),
  )
}

async function ggameItems(level, { token, deps }) {
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
      const sub = t.sub?.ru || t.sub?.en || ''
      return item(`ggame.${t.id}`, 'ggame', quote(title), `${sub ? `: ${strip(sub)}` : ''} (игра, ${t.lv}${ranges.get(t.lv) ? `, ${ranges.get(t.lv)}` : ''})`)
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
  return lists.flat().filter((t) => t?.id).map((t) => item(`reading.${t.id}`, 'reading', quote(t.title), t.genre ? ` (${t.genre})` : ''))
}

async function situationItems(level, { deps }) {
  const lvl = String(level || '').toLowerCase() === 'a0' ? 'a1' : String(level || '').toLowerCase()
  const levels = PRACTICE_LEVELS.includes(lvl) ? [lvl] : PRACTICE_LEVELS
  const lists = await Promise.all(
    levels.map(async (code) => {
      const data = await deps.readJson(`practice/situations/${code}.json`).catch(() => null)
      return (data?.items || []).map((s) => {
        const ru = s.title?.ru || s.title?.en || `ситуация ${s.id}`
        return item(`situation.${code}.${s.id}`, 'situation', quote(ru), s.title?.en && s.title.en !== ru ? ` (${strip(s.title.en)}, ${code.toUpperCase()})` : ` (${code.toUpperCase()})`)
      })
    }),
  )
  return lists.flat()
}

async function shadowingItems(_level, { token, deps }) {
  const local = SHADOWING_LESSONS.map((l) => item(`shadowing.${l.id}`, 'shadowing', quote(l.title), l.short ? ` (${strip(l.short)})` : ''))
  const remote = await deps.getJson('/mobile/shadowing', token)
  const seen = new Set(SHADOWING_LESSONS.map((l) => l.id))
  const extra = (Array.isArray(remote) ? remote : [])
    .filter((r) => typeof r?.slug === 'string' && r.slug.includes('-') && !seen.has(r.slug) && strip(r.title))
    .map((r) => item(`shadowing.${r.slug}`, 'shadowing', quote(r.title), r.speaker ? ` (${strip(r.speaker)})` : ''))
  return [...local, ...extra]
}

async function wordsItems(_level, { deps }) {
  const meta = await deps.readJson('practice/words/meta.json').catch(() => null)
  return (meta?.sections || []).flatMap((s) =>
    (s.scenes || []).map((sc) => item(`words.${sc.id}`, 'words', quote(sc.name), ` (${strip(s.name)})`)),
  )
}

async function workbookItems(_level, { deps }) {
  const dirs = await deps.listDirs('practice/workbook').catch(() => [])
  return dirs.filter((d) => /^(a0|a1|a2|b1|b2|c1)$/.test(d)).map((d) => item(`workbook.${d}`, 'workbook', `воркбук ${d.toUpperCase()}`))
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
    .map((h) => item(`homework.${h.id}`, 'homework', quote(h.title || 'домашняя работа'), h.dueDate ? ` (до ${fmtDate(h.dueDate)})` : ''))
}

async function liveItems(_level, { token, deps, now = Date.now() }) {
  const list = await deps.getJson('/admin/lessons/occurrences', token)
  return (Array.isArray(list) ? list : [])
    .filter((o) => o?.lessonId != null && new Date(o.scheduledAt).getTime() >= now - 2 * 3600_000)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5)
    .map((o) => item(`live.${o.lessonId}`, 'live', `урок ${fmtDate(o.scheduledAt)}`, o.teacherName ? ` с ${strip(o.teacherName)}` : ''))
}

const BUILDERS = {
  course: courseItems,
  grammar: grammarItems,
  ggame: ggameItems,
  reading: readingItems,
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
export async function buildItemCatalog({ kinds, level, token, deps = defaultDeps, now }) {
  const uniq = [...new Set(kinds)].filter((k) => BUILDERS[k])
  const lists = await Promise.all(uniq.map((k) => BUILDERS[k](level, { token, deps, now }).catch(() => [])))
  const items = new Map()
  const sections = []
  uniq.forEach((kind, i) => {
    const list = lists[i].slice(0, MAX_LINES)
    if (!list.length) return
    for (const it of list) items.set(it.ref, it)
    sections.push(`${HEADERS[kind](level)}:\n${list.map((it) => it.line).join('\n')}`)
  })
  return { text: sections.length ? sections.join('\n') : null, items }
}

/** Вещь по адресу — когда каталога в этом запросе нет (ученик ответил «да» на её «Открыть?»). */
export async function resolveItem(ref, { token, deps = defaultDeps, now } = {}) {
  const parsed = parseItemRef(ref)
  if (!parsed) return null
  const { items } = await buildItemCatalog({ kinds: [parsed.kind], level: parsed.level, token, deps, now })
  return items.get(ref) || null
}
