// Каталог «Практики» для панели преподавателя.
//
// Сам контент «Практики» лежит статикой в этом приложении
// (`public/practice/grammar/index.json`), а назначает задания преподаватель из
// web-admin — другого источника у него нет: бэкенд этот контент не хранит и
// хранить не должен (см. ContentType — PRACTICE_* на бэкенде).
//
// Отдельная ручка, а не прямая ссылка на статику, по двум причинам:
//  * статику Next отдаёт без CORS, и запрос с домена админки браузер отклонил бы;
//  * из индекса нужен СПИСОК юнитов, а не всё его содержимое — теорию и
//    упражнения преподавателю в списке выбора показывать нечего, а весит она
//    в разы больше.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

const CORS = {
  // Каталог не персональный: в нём нет ни одного ученика и ни одного ответа —
  // это оглавление учебника. Токен здесь не нужен, и запрещать его домену
  // админки (их несколько: dev, prod, локальный) значило бы вести список хостов.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  // Оглавление меняется вместе с релизом приложения, не чаще.
  'Cache-Control': 'public, max-age=300',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'public', 'practice', 'grammar', 'index.json')
    const index = JSON.parse(await readFile(file, 'utf8'))

    const levels = (index.levels || []).map(({ code, label }) => ({
      code,
      label,
      units: (index[code]?.units || []).map((u) => ({
        id: u.id,
        title: stripTags(u.title),
        section: u.secName || '',
        // Сколько это займёт у ученика — преподаватель по этому и собирает
        // домашнюю работу: «два юнита по семь минут», а не «два юнита».
        minutes: u.min ?? null,
        difficulty: u.diff ?? null,
      })),
    }))

    return Response.json({ areas: [{ key: 'grammar', title: 'Грамматика', levels }] }, { headers: CORS })
  } catch (e) {
    return Response.json({ error: 'catalog unavailable' }, { status: 500, headers: CORS })
  }
}

/** Названия в каталоге размечены (<em>…</em>) — в списке выбора нужен голый текст. */
function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
