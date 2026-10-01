// Writing: чистые функции задания и работы. Порт кусков 30-writing.html прототипа:
// describeChart / promptText — задание текстом для ИИ (§14.3: «[Visual]» с данными графика), countWords — слова как на
// экзамене. Модуль общий для экрана и серверного роута оценки — поэтому без React и без window на импорте.

export const CRITERIA = ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']

/** Вид задания для гида и самопроверки: t1ac (Task 1 Academic), t1gt (письмо GT), t2 (эссе). */
export function kindKey(task) {
  const k = task?.taskKind
  return k === 'task1_academic' ? 't1ac' : k === 'task1_general' ? 't1gt' : 't2'
}

export const minWords = (task) => task?.minWords || (task?.kind === 'task2' ? 250 : 150)
export const timeLimitSec = (task) => task?.timeLimitSec || (task?.kind === 'task2' ? 2400 : 1200)

/** Слова как на экзамене: число — слово, отдельный знак (тире, «&») — нет. Тот же счёт, что у бэкенда. */
export function countWords(text) {
  if (!text) return 0
  return String(text)
    .trim()
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length
}

function val(v, unit) {
  return unit === '%' ? `${v}%` : unit ? `${v} ${unit}` : String(v)
}

/** Данные графика текстом — для модели (у неё нет картинки) и для подписи SVG скринридеру. */
export function describeChart(c) {
  if (!c) return ''
  const unit = c.unit || ''
  if (c.type === 'multi') return (c.alt ? [`Charts: ${c.alt}`] : []).concat((c.charts || []).map(describeChart).filter(Boolean)).join('\n')
  if (c.type === 'line' || c.type === 'bar') {
    const head = `${c.type === 'line' ? 'Line graph' : 'Bar chart'}: "${c.title || ''}"${c.yLabel ? `. Y-axis: ${c.yLabel}${unit ? ` (${unit})` : ''}` : ''}.`
    return [head].concat((c.series || []).map((s) => `${s.name}: ${c.x.map((x, i) => `${x} — ${val(s.values[i], unit)}`).join(', ')}.`)).join('\n')
  }
  if (c.type === 'pie') return `Pie chart: "${c.title || ''}". ${(c.slices || []).map((s) => `${s.label} — ${val(s.value, unit)}`).join(', ')}.`
  if (c.type === 'table')
    return [`Table: "${c.title || ''}"${unit ? ` (${unit})` : ''}.`, `Columns: ${c.columns.join(' | ')}.`].concat(c.rows.map((r) => `${r.join(' | ')}.`)).join('\n')
  if (c.type === 'figure') return `${c.kind === 'map' ? 'Maps' : 'Diagram'}: ${c.alt || ''}`
  return ''
}

/** Задание целиком, как его видел ученик, — вход системного промта оценки. */
export function promptText(task) {
  const parts = [task.question]
  if (task.bullets?.length) parts.push(task.bullets.map((b) => `• ${b}`).join('\n'))
  if (task.after?.length) parts.push(task.after.join('\n'))
  if (task.opening) parts.push(task.opening)
  if (task.chart) parts.push(`[Visual]\n${describeChart(task.chart)}`)
  return parts.filter(Boolean).join('\n\n')
}

/** Общий band IELTS: среднее четырёх критериев к ближайшей половине, .25 и .75 — вверх. Как у бэкенда. */
export function overallBand(criteria) {
  const v = CRITERIA.map((k) => Number(criteria?.[k]))
  if (v.some((x) => !Number.isFinite(x))) return null
  return Math.floor(((v[0] + v[1] + v[2] + v[3]) / 4) * 2 + 0.5) / 2
}

/** Вопросы самопроверки для вида задания: критерий показывается, если его kinds включает вид; вопрос — так же. */
export function selfCheckFor(selfcheck, kind) {
  return (selfcheck?.criteria || [])
    .filter((c) => !c.kinds || c.kinds.includes(kind))
    .map((c) => ({ ...c, questions: (c.questions || []).filter((q) => !q.kinds || q.kinds.includes(kind)) }))
    .filter((c) => c.questions.length)
}

// ---------------------------------------------------------------- черновик на устройстве

// Черновик держит браузер, как у Reading: работа сдаётся одним запросом, а сервер хранит уже сданное. Ключ — по
// заданию: незаконченная работа ждёт на том же устройстве, пока её не сдадут или не сбросят.
const DRAFT = (id) => `jts_ielts_wr_draft_${id}`

export function loadWritingDraft(testId) {
  try {
    const raw = localStorage.getItem(DRAFT(testId))
    const d = raw ? JSON.parse(raw) : null
    return d && typeof d.text === 'string' ? d : null
  } catch {
    return null
  }
}

export function saveWritingDraft(testId, draft) {
  try {
    localStorage.setItem(DRAFT(testId), JSON.stringify({ ...draft, savedAt: Date.now() }))
    return true
  } catch {
    return false
  }
}

export function dropWritingDraft(testId) {
  try {
    localStorage.removeItem(DRAFT(testId))
  } catch {
    /* нет хранилища — нечего чистить */
  }
}

// ---------------------------------------------------------------- каталог

export const writingTasks = (items, kind, track) =>
  (items || []).filter((t) => t.kind === kind && (kind === 'task2' || t.module === track || t.module === 'both'))

export function writingSummary(items, track) {
  const sum = (list) => ({ total: list.length, done: list.filter((t) => t.attemptCount > 0).length })
  return { task1: sum(writingTasks(items, 'task1', track)), task2: sum(writingTasks(items, 'task2', track)) }
}
