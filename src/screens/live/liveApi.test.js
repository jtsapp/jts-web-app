import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson, getBoardObjects, getBoardSettings, updateBoardSettings, getLessonSections, createSection, setSectionCompleted, deleteSection, attachSectionMaterial, detachSectionMaterial, setSectionMaterialHidden, materialRenderUrl, getLessonMessages, sendLessonMessage, getLessonNote, saveLessonNote, markNoShow, markParticipantCancelled, setLessonMeetingUrl } from '../../api.js'

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

describe('lesson sections api', () => {
  it('getLessonSections GETs /sections; createSection POSTs { title }', async () => {
    await getLessonSections('TOK', 14)
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/sections')
    await createSection('TOK', 14, 'Intro')
    const [, opts] = global.fetch.mock.calls[1]
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ title: 'Intro' })
  })
  it('setSectionCompleted PATCHes { completed }; deleteSection DELETEs the section', async () => {
    await setSectionCompleted('TOK', 14, 7, true)
    let [url, opts] = global.fetch.mock.calls[0]
    expect(opts.method).toBe('PATCH')
    expect(String(url)).toContain('/admin/lessons/14/sections/7')
    expect(JSON.parse(opts.body)).toEqual({ completed: true })
    await deleteSection('TOK', 14, 7)
    ;[url, opts] = global.fetch.mock.calls[1]
    expect(opts.method).toBe('DELETE')
    expect(String(url)).toContain('/admin/lessons/14/sections/7')
  })
  it('attach/detach material and visibility toggle hit the right paths', async () => {
    await attachSectionMaterial('TOK', 14, 7, 42)
    expect(global.fetch.mock.calls[0][1].method).toBe('POST')
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/sections/7/materials')
    await detachSectionMaterial('TOK', 14, 7, 99)
    expect(global.fetch.mock.calls[1][1].method).toBe('DELETE')
    expect(String(global.fetch.mock.calls[1][0])).toContain('/admin/lessons/14/sections/7/materials/99')
    await setSectionMaterialHidden('TOK', 14, 7, 99, true)
    expect(String(global.fetch.mock.calls[2][0])).toContain('/materials/99/visibility?hidden=true')
  })
})

describe('lesson chat / notes / attendance / meeting url', () => {
  it('getLessonMessages GETs /messages; sendLessonMessage POSTs { body }', async () => {
    await getLessonMessages('TOK', 14)
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/messages')
    await sendLessonMessage('TOK', 14, 'hi')
    const [, opts] = global.fetch.mock.calls[1]
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ body: 'hi' })
  })
  it('getLessonNote GETs; saveLessonNote PUTs { body } to /notes/{studentId}', async () => {
    await getLessonNote('TOK', 14, 5)
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/notes/5')
    await saveLessonNote('TOK', 14, 5, 'text')
    const [url, opts] = global.fetch.mock.calls[1]
    expect(opts.method).toBe('PUT')
    expect(String(url)).toContain('/admin/lessons/14/notes/5')
    expect(JSON.parse(opts.body)).toEqual({ body: 'text' })
  })
  it('markNoShow and markParticipantCancelled PUT the participant endpoints', async () => {
    await markNoShow('TOK', 14, 5)
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT')
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/participants/5/no-show')
    await markParticipantCancelled('TOK', 14, 5)
    expect(String(global.fetch.mock.calls[1][0])).toContain('/admin/lessons/14/participants/5/cancel')
  })
  it('setLessonMeetingUrl PUTs { meetingUrl, wholeSeries }, trimming and nulling empty', async () => {
    await setLessonMeetingUrl('TOK', 14, '  https://meet.example/x  ', true)
    let [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14/meeting-url')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ meetingUrl: 'https://meet.example/x', wholeSeries: true })
    await setLessonMeetingUrl('TOK', 14, '   ')
    ;[, opts] = global.fetch.mock.calls[1]
    expect(JSON.parse(opts.body)).toEqual({ meetingUrl: null, wholeSeries: false })
  })
})

describe('materialRenderUrl', () => {
  it('builds a live URL with the token in the query (documented web-admin parity)', () => {
    const url = materialRenderUrl(14, 42, { mode: 'live', token: 'TOK' })
    expect(url).toContain('/student/lessons/14/materials/42/render')
    expect(url).toContain('mode=live')
    expect(url).toContain('access_token=TOK')
  })
  it('builds a review URL with studentId for the teacher', () => {
    const url = materialRenderUrl(14, 42, { mode: 'review', token: 'TOK', studentId: 5 })
    expect(url).toContain('mode=review')
    expect(url).toContain('studentId=5')
  })
})
