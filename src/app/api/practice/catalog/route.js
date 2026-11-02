// Каталог «Практики» для панели преподавателя.
//
// Сам контент «Практики» лежит статикой в этом приложении (public/practice/**
// и пара индексов в src/practice/**), а назначает задания преподаватель из
// web-admin — другого источника у него нет: бэкенд этот контент не хранит и
// хранить не должен (см. ContentType — PRACTICE_* на бэкенде).
//
// Исключение растёт: материалы Практики переезжают в админку раздел за
// разделом (спека 2026-10-21-practice-content-to-admin-design.md). Счётчики
// Аудирования и тексты «Чтения» берутся у бэкенда (/practice-content/<раздел>/…),
// а с диска — только пока пакет на стенде не залит.
//
// Отдельная ручка, а не прямая ссылка на статику, по двум причинам:
//  * статику Next отдаёт без CORS, и запрос с домена админки браузер отклонил бы;
//  * из индексов нужен СПИСОК юнитов, а не всё их содержимое — теорию, тексты и
//    аудио преподавателю в списке выбора показывать нечего, а весят они в разы
//    больше.
//
// АДРЕС ЮНИТА. Нумерованы юниты только в грамматике — там у задания есть `id`.
// В остальных разделах адрес строковый (`key`), и он же уезжает в домашнюю
// работу (practice_unit_key на бэкенде): текст «Чтения» — a1-sci-honey, урок
// шэдоуинга — sg, жанр «Письма» — a1-form. Там, где единицей выдачи может быть
// только уровень целиком (аудирование, воркбуки, разговорная практика), ключ —
// код уровня: мельче ученику всё равно не открыть.

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { SITUATION_LEVELS } from '../../../../practice/situations/levels.js'
import { LESSONS as SHADOWING_LESSONS } from '../../../../practice/shadowing/lessons.js'
import { BACKEND_URL } from '../../../../lib/auth-server.js'
import { PRACTICE_CORS } from '../practiceCors.js'

export const runtime = 'nodejs'

const CORS = PRACTICE_CORS

const PRACTICE_DIR = () => path.join(process.cwd(), 'public', 'practice')

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  try {
    // Раздел, который не собрался (нет папки, битый JSON), не должен уносить с
    // собой весь каталог: преподаватель останется вообще без выбора, хотя
    // остальные разделы на месте. Поэтому каждый строится сам по себе.
    const areas = (await Promise.all([
      grammarArea(),
      readingArea(),
      writingArea(),
      listeningArea(),
      shadowingArea(),
      workbooksArea(),
      situationsArea(),
    ])).filter((area) => area && area.levels.length)

    return Response.json({ areas }, { headers: CORS })
  } catch (e) {
    return Response.json({ error: 'catalog unavailable' }, { status: 500, headers: CORS })
  }
}

/** Грамматика — единственный раздел с нумерованными юнитами. */
async function grammarArea() {
  return safe(async () => {
    const index = await readJson(path.join(PRACTICE_DIR(), 'grammar', 'index.json'))
    const levels = (index.levels || []).map(({ code, label }) => ({
      code,
      label,
      units: (index[code]?.units || []).map((u) => ({
        id: u.id,
        title: stripTags(u.title),
        section: u.secName || '',
        // Одной темы мало: «Present simple negative» — это ярлык правила, а не
        // ответ на вопрос «что ученик будет делать». Описание у юнита есть с
        // самого начала, просто до преподавателя не доезжало.
        desc: stripTags(u.desc || '') || null,
        // Сколько это займёт у ученика — преподаватель по этому и собирает
        // домашнюю работу: «два юнита по семь минут», а не «два юнита».
        minutes: u.min ?? null,
        difficulty: u.diff ?? null,
      })),
    }))
    return { key: 'grammar', title: 'Грамматика', levels }
  })
}

/**
 * «Чтение»: единица — текст, адрес — его id (a1-sci-honey).
 *
 * Тексты — с бэкенда (их заводят в админке), пока пакет не залит — с диска.
 * Источник один на весь раздел: упади один уровень с бэкенда, а остальные
 * возьмись с диска, преподаватель увидел бы смесь двух каталогов — с текстами,
 * которые на стенде уже скрыты или удалены.
 */
async function readingArea() {
  return safe(async () => {
    const levels = (await remoteReadingLevels()) || (await diskReadingLevels())
    return {
      key: 'reading',
      title: 'Чтение',
      levels: levels.map(({ code, texts }) => ({
        code,
        label: code.toUpperCase(),
        units: texts.map((text) => ({
          key: text.id,
          title: stripTags(text.title),
          section: text.genre || '',
          minutes: text.mins ?? null,
          difficulty: null,
        })),
      })),
    }
  })
}

// null — «у бэкенда нет»: пакет не залит, бэкенд молчит или ответил не то.
async function remoteReadingLevels() {
  try {
    const get = async (p) => {
      const res = await fetch(`${BACKEND_URL}/practice-content/reading/${p}`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('bad status ' + res.status)
      return res.json()
    }
    const rows = await get('levels')
    const codes = Array.isArray(rows)
      ? rows.filter((r) => r && typeof r.level === 'string' && r.count > 0).map((r) => r.level)
      : []
    if (!codes.length) return null
    const texts = await Promise.all(codes.map((code) => get(code)))
    if (texts.some((list) => !Array.isArray(list))) return null
    return codes.map((code, i) => ({ code, texts: texts[i] })).filter((l) => l.texts.length)
  } catch {
    return null
  }
}

async function diskReadingLevels() {
  const dir = path.join(PRACTICE_DIR(), 'reading')
  const out = []
  for (const code of await levelFiles(dir)) {
    const data = await readJson(path.join(dir, `${code}.json`))
    const texts = data.texts || []
    if (texts.length) out.push({ code, texts })
  }
  return out
}

/** «Письмо»: единица — жанр (seed), адрес — его id (a1-form). */
async function writingArea() {
  return safe(async () => {
    const dir = path.join(PRACTICE_DIR(), 'writing')
    const levels = []
    for (const code of await levelFiles(dir)) {
      const data = await readJson(path.join(dir, `${code}.json`))
      const units = (data.seeds || []).map((seed) => ({
        key: seed.id,
        title: stripTags(seed.title),
        section: stripTags(seed.sub || ''),
        minutes: seed.mins ?? null,
        difficulty: null,
      }))
      if (units.length) levels.push({ code, label: code.toUpperCase(), units })
    }
    return { key: 'writing', title: 'Письмо', levels }
  })
}

/**
 * «Аудирование»: выдаётся уровень целиком.
 *
 * Внутри уровня больше сотни коротких заданий, и открыть одно из них ученику
 * нечем — экран проигрывает их подряд. Обещать в домашней работе адрес, по
 * которому нельзя перейти, хуже, чем задать уровень.
 */
async function listeningArea() {
  return safe(async () => {
    const levels = (await remoteListeningLevels()) || (await diskListeningLevels())
    return {
      key: 'listening',
      title: 'Аудирование',
      levels: levels.map(({ code, count }) => ({
        code,
        label: code.toUpperCase(),
        units: [{
          key: code,
          title: `Аудирование ${code.toUpperCase()}`,
          section: `${count} заданий`,
          minutes: null,
          difficulty: null,
        }],
      })),
    }
  })
}

// null — «у бэкенда нет»: пакет не залит, бэкенд молчит или ответил не то.
async function remoteListeningLevels() {
  try {
    const res = await fetch(`${BACKEND_URL}/practice-content/listening/levels`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const rows = await res.json()
    const levels = Array.isArray(rows)
      ? rows.filter((r) => r && typeof r.level === 'string' && r.count > 0).map((r) => ({ code: r.level, count: r.count }))
      : []
    return levels.length ? levels : null
  } catch {
    return null
  }
}

async function diskListeningLevels() {
  const dir = path.join(PRACTICE_DIR(), 'listening', 'content')
  const out = []
  for (const code of await levelFiles(dir)) {
    const items = await readJson(path.join(dir, `${code}.json`))
    const count = Array.isArray(items) ? items.length : 0
    if (count) out.push({ code, count })
  }
  return out
}

/**
 * Шэдоуинг: единица — урок, адрес — его id (sg).
 *
 * Уровней у раздела нет вовсе — уроки лежат одним списком, поэтому уровень
 * один, служебный: формат каталога общий для всех разделов.
 */
async function shadowingArea() {
  return safe(async () => {
    const units = SHADOWING_LESSONS.map((lesson) => ({
      key: lesson.id,
      title: stripTags(lesson.title),
      section: lesson.short || '',
      minutes: null,
      difficulty: null,
    }))
    return {
      key: 'shadowing',
      title: 'Шэдоуинг',
      levels: units.length ? [{ code: 'all', label: 'Все уроки', units }] : [],
    }
  })
}

/** Воркбуки: единица — уровень (ученик открывает воркбук целиком). */
async function workbooksArea() {
  return safe(async () => {
    const dir = path.join(PRACTICE_DIR(), 'workbook')
    const levels = []
    for (const code of await levelDirs(dir)) {
      const index = await readJson(path.join(dir, code, 'index.json')).catch(() => null)
      const lessons = index?.lessons?.length ?? index?.units?.length ?? 0
      levels.push({
        code,
        label: code.toUpperCase(),
        units: [{
          key: code,
          title: `Воркбук ${code.toUpperCase()}`,
          section: lessons ? `${lessons} уроков` : '',
          minutes: null,
          difficulty: null,
        }],
      })
    }
    return { key: 'workbooks', title: 'Воркбуки', levels }
  })
}

/** Разговорная практика: единица — уровень, как и считает его квота. */
async function situationsArea() {
  return safe(async () => {
    const levels = SITUATION_LEVELS.map((level) => ({
      code: level.code,
      label: level.label || level.code.toUpperCase(),
      units: [{
        key: level.code,
        title: `Разговорная практика ${level.label || level.code.toUpperCase()}`,
        section: level.items ? `${level.items} ситуаций` : (level.desc || ''),
        minutes: null,
        difficulty: null,
      }],
    }))
    return { key: 'situations', title: 'Разговорная практика', levels }
  })
}

/** Раздел, который не собрался, просто не попадает в каталог. */
async function safe(build) {
  try {
    return await build()
  } catch {
    return null
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

/** Коды уровней по файлам `<level>.json`; служебные словари не в счёт. */
async function levelFiles(dir) {
  const names = await readdir(dir)
  return names
    .filter((n) => n.endsWith('.json') && n !== 'dict.json' && n !== 'index.json')
    .map((n) => n.replace(/\.json$/, ''))
    .sort()
}

/** Коды уровней по папкам — так разложены воркбуки. */
async function levelDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()
}

/** Названия в каталоге размечены (<em>…</em>) — в списке выбора нужен голый текст. */
function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
