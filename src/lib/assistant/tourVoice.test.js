// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTourVoice, stepPhrases } from './tourVoice.js'

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
