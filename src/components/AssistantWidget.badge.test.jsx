// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Плашка голосовой команды и ореол кнопки (макет «При вызове Луны», 22.10.2026).
// «Ухо» (useWakeWord) и запись (useVoiceQuestion) подменены: тест сам зовёт onWake,
// как это сделал бы Vosk, и смотрит, что рисует кнопка. Саму анимацию — время и
// кривые — jsdom не видит, её проверяли живой записью браузера; здесь — что плашка
// появляется в цвете помощника, уходит через «втягивание» и не висит дольше.
const wake = vi.hoisted(() => ({ onWake: null }))
vi.mock('../lib/assistant/wake/useWakeWord.js', () => ({
  useWakeWord: (o) => {
    wake.onWake = o.onWake
    return { supported: true, on: true, state: 'listening', error: null, enable: () => {}, disable: () => {} }
  },
}))
const voice = vi.hoisted(() => ({ listen: null, state: 'idle' }))
vi.mock('../lib/assistant/useVoiceQuestion.js', () => ({
  useVoiceQuestion: () => ({
    supported: true,
    state: voice.state,
    elapsed: 0,
    error: null,
    retryAfterSec: null,
    toggle: () => {},
    cancel: () => {},
    clearError: () => {},
    listen: voice.listen,
    transcribeAudio: () => {},
  }),
}))
vi.mock('../lib/speech.js', () => ({ unlockSpeech: () => {}, stopTts: () => {}, playUrl: () => true }))
vi.mock('../lib/assistant/cue.js', () => ({ playCue: () => {} }))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

const renderWidget = () =>
  render(
    <I18nProvider>
      <div className="scr-in">
        <p>Главная</p>
        <button type="button">Далее</button>
      </div>
      <AssistantWidget token="tok" screen="home" enabled />
    </I18nProvider>,
  )
const badge = () => document.querySelector('.asst__badge')
const halo = () => document.querySelector('.asst__launcher .asst__halo')

describe('плашка «Слушаю вас» у кнопки помощника', () => {
  let listened
  beforeEach(() => {
    listened = null
    voice.state = 'idle'
    voice.listen = vi.fn((opts) => {
      listened = opts
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('одно «Луна» — плашка с микрофоном и ореол; команда сказана — плашка втягивается и уходит', async () => {
    localStorage.setItem('lang', 'ru')
    renderWidget()
    expect(document.querySelector('.asst').dataset.persona).toBe('luna')
    expect(badge()).toBeNull()

    act(() => {
      wake.onWake({ text: 'луна' })
    })
    expect(badge().dataset.cmd).toBe('listening')
    expect(badge().textContent).toBe('Слушаю вас')
    expect(badge().querySelector('svg')).not.toBeNull()
    expect(badge().classList.contains('is-out')).toBe(false)
    expect(halo().classList.contains('is-off')).toBe(false)
    // Свой редкий ореол кнопка на это время глушит.
    expect(document.querySelector('.asst__launcher').classList.contains('is-wake')).toBe(true)

    // Ученик промолчал — Луна открывает окно с приветствием: плашка уходит сразу,
    // втягиваться ей некуда (кнопка под окном спрятана).
    vi.useFakeTimers()
    await act(async () => {
      listened.onNoVoice()
    })
    expect(badge()).toBeNull()
    expect(halo()).toBeNull()
  })

  it('уходя без окна, плашка ещё 0.2 с «втягивается» (is-out), ореол гаснет; потом снимается', async () => {
    localStorage.setItem('lang', 'ru')
    renderWidget()
    act(() => {
      wake.onWake({ text: 'луна' })
    })
    expect(badge()).not.toBeNull()

    vi.useFakeTimers()
    // Быстрая команда «дальше»: Луна жмёт «Далее», «Нажала» висит CMD_SHOW_MS и уходит.
    await act(async () => {
      listened.onText('луна дальше')
    })
    expect(badge().dataset.cmd).toBe('pressed')
    expect(badge().textContent).toBe('Нажала «Далее»')
    expect(halo().classList.contains('is-off')).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(2500)
    })
    expect(badge().classList.contains('is-out')).toBe(true)
    expect(badge().getAttribute('aria-hidden')).toBe('true')
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(badge()).toBeNull()
    expect(document.querySelector('.asst__launcher').classList.contains('is-wake')).toBe(false)
  })

  it('при казахском интерфейсе — Айзере: та же плашка в её цвете', () => {
    localStorage.setItem('lang', 'kk')
    renderWidget()
    expect(document.querySelector('.asst').dataset.persona).toBe('aizere')
    act(() => {
      wake.onWake({ text: 'айзере' })
    })
    expect(badge().dataset.cmd).toBe('listening')
    expect(badge().textContent).toBe('Тыңдап тұрмын')
    expect(halo()).not.toBeNull()
  })
})
