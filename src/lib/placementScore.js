// Пересчёт результата теста на сервере.
//
// Уровень до сих пор считал клиент и он же присылал его в профиль — то есть
// уровень был не измерением, а утверждением клиента: достаточно поменять одно
// число в запросе. Теперь клиент присылает журнал прохождения (сырые ответы:
// какой вариант выбран, что введено), а сервер сам перепроверяет каждый ответ
// по банку и заново считает θ теми же функциями движка, что и клиент.
//
// Чего это НЕ закрывает: банк вместе с ключами лежит в public/, поэтому
// подделать «правильный» журнал всё ещё можно — для этого ключи надо убрать из
// публичного банка и проверять каждый ответ отдельным запросом. Это следующий
// шаг; текущий убирает возможность просто назвать себе уровень.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  mergeBank2, eapEstimate, levelFromTheta, checkOpenAnswer, scoreTfns,
  scoreOrderWords, scoreBankfill, scoreMatch, scoreWriting, THETA0_BY_CANDO,
} from '../practice/placement/engine.generated.js'

// Стартовая θ после провала разминки: движок возвращает ученика на A1
// (PROVISIONAL_B.A1 в engine.generated.js — константа оттуда не экспортируется).
const THETA0_A1 = -2.15

let cachedBank = null

/** Банк с ключами. Тот же файл, что отдаётся клиенту, читается с диска. */
export function loadBank() {
  if (!cachedBank) {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'practice', 'placement', 'bank.json'), 'utf8'),
    )
    mergeBank2(raw.bank, raw.manifest, raw.bank2)
    cachedBank = raw.bank
  }
  return cachedBank
}

function indexOf(bank) {
  const map = new Map()
  for (const item of bank.items || []) map.set(item.id, item)
  return map
}

/** Слова эталонного порядка (как в экране: ответ без финальной точки). */
function orderWords(item) {
  return String(item.answer || '').replace(/[.!?]$/, '').split(/\s+/).filter(Boolean)
}

/**
 * Перепроверяет один ответ по банку. Возвращает долю верного (0..1) или null,
 * если по журналу пересчитать нечего (говорение, минимальные пары старых
 * клиентов, незнакомое задание).
 */
export function regradeEntry(item, entry) {
  if (!item || item.affectsLevel === false) return null
  if (item.type === 'tfns') return scoreTfns(item, entry.answers || [])
  if (item.type === 'order' && item.steps) return scoreOrderWords(item.steps, entry.seq || [])
  if (item.type === 'order') {
    const built = Array.isArray(entry.arr) ? entry.arr : String(entry.built || '').split(/\s+/).filter(Boolean)
    return scoreOrderWords(orderWords(item), built)
  }
  if (item.type === 'bankfill') return scoreBankfill(item, entry.gaps || [])
  if (item.type === 'match') return scoreMatch(item, entry.map || [])
  if (item.block === 'minpair') {
    // Выбранное слово, а не индекс: варианты перемешиваются на клиенте.
    return typeof entry.word === 'string' ? (entry.word === item.word ? 1 : 0) : null
  }
  if (item.block === 'writing') {
    return entry.text ? scoreWriting(item, entry.text).total / 9 : null
  }
  if (item.block === 'speaking') return null
  if (item.options) {
    return Number.isInteger(entry.optIndex) && entry.optIndex === item.key ? 1 : 0
  }
  if (item.answer) return checkOpenAnswer(item, entry.text || '') ? 1 : 0
  return null
}

/**
 * Пересчитывает уровень по журналу прохождения.
 * @returns {{level, theta, se, answered, correct, verified, unverified, flags}}
 */
export function scorePlacementSession(session, bank = loadBank()) {
  const log = Array.isArray(session?.log) ? session.log : []
  const items = indexOf(bank)
  const flags = []

  const graded = []
  for (const entry of log) {
    const item = entry?.id ? items.get(entry.id) : null
    const correct = regradeEntry(item, entry)
    if (correct == null) {
      if (item && item.affectsLevel !== false && item.block !== 'speaking') flags.push('unverified')
      continue
    }
    graded.push({ item, correct, block: item.block })
  }

  // A0-ветка: разминка провалена (4+ ошибок из 6) и мост не пройден.
  const routing = graded.filter((g) => g.block === 'routing')
  const wrongRouting = routing.filter((g) => g.correct === 0).length + Math.max(0, 6 - routing.length)
  const bridge = graded.filter((g) => g.block === 'a0_bridge')
  const branched = wrongRouting >= 4
  const bridgePassed = branched && bridge.length >= 2 && bridge.every((g) => g.correct === 1)

  // Приор: самооценка клиента, но только из допустимого набора; после
  // пройденного моста движок возвращает ученика на A1 и забывает разминку.
  const declared = Number(session?.theta0)
  let theta0 = THETA0_BY_CANDO.includes(declared) ? declared : 0
  let responses = graded
  if (bridgePassed) {
    theta0 = THETA0_A1
    responses = graded.filter((g) => g.block !== 'routing' && g.block !== 'a0_bridge')
  }

  const est = eapEstimate(theta0, responses.map((g) => ({ item: g.item, correct: g.correct })), null)
  const level = branched && !bridgePassed ? 'A0' : levelFromTheta(est.theta)

  if (branched) flags.push('a0_branch')
  if (est.se > 0.6) flags.push('unresolved')

  return {
    level,
    theta: Math.round(est.theta * 100) / 100,
    se: Math.round(est.se * 100) / 100,
    answered: log.length,
    correct: graded.filter((g) => g.correct >= 0.99).length,
    verified: graded.length,
    unverified: log.length - graded.length,
    flags: [...new Set(flags)],
  }
}
