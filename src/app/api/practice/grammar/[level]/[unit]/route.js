// Упражнения одного юнита грамматики «Практики» — для конструктора уроков
// панели преподавателя (web-admin, «Добавить блок» → «Из Практики»).
//
// Преподаватель переносит упражнения в свой урок копией: админка превращает
// их в блоки конструктора сама, отсюда уходят только данные юнита как есть.
// Каталог (/api/practice/catalog) отдаёт лишь список юнитов, а сами упражнения
// лежат в файле уровня `public/practice/grammar/<level>.json` — статикой,
// которую Next отдаёт без CORS, и весит такой файл до 1,7 МБ. Поэтому
// отдельная ручка на один юнит.
//
// Теория (`learn`) и её переводы не уходят: в урок переносятся только
// упражнения, а теория — половина веса юнита.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PRACTICE_CORS } from '../../../practiceCors.js'

export const runtime = 'nodejs'

const GRAMMAR_DIR = () => path.join(process.cwd(), 'public', 'practice', 'grammar')

// Файлы уровней — статика релиза: прочитанный один раз не меняется до
// следующего деплоя, а каждое открытие юнита иначе разбирало бы мегабайты JSON.
const levelFiles = new Map()

export function OPTIONS() {
  return new Response(null, { status: 204, headers: PRACTICE_CORS })
}

export async function GET(request, { params }) {
  const { level, unit } = await params
  const unitId = Number(unit)
  if (!/^[a-z]\d$/.test(level || '') || !/^\d+$/.test(unit || '') || !Number.isSafeInteger(unitId)) {
    return notFound()
  }

  try {
    const index = await readJson(path.join(GRAMMAR_DIR(), 'index.json'))
    if (!(index.levels || []).some((l) => l.code === level)) return notFound()
    const entry = (index[level]?.units || []).find((u) => u.id === unitId)
    const data = await levelFile(level)
    const activities = data.units?.[String(unitId)]?.activities
    if (!entry || !Array.isArray(activities)) return notFound()

    return Response.json(
      { level, unitId, title: stripTags(entry.title), section: entry.secName || '', activities },
      { headers: PRACTICE_CORS },
    )
  } catch (e) {
    console.error('[practice/grammar] unit failed', level, unit, e)
    return Response.json({ error: 'unit_unavailable' }, { status: 500, headers: PRACTICE_CORS })
  }
}

function notFound() {
  return Response.json({ error: 'unit_not_found' }, { status: 404, headers: PRACTICE_CORS })
}

async function levelFile(level) {
  if (!levelFiles.has(level)) {
    const loading = readJson(path.join(GRAMMAR_DIR(), `${level}.json`))
    // Неудачное чтение не запоминается: иначе один сбой диска держал бы уровень
    // недоступным до рестарта.
    loading.catch(() => levelFiles.delete(level))
    levelFiles.set(level, loading)
  }
  return levelFiles.get(level)
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
