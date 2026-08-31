// Проверка ответов и пересчёт результата теста — на сервере.
//
// Раньше банк заданий отдавался браузеру вместе с ключами, а уровень считал
// клиент и он же присылал его в профиль: уровень был утверждением клиента, а не
// измерением. Теперь ключей в публичном банке нет (см. bankSplit.js), ответы
// проверяет этот модуль, а итоговый уровень пересчитывается по журналу
// прохождения — теми же функциями движка, что использовал клиент.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  mergeBank2, eapEstimate, levelFromTheta, checkOpenAnswer, scoreOrderWords,
  scoreWriting, THETA0_BY_CANDO,
} from '../practice/placement/engine.generated.js'
import { mergeKeys } from '../practice/placement/bankSplit.js'
import keysFile from '../practice/placement/keys.generated.json'

// Стартовая θ после провала разминки: движок возвращает ученика на A1
// (PROVISIONAL_B.A1 в engine.generated.js — константа оттуда не экспортируется).
const THETA0_A1 = -2.15

let cached = null

/**
 * Публичный банк (то, что видит браузер) плюс ключи — только на сервере.
 * @returns {{bank, keys, manifest, vocab}}
 */
export function loadFullBank() {
  if (!cached) {
    const publicData = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'practice', 'placement', 'bank.json'), 'utf8'),
    )
    const data = mergeKeys(publicData, keysFile)
    mergeBank2(data.bank, data.manifest, data.bank2)
    cached = { bank: data.bank, keys: keysFile.items || {}, manifest: data.manifest, vocab: data.vocab }
  }
  return cached
}

function indexOf(bank) {
  const map = new Map()
  for (const item of bank.items || []) map.set(item.id, item)
  return map
}

/** Слова эталонного порядка (как в экране: ответ без финальной точки). */
function orderWords(answer) {
  return String(answer || '').replace(/[.!?]$/, '').split(/\s+/).filter(Boolean)
}

const ratio = (n, hits) => (n ? hits / n : 0)

/**
 * Проверяет один ответ по ключам. Возвращает долю верного (0..1) или null,
 * если проверить нечего (говорение, задание без ключа, незнакомый id).
 * [item] — задание из полного банка, [key] — его запись в ключах.
 */
export function gradeAnswer(item, key, answer) {
  if (!item || item.affectsLevel === false) return null
  const a = answer || {}

  if (item.type === 'tfns') {
    const truth = key?.statements || (item.statements || []).map((s) => s.key)
    return ratio(truth.length, truth.filter((t, i) => (a.answers || [])[i] === t).length)
  }
  if (item.type === 'order' && item.steps) {
    return scoreOrderWords(key?.steps || item.steps, a.seq || [])
  }
  if (item.type === 'order') {
    const built = Array.isArray(a.arr) ? a.arr : String(a.built || '').split(/\s+/).filter(Boolean)
    return scoreOrderWords(orderWords(key?.answer ?? item.answer), built)
  }
  if (item.type === 'bankfill') {
    const truth = key?.answers || item.answers || []
    return ratio(truth.length, truth.filter((t, i) => (a.gaps || [])[i] === t).length)
  }
  if (item.type === 'match') {
    // Правая колонка в публичном банке перемешана: верным считается индекс из
    // matchMap, а не совпадение позиций.
    const truth = key?.matchMap || (item.pairs || []).map((_, i) => i)
    return ratio(truth.length, truth.filter((t, i) => (a.map || [])[i] === t).length)
  }
  if (item.block === 'minpair') {
    // Выбранное слово, а не индекс: варианты перемешиваются на клиенте.
    return typeof a.word === 'string' ? (a.word === item.word ? 1 : 0) : null
  }
  if (item.block === 'writing') {
    return a.text ? scoreWriting(item, a.text).total / 9 : null
  }
  if (item.block === 'speaking') return null
  if (item.options) {
    const truth = key?.key ?? item.key
    return Number.isInteger(a.optIndex) && truth != null && a.optIndex === truth ? 1 : 0
  }
  const open = key?.answer ?? item.answer
  if (open) return checkOpenAnswer({ ...item, answer: open }, a.text || '') ? 1 : 0
  return null
}

/**
 * Проверяет пачку ответов (раздел теста целиком).
 * @returns {Array<{id: string, correct: number|null}>}
 */
export function gradeAnswers(answers, source = loadFullBank()) {
  const items = indexOf(source.bank)
  return (answers || []).map((a) => ({
    id: a?.id ?? null,
    correct: gradeAnswer(items.get(a?.id), source.keys[a?.id], a),
  }))
}

/**
 * Считает уровень по уже проверенным ответам: [{id, correct}] в порядке
 * прохождения. Это то, что помнит сервер о прогоне, — журнал клиента здесь не
 * участвует.
 * @returns {{level, theta, se, answered, correct, verified, unverified, flags}}
 */
export function scoreGradedAnswers(records, theta0, source = loadFullBank()) {
  const items = indexOf(source.bank)
  const graded = []
  for (const r of records || []) {
    const item = items.get(r?.id)
    if (!item || typeof r.correct !== 'number') continue
    graded.push({ item, correct: r.correct, block: item.block })
  }
  return summarise(graded, theta0, (records || []).length)
}

/**
 * Пересчитывает уровень по журналу прохождения.
 * @returns {{level, theta, se, answered, correct, verified, unverified, flags}}
 */
export function scorePlacementSession(session, source = loadFullBank()) {
  const log = Array.isArray(session?.log) ? session.log : []
  const items = indexOf(source.bank)
  const preFlags = []

  const graded = []
  for (const entry of log) {
    const item = entry?.id ? items.get(entry.id) : null
    const correct = gradeAnswer(item, source.keys[entry?.id], entry)
    if (correct == null) {
      if (item && item.affectsLevel !== false && item.block !== 'speaking') preFlags.push('unverified')
      continue
    }
    graded.push({ item, correct, block: item.block })
  }
  return summarise(graded, thetaPrior(session?.theta0), log.length, preFlags)
}

/** Приор: самооценка клиента, но только из допустимого набора. */
function thetaPrior(declared) {
  const value = Number(declared)
  return THETA0_BY_CANDO.includes(value) ? value : 0
}

/** Общий подсчёт: A0-ветка, θ по EAP, полоса и флаги. */
function summarise(graded, declaredTheta0, answered, preFlags = []) {
  const flags = [...preFlags]

  // A0-ветка: разминка провалена (4+ ошибок из 6) и мост не пройден.
  const routing = graded.filter((g) => g.block === 'routing')
  const wrongRouting = routing.filter((g) => g.correct === 0).length + Math.max(0, 6 - routing.length)
  const bridge = graded.filter((g) => g.block === 'a0_bridge')
  const branched = wrongRouting >= 4
  const bridgePassed = branched && bridge.length >= 2 && bridge.every((g) => g.correct === 1)

  // После пройденного моста движок возвращает ученика на A1 и забывает разминку.
  let theta0 = thetaPrior(declaredTheta0)
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
    answered,
    correct: graded.filter((g) => g.correct >= 0.99).length,
    verified: graded.length,
    unverified: answered - graded.length,
    flags: [...new Set(flags)],
  }
}
