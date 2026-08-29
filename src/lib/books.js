// Каталог книг: чтение с диска и превью для демо-аккаунта.
//
// Тексты книг лежат в data/books (вне public) и раздаются только через
// /api/books — иначе ограничение «демо читает первые главы» обходится прямым
// запросом к файлу, как это было, пока каталог лежал статикой. Обложки
// остались в public: картинка ничего не раскрывает.
//
// Ровно та же политика действует на книги из админки, но там её применяет
// бэкенд (BookPreviewService) — у него свой источник текста.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const BOOKS_DIR = path.join(process.cwd(), 'data', 'books')

/** Сколько глав открыто, когда бэкенд не ответил. Демо-квота BOOK живёт в
 *  базе, но эндпоинт книг публичный по смыслу (его открывает и аноним), и
 *  «не смогли спросить» здесь означает «показываем превью», а не «отдаём
 *  книгу целиком»: молчаливый сбой не должен раздавать платный текст. */
export const FALLBACK_PREVIEW_CHAPTERS = 2

/** Идентификатор книги приходит из адреса — пускаем только то, что похоже на
 *  имя выгруженного файла, иначе `../` уводит чтение из каталога книг. */
export function isValidBookId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id)
}

export async function readBookIndex() {
  try {
    return JSON.parse(await readFile(path.join(BOOKS_DIR, 'index.json'), 'utf8'))
  } catch {
    return null
  }
}

export async function readBookContent(id) {
  if (!isValidBookId(id)) return null
  try {
    return JSON.parse(await readFile(path.join(BOOKS_DIR, `${id}.json`), 'utf8'))
  } catch {
    return null
  }
}

/**
 * Сколько глав открыто этому запросу.
 *
 * Отдельной чистой функцией — это решение о выдаче платного контента, и
 * проверяться оно должно числами, а не сквозь сеть. Правила:
 * без аккаунта и с неопознанным токеном — превью (у анонима прав не больше,
 * чем у демо); для демо сбой запроса квоты означает превью, а не полный
 * доступ; у обычного ученика лимита нет.
 *
 * @param quota  ответ бэкенда о квоте BOOK: число, либо null («не настроено»
 *               или «не смогли спросить»).
 */
export function chapterLimitOf({ authenticated, isDemoAccount, quota }) {
  if (!authenticated) return FALLBACK_PREVIEW_CHAPTERS
  if (quota != null) return quota
  return isDemoAccount ? FALLBACK_PREVIEW_CHAPTERS : null
}

/**
 * Превью: у глав за пределами лимита остаётся заголовок, но не текст.
 * Оглавление намеренно не режется — ученик должен видеть, что книга больше
 * того, что ему открыли, иначе предложение купить доступ выглядит пустым.
 *
 * `limit === null` — ограничения нет, книга отдаётся как есть.
 */
export function applyPreview(content, limit) {
  if (!content || limit == null) return content
  const chapters = Array.isArray(content.chapters) ? content.chapters : []
  return {
    ...content,
    preview: { limit, total: chapters.length },
    chapters: chapters.map((chapter, i) =>
      i < limit ? { ...chapter, locked: false } : { ...chapter, text: '', locked: true },
    ),
  }
}
