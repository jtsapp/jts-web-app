import { describe, it, expect, vi, beforeEach } from 'vitest'

// Заглушка SDK: createClient() у настоящего SDK — синглтон, поэтому клиент один на все обёртки.
const handlers = {}
const sdk = {
  init: vi.fn(async () => {}),
  join: vi.fn(async () => {}),
  leave: vi.fn(async () => {}),
  getMediaStream: () => ({}),
  getAllUser: vi.fn(() => []),
  on: (e, cb) => { (handlers[e] ||= []).push(cb) },
  off: (e, cb) => { handlers[e] = (handlers[e] || []).filter((h) => h !== cb) },
}
const destroyClient = vi.fn(async () => {})
vi.mock('@zoom/videosdk', () => ({
  VideoQuality: { Video_180P: 1, Video_360P: 2 },
  ConnectionState: { Connected: 'Connected', Reconnecting: 'Reconnecting', Closed: 'Closed', Fail: 'Fail' },
  default: { createClient: () => sdk, destroyClient: () => destroyClient() },
}))

import { createVideoClient } from './zoomVideoClient.js'

const fire = (event, payload) => (handlers[event] || []).forEach((h) => h(payload))

beforeEach(() => {
  Object.keys(handlers).forEach((k) => delete handlers[k])
  Object.values(sdk).forEach((v) => v.mockClear?.())
  destroyClient.mockClear()
})

describe('zoomVideoClient connection events', () => {
  it('удаление хостом идёт только в removed, не в connection', async () => {
    const client = await createVideoClient()
    const connection = vi.fn()
    const removed = vi.fn()
    client.on('connection', connection)
    client.on('removed', removed)
    fire('connection-change', { state: 'Closed', reason: 'kicked by host' })
    fire('connection-change', { state: 'Closed', reason: 'expeled by host' })
    expect(removed).toHaveBeenCalledTimes(2)
    expect(connection).not.toHaveBeenCalled()
  })

  it('прочее закрытие и Fail идут в connection с причиной', async () => {
    const client = await createVideoClient()
    const connection = vi.fn()
    const removed = vi.fn()
    client.on('connection', connection)
    client.on('removed', removed)
    fire('connection-change', { state: 'Closed', reason: 'ended by host' })
    fire('connection-change', { state: 'Fail' })
    expect(connection).toHaveBeenNthCalledWith(1, 'closed', 'ended by host')
    expect(connection).toHaveBeenNthCalledWith(2, 'closed', undefined)
    expect(removed).not.toHaveBeenCalled()
  })
})

describe('zoomVideoClient participants', () => {
  it('участник несёт userId сессии и identity из нашего токена', async () => {
    sdk.getAllUser.mockReturnValue([
      { userId: 16778240, userIdentity: '140', displayName: 'Айгерим', muted: false, bVideoOn: true, isHost: true },
      { userId: 16778241, displayName: 'Гость' },
    ])
    const client = await createVideoClient()
    expect(client.participants()).toEqual([
      { userId: '16778240', identity: '140', name: 'Айгерим', audioMuted: false, videoOn: true, isHost: true },
      { userId: '16778241', identity: '', name: 'Гость', audioMuted: true, videoOn: false, isHost: false },
    ])
  })

  it('состав обновляется и по смене видео участников', async () => {
    const client = await createVideoClient()
    const cb = vi.fn()
    const off = client.on('participants', cb)
    fire('peer-video-state-change', {})
    fire('video-active-change', {})
    fire('user-updated', [])
    expect(cb).toHaveBeenCalledTimes(3)
    off()
    fire('peer-video-state-change', {})
    expect(cb).toHaveBeenCalledTimes(3)
  })
})

describe('zoomVideoClient audio', () => {
  it('current-audio-change превращается в muted / unmuted / left; join пропускается', async () => {
    const client = await createVideoClient()
    const cb = vi.fn()
    client.on('audio', cb)
    fire('current-audio-change', { action: 'join', type: 'computer' })
    fire('current-audio-change', { action: 'muted', source: 'passive(mute one)' })
    fire('current-audio-change', { action: 'unmuted', source: 'active' })
    fire('current-audio-change', { action: 'leave' })
    expect(cb.mock.calls.map((c) => c[0])).toEqual(['muted', 'unmuted', 'left'])
  })
})

describe('zoomVideoClient leave', () => {
  it('выходит и уничтожает клиент SDK; end передаётся в SDK', async () => {
    const client = await createVideoClient()
    await client.join('s', 't', 'n')
    await client.leave(true)
    expect(sdk.leave).toHaveBeenCalledWith(true)
    expect(destroyClient).toHaveBeenCalledTimes(1)
  })

  it('клиент уничтожается, даже если выход упал', async () => {
    sdk.leave.mockRejectedValueOnce(new Error('not joined'))
    const client = await createVideoClient()
    await expect(client.leave()).rejects.toThrow()
    expect(destroyClient).toHaveBeenCalledTimes(1)
  })

  it('повторный leave той же обёртки не трогает новую сессию на общем клиенте SDK', async () => {
    const first = await createVideoClient()
    await first.join('s', 't', 'n')
    await first.leave()
    const second = await createVideoClient()
    await second.join('s', 't', 'n')
    await first.leave()
    expect(sdk.leave).toHaveBeenCalledTimes(1)
    await second.leave()
    expect(sdk.leave).toHaveBeenCalledTimes(2)
  })

  it('выход во время входа ждёт конца входа и только потом выходит', async () => {
    let finishJoin
    sdk.join.mockImplementationOnce(() => new Promise((resolve) => { finishJoin = resolve }))
    const client = await createVideoClient()
    const joining = client.join('s', 't', 'n')
    await vi.waitFor(() => expect(sdk.join).toHaveBeenCalled())
    const leaving = client.leave()
    await Promise.resolve()
    expect(sdk.leave).not.toHaveBeenCalled()
    finishJoin()
    await joining
    await leaving
    expect(sdk.leave).toHaveBeenCalledTimes(1)
  })
})
