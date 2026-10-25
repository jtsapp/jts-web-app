// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mountSpeedReading } from './engine.js'

// Движок Скорочтения в тени с подменённым окружением: образец, микрофон, распознавание и бэкенд — заглушки cfg.
// Таймеры, кадры и performance.now — фальшивые: отсчёт 3-2-1 и бегущая строка идут по часам теста.

const BODY_A = 'Hello everyone my name is Ali and I live in Almaty'
const WORDS_A = BODY_A.split(' ').map((w, i) => [w, i * 0.5, i * 0.5 + 0.4])
const TEXTS = () => [
  { id: 'a', level: 'A1', icon: '👋', title: { ru: 'Знакомство', kk: 'Танысу', en: 'Introduce yourself' }, body: BODY_A, words: 11, sample: { url: 'https://f/a.mp3', words: WORDS_A, wpm: 150 } },
  { id: 'b', level: 'B1', icon: '✈️', title: { ru: '<img src=x onerror=alert(1)>', kk: 'Ұшақ', en: 'Flight' }, body: 'Good morning ladies and gentlemen', words: 5, sample: null },
]

let host
let root
let api
let env

const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}
const $ = (sel) => root.querySelector(sel)
const $$ = (sel) => [...root.querySelectorAll(sel)]
const click = (sel) => {
  const el = $(sel)
  if (!el) throw new Error(`нет ${sel}`)
  el.click()
}
const text = () => root.textContent.replace(/\s+/g, ' ')

function makeEnv(over = {}) {
  const e = {
    handlers: null,
    live: null,
    recorder: { start: vi.fn(), stop: vi.fn(async () => new Blob(['RIFF'], { type: 'audio/wav' })), cancel: vi.fn() },
    liveStop: vi.fn(),
  }
  e.cfg = {
    texts: TEXTS(),
    attempts: [],
    lang: 'ru',
    img: (n) => `/img/${n}.webp`,
    playSample: vi.fn((url, rate, h) => {
      e.handlers = h
    }),
    stopSample: vi.fn(() => {
      const h = e.handlers
      e.handlers = null
      h?.onEnd?.('stopped')
    }),
    ensureSample: vi.fn(() => new Promise(() => {})),
    canRecord: () => true,
    openRecorder: vi.fn(async () => e.recorder),
    startLive: vi.fn(({ onWords, onDead }) => {
      e.live = { onWords, onDead }
      return { stop: e.liveStop }
    }),
    transcribe: vi.fn(async () => 'Hello everyone my name is Ali'),
    submitAttempt: vi.fn(async () => ({ attempt: { id: 9, createdAt: new Date().toISOString() }, coins: 4 })),
    scrollTop: vi.fn(),
    ...over,
  }
  return e
}

function mount(over) {
  env = makeEnv(over)
  api = mountSpeedReading(root, env.cfg)
  return env
}

async function record({ talk = ['Hello', 'everyone'], ms = 3000 } = {}) {
  click('[data-act="begin"]')
  await flush()
  vi.advanceTimersByTime(2400) // 3-2-1 по 800 мс
  await flush()
  if (talk) env.live.onWords(talk)
  vi.advanceTimersByTime(ms)
  click('[data-act="stop"]')
  await flush()
  await flush()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
  URL.createObjectURL = vi.fn(() => 'blob:rec')
  URL.revokeObjectURL = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="sr"></div>'
  root = shadow.querySelector('.sr')
})

afterEach(() => {
  api?.destroy()
  api = null
  host.remove()
  vi.useRealTimers()
})

describe('стартовый экран', () => {
  it('тексты, семь скоростей, подпись темпа по образцу', () => {
    mount()
    expect($$('.srtexts button')).toHaveLength(2)
    expect($('.srtexts button.on').dataset.arg).toBe('a')
    expect($$('.srspd button').map((b) => b.textContent.trim())).toEqual(['0.5x', '0.7x', '1x', '1.5x', '2x', '2.5x', '3x'])
    expect(text()).toContain('1x — темп носителя · 150 сл/мин · ≈ 4 секунд')
    click('.srspd button[data-arg="1.5"]')
    expect($('.srspd button.on').textContent.trim()).toBe('1.5x')
    expect(text()).toContain('225 сл/мин')
  })

  it('названия из админки экранированы', () => {
    mount()
    expect($$('.srtexts img')).toHaveLength(0)
    expect(text()).toContain('<img src=x onerror=alert(1)>')
  })

  it('попытки сегодня считаются по попыткам с сервера', () => {
    mount({ attempts: [{ id: 1, textId: 'a', createdAt: new Date().toISOString(), percent: 80, stars: 2, speed: 1, durationSec: 30 }] })
    expect(text()).toContain('Попыток сегодня: 1')
  })

  it('язык переключается без пересоздания', () => {
    mount()
    expect($('h2').textContent).toContain('Скорочтение')
    api.setLang('en')
    expect($('h2').textContent).toContain('Speed reading')
    expect(text()).toContain('Introduce yourself')
  })
})

describe('образец', () => {
  it('текст без образца — образец создаётся при открытии, кнопка ждёт', async () => {
    let done
    mount({ ensureSample: vi.fn(() => new Promise((r) => (done = r))) })
    expect(env.cfg.ensureSample).not.toHaveBeenCalled() // у первого текста образец есть
    click('.srtexts button[data-arg="b"]')
    expect(env.cfg.ensureSample).toHaveBeenCalledWith('b')
    expect($('[data-act="listen"]').disabled).toBe(true)
    expect($('[data-act="listen"]').textContent).toContain('Готовим образец')
    click('.srtexts button[data-arg="a"]')
    click('.srtexts button[data-arg="b"]')
    expect(env.cfg.ensureSample).toHaveBeenCalledTimes(1)
    done({ status: 'ready', sample: { url: 'https://f/b.mp3', words: [['Good', 0, 0.3]], wpm: 170 } })
    await flush()
    expect($('[data-act="listen"]').disabled).toBe(false)
    expect($('[data-act="listen"]').textContent).toContain('Послушать образец')
    expect(text()).toContain('170 сл/мин')
  })

  it('синтеза на стенде нет — «Образец недоступен»', async () => {
    mount({ ensureSample: vi.fn(async () => ({ status: 'unavailable' })) })
    click('.srtexts button[data-arg="b"]')
    await flush()
    expect($('[data-act="listen"]').disabled).toBe(true)
    expect($('[data-act="listen"]').textContent).toContain('Образец недоступен')
  })

  it('играет на выбранной скорости, подсветка — по времени записи', () => {
    mount()
    click('.srspd button[data-arg="1.5"]')
    click('[data-act="listen"]')
    expect(env.cfg.playSample).toHaveBeenCalledWith('https://f/a.mp3', 1.5, expect.any(Object))
    expect($$('#srlist span')).toHaveLength(11)
    env.handlers.onTime(1.6) // четвёртое слово (name) начинается на 1.5 с
    expect($('#srl3').classList.contains('on')).toBe(true)
    expect($$('#srlist span.done').map((s) => s.textContent)).toEqual(['Hello', 'everyone', 'my'])
    click('[data-act="listen"]')
    expect(env.cfg.stopSample).toHaveBeenCalled()
    expect($('#srlist')).toBeNull()
  })

  it('образец доиграл — кнопка снова «Послушать»', () => {
    mount()
    click('[data-act="listen"]')
    env.handlers.onEnd('ended')
    expect($('#srlist')).toBeNull()
    expect($('[data-act="listen"]').textContent).toContain('Послушать образец')
  })
})

describe('запись и итог', () => {
  it('отсчёт, запись, живая подсветка, итог по серверу и попытка на бэкенд', async () => {
    mount()
    click('[data-act="begin"]')
    await flush()
    expect(env.cfg.openRecorder).toHaveBeenCalledOnce()
    expect($('.tele')).not.toBeNull()
    expect(env.recorder.start).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2400)
    expect(env.recorder.start).toHaveBeenCalledOnce()
    expect(env.cfg.startLive).toHaveBeenCalledOnce()
    env.live.onWords(['Hello', 'everyone'])
    expect($$('.tele-text span.said').map((s) => s.textContent)).toEqual(['Hello', 'everyone'])
    vi.advanceTimersByTime(3000)
    click('[data-act="stop"]')
    await flush()
    await flush()
    expect(env.liveStop).toHaveBeenCalled()
    expect(env.cfg.transcribe).toHaveBeenCalledWith(expect.any(Blob), expect.any(AbortSignal))
    const body = env.cfg.submitAttempt.mock.calls[0][0]
    expect(Object.keys(body).sort()).toEqual(['durationSec', 'percent', 'scoredBy', 'speed', 'stars', 'textId', 'wordsRead', 'wordsTotal', 'wpm'])
    expect(body).toMatchObject({ textId: 'a', speed: 1, wordsTotal: 11, wordsRead: 6, percent: 55, stars: 1, scoredBy: 'server' })
    expect(body.durationSec).toBe(3)
    expect(body.wpm).toBe(120)
    expect(text()).toContain('Прочитано 55%')
    expect($('audio').getAttribute('src')).toBe('blob:rec')
    expect($('a[download]').getAttribute('download')).toMatch(/^speed-a-\d{4}-\d{2}-\d{2}\.wav$/)
    expect(text()).toContain('+4 монеты')
  })

  it('сервер не распознал — итог по живому распознаванию', async () => {
    mount({ transcribe: vi.fn(async () => null) })
    await record({ talk: ['Hello', 'everyone', 'my'] })
    expect(env.cfg.submitAttempt.mock.calls[0][0]).toMatchObject({ scoredBy: 'browser', wordsRead: 3, percent: 27 })
  })

  it('пустой ответ сервера при словах живого распознавания — итог по живому', async () => {
    mount({ transcribe: vi.fn(async () => '') })
    await record({ talk: ['Hello', 'everyone'] })
    expect(env.cfg.submitAttempt.mock.calls[0][0]).toMatchObject({ scoredBy: 'browser', wordsRead: 2 })
  })

  it('пустой ответ сервера без живого — честные 0 % по серверу', async () => {
    mount({ transcribe: vi.fn(async () => '') })
    await record({ talk: null })
    expect(env.cfg.submitAttempt.mock.calls[0][0]).toMatchObject({ scoredBy: 'server', wordsRead: 0, percent: 0 })
  })

  it('числа цифрами в ответе сервера засчитываются', async () => {
    const texts = TEXTS()
    texts[0].body = 'Your room is four hundred and twelve'
    texts[0].sample = null
    mount({ texts, transcribe: vi.fn(async () => 'Your room is 412') })
    await record({ talk: null })
    expect(env.cfg.submitAttempt.mock.calls[0][0]).toMatchObject({ wordsRead: 7, percent: 100 })
  })

  it('бэкенд отказал (текст скрыли) — не «проверьте интернет»', async () => {
    mount({ submitAttempt: vi.fn(async () => { throw Object.assign(new Error('x'), { status: 404 }) }) })
    await record()
    expect(text()).toContain('Попытку не приняли')
    expect(text()).not.toContain('проверьте интернет')
  })

  it('«Попыток сегодня» считает сохранённую попытку после возврата', async () => {
    mount()
    expect(text()).toContain('Попыток сегодня: 0')
    await record()
    click('[data-act="back"]')
    expect(text()).toContain('Попыток сегодня: 1')
  })

  it('ни сервера, ни живого — оценка недоступна, звёзд нет', async () => {
    mount({ transcribe: vi.fn(async () => null) })
    await record({ talk: null })
    expect(env.cfg.submitAttempt.mock.calls[0][0]).toMatchObject({ scoredBy: 'none', wordsRead: 0, percent: null, stars: 0, wpm: null })
    expect(text()).toContain('Оценка недоступна')
  })

  it('пока браузер спрашивает микрофон — ожидание с «Отменой», выбора текста нет', async () => {
    let grant
    mount({ openRecorder: vi.fn(() => new Promise((r) => (grant = r))) })
    click('[data-act="listen"]')
    click('[data-act="begin"]')
    expect(env.cfg.stopSample).toHaveBeenCalled()
    expect(text()).toContain('Ждём доступ к микрофону')
    expect($('[data-act="text"]')).toBeNull()
    expect($('[data-act="listen"]')).toBeNull()
    click('[data-act="cancel"]')
    expect($('.srtexts')).not.toBeNull()
    grant(env.recorder)
    await flush()
    expect(env.recorder.cancel).toHaveBeenCalled()
    expect($('.tele')).toBeNull()
  })

  it('текст попытки — тот, с которого начали', async () => {
    let grant
    mount({ openRecorder: vi.fn(() => new Promise((r) => (grant = r))) })
    click('[data-act="begin"]')
    api.setLang('ru')
    grant(env.recorder)
    await flush()
    vi.advanceTimersByTime(2400)
    vi.advanceTimersByTime(1000)
    click('[data-act="stop"]')
    await flush()
    await flush()
    expect(env.cfg.submitAttempt.mock.calls[0][0]).toMatchObject({ textId: 'a', wordsTotal: 11 })
  })

  it('распознавание замолчало — подсветка выключена до конца попытки', async () => {
    mount()
    click('[data-act="begin"]')
    await flush()
    vi.advanceTimersByTime(2400)
    env.live.onDead('silent')
    env.live.onWords(['Hello'])
    expect($$('.tele-text span.said')).toHaveLength(0)
  })

  it('бегущая строка сама останавливает запись через 2,5 с после конца текста', async () => {
    mount()
    click('[data-act="begin"]')
    await flush()
    vi.advanceTimersByTime(2400)
    vi.advanceTimersByTime(4400 + 2600) // 11 слов на 150 сл/мин = 4,4 с
    await flush()
    await flush()
    expect(env.recorder.stop).toHaveBeenCalled()
    expect(text()).toContain('Прочитано')
  })

  it('стоп во время отсчёта — обратно к выбору, ничего не отправлено', async () => {
    mount()
    click('[data-act="begin"]')
    await flush()
    vi.advanceTimersByTime(900)
    click('[data-act="stop"]')
    await flush()
    expect(env.recorder.cancel).toHaveBeenCalled()
    expect($('.srstart')).not.toBeNull()
    vi.advanceTimersByTime(5000)
    expect(env.recorder.start).not.toHaveBeenCalled()
    expect(env.cfg.submitAttempt).not.toHaveBeenCalled()
  })

  it('«Мои попытки»: свои с плеером и с сервера без него', async () => {
    mount({ attempts: [{ id: 1, textId: 'a', createdAt: '2026-10-20T10:00:00Z', percent: 80, stars: 2, speed: 2, durationSec: 30 }] })
    await record()
    const rows = $$('.srtries .lrow')
    expect(rows).toHaveLength(2)
    expect(rows[0].querySelector('audio')).not.toBeNull()
    expect(rows[1].querySelector('audio')).toBeNull()
    expect(rows[1].textContent).toContain('80%')
  })
})

describe('без микрофона и демо', () => {
  it('отказ в микрофоне — экран-инструкция с именем ошибки, демо ничего не отправляет', async () => {
    const err = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    mount({ openRecorder: vi.fn(async () => { throw err }) })
    click('[data-act="begin"]')
    await flush()
    expect(text()).toContain('Нет доступа к микрофону')
    expect(text()).toContain('NotAllowedError')
    click('[data-act="demo"]')
    expect($('.tele')).not.toBeNull()
    vi.advanceTimersByTime(2400 + 4400 + 2600)
    await flush()
    expect(text()).toContain('Это демо без микрофона')
    expect(env.cfg.transcribe).not.toHaveBeenCalled()
    expect(env.cfg.submitAttempt).not.toHaveBeenCalled()
  })

  it('браузер не умеет записывать — сразу экран-инструкция', async () => {
    mount({ canRecord: () => false })
    expect(text()).toContain('не умеет записывать звук')
    click('[data-act="begin"]')
    await flush()
    expect(env.cfg.openRecorder).not.toHaveBeenCalled()
    expect(text()).toContain('Нет доступа к микрофону')
  })
})

describe('уход с экрана', () => {
  it('посреди записи — микрофон, распознавание и кадры отпущены', async () => {
    mount()
    click('[data-act="begin"]')
    await flush()
    vi.advanceTimersByTime(2400)
    api.destroy()
    api = null
    expect(env.recorder.cancel).toHaveBeenCalled()
    expect(env.liveStop).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    expect(root.innerHTML).toBe('')
  })

  it('уход во время распознавания — запрос распознавания отменяется', async () => {
    let signal
    mount({ transcribe: vi.fn((wav, s) => { signal = s; return new Promise(() => {}) }) })
    click('[data-act="begin"]')
    await flush()
    vi.advanceTimersByTime(2400 + 1000)
    click('[data-act="stop"]')
    await flush()
    await flush()
    expect(signal.aborted).toBe(false)
    api.destroy()
    api = null
    expect(signal.aborted).toBe(true)
  })

  it('во время образца — образец остановлен; после итога — адреса записей отозваны', async () => {
    mount()
    await record()
    click('[data-act="listen"]')
    api.destroy()
    api = null
    expect(env.cfg.stopSample).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:rec')
  })

  it('исходник не трогает document.body, location, хранилище и синтез браузера', () => {
    const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')
    expect(source).not.toMatch(/document\.body|\blocation\.|localStorage|sessionStorage|speechSynthesis|window\.scrollTo|onclick=/)
  })
})
