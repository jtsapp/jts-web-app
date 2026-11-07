// «Начать» у шага «Сегодня» открывает конкретный материал (ТЗ v2.0, 5.3): какой урок воркбука, какой текст, какой урок
// шэдоуинга, куда переход и что написано в «Откроется».
import { describe, it, expect, vi } from 'vitest'
import {
  baseTargets, materialTargets, pickReadingText, pickShadowingLesson, pickWorkbookLesson, readingLevel, resolveTaskTargets,
  targetPath, workbookLevel,
} from './taskTargets.js'
import { itemNav } from '../../lib/assistant/items/refs.js'

const prac = (module, over = {}) => ({ id: module, kind: 'practice', module, minutes: 15, got: 0, status: 'available', ...over })
const t = (key, vars) => (vars ? `${key}(${Object.values(vars).join(',')})` : key)

describe('уровни разделов', () => {
  it('воркбук — только свой уровень A0–B2', () => {
    expect(workbookLevel('A2')).toBe('a2')
    expect(workbookLevel('C1')).toBeNull()
    expect(workbookLevel(null)).toBeNull()
  })
  it('«Чтение» — A1–C1, у A0 ближайший A1', () => {
    expect(readingLevel('A0')).toBe('a1')
    expect(readingLevel('B1')).toBe('b1')
    expect(readingLevel('C2')).toBe('c1')
    expect(readingLevel('')).toBeNull()
  })
})

describe('выбор материала', () => {
  const index = { lessons: { 1: { title: 'Getting to know you', acts: 15 }, 2: { title: 'A day in three lives', acts: 12 }, 3: { title: 'X', acts: 10 } } }
  it('воркбук: первый недопройденный урок; начатый — «продолжить»; всё пройдено — null', () => {
    expect(pickWorkbookLesson(index, () => 0)).toEqual({ n: 1, title: 'Getting to know you', started: false })
    expect(pickWorkbookLesson(index, (n, acts) => (n === 1 ? acts : n === 2 ? 4 : 0))).toEqual({ n: 2, title: 'A day in three lives', started: true })
    expect(pickWorkbookLesson(index, (n, acts) => acts)).toBeNull()
    expect(pickWorkbookLesson(null, () => 0)).toBeNull()
  })
  it('чтение: начатый и не дочитанный текст первым, иначе первый нетронутый', () => {
    const texts = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }]
    expect(pickReadingText(texts, {})).toEqual({ id: 'a', title: 'A', started: false })
    expect(pickReadingText(texts, { a: { ex: { 0: 1 }, done: true }, c: { ex: { 1: 1 } } })).toEqual({ id: 'c', title: 'C', started: true })
    expect(pickReadingText(texts, { a: { done: true }, b: { done: true }, c: { done: true } })).toBeNull()
  })
  it('шэдоуинг: начатый урок первым, иначе первый без записей', () => {
    const lessons = [{ id: 'sg', title: 'Selena', segCount: 66 }, { id: 'v2', title: 'Jobs', segCount: 88 }]
    expect(pickShadowingLesson(lessons, () => 0)).toEqual({ id: 'sg', title: 'Selena', started: false })
    expect(pickShadowingLesson(lessons, (id) => (id === 'sg' ? 66 : 3))).toEqual({ id: 'v2', title: 'Jobs', started: true })
    expect(pickShadowingLesson(lessons, (id) => (id === 'sg' ? 66 : 88))).toBeNull()
  })
})

describe('цели переходов', () => {
  const course = { id: 1, kind: 'course', minutes: 30, status: 'available' }
  it('сразу: урок курса по шагу тропы, Speaking Buddy, «Словарь»; выполненное и чужое — без цели', () => {
    const steps = { 1: { code: 'L12', title: 'Famous people', unit: 4 } }
    const out = baseTargets(
      [course, prac('ai_tutor'), prac('vocabulary_sr'), prac('workbooks', { status: 'completed' }), prac('shadowing', { origin: 'teacher' })],
      { level: 'a2', courseSteps: steps },
    )
    expect(out[1]).toEqual({ section: 'course', to: 'course', payload: { level: 'A2', lesson: 'L12' }, level: 'A2', unit: 4, title: 'Famous people' })
    expect(out.ai_tutor).toMatchObject({ to: 'tutor', level: 'A2' })
    expect(out.vocabulary_sr).toMatchObject({ to: 'vocab' })
    expect(Object.keys(out).sort()).toEqual(['1', 'ai_tutor', 'vocabulary_sr'])
    // без шага тропы — тропа уровня, как раньше
    expect(baseTargets([course], { level: 'A2' })[1]).toEqual({ section: 'course', to: 'course', payload: { level: 'A2' }, level: 'A2' })
  })

  it('по загрузке: урок воркбука, текст «Чтения», урок шэдоуинга — каждый раздел грузится один раз', async () => {
    const loaders = {
      workbook: vi.fn(async (code) => ({ n: 5, title: `wb-${code}`, started: true })),
      reading: vi.fn(async (code) => ({ id: `${code}-sci-pitch`, title: 'Pitch', started: false })),
      shadowing: vi.fn(async () => ({ id: 'v5', title: 'Obama', started: false })),
    }
    const tasks = [prac('workbooks', { id: 'w1' }), prac('workbooks', { id: 'w2' }), prac('media_practice'), prac('shadowing'), prac('ai_tutor')]
    const out = await materialTargets(tasks, { level: 'A2', loaders })
    expect(out.w1).toEqual({ section: 'workbook', to: 'workbook', payload: { level: 'a2', lesson: 5 }, level: 'A2', n: 5, title: 'wb-a2', started: true })
    expect(out.w2).toEqual(out.w1)
    expect(out.media_practice).toMatchObject({ to: 'reading', payload: { level: 'a2', textId: 'a2-sci-pitch' }, level: 'A2' })
    expect(out.shadowing).toMatchObject({ to: 'shadowing', payload: 'v5', title: 'Obama' })
    expect(out.ai_tutor).toBeUndefined()
    expect(loaders.workbook).toHaveBeenCalledTimes(1)
  })

  it('сбой загрузки или нет материала — цели нет, «Начать» остаётся переходом в раздел', async () => {
    const loaders = { workbook: async () => { throw new Error('404') }, reading: async () => null, shadowing: async () => null }
    expect(await materialTargets([prac('workbooks'), prac('media_practice'), prac('shadowing')], { level: 'A2', loaders })).toEqual({})
    // у C1 воркбука нет — загрузчик даже не зовём
    const wb = vi.fn()
    expect(await materialTargets([prac('workbooks')], { level: 'C1', loaders: { ...loaders, workbook: wb } })).toEqual({})
    expect(wb).not.toHaveBeenCalled()
  })

  it('переход — тот же, каким вещь открывает Луна (items/refs.js)', async () => {
    const loaders = {
      workbook: async () => ({ n: 5, title: '', started: false }),
      reading: async () => ({ id: 'a2-sci-pitch', title: '', started: false }),
      shadowing: async () => ({ id: 'v5', title: '', started: false }),
    }
    const steps = { 1: { code: 'L12', title: 'Famous people', unit: 4 } }
    const out = await resolveTaskTargets([course, prac('workbooks'), prac('media_practice'), prac('shadowing')], { level: 'A2', courseSteps: steps, loaders })
    const same = (target, ref) => expect({ nav: target.to, payload: target.payload }).toEqual(itemNav(ref))
    same(out[1], 'course.A2.L12')
    same(out.workbooks, 'workbook.a2.5')
    same(out.media_practice, 'reading.a2-sci-pitch')
    same(out.shadowing, 'shadowing.v5')
  })
})

describe('targetPath — строка «Откроется»', () => {
  it('разделы меню и материал через «→»', () => {
    expect(targetPath(t, { section: 'workbook', level: 'A2', n: 5, title: 'Getting to know you' })).toBe(
      'nav.practice → gePlan.open.workbook(A2) → gePlan.open.lesson(5) gePlan.open.quoted(Getting to know you)',
    )
    expect(targetPath(t, { section: 'course', level: 'A2', unit: 4, title: 'Famous people' })).toBe(
      'nav.learning → A2 → gePlan.open.unit(4) → gePlan.open.quoted(Famous people)',
    )
    expect(targetPath(t, { section: 'course', level: 'A2' })).toBe('nav.learning → A2')
    expect(targetPath(t, { section: 'reading', level: 'B1', title: 'Pitch' })).toBe('nav.practice → gePlan.open.reading(B1) → gePlan.open.quoted(Pitch)')
    expect(targetPath(t, { section: 'shadowing', title: 'Obama' })).toBe('nav.practice → gePlan.open.shadowing → gePlan.open.quoted(Obama)')
    expect(targetPath(t, { section: 'tutor' })).toBe('nav.tutor')
    expect(targetPath(t, null)).toBe('')
  })
})
