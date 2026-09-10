// Куда вести ученика по заданию «Практики», выданному на дом.
//
// Домашняя работа несёт АДРЕС юнита, а не его содержимое: раздел, уровень и
// либо номер (нумерована только грамматика), либо строковый ключ. Разделы при
// этом живут на разных экранах и принимают цель каждый по-своему: «Чтение» —
// { level, textId }, шэдоуинг — голую строку id урока, воркбуки — { level }.
// Эта карта — единственное место, где адрес превращается в переход.
//
// Отдельным модулем, а не веткой в App.jsx: handleNav и так плоская лесенка
// if/else, а разбор адреса нужен ещё и диплинку из админки (studentDeepLink.js
// рядом) и тестам — здесь он чистый и проверяется без монтирования экранов.
//
// ПОЧЕМУ ВОЗВРАЩАЕТСЯ null. Экраны кабинета на неизвестный адрес не ругаются, а
// молча подставляют своё: шэдоуинг открывает первый урок списка, аудирование и
// ситуации — A1, воркбук — A0. Для домашней работы это худший исход: ученик
// уверен, что решает заданное, а решает чужое. Поэтому адрес, которого в
// разделе нет, не превращается в переход вовсе — карточка остаётся без кнопки.

import { LESSONS } from '../practice/shadowing/lessons.js'

/** Уровни, которые физически есть в каждом разделе. */
const LEVELS = {
  grammar: ['a0', 'a1', 'a2', 'b1', 'b2', 'c1'],
  reading: ['a1', 'a2', 'b1', 'b2', 'c1'],
  // Единственный раздел с «половинным» уровнем: a2p — это не опечатка a2.
  writing: ['a1', 'a2', 'a2p', 'b1', 'b2', 'c1'],
  listening: ['a1', 'a2', 'b1', 'b2', 'c1'],
  workbooks: ['a0', 'a1', 'a2', 'b1', 'b2'],
  situations: ['a1', 'a2', 'b1', 'b2', 'c1'],
  // Уровней у шэдоуинга нет вовсе: уроки лежат одним списком, а каталог отдаёт
  // служебный код «all». Раздел здесь ради проверки «знаем ли мы такой».
  shadowing: [],
}

/**
 * Разделы, где адресом юнита служит сам код уровня.
 *
 * Там уровень и адрес — одно и то же значение, но приходят они двумя полями, и
 * при расхождении верить надо адресу: уровень мог остаться от старой выдачи.
 */
const LEVEL_IS_THE_UNIT = new Set(['listening', 'workbooks', 'situations'])

/**
 * Уровень адреса: из самого поля, а если его нет — из префикса ключа.
 *
 * Ключи разделов префиксованы уровнем (`a1-sci-honey`, `a2p-email-news`), и это
 * спасает выдачу, у которой уровень потерялся или пришёл в верхнем регистре:
 * экраны сверяют код как есть, `'A1'` для них — чужой уровень.
 *
 * Префикс ищем по списку уровней раздела, а не двумя символами: `a2p-email-news`
 * при срезе дал бы `a2` — соседний уровень с другим содержимым.
 */
export function addressLevel(level, key, levels) {
  const direct = String(level || '').trim().toLowerCase()
  if (levels.includes(direct)) return direct

  const id = String(key || '').trim().toLowerCase()
  // Сначала длинные коды: 'a2p-…' обязан выиграть у 'a2'.
  const byPrefix = [...levels]
    .sort((a, b) => b.length - a.length)
    .find((code) => id.startsWith(`${code}-`) || id === code)
  return byPrefix ?? null
}

/** Есть ли такой урок шэдоуинга: чужой id экран молча заменит первым в списке. */
function shadowingLessonExists(key) {
  return LESSONS.some((lesson) => lesson.id === key)
}

/**
 * Задание домашней работы → переход: `{ key, payload }` для onNav, либо null,
 * если открывать нечего (см. комментарий про null выше).
 *
 * Форма payload у каждого раздела своя и продиктована экраном — App.jsx кладёт
 * её в своё состояние без разбора.
 */
export function practiceNavTarget(exercise) {
  const area = String(exercise?.practiceArea || '').trim().toLowerCase()
  const key = exercise?.practiceUnitKey == null ? '' : String(exercise.practiceUnitKey).trim()
  const unitId = exercise?.practiceUnitId
  const levels = LEVELS[area]
  if (!levels) return null

  // У разделов, выдаваемых уровнем целиком, адрес важнее поля уровня.
  const level = LEVEL_IS_THE_UNIT.has(area)
    ? (addressLevel(key, key, levels) ?? addressLevel(exercise?.practiceLevel, key, levels))
    : addressLevel(exercise?.practiceLevel, key, levels)

  switch (area) {
    // Единственный нумерованный раздел: юнит ищется по номеру внутри уровня.
    case 'grammar':
      if (unitId == null || !level) return null
      return { key: 'practice', payload: { level, unitId } }

    case 'reading':
      if (!key || !level) return null
      return { key: 'reading', payload: { level, textId: key } }

    case 'writing':
      if (!key || !level) return null
      return { key: 'writing', payload: { level, genreId: key } }

    // Уровня у раздела нет вовсе, а payload — голая строка: так его ждёт
    // handleNav, и так же устроен проп lessonId у экрана.
    case 'shadowing':
      return key && shadowingLessonExists(key) ? { key: 'shadowing', payload: key } : null

    case 'listening':
      return level ? { key: 'listening', payload: { level } } : null

    // Ключ навигации в единственном числе — экран называется workbook, раздел
    // каталога workbooks. Промолчавший handleNav не имеет ветки по умолчанию,
    // и опечатка здесь стоила бы кнопки, которая ничего не делает.
    case 'workbooks':
      return level ? { key: 'workbook', payload: { level } } : null

    // Своего экрана у ситуаций нет: это оверлей поверх «Практики», и уровень —
    // самая мелкая единица, которую он умеет открыть.
    case 'situations':
      return level ? { key: 'practice', payload: { area: 'situations', level } } : null

    default:
      return null
  }
}
