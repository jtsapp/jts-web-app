// Куда вести кабинет, открытый рамкой в уроке: экран карточки «Практики» и то, что ему передать.
import { cardOf } from '../screens/practice/practiceCatalog.js'

/**
 * @param {{card: string, level: string|null, unit: string|null}} target цель из адреса (embedTarget)
 * @returns {{screen: string, payload: object|null}} то, что уходит в handleNav
 */
export function embedNav(target) {
  const card = cardOf(target.card)
  // Карточка со своим экраном (тренажёр, игра): экран и, если есть, его выбор («Аркада» → игра).
  if (card.nav) return { screen: card.nav, payload: card.payload }
  // Карточка-каталог открывается списком раздела внутри «Практики»; юнит грамматики — сразу юнитом.
  if (target.card === 'grammar' && target.level && target.unit) {
    return { screen: 'practice', payload: { level: target.level, unitId: target.unit } }
  }
  return { screen: 'practice', payload: { filter: card.module } }
}
