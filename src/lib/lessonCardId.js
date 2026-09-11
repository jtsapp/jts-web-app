// Устойчивый адрес карточки урока — ВТОРАЯ КОПИЯ.
//
// Первая живёт в админке: web-admin, src/app/feature/system/live-lessons/
// extract/card-id.ts. Копия, а не общая библиотека, потому что это два разных
// приложения без общего пакета; то же решение и по той же причине принято для
// движка банка слов (см. bindWordBank.js).
//
// СЧИТАТЬ ОБЕ КОПИИ ОБЯЗАНЫ ОДИНАКОВО: админка кладёт адрес в выдачу, кабинет по
// нему ищет карточку. Разъедутся — задание перестанет находиться, и молча.
// Поэтому обе стороны прогоняют ОДНУ фикстуру с одними и теми же ожидаемыми
// значениями (lessonCardId.test.js здесь и card-id.spec.ts там): сдвинулась
// любая — её тест краснеет.
//
// Зачем адрес по содержимому, а не (stepId, blockIndex): номер блока зависит от
// версии фронта, потому что подъёмы применяются к сохранённому уроку при каждом
// открытии и меняют состав блоков. Выкладка админки переставила бы уже выданные
// ссылки, не тронув базу.

/** Длина шестнадцатеричного хвоста. */
const HASH_LENGTH = 8

/** FNV-1a, 32 бита. Своя, а не зависимость: обе копии обязаны считать одинаково. */
function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    // Умножение на 16777619 через сдвиги: обычное * вышло бы за 32 бита.
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    hash >>>= 0
  }
  return hash.toString(16).padStart(HASH_LENGTH, '0').slice(-HASH_LENGTH)
}

/**
 * Текст без разметки и без вложенных картинок.
 *
 * Содержимое `data:`-URI выбрасываем: картинки курса лежат инлайном, и
 * перевыгрузка того же изображения меняет байты, не меняя того, что видит
 * человек. Сам факт «здесь была картинка» в подписи остаётся.
 */
function plainText(html) {
  return String(html ?? '')
    .replace(/<img[^>]*>/gi, ' [img] ')
    .replace(/(?:src|href)\s*=\s*"data:[^"]*"/gi, ' [data] ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Содержимое блока незнакомого типа — без служебного.
 *
 * `id` порядковый, а путь к аудио ОТНОСИТЕЛЬНЫЙ и абсолютизируется здесь, в
 * кабинете, при загрузке урока (rewriteMediaUrls) — в админке он таким и
 * остаётся. Оставь мы их в подписи, две копии считали бы РАЗНЫЕ адреса на одном
 * и том же блоке, и задание перестало бы находиться — молча. Ключи обходим по
 * Object.keys, а не rest-деструктуризацией: порядок обхода обязан совпадать с
 * копией в админке.
 */
const SERVICE_KEYS = new Set(['id', 'audio'])

function contentJson(block) {
  const source = block ?? {}
  const content = {}
  for (const key of Object.keys(source)) {
    if (!SERVICE_KEYS.has(key)) content[key] = source[key]
  }
  return JSON.stringify(content)
}

/** Подпись вопроса: без его собственного id — тот порядковый и умеет сталкиваться. */
function questionSignature(q) {
  const parts = [q.type, plainText(String(q.prompt ?? ''))]
  if (Array.isArray(q.options)) parts.push(q.options.map((o) => plainText(String(o))).join('|'))
  if (Array.isArray(q.words)) parts.push(q.words.map((w) => plainText(String(w))).join('|'))
  if (Array.isArray(q.pairs)) {
    parts.push(q.pairs.map((p) => `${plainText(String(p?.left ?? ''))}=${plainText(String(p?.right ?? ''))}`).join('|'))
  }
  parts.push(plainText(String(q.gapBefore ?? '')), plainText(String(q.gapAfter ?? '')))
  return parts.join('\x1f')
}

function vocabSignature(cards) {
  return (cards ?? [])
    .map((c) => [c?.word, c?.pos, c?.definition, c?.translationRu].map((v) => plainText(String(v ?? ''))).join('~'))
    .join('|')
}

/**
 * Подпись карточки — то, чем она отличается от любой другой.
 *
 * Служебное не берём: собственный id блока (у writing он порядковый), путь к
 * аудио (относительный, абсолютизируется на показе), флаг hasRecorder.
 *
 * Части склеиваются управляющими символами (\x1e между полями блока, \x1d между
 * вопросами, \x1f внутри вопроса), а не пустой строкой: иначе «ab»+«c» и «a»+«bc»
 * дали бы одну подпись, то есть два разных задания — один адрес. В тексте урока
 * этих символов не бывает.
 */
export function cardSignature(block) {
  const b = block ?? {}
  const head = [b.type, plainText(String(b.title ?? '')), plainText(String(b.instruction ?? ''))]

  switch (b.type) {
    case 'info':
    case 'grammar_concept':
      return [...head, plainText(String(b.leadText ?? '')), plainText(b.html)].join('\x1e')
    case 'practice':
      return [...head, plainText(String(b.html ?? '')), (b.questions ?? []).map(questionSignature).join('\x1d')].join('\x1e')
    case 'vocab':
      return [...head, vocabSignature(b.cards)].join('\x1e')
    case 'checklist':
      return [...head, (b.items ?? []).map((i) => plainText(i)).join('|')].join('\x1e')
    case 'writing':
      return [...head, plainText(b.html), plainText(b.placeholder)].join('\x1e')
    case 'speaking':
      return [
        ...head,
        plainText(b.taskDescription),
        (b.steps ?? []).map((s) => plainText(s)).join('|'),
        (b.usefulPhrases ?? []).map((s) => plainText(s)).join('|'),
      ].join('\x1e')
    default:
      // Незнакомый тип адрес всё равно получает: без него карточку нельзя ни
      // выдать, ни найти. И это не теория: ⋮ в админке стоит на КАЖДОЙ
      // карточке, включая типы, которых ни один из двух экранов не рисует
      // (theory и banner из старых выгрузок).
      return [...head, plainText(contentJson(block))].join('\x1e')
  }
}

/**
 * Адреса всех карточек урока: Map «блок → адрес».
 *
 * Считать по одной нельзя: порядковый суффикс у одинаковых карточек виден
 * только на всём уроке. Урок вправе содержать две одинаковые карточки — одна и
 * та же инструкция над двумя упражнениями, — и без различителя обе получили бы
 * один адрес.
 */
export function lessonCardIds(lesson) {
  const ids = new Map()
  const seen = new Map()
  for (const step of lesson?.steps ?? []) {
    for (const block of step?.blocks ?? []) {
      const hash = fnv1a(cardSignature(block))
      const occurrence = seen.get(hash) ?? 0
      seen.set(hash, occurrence + 1)
      ids.set(block, occurrence === 0 ? `c${hash}` : `c${hash}.${occurrence}`)
    }
  }
  return ids
}

/**
 * Найти карточку по адресу — этим и живёт открытие ссылки из домашки.
 *
 * Не нашли — значит карточку правили или удалили. Возвращаем null, а не
 * ближайшую: открыть ученику не то, что задали, хуже, чем честно сказать, что
 * задания больше нет. Так же поступает адрес юнита «Практики».
 */
export function findCardById(lesson, cardId) {
  if (!cardId) return null
  const ids = lessonCardIds(lesson)
  for (const step of lesson?.steps ?? []) {
    const blocks = step?.blocks ?? []
    for (let i = 0; i < blocks.length; i++) {
      if (ids.get(blocks[i]) === cardId) {
        return { stepId: String(step.id), blockIndex: i, block: blocks[i] }
      }
    }
  }
  return null
}
