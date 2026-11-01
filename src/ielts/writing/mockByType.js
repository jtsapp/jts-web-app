// Mock Writing по типу (замечание владельца 10, 30.10.2026: «мок тесты надо не только как Task 1 и 2, но и по типам»).
// Тип — вид задания банка: график у Task 1 Academic, регистр письма у General Training, жанр эссе у Task 2 (поле
// category каталога: visual / register / essayType документа, backend IeltsDocument.summary). Mock по типу — одно
// задание этого типа в условиях экзамена: часы 20 / 40 минут, минимум слов 150 / 250, без подсказок; сдаётся обычной
// работой Writing (mode exam → pending_ai → оценка ИИ), поэтому видна в «Моих работах» и закрывает задачу плана.
// Своего банка у mock нет: задание берётся из заданий этого типа — ещё не написанное, иначе написанное давнее всех.
import { writingTasks } from './writing.js'

export const MOCK_TYPES = {
  task1: {
    academic: ['line', 'bar', 'pie', 'table', 'process', 'map', 'multi'],
    general: ['formal', 'semi_formal', 'informal'],
  },
  task2: ['opinion', 'discussion', 'adv_disadv', 'problem_solution', 'two_part'],
}

// имена типов — английские во всех языках, как и подписи категорий (ieltsWriting.p.visual.* и т. п.)
const TYPE_NAME = {
  line: 'Line graph', bar: 'Bar chart', pie: 'Pie chart', table: 'Table', process: 'Process', map: 'Map', multi: 'Multiple charts',
  formal: 'Formal letter', semi_formal: 'Semi-formal letter', informal: 'Informal letter',
  opinion: 'Opinion essay', discussion: 'Discussion essay', adv_disadv: 'Advantages and disadvantages',
  problem_solution: 'Problem and solution', two_part: 'Two-part question',
}

const trackOf = (track) => (track === 'general' ? 'general' : 'academic')

/** Типы mock трека: сначала Task 1 своего трека (графики или письма), затем Task 2. */
export function mockTypes(track) {
  return [
    ...MOCK_TYPES.task1[trackOf(track)].map((category) => ({ kind: 'task1', category, key: `task1:${category}` })),
    ...MOCK_TYPES.task2.map((category) => ({ kind: 'task2', category, key: `task2:${category}` })),
  ]
}

/** Ключ «task1:line» → тип, если он есть у трека; чужой или неизвестный — null (письмо у Academic, график у GT). */
export function parseMockKey(key, track) {
  return mockTypes(track).find((x) => x.key === key) || null
}

/** «Task 1 · Line graph». */
export function mockTypeName(key) {
  const [kind, category] = String(key || '').split(':')
  return `${kind === 'task2' ? 'Task 2' : 'Task 1'} · ${TYPE_NAME[category] || category || ''}`
}

/** Минуты и минимум слов mock — условия экзамена по части. */
export const mockLimits = (kind) => (kind === 'task2' ? { minutes: 40, words: 250 } : { minutes: 20, words: 150 })

/** Задания банка этого типа в треке ученика (Task 1 — своего модуля, Task 2 — общие). */
export function mockTasks(items, key, track) {
  const type = parseMockKey(key, track)
  if (!type) return []
  return writingTasks(items, type.kind, trackOf(track)).filter((t) => t.category === type.category)
}

// среди ещё не написанных — сначала задания по уровню ученика, «на вырост» и без уровня, простые — последними
const LEVEL_RANK = { fit: 0, any: 1, above: 2, below: 3 }
const finished = (t) => t.lastAttempt?.finishedAt || ''

/**
 * Какое задание дать в mock: начатый на этом устройстве mock (drafts — id заданий) продолжается; иначе — ещё не
 * написанное (по уровню, затем по порядку каталога); всё написано — то, что писали давнее всех.
 * → { task, reason: 'resume' | 'fresh' | 'repeat' } или null, если заданий этого типа нет.
 */
export function pickMockTask(tasks, drafts = []) {
  const list = (tasks || []).filter(Boolean)
  if (!list.length) return null
  const started = list.find((t) => drafts.includes(t.id))
  if (started) return { task: started, reason: 'resume' }
  const fresh = list
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !(t.attemptCount > 0))
    .sort((a, b) => (LEVEL_RANK[a.t.level] ?? 1) - (LEVEL_RANK[b.t.level] ?? 1) || a.i - b.i)
  if (fresh.length) return { task: fresh[0].t, reason: 'fresh' }
  const oldest = [...list].sort((a, b) => (finished(a) < finished(b) ? -1 : finished(a) > finished(b) ? 1 : 0))[0]
  return { task: oldest, reason: 'repeat' }
}
