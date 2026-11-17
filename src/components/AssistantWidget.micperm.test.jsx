// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Просьба Луны о микрофоне (задача 202, 16.11.2026: «сделать запрос как на Speaking Buddy»). Запись, «ухо» позывного
// и комната звонка подменены: здесь проверяется, КОГДА окно показывает плашку, что делает её кнопка и как объясняет
// запрет. Разрешение браузера — подменённый navigator.permissions.
const voice = vi.hoisted(() => ({ props: null, state: 'idle', toggle: null }))
vi.mock('../lib/assistant/useVoiceQuestion.js', () => ({
  useVoiceQuestion: (props) => {
    voice.props = props
    return {
      supported: true,
      state: voice.state,
      elapsed: 0,
      error: null,
      retryAfterSec: null,
      toggle: voice.toggle,
      cancel: () => {},
      clearError: () => {},
      listen: () => {},
      transcribeAudio: () => {},
    }
  },
}))
const wake = vi.hoisted(() => ({ props: null, enable: null }))
vi.mock('../lib/assistant/wake/useWakeWord.js', () => ({
  useWakeWord: (props) => {
    wake.props = props
    return { supported: true, on: false, state: 'off', error: null, enable: wake.enable, disable: () => {} }
  },
}))
vi.mock('./AssistantCall.jsx', () => ({ default: () => null }))
vi.mock('../lib/speech.js', () => ({ unlockSpeech: () => {}, stopTts: () => {}, playUrl: () => true, isTtsActive: () => false }))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

const WAIT = { timeout: 5000 }
const denied = () => Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })

// Разрешение браузера: по умолчанию «спросит» (prompt); тест меняет его, как ученик в окне браузера.
const perm = { state: 'prompt' }
function stubBrowser({ getUserMedia } = {}) {
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: vi.fn(async () => ({ get state() { return perm.state }, addEventListener() {}, removeEventListener() {} })) },
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: getUserMedia || vi.fn(async () => ({ getTracks: () => [{ stop() {} }] })) },
  })
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
}

async function openWindow(lang = 'ru') {
  localStorage.setItem('lang', lang)
  render(
    <I18nProvider>
      <div className="scr-in">
        <p>Главная</p>
      </div>
      <AssistantWidget token="tok" screen="home" enabled />
    </I18nProvider>,
  )
  // Хук разрешения спрашивает браузер после монтирования.
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: lang === 'kk' ? 'Көмекші' : 'Помощник' }))
}

const plate = () => document.querySelector('.t-micperm')

describe('просьба Луны о микрофоне', () => {
  let fetchMock
  beforeEach(() => {
    perm.state = 'prompt'
    Object.assign(voice, { props: null, state: 'idle', toggle: vi.fn() })
    wake.enable = vi.fn()
    fetchMock = vi.fn(async () => Response.json({ configured: true, token: 'lk', url: 'wss://x', room: 'jts-luna-1' }))
    vi.stubGlobal('fetch', fetchMock)
    stubBrowser()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('браузер ещё не спрашивал — плашка Speaking Buddy вместо записи; «Разрешить» и есть запрос', async () => {
    await openWindow()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить голосом' }))
    expect(voice.toggle).not.toHaveBeenCalled()
    expect(plate().dataset.micPerm).toBe('ask')
    expect(plate().textContent).toContain('Чтобы спросить голосом, разреши микрофон в браузере')
    fireEvent.click(screen.getByRole('button', { name: 'Разрешить, когда я на сайте' }))
    expect(voice.toggle).toHaveBeenCalledTimes(1)
    expect(plate()).toBeNull()
  })

  it('разрешение уже есть — запись сразу, без плашки', async () => {
    perm.state = 'granted'
    await openWindow()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить голосом' }))
    expect(voice.toggle).toHaveBeenCalledTimes(1)
    expect(plate()).toBeNull()
  })

  it('браузер уже запретил — плашка с тем, где снять запрет; «Попробовать снова» пробует микрофон', async () => {
    perm.state = 'denied'
    await openWindow()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить голосом' }))
    expect(voice.toggle).not.toHaveBeenCalled()
    expect(plate().dataset.micPerm).toBe('blocked')
    expect(plate().textContent).toContain('Микрофон заблокирован в браузере')
    const steps = [...plate().querySelectorAll('.asst__perm-steps li')].map((li) => li.textContent)
    expect(steps[0]).toMatch(/значок слева от адреса сайта/)
    expect(steps.at(-1)).toMatch(/Попробовать снова/)
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }))
    expect(voice.toggle).toHaveBeenCalledTimes(1)
  })

  it('запись отказала (в том числе после позывного) — плашка о запрете, «Не сейчас» её закрывает', async () => {
    perm.state = 'granted'
    await openWindow()
    perm.state = 'denied'
    await act(async () => voice.props.onMicDenied())
    await waitFor(() => expect(plate()?.dataset.micPerm).toBe('blocked'), WAIT)
    fireEvent.click(screen.getByRole('button', { name: 'Не сейчас' }))
    expect(plate()).toBeNull()
  })

  it('окно браузера закрыли, не ответив, — снова просьба, а не «заблокировано»', async () => {
    perm.state = 'granted'
    await openWindow()
    perm.state = 'prompt'
    await act(async () => voice.props.onMicDenied())
    await waitFor(() => expect(plate()?.dataset.micPerm).toBe('ask'), WAIT)
  })

  it('звонок: просьба, затем отказ браузера — плашка о запрете, токен звонка не запрашивается', async () => {
    const getUserMedia = vi.fn(async () => {
      perm.state = 'denied'
      throw denied()
    })
    stubBrowser({ getUserMedia })
    await openWindow()
    fireEvent.click(screen.getByRole('button', { name: 'Позвонить Луне' }))
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(plate().textContent).toContain('Чтобы позвонить Луне')
    fireEvent.click(screen.getByRole('button', { name: 'Разрешить, когда я на сайте' }))
    await waitFor(() => expect(plate()?.dataset.micPerm).toBe('blocked'), WAIT)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.some(([u]) => u === '/api/assistant/call')).toBe(false)
  })

  it('звонок: разрешили — микрофон и токен звонка', async () => {
    await openWindow()
    fireEvent.click(screen.getByRole('button', { name: 'Позвонить Луне' }))
    fireEvent.click(screen.getByRole('button', { name: 'Разрешить, когда я на сайте' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => u === '/api/assistant/call')).toBe(true), WAIT)
    expect(plate()).toBeNull()
  })

  it('позывной: плашка до включения; отказ «уха» при открытом окне — плашка о запрете', async () => {
    await openWindow()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Звать Луну голосом' }))
    expect(wake.enable).not.toHaveBeenCalled()
    expect(plate().textContent).toContain('Чтобы звать Луну голосом')
    fireEvent.click(screen.getByRole('button', { name: 'Разрешить, когда я на сайте' }))
    expect(wake.enable).toHaveBeenCalledTimes(1)
    perm.state = 'denied'
    await act(async () => wake.props.onDenied())
    await waitFor(() => expect(plate()?.dataset.micPerm).toBe('blocked'), WAIT)
  })

  it('закрыли окно Луны — плашка уходит вместе с ним', async () => {
    await openWindow()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить голосом' }))
    expect(plate()).not.toBeNull()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Луна' }), { key: 'Escape' })
    expect(plate()).toBeNull()
  })

  it('казахский интерфейс — просит Айзере и по-казахски', async () => {
    await openWindow('kk')
    fireEvent.click(screen.getByRole('button', { name: 'Дауыспен сұрау' }))
    expect(plate().textContent).toContain('Айзере тек сұрағыңды естиді')
    expect(screen.getByRole('button', { name: 'Сайтта болғанда рұқсат ету' })).toBeTruthy()
  })
})
