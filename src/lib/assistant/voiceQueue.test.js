// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVoiceQueue } from './voiceQueue.js'

// Даём отработать цепочкам промисов (fetch → blob → play).
const settle = async (n = 6) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}

describe('очередь озвучки', () => {
  let played, fetchMock, play
  beforeEach(() => {
    played = []
    let n = 0
    URL.createObjectURL = vi.fn(() => `blob:${++n}`)
    URL.revokeObjectURL = vi.fn()
    fetchMock = vi.fn(async () => new Response(new Blob([new Uint8Array([1])]), { status: 200 }))
    // «Звук»: стартует сразу, кончается по команде теста (play.finish).
    play = vi.fn((src, { onStart, onEnd, onCancel }) => {
      played.push(src)
      onStart?.()
      play.finish = () => onEnd('ended')
      play.interrupt = () => onEnd('stopped')
      play.cancel = onCancel
      return true
    })
  })

  const queue = (extra = {}) =>
    createVoiceQueue({ token: 't', lang: 'ru', fetchImpl: fetchMock, play, stopSound: vi.fn(), ...extra })

  it('играет фразы по порядку и готовит следующую, пока звучит текущая', async () => {
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая фраза.')
    q.say('Вторая фраза.')
    q.end()
    await settle()
    expect(played).toEqual(['blob:1'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/assistant/speak')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: 'Первая фраза.', lang: 'ru' })
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer t')
    play.finish()
    await settle()
    expect(played).toEqual(['blob:1', 'blob:2'])
    expect(onFinish).not.toHaveBeenCalled()
    play.finish()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 2, failed: 0 })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })

  it('фраза, пришедшая во время звучания, запрашивается сразу, а не после', async () => {
    const q = queue()
    q.say('Первая фраза.')
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    q.say('Вторая фраза.')
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(played).toEqual(['blob:1'])
  })

  it('не забегает вперёд больше чем на одну фразу', async () => {
    const q = queue()
    ;['Раз.', 'Два.', 'Три.', 'Четыре.'].forEach((t) => q.say(t))
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('язык — по буквам ответа, а не по интерфейсу: русский ответ в казахском интерфейсе читает Луна', async () => {
    const q = queue({ lang: 'kk' })
    q.say('Откройте раздел «Домашняя работа».')
    await settle()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lang).toBe('ru')
  })

  it('латиница без кириллицы — en', async () => {
    const q = queue({ lang: 'ru' })
    q.say('Open the Practice section.')
    await settle()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lang).toBe('en')
  })

  it('казахская первая фраза — весь ответ идёт с lang kk', async () => {
    const q = queue()
    q.say('Тәжірибе бөлімін ашыңыз.')
    q.say('Потом нажмите «Проверить».')
    await settle()
    expect(fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).lang)).toEqual(['kk', 'kk'])
  })

  it('фраза не синтезировалась — пропускается, очередь идёт дальше', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }))
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await settle()
    expect(played).toEqual(['blob:1'])
    play.finish()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 1, failed: 1 })
  })

  it('звук не начался (onFail) — тоже считается провалом', async () => {
    play = vi.fn((src, { onFail }) => {
      played.push(src)
      onFail('blocked')
      return true
    })
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая.')
    q.end()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 0, failed: 1 })
  })

  it('stop обрывает звук и всё, что ещё не прозвучало', async () => {
    const stopSound = vi.fn()
    const onFinish = vi.fn()
    const q = queue({ stopSound, onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await settle()
    q.stop()
    expect(stopSound).toHaveBeenCalled()
    expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(true)
    play.finish?.()
    await settle()
    expect(played).toEqual(['blob:1'])
    expect(onFinish).not.toHaveBeenCalled()
    q.say('Третья.')
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('чужой звук оборвал фразу (ученик нажал «послушать») — очередь замолкает и чужое не трогает', async () => {
    const stopSound = vi.fn()
    const onFinish = vi.fn()
    const q = queue({ stopSound, onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await settle()
    play.interrupt()
    await settle()
    expect(played).toEqual(['blob:1'])
    expect(stopSound).not.toHaveBeenCalled()
    expect(onFinish).not.toHaveBeenCalled()
    q.stop()
    expect(stopSound).not.toHaveBeenCalled()
  })

  it('чужой звук оборвал фразу до её старта — очередь не зависает, а замолкает', async () => {
    play = vi.fn((src, { onCancel }) => {
      played.push(src)
      play.cancel = onCancel
      return true
    })
    const stopSound = vi.fn()
    const q = queue({ stopSound })
    q.say('Первая.')
    q.say('Вторая.')
    await settle()
    play.cancel()
    await settle()
    expect(played).toEqual(['blob:1'])
    q.stop()
    expect(stopSound).not.toHaveBeenCalled()
  })

  it('stop до первой фразы чужую реплику не трогает', () => {
    const stopSound = vi.fn()
    queue({ stopSound }).stop()
    expect(stopSound).not.toHaveBeenCalled()
  })

  it('пустой ответ: end без фраз — onFinish с нулями', async () => {
    const onFinish = vi.fn()
    queue({ onFinish }).end()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 0, failed: 0 })
  })
})
