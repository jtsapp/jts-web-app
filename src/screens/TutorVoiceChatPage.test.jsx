// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

// Переключатель «Рация | Свободно» в самом звонке. Живой комнаты здесь нет:
// LiveKit подменён, а агент — это performRpc, который отвечает режимом. Главное,
// что проверяется: кнопка микрофона меняет роль (тангента ↔ тумблер) только
// после подтверждения агента, и выбор уезжает в настройку следующих звонков.

const lk = vi.hoisted(() => ({
  va: { state: 'listening', agent: { identity: 'agent-1' }, audioTrack: null },
  lp: null,
  mic: true,
}))

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ children }) => children,
  RoomAudioRenderer: () => null,
  useConnectionState: () => 'connected',
  useVoiceAssistant: () => lk.va,
  useLocalParticipant: () => ({ localParticipant: lk.lp, isMicrophoneEnabled: lk.mic }),
  useTranscriptions: () => [],
  useDataChannel: () => ({}),
  useRoomContext: () => ({ localParticipant: lk.lp }),
  useTrackVolume: () => 0,
}))
vi.mock('@livekit/components-styles', () => ({}))
vi.mock('livekit-client', () => ({
  ConnectionState: { Connected: 'connected' },
  Track: { Source: { Microphone: 'microphone' } },
  RpcError: { ErrorCode: { UNSUPPORTED_METHOD: 1400, UNSUPPORTED_SERVER: 1401, UNSUPPORTED_VERSION: 1404 } },
}))
vi.mock('../tutor/callSession.js', () => ({ useCallSession: () => () => {} }))

// Подпись подбирает кегль по ширине бокса через ResizeObserver, а в jsdom его нет.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const { CallStage } = await import('./TutorVoiceChatPage.jsx')

const t = (key) => key

function stage(props = {}) {
  return render(
    <CallStage onFinish={() => {}} t={t} ttl={600} holdRef={{ current: false }} pushToTalk {...props} />
  )
}

const radio = (key) => screen.getByRole('radio', { name: key })
const mic = () => document.querySelector('.t-voice__mic')

describe('CallStage — режим хода в звонке', () => {
  beforeEach(() => {
    window.localStorage.clear()
    lk.lp = {
      performRpc: vi.fn(async ({ method, payload }) => (method === 'set_turn_mode' ? payload : 'ok')),
      setMicrophoneEnabled: vi.fn(async () => {}),
      getTrackPublication: () => undefined,
    }
  })

  it('переключатель стоит в звонке и показывает текущий режим', () => {
    stage()
    expect(radio('voice.modePtt').getAttribute('aria-checked')).toBe('true')
    expect(radio('voice.modeFree').getAttribute('aria-checked')).toBe('false')
    expect(mic().textContent).toContain('voice.pttHold')
  })

  it('«Свободно» — агент подтвердил, кнопка снова тумблер, выбор запомнен', async () => {
    stage()
    await act(async () => {
      fireEvent.click(radio('voice.modeFree'))
    })
    expect(lk.lp.performRpc).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'set_turn_mode', payload: 'auto' })
    )
    expect(radio('voice.modeFree').getAttribute('aria-checked')).toBe('true')
    expect(mic().className).not.toContain('is-ptt')
    expect(mic().textContent).toContain('voice.micOn')
    expect(window.localStorage.getItem('jts:tutor:pushToTalk')).toBe('0')
  })

  it('агент не умеет переключаться — экран не врёт и обещает следующий звонок', async () => {
    lk.lp.performRpc = vi.fn(async () => {
      throw Object.assign(new Error('unsupported'), { code: 1400 })
    })
    stage()
    await act(async () => {
      fireEvent.click(radio('voice.modeFree'))
    })
    expect(radio('voice.modePtt').getAttribute('aria-checked')).toBe('true')
    expect(mic().className).toContain('is-ptt')
    expect(screen.getByText('voice.modeLater')).toBeTruthy()
  })

  it('тап вместо удержания — подсказка «держи кнопку»', async () => {
    stage()
    const button = mic()
    await act(async () => {
      fireEvent.pointerDown(button, { pointerId: 1 })
      fireEvent.pointerUp(button, { pointerId: 1 })
    })
    expect(screen.getByText('voice.pttTapHint')).toBeTruthy()
    // Короткий тап — отмена хода, а не его конец: тьютор не отвечает на тишину.
    const methods = lk.lp.performRpc.mock.calls.map(([arg]) => arg.method)
    expect(methods).toEqual(['start_turn', 'cancel_turn'])
  })

  it('пока тьютора в комнате нет, переключателя нет', () => {
    lk.va = { state: 'disconnected', agent: null, audioTrack: null }
    stage()
    expect(screen.queryByRole('radiogroup')).toBeNull()
    lk.va = { state: 'listening', agent: { identity: 'agent-1' }, audioTrack: null }
  })
})
