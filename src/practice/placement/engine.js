'use client'

// Тест на определение уровня — фасад над перенесённым движком.
// Расчёты живут в engine.generated.js (перенос из бандла школы один в один,
// сверка — placementParity.test.js). Здесь только загрузка данных и то, что
// нужно экрану: последовательность блоков и удобные обёртки.

import { Session, mergeBank2 } from './engine.generated.js'

const BANK_URL = '/practice/placement/bank.json'
const AUDIO_BASE = '/practice/placement/jts-bank/'

// Данные — 154 КБ на всё: банк заданий, дополнительный банк (минимальные пары,
// клипы, аудирование, интерактив), манифест озвучки и словарь LexTALE.
// Промис мемоизируется на модуль: экран открывают один раз за сессию, но
// возврат назад не должен тянуть файл заново. Промах не кэшируем — иначе
// единственный сбой сети оставил бы тест недоступным до перезагрузки.
//
// cache: 'no-store' — намеренно, вопреки общему правилу `/practice/:path*`
// (next.config.mjs, час свежести + сутки stale-while-revalidate). Для картинок
// и аудио устаревший кэш — секунда лишнего ожидания; для банка заданий это
// расхождение id с ключами на сервере. Кто проверяет ответ, знает только
// сервер (bankSplit.js): при несовпадении id `gradeAnswer` в placementScore.js
// молча вернёт null, клиент превратит его в `?? 0` (submitGraded в
// PlacementTestPage.jsx) — то есть каждый такой ответ засчитается неверным,
// сколько бы верных вариантов студент ни выбрал. У раздела 'routing' цена
// этого особенно высока: он и так самый жёсткий фильтр теста (только
// A2–C1-задания), и шести молча провалившихся ответов достаточно, чтобы
// увести на A0-мост независимо от того, что студент действительно знает.
let _bankPromise = null
export function loadPlacementBank() {
  if (!_bankPromise) {
    _bankPromise = fetch(BANK_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          _bankPromise = null
          return null
        }
        // В бандле слияние выполнялось на верхнем уровне модуля; здесь данные
        // приходят из сети, поэтому сливаем сразу после загрузки и один раз.
        mergeBank2(data.bank, data.manifest, data.bank2)
        return data
      })
      .catch(() => {
        _bankPromise = null
        return null
      })
  }
  return _bankPromise
}

/** Сессия теста. Сид случайный: он определяет и порядок вариантов ответа, и
 *  выборку заданий, поэтому фиксировать его нельзя — иначе все студенты
 *  получат один и тот же тест. */
export function createPlacementSession(data, variant = 'express', seed = null) {
  return new Session(data.bank, data.manifest, seed ?? (Math.random() * 0xffffffff) >>> 0, variant)
}

/** Ссылка на озвучку задания: в банке пути относительные (`a1/x.mp3`). */
export function audioUrl(file) {
  return file ? AUDIO_BASE + file : null
}
