// @vitest-environment jsdom
// Ступени подсказки в домашке: сразу на сервер и пакетом для сдачи; больше 2 не уходит никогда — иначе сервер
// отклонит всю сдачу.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveHomeworkHint = vi.fn()
vi.mock('../../api.js', () => ({ saveHomeworkHint: (...a) => saveHomeworkHint(...a) }))

const { HOMEWORK_MAX_HINT, homeworkHintLevels, reportHomeworkHint } = await import('./homeworkHints.js')
const { ANSWER, recordHint, resetHints } = await import('./hintSteps.js')
const { homeworkHintId } = await import('./hintTask.js')

describe('homeworkHints', () => {
  beforeEach(() => {
    resetHints()
    saveHomeworkHint.mockReset().mockResolvedValue(null)
  })

  it('reportHomeworkHint — ступень заданию домашки, не больше 2', async () => {
    expect(await reportHomeworkHint(homeworkHintId(7, 12), 1, 't')).toBe(true)
    expect(saveHomeworkHint).toHaveBeenLastCalledWith('7', '12', 't', 1)
    await reportHomeworkHint(homeworkHintId(7, 12), 3, 't')
    expect(saveHomeworkHint).toHaveBeenLastCalledWith('7', '12', 't', HOMEWORK_MAX_HINT)
  })

  it('не домашка, нет ступени или токена — ничего не шлём; сбой сервера — тихо false', async () => {
    expect(await reportHomeworkHint('course:L5:3', 1, 't')).toBe(false)
    expect(await reportHomeworkHint(homeworkHintId(7, 12), 0, 't')).toBe(false)
    expect(await reportHomeworkHint(homeworkHintId(7, 12), 1, null)).toBe(false)
    expect(saveHomeworkHint).not.toHaveBeenCalled()
    saveHomeworkHint.mockRejectedValue(Object.assign(new Error('404'), { status: 404 }))
    expect(await reportHomeworkHint(homeworkHintId(7, 12), 1, 't')).toBe(false)
  })

  it('homeworkHintLevels — ступени заданий этой работы из учёта окна', () => {
    recordHint(homeworkHintId(7, 12), 2)
    recordHint(homeworkHintId(7, 13), 1)
    recordHint(homeworkHintId(8, 12), 1)
    // «ответ» в домашке не даётся, но если учёт его хранит — уходит как 2, а не 3.
    recordHint(homeworkHintId(7, 14), ANSWER)
    expect(homeworkHintLevels(7, [12, 13, 14, 15])).toEqual({ 12: 2, 13: 1, 14: 2 })
    expect(homeworkHintLevels(9, [12])).toEqual({})
  })
})
