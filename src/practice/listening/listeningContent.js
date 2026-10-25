// Откуда «Аудирование» берёт задания и записи. Источник — бэкенд
// (/practice-content/listening/<уровень>, записи — полным URL MinIO); пока
// на стенде пакет не залит — файлы public/practice/listening/** (см.
// src/practice/remoteContent.js).
import { loadPracticeContent } from '../remoteContent.js'

export const listeningStaticUrl = (level) => `/practice/listening/content/${level}.json`

export function loadListeningLevel(level, opts) {
  return loadPracticeContent('listening', level, listeningStaticUrl(level), opts)
}

// С бэкенда приходит полный URL записи, в статике — имя файла в папке уровня.
export function listeningAudioUrl(level, audio) {
  const a = String(audio || '')
  return /^https?:\/\//i.test(a) ? a : `/practice/listening/audio/${level}/${a}`
}

// Разбор и подписи вставляются как HTML (в них <b>/<i>). Задания скоро будут
// писать преподаватели через админку — бэкенд пропускает только эти теги, а
// здесь вторая линия: всё, кроме <b>/<i> без атрибутов, уходит текстом.
const ALLOWED = /<\/?(b|i)>/gi

export function safeMarkup(html) {
  const s = String(html ?? '')
  let out = ''
  let last = 0
  for (const m of s.matchAll(ALLOWED)) {
    out += escapeHtml(s.slice(last, m.index)) + m[0].toLowerCase()
    last = m.index + m[0].length
  }
  return out + escapeHtml(s.slice(last))
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
