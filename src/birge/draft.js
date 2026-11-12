// Модель формы «Новая ветка» и ответа (спека 2026-11-11 §5.1, §7). Лимиты — те же, что проверяет сервер: ученик
// узнаёт о них до отправки, а не отказом. Длина — в единицах UTF-16 (String.length): так же считает Java на
// бэкенде, и смайлик «весит» одинаково с обеих сторон.

export const TEXT_MAX = 500
export const PARTS_MAX = 4
export const PHOTOS_MAX = 4
// Счётчик символов появляется у самого предела: на коротком посте цифра «12/500» только отвлекает.
export const COUNTER_FROM = 450
// Ветка без фото — от 6 символов текста (§3.1, §5.1): короче сервер её не модерирует, а отклоняет 400. Комментарий
// («Да!», «+1») — норма, ему хватает одного символа.
export const THREAD_MIN_TEXT = 6

/** Пустой черновик: основной текст, продолжения ветки и фото ({ key, preview, status: uploading|ready, id }). */
export function emptyDraft() {
  return { text: '', parts: [], photos: [] }
}

/**
 * Вставка в позицию курсора. Позиция неизвестна или вне строки (в поле ещё не щёлкали) — в конец. Не влезает в
 * лимит — null: maxLength поля защищает только ввод с клавиатуры, а смайлик ставит код.
 */
export function insertAt(text, pos, insert, max = TEXT_MAX) {
  if (text.length + insert.length > max) return null
  const at = Number.isInteger(pos) && pos >= 0 && pos <= text.length ? pos : text.length
  return { text: text.slice(0, at) + insert + text.slice(at), pos: at + insert.length }
}

/** Счётчик поля: показывать ли (с 450) и не превышен ли предел. */
export function counter(text) {
  return { show: text.length >= COUNTER_FROM, len: text.length, over: text.length > TEXT_MAX }
}

export const photosUploading = (draft) => draft.photos.some((p) => p.status === 'uploading')
export const readyMediaIds = (draft) => draft.photos.filter((p) => p.status === 'ready').map((p) => p.id)
export const canAddPart = (draft) => draft.parts.length < PARTS_MAX
export const photoSlots = (draft) => Math.max(0, PHOTOS_MAX - draft.photos.length)

/**
 * «Опубликовать» доступна, когда ни одно фото не грузится и есть готовое фото или текст (§5.1): ветке без фото —
 * от 6 символов, комментарию — от одного.
 */
export function canPublish(draft, kind = 'thread') {
  if (photosUploading(draft)) return false
  if (draft.text.length > TEXT_MAX || draft.parts.some((p) => p.length > TEXT_MAX)) return false
  if (readyMediaIds(draft).length > 0) return true
  const len = draft.text.trim().length
  return kind === 'comment' ? len > 0 : len >= THREAD_MIN_TEXT
}

/**
 * Подсказка «Напишите хотя бы пару слов»: ветку начали, но текста меньше 6 символов и фото нет. Пустое поле —
 * без подсказки (его и так объясняет «Что нового?»); с фото, даже грузящимся, короткий текст допустим.
 */
export function tooShort(draft, kind = 'thread') {
  const len = draft.text.trim().length
  return kind === 'thread' && draft.photos.length === 0 && len > 0 && len < THREAD_MIN_TEXT
}

/**
 * Тело POST /mobile/birge/posts (§5.1). У комментария темы и продолжений нет — сервер их и так игнорирует, но
 * и слать незачем; пустые продолжения не шлём; фото — только загруженные (у них есть id).
 */
export function publishBody(draft, { kind, topic, parentId }) {
  const body = { text: draft.text.trim() }
  if (kind === 'comment') {
    body.parentId = parentId
  } else {
    body.topic = topic
    const continuations = draft.parts.map((p) => p.trim()).filter(Boolean)
    if (continuations.length) body.continuations = continuations
  }
  const mediaIds = readyMediaIds(draft)
  if (mediaIds.length) body.mediaIds = mediaIds
  return body
}

/** Весь текст ветки одной строкой — копия для подсветки отказа (как в прототипе: основной и продолжения через перевод строки). */
export function fullText(draft) {
  return [draft.text, ...draft.parts]
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n')
}
