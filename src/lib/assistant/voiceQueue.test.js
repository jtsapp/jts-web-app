// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LOOKAHEAD, createVoiceQueue, phraseLang } from './voiceQueue.js'
import { PERSONAS } from './persona.js'

// Даём отработать цепочкам промисов (fetch → blob → play).
const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}
const isStream = (src) => src.startsWith('/api/tts?')

describe('язык фразы', () => {
  it('казахские буквы — kk, кириллица — ru, иначе en', () => {
    expect(phraseLang('Тәжірибе бөлімін ашыңыз.')).toBe('kk')
    expect(phraseLang('Откройте «Практику».')).toBe('ru')
    expect(phraseLang('Open the Practice section.')).toBe('en')
  })

  // Первая реплика начинается с имени ученика: казахское имя не делает русский ответ казахским.
  it('казахское имя в русской фразе — всё ещё ru, голосом Луны', () => {
    expect(phraseLang('Айгерім, вы на Главной, и у вас 14 слов ждут повторения.')).toBe('ru')
    expect(phraseLang('Айгерім Нұрланқызы, вы на Главной, и у вас домашка со сроком 17 октября.')).toBe('ru')
  })

  it('казахская фраза — kk, даже короткая и с русским словом', () => {
    expect(phraseLang('Айгерім, сіз Басты бетте, және сізде үй тапсырмасы бар.')).toBe('kk')
    expect(phraseLang('Сәлеметсіз бе!')).toBe('kk')
    expect(phraseLang('Мерзімі 17 қазан, сдавать керек.')).toBe('kk')
  })
})

describe('очередь озвучки', () => {
  let played, fetchMock, play
  beforeEach(() => {
    played = []
    let n = 0
    URL.createObjectURL = vi.fn(() => `blob:${++n}`)
    URL.revokeObjectURL = vi.fn()
    fetchMock = vi.fn(async () => new Response(new Blob([new Uint8Array([1])]), { status: 200 }))
    // «Звук»: стартует сразу, кончается по команде теста.
    play = vi.fn((src, { onStart, onEnd, onCancel, onFail }) => {
      played.push(src)
      onStart?.()
      play.finish = () => onEnd('ended')
      play.interrupt = () => onEnd('stopped')
      play.cancel = onCancel
      play.fail = onFail
      return true
    })
  })

  const queue = (extra = {}) => createVoiceQueue({ token: 't', fetchImpl: fetchMock, play, stopSound: vi.fn(), ...extra })
  const bodies = () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body))

  it('играет фразы голосом Луны по порядку', async () => {
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая фраза.')
    q.say('Вторая фраза.')
    q.end()
    await settle()
    expect(played).toEqual(['blob:1'])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/assistant/speak')
    expect(bodies()[0]).toEqual({ text: 'Первая фраза.', lang: 'ru', persona: 'luna' })
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

  // Поток: роут отвечает адресом билета, и <audio> играет его сам с первых
  // байт — без blob и без ожидания записи целиком.
  it('адрес потока играется как есть, без blob', async () => {
    let n = 0
    fetchMock = vi.fn(async () => Response.json({ url: `/api/assistant/speak?s=id-${++n}` }))
    const q = queue()
    q.say('Первая фраза.')
    q.say('Вторая фраза.')
    q.end()
    await settle()
    expect(played).toEqual(['/api/assistant/speak?s=id-1'])
    play.finish()
    await settle()
    expect(played).toEqual(['/api/assistant/speak?s=id-1', '/api/assistant/speak?s=id-2'])
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('чужой адрес в ответе роута не играется — запасной голос', async () => {
    fetchMock = vi.fn(async () => Response.json({ url: 'https://evil.example/x.mp3' }))
    const q = queue()
    q.say('Фраза.')
    await settle()
    expect(played).toHaveLength(1)
    expect(isStream(played[0])).toBe(true)
  })

  // Синтез Gemini медленнее, чем кажется (190 символов — 8–10 с): с одной
  // фразой вперёд длинная фраза после короткой не успевала, и ответ замолкал.
  it(`готовит ${LOOKAHEAD} фразы вперёд, не больше`, async () => {
    const q = queue()
    ;['Раз.', 'Два.', 'Три.', 'Четыре.', 'Пять.'].forEach((t) => q.say(t))
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1 + LOOKAHEAD)
    play.finish()
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2 + LOOKAHEAD)
  })

  it('фраза, пришедшая во время звучания, запрашивается сразу', async () => {
    const q = queue()
    q.say('Первая фраза.')
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    q.say('Вторая фраза.')
    q.say('Третья фраза.')
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(played).toEqual(['blob:1'])
  })

  it('язык — по буквам ответа, а не по интерфейсу', async () => {
    const q = queue({ lang: 'kk' })
    q.say('Откройте раздел «Домашняя работа».')
    await settle()
    expect(bodies()[0].lang).toBe('ru')
  })

  it('казахский ответ — сразу потоком /api/tts голосом Grace, без Gemini', async () => {
    const q = queue()
    q.say('Тәжірибе бөлімін ашыңыз.')
    q.say('Потом нажмите «Проверить».')
    await settle()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(played).toHaveLength(1)
    const url = new URL(played[0], 'http://x')
    expect(url.pathname).toBe('/api/tts')
    expect(url.searchParams.get('v')).toBe('Grace')
    expect(url.searchParams.get('l')).toBe('kk')
    expect(url.searchParams.get('t')).toBe('Тәжірибе бөлімін ашыңыз.')
    play.finish()
    await settle()
    // весь ответ — тем же голосом, хотя вторая фраза без казахских букв
    expect(new URL(played[1], 'http://x').searchParams.get('l')).toBe('kk')
  })

  // Казахский интерфейс — помощник Айзере (persona.js): её клон ElevenLabs говорит
  // по-казахски сам, обходного «сразу потоком» у неё нет.
  it('Айзере: казахская фраза — её голосом через /api/assistant/speak', async () => {
    const q = queue({ persona: PERSONAS.aizere })
    q.say('Тәжірибе бөлімін ашыңыз.')
    await settle()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/assistant/speak')
    expect(bodies()[0]).toEqual({ text: 'Тәжірибе бөлімін ашыңыз.', lang: 'kk', persona: 'aizere' })
    expect(played).toEqual(['blob:1'])
  })

  it('Айзере: синтез не ответил — запасной поток её голосом Maya, а не Grace Луны', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }))
    const q = queue({ persona: PERSONAS.aizere })
    q.say('Тәжірибе бөлімін ашыңыз.')
    await settle()
    expect(isStream(played[0])).toBe(true)
    expect(new URL(played[0], 'http://x').searchParams.get('v')).toBe('Maya')
  })

  it('Gemini не ответил — та же фраза потоком /api/tts, а не тишина', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }))
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая фраза.')
    q.say('Вторая фраза.')
    q.end()
    await settle()
    expect(isStream(played[0])).toBe(true)
    expect(new URL(played[0], 'http://x').searchParams.get('l')).toBe('ru')
    play.finish()
    await settle()
    expect(played[1]).toBe('blob:1')
    play.finish()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 2, failed: 0 })
  })

  it('сеть упала — тоже запасной поток', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const q = queue()
    q.say('Первая фраза.')
    await settle()
    expect(isStream(played[0])).toBe(true)
  })

  it('не зазвучал и запасной — фраза пропущена, очередь идёт дальше', async () => {
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await settle()
    play.fail('error')
    await settle()
    expect(played).toEqual(['blob:1', 'blob:2'])
    play.finish()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 1, failed: 1 })
  })

  it('чужой звук оборвал фразу («послушать» у слова) — очередь замолкает и чужое не трогает', async () => {
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

  it('оборванный stop запрос не уходит в запасной поток', async () => {
    let reject
    fetchMock.mockImplementationOnce((url, init) => new Promise((_, rej) => {
      reject = rej
      init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
    }))
    const q = queue()
    q.say('Первая.')
    await settle()
    q.stop()
    await settle()
    expect(played).toEqual([])
    expect(reject).toBeTypeOf('function')
  })

  it('stop до первой фразы чужую реплику не трогает', () => {
    const stopSound = vi.fn()
    queue({ stopSound }).stop()
    expect(stopSound).not.toHaveBeenCalled()
  })

  // Текст ответа на экране идёт вслед за голосом: виджет показывает фразу, когда
  // она зазвучала, а пропущенную (сбой) — сразу, чтобы текст не застрял.
  it('onPhrase — номер фразы, когда она зазвучала или пропущена', async () => {
    const onPhrase = vi.fn()
    const q = queue({ onPhrase })
    q.say('Первая.')
    q.say('Вторая.')
    q.say('Третья.')
    q.end()
    await settle()
    expect(onPhrase.mock.calls).toEqual([[0]])
    play.finish()
    await settle()
    expect(onPhrase.mock.calls).toEqual([[0], [1]])
    play.fail('error')
    await settle()
    expect(onPhrase.mock.calls).toEqual([[0], [1], [2]])
  })

  it('onPhrase ждёт настоящего звука, а не запроса синтеза', async () => {
    let start
    play = vi.fn((src, { onStart }) => {
      played.push(src)
      start = onStart
      return true
    })
    const onPhrase = vi.fn()
    const q = queue({ onPhrase })
    q.say('Первая.')
    await settle()
    expect(played).toHaveLength(1)
    expect(onPhrase).not.toHaveBeenCalled()
    start()
    expect(onPhrase).toHaveBeenCalledWith(0)
  })

  // По onSound окно меряет, через сколько Луна заговорила (voiceTiming.js):
  // пропущенная фраза звуком не считается.
  it('onSound — один раз, на первой фразе, что зазвучала по-настоящему', async () => {
    const starts = []
    play = vi.fn((src, handlers) => {
      played.push(src)
      starts.push(handlers)
      return true
    })
    const onSound = vi.fn()
    const q = queue({ onSound })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await settle()
    starts[0].onFail('error')
    await settle()
    expect(onSound).not.toHaveBeenCalled()
    starts.at(-1).onStart()
    expect(onSound).toHaveBeenCalledWith(1)
    starts.at(-1).onStart()
    expect(onSound).toHaveBeenCalledTimes(1)
  })

  it('чужой звук оборвал фразу — onInterrupt (виджет покажет весь текст), onFinish — нет', async () => {
    const onInterrupt = vi.fn()
    const onFinish = vi.fn()
    const q = queue({ onInterrupt, onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await settle()
    play.interrupt()
    await settle()
    expect(onInterrupt).toHaveBeenCalledTimes(1)
    expect(onFinish).not.toHaveBeenCalled()
    // Свой stop — не «чужой звук».
    const own = vi.fn()
    const q2 = queue({ onInterrupt: own })
    q2.say('Раз.')
    await settle()
    q2.stop()
    expect(own).not.toHaveBeenCalled()
  })

  it('пустой ответ: end без фраз — onFinish с нулями', async () => {
    const onFinish = vi.fn()
    queue({ onFinish }).end()
    await settle()
    expect(onFinish).toHaveBeenCalledWith({ played: 0, failed: 0 })
  })
})
