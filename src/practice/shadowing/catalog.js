'use client'

// Каталог уроков Shadowing = вшитые в сайт (lessons.js, public/shadowing/*.json) + добавленные методистом
// через админку (GET /mobile/shadowing).
//
// Почему не одним списком в lessons.js. Тот модуль синхронный и без сети: его читает и серверный каталог для панели
// преподавателя (/api/practice/catalog), и тесты содержимого. Админские уроки приезжают по сети и после входа, поэтому
// здесь они складываются в общий реестр: экраны получают его хуком useShadowingCatalog и перерисовываются, когда
// список доехал, а простым функциям (getLesson, hasLesson) он доступен без пропсов.
//
// Если админские уроки не доехали (нет сети, старый бэкенд), всё работает на вшитых — как до появления раздела.

import { useEffect, useSyncExternalStore } from 'react'
import { LESSONS } from './lessons.js'
import { getShadowingLessons } from '../../api.js'

// Адрес урока из админки: латиница, цифры и дефисы. Дефис в нём обязателен (его создаёт бэкенд), а у вшитых уроков
// (sg, v2, calm…) его нет — так по одному id видно, откуда урок и где лежат его фразы.
const SLUG = /^[a-z0-9][a-z0-9-]{1,59}$/
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

// Снимок реестра. Меняется только целиком (новый объект), иначе useSyncExternalStore не заметил бы перемены.
//   lessons — вшитые, затем админские;
//   settled — первый ответ получен (из кэша или сети) либо окончательно не получен. До этого адрес вида «talk-ab3k9»
//             нельзя объявить несуществующим: он может оказаться уроком, который просто ещё не доехал.
const INITIAL = { lessons: LESSONS, settled: false }
let state = INITIAL
let remote = []
let inflight = null
const listeners = new Set()

function publish(next) {
  state = next
  listeners.forEach((fn) => fn())
}

/** Урок из админки → тот же вид, что у вшитых (lessons.js): id, title, short (спикер), video, segCount, cover. */
export function normalizeRemoteLesson(raw) {
  if (!raw || typeof raw.slug !== 'string' || !SLUG.test(raw.slug) || !raw.slug.includes('-')) return null
  if (!VIDEO_ID.test(String(raw.video ?? ''))) return null
  const segCount = Number.isInteger(raw.segCount) ? raw.segCount : 0
  // Урок без фраз повторять не за чем; бэкенд такой и не покажет, но кэш мог хранить старый ответ.
  if (segCount < 1) return null
  const title = String(raw.title ?? '').trim()
  if (!title) return null
  return {
    id: raw.slug,
    title,
    // Подпись вкладки и карточки — имя спикера; без него — название, иначе вкладка осталась бы пустой.
    short: String(raw.speaker ?? '').trim() || title,
    video: raw.video,
    segCount,
    cover: `https://i.ytimg.com/vi/${raw.video}/mqdefault.jpg`,
    remote: true,
  }
}

function sameList(a, b) {
  if (a.length !== b.length) return false
  return a.every((l, i) => {
    const o = b[i]
    return l.id === o.id && l.title === o.title && l.short === o.short && l.video === o.video && l.segCount === o.segCount
  })
}

/** Принять список уроков из админки (ответ /mobile/shadowing). Вшитый урок с тем же id побеждает. */
export function setRemoteLessons(list) {
  const seen = new Set(LESSONS.map((l) => l.id))
  const next = []
  for (const raw of Array.isArray(list) ? list : []) {
    const lesson = normalizeRemoteLesson(raw)
    if (!lesson || seen.has(lesson.id)) continue
    seen.add(lesson.id)
    next.push(lesson)
  }
  if (sameList(remote, next)) {
    // Уроки те же — перерисовывать нечего, кроме первого «ответ получен».
    if (!state.settled) publish({ lessons: state.lessons, settled: true })
    return
  }
  remote = next
  publish({ lessons: next.length ? [...LESSONS, ...next] : LESSONS, settled: true })
}

/** Все уроки: вшитые, затем из админки. Стабильная ссылка, пока список не изменился. */
export function allLessons() {
  return state.lessons
}

/** Урок по id; на неизвестном — первый вшитый, чтобы битый диплинк не ронял экран (как lessons.getLesson). */
export function getLesson(id) {
  return state.lessons.find((l) => l.id === id) || LESSONS[0]
}

export function hasLesson(id) {
  return state.lessons.some((l) => l.id === id)
}

/** Урок из админки? У вшитых id дефиса нет, у админских он есть всегда (и это латиница в нижнем регистре). */
export function isRemoteLessonId(id) {
  return typeof id === 'string' && id.includes('-') && SLUG.test(id)
}

/**
 * Есть ли такой урок «для перехода»: домашняя работа и диплинк не должны вести на чужой урок.
 * Адрес из админки, пока список ещё не доехал, считается существующим: решение примет экран, когда уроки загрузятся.
 */
export function lessonAvailable(id) {
  return hasLesson(id) || (!state.settled && isRemoteLessonId(id))
}

export function subscribeLessons(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Подтянуть уроки из админки. Без токена ничего не делает. Ошибка сети не страшна: остаются вшитые уроки,
 * а следующий заход на экран попробует снова.
 */
export function loadRemoteLessons(token) {
  if (!token) return Promise.resolve(state.lessons)
  if (!inflight) {
    inflight = getShadowingLessons(token, (fresh) => setRemoteLessons(fresh))
      .then((data) => {
        setRemoteLessons(data)
        return state.lessons
      })
      .catch(() => {
        // «Не доехало» — не «нет»: пусть экран перестанет ждать и покажет то, что есть.
        if (!state.settled) publish({ lessons: state.lessons, settled: true })
        return state.lessons
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Только для тестов: вернуть реестр к состоянию «админских уроков нет, ничего не загружалось». */
export function resetLessonsForTests() {
  remote = []
  inflight = null
  state = INITIAL
  listeners.forEach((fn) => fn())
}

/**
 * Уроки для экрана: { lessons, settled }. Первый рендер — вшитые (как на сервере), потом список дополняется
 * админскими; загрузку запускает сам хук. settled нужен экрану, который открыт по адресу урока из админки.
 */
export function useShadowingCatalog(token) {
  const snapshot = useSyncExternalStore(subscribeLessons, () => state, () => INITIAL)
  useEffect(() => {
    loadRemoteLessons(token)
  }, [token])
  return snapshot
}

/** То же, но только список — для экранов, которым ждать загрузку незачем. */
export function useShadowingLessons(token) {
  return useShadowingCatalog(token).lessons
}
