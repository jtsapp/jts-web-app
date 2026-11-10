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
  { id: 'a', level: 'A1', icon: '👋', genre: 'airport', category: 'travel', sound: 'airport', title: { ru: 'Знакомство', kk: 'Танысу', en: 'Introduce yourself' }, body: BODY_A, words: 11, sample: { url: 'https://f/a.mp3', words: WORDS_A, wpm: 150 } },
  { id: 'b', level: 'A1', icon: '✈️', genre: 'inflight', category: 'travel', sound: 'plane', title: { ru: '<img src=x onerror=alert(1)>', kk: 'Ұшақ', en: 'Flight' }, body: 'Good morning ladies and gentlemen', words: 5, sample: null },
  // v1.2: на B1 — тот же жанр airport (смена уровня его сохраняет) и ситуации другой группы; порядок — как пришёл с
  // сервера, а экран сортирует по жанрам справочника (shop — первый в «Городе», cafe — третий).
  { id: 'c', level: 'B1', icon: '☕', genre: 'cafe', category: 'city', sound: 'cafe', title: { ru: 'В кафе', kk: 'Кафеде', en: 'At the café' }, body: 'Two coffees please', words: 3, sample: null },
  { id: 'd', level: 'B1', icon: '✈️', genre: 'airport', category: 'travel', sound: 'airport', title: { ru: 'Смена выхода', kk: 'Шығу', en: 'Gate change' }, body: 'Flight 427 now boards at Gate 12', words: 7, sample: null },
  { id: 'e', level: 'B1', icon: '🛒', genre: 'shop', category: 'city', sound: 'mall', title: { ru: 'В магазине', kk: 'Дүкенде', en: 'In the shop' }, body: 'The shop closes at nine', words: 5, sample: null },
  { id: 'f', level: 'B1', icon: '📄', genre: null, category: null, sound: null, title: { ru: 'Старый текст', kk: 'Ескі', en: 'Old text' }, body: 'Old text without a group', words: 5, sample: null },
]

// Фон сцен — заглушка: в jsdom нет Web Audio, а движку важно, когда он просит сцену, сигнал и сведение с записью.
function fakeAmbience({ cue = 0 } = {}) {
  const a = {
    cue,
    now: null,
    volume: 45,
    mix: { stream: { id: 'mixed' }, bus: { id: 'bus' }, setOn: vi.fn(), release: vi.fn() },
    wake: vi.fn(() => true),
    start: vi.fn((key, o = {}) => {
      a.now = { key, preview: !!o.preview, onPreviewEnd: o.onPreviewEnd }
      return a.cue
    }),
    stop: vi.fn(() => {
      a.now = null
    }),
    route: vi.fn(),
    playing: () => (a.now ? { key: a.now.key, preview: a.now.preview } : null),
    setVolume: vi.fn((v) => (a.volume = v)),
    close: vi.fn(),
  }
  a.mixer = vi.fn(() => a.mix)
  return a
}

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
    recorder: { start: vi.fn(), stop: vi.fn(async () => new Blob(['RIFF'], { type: 'audio/wav' })), take: vi.fn(async () => null), cancel: vi.fn() },
    liveStop: vi.fn(),
    amb: over.ambience || fakeAmbience(),
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
    unlockSample: vi.fn(),
    ...over,
    ambience: e.amb,
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
  it('уровни и группы вкладками, ситуации группы, семь скоростей и подпись темпа', () => {
    mount()
    expect($$('.srlv button').map((b) => b.dataset.arg)).toEqual(['A1', 'B1'])
    expect($('.srlv button.on').textContent).toBe('A12')
    expect($$('.srcat button').map((b) => b.dataset.arg)).toEqual(['travel'])
    expect($$('.srtexts button')).toHaveLength(2)
    expect($('.srtexts button.on').dataset.arg).toBe('a')
    expect($$('.srspd button').map((b) => b.textContent.trim())).toEqual(['0,5x', '0,7x', '1x', '1,5x', '2x', '2,5x', '3x'])
    expect(text()).toContain('1x — темп носителя · 150 сл/мин · ≈ 4 секунд')
    click('.srspd button[data-arg="1.5"]')
    expect($('.srspd button.on').textContent.trim()).toBe('1,5x')
    expect($('#srspdv').textContent).toBe('1,5x')
    expect(text()).toContain('225 сл/мин')
  })

  it('смена уровня оставляет тот же жанр; группы по справочнику, тексты без группы — «Другие»', () => {
    mount()
    click('.srlv button[data-arg="B1"]')
    expect($('.srtexts button.on').dataset.arg).toBe('d') // airport и на B1
    expect($$('.srcat button').map((b) => b.dataset.arg)).toEqual(['travel', 'city', 'other'])
    expect(text()).toContain('· 4 жанра на уровне') // жанры, а не тексты; f без жанра — свой
    click('.srcat button[data-arg="city"]')
    // shop — первый жанр «Города», cafe — третий: порядок справочника, а не сервера.
    expect($$('.srtexts button').map((b) => b.dataset.arg)).toEqual(['e', 'c'])
    expect($('.srtexts button.on').dataset.arg).toBe('e')
    click('.srcat button[data-arg="other"]')
    expect($$('.srtexts button').map((b) => b.dataset.arg)).toEqual(['f'])
    click('.srlv button[data-arg="A1"]')
    expect($('.srtexts button.on').dataset.arg).toBe('a') // у «Других» жанра нет — первая ситуация уровня
  })

  it('уровень ученика — вкладка по умолчанию; A0 открывает A1, C2 — C1, своих текстов нет — первый уровень', () => {
    const c1 = { id: 'g', level: 'C1', icon: '🎓', genre: 'graduation', category: 'work', sound: 'hall', title: { ru: 'Выпускная речь', kk: 'Сөз', en: 'Speech' }, body: 'Dear graduates', words: 2, sample: null }
    const a0 = { ...c1, id: 'z', level: 'A0', title: { ru: 'Привет', kk: 'Сәлем', en: 'Hi' } }
    mount({ initialLevel: 'B1' })
    expect($('.srlv button.on').dataset.arg).toBe('B1')
    expect($('.srtexts button.on').dataset.arg).toBe('d')
    api.destroy()
    mount({ initialLevel: 'A0' })
    expect($('.srlv button.on').dataset.arg).toBe('A1')
    api.destroy()
    mount({ initialLevel: 'C2', texts: [...TEXTS(), c1] })
    expect($('.srlv button.on').dataset.arg).toBe('C1')
    api.destroy()
    mount({ initialLevel: 'C2' })
    expect($('.srlv button.on').dataset.arg).toBe('A1') // ни C2, ни C1 — первый уровень
    api.destroy()
    // у уровня ученика есть свои тексты — своя вкладка, а не соседняя
    mount({ initialLevel: 'A0', texts: [...TEXTS(), a0] })
    expect($$('.srlv button').map((b) => b.dataset.arg)).toEqual(['A0', 'A1', 'B1'])
    expect($('.srlv button.on').dataset.arg).toBe('A0')
  })

  it('ползунок под пальцем — фоновые перерисовки ждут, пока его отпустят', async () => {
    let done
    mount({ ensureSample: vi.fn(() => new Promise((r) => (done = r))) })
    click('.srtexts button[data-arg="b"]')
    const slider = $('input[data-act="slide"]')
    slider.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    done({ status: 'ready', sample: { url: 'https://f/b.mp3', words: [['Good', 0, 0.3]], wpm: 150 } })
    await flush()
    expect($('input[data-act="slide"]')).toBe(slider) // образец доехал, но экран не перерисован
    document.dispatchEvent(new Event('pointerup'))
    expect($('input[data-act="slide"]')).not.toBe(slider)
    expect($('[data-act="listen"]').disabled).toBe(false)
  })

  it('ползунок: подписи на ходу без перерисовки, отпустил — 0,1x и пересчёт', () => {
    mount()
    const slider = $('input[data-act="slide"]')
    expect([slider.min, slider.max, slider.step]).toEqual(['0.5', '3', '0.1'])
    slider.value = '1.3'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect($('input[data-act="slide"]')).toBe(slider) // экран не перерисован — перетаскивание не сбито
    expect($('#srspdv').textContent).toBe('1,3x')
    expect($('#srspdi').textContent).toContain('195 сл/мин')
    expect($('.srspd button.on')).toBeNull()
    slider.value = '2'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    slider.dispatchEvent(new Event('change', { bubbles: true }))
    expect($('.srspd button.on').dataset.arg).toBe('2')
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
    expect($('[data-act="listen"]').textContent).toContain('Послушать образец · 1x')
    // v1.2: темп образца больше не основа 1x — подпись всегда от 150 сл/мин.
    expect(text()).toContain('150 сл/мин')
  })

  it('синтеза на стенде нет — «Образец недоступен»', async () => {
    mount({ ensureSample: vi.fn(async () => ({ status: 'unavailable' })) })
    click('.srtexts button[data-arg="b"]')
    await flush()
    expect($('[data-act="listen"]').disabled).toBe(true)
    expect($('[data-act="listen"]').textContent).toContain('Образец недоступен')
  })

  it('всегда в 1x при любой скорости, подсветка — по времени записи', () => {
    mount()
    click('.srspd button[data-arg="1.5"]')
    click('[data-act="listen"]')
    expect(env.cfg.playSample).toHaveBeenCalledWith('https://f/a.mp3', 1, expect.any(Object))
    expect($$('#srlist span')).toHaveLength(11)
    env.handlers.onTime(1.6) // четвёртое слово (name) начинается на 1.5 с
    expect($('#srl3').classList.contains('on')).toBe(true)
    expect($$('#srlist span.done').map((s) => s.textContent)).toEqual(['Hello', 'everyone', 'my'])
    click('[data-act="listen"]')
    expect(env.cfg.stopSample).toHaveBeenCalled()
    expect($('#srlist')).toBeNull()
  })

  it('сначала сигнал сцены, потом голос; смена скорости образец не прерывает', () => {
    mount({ ambience: fakeAmbience({ cue: 1.2 }) })
    click('[data-act="listen"]')
    expect(env.cfg.unlockSample).toHaveBeenCalled() // элемент озвучки будится в клике — голос пойдёт таймером
    expect(env.amb.start).toHaveBeenCalledWith('airport')
    expect(env.cfg.playSample).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1199)
    expect(env.cfg.playSample).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(env.cfg.playSample).toHaveBeenCalledWith('https://f/a.mp3', 1, expect.any(Object))
    env.handlers.onTime(1.6)
    expect($('#srl3').classList.contains('on')).toBe(true)
    click('.srspd button[data-arg="2"]')
    expect(env.cfg.stopSample).not.toHaveBeenCalled()
    // список перерисован — подсветка возвращается следующим кадром звука, а не следующим словом
    env.handlers.onTime(1.7)
    expect($('#srl3').classList.contains('on')).toBe(true)
    env.handlers.onEnd('ended')
    expect(env.amb.stop).toHaveBeenLastCalledWith(1.2)
  })

  it('фон выключен — образец без сцены и без ожидания сигнала', () => {
    mount({ ambience: fakeAmbience({ cue: 1.2 }) })
    click('[data-act="bgToggle"]')
    expect($('.srbg').classList.contains('off')).toBe(true)
    click('[data-act="listen"]')
    expect(env.amb.start).not.toHaveBeenCalled()
    expect(env.cfg.playSample).toHaveBeenCalled()
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

  it('v1.2: сигнал сцены до отсчёта, запись с фоном — в плеер, на распознавание — чистый голос', async () => {
    const amb = fakeAmbience({ cue: 1.5 })
    const take = new Blob(['OggS'], { type: 'audio/webm;codecs=opus' })
    let mixWith = null
    mount({
      ambience: amb,
      openRecorder: vi.fn(async (o) => {
        mixWith = o.mixWith
        return env.recorder
      }),
    })
    env.recorder.start = vi.fn(() => mixWith({ id: 'mic' }))
    env.recorder.take = vi.fn(async () => take)
    click('.srspd button[data-arg="1.5"]')
    click('[data-act="begin"]')
    expect(amb.wake).toHaveBeenCalled() // в клике: сигнал зазвучит уже после ответа про микрофон
    await flush()
    expect(amb.start).toHaveBeenCalledWith('airport')
    expect($('.tele-top b').textContent).toBe('👋 Знакомство · 1,5x')
    expect($('#telecount').textContent).toBe('👋') // во время сигнала — значок сцены, а не «3»
    vi.advanceTimersByTime(1500 + 2399)
    expect(env.recorder.start).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(env.recorder.start).toHaveBeenCalledOnce()
    expect(amb.mixer).toHaveBeenCalledWith({ id: 'mic' }, true)
    expect(amb.route).toHaveBeenCalledWith(amb.mix.bus)
    // Выключить фон посреди записи: перерисовки нет, сведение глохнет, сцена останавливается.
    const tele = $('#teletext')
    click('[data-act="bgToggle"]')
    expect($('#teletext')).toBe(tele)
    expect(amb.mix.setOn).toHaveBeenLastCalledWith(false)
    expect(amb.stop).toHaveBeenLastCalledWith(0.3)
    click('[data-act="bgToggle"]')
    expect(amb.mix.setOn).toHaveBeenLastCalledWith(true)
    expect(amb.start).toHaveBeenCalledTimes(2)
    expect(amb.start).toHaveBeenLastCalledWith('airport')
    vi.advanceTimersByTime(3000)
    const routedBeforeStop = amb.route.mock.calls.length
    click('[data-act="stop"]')
    // шина ещё подключена: хвост записи дописывается вместе с затухающим фоном
    expect(amb.route.mock.calls.length).toBe(routedBeforeStop)
    await flush()
    await flush()
    expect(amb.route).toHaveBeenLastCalledWith(null)
    expect(env.cfg.transcribe.mock.calls[0][0].type).toBe('audio/wav')
    expect(URL.createObjectURL).toHaveBeenCalledWith(take)
    expect($('a[download]').getAttribute('download')).toMatch(/^speed-a-\d{4}-\d{2}-\d{2}\.webm$/)
    expect(text()).toContain('В записи твой голос и фон ситуации')
    expect(env.cfg.submitAttempt.mock.calls[0][0].speed).toBe(1.5)
  })

  it('текст без сцены (v1.1 до переимпорта) — одна дорожка, без подписи про фон', async () => {
    const amb = fakeAmbience({ cue: 1.5 })
    mount({ ambience: amb, initialLevel: 'B1' })
    click('.srcat button[data-arg="other"]')
    expect($('.srbg')).toBeNull()
    await record()
    expect(env.cfg.openRecorder.mock.calls[0][0].mixWith).toBeNull()
    expect(amb.start).not.toHaveBeenCalled()
    expect(text()).not.toContain('фон ситуации')
  })

  it('демо: выключенный фон включается обратно', async () => {
    const amb = fakeAmbience({ cue: 0 })
    mount({ ambience: amb })
    click('[data-act="demo"]')
    await flush()
    expect(amb.start).toHaveBeenCalledTimes(1)
    click('[data-act="bgToggle"]')
    click('[data-act="bgToggle"]')
    expect(amb.start).toHaveBeenCalledTimes(2)
  })

  it('скорость с ползунка уходит на бэкенд как есть (1,3x), а не ближайшей кнопкой', async () => {
    mount()
    const slider = $('input[data-act="slide"]')
    slider.value = '1.3'
    slider.dispatchEvent(new Event('change', { bubbles: true }))
    await record()
    expect(env.cfg.submitAttempt.mock.calls[0][0].speed).toBe(1.3)
    expect(text()).toContain('скорость 1,3x (195 сл/мин)')
  })

  it('фон: послушать 7 с, громкость, уход с экрана гасит контекст', () => {
    mount()
    click('[data-act="bgPreview"]')
    expect(env.amb.start).toHaveBeenCalledWith('airport', expect.objectContaining({ preview: 7 }))
    expect($('[data-act="bgPreview"]').textContent).toContain('Стоп')
    const vol0 = $('input[data-act="vol"]')
    env.amb.now = null
    env.amb.start.mock.calls[0][1].onPreviewEnd()
    // конец «послушать» — только кнопка: ползунок громкости тот же элемент
    expect($('[data-act="bgPreview"]').textContent).toContain('Послушать фон')
    expect($('input[data-act="vol"]')).toBe(vol0)
    const vol = $('input[data-act="vol"]')
    vol.value = '80'
    vol.dispatchEvent(new Event('input', { bubbles: true }))
    expect(env.amb.setVolume).toHaveBeenCalledWith(80)
    click('.srtexts button[data-arg="b"]')
    expect(env.amb.stop).toHaveBeenCalled() // другая ситуация — «послушать» прежней гаснет
    expect(text()).toContain('Фон: Салон самолёта')
    api.destroy()
    api = null
    expect(env.amb.close).toHaveBeenCalled()
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
