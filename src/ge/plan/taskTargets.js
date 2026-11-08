// «Начать» у шага «Сегодня» открывает конкретный материал, а не раздел (ТЗ v2.0, 5.3): следующий урок воркбука уровня
// ученика, текст «Чтения» его уровня, урок шэдоуинга. Под шагом — строка «Откроется: Практика → Воркбук A2 → урок 5».
//
// Переход — те же ключи handleNav и та же форма payload, какими вещи открывает Луна (lib/assistant/items/refs.js,
// itemNav): workbook {level, lesson}, reading {level, textId}, shadowing <id урока>, course {level, lesson}. Своих
// обходов экранов здесь нет: экран раздела сам проверяет квоту и сам решает, с какого места продолжать.
//
// «Продолжить» ведёт туда же, а место внутри материала помнит раздел:
//   воркбук — урок открывается с первого непройденного экрана (WorkbookPage.openLesson), а среди уроков берём первый
//             недопройденный — начатый вчера урок и будет «продолжением»;
//   чтение  — начатый, но не дочитанный текст идёт первым; ответы упражнений текст хранит сам (readingProgress),
//             место прокрутки — нет;
//   шэдоуинг — начатый урок идёт первым, записанные фразы отмечены; с какой фразы продолжать, раздел не хранит;
//   Speaking Buddy и «Словарь» — последнего места не хранят: открывается раздел (у «Словаря» нет входа сразу в
//             практику — VocabularyPage цели не принимает).
//
// Материалы грузятся динамическим импортом: «Главная» не должна тянуть в свой чанк прогресс и данные трёх разделов
// (src/lib/lazyScreen.js — та же причина). Любой сбой — цели нет, и «Начать» ведёт прежним taskRoute в раздел.

import { WORKBOOK_LEVELS } from '../../practice/workbooks/levels.js'

// Уровни «Чтения» — как READING_LEVELS экрана (ReadingPage.jsx); экран статически не импортируем (правило lazyScreen).
const READING_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']

/** Код воркбука уровня ученика или null: воркбуков выше B2 нет, а чужой уровень — не «по уровню» (ТЗ, принцип 5). */
export function workbookLevel(level) {
  const code = String(level || '').toLowerCase()
  return WORKBOOK_LEVELS.some((l) => l.code === code) ? code : null
}

/** Уровень полки «Чтения»: у A0 своих текстов нет — ближайший A1, у C2 — C1. */
export function readingLevel(level) {
  const code = String(level || '').toLowerCase()
  if (code === 'a0') return 'a1'
  if (code === 'c2') return 'c1'
  return READING_LEVELS.includes(code) ? code : null
}

/**
 * Урок воркбука, к которому вести: первый недопройденный по порядку (как nextLesson воркбука). index — index.json
 * уровня ({ lessons: { n: { title, acts } } }), doneOf(n, acts) — сколько экранов урока пройдено. Всё пройдено — null.
 */
export function pickWorkbookLesson(index, doneOf) {
  const lessons = index?.lessons
  if (!lessons || typeof lessons !== 'object') return null
  const nums = Object.keys(lessons).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  for (const n of nums) {
    const acts = Number(lessons[n]?.acts) || 0
    if (!acts) continue
    const done = doneOf(n, acts)
    if (done < acts) return { n, title: lessons[n]?.title || '', started: done > 0 }
  }
  return null
}

/** Текст «Чтения»: начатый и не дочитанный — первым, иначе первый нетронутый. progress — { id: { ex, done } }. */
export function pickReadingText(texts, progress) {
  const list = Array.isArray(texts) ? texts.filter((x) => x && x.id) : []
  const st = progress && typeof progress === 'object' ? progress : {}
  const begun = list.find((x) => st[x.id] && !st[x.id].done && Object.keys(st[x.id].ex || {}).length > 0)
  if (begun) return { id: begun.id, title: begun.title || '', started: true }
  const fresh = list.find((x) => !st[x.id])
  return fresh ? { id: fresh.id, title: fresh.title || '', started: false } : null
}

/** Урок шэдоуинга: начатый — первым, иначе первый, где не записано ни одной фразы. doneOf(id) — записанных фраз. */
export function pickShadowingLesson(lessons, doneOf) {
  const list = (Array.isArray(lessons) ? lessons : []).filter((l) => l && l.id && l.segCount > 0)
  const begun = list.find((l) => {
    const d = doneOf(l.id)
    return d > 0 && d < l.segCount
  })
  if (begun) return { id: begun.id, title: begun.title || '', started: true }
  const fresh = list.find((l) => doneOf(l.id) === 0)
  return fresh ? { id: fresh.id, title: fresh.title || '', started: false } : null
}

// ── загрузчики (подменяются в тестах) ──────────────────────────────────────

const fetchJson = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`bad status ${res.status}`)
  return res.json()
}

export const DEFAULT_LOADERS = {
  async workbook(code) {
    const [index, progress] = await Promise.all([
      fetchJson(`/practice/workbook/${code}/index.json`),
      import('../../practice/workbook/workbookProgress.js'),
    ])
    const state = progress.readState()
    return pickWorkbookLesson(index, (n, acts) => progress.lessonDone(code, n, acts, state))
  },
  async reading(code) {
    const [{ loadReadingLevel }, progress] = await Promise.all([
      import('../../practice/reading/readingContent.js'),
      import('../../practice/reading/readingProgress.js'),
    ])
    const { data } = await loadReadingLevel(code)
    return pickReadingText(data.texts, progress.readState().texts)
  },
  async shadowing() {
    const [catalog, progress] = await Promise.all([
      import('../../practice/shadowing/catalog.js'),
      import('../../practice/shadowing/shadowingProgress.js'),
    ])
    // уроки, которые реестр уже знает (вшитые и уже доехавшие из админки): ради подписи на «Главной» каталог бэкенда
    // не спрашиваем — его загрузит сам экран шэдоуинга
    return pickShadowingLesson(catalog.allLessons(), (id) => progress.countLessonDone(id))
  },
}

/**
 * Цели переходов для своих задач дня: { [id задачи]: target }. target — { section, to, payload, level?, n?, unit?, title?,
 * started? }: section и поля — для строки «Откроется», to/payload — для handleNav. Делится на две части: baseTargets
 * считается сразу (урок курса, Speaking Buddy, «Словарь» — данных грузить не надо), materialTargets — после загрузки
 * материала раздела. Так строка «Откроется» у урока курса не ждёт сети.
 * Разделы без материала (воркбука уровня нет, всё прочитано) цели не получают — «Начать» ведёт в раздел.
 */
const openOwn = (tasks) => (tasks || []).filter((x) => x && x.status !== 'completed' && x.origin !== 'teacher')

/** course — шаги тропы (courseSteps): у урока курса без шага тропы цель — тропа уровня, как и раньше. */
export function baseTargets(tasks, { level = null, courseSteps = {} } = {}) {
  const out = {}
  const lv = level ? String(level).toUpperCase() : null
  for (const task of openOwn(tasks)) {
    if (task.kind === 'course') {
      if (!lv) continue
      const step = courseSteps[task.id]
      out[task.id] = step
        ? { section: 'course', to: 'course', payload: { level: lv, lesson: step.code }, level: lv, unit: step.unit ?? null, title: step.title || '' }
        : { section: 'course', to: 'course', payload: { level: lv }, level: lv }
    } else if (task.kind === 'practice' && task.module === 'ai_tutor') {
      // Speaking Buddy говорит на уровне ученика — уровень и в метке шага
      out[task.id] = { section: 'tutor', to: 'tutor', payload: null, level: lv }
    } else if (task.kind === 'practice' && task.module === 'vocabulary_sr') {
      out[task.id] = { section: 'vocab', to: 'vocab', payload: null }
    }
  }
  return out
}

export async function materialTargets(tasks, { level = null, loaders = DEFAULT_LOADERS } = {}) {
  const out = {}
  const lv = level ? String(level).toUpperCase() : null
  // один раздел на день грузим один раз: две задачи воркбука ведут в один и тот же следующий урок
  const memo = {}
  const once = (key, fn) => (memo[key] ??= Promise.resolve().then(fn).catch(() => null))
  for (const task of openOwn(tasks)) {
    if (task.kind !== 'practice' || task.module === 'ai_tutor' || task.module === 'vocabulary_sr') continue
    if (task.module === 'workbooks') {
      const code = workbookLevel(lv)
      const pick = code ? await once('workbook', () => loaders.workbook(code)) : null
      if (pick) out[task.id] = { section: 'workbook', to: 'workbook', payload: { level: code, lesson: pick.n }, level: code.toUpperCase(), n: pick.n, title: pick.title, started: pick.started }
    } else if (task.module === 'shadowing') {
      const pick = await once('shadowing', () => loaders.shadowing())
      if (pick) out[task.id] = { section: 'shadowing', to: 'shadowing', payload: pick.id, title: pick.title, started: pick.started }
    } else {
      // media_practice и неизвестный раздел — вкладка «Чтение» (taskRoute): конкретный текст уровня
      const code = readingLevel(lv)
      const pick = code ? await once('reading', () => loaders.reading(code)) : null
      if (pick) out[task.id] = { section: 'reading', to: 'reading', payload: { level: code, textId: pick.id }, level: code.toUpperCase(), title: pick.title, started: pick.started }
    }
  }
  return out
}

/** Обе части сразу (тесты): { ...baseTargets, ...materialTargets }. */
export async function resolveTaskTargets(tasks, opts = {}) {
  return { ...baseTargets(tasks, opts), ...(await materialTargets(tasks, opts)) }
}

/** Строка пути для «Откроется: …» — разделы меню и материал, через «→». */
export function targetPath(t, target) {
  if (!target) return ''
  const q = (title) => (title ? t('gePlan.open.quoted', { title }) : '')
  let parts
  switch (target.section) {
    case 'course':
      parts = [t('nav.learning'), target.level, target.unit != null ? t('gePlan.open.unit', { n: String(target.unit) }) : '', q(target.title)]
      break
    case 'workbook':
      parts = [t('nav.practice'), t('gePlan.open.workbook', { level: target.level }), [t('gePlan.open.lesson', { n: String(target.n) }), q(target.title)].filter(Boolean).join(' ')]
      break
    case 'reading':
      parts = [t('nav.practice'), t('gePlan.open.reading', { level: target.level }), q(target.title)]
      break
    case 'shadowing':
      parts = [t('nav.practice'), t('gePlan.open.shadowing'), q(target.title)]
      break
    case 'tutor':
      parts = [t('nav.tutor')]
      break
    case 'vocab':
      parts = [t('nav.vocab')]
      break
    default:
      return ''
  }
  return parts.filter(Boolean).join(' → ')
}

/** Метка уровня у шага: уровень материала, если он у него есть (у шэдоуинга и «Словаря» уровня нет). */
export function targetLevel(target) {
  return target?.level || null
}
