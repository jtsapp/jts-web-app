import { useEffect, useRef, useState } from 'react'
import { getIeltsAttempt, getIeltsTest, getIeltsWritingWorks } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { writingPartOf } from '../practice/practiceModel.js'

// Данные каталога Writing, которых нет в строке каталога (/mobile/ielts/tests): график и первая строка задания для
// карточки и критерии последней оценённой работы для «Рекомендуем по вашему разбору».

// Документ задания для превью: грузим, только когда карточка видна (IntersectionObserver), не больше трёх запросов
// разом, и помним до перезагрузки — 40 графиков Task 1 не должны уходить пачкой при каждом заходе в список.
const DOCS = new Map() // id → { doc } | { error: true }
const WAIT = new Map() // id → Promise
const QUEUE = []
let running = 0
const LIMIT = 3

function pump() {
  while (running < LIMIT && QUEUE.length) {
    const job = QUEUE.shift()
    running++
    getIeltsTest(job.token, job.id)
      .then((r) => DOCS.set(job.id, { doc: r?.document || null }))
      .catch(() => DOCS.set(job.id, { error: true }))
      .finally(() => {
        running--
        job.done()
        pump()
      })
  }
}

export function loadTaskDoc(token, id) {
  if (DOCS.has(id)) return Promise.resolve(DOCS.get(id))
  if (!WAIT.has(id)) {
    WAIT.set(
      id,
      new Promise((resolve) => {
        QUEUE.push({ token, id, done: () => resolve(DOCS.get(id)) })
        pump()
      }).finally(() => WAIT.delete(id)),
    )
  }
  return WAIT.get(id)
}

/** Документ задания карточки; ref — элемент карточки: грузим, когда он показался на экране (или сразу без IO). */
export function useTaskDoc(token, id, ref) {
  const [entry, setEntry] = useState(null)
  useEffect(() => {
    if (DOCS.has(id)) return undefined
    let alive = true
    const start = () => loadTaskDoc(token || loadToken(), id).then((e) => alive && setEntry(e || { error: true }))
    const el = ref?.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      start()
      return () => {
        alive = false
      }
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect()
          start()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => {
      alive = false
      io.disconnect()
    }
  }, [token, id, ref])
  // уже загруженное — сразу из памяти, без лишней отрисовки
  return DOCS.get(id) || entry
}

/** Первая строка формулировки — превью Task 2 и писем. */
export function firstLine(doc) {
  return String(doc?.question || '').split(/\n+/).map((s) => s.trim()).find(Boolean) || ''
}

// Последняя оценённая работа — на вкладку один раз за 5 минут: блок «по разбору» стоит и на главной «Практики», и во
// вкладке тренировок, и без памяти каждое переключение тянуло бы «Мои работы» и саму работу.
let REVIEW = { key: null, at: 0, promise: null }
const REVIEW_TTL = 5 * 60 * 1000

async function fetchLatestReview(token) {
  const rows = await getIeltsWritingWorks(token)
  const done = (Array.isArray(rows) ? rows : [])
    .filter((w) => w.status === 'done' && w.band != null)
    .sort((a, b) => String(b.finishedAt || '').localeCompare(String(a.finishedAt || '')))[0]
  if (!done) return null
  const v = await getIeltsAttempt(token, done.attemptId)
  const criteria = v?.result?.criteria
  if (!criteria) return null
  return {
    attemptId: done.attemptId,
    testId: done.testId,
    title: done.title,
    category: done.category || null,
    part: writingPartOf({ kind: done.kind, category: done.category, module: ['formal', 'semi_formal', 'informal'].includes(done.category) ? 'general' : null }),
    criteria,
  }
}

/** Последняя оценённая работа Writing с критериями или null (гость, нет работ, ошибка — блока просто нет). */
export function useLatestWritingReview(token) {
  const [review, setReview] = useState(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    const tk = token || loadToken()
    if (!tk) return undefined
    if (REVIEW.key !== tk || Date.now() - REVIEW.at > REVIEW_TTL || !REVIEW.promise) {
      REVIEW = { key: tk, at: Date.now(), promise: fetchLatestReview(tk).catch(() => null) }
    }
    REVIEW.promise.then((r) => alive.current && setReview(r))
    return () => {
      alive.current = false
    }
  }, [token])
  return review
}

/** Для тестов: сбросить память превью и разбора. */
export function resetCatalogData() {
  DOCS.clear()
  WAIT.clear()
  QUEUE.length = 0
  running = 0
  REVIEW = { key: null, at: 0, promise: null }
}
