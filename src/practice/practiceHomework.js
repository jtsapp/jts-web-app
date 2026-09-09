'use client'

// Мост «Практика → домашняя работа».
//
// Прогресс раздела живёт в кабинете (localStorage + своя база), а домашние
// работы — в JTS-бэкенде: две разные стороны, и связать их может только клиент,
// у которого есть и то и другое. Пока моста не было, ученик проходил заданный
// юнит, а в домашке он оставался невыполненным — «выполнено» преподаватель
// ставил руками, по слову ученика.
//
// Best-effort, как и синк прогресса: отметка в «Практике» уже сохранена, и
// сетевая осечка не должна её отменять. Гость на сервер не пишет.

import { loadToken } from '../lib/session.js'
import { markPracticeUnitDone } from '../api.js'

/**
 * Сообщает бэкенду, что юнит пройден.
 *
 * @param area    раздел «Практики»: grammar, workbooks, shadowing…
 * @param level   код уровня; null там, где уровня нет (шэдоуинг)
 * @param address номер юнита (грамматика) ИЛИ строковый ключ: код уровня у
 *                воркбуков, id урока у шэдоуинга — тот же адрес, каким юнит
 *                выдавали
 * @returns промис, который никогда не отклоняется — вызывающему ждать нечего.
 */
export function countUnitTowardsHomework(area, level, address) {
  const token = loadToken()
  if (!token || !area || address == null || address === '') return Promise.resolve()
  const numeric = typeof address === 'number'
  return markPracticeUnitDone(token, {
    area,
    level: level || null,
    unitId: numeric ? address : null,
    unitKey: numeric ? null : String(address),
  }).catch((e) => console.warn('[practice.homework] не удалось засчитать юнит', area, level, address, e))
}
