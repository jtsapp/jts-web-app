// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TICKET_FRESH_MS, createTourVoice, stepPhrases } from './tourVoice.js'
import { PERSONAS } from './persona.js'

// Плеер подменён: «играет» до тех пор, пока тест не скажет end(), — так видно
// порядок фраз и что новая реплика обрывает прошлую.
function fakePlayer() {
  const log = []
  let cur = null
  const play = vi.fn((url, handlers) => {
    cur = { url, ...handlers }
    log.push(url)
    return true
  })
  const stopSound = vi.fn(() => {
    const c = cur
    cur = null
    c?.onEnd?.('stopped')
  })
  const end = () => {
    const c = cur
    cur = null
    c?.onEnd?.('ended')
  }
  return { play, stopSound, end, log, playing: () => cur?.url }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('голос тура', () => {
  let speakCalls
  let fetchImpl
  beforeEach(() => {
    speakCalls = []
    let n = 0
    globalThis.URL.createObjectURL = vi.fn(() => `blob:${++n}`)
    globalThis.URL.revokeObjectURL = vi.fn()
    fetchImpl = vi.fn(async (url, init) => {
      speakCalls.push(JSON.parse(init.body).text)
      return new Response(new Blob(['x']), { status: 200 })
    })
  })

  it('шаг — заголовок и текст отдельными фразами', () => {
    expect(stepPhrases({ title: 'Навыки', text: 'Четыре вкладки.' })).toEqual(['Навыки.', 'Четыре вкладки.'])
    expect(stepPhrases({ title: 'Что дальше?', text: '' })).toEqual(['Что дальше?'])
    expect(stepPhrases({ title: 'План 📅', text: { jsx: true } })).toEqual(['План.'])
    expect(stepPhrases(null)).toEqual([])
  })

  it('фразы звучат по порядку, а следующий шаг синтезируется заранее и не дважды', async () => {
    const p = fakePlayer()
    const v = createTourVoice({ token: 't', fetchImpl, play: p.play, stopSound: p.stopSound })
    v.say(['Навыки.', 'Четыре вкладки.'])
    v.prefetch(['Уровень.', 'Переключатель уровня.'])
    await tick()
    expect(speakCalls).toEqual(['Навыки.', 'Четыре вкладки.', 'Уровень.', 'Переключатель уровня.'])
    expect(p.log).toEqual(['blob:1'])
    p.end()
    await tick()
    expect(p.log).toEqual(['blob:1', 'blob:2'])
    p.end()
    await tick()

    // «Далее» — следующий шаг уже готов: в синтез второй раз не идём.
    v.say(['Уровень.', 'Переключатель уровня.'])
    await tick()
    expect(speakCalls).toHaveLength(4)
    expect(p.log.at(-1)).toBe('blob:3')
  })

  it('новый шаг обрывает недоговорённый прошлый — его хвост уже не звучит', async () => {
    const p = fakePlayer()
    const v = createTourVoice({ token: 't', fetchImpl, play: p.play, stopSound: p.stopSound })
    v.say(['Первый.', 'Длинный текст первого шага.'])
    await tick()
    v.say(['Второй.'])
    await tick()
    expect(p.stopSound).toHaveBeenCalledTimes(1)
    expect(p.log).toEqual(['blob:1', 'blob:3'])
    p.end()
    await tick()
    expect(p.log).toEqual(['blob:1', 'blob:3'])
  })

  it('чужой звук обрывает шаг: дальше по нему Луна молчит', async () => {
    const p = fakePlayer()
    const v = createTourVoice({ token: 't', fetchImpl, play: p.play, stopSound: p.stopSound })
    v.say(['Первый.', 'Текст.'])
    await tick()
    p.stopSound() // «послушать» у слова
    await tick()
    expect(p.log).toEqual(['blob:1'])
  })

  it('Gemini не ответил — запасной потоковый голос; казахский — сразу он', async () => {
    const p = fakePlayer()
    const failing = vi.fn(async () => new Response('no', { status: 502 }))
    const v = createTourVoice({ token: 't', fetchImpl: failing, play: p.play, stopSound: p.stopSound })
    v.say(['Навыки.'])
    await tick()
    expect(p.log[0]).toMatch(/^\/api\/tts\?/)
    expect(p.log[0]).toContain('v=Grace')
    p.end()
    await tick()
    v.say(['Дағдылар бөлімі.'])
    await tick()
    expect(failing).toHaveBeenCalledTimes(1)
    expect(p.log[1]).toMatch(/^\/api\/tts\?/)
  })

  it('тур Айзере: казахский шаг — её голосом, сбой — запасной Maya', async () => {
    const p = fakePlayer()
    const bodies = []
    const own = vi.fn(async (url, init) => {
      bodies.push(JSON.parse(init.body))
      return new Response(new Blob(['x']), { status: 200 })
    })
    const v = createTourVoice({ token: 't', persona: PERSONAS.aizere, fetchImpl: own, play: p.play, stopSound: p.stopSound })
    v.say(['Дағдылар бөлімі.'])
    await tick()
    expect(bodies[0]).toEqual({ text: 'Дағдылар бөлімі.', lang: 'kk', persona: 'aizere' })
    expect(p.log).toEqual(['blob:1'])
    p.end()

    const failing = vi.fn(async () => new Response('no', { status: 502 }))
    const w = createTourVoice({ token: 't', persona: PERSONAS.aizere, fetchImpl: failing, play: p.play, stopSound: p.stopSound })
    w.say(['Деңгей.'])
    await tick()
    expect(p.log.at(-1)).toContain('v=Maya')
  })

  // Билет сервера живёт пять минут: шаг, заготовленный заранее, на котором
  // ученик задержался дольше, просится заново — иначе <audio> получил бы 404.
  // Сам билет играется через MediaSource (streamSource.js), и её адрес
  // одноразовый: свой на каждое проигрывание, после — отпускается.
  it('поток: билет играется через MediaSource, протухший билет просится заново', async () => {
    class FakeMediaSource {
      static isTypeSupported = (mime) => mime === 'audio/mpeg'
      addEventListener() {}
    }
    window.MediaSource = FakeMediaSource
    try {
      let clock = 0
      let n = 0
      const tickets = vi.fn(async (url, init) => {
        speakCalls.push(JSON.parse(init.body))
        return Response.json({ url: `/api/assistant/speak?s=t${++n}` })
      })
      const p = fakePlayer()
      const v = createTourVoice({ token: 't', fetchImpl: tickets, play: p.play, stopSound: p.stopSound, now: () => clock })
      v.prefetch(['Уровень.'])
      await tick()
      expect(speakCalls[0]).toEqual({ text: 'Уровень.', lang: 'ru', persona: 'luna', stream: true })
      clock = TICKET_FRESH_MS - 1
      v.say(['Уровень.'])
      await tick()
      expect(p.log).toEqual(['blob:1'])
      expect(URL.createObjectURL.mock.calls[0][0]).toBeInstanceOf(FakeMediaSource)
      p.end()
      await tick()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
      clock += TICKET_FRESH_MS + 1
      v.say(['Уровень.'])
      await tick()
      expect(tickets).toHaveBeenCalledTimes(2)
      expect(p.log.at(-1)).toBe('blob:2')
    } finally {
      delete window.MediaSource
    }
  })

  it('stop не трогает чужой звук, dispose отпускает записи', async () => {
    const p = fakePlayer()
    const v = createTourVoice({ token: 't', fetchImpl, play: p.play, stopSound: p.stopSound })
    v.stop()
    expect(p.stopSound).not.toHaveBeenCalled()
    v.say(['Навыки.'])
    await tick()
    v.dispose()
    expect(p.stopSound).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    v.say(['Ещё.'])
    await tick()
    expect(p.log).toEqual(['blob:1'])
  })
})
