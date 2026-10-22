// Откуда «Чтение» берёт тексты. Источник — бэкенд
// (/practice-content/reading/<уровень>, тексты заводят в админке «Библиотека →
// Чтение»); пока на стенде пакет не залит — файлы public/practice/reading/
// (см. src/practice/remoteContent.js).
//
// Бэкенд отдаёт массив текстов, файл уровня — обёртку {level, texts}. Экрану
// нужна одна форма, поэтому сводим ответ бэкенда к форме файла здесь, а не в
// компонентах.
import { loadPracticeContent } from '../remoteContent.js'

export const readingStaticUrl = (level) => `/practice/reading/${level}.json`

export async function loadReadingLevel(level, opts) {
  const { data, source } = await loadPracticeContent('reading', level, readingStaticUrl(level), opts)
  const texts = source === 'api' ? data : data?.texts
  if (!Array.isArray(texts)) throw new Error(`reading: bad level data ${level}`)
  return { data: { level: String(level).toUpperCase(), texts }, source }
}
