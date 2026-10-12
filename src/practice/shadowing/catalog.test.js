// @vitest-environment jsdom
// Каталог уроков Shadowing: вшитые в сайт + добавленные методистом через админку.
// Сторожим то, на чём держится «материал такой же, как до заливки»: админский урок приводится к виду вшитого,
// вшитые не вытесняются, а недоехавший список не превращает ссылку на новый урок в «чужой урок».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const getShadowingLessons = vi.fn()
vi.mock('../../api.js', () => ({
  getShadowingLessons: (...a) => getShadowingLessons(...a),
}))

const {
  normalizeRemoteLesson, setRemoteLessons, allLessons, getLesson, hasLesson, lessonAvailable, isRemoteLessonId,
  loadRemoteLessons, resetLessonsForTests, useShadowingCatalog, useShadowingLessons,
} = await import('./catalog.js')
const { LESSONS } = await import('./lessons.js')

const remote = (over = {}) => ({
  id: 5, slug: 'calm-talk-ab3k9', title: 'Calm Talk', speaker: 'Noa Kageyama', video: 'CqgmozFr_GM',
  sourceChannel: null, sourceUrl: null, level: 'B1', segCount: 31, orderIndex: 1, active: true, ...over,
})

beforeEach(() => {
  getShadowingLessons.mockReset()
  resetLessonsForTests()
})

describe('normalizeRemoteLesson — урок из админки приводится к виду вшитого', () => {
  it('те же поля, что у lessons.js: id, title, short (спикер), video, segCount, cover', () => {
    expect(normalizeRemoteLesson(remote())).toEqual({
      id: 'calm-talk-ab3k9',
      title: 'Calm Talk',
      short: 'Noa Kageyama',
      video: 'CqgmozFr_GM',
      segCount: 31,
      cover: 'https://i.ytimg.com/vi/CqgmozFr_GM/mqdefault.jpg',
      remote: true,
    })
  })

  it('без спикера подписью вкладки служит название — пустой вкладки не бывает', () => {
    expect(normalizeRemoteLesson(remote({ speaker: '  ' })).short).toBe('Calm Talk')
    expect(normalizeRemoteLesson(remote({ speaker: null })).short).toBe('Calm Talk')
  })

  it('мусор отбрасывается: адрес без дефиса, чужой ролик, нет фраз, нет названия', () => {
    expect(normalizeRemoteLesson(null)).toBeNull()
    expect(normalizeRemoteLesson(remote({ slug: 'calm' }))).toBeNull() // адрес вшитого урока
    expect(normalizeRemoteLesson(remote({ slug: 'Calm-Talk' }))).toBeNull()
    expect(normalizeRemoteLesson(remote({ slug: 'a/b-c' }))).toBeNull()
    expect(normalizeRemoteLesson(remote({ video: 'short' }))).toBeNull()
    expect(normalizeRemoteLesson(remote({ segCount: 0 }))).toBeNull()
    expect(normalizeRemoteLesson(remote({ segCount: '31' }))).toBeNull()
    expect(normalizeRemoteLesson(remote({ title: '   ' }))).toBeNull()
  })
})

describe('реестр уроков', () => {
  it('до загрузки — только вшитые, та же ссылка на массив', () => {
    expect(allLessons()).toBe(LESSONS)
  })

  it('админские уроки идут после вшитых, вшитые не потеряны и не переставлены', () => {
    setRemoteLessons([remote(), remote({ slug: 'second-ab3k9', title: 'Second' })])

    const ids = allLessons().map((l) => l.id)
    expect(ids.slice(0, LESSONS.length)).toEqual(LESSONS.map((l) => l.id))
    expect(ids.slice(LESSONS.length)).toEqual(['calm-talk-ab3k9', 'second-ab3k9'])
  })

  it('getLesson находит админский урок; на неизвестном — первый вшитый, как раньше', () => {
    setRemoteLessons([remote()])

    expect(getLesson('calm-talk-ab3k9').title).toBe('Calm Talk')
    expect(getLesson('нет-такого').id).toBe(LESSONS[0].id)
    expect(getLesson('sg').id).toBe('sg')
  })

  it('тот же список повторно — та же ссылка: экраны зря не перерисовываются', () => {
    setRemoteLessons([remote()])
    const first = allLessons()

    setRemoteLessons([remote()])

    expect(allLessons()).toBe(first)
  })

  it('урок скрыли в админке — после обновления списка он пропадает', () => {
    setRemoteLessons([remote()])
    expect(hasLesson('calm-talk-ab3k9')).toBe(true)

    setRemoteLessons([])

    expect(hasLesson('calm-talk-ab3k9')).toBe(false)
    expect(allLessons()).toBe(LESSONS)
  })

  it('isRemoteLessonId: у вшитых id дефиса нет, у админских он есть', () => {
    for (const l of LESSONS) expect(isRemoteLessonId(l.id)).toBe(false)
    expect(isRemoteLessonId('calm-talk-ab3k9')).toBe(true)
    expect(isRemoteLessonId(null)).toBe(false)
    // дефис сам по себе не признак: адрес из админки — латиница в нижнем регистре
    expect(isRemoteLessonId('нет-такого-урока')).toBe(false)
    expect(isRemoteLessonId('Calm-Talk')).toBe(false)
  })
})

describe('lessonAvailable — куда можно вести ученика', () => {
  it('вшитый урок есть всегда; незнакомый вшитый (dream в индекс не входит) — нет', () => {
    expect(lessonAvailable('sg')).toBe(true)
    expect(lessonAvailable('dream')).toBe(false)
  })

  it('адрес из админки до загрузки списка считается существующим: ссылку из домашней работы не прячем', () => {
    expect(lessonAvailable('calm-talk-ab3k9')).toBe(true)
  })

  it('после загрузки — только если урок в списке', () => {
    setRemoteLessons([remote()])

    expect(lessonAvailable('calm-talk-ab3k9')).toBe(true)
    expect(lessonAvailable('gone-talk-zz9zz')).toBe(false)
  })
})

describe('loadRemoteLessons', () => {
  it('без токена сеть не трогает', async () => {
    await loadRemoteLessons('')

    expect(getShadowingLessons).not.toHaveBeenCalled()
  })

  it('кладёт ответ в реестр; показ из кэша и свежий ответ оба доходят', async () => {
    getShadowingLessons.mockImplementation((token, onFresh) => {
      // Кэш отдаётся сразу, а свежий ответ приходит следом через onFresh.
      setTimeout(() => onFresh?.([remote(), remote({ slug: 'new-one-ab3k9', title: 'New one' })]), 0)
      return Promise.resolve([remote()])
    })

    await loadRemoteLessons('tok')
    expect(allLessons().map((l) => l.id)).toContain('calm-talk-ab3k9')

    await waitFor(() => expect(allLessons().map((l) => l.id)).toContain('new-one-ab3k9'))
    expect(getShadowingLessons).toHaveBeenCalledWith('tok', expect.any(Function))
  })

  it('сбой сети: остаются вшитые уроки, ожидание кончается, ссылка на админский урок больше не «существует»', async () => {
    getShadowingLessons.mockRejectedValue(new Error('Нет связи с сервером.'))

    await loadRemoteLessons('tok')

    expect(allLessons()).toBe(LESSONS)
    expect(lessonAvailable('calm-talk-ab3k9')).toBe(false)
  })

  it('параллельные вызовы схлопываются в один запрос', async () => {
    getShadowingLessons.mockResolvedValue([remote()])

    await Promise.all([loadRemoteLessons('tok'), loadRemoteLessons('tok')])

    expect(getShadowingLessons).toHaveBeenCalledTimes(1)
  })
})

describe('useShadowingCatalog / useShadowingLessons', () => {
  it('первый рендер — вшитые, потом список дополняется и экран перерисовывается', async () => {
    getShadowingLessons.mockResolvedValue([remote()])

    const { result } = renderHook(() => useShadowingCatalog('tok'))
    expect(result.current.lessons).toBe(LESSONS)
    expect(result.current.settled).toBe(false)

    await waitFor(() => expect(result.current.settled).toBe(true))
    expect(result.current.lessons.map((l) => l.id)).toContain('calm-talk-ab3k9')
  })

  it('вшитые уроки доступны сразу, без ожидания сети', () => {
    getShadowingLessons.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useShadowingLessons('tok'))

    expect(result.current.map((l) => l.id)).toEqual(LESSONS.map((l) => l.id))
  })

  it('без токена запрос не уходит, список остаётся вшитым', () => {
    renderHook(() => useShadowingLessons(''))

    expect(getShadowingLessons).not.toHaveBeenCalled()
  })

  it('урок, добавленный уже после монтирования, появляется без перезагрузки', async () => {
    getShadowingLessons.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useShadowingLessons('tok'))

    act(() => setRemoteLessons([remote()]))

    expect(result.current.map((l) => l.id)).toContain('calm-talk-ab3k9')
  })
})
