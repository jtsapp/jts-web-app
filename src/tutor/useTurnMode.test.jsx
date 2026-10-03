// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { turnModeAccepted, useTurnMode } from './useTurnMode.js'
import { getPushToTalk } from '../lib/pushToTalk.js'

function fakeRoom(rpc) {
  const lp = {
    performRpc: vi.fn(rpc),
    setMicrophoneEnabled: vi.fn(async () => {}),
  }
  return { room: { localParticipant: lp }, lp }
}

describe('turnModeAccepted', () => {
  it('переключение подтверждает только ответ ровно этим режимом', () => {
    expect(turnModeAccepted('ptt', 'ptt')).toBe(true)
    expect(turnModeAccepted('auto', 'auto')).toBe(true)
    // «auto» на ptt — агент остался в прежнем режиме; «error» — мусорный payload.
    expect(turnModeAccepted('ptt', 'auto')).toBe(false)
    expect(turnModeAccepted('ptt', 'error')).toBe(false)
    expect(turnModeAccepted('ptt', undefined)).toBe(false)
  })
})

describe('useTurnMode', () => {
  beforeEach(() => window.localStorage.clear())

  it('агент подтвердил — режим меняется сразу и запоминается', async () => {
    const { room, lp } = fakeRoom(async ({ payload }) => payload)
    const { result } = renderHook(() =>
      useTurnMode({ initialPtt: true, room, agentIdentity: 'agent-1' })
    )
    expect(result.current.ptt).toBe(true)

    await act(() => result.current.choose(false))
    expect(lp.performRpc).toHaveBeenCalledWith(
      expect.objectContaining({ destinationIdentity: 'agent-1', method: 'set_turn_mode', payload: 'auto' })
    )
    expect(result.current.ptt).toBe(false)
    expect(result.current.notice).toBe('')
    expect(getPushToTalk()).toBe(false)
  })

  it('обратно в рацию — микрофон включается: в «Свободно» его могли заглушить', async () => {
    const { room, lp } = fakeRoom(async ({ payload }) => payload)
    const { result } = renderHook(() =>
      useTurnMode({ initialPtt: false, room, agentIdentity: 'agent-1' })
    )
    await act(() => result.current.choose(true))
    expect(result.current.ptt).toBe(true)
    expect(lp.setMicrophoneEnabled).toHaveBeenCalledWith(true)
  })

  it('старый воркер (нет метода) — кнопка не врёт, выбор уходит в следующий звонок', async () => {
    const { room, lp } = fakeRoom(async () => {
      throw Object.assign(new Error('Method not supported'), { code: 1400 })
    })
    const { result } = renderHook(() =>
      useTurnMode({ initialPtt: true, room, agentIdentity: 'agent-1' })
    )
    await act(() => result.current.choose(false))
    expect(result.current.ptt).toBe(true)
    expect(result.current.notice).toBe('later')
    expect(getPushToTalk()).toBe(false)
    expect(lp.setMicrophoneEnabled).not.toHaveBeenCalled()
  })

  it('тьютора в комнате ещё нет — не зовём RPC в пустоту', async () => {
    const { room, lp } = fakeRoom(async ({ payload }) => payload)
    const { result } = renderHook(() => useTurnMode({ initialPtt: true, room, agentIdentity: '' }))
    await act(() => result.current.choose(false))
    expect(lp.performRpc).not.toHaveBeenCalled()
    expect(result.current.notice).toBe('later')
  })

  it('повторный выбор того же режима ничего не шлёт', async () => {
    const { room, lp } = fakeRoom(async ({ payload }) => payload)
    const { result } = renderHook(() =>
      useTurnMode({ initialPtt: true, room, agentIdentity: 'agent-1' })
    )
    await act(() => result.current.choose(true))
    expect(lp.performRpc).not.toHaveBeenCalled()
  })
})
