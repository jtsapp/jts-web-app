import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson, getBoardObjects, getBoardSettings, updateBoardSettings } from '../../api.js'

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 14, status: 'IN_PROGRESS' }) }))
})

describe('live lesson api', () => {
  it('getLessonById GETs /admin/lessons/{id} with Bearer', async () => {
    await getLessonById('TOK', 14)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
  })
  it('startLiveLesson PUTs /start', async () => {
    await startLiveLesson('TOK', 14)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14/start')
    expect(opts.method).toBe('PUT')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
  })
  it('pauseLiveLesson PUTs /pause with minutes', async () => {
    await pauseLiveLesson('TOK', 14, 5)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14/pause?minutes=5')
    expect(opts.method).toBe('PUT')
  })
  it('resumeLiveLesson PUTs /resume, completeLiveLesson PUTs /complete', async () => {
    await resumeLiveLesson('TOK', 14)
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/resume')
    await completeLiveLesson('TOK', 14)
    expect(String(global.fetch.mock.calls[1][0])).toContain('/admin/lessons/14/complete')
  })
  it('getBoardObjects GETs /board/objects, getBoardSettings GETs /board/settings', async () => {
    await getBoardObjects('TOK', 14)
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/board/objects')
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer TOK')
    await getBoardSettings('TOK', 14)
    expect(String(global.fetch.mock.calls[1][0])).toContain('/admin/lessons/14/board/settings')
  })
  it('updateBoardSettings PUTs a partial patch as JSON body', async () => {
    await updateBoardSettings('TOK', 14, { drawingDisabled: true })
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14/board/settings')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ drawingDisabled: true })
  })
})
