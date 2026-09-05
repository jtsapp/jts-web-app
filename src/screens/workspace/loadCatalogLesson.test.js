// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api.js', () => ({
  getCourseCatalogLessonContent: vi.fn(),
}))

import { getCourseCatalogLessonContent } from '../../api.js'
import { loadCatalogLesson } from './loadCatalogLesson.js'

const FILE_URL = 'https://files-dev.justtostudy.kz/development/course-catalog/a1/lessons/L01.html'

function stored(overrides = {}) {
  return {
    id: 1,
    code: 'L01',
    title: '1A Hello',
    fileUrl: FILE_URL,
    complete: true,
    content: {
      unit: 'Unit 1',
      title: '1A Hello',
      level: 'A1',
      topics: [],
      steps: [
        {
          id: 'warmup',
          order: 1,
          title: 'Warm-up',
          blocks: [{ type: 'info', html: '<audio src="audio/track.mp3"></audio>' }],
        },
      ],
    },
    ...overrides,
  }
}

describe('loadCatalogLesson', () => {
  let nextId = 100

  beforeEach(() => {
    vi.mocked(getCourseCatalogLessonContent).mockReset()
    // Each test uses a fresh id — the module caches by lesson id across calls.
    nextId += 1
  })

  it('returns the structure stored on the backend', async () => {
    vi.mocked(getCourseCatalogLessonContent).mockResolvedValue(stored())

    const lesson = await loadCatalogLesson(nextId, 'token')

    expect(lesson.title).toBe('1A Hello')
    expect(lesson.steps).toHaveLength(1)
  })

  it('resolves relative media against the lesson file URL', async () => {
    vi.mocked(getCourseCatalogLessonContent).mockResolvedValue(stored())

    const lesson = await loadCatalogLesson(nextId, 'token')

    expect(lesson.steps[0].blocks[0].html).toContain(
      'https://files-dev.justtostudy.kz/development/course-catalog/a1/lessons/audio/track.mp3',
    )
  })

  it('does not re-request a lesson it already loaded', async () => {
    vi.mocked(getCourseCatalogLessonContent).mockResolvedValue(stored())
    const id = nextId

    await loadCatalogLesson(id, 'token')
    await loadCatalogLesson(id, 'token')

    expect(getCourseCatalogLessonContent).toHaveBeenCalledTimes(1)
  })

  it('falls back to the course file when the lesson has no stored structure', async () => {
    // Разбор сделан у 71 самостоятельного урока из 215 — остальные так и
    // остаются файлом курса, и это штатный случай, а не сбой: в DTO ручки так и
    // написано «the client falls back to fileUrl». Возвращать здесь null значило
    // подсунуть экрану пустоту — а он подставлял вместо неё демо-урок.
    vi.mocked(getCourseCatalogLessonContent).mockResolvedValue(stored({ content: null }))

    const lesson = await loadCatalogLesson(nextId, 'token')

    expect(lesson.fileUrl).toBe(FILE_URL)
    expect(lesson.title).toBe('1A Hello')
    expect(lesson.steps).toEqual([])
  })

  it('returns null when there is neither structure nor file', async () => {
    // Показывать нечего — и сказать об этом надо прямо.
    vi.mocked(getCourseCatalogLessonContent).mockResolvedValue(stored({ content: null, fileUrl: null }))

    expect(await loadCatalogLesson(nextId, 'token')).toBeNull()
  })

  it('returns null when the request fails', async () => {
    vi.mocked(getCourseCatalogLessonContent).mockRejectedValue(new Error('403'))

    expect(await loadCatalogLesson(nextId, 'token')).toBeNull()
  })

  it('falls back to the catalog title when the structure carries none', async () => {
    const withoutTitle = stored()
    withoutTitle.content = { ...withoutTitle.content, title: '' }
    vi.mocked(getCourseCatalogLessonContent).mockResolvedValue(withoutTitle)

    const lesson = await loadCatalogLesson(nextId, 'token')

    expect(lesson.title).toBe('1A Hello')
  })
})
