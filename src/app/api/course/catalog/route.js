// Оглавление тропы «Обучения» для кабинета преподавателя (web-admin, «Дать задание» → «Урок курса»; спека
// docs/superpowers/specs/2026-10-13-ge-teacher-plan-design.md, секция 2).
//
// Отдельно от /api/practice/catalog: курс не раздел Практики, и уроки в том каталоге попали бы в диалог домашек, а
// бэкенд домашек уроки курса не принимает. Коды — те же, что у тропы и у отметки урока на бэкенде (L<n>, T<юнит>,
// X<id>): задачу преподавателя закрывает отметка именно с этим кодом.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { courseTrail } from '../../../../learning/courseData.js'

export const runtime = 'nodejs'

const CORS = {
  // Оглавление учебника, а не данные ученика: токен не нужен, и список доменов админки (dev, prod, локальный) вести незачем.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  // Оглавление меняется вместе с релизом приложения, не чаще.
  'Cache-Control': 'public, max-age=300',
}

// Уровни курса нового поколения (public/course/<level>/); C1 на старом плеере, своей тропы с кодами L/T/X у него нет.
const LEVELS = ['a0', 'a1', 'a2', 'b1', 'b2']

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  const levels = []
  for (const level of LEVELS) {
    try {
      const index = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'course', level, 'index.json'), 'utf8'))
      const lessons = courseTrail(index).map((n) => ({ code: n.code, kind: n.kind, unit: n.unit ?? null, title: n.title || n.code }))
      if (lessons.length) levels.push({ level: level.toUpperCase(), lessons })
    } catch {
      // уровень не выгружен или файл битый — остальные уровни каталог не теряют
    }
  }
  return Response.json({ levels }, { headers: CORS })
}
