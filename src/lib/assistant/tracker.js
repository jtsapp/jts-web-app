// Луна-трекер (решение владельца 15.10.2026: «как преподаватель, как трекер»):
// что она знает о ходе учёбы сверх текущего экрана и как помнит свои советы.
// Модуль чистый — ни сети, ни БД: данные приносят studentContext.js и
// lib/db/assistantTracker.js, здесь только правила, под тестами.
//
// Память Луны — не переписка (её по-прежнему никто не хранит), а одна строка на
// совет: куда звала, что сказала, когда и выполнено ли. «Выполнено» решает не
// модель и не ученик на слово, а данные сайта ПОСЛЕ совета: заход в раздел
// Практики (practice_state), звонок Speaking Buddy (voice_session.armed_at),
// сданная домашка (submittedAt). Чем проверить нечем (уроки «Обучения» живут в
// JTS-бэкенде, расписание, тарифы) — так модели и сказано: «не проверить».

import { destinationName, destinationOf } from './destinations.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** Раздел Практики «давно не открывал» — дольше этого. */
export const STALE_SECTION_DAYS = 7
const NOTES_IN_PROMPT = 5
const MISTAKE_MAX_CHARS = 120

// Разделы Практики так, как их видит карточка ученика (PRACTICE_AREA_BY_MODULE
// в lib/db/studentActivity.js), — по-человечески для модели.
const AREA_NAMES = {
  vocab: 'Словарь',
  workbooks: 'Воркбуки',
  grammar: 'Грамматика',
  listening: 'Аудирование: мини-игра',
  shadowing: 'Шэдоуинг',
  situations: 'Ситуации',
  writing: 'Письмо',
  reading: 'Чтение',
  words: 'Слова в картинках',
  verbs: 'Неправильные глаголы',
  listenchoose: 'Слушай и выбирай',
  numbers: 'Мир чисел',
}

// Куда звала Луна (destinations.js) → разделы Практики, заход в которые и есть
// «сделал». Вкладка навыка — любой её тренажёр, который пишет прогресс.
const TARGET_AREAS = {
  'practice-listening': ['listening', 'listenchoose'],
  'practice-reading': ['reading'],
  'practice-writing': ['writing'],
  'practice-speaking': ['shadowing', 'situations'],
  listening: ['listening'],
  listenchoose: ['listenchoose'],
  words: ['words'],
  numbers: ['numbers'],
  reading: ['reading'],
  writing: ['writing'],
  verbs: ['verbs'],
  shadowing: ['shadowing'],
  situations: ['situations'],
  grammar: ['grammar'],
  workbooks: ['workbooks'],
  vocab: ['vocab'],
}

const time = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : null
}
const isoDay = (t) => new Date(t).toISOString().slice(0, 10)
const daysBetween = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS)

function ago(t, now) {
  const days = daysBetween(isoDay(t), isoDay(now))
  if (days <= 0) return 'сегодня'
  if (days === 1) return 'вчера'
  return `${days} дн. назад`
}

/**
 * Совет из ответа Луны — одной строкой: последние одно-два предложения перед
 * вопросом-кнопкой («Открыть?», «Ашайын ба?»). Начало ответа — что на экране и
 * приветствие, совет у неё в конце (так велят правила первой реплики).
 */
export function adviceText(reply, max = 240) {
  const text = String(reply ?? '').replace(/\s+/g, ' ').trim()
  const sentences = (text.match(/[^.!?…]+[.!?…]*/g) || []).map((s) => s.trim()).filter(Boolean)
  while (sentences.length > 1 && /\?$/.test(sentences[sentences.length - 1]) && sentences[sentences.length - 1].length <= 40) {
    sentences.pop()
  }
  const out = sentences.slice(-2).join(' ')
  return out.length > max ? `…${out.slice(out.length - max + 1)}` : out
}

const ADVICE_LINE = /Совет сайта, что сделать сейчас: [^\n]*\(метка \[\[OPEN ([a-z0-9-]+)\]\]\)/
// Реплика кончается предложением открыть: «Открыть?», «Открыть мини-игру по
// аудированию?», «Ашайын ба?», «Shall I open it?».
const OPEN_QUESTION = /(?:^|[.!?…]\s+)[^.!?…]*(открыть|открою|ашайын|ашып|open)[^.!?…]*\?\s*$/i
const WORD = /[a-zа-яёәғқңөұүһі]+/gi

/**
 * Кнопка к первой реплике, если модель её забыла. Луна говорит «Открыть мини-игру
 * по аудированию?», а метку [[OPEN id]] не ставит — замер 15.10.2026: 4 реплики из
 * 36, после того как в них появился прошлый совет. Ставим её сами, но только
 * когда ошибиться нельзя: реплика кончается предложением открыть, в профиле есть
 * «Совет сайта» с меткой, и реплика говорит именно о его разделе (основа слова
 * из его названия на любом языке). «С чего хотите начать?» кнопки не получит.
 */
export function inferAdviceOffer(reply, studentContext) {
  const text = String(reply ?? '').trim()
  if (!OPEN_QUESTION.test(text)) return null
  const target = ADVICE_LINE.exec(String(studentContext ?? ''))?.[1]
  const dest = destinationOf(target)
  if (!dest) return null
  const stems = Object.values(dest.name || {})
    .flatMap((name) => String(name).toLowerCase().match(WORD) || [])
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 5))
  const lower = text.toLowerCase()
  return stems.some((s) => lower.includes(s)) ? { kind: 'open', target, now: false } : null
}

/**
 * Выполнен ли совет — по данным сайта после него.
 * @param {{ target: string, createdAt: string }} note
 * @param {{ practice?: {area: string, updatedAt: string}[]|null,
 *           tutorSessions?: string[]|null, homework?: object[]|null }} signals
 *   null у сигнала — данных нет (сеть, база): тогда «не проверить», а не «не выполнено».
 * @returns {{ checkable: boolean, doneAt: string|null }}
 */
export function adviceDoneAt(note, signals = {}) {
  const since = time(note?.createdAt)
  const no = { checkable: false, doneAt: null }
  if (since == null) return no
  const after = (iso) => {
    const t = time(iso)
    return t != null && t > since ? t : null
  }
  const earliest = (times) => {
    const list = times.filter((t) => t != null)
    return list.length ? new Date(Math.min(...list)).toISOString() : null
  }
  const target = note.target
  if (target === 'tutor') {
    if (!Array.isArray(signals.tutorSessions)) return no
    return { checkable: true, doneAt: earliest(signals.tutorSessions.map(after)) }
  }
  if (target === 'homework') {
    // Без даты сдачи у заданий не отличить «сдал после совета» от «сдал давно».
    const hw = Array.isArray(signals.homework) ? signals.homework : null
    if (!hw || !hw.some((h) => h && Object.hasOwn(h, 'submittedAt'))) return no
    return { checkable: true, doneAt: earliest(hw.map((h) => after(h?.submittedAt))) }
  }
  const areas = target === 'practice' ? null : TARGET_AREAS[target]
  if ((target !== 'practice' && !areas) || !Array.isArray(signals.practice)) return no
  return {
    checkable: true,
    doneAt: earliest(signals.practice.filter((p) => !areas || areas.includes(p?.area)).map((p) => after(p?.updatedAt))),
  }
}

/** Заметки со статусом по сигналам; в updates — только что выполненные (их пометить в БД). */
export function checkNotes(notes, signals) {
  const updates = []
  const checked = (notes || []).map((n) => {
    if (n.doneAt) return { ...n, checkable: true }
    const { checkable, doneAt } = adviceDoneAt(n, signals)
    if (doneAt) updates.push({ id: n.id, doneAt })
    return { ...n, checkable, doneAt }
  })
  return { notes: checked, updates }
}

// О каком совете Луне вспомнить в первой реплике — решает код, а не модель:
// самый свежий из прошлых дней (не сегодняшний — он из этого же разговора),
// не старше недели (иначе это уже не напоминание, а упрёк) и с известным
// исходом. Пока выбирала сама модель, Haiku пропускала выполненный совет в 3
// репликах из 4 и путала сегодняшний со вчерашним (замер 15.10.2026).
export const RECALL_MAX_DAYS = 7
export const RECALL_MARK = '← вспомни его в первой реплике'

function recallIndex(list, now) {
  return list.findIndex((n) => {
    const t = time(n.createdAt)
    if (t == null || (!n.doneAt && !n.checkable)) return false
    const days = daysBetween(isoDay(t), isoDay(now))
    return days >= 1 && days <= RECALL_MAX_DAYS
  })
}

/** Блок «твои прошлые советы» для модели. */
export function notesLines(notes, now = Date.now()) {
  const list = (notes || []).slice(0, NOTES_IN_PROMPT)
  if (!list.length) return null
  const recall = recallIndex(list, now)
  const rows = list.map((n, i) => {
    const t = time(n.createdAt)
    const when = t != null ? `${isoDay(t)} (${ago(t, now)})` : '?'
    const where = destinationName(n.target) || n.target
    const status = n.doneAt
      ? `выполнено ${isoDay(time(n.doneAt))}`
      : n.checkable
        ? 'пока не выполнено'
        : 'выполнение не проверить по данным сайта'
    return `- ${when}: ${where} — «${n.advice}» — ${status}${i === recall ? `  ${RECALL_MARK}` : ''}`
  })
  return `Твои прошлые советы этому ученику (заметки Луны, свежие сверху):\n${rows.join('\n')}`
}

function weekTotals(days, from, to) {
  const list = (days || []).filter((d) => d?.date >= from && d.date <= to)
  const sum = (key) => list.reduce((acc, d) => acc + (Number(d[key]) || 0), 0)
  const tasks = sum('practiceTasks')
  return {
    days: list.length,
    tasks,
    firstTry: tasks ? Math.round((sum('practiceFirstTry') / tasks) * 100) : null,
    tutorMin: Math.round(sum('tutorSeconds') / 60),
    trainerMin: Math.round(sum('trainerSeconds') / 60),
  }
}

/**
 * Две последние недели рядом (7 дней до сегодня и 7 до них) — из суточных строк
 * карточки ученика (buildStudentAppActivity().days: дни без занятий туда не попадают).
 */
export function weekLine(days, now = Date.now()) {
  // Ни одного дня с занятиями за полгода — новичок: «две недели не занимался»
  // про него было бы неправдой по смыслу, хоть и верно по цифрам.
  if (!Array.isArray(days) || !days.length) return null
  const today = isoDay(now)
  const day = (n) => isoDay(Date.parse(today) - n * DAY_MS)
  const cur = weekTotals(days, day(6), today)
  const prev = weekTotals(days, day(13), day(7))
  if (!cur.days && !prev.days) return 'Последние две недели занятий на сайте не было.'
  const part = (w) =>
    `дней с занятиями ${w.days}, заданий ${w.tasks}${w.firstTry != null ? ` (верно с первой попытки ${w.firstTry}%)` : ''}, Speaking Buddy ${w.tutorMin} мин, тренажёры ${w.trainerMin} мин`
  return `Последние 7 дней: ${part(cur)}. Неделей раньше: ${part(prev)}.`
}

/** Разделы Практики, где ученик бывал: давно не открытые и свежие. */
export function practiceLine(areas, now = Date.now()) {
  if (!Array.isArray(areas) || !areas.length) return null
  const stale = []
  const fresh = []
  for (const a of areas) {
    const t = time(a?.updatedAt)
    const name = AREA_NAMES[a?.area]
    if (t == null || !name) continue
    const days = daysBetween(isoDay(t), isoDay(now))
    ;(days > STALE_SECTION_DAYS ? stale : fresh).push(`${name} (${ago(t, now)})`)
  }
  const parts = []
  if (stale.length) parts.push(`давно не открывал — ${stale.slice(0, 4).join(', ')}`)
  if (fresh.length) parts.push(`недавно — ${fresh.slice(0, 4).join(', ')}`)
  return parts.length ? `Разделы Практики, где ученик уже бывал: ${parts.join('; ')}.` : null
}

export function goalLine(goal) {
  return goal?.target ? `Цель уровня, которую ученик выбрал: ${goal.target}${goal.from ? ` (от ${goal.from})` : ''}.` : null
}

/** Ошибки из звонков Speaking Buddy, ещё не пройденные. */
export function mistakesLine(mistakes) {
  const list = (mistakes || []).map((m) => String(m ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (!list.length) return null
  const clip = (s) => (s.length > MISTAKE_MAX_CHARS ? `${s.slice(0, MISTAKE_MAX_CHARS - 1)}…` : s)
  return `Ошибки из разговоров со Speaking Buddy, ещё не пройденные: ${list.map((m) => `«${clip(m)}»`).join('; ')}.`
}
