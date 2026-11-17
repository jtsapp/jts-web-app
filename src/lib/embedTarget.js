// Раздел «Практики» в рамке урока: `?embed=practice&card=grammar&level=a2&unit=3`.
// Адрес строит бэкенд (lessonbuilder/PracticeCards): карточка из закрытого списка, уровень и единица — короткие адреса.
import { CARDS } from '../screens/practice/practiceCatalog.js'

const ADDRESS = /^[A-Za-z0-9_-]{1,64}$/

/** Короткий адрес: null — не задан, undefined — задан с чужими знаками. */
function address(value) {
  const text = (value || '').trim()
  if (!text) return null
  return ADDRESS.test(text) ? text : undefined
}

/** Цель встраивания из адреса страницы либо null: это обычный вход в кабинет. */
export function embedTarget(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  if (!params || typeof params.get !== 'function' || params.get('embed') !== 'practice') return null
  const card = params.get('card') || ''
  if (!Object.hasOwn(CARDS, card)) return null
  const level = address(params.get('level'))
  const unit = address(params.get('unit'))
  if (level === undefined || unit === undefined) return null
  return { card, level: level ? level.toLowerCase() : null, unit }
}
