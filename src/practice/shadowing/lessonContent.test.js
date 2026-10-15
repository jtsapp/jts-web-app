// Контент урока Shadowing: вшитый читается файлом, урок из админки — с бэкенда, но экрану отдаётся в одном и том же виде.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getShadowingLesson = vi.fn()
vi.mock('../../api.js', () => ({
  getShadowingLesson: (...a) => getShadowingLesson(...a),
  getShadowingLessons: vi.fn(),
}))

const fetchMock = vi.fn()

// Модуль держит кэш на уровне файла, поэтому каждый тест берёт его заново.
async function freshModule() {
  vi.resetModules()
  return import('./lessonContent.js')
}

const backendLesson = (over = {}) => ({
  id: 5, slug: 'calm-talk-ab3k9', title: 'Calm Talk', speaker: 'Noa Kageyama', video: 'CqgmozFr_GM',
  sourceChannel: 'TED-Ed', sourceUrl: 'https://www.youtube.com/watch?v=CqgmozFr_GM', level: 'B1', segCount: 2,
  segments: [[4, 6, 'Hi guys.'], [12.5, 15, 'So good to see you.']], ...over,
})

beforeEach(() => {
  getShadowingLesson.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadLessonFile — вшитый урок', () => {
  it('читает public/shadowing/<id>.json и не ходит на бэкенд', async () => {
    const file = { id: 'sg', segments: [[0, 2, 'Hello.']] }
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(file) })
    const { loadLessonFile } = await freshModule()

    await expect(loadLessonFile('sg', 'tok')).resolves.toBe(file)

    expect(fetchMock).toHaveBeenCalledWith('/shadowing/sg.json')
    expect(getShadowingLesson).not.toHaveBeenCalled()
  })

  it('повторный вызов берёт из кэша; сбой в кэше не остаётся', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })
    const { loadLessonFile } = await freshModule()

    await expect(loadLessonFile('sg', 'tok')).rejects.toThrow('404')

    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'sg', segments: [] }) })
    await expect(loadLessonFile('sg', 'tok')).resolves.toEqual({ id: 'sg', segments: [] })
    await loadLessonFile('sg', 'tok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('loadLessonFile — урок из админки', () => {
  it('приезжает с бэкенда по адресу и приводится к виду файла урока', async () => {
    getShadowingLesson.mockResolvedValue(backendLesson())
    const { loadLessonFile } = await freshModule()

    const file = await loadLessonFile('calm-talk-ab3k9', 'tok')

    expect(getShadowingLesson).toHaveBeenCalledWith('tok', 'calm-talk-ab3k9')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(file).toEqual({
      id: 'calm-talk-ab3k9',
      title: 'Calm Talk',
      short: 'Noa Kageyama',
      video: 'CqgmozFr_GM',
      source: { channel: 'TED-Ed', url: 'https://www.youtube.com/watch?v=CqgmozFr_GM' },
      level: 'B1',
      segments: [[4, 6, 'Hi guys.'], [12.5, 15, 'So good to see you.']],
    })
  })

  it('урок без спикера и без фраз не ломает форму файла', async () => {
    getShadowingLesson.mockResolvedValue(backendLesson({ speaker: null, sourceChannel: null, sourceUrl: null, level: null, segments: null }))
    const { loadLessonFile } = await freshModule()

    const file = await loadLessonFile('calm-talk-ab3k9', 'tok')

    expect(file.short).toBe('Calm Talk')
    expect(file.source).toEqual({ channel: null, url: null })
    expect(file.level).toBeNull()
    expect(file.segments).toEqual([])
  })

  it('кэш живёт недолго: правку фраз в админке ученик видит при следующем открытии, а не после перезагрузки вкладки', async () => {
    vi.useFakeTimers()
    getShadowingLesson.mockResolvedValue(backendLesson())
    const { loadLessonFile } = await freshModule()

    await loadLessonFile('calm-talk-ab3k9', 'tok')
    await loadLessonFile('calm-talk-ab3k9', 'tok')
    expect(getShadowingLesson).toHaveBeenCalledTimes(1) // переключение вкладок туда-сюда сеть не бьёт

    vi.advanceTimersByTime(3 * 60 * 1000)
    getShadowingLesson.mockResolvedValue(backendLesson({ segments: [[1, 3, 'Edited.']] }))
    const file = await loadLessonFile('calm-talk-ab3k9', 'tok')

    expect(getShadowingLesson).toHaveBeenCalledTimes(2)
    expect(file.segments).toEqual([[1, 3, 'Edited.']])
  })

  it('сбой не запоминается: следующий заход пробует снова', async () => {
    getShadowingLesson.mockRejectedValueOnce(new Error('Ошибка сервера (404)'))
    const { loadLessonFile } = await freshModule()

    await expect(loadLessonFile('calm-talk-ab3k9', 'tok')).rejects.toThrow('404')

    getShadowingLesson.mockResolvedValueOnce(backendLesson())
    await expect(loadLessonFile('calm-talk-ab3k9', 'tok')).resolves.toMatchObject({ id: 'calm-talk-ab3k9' })
  })
})
