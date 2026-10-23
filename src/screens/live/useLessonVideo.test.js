// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../api.js', () => ({ getLessonVideoToken: vi.fn() }))

import { getLessonVideoToken } from '../../api.js'
import { useLessonVideo } from './useLessonVideo.js'

/**
 * Хук звонка урока. SDK подменяется заглушкой клиента через createClient,
 * токен — через мок api.js: проверяем только поведение хука.
 */
function fakeClient(overrides = {}) {
  const handlers = {}
  let list = [
    { userId: '140', identity: '140', name: 'Айгерим', audioMuted: false, videoOn: false, isHost: true },
    { userId: '141', identity: '141', name: 'Дана', audioMuted: false, videoOn: false, isHost: false },
  ]
  return {
    join: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
    selfId: () => '140',
    participants: () => list,
    startAudio: vi.fn(async () => {}),
    muteSelf: vi.fn(async () => {}),
    unmuteSelf: vi.fn(async () => {}),
    startVideo: vi.fn(async () => {}),
    stopVideo: vi.fn(async () => {}),
    attachVideo: vi.fn(async () => document.createElement('div')),
    detachVideo: vi.fn(async () => {}),
    muteUser: vi.fn(async () => {}),
    muteAll: vi.fn(async () => {}),
    removeUser: vi.fn(async () => {}),
    on: (event, cb) => { handlers[event] = cb; return () => { delete handlers[event] } },
    emit: (event, ...args) => handlers[event]?.(...args),
    setList: (next) => { list = next },
    ...overrides,
  }
}

const tokenReply = (host = true) => ({ token: 'jwt', sessionName: 'jts-lesson-49', userName: 'Айгерим', host })

function setup({ client = fakeClient(), enabled = true } = {}) {
  const createClient = vi.fn(async () => client)
  const hook = renderHook(() => useLessonVideo({
    token: 'tok', lessonId: 49, teacherUserId: 140, enabled, createClient,
  }))
  return { client, createClient, ...hook }
}

beforeEach(() => {
  getLessonVideoToken.mockReset()
  getLessonVideoToken.mockResolvedValue(tokenReply())
})

describe('useLessonVideo', () => {
  it('join: connecting -> connected, учитель первым, isSelf у себя', async () => {
    const { client, result } = setup()
    let pending
    act(() => { pending = result.current.join() })
    expect(result.current.phase).toBe('connecting')
    await act(async () => { await pending })
    expect(result.current.phase).toBe('connected')
    expect(client.join).toHaveBeenCalledWith('jts-lesson-49', 'jwt', 'Айгерим')
    expect(result.current.isHost).toBe(true)
    expect(result.current.micOn).toBe(true)
    expect(result.current.camOn).toBe(false)
    expect(result.current.tiles.map((t) => t.userId)).toEqual(['140', '141'])
    expect(result.current.tiles[0].isSelf).toBe(true)
    expect(result.current.tiles[1].isSelf).toBe(false)
  })

  it.each([[503, 'link'], [409, 'ended'], [403, 'denied']])('токен %i -> failed, fallback %s, клиент не входит', async (status, fallback) => {
    getLessonVideoToken.mockRejectedValue(Object.assign(new Error('x'), { status }))
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('failed')
    expect(result.current.fallback).toBe(fallback)
    expect(client.join).not.toHaveBeenCalled()
  })

  it('ошибка client.join -> failed, fallback link', async () => {
    const { result } = setup({ client: fakeClient({ join: vi.fn(async () => { throw new Error('sdk') }) }) })
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('failed')
    expect(result.current.fallback).toBe('link')
  })

  it('startAudio бросил NotAllowedError -> звонок идёт, deviceError', async () => {
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    const { result } = setup({ client: fakeClient({ startAudio: vi.fn(async () => { throw denied }) }) })
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('connected')
    expect(result.current.deviceError).toBe(true)
    expect(result.current.micOn).toBe(false)
  })

  it('enabled стал false при активном звонке (урок завершён) — хук выходит из звонка сам', async () => {
    const client = fakeClient()
    const createClient = vi.fn(async () => client)
    const { result, rerender } = renderHook(
      ({ enabled }) => useLessonVideo({ token: 'tok', lessonId: 49, teacherUserId: 140, enabled, createClient }),
      { initialProps: { enabled: true } },
    )
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('connected')
    rerender({ enabled: false })
    expect(client.leave).toHaveBeenCalledTimes(1)
    expect(result.current.phase).toBe('idle')
  })

  it('enabled остаётся true — смена других пропсов звонок не трогает', async () => {
    const client = fakeClient()
    const createClient = vi.fn(async () => client)
    const { result, rerender } = renderHook(
      ({ name }) => useLessonVideo({ token: 'tok', lessonId: 49, teacherUserId: name, enabled: true, createClient }),
      { initialProps: { name: 140 } },
    )
    await act(async () => { await result.current.join() })
    rerender({ name: 141 })
    expect(client.leave).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('connected')
  })

  it('connection и removed меняют фазу', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => client.emit('connection', 'reconnecting'))
    expect(result.current.phase).toBe('reconnecting')
    act(() => client.emit('connection', 'connected'))
    expect(result.current.phase).toBe('connected')
    act(() => client.emit('removed'))
    expect(result.current.phase).toBe('removed')
  })

  it('speaker: подсвечиваются только последние говорящие', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => client.emit('speaker', ['141']))
    expect(result.current.tiles.map((t) => t.speaking)).toEqual([false, true])
    act(() => client.emit('speaker', ['140']))
    expect(result.current.tiles.map((t) => t.speaking)).toEqual([true, false])
  })

  it('participants: новый участник появляется в плитках', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => {
      client.setList([...client.participants(), { userId: '142', identity: '142', name: 'Ерлан', audioMuted: true, videoOn: false, isHost: false }])
      client.emit('participants')
    })
    expect(result.current.tiles.map((t) => t.userId)).toEqual(['140', '141', '142'])
  })

  it('toggleMic: muteSelf, затем unmuteSelf; toggleCamera включает видео', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    await act(async () => { await result.current.toggleMic() })
    expect(client.muteSelf).toHaveBeenCalledTimes(1)
    expect(result.current.micOn).toBe(false)
    await act(async () => { await result.current.toggleMic() })
    expect(client.unmuteSelf).toHaveBeenCalledTimes(1)
    expect(result.current.micOn).toBe(true)
    await act(async () => { await result.current.toggleCamera() })
    expect(client.startVideo).toHaveBeenCalledTimes(1)
    expect(result.current.camOn).toBe(true)
  })

  it('учитель первым по identity из токена, свой плиток определяется по номеру в сессии', async () => {
    const client = fakeClient({ selfId: () => '1001' })
    client.setList([
      { userId: '1001', identity: '141', name: 'Дана', audioMuted: false, videoOn: false, isHost: false },
      { userId: '1000', identity: '140', name: 'Яна', audioMuted: false, videoOn: false, isHost: true },
    ])
    const { result } = setup({ client })
    await act(async () => { await result.current.join() })
    expect(result.current.tiles.map((t) => t.name)).toEqual(['Яна', 'Дана'])
    expect(result.current.tiles.map((t) => t.isSelf)).toEqual([false, true])
  })

  it('событие audio ведёт micOn: хост выключил микрофон — у ученика micOn=false', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    expect(result.current.micOn).toBe(true)
    act(() => client.emit('audio', 'muted'))
    expect(result.current.micOn).toBe(false)
    act(() => client.emit('audio', 'unmuted'))
    expect(result.current.micOn).toBe(true)
    act(() => client.emit('audio', 'left'))
    expect(result.current.micOn).toBe(false)
  })

  it('toggleMic после неудачного startAudio запускает звук и снимает deviceError', async () => {
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    const startAudio = vi.fn().mockRejectedValueOnce(denied).mockResolvedValue(undefined)
    const { client, result } = setup({ client: fakeClient({ startAudio }) })
    await act(async () => { await result.current.join() })
    expect(result.current.deviceError).toBe(true)
    await act(async () => { await result.current.toggleMic() })
    expect(client.startAudio).toHaveBeenCalledTimes(2)
    expect(client.unmuteSelf).not.toHaveBeenCalled()
    expect(result.current.micOn).toBe(true)
    expect(result.current.deviceError).toBe(false)
  })

  it('toggleMic после ухода из аудио снова запускает звук', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => client.emit('audio', 'left'))
    await act(async () => { await result.current.toggleMic() })
    expect(client.startAudio).toHaveBeenCalledTimes(2)
    expect(result.current.micOn).toBe(true)
  })

  it('после startVideo и stopVideo состав плиток обновляется сразу', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    client.setList(client.participants().map((p) => (p.userId === '140' ? { ...p, videoOn: true } : p)))
    await act(async () => { await result.current.toggleCamera() })
    expect(result.current.tiles[0].videoOn).toBe(true)
    client.setList(client.participants().map((p) => ({ ...p, videoOn: false })))
    await act(async () => { await result.current.toggleCamera() })
    expect(result.current.tiles[0].videoOn).toBe(false)
  })

  it('хост: enabled стал false — выход с завершением сессии для всех', async () => {
    const client = fakeClient()
    const createClient = vi.fn(async () => client)
    const { result, rerender } = renderHook(
      ({ enabled }) => useLessonVideo({ token: 'tok', lessonId: 49, teacherUserId: 140, enabled, createClient }),
      { initialProps: { enabled: true } },
    )
    await act(async () => { await result.current.join() })
    rerender({ enabled: false })
    expect(client.leave).toHaveBeenCalledWith(true)
  })

  it('не хост: enabled стал false — обычный выход, сессию не завершает', async () => {
    getLessonVideoToken.mockResolvedValue(tokenReply(false))
    const client = fakeClient()
    const createClient = vi.fn(async () => client)
    const { result, rerender } = renderHook(
      ({ enabled }) => useLessonVideo({ token: 'tok', lessonId: 49, teacherUserId: 140, enabled, createClient }),
      { initialProps: { enabled: true } },
    )
    await act(async () => { await result.current.join() })
    rerender({ enabled: false })
    expect(client.leave).toHaveBeenCalledWith(false)
  })

  it('кнопка «Выйти» выходит без завершения сессии, даже у хоста', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    await act(async () => { await result.current.leave({ type: 'click' }) })
    expect(client.leave).toHaveBeenCalledWith(false)
  })

  it('новый join ждёт завершения предыдущего выхода', async () => {
    let releaseLeave
    const first = fakeClient({ leave: vi.fn(() => new Promise((resolve) => { releaseLeave = resolve })) })
    const second = fakeClient()
    const createClient = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const { result } = renderHook(() => useLessonVideo({
      token: 'tok', lessonId: 49, teacherUserId: 140, enabled: true, createClient,
    }))
    await act(async () => { await result.current.join() })
    await act(async () => { await result.current.leave() })
    let pending
    act(() => { pending = result.current.join() })
    await vi.waitFor(() => expect(getLessonVideoToken).toHaveBeenCalledTimes(2))
    expect(createClient).toHaveBeenCalledTimes(1)
    await act(async () => { releaseLeave(); await pending })
    expect(createClient).toHaveBeenCalledTimes(2)
    expect(result.current.phase).toBe('connected')
  })

  it('управление чужими микрофонами — только у хоста', async () => {
    getLessonVideoToken.mockResolvedValue(tokenReply(false))
    const guest = setup()
    await act(async () => { await guest.result.current.join() })
    await act(async () => { await guest.result.current.muteUser('141') })
    await act(async () => { await guest.result.current.muteAll() })
    await act(async () => { await guest.result.current.removeUser('141') })
    expect(guest.client.muteUser).not.toHaveBeenCalled()
    expect(guest.client.muteAll).not.toHaveBeenCalled()
    expect(guest.client.removeUser).not.toHaveBeenCalled()

    getLessonVideoToken.mockResolvedValue(tokenReply(true))
    const host = setup()
    await act(async () => { await host.result.current.join() })
    await act(async () => { await host.result.current.muteUser('141') })
    expect(host.client.muteUser).toHaveBeenCalledWith('141')
  })

  it('размонтирование после входа вызывает leave', async () => {
    const { client, result, unmount } = setup()
    await act(async () => { await result.current.join() })
    unmount()
    expect(client.leave).toHaveBeenCalledTimes(1)
  })

  it('enabled:false — join ничего не делает', async () => {
    const { createClient, result } = setup({ enabled: false })
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('idle')
    expect(getLessonVideoToken).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('повторный join после failed разрешён', async () => {
    getLessonVideoToken.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 503 }))
    const { result } = setup()
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('failed')
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('connected')
    expect(result.current.fallback).toBeNull()
  })

  it('удаление хостом: removed, а не failed, в любом порядке событий', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => { client.emit('removed'); client.emit('connection', 'closed', 'kicked by host') })
    expect(result.current.phase).toBe('removed')
    expect(result.current.fallback).toBeNull()
  })

  it('вход отклонён как удалённого (3009) — removed, а не сбой со ссылкой', async () => {
    const client = fakeClient({ join: vi.fn(async () => { throw { type: 'JOIN_MEETING_FAILED', reason: 'user has been removed', errorCode: 3009 } }) })
    const { result } = setup({ client })
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('removed')
    expect(result.current.fallback).toBeNull()
  })

  it("Closed с причиной 'ended by host' -> failed, fallback ended", async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => client.emit('connection', 'closed', 'ended by host'))
    expect(result.current.phase).toBe('failed')
    expect(result.current.fallback).toBe('ended')
  })

  it('обрыв (Closed/Fail без причины) -> failed, fallback retry, затем join работает', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    act(() => client.emit('connection', 'closed'))
    expect(result.current.phase).toBe('failed')
    expect(result.current.fallback).toBe('retry')
    await act(async () => { await result.current.join() })
    expect(result.current.phase).toBe('connected')
    expect(result.current.fallback).toBeNull()
  })

  it('собственный leave не показывает ошибку', async () => {
    const { client, result } = setup()
    await act(async () => { await result.current.join() })
    await act(async () => { await result.current.leave() })
    act(() => client.emit('connection', 'closed'))
    expect(result.current.phase).toBe('idle')
    expect(result.current.fallback).toBeNull()
  })

  // Хук живёт на странице урока: ушли с неё, пока шло подключение, — сессия
  // не должна остаться жить без экрана со звуком.
  it('размонтирование во время подключения: вход доводится до выхода', async () => {
    let releaseToken
    getLessonVideoToken.mockReturnValue(new Promise((resolve) => { releaseToken = resolve }))
    const { client, result, unmount } = setup()
    let pending
    act(() => { pending = result.current.join() })
    unmount()
    await act(async () => { releaseToken(tokenReply()); await pending })
    expect(client.join).not.toHaveBeenCalled()
  })

  it('leave во время client.join: после входа клиент сразу выходит', async () => {
    let releaseJoin
    const client = fakeClient({ join: vi.fn(() => new Promise((resolve) => { releaseJoin = resolve })) })
    const { result } = setup({ client })
    let pending
    act(() => { pending = result.current.join() })
    await vi.waitFor(() => expect(client.join).toHaveBeenCalled())
    await act(async () => { await result.current.leave() })
    await act(async () => { releaseJoin(); await pending })
    expect(client.leave).toHaveBeenCalled()
    expect(client.startAudio).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')
  })

  it('enabled стал false во время подключения — вход прерывается', async () => {
    let releaseToken
    getLessonVideoToken.mockReturnValue(new Promise((resolve) => { releaseToken = resolve }))
    const client = fakeClient()
    const createClient = vi.fn(async () => client)
    const { result, rerender } = renderHook(
      ({ enabled }) => useLessonVideo({ token: 'tok', lessonId: 49, teacherUserId: 140, enabled, createClient }),
      { initialProps: { enabled: true } },
    )
    let pending
    act(() => { pending = result.current.join() })
    rerender({ enabled: false })
    await act(async () => { releaseToken(tokenReply()); await pending })
    expect(client.join).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')
  })

  it('leave во время startAudio: фаза остаётся idle', async () => {
    let releaseAudio
    const client = fakeClient({ startAudio: vi.fn(() => new Promise((resolve) => { releaseAudio = resolve })) })
    const { result } = setup({ client })
    let pending
    act(() => { pending = result.current.join() })
    await vi.waitFor(() => expect(client.startAudio).toHaveBeenCalled())
    await act(async () => { await result.current.leave() })
    await act(async () => { releaseAudio(); await pending })
    expect(result.current.phase).toBe('idle')
  })

  it('двойной клик «Подключиться» создаёт один клиент', async () => {
    const { createClient, result } = setup()
    await act(async () => { await Promise.all([result.current.join(), result.current.join()]) })
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})
