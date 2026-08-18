// Регрессия на жалобу «тест не слышит ответы длиннее 10–30 секунд». Причин
// было две: nginx рубил заливку по 1 МБ (это чинится на прокси), а внутри —
// фиксированные таймауты, из-за которых длинный ответ молча обрезался.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  recognitionBudgetMs,
  transcribeWav,
  transcribeWavFast,
  resetFastTranscriptionCache,
  assessAgainstReference,
} from './azure-pronunciation.js'
import { sonioxBudgetMs } from '../soniox-stt.js'

// Заглушка Speech SDK: настоящий уходит в сеть, а нам нужно проверить, что
// клапан-таймер снимается после ответа.
const recognizers = []
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  class SpeechRecognizer {
    constructor() {
      this.recognized = null
      this.canceled = null
      this.sessionStopped = null
      this.mode = null
      recognizers.push(this)
    }
    startContinuousRecognitionAsync(ok) {
      this.mode = 'continuous'
      ok?.()
    }
    stopContinuousRecognitionAsync(ok) {
      ok?.()
    }
    recognizeOnceAsync(ok) {
      this.mode = 'once'
      ok?.({
        reason: 3,
        text: 'short phrase',
        properties: { getProperty: () => '{}' },
      })
    }
    close() {}
  }
  return {
    SpeechConfig: { fromSubscription: () => ({ setProperty() {} }) },
    AudioStreamFormat: { getWaveFormatPCM: () => ({}) },
    AudioInputStream: { createPushStream: () => ({ write() {}, close() {} }) },
    AudioConfig: { fromStreamInput: () => ({}) },
    SpeechRecognizer,
    PronunciationAssessmentConfig: class {
      applyTo() {}
    },
    PronunciationAssessmentGradingSystem: { HundredMark: 1 },
    PronunciationAssessmentGranularity: { Phoneme: 3 },
    PronunciationAssessmentResult: {
      fromResult: () => ({
        pronunciationScore: 90,
        accuracyScore: 92,
        fluencyScore: 88,
        completenessScore: 100,
        prosodyScore: 85,
      }),
    },
    PropertyId: { SpeechServiceResponse_JsonResult: 'json' },
    ResultReason: { RecognizedSpeech: 3 },
    CancellationReason: { Error: 1, EndOfStream: 0 },
  }
})

// Минимальный валидный 16 кГц mono WAV нужной длительности.
function wavOf(seconds) {
  const bytes = Math.round(seconds * 32000)
  const buf = Buffer.alloc(44 + bytes)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(36 + bytes, 4)
  buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(16000, 24)
  buf.writeUInt32LE(32000, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(bytes, 40)
  return buf
}

describe('recognitionBudgetMs', () => {
  it('пятиминутному ответу даёт заведомо больше прежних 60 секунд', () => {
    expect(recognitionBudgetMs(300)).toBeGreaterThan(300_000)
  })
  it('растёт вместе с длиной аудио', () => {
    expect(recognitionBudgetMs(180)).toBeGreaterThan(recognitionBudgetMs(90))
  })
  it('короткому ответу оставляет запас на сетевые задержки', () => {
    expect(recognitionBudgetMs(5)).toBeGreaterThanOrEqual(45_000)
  })
  it('не растёт бесконечно', () => {
    expect(recognitionBudgetMs(100_000)).toBe(600_000)
  })
})

describe('sonioxBudgetMs', () => {
  it('пятиминутной записи даёт больше прежних фиксированных 25 секунд', () => {
    expect(sonioxBudgetMs(wavOf(300))).toBeGreaterThan(300_000)
  })
  it('короткой записи хватает запаса', () => {
    expect(sonioxBudgetMs(wavOf(3))).toBeGreaterThanOrEqual(30_000)
  })
})

describe('assessAgainstReference (Shadowing)', () => {
  // Замер на живом Azure: single-shot слушает ~30 с и молча обрывает остаток —
  // 58 с речи на эталон в 102 слова дали 57 слов и completeness 56 вместо 100.
  const KEY = process.env.AZURE_SPEECH_KEY
  const REGION = process.env.AZURE_SPEECH_REGION

  beforeEach(() => {
    recognizers.length = 0
    process.env.AZURE_SPEECH_KEY = 'test-key'
    process.env.AZURE_SPEECH_REGION = 'eastus'
  })
  afterEach(() => {
    if (KEY === undefined) delete process.env.AZURE_SPEECH_KEY
    else process.env.AZURE_SPEECH_KEY = KEY
    if (REGION === undefined) delete process.env.AZURE_SPEECH_REGION
    else process.env.AZURE_SPEECH_REGION = REGION
  })

  it('короткую фразу оценивает одним выстрелом — он быстрее', async () => {
    const res = await assessAgainstReference(wavOf(8), 'short phrase')
    expect(recognizers[0].mode).toBe('once')
    expect(res.completeness).toBe(100)
  })

  it('длинную фразу ведёт через continuous, иначе хвост уйдёт в Omission', async () => {
    const promise = assessAgainstReference(wavOf(40), 'long reference text')
    await vi.waitFor(() => expect(recognizers.length).toBe(1))
    const rec = recognizers[0]
    expect(rec.mode).toBe('continuous')
    rec.recognized(null, {
      result: { reason: 3, text: 'long reference text', properties: { getProperty: () => '{}' } },
    })
    rec.sessionStopped()
    const res = await promise
    expect(res.transcript).toBe('long reference text')
    expect(res.completeness).toBe(100)
  })

  it('на записи без речи отдаёт null — вызывающий подставит mock', async () => {
    const promise = assessAgainstReference(wavOf(40), 'long reference text')
    await vi.waitFor(() => expect(recognizers.length).toBe(1))
    recognizers[0].sessionStopped()
    await expect(promise).resolves.toBeNull()
  })
})

describe('transcribeWavFast', () => {
  const KEY = process.env.AZURE_SPEECH_KEY
  const REGION = process.env.AZURE_SPEECH_REGION

  beforeEach(() => {
    resetFastTranscriptionCache()
    process.env.AZURE_SPEECH_KEY = 'test-key'
    process.env.AZURE_SPEECH_REGION = 'eastus'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    if (KEY === undefined) delete process.env.AZURE_SPEECH_KEY
    else process.env.AZURE_SPEECH_KEY = KEY
    if (REGION === undefined) delete process.env.AZURE_SPEECH_REGION
    else process.env.AZURE_SPEECH_REGION = REGION
  })

  it('склеивает combinedPhrases в один транскрипт', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ combinedPhrases: [{ text: 'Hello there' }, { text: 'and more' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(transcribeWavFast(wavOf(300))).resolves.toBe('Hello there and more')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('https://eastus.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe')
  })

  it('в регионе без fast-режима отдаёт null и больше туда не ходит', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ code: 'InvalidRequest', message: 'Fast transcription is not supported in this region.' }),
          { status: 400 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    process.env.AZURE_SPEECH_REGION = 'centralus'
    await expect(transcribeWavFast(wavOf(30))).resolves.toBeNull()
    await expect(transcribeWavFast(wavOf(30))).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1) // второй раз — сразу в потоковый путь
  })

  it('на сетевой сбой отдаёт null, чтобы вызывающий ушёл в потоковый путь', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') }))
    await expect(transcribeWavFast(wavOf(10))).resolves.toBeNull()
  })

  it('успешно распознанный ответ не оставляет тикающий клапан', async () => {
    // Регрессия: таймер доживал до конца бюджета уже после отданного текста и
    // писал в лог «бюджет исчерпан», хотя всё распозналось.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 400 })))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      recognizers.length = 0
      const promise = transcribeWav(wavOf(300))
      await vi.waitFor(() => expect(recognizers.length).toBe(1))
      const rec = recognizers[0]
      rec.recognized(null, { result: { reason: 3, text: 'all good' } })
      rec.sessionStopped()
      await expect(promise).resolves.toBe('all good')
      vi.advanceTimersByTime(recognitionBudgetMs(300) + 1000)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      warn.mockRestore()
    }
  })

  it('без ключа не ходит в сеть', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    delete process.env.AZURE_SPEECH_KEY
    await expect(transcribeWavFast(wavOf(10))).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
