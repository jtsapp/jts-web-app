// @vitest-environment jsdom
//
// Экран игры целиком, без железа: микрофон подменён, кадры анимации гоняет
// сам тест. Проверяем то, что видит ученик, — язык интерфейса, тему только
// после «Старта», раунд до конца и итоги, отказ и отмену микрофона.

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n.jsx'
import { TOPICS } from '../../practice/arcade/topics.js'

const hw = vi.hoisted(() => ({ open: null, speech: null }))
vi.mock('../../practice/arcade/microphone.js', () => ({ openMicrophone: (...args) => hw.open(...args) }))
// По умолчанию распознавателя нет — решает порог громкости, как в Safari;
// тест со стенограммой подставляет свою сессию через hw.speech.
vi.mock('../../practice/arcade/transcript.js', () => ({
  startTranscript: (onChange, onUnavailable) => (hw.speech ? hw.speech(onChange, onUnavailable) : null),
}))

// Сессия распознавателя, которая к концу раунда «услышала» эту речь.
const SPEECH = 'I think my favourite food is soup because my grandmother makes it every Sunday and the whole family comes to eat it together'
function fakeSpeech(onChange) {
  const tokens = SPEECH.split(' ').map((text, i) => ({ text, kind: 'WORD', repetition: i === 1 && false }))
  return {
    sample: (voiced) => voiced,
    hesitating: () => false,
    stop: () =>
      onChange({
        utterances: [{ text: SPEECH, confidence: 0.9 }],
        segments: [
          { kind: 'PAUSE', text: '', tokens: [], start: 0, end: 1.5 },
          { kind: 'WORD', text: SPEECH, tokens, start: 1.5, end: 9 },
        ],
      }),
    abort: () => {},
  }
}

import ArcadeGame from './ArcadeGame.jsx'

let frames
let volume
function fakeMic() {
  return {
    noiseFloor: 0.001,
    features: () => ({ volume, pitch: 0, clarity: 0, spectrum: new Float32Array(16) }),
    active: () => true,
    volume: () => volume,
    close: vi.fn(),
  }
}

beforeEach(() => {
  frames = []
  volume = 0
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', (cb) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  hw.speech = null
})

function renderIn(lang, token = null) {
  localStorage.setItem('lang', lang)
  return render(
    <I18nProvider>
      <ArcadeGame token={token} />
    </I18nProvider>,
  )
}

// Прогоняет кадры шагом 100 мс, пока игра их просит.
function play(untilMs) {
  for (let now = 100; now <= untilMs && frames.length; now += 100) {
    const cb = frames.shift()
    act(() => cb(now))
  }
}

describe('ArcadeGame', () => {
  it('язык игры — язык интерфейса: тема по-русски и её английский оригинал', async () => {
    hw.open = async () => fakeMic()
    const { container } = renderIn('ru')
    // До старта темы нет нигде.
    expect(screen.getByText('Готовы?')).toBeTruthy()
    expect(container.querySelector('.ar-topic')).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /старт/i })))
    expect(container.querySelector('.ar-topic').textContent).toBe(TOPICS[1].ru[0])
    expect(screen.getByText(`По-английски: ${TOPICS[1].en[0]}`)).toBeTruthy()
    expect(screen.getByText('Отвечайте на английском')).toBeTruthy()
    // Посреди раунда сложность не меняется.
    expect(screen.getByRole('button', { name: /лёгкий/i }).disabled).toBe(true)
  })

  it('на Hard тема только английская, интерфейс — всё равно на языке страницы', async () => {
    hw.open = async () => fakeMic()
    const { container } = renderIn('kk')
    fireEvent.click(screen.getByRole('button', { name: /^.*Қиын.*IELTS 7\.0\+/ }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /бастау/i })))
    expect(container.querySelector('.ar-topic').textContent).toBe(TOPICS[2].en[0])
    expect(container.querySelector('.ar-topic-note')).toBeNull()
    expect(screen.getByText('Сіздің тақырыбыңыз')).toBeTruthy()
  })

  it('молчание доводит пилу до дерева за лимит, и раунд показывает итоги', async () => {
    hw.open = async () => fakeMic()
    const { container } = renderIn('en')
    fireEvent.click(screen.getByRole('button', { name: /very hard/i }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /start/i })))
    expect(screen.getByText('Silence: the saw is coming')).toBeTruthy()
    play(4000)
    expect(screen.getByText('Tree reached. Take a breath and try again.')).toBeTruthy()
    expect(container.querySelector('.ar-danger').getAttribute('aria-valuenow')).toBe('100')
    const results = screen.getByRole('region', { name: 'Your round' })
    expect(results.textContent).toContain('Time in silence2.5s')
    expect(results.textContent).toContain('Speaking time0.0s')
    expect(screen.getByRole('button', { name: /try another round/i })).toBeTruthy()
  })

  it('голос отгоняет пилу, а «Завершить раунд» заканчивает его досрочно', async () => {
    const mic = fakeMic()
    hw.open = async () => mic
    renderIn('en')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /start/i })))
    volume = 0.1
    play(1000)
    expect(screen.getByText('Speaking: the saw moves back')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /finish round/i }))
    expect(mic.close).toHaveBeenCalled()
    expect(screen.getByText('Round complete. Press Analyse to see your transcript.')).toBeTruthy()
    // Первый кадр — ещё тишина: голосу нужно ONSET_MS, чтобы включиться.
    const results = screen.getByRole('region', { name: 'Your round' }).textContent
    expect(results).toContain('Speaking time0.9s')
    expect(results).toContain('9.0:1')
    expect(results).toContain('Your words led the way')
  })

  // Раунд со стенограммой: говорим секунду и завершаем кнопкой.
  async function playSpokenRound() {
    hw.speech = fakeSpeech
    hw.open = async () => fakeMic()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /start/i })))
    volume = 0.1
    play(1000)
    fireEvent.click(screen.getByRole('button', { name: /finish round/i }))
  }

  it('«Анализ» открывает стенограмму; гостю ИИ-разбор предлагает войти', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    renderIn('en')
    await playSpokenRound()
    // До конца раунда кнопки нет, после — есть.
    fireEvent.click(screen.getByRole('button', { name: /^.?\s*analyse$/i }))
    const dialog = screen.getByRole('dialog', { name: 'Here’s what you said.' })
    expect(dialog.textContent).toContain('my grandmother makes it every Sunday')
    expect(dialog.textContent).toContain('Log in to get an AI practice review')
    // Гость в сеть не ходит вовсе.
    expect(fetchSpy).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ИИ-разбор уходит один раз, с номером темы и языком страницы, и рисует балл', async () => {
    const calls = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        calls.push({ url, init })
        if (!init.method) return new Response(JSON.stringify({ configured: true, budget: { limit: 20, used: 0, remaining: 20 } }))
        return new Response(
          JSON.stringify({
            review: {
              topic: TOPICS[1].en[0],
              language: 'ru',
              model: 'claude-sonnet-5',
              estimatedBand: 6.5,
              assessed: 3,
              summary: 'Хороший раунд.',
              criteria: [
                { key: 'fluencyAndCoherence', band: 7, assessable: true, comments: ['Говорите ровно.'] },
                { key: 'lexicalResource', band: 6, assessable: true, comments: ['Мало синонимов.'] },
                { key: 'grammaticalRangeAndAccuracy', band: 6, assessable: true, comments: ['Простые предложения.'] },
                { key: 'pronunciation', band: null, assessable: false, comments: [] },
              ],
              strengths: ['Ясная мысль'],
              weaknesses: ['Мало связок'],
              recommendations: [{ advice: 'Замените «because».', evidence: 'soup because my grandmother' }],
            },
            budget: { limit: 20, used: 1, remaining: 19 },
          }),
        )
      }),
    )
    renderIn('ru', 'TOKEN')
    hw.speech = fakeSpeech
    hw.open = async () => fakeMic()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /старт/i })))
    volume = 0.1
    play(1000)
    fireEvent.click(screen.getByRole('button', { name: /завершить раунд/i }))
    fireEvent.click(screen.getByRole('button', { name: /^.?\s*анализ$/i }))
    expect(screen.getByText('Осталось разборов на сегодня: 20 из 20')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /ии-разбор/i })))
    const post = calls.find((c) => c.init.method === 'POST')
    expect(post.init.headers.Authorization).toBe('Bearer TOKEN')
    expect(JSON.parse(post.init.body)).toMatchObject({ level: 'medium', topicIndex: 0, language: 'ru' })
    expect(screen.getByText('6,5')).toBeTruthy()
    expect(screen.getByText('Хороший раунд.')).toBeTruthy()
    expect(screen.getByText('soup because my grandmother')).toBeTruthy()
    expect(screen.getByText('Осталось разборов на сегодня: 19 из 20')).toBeTruthy()
    // Второго разбора того же раунда нет — кнопки больше нет.
    expect(screen.queryByRole('button', { name: /ии-разбор/i })).toBeNull()
  })

  it('исчерпанный лимит — понятный текст без кнопки «Повторить»', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) =>
        init.method
          ? new Response(JSON.stringify({ error: 'daily_limit_reached', budget: { limit: 20, used: 20, remaining: 0 } }), { status: 429 })
          : new Response(JSON.stringify({ budget: null })),
      ),
    )
    renderIn('en', 'TOKEN')
    await playSpokenRound()
    fireEvent.click(screen.getByRole('button', { name: /^.?\s*analyse$/i }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /ai review/i })))
    expect(screen.getByRole('alert').textContent).toMatch(/today’s AI reviews \(20 per day\)/)
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })

  it('отказ в микрофоне — сообщение на языке страницы, темы нет', async () => {
    hw.open = async () => {
      throw new DOMException('denied', 'NotAllowedError')
    }
    const { container } = renderIn('ru')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /старт/i })))
    expect(screen.getByRole('alert').textContent).toMatch(/Доступ к микрофону запрещён/)
    expect(container.querySelector('.ar-topic')).toBeNull()
    expect(screen.getByRole('button', { name: /старт/i })).toBeTruthy()
  })

  it('«Отмена» во время ожидания разрешения: поздно пришедший микрофон закрывается', async () => {
    const mic = fakeMic()
    let grant
    hw.open = () => new Promise((resolve) => (grant = resolve))
    renderIn('en')
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.getByText('Waiting for microphone')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByText('Ready?')).toBeTruthy()
    await act(async () => grant(mic))
    expect(mic.close).toHaveBeenCalled()
    expect(screen.getByText('Ready?')).toBeTruthy()
  })
})
