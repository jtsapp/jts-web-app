// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ index: vi.fn(), lesson: vi.fn() }))
vi.mock('../../api.js', () => ({ getVideoDictationIndex: api.index, getVideoDictationLesson: api.lesson }))

import { useVideoDictationIndex, useVideoDictationLesson } from './useVideoDictationData.js'

const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, '../../practice/video-dictation/__fixtures__/lessons.json'), 'utf8'))
const RAINY = FIX.lessons['rainy-day-k3f9q']
const httpError = (status) => Object.assign(new Error(`Ошибка сервера (${status})`), { status })

beforeEach(() => {
  api.index.mockReset()
  api.lesson.mockReset()
})

describe('список уроков', () => {
  it('без входа — guest, бэкенд не спрашиваем', () => {
    const { result } = renderHook(() => useVideoDictationIndex(null))
    expect(result.current.status).toBe('guest')
    expect(api.index).not.toHaveBeenCalled()
  })

  it('уроки пришли — ready в порядке бэкенда; свежая копия из фона заменяет кэш', async () => {
    let fresh
    api.index.mockImplementation((tk, onFresh) => {
      fresh = onFresh
      return Promise.resolve(FIX.index)
    })
    const { result } = renderHook(() => useVideoDictationIndex('tk'))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.lessons.map((l) => l.slug)).toEqual(['rainy-day-k3f9q', 'lost-kite-m2x7d', 'gone-video-p8w2z'])
    act(() => fresh({ lessons: [FIX.index.lessons[1]] }))
    expect(result.current.lessons.map((l) => l.slug)).toEqual(['lost-kite-m2x7d'])
  })

  it('404 и пустой список — «Раздел готовится» (missing)', async () => {
    api.index.mockRejectedValueOnce(httpError(404))
    const a = renderHook(() => useVideoDictationIndex('tk'))
    await waitFor(() => expect(a.result.current.status).toBe('missing'))
    api.index.mockResolvedValueOnce({ lessons: [] })
    const b = renderHook(() => useVideoDictationIndex('tk'))
    await waitFor(() => expect(b.result.current.status).toBe('missing'))
  })

  it('сбой сети — error, «Повторить» спрашивает снова', async () => {
    api.index.mockRejectedValueOnce(new Error('Нет связи с сервером.')).mockResolvedValueOnce(FIX.index)
    const { result } = renderHook(() => useVideoDictationIndex('tk'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(api.index).toHaveBeenCalledTimes(2)
  })
})

describe('урок', () => {
  it('без урока — idle', () => {
    const { result } = renderHook(() => useVideoDictationLesson('tk', null))
    expect(result.current.status).toBe('idle')
    expect(api.lesson).not.toHaveBeenCalled()
  })

  it('урок пришёл — фразы разобраны', async () => {
    api.lesson.mockResolvedValueOnce(RAINY)
    const { result } = renderHook(() => useVideoDictationLesson('tk', 'rainy-day-k3f9q'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(api.lesson).toHaveBeenCalledWith('tk', 'rainy-day-k3f9q')
    expect(result.current.lesson.phrases.map((p) => p.target)).toEqual(['lovemuddy', 'whereismyteddy'])
  })

  it('404 — missing; без фраз или без ролика — empty; сеть — error', async () => {
    api.lesson.mockRejectedValueOnce(httpError(404))
    const a = renderHook(() => useVideoDictationLesson('tk', 'x-k3f9q'))
    await waitFor(() => expect(a.result.current.status).toBe('missing'))

    api.lesson.mockResolvedValueOnce({ ...RAINY, segments: [[1, 2, 'I have 2 cats']] })
    const b = renderHook(() => useVideoDictationLesson('tk', 'y-k3f9q'))
    await waitFor(() => expect(b.result.current.status).toBe('empty'))

    api.lesson.mockResolvedValueOnce({ ...RAINY, video: 'not-an-id' })
    const c = renderHook(() => useVideoDictationLesson('tk', 'z-k3f9q'))
    await waitFor(() => expect(c.result.current.status).toBe('empty'))

    api.lesson.mockRejectedValueOnce(httpError(500))
    const d = renderHook(() => useVideoDictationLesson('tk', 'w-k3f9q'))
    await waitFor(() => expect(d.result.current.status).toBe('error'))
  })
})
