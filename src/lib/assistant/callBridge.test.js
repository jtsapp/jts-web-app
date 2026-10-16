import { describe, it, expect, vi } from 'vitest'
import { ASK, CANCEL, REPLY, SAY, attachCallBridge, callSpeech, createCallTourVoice, createReplySender, sayInCall } from './callBridge.js'

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
    expect(onAsk).toHaveBeenCalledWith({ id: '7', text: 'где домашка?', opening: false, agent: 'agent-1' })
    expect(await room.handlers.get(ASK)({ payload: 'не json' })).toBe('bad')
    await room.handlers.get(CANCEL)({ payload: '{"id":"7"}' })
    expect(onCancel).toHaveBeenCalledWith('7')
    detach()
    expect(room.handlers.size).toBe(0)
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

  it('тур в звонке: шаг говорит агент (luna.say), стоп — пустой текст', async () => {
    const room = fakeRoom()
    const voice = createCallTourVoice((text) => sayInCall(room, 'agent-1', text))
    voice.prefetch(['не нужен'])
    voice.say(['Это «Практика».', 'Здесь 3 вкладки.'])
    await new Promise((r) => setTimeout(r, 30))
    voice.stop()
    await new Promise((r) => setTimeout(r, 5))
    expect(room.sent.map((x) => [x.method, x.body.text])).toEqual([
      [SAY, expect.stringMatching(/^Это «Практика»\. Здесь три вкладки\.$/)],
      [SAY, ''],
    ])
    await sayInCall(null, 'agent-1', 'x') // без комнаты — тихо
  })
})
