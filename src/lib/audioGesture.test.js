// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  speakListeningAudio,
  speakTutorVoice,
  playTutorSample,
  cancelSpeech,
} from './ielts-audio.js'

// Контракт кнопки «озвучить» на iOS: разрешение играть звук выдаётся ЖЕСТУ и
// сгорает к концу задачи, в которой жест обработан. Любой await между нажатием
// и play() (сходить в сеть, получить blob) означает, что play() зовётся уже в
// следующей задаче — Safari его отклоняет, на iPad кнопка молчит, а вызывающий
// код при этом считает, что всё прозвучало.
//
// Отсюда проверяемое утверждение: play() обязан быть позван СИНХРОННО с входом
// в функцию. Выражается это детерминированно и без таймеров — сеть подменяем
// промисом, который не резолвится никогда, и смотрим, играет ли уже звук.
//
// Образец правильного порядка в этом же файле — playTutorSample (последний
// тест): там Audio создаётся и играет без единого await перед play().

// Считаем ВЫЗОВЫ play(), а не созданные элементы: правка вправе переиспользовать
// один разблокированный элемент, и тогда реестр элементов ничего не скажет.
const plays = [] // каждый вызов play(), по порядку — элемент может быть общим
const spoken = [] // реплики, ушедшие в браузерный синтез

class FakeAudio {
  constructor(src = '') {
    this.src = src
    this.paused = true
    this.volume = 1
    this.playbackRate = 1
    this.onended = null
    this.onerror = null
  }

  // play() у настоящего элемента переводит его в «играет» сразу, а промис
  // резолвится позже; гонку «пауза отклоняет незавершённый play()» отдельно
  // разбирает tutorSample.test.js, здесь она только мешала бы.
  play() {
    this.paused = false
    plays.push(this)
    return Promise.resolve()
  }

  // Заглушки на случай, если реализация повесит обработчики событиями, а не
  // свойствами onended/onerror: тест не должен падать TypeError'ом не по делу.
  addEventListener() {}
  removeEventListener() {}

  pause() {
    this.paused = true
  }

  load() {}
}

class FakeUtterance {
  constructor(text) {
    this.text = text
  }
}

// Ответ сети под контролем теста: пока не позвали ok()/fail(), запрос висит.
function pendingFetch() {
  let settle
  const promise = new Promise((res) => {
    settle = res
  })
  return {
    fetch: vi.fn(() => promise),
    ok: (bytes = 'mp3-bytes') =>
      settle({ ok: true, status: 200, blob: async () => new Blob([bytes], { type: 'audio/mpeg' }) }),
    fail: (status = 500) => settle({ ok: false, status, blob: async () => new Blob([]) }),
  }
}

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', {
    // Настоящий браузер, когда синтез действительно заговорил, шлёт onstart —
    // именно по нему speakBrowser отличает речь от тишины. Фейк обязан вести
    // себя так же, иначе этот файл проверял бы не порядок вызовов, а ветку
    // «синтез не завёлся».
    speak: (u) => {
      spoken.push(u)
      u.onstart?.()
    },
    cancel: () => {},
  })
  // jsdom не реализует object-URL: без заглушки путь с blob падает не по делу.
  URL.createObjectURL = vi.fn((b) => `blob:jts/${b.size}`)
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  // Текущий звук — модульное состояние ielts-audio.js, оно переживает тест;
  // гасим его ДО обнуления реестров, иначе пауза попадёт в счёт следующего.
  cancelSpeech()
  plays.length = 0
  spoken.length = 0
})

afterEach(() => {
  delete URL.createObjectURL
  delete URL.revokeObjectURL
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('озвучка стартует в жесте, а не после сети', () => {
  it('listening: play() позван до того, как ответила сеть', () => {
    // Ответа не будет вообще — всё, что успело сыграть, сыграло синхронно.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    // Намеренно без await: это ровно то, что делает обработчик onClick.
    void speakListeningAudio('The train leaves at nine.')
    expect(plays).not.toHaveLength(0)
    // Синхронного play() мало: разблокировать можно только элемент С
    // источником — play() на пустом Audio браузер отклоняет (NotSupportedError)
    // ещё до старта, разрешение не выдаётся, и на iPad такая «починка» осталась
    // бы немой. Источником годится и тишина, лишь бы он был к моменту вызова.
    expect(plays[0].src).not.toBe('')
  })

  it('tutor tts: play() позван до того, как ответила сеть', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    void speakTutorVoice('luna', 'Tell me about your weekend.')
    expect(plays).not.toHaveLength(0)
    // Синхронного play() мало: разблокировать можно только элемент С
    // источником — play() на пустом Audio браузер отклоняет (NotSupportedError)
    // ещё до старта, разрешение не выдаётся, и на iPad такая «починка» осталась
    // бы немой. Источником годится и тишина, лишь бы он был к моменту вызова.
    expect(plays[0].src).not.toBe('')
  })

  it('пришедший mp3 играет в том же элементе, что разблокировал жест', async () => {
    const net = pendingFetch()
    vi.stubGlobal('fetch', net.fetch)
    const done = speakListeningAudio('The train leaves at nine.')
    net.ok()
    await expect(done).resolves.toBe('eleven')

    // Разрешение выдано КОНКРЕТНОМУ элементу: новый Audio() после await на iOS
    // снова немой, поэтому звучать обязан тот же самый.
    expect(new Set(plays).size).toBe(1)
    const el = plays[0]
    expect(el.src).toBe(URL.createObjectURL.mock.results[0].value)
    expect(el.paused).toBe(false)
  })

  it('сеть упала — читаем синтезом и не оставляем элемент играть пустоту', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await expect(speakListeningAudio('The train leaves at nine.')).resolves.toBe('fallback')
    expect(spoken.map((u) => u.text)).toEqual(['The train leaves at nine.'])
    expect(plays.every((a) => a.paused)).toBe(true)
  })

  it('сервер ответил ошибкой — тоже синтез, и элемент заглушен', async () => {
    const net = pendingFetch()
    vi.stubGlobal('fetch', net.fetch)
    const done = speakTutorVoice('spark', 'Describe your last holiday.')
    net.fail(502)
    await expect(done).resolves.toBe('fallback')
    expect(spoken.map((u) => u.text)).toEqual(['Describe your last holiday.'])
    expect(plays.every((a) => a.paused)).toBe(true)
  })

  it('пустой текст не трогает звук вовсе', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(speakListeningAudio('   ')).resolves.toBe('none')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(plays).toHaveLength(0)
  })

  it('playTutorSample остаётся образцом: play() без единого await перед ним', () => {
    void playTutorSample('luna')
    expect(plays).toHaveLength(1)
    expect(plays[0].src).toContain('/tutor/voice/luna.mp3')
  })
})
