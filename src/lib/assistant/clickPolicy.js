// Что Луне можно нажимать на экране ученика (21.10.2026, решение владельца: «любые
// кнопки по просьбе ученика, кроме опасных»). Решает код, а не модель: правило в RULES
// модель держит через раз (как с TOUR_NOW, actions.js), а нажатую «Выйти» уже не
// вернуть. Модуль общий: снимок экрана не даёт таким кнопкам номера, роут снимает
// метку нажатия, окно перед нажатием проверяет кнопку ещё раз — снимок мог устареть.

import { openingFocus } from './opening.js'
import { namedByStudent, normCmd } from './voiceCommands.js'

// Опасное — ученик делает сам: выход, удаление, оплата и подписка, сдача и отправка
// работ, сброс, пароль. Сверка — по началу слова подписи: «Удалить», «Удаление» — да,
// а «Тарифы» (страница цен, не оплата) — нет.
const FORBIDDEN_ROOTS = [
  'выйти', 'выход', 'шығу', 'logout', 'signout',
  'удал', 'жою', 'өшір', 'delete',
  'оплат', 'купить', 'покупк', 'оформ', 'подписк', 'төле', 'сатып', 'жазыл', 'pay', 'buy', 'purchase', 'subscri', 'checkout',
  'сдать', 'отправ', 'заверш', 'тапсыр', 'жібер', 'аяқта', 'submit', 'send', 'finish',
  'сброс', 'reset',
  'парол', 'құпиясөз', 'password',
].map(normCmd)
const FORBIDDEN_PHRASES = ['log out', 'sign out', 'құпия сөз'].map(normCmd)

export function forbiddenLabel(label) {
  const n = normCmd(label)
  if (!n) return false
  if (FORBIDDEN_PHRASES.some((p) => ` ${n} `.includes(` ${p} `))) return true
  return n.split(' ').some((w) => FORBIDDEN_ROOTS.some((r) => w.startsWith(r)))
}

/** Кнопку не нажимать: опасная подпись или метка data-assistant-noclick на ней или предке. */
export function forbiddenButton(el, label) {
  return forbiddenLabel(label) || Boolean(el?.closest?.('[data-assistant-noclick]'))
}

/**
 * Можно ли нажать кнопку с подписью label по этой реплике ученика. На непроверенном
 * задании — только кнопку, которую ученик назвал сам: иначе Луна выбрала бы ответ за
 * него (решение владельца: «сама ответ не выбирает»), а различить «вариант ответа» и
 * «служебную кнопку» по разметке нельзя — варианты бывают и «play», и «продолжить».
 */
export function clickAllowed(label, { screenText = '', userText = '' } = {}) {
  if (forbiddenLabel(label)) return false
  if (!openingFocus(screenText).unchecked) return true
  return namedByStudent(label, userText)
}
