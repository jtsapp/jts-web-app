// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MicLineIcon, MicOffIcon } from '../tutor/TutorIcons.jsx'

// Полоса микрофона звонка по макету 29.10.2026. Живой комнаты здесь нет:
// LiveKit подменён, а агент — это performRpc. Проверяется, что режим звонка —
// тот, что ушёл в metadata (переключателя в самом звонке больше нет), что
// тангента рации ведёт ход через RPC, а трубка кладёт разговор.

const lk = vi.hoisted(() => ({
  va: { state: 'listening', agent: { identity: 'agent-1' }, audioTrack: null },
  lp: null,
  room: null,
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
  useRoomContext: () => lk.room,
  useTrackVolume: () => 0,
}))
vi.mock('@livekit/components-styles', () => ({}))
vi.mock('livekit-client', () => ({
  ConnectionState: { Connected: 'connected' },
  Track: { Source: { Microphone: 'microphone' } },
  RpcError: { ErrorCode: { UNSUPPORTED_METHOD: 1400, UNSUPPORTED_SERVER: 1401, UNSUPPORTED_VERSION: 1404 } },
}))
const closeSession = vi.hoisted(() => vi.fn())
vi.mock('../tutor/callSession.js', () => ({ useCallSession: () => closeSession }))

const { CallStage } = await import('./TutorVoiceChatPage.jsx')

const t = (key) => key

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function iconPath(Icon) {
  const { container, unmount } = render(<Icon size={24} />)
  const d = container.querySelector('path').getAttribute('d')
  unmount()
  return d
}

function cssRule(file, selector) {
  const css = fs.readFileSync(path.join(SRC, file), 'utf8')
  const escaped = selector.replace(/[.[\]"=]/g, '\\$&')
  return css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`))?.[1] || ''
}

function stage(props = {}) {
  return render(
    <CallStage
      onFinish={() => {}}
      t={t}
      tutor={{ key: 'dexter', name: 'Декстер', portrait: '/p.webp' }}
      ttl={600}
      holdRef={{ current: false }}
      {...props}
    />
  )
}

describe('CallStage — полоса микрофона', () => {
  beforeEach(() => {
    closeSession.mockClear()
    lk.mic = true
    lk.va = { state: 'listening', agent: { identity: 'agent-1' }, audioTrack: null }
    lk.lp = {
      performRpc: vi.fn(async () => 'ok'),
      setMicrophoneEnabled: vi.fn(async () => {}),
      getTrackPublication: () => undefined,
    }
    lk.room = { localParticipant: lk.lp, disconnect: vi.fn(async () => {}) }
  })

  it('рация — «Зажмите чтобы говорить», переключателя режима в звонке нет', () => {
    stage({ pushToTalk: true })
    expect(screen.getByText('voice.holdToTalk')).toBeTruthy()
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByText('voice.modePtt')).toBeNull()
  })

  it('тап вместо удержания — подсказка «держи кнопку», ход отменён', async () => {
    stage({ pushToTalk: true })
    const button = document.querySelector('.tp-mic__hold')
    await act(async () => {
      fireEvent.pointerDown(button, { pointerId: 1 })
      fireEvent.pointerUp(button, { pointerId: 1 })
    })
    expect(screen.getByText('voice.pttTapHint')).toBeTruthy()
    // Короткий тап — отмена хода, а не его конец: тьютор не отвечает на тишину.
    const methods = lk.lp.performRpc.mock.calls.map(([arg]) => arg.method)
    expect(methods).toEqual(['start_turn', 'cancel_turn'])
  })

  it('удержанный пробел не прокручивает страницу: автоповтор гасится', () => {
    stage({ pushToTalk: true })
    const first = new KeyboardEvent('keydown', { code: 'Space', key: ' ', cancelable: true })
    const repeat = new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, cancelable: true })
    act(() => {
      window.dispatchEvent(first)
      window.dispatchEvent(repeat)
    })
    expect(first.defaultPrevented).toBe(true)
    // Под звонком сетка ситуаций: без этого каждый повтор листал страницу вниз.
    expect(repeat.defaultPrevented).toBe(true)
    // Повтор хода заново не открывает.
    const starts = lk.lp.performRpc.mock.calls.filter(([arg]) => arg.method === 'start_turn')
    expect(starts).toHaveLength(1)
  })

  it('свободно — кнопка слева выключает микрофон', () => {
    stage({ pushToTalk: false })
    expect(document.querySelector('.tp-mic__hold')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'voice.micOn' }))
    expect(lk.lp.setMicrophoneEnabled).toHaveBeenCalledWith(false)
  })

  // Кнопка показывает состояние, а не действие. 01.11.2026 студентка видела на
  // включённом микрофоне красный зачёркнутый значок, а на выключенном — обычный
  // фиолетовый, и её не было слышно, хотя всё на экране выглядело исправным.
  it('свободно — включённый микрофон с обычным значком', () => {
    stage({ pushToTalk: false })
    const button = screen.getByRole('button', { name: 'voice.micOn' })
    expect(button.classList.contains('is-muted')).toBe(false)
    expect(button.querySelector('path').getAttribute('d')).toBe(iconPath(MicLineIcon))
  })

  it('свободно — выключенный микрофон с зачёркнутым значком', () => {
    lk.mic = false
    stage({ pushToTalk: false })
    const button = screen.getByRole('button', { name: 'voice.micOff' })
    expect(button.classList.contains('is-muted')).toBe(true)
    expect(button.querySelector('path').getAttribute('d')).toBe(iconPath(MicOffIcon))
  })

  it('цвет кнопки: включён — фиолетовый, выключен — красный', () => {
    expect(cssRule('tutor.css', '.tp-mic__toggle')).toContain('#9047ff')
    expect(cssRule('tutor.css', '.tp-mic__toggle.is-muted')).toContain('#ea564c')
    const dark = 'html[data-theme="dark"] '
    expect(cssRule('theme-dark.generated.css', `${dark}.tp-mic__toggle`)).toContain('--dk-acc')
    expect(cssRule('theme-dark.generated.css', `${dark}.tp-mic__toggle.is-muted`)).toContain('--dk-red')
  })

  it('красная трубка закрывает сессию учёта и кладёт комнату', () => {
    stage({ pushToTalk: false })
    fireEvent.click(screen.getByRole('button', { name: 'voice.end' }))
    expect(closeSession).toHaveBeenCalled()
    expect(lk.room.disconnect).toHaveBeenCalled()
  })

  it('таймер лимита: остаток звонка, у сцены со своими часами — её бюджет', () => {
    const { unmount } = stage({ ttl: 600 })
    expect(screen.getByRole('timer').textContent).toBe('10:00')
    unmount()
    stage({ ttl: 600, limitSec: 300 })
    expect(screen.getByRole('timer').textContent).toBe('5:00')
  })

  it('пока ученик молчит, второй пузырь — «…»', () => {
    stage()
    const bubbles = document.querySelectorAll('.tp-bubble')
    expect(bubbles).toHaveLength(2)
    expect(bubbles[0].textContent).toBe('voice.prompt')
    expect(bubbles[1].textContent).toBe('voice.typing')
  })

  it('сетка ситуаций снаружи кладёт трубку через hangupRef', () => {
    const hangupRef = { current: null }
    stage({ hangupRef })
    expect(typeof hangupRef.current).toBe('function')
    act(() => hangupRef.current())
    expect(lk.room.disconnect).toHaveBeenCalled()
  })
})
