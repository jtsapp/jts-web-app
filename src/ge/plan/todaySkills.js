// «Сегодня» на «Главной» по ТЗ v2.0, раздел 5.2: минуты дня, раскладка своих задач по навыкам и строка «Зачем: …».
// Чистый модуль без React и сети — его проверяет vitest, а экран только рисует.
//
// Раздел плана → навык плитки «По навыкам». Плитки — навыки ТЗ: Урок курса, Аудирование, Чтение, Говорение, Письмо,
// Грамматика, Словарь. Своих разделов у плана пять (бэкенд, доли Roadmap 30/25/15/15/15) плюс урок курса, поэтому:
//   course          → «Урок курса»  — урок тропы «Обучения», отдельной плиткой: в нём все навыки сразу;
//   ai_tutor        → «Говорение»   — разговор голосом со Speaking Buddy;
//   shadowing       → «Говорение»   — повтор фраз вслух; оценка произношения пишет навык speaking (ShadowingPage);
//   workbooks       → «Грамматика»  — воркбук уровня, упражнения на грамматику юнита (так и в прототипе ТЗ);
//   media_practice  → «Чтение»      — минуты вкладки «Чтение» Практики: книги, тексты, комиксы (MODULE_ROUTE);
//   vocabulary_sr   → «Словарь»     — практика «Словаря».
// Аудирования и письма своим разделом у плана сейчас нет — их плитки появятся, когда план начнёт ставить такие задачи.
// Плитка без задач дня не рисуется: «0 задач» — шум, а не подсказка (прототип ТЗ тоже рисует только навыки с задачами).
// Неизвестный раздел — «Чтение», как plateOf рисует его значком медиа.

export const SKILL_TILES = ['lesson', 'listening', 'reading', 'speaking', 'writing', 'grammar', 'vocab']

const MODULE_SKILL = {
  ai_tutor: 'speaking',
  shadowing: 'speaking',
  workbooks: 'grammar',
  media_practice: 'reading',
  vocabulary_sr: 'vocab',
}

// Фокус плана («Стоит подтянуть», ТЗ 5.5 и 9.1): бэкенд даёт разделу слабого навыка больше практики и отдаёт
// plan.focus = { skill, module }. Задача этого раздела тогда — задача слабого навыка: медиа при слабом аудировании —
// «Аудирование», воркбук при слабом письме — «Письмо».
const isFocusTask = (task, focus) => Boolean(focus?.skill && focus.module && task?.kind === 'practice' && task.module === focus.module)

/** Навык плитки для своей задачи плана; null — задача не своя (занятие, домашка, задача преподавателя). */
export function skillOf(task, focus = null) {
  if (!task || task.origin === 'teacher') return null
  if (task.kind === 'course') return 'lesson'
  if (task.kind === 'practice') return isFocusTask(task, focus) && SKILL_TILES.includes(focus.skill) ? focus.skill : MODULE_SKILL[task.module] || 'reading'
  return null
}

/** Сделанные минуты задачи: выполненная — целиком, начатая практика — сколько набрано (got), не больше нормы. */
export function doneMinutes(task) {
  const total = Math.max(0, Number(task?.minutes) || 0)
  if (task?.status === 'completed') return total
  if (task?.kind === 'practice') return Math.min(total, Math.max(0, Number(task.got) || 0))
  return 0
}

/** «N из M мин» и доля для полосы: сделанные минуты своих задач дня из общих. */
export function todayMinutes(tasks) {
  let done = 0
  let total = 0
  for (const task of tasks || []) {
    total += Math.max(0, Number(task.minutes) || 0)
    done += doneMinutes(task)
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

/**
 * Плитки «По навыкам»: [{ skill, tasks, minutes, done }] в порядке ТЗ, только навыки с задачами. minutes — сумма
 * минут задач навыка, done — сколько задач выполнено (полоса плитки — доля выполненных задач).
 */
export function groupBySkill(tasks, focus = null) {
  const by = new Map()
  for (const task of tasks || []) {
    const skill = skillOf(task, focus)
    if (!skill) continue
    if (!by.has(skill)) by.set(skill, [])
    by.get(skill).push(task)
  }
  return SKILL_TILES.filter((s) => by.has(s)).map((skill) => {
    const list = by.get(skill)
    return {
      skill,
      tasks: list,
      minutes: list.reduce((s, x) => s + Math.max(0, Number(x.minutes) || 0), 0),
      done: list.filter((x) => x.status === 'completed').length,
    }
  })
}

// Больше пяти задач на день (хвосты, перенос) — список по порядку уже не читается за пять секунд, и блок сам
// открывается «По навыкам» (ТЗ 5.2). Пять и меньше — по порядку.
export const SKILLS_VIEW_FROM = 6

export function defaultTodayView(tasks) {
  return (tasks || []).length >= SKILLS_VIEW_FROM ? 'skills' : 'order'
}

// Навык плитки → ключ «Сильных и слабых сторон» (skillStatsCore.SKILLS). У урока курса своей строки нет.
const STAT_OF = { listening: 'listening', reading: 'reading', speaking: 'speaking', writing: 'writing', grammar: 'grammar', vocab: 'vocab' }

const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const rank = (level) => LEVELS.indexOf(String(level || '').toUpperCase())

/**
 * Строка «Зачем: …» у текущего шага — одно предложение из данных, без выдумок (ТЗ 5.2, принцип «каждый шаг объясняет
 * зачем»). Три источника, по силе довода:
 *   1. навык задачи — самый слабый у ученика (тот же расчёт, что «Сильные и слабые стороны»: levelSkillHighlights) —
 *      «Чтение у тебя сейчас слабее остальных навыков (41%)…»;
 *   2. вид задачи — что этот раздел тренирует (урок курса — следующий урок уровня);
 *   3. цель ученика из анкеты GE — хвостом «— шаг к цели B2», только если цель выше текущего уровня.
 * Сильнее всех — фокус плана (focus): раздел, которому бэкенд дал больше практики ради навыка «Стоит подтянуть».
 * Чисел, которых нет в данных («4 ошибки из 9»), строка не обещает. Обращение — на «ты», без рода (решение 7).
 * level — уровень материала (воркбук A2, текст B1), иначе уровень ученика; без него шаблоны с уровнем молчат.
 * @returns {string} '' — сказать нечего
 */
export function whyLine(t, task, { level = null, target = null, weakest = null, focus = null } = {}) {
  const skill = skillOf(task, focus)
  if (!skill) return ''
  // раздел в фокусе плана — довод сильнее всех: план недели сам дал ему больше времени (кейс 20)
  if (isFocusTask(task, focus) && SKILL_TILES.includes(focus.skill)) return `${t('gePlan.why.focus', { skill: t(`gePlan.skill.${focus.skill}`) })}.`
  const stat = STAT_OF[skill]
  if (stat && weakest && weakest.skill === stat && weakest.percent != null) {
    return `${t('gePlan.why.weak', { skill: t(`gePlan.skill.${skill}`), pct: String(weakest.percent) })}.`
  }
  const key = task.kind === 'course' ? 'course' : task.module in MODULE_SKILL ? task.module : 'media_practice'
  const lv = level ? String(level).toUpperCase() : ''
  if (!lv && (key === 'course' || key === 'workbooks' || key === 'media_practice')) return ''
  const base = t(`gePlan.why.${key}`, { level: lv })
  const goal = target && rank(target) > rank(lv || null) && rank(lv || null) >= 0 ? t('gePlan.why.goal', { target: String(target).toUpperCase() }) : ''
  return `${base}${goal}.`
}
