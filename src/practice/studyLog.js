'use client'

// Ответы заданий для модели ученика Луны (ТЗ v2.0, 8.1 и 8.3; спека
// docs/superpowers/specs/2026-11-08-luna-student-model-methodology-design.md). Раздел зовёт recordStudy на каждый
// проверенный ответ — рядом с recordSkill, — журнал копит их и пачкой шлёт в POST /api/study/answers.
//
// Только для вошедших: без токена ответы не копятся вовсе (гостю Луна недоступна). Буфер — в памяти вкладки:
// модель — подсказка Луне, а не прогресс ученика, и пара ответов, потерянных на закрытии вкладки, ничего не ломает.
// Поэтому без localStorage (хранилище домена и так забито кэшем каталогов — ревью 08.10.2026), а уход со страницы
// дошлёт хвост keepalive-запросом.
//
// Пауза с прошлого ответа (gap) — для темпа: «всё верно и быстро». Считается здесь, по часам вкладки; у ответов,
// записанных пачкой в конце упражнения («Словарь»), паузы нет — раздел передаёт gap: null.

import { loadToken } from '../lib/session.js'
import { userIdFromToken } from '../lib/jwt.js'
import { MAX_BATCH, MAX_GAP_MS, cleanAnswer } from '../lib/studentModel/contract.js'

const FLUSH_DELAY = 1500
const RETRY_MS = 30_000
const MAX_QUEUE = 300
// Пример ошибки раздел может дослать сразу после ответа (mist прототипа «Грамматики · игр»): столько ждём.
const EXAMPLE_WINDOW_MS = 3000

let queue = [] // { answer, at }
let timer = null
let lastAt = 0
let owner = null // id ученика, чьи ответы в очереди

function ownerNow() {
  const token = loadToken()
  if (!token) return null
  const id = userIdFromToken(token)
  return id != null ? String(id) : token
}

/**
 * Ответ задания. gap: undefined — посчитать по прошлому ответу на вкладке; null — не мерили.
 * @param {{ source: 'ggame'|'vocab'|'lesson', item: string, ok: boolean, title?: string, level?: string,
 *           example?: string, extra?: object, gap?: number|null }} a
 */
export function recordStudy(a) {
  const who = ownerNow()
  if (!who) return
  if (owner && owner !== who) queue = [] // вошёл другой ученик — чужие ответы не уходят под его токеном
  owner = who
  const now = Date.now()
  let gap = a?.gap
  if (gap === undefined) {
    gap = lastAt && now - lastAt <= MAX_GAP_MS ? now - lastAt : null
    lastAt = now
  }
  const answer = cleanAnswer({ ...a, gap })
  if (!answer) return
  queue.push({ answer, at: now })
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE)
  clearTimeout(timer)
  timer = setTimeout(flushStudy, FLUSH_DELAY)
}

/** Пример к последней ошибке этой вещи, если она ещё в очереди (раздел знает пример уже после ответа). */
export function attachStudyExample(item, example) {
  const now = Date.now()
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i]
    if (now - q.at > EXAMPLE_WINDOW_MS) return
    if (q.answer.item === item && !q.answer.ok) {
      if (!q.answer.example) q.answer = cleanAnswer({ ...q.answer, example }) || q.answer
      return
    }
  }
}

export function flushStudy({ keepalive = false } = {}) {
  clearTimeout(timer)
  timer = null
  const token = loadToken()
  if (!token || !queue.length) return
  const who = ownerNow()
  if (owner && who !== owner) {
    queue = []
    return
  }
  const batch = queue.slice(0, MAX_BATCH)
  queue = queue.slice(MAX_BATCH)
  const sent = owner
  let failed = false
  fetch('/api/study/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ answers: batch.map((q) => q.answer) }),
    keepalive,
  })
    .then((res) => {
      // 4xx — пачка битая или вход протух: повтор того же не поможет.
      if (res.status >= 500) throw new Error('bad status ' + res.status)
    })
    .catch((e) => {
      failed = true
      console.warn('[study.sync] flush failed', e?.message || e)
      // Вернуть пачку, только если ученик тот же: после выхода ответы не должны уйти следующему.
      if (ownerNow() === sent) queue = [...batch, ...queue].slice(-MAX_QUEUE)
    })
    .finally(() => {
      // Сервер лежит — не долбить его каждые полторы секунды: следующая попытка через RETRY_MS (или с новым ответом).
      if (queue.length && !timer) timer = setTimeout(flushStudy, failed ? RETRY_MS : FLUSH_DELAY)
    })
}

/** Забыть ответы вкладки — при выходе из аккаунта (accountLeftovers.js), как навыки. */
export function clearStudyLog() {
  clearTimeout(timer)
  timer = null
  queue = []
  lastAt = 0
  owner = null
}

// Уход со страницы: хвост очереди — keepalive-запросом, он переживает выгрузку.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushStudy({ keepalive: true }))
}

/** Только для тестов. */
export function _studyQueue() {
  return queue.map((q) => ({ ...q.answer }))
}
