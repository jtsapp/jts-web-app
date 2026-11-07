'use client'

import { useEffect, useState } from 'react'
import { getIeltsPlan, getMyHomework, getMyMaterialAssignments } from '../api.js'
import { homeworkBadgeCount, homeworkCards } from './homeworkList.js'
import { ieltsHomeworkCards } from '../screens/homework/ieltsHomework.js'

// Домашка ученика по сети — одна загрузка на «Главную» и значок пункта меню «Домашняя работа» (ТЗ v2.0, 5.4).
// Источники те же, что у раздела (lib/homeworkList.js): работы, задания с урока и домашние задания IELTS. Общий
// запрос, пока он в пути: сайдбар и «Главная» монтируются вместе и иначе спрашивали бы одно и то же дважды, а значок
// мог бы разойтись с блоком «Домашка от преподавателя» на одной странице. Ответ не кэшируется — каждый экран
// спрашивает свежий список, как это делает значок договоров.

const inflight = new Map()
const listeners = new Set()

/**
 * Карточки домашки. Задания с урока и IELTS — как в разделе: их сбой работы не прячет. Сбой самих работ — отказ
 * (экран пишет «Не загрузилось», а не «всё сделано»). ielts — аккаунт IELTS: его задания живут в плане IELTS.
 */
export function loadMyHomework(token, { ielts = false } = {}) {
  const key = `${ielts ? 'ielts' : 'ge'}:${token}`
  if (inflight.has(key)) return inflight.get(key)
  // Каждый вызов — внутри цепочки: синхронный сбой (ручки нет в моке теста) становится отказом, а не падением экрана.
  const call = (fn) => Promise.resolve().then(fn)
  const task = Promise.all([
    call(() => getMyHomework(token)),
    call(() => getMyMaterialAssignments(token)).catch(() => []),
    ielts ? call(() => getIeltsPlan(token)).then(ieltsHomeworkCards).catch(() => []) : Promise.resolve([]),
  ]).then(([hw, assignments, ieltsCards]) => {
    const cards = [...homeworkCards(hw, assignments), ...ieltsCards]
    listeners.forEach((fn) => fn(token, cards))
    return cards
  })
  inflight.set(key, task)
  task.then(
    () => inflight.delete(key),
    () => inflight.delete(key),
  )
  return task
}

/**
 * Значок «Домашней работы»: сколько работ ждут ученика (просрочено + задано, homeworkBadgeCount). Без ответа — ноль,
 * чтобы меню не мигало. Перечитанный «Главной» список (кнопка «Повторить») обновляет и значок.
 */
export function useHomeworkBadge(token, { ielts = false } = {}) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!token) return undefined
    let alive = true
    const onCards = (tok, cards) => {
      if (alive && tok === token) setCount(homeworkBadgeCount(cards))
    }
    listeners.add(onCards)
    loadMyHomework(token, { ielts }).catch(() => {})
    return () => {
      alive = false
      listeners.delete(onCards)
    }
  }, [token, ielts])
  return count
}
