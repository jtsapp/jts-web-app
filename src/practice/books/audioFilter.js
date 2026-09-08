'use client'

// Фильтр библиотеки «Книжек» по наличию озвучки.
//
// Каталог приходит с бэкенда одним списком (/mobile/audio-lessons, см.
// getAudiobooks в src/api.js), и книги в нём разнородные: у части есть
// аудиодорожки, у части — только текст глав. Второй сорт появился, когда
// книги начали заливать выгрузкой библиотеки JTS Practice
// (scripts/import-practice-library.js): у неё аудио нет вовсе, есть текст,
// словарь и задания. До этого фильтра обе кучи лежали в одной ленте, и
// «дайте почитать» и «дайте послушать» одинаково приходилось листать целиком.
//
// Выбор — свойство устройства (наушники в транспорте против чтения глазами),
// а не прогресс аккаунта: на сервер не синкается и живёт в localStorage, как
// типографика читалки (src/practice/reading/viewSettings.js).

const KEY = 'jts_books_audio'

export const BOOKS_AUDIO_MODES = ['all', 'text', 'audio']
export const DEFAULT_BOOKS_AUDIO_MODE = 'all'

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Есть ли у книги озвучка.
 *
 * Смотрим и на ссылку у самой книги, и на дорожки глав: в админке заполняют
 * либо одно, либо другое — цельный файл на книгу или отдельный mp3 на главу.
 * Проверять по списку можно смело: detail-эндпоинт вырезает у треков только
 * текст и словарь, audioUrl остаётся и в списке
 * (AudioLessonMapperService.toResponse, backend), поэтому фильтр не требует
 * ни одного дополнительного запроса.
 *
 * Пустая строка — это «поле в админке не заполнили», а не «звук есть»: тот же
 * критерий, по которому книги без audioUrl отсеивает мобильное приложение
 * (audiobook_catalog_service.dart).
 */
export function hasAudio(book) {
  if (nonEmpty(book?.audioUrl)) return true
  const tracks = Array.isArray(book?.tracks) ? book.tracks : []
  return tracks.some((track) => nonEmpty(track?.audioUrl))
}

/**
 * Каталог под выбранный режим. Неизвестный режим равен «все»: фильтр — это
 * удобство, и битое значение в localStorage не должно прятать библиотеку.
 */
export function filterByAudio(books, mode) {
  const list = Array.isArray(books) ? books : []
  if (mode === 'audio') return list.filter(hasAudio)
  if (mode === 'text') return list.filter((book) => !hasAudio(book))
  return list
}

/** Сколько книг попадёт в каждый режим — для подписей сегментов. */
export function countByAudio(books) {
  const list = Array.isArray(books) ? books : []
  const audio = list.filter(hasAudio).length
  return { all: list.length, audio, text: list.length - audio }
}

/**
 * Режим, который реально применяем к каталогу.
 *
 * Запомненный выбор переживает перезагрузку, а каталог — нет: методисты ещё
 * не залили дорожки, и ученик, однажды нажавший «Аудио», при каждом заходе
 * встречал бы пустой раздел. Пока он в этой сессии сегмент не трогал, пустой
 * запомненный режим уступает «Все».
 *
 * `touched` обязателен: без него нельзя было бы нажать «Аудио» на каталоге без
 * озвучки — выбор сбрасывался бы тут же, и кнопка выглядела бы сломанной.
 * В localStorage при этом остаётся именно то, что выбрал ученик: появятся
 * аудиокниги — вернётся и его режим.
 */
export function effectiveBooksAudioMode(mode, books, touched) {
  if (touched) return mode
  const list = Array.isArray(books) ? books : []
  if (list.length === 0) return mode
  return filterByAudio(list, mode).length === 0 ? DEFAULT_BOOKS_AUDIO_MODE : mode
}

export function readBooksAudioMode() {
  try {
    const raw = localStorage.getItem(KEY)
    if (BOOKS_AUDIO_MODES.includes(raw)) return raw
  } catch {
    /* приватный режим — показываем всю библиотеку */
  }
  return DEFAULT_BOOKS_AUDIO_MODE
}

export function writeBooksAudioMode(mode) {
  if (!BOOKS_AUDIO_MODES.includes(mode)) return
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* нет квоты — выбор живёт до перезагрузки */
  }
}
