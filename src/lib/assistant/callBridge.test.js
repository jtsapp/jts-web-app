import { describe, it, expect, vi } from 'vitest'
import { ASK, CANCEL, COMMIT, REPLY, SAY, attachCallBridge, callSpeech, createReplySender, sayInCall } from './callBridge.js'

// Комната LiveKit в миниатюре: обработчики RPC и журнал исходящих вызовов.
function fakeRoom({ failFirst = false } = {}) {
  const handlers = new Map()
  const sent = []
  let n = 0
  return {
    handlers,
    sent,
    registerRpcMethod: (m, h) => handlers.set(m, h),
    unregisterRpcMethod: (m) => handlers.delete(m),
    localParticipant: {
      performRpc: vi.fn(async ({ destinationIdentity, method, payload }) => {
        n += 1
        // Медленная первая отправка — порядок всё равно сохраняется.
        if (n === 1) await new Promise((r) => setTimeout(r, 20))
        if (failFirst && n === 1) throw new Error('timeout')
        sent.push({ to: destinationIdentity, method, body: JSON.parse(payload) })
        return 'ok'
      }),
    },
  }
}

describe('мост звонка Луне', () => {
  it('luna.ask отдаёт вопрос сразу «ok», luna.cancel — id; снятие убирает обработчики', async () => {
    const room = fakeRoom()
    const onAsk = vi.fn()
    const onCancel = vi.fn()
    const detach = attachCallBridge(room, { onAsk, onCancel })
    const res = await room.handlers.get(ASK)({ payload: '{"id":"7","text":"где домашка?","opening":false}', callerIdentity: 'agent-1' })
    expect(res).toBe('ok')
    expect(onAsk).toHaveBeenCalledWith({ id: '7', text: 'где домашка?', opening: false, pending: false, agent: 'agent-1' })
    expect(await room.handlers.get(ASK)({ payload: 'не json' })).toBe('bad')
    await room.handlers.get(CANCEL)({ payload: '{"id":"7"}' })
    expect(onCancel).toHaveBeenCalledWith('7', { drop: false })
    detach()
    expect(room.handlers.size).toBe(0)
  })

  it('черновик: pending в вопросе, luna.commit делает его ходом, cancel с drop — без следа', async () => {
    const room = fakeRoom()
    const onAsk = vi.fn()
    const onCancel = vi.fn()
    const onCommit = vi.fn()
    attachCallBridge(room, { onAsk, onCancel, onCommit })
    await room.handlers.get(ASK)({ payload: '{"id":"8","text":"как открыть","pending":true}', callerIdentity: 'agent-1' })
    expect(onAsk).toHaveBeenCalledWith({ id: '8', text: 'как открыть', opening: false, pending: true, agent: 'agent-1' })
    expect(await room.handlers.get(COMMIT)({ payload: '{"id":"8"}' })).toBe('ok')
    expect(onCommit).toHaveBeenCalledWith('8')
    await room.handlers.get(CANCEL)({ payload: '{"id":"9","drop":true}' })
    expect(onCancel).toHaveBeenCalledWith('9', { drop: true })
    // Старое окно без обработчика commit — не падаем.
    const bare = fakeRoom()
    attachCallBridge(bare, { onAsk, onCancel })
    expect(await bare.handlers.get(COMMIT)({ payload: '{"id":"8"}' })).toBe('ok')
  })

  it('фразы ответа уходят агенту по порядку, конец — один раз, после конца — ничего', async () => {
    const room = fakeRoom()
    const s = createReplySender(room, 'agent-1', '7')
    s.phrase('Первая.')
    s.phrase('  ')
    s.phrase('Вторая.')
    await s.end()
    s.phrase('лишняя')
    await s.end()
    expect(room.sent.map((x) => x.body)).toEqual([{ id: '7', text: 'Первая.' }, { id: '7', text: 'Вторая.' }, { id: '7', end: true }])
    expect(room.sent.every((x) => x.to === 'agent-1' && x.method === REPLY)).toBe(true)
  })

  it('замеры браузера едут с первой фразой и только с ней', async () => {
    const room = fakeRoom()
    const s = createReplySender(room, 'agent-1', '7')
    s.timing({ fetch: 812, server: 'auth;dur=40' })
    s.phrase('Первая.')
    s.timing({ fetch: 1 })
    s.phrase('Вторая.')
    await s.end()
    expect(room.sent.map((x) => x.body)).toEqual([
      { id: '7', text: 'Первая.', t: { fetch: 812, server: 'auth;dur=40' } },
      { id: '7', text: 'Вторая.' },
      { id: '7', end: true },
    ])
  })

  it('ответ, снятый нарочно, кончается тихо — агент не скажет «не получилось»', async () => {
    const room = fakeRoom()
    const s = createReplySender(room, 'agent-1', '9')
    await s.end({ silent: true })
    expect(room.sent.map((x) => x.body)).toEqual([{ id: '9', end: true, silent: true }])
  })

  it('сбой одной отправки не рвёт очередь', async () => {
    const room = fakeRoom({ failFirst: true })
    const s = createReplySender(room, 'agent-1', '8')
    s.phrase('потеряется')
    s.phrase('дойдёт')
    await s.end()
    expect(room.sent.map((x) => x.body)).toEqual([{ id: '8', text: 'дойдёт' }, { id: '8', end: true }])
  })

  it('озвучка: русские числа словами, казахская и английская фраза как есть', () => {
    expect(callSpeech('Вы сделали 5 заданий.')).not.toMatch(/\d/)
    expect(callSpeech('Open lesson 5.')).toBe('Open lesson 5.')
    expect(callSpeech('Үй жұмысы: 3 тапсырма.')).toMatch(/3/)
  })

  it('замолчать в звонке — пустой текст агенту (luna.say)', async () => {
    const room = fakeRoom()
    await sayInCall(room, 'agent-1', '')
    expect(room.sent.map((x) => [x.method, x.body.text])).toEqual([[SAY, '']])
    await sayInCall(null, 'agent-1', 'x') // без комнаты — тихо
  })
})
