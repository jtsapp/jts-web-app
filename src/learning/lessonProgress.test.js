// @vitest-environment jsdom
// Урок, пройденный при сбое сети, markDone клал только в localStorage с
// обещанием «синхронизируется позже» — а досылки не было вовсе: монеты и XP
// не начислялись, на мобилке и другом устройстве урок оставался непройденным.
// Бэкенд засчитывает урок идемпотентно (монеты — только за первое
// прохождение), поэтому повторная отправка безопасна.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api.js', () => ({
  completeLesson: vi.fn(),
  getLessonProgress: vi.fn(),
}))

import { completeLesson, getLessonProgress } from '../api.js'
import { markDone, loadDone, ContentRestrictedError } from './lessonProgress.js'

const tokenFor = (userId) => `h.${btoa(JSON.stringify({ userId })).replace(/=+$/, '')}.s`
const A = tokenFor(41)
const B = tokenFor(42)
const offline = () => Promise.reject(Object.assign(new Error('Failed to fetch'), { status: undefined }))
const refused = () => Promise.reject(Object.assign(new Error('403'), { status: 403 }))

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
})

describe('lessonProgress — досылка урока, не дошедшего до сервера', () => {
  it('следующая загрузка тропы досылает урок с теми же очками', async () => {
    completeLesson.mockImplementationOnce(offline)
    await markDone('a1', A, 7, 'L3', 40)

    completeLesson.mockResolvedValueOnce({ done: ['L3'] })
    getLessonProgress.mockResolvedValueOnce({ done: ['L3'] })
    const done = await loadDone('a1', A, 7)

    expect(completeLesson).toHaveBeenCalledTimes(2)
    expect(completeLesson).toHaveBeenLastCalledWith(A, 7, 'L3', 40)
    expect(done.has('L3')).toBe(true)
  })

  it('досланный урок второй раз не уходит', async () => {
    completeLesson.mockImplementationOnce(offline)
    await markDone('a1', A, 7, 'L3', 40)
    completeLesson.mockResolvedValue({ done: ['L3'] })
    getLessonProgress.mockResolvedValue({ done: ['L3'] })

    await loadDone('a1', A, 7)
    await loadDone('a1', A, 7)
    expect(completeLesson).toHaveBeenCalledTimes(2) // исходная попытка + одна досылка
  })

  it('сеть снова не ответила — урок остаётся в очереди', async () => {
    completeLesson.mockImplementation(offline)
    getLessonProgress.mockImplementation(offline)
    await markDone('a1', A, 7, 'L3', 40)
    await loadDone('a1', A, 7)

    completeLesson.mockResolvedValue({ done: ['L3'] })
    getLessonProgress.mockResolvedValue({ done: ['L3'] })
    await loadDone('a1', A, 7)
    // исходная попытка, неудачная досылка, удачная досылка
    expect(completeLesson).toHaveBeenCalledTimes(3)
    expect(completeLesson).toHaveBeenLastCalledWith(A, 7, 'L3', 40)
  })

  it('отказ по квоте при досылке снимает урок и с тропы', async () => {
    completeLesson.mockImplementationOnce(offline)
    await markDone('a1', A, 7, 'L3', 40)

    completeLesson.mockImplementationOnce(refused)
    getLessonProgress.mockResolvedValueOnce({ done: [] })
    const done = await loadDone('a1', A, 7)
    expect(done.has('L3')).toBe(false)
  })

  it('чужой урок под токеном другого ученика не досылается', async () => {
    completeLesson.mockImplementationOnce(offline)
    await markDone('a1', A, 7, 'L3', 40)

    getLessonProgress.mockResolvedValueOnce({ done: [] })
    await loadDone('a1', B, 7)
    expect(completeLesson).toHaveBeenCalledTimes(1)
  })

  it('отказ по квоте при прохождении в очередь не попадает', async () => {
    completeLesson.mockImplementationOnce(refused)
    await expect(markDone('a1', A, 7, 'L3', 40)).rejects.toBeInstanceOf(ContentRestrictedError)

    getLessonProgress.mockResolvedValueOnce({ done: [] })
    await loadDone('a1', A, 7)
    expect(completeLesson).toHaveBeenCalledTimes(1)
  })
})
