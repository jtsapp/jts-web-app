// Контент урока Shadowing: public/shadowing/<id>.json. В индексе (lessons.js)
// лежат только метаданные, фразы приезжают отсюда по требованию.
//
// Уроки, добавленные через админку, хранятся не файлом, а в базе: их фразы
// приезжают с бэкенда (GET /mobile/shadowing/{адрес}) и приводятся к тому же виду,
// что и файл, — экрану разницы нет.
//
// Кэш промисов на уровне модуля — по образцу src/learning/lessonData.js:
// переключение табов туда-сюда не должно бить в сеть, а параллельные вызовы
// (экран + пересчёт мастерства) должны схлопываться в один запрос. При ошибке
// запись из кэша убираем, чтобы следующий заход попробовал снова.

import { getShadowingLesson } from '../../api.js'
import { isRemoteLessonId } from './catalog.js'

const FILE_URL = (id) => `/shadowing/${id}.json`

// Файл вшитого урока меняется только релизом сайта, а фразы урока из админки
// методист может поправить в любой момент — поэтому такой кэш живёт недолго.
const REMOTE_TTL_MS = 2 * 60 * 1000

const cache = new Map() // id → { promise, at }

function fetchStaticFile(id) {
  return fetch(FILE_URL(id)).then((r) => {
    if (!r.ok) throw new Error(`shadowing ${id} ${r.status}`)
    return r.json()
  })
}

// Ответ бэкенда → вид файла урока: { id, title, short, video, source, level, segments }.
function fetchRemoteFile(id, token) {
  return getShadowingLesson(token, id).then((lesson) => ({
    id: lesson.slug,
    title: lesson.title,
    short: lesson.speaker || lesson.title,
    video: lesson.video,
    source: { channel: lesson.sourceChannel ?? null, url: lesson.sourceUrl ?? null },
    level: lesson.level ?? null,
    segments: Array.isArray(lesson.segments) ? lesson.segments : [],
  }))
}

// Файл урока целиком. Урок-болванка (сгенерил scripts/extract-shadowing.js,
// сегменты ещё не нарезаны) отдаётся как есть — экран покажет пустой скрипт, но
// авторский режим ?dev=1 останется рабочим, из него урок и добивают.
//
// token нужен только урокам из админки: вшитые читаются как обычная статика.
export function loadLessonFile(id, token) {
  const remote = isRemoteLessonId(id)
  const hit = cache.get(id)
  if (hit && (!remote || Date.now() - hit.at < REMOTE_TTL_MS)) return hit.promise

  const promise = (remote ? fetchRemoteFile(id, token) : fetchStaticFile(id)).catch((e) => {
    // Сбой не запоминаем — но и чужую более свежую запись не трогаем.
    if (cache.get(id)?.promise === promise) cache.delete(id)
    throw e
  })
  cache.set(id, { promise, at: Date.now() })
  return promise
}
