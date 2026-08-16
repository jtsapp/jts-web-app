// Azure Speech Pronunciation Assessment — server-only. Grades a spoken sample
// (the IELTS Part 2 monologue) for accuracy / fluency / completeness / prosody
// and returns the transcript Azure recognized. Long audio (2 min) needs
// CONTINUOUS recognition — recognizeOnce caps at ~15s — so we accumulate the
// per-utterance results and word-weight them into one aggregate.
//
// Configured via AZURE_SPEECH_KEY + AZURE_SPEECH_REGION. Absent → the caller
// falls back to a mock pronunciation score, so Speaking still works without
// Azure (just without a real pronunciation band).

export function isAzureSpeechConfigured() {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
}

// Parse a 16-bit PCM WAV: return the raw PCM samples and the sample rate. We
// locate the "data" sub-chunk rather than assuming a 44-byte header (some
// encoders insert extra chunks).
export function extractPcm(wav) {
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') return null
  let sampleRate = 16000
  let offset = 12 // past "RIFF"<size>"WAVE"
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4)
    const size = wav.readUInt32LE(offset + 4)
    const body = offset + 8
    if (id === 'fmt ') {
      sampleRate = wav.readUInt32LE(body + 4)
    } else if (id === 'data') {
      return { pcm: wav.subarray(body, body + size), sampleRate }
    }
    offset = body + size + (size % 2) // chunks are word-aligned
  }
  return null
}

// Map Azure PronScore (0–100) to an IELTS band (0–9, 0.5 steps).
export function pronScoreToBand(score0100) {
  const band = (Math.max(0, Math.min(100, score0100)) / 100) * 9
  return Math.max(0, Math.min(9, Math.round(band * 2) / 2))
}

// Run continuous pronunciation assessment over the whole clip. Resolves with
// null when Azure isn't configured or nothing usable was recognized (caller
// mocks). Never throws for expected failure — logs and returns null.
export async function assessPronunciation(wav) {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return null

  const parsed = extractPcm(wav)
  if (!parsed || parsed.pcm.length === 0) return null

  const durationSec = pcmDurationSec(parsed)
  const budgetMs = recognitionBudgetMs(durationSec)

  let sdk
  try {
    sdk = await import('microsoft-cognitiveservices-speech-sdk')
  } catch (e) {
    console.error('[azure-pa] SDK import failed', e)
    return null
  }

  return new Promise((resolve) => {
    let settled = false
    const done = (v) => {
      if (settled) return
      settled = true
      resolve(v)
    }

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
      speechConfig.speechRecognitionLanguage = 'en-US'
      applyNoThrottle(speechConfig)

      const format = sdk.AudioStreamFormat.getWaveFormatPCM(parsed.sampleRate, 16, 1)
      const pushStream = sdk.AudioInputStream.createPushStream(format)
      // The push stream wants an ArrayBuffer; hand it the PCM bytes then close.
      pushStream.write(
        parsed.pcm.buffer.slice(
          parsed.pcm.byteOffset,
          parsed.pcm.byteOffset + parsed.pcm.byteLength,
        ),
      )
      pushStream.close()
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

      const paConfig = new sdk.PronunciationAssessmentConfig(
        '',
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true, // enableMiscue
      )
      paConfig.enableProsodyAssessment = true

      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
      paConfig.applyTo(recognizer)

      // Word-weighted accumulators across all recognized utterances.
      let words = 0
      let acc = 0
      let flu = 0
      let comp = 0
      let pros = 0
      let pron = 0
      const texts = []

      recognizer.recognized = (_s, e) => {
        if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return
        const text = e.result.text?.trim()
        if (!text) return
        const pa = sdk.PronunciationAssessmentResult.fromResult(e.result)
        const w = Math.max(1, text.split(/\s+/).length)
        words += w
        acc += pa.accuracyScore * w
        flu += pa.fluencyScore * w
        comp += pa.completenessScore * w
        pros += (pa.prosodyScore ?? pa.accuracyScore) * w
        pron += pa.pronunciationScore * w
        texts.push(text)
      }

      // Снимаем клапан на нормальном завершении — иначе таймер живёт до конца
      // бюджета уже после отданного ответа и врёт в лог.
      let valve = null
      const finish = () => {
        if (valve) clearTimeout(valve)
        valve = null
        try {
          recognizer.close()
        } catch {
          /* ignore */
        }
        if (words === 0) return done(null)
        const overall = pron / words
        done({
          accuracy: Math.round(acc / words),
          fluency: Math.round(flu / words),
          completeness: Math.round(comp / words),
          prosody: Math.round(pros / words),
          overall: Math.round(overall),
          mock: false,
          transcript: texts.join(' '),
        })
      }

      recognizer.canceled = (_s, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          console.error('[azure-pa] canceled', e.errorDetails)
        }
        finish()
      }
      recognizer.sessionStopped = () => finish()

      recognizer.startContinuousRecognitionAsync(
        () => {
          /* started */
        },
        (err) => {
          console.error('[azure-pa] start failed', err)
          done(null)
        },
      )

      // Клапан от зависшего соединения. Раньше тут стояли фиксированные 60 с
      // «клип идёт быстрее реального времени» — неправда: SDK шлёт аудио в
      // ×2 к реалтайму, и монолог Part 2 на 2 минуты молча терял хвост вместе
      // с completeness-оценкой. Бюджет считаем от длины аудио.
      valve = setTimeout(() => {
        valve = null
        console.warn(
          `[azure-pa] бюджет ${Math.round(budgetMs / 1000)}с исчерпан на ${Math.round(durationSec)}с аудио — оценка может быть неполной`,
        )
        recognizer.stopContinuousRecognitionAsync(finish, finish)
      }, budgetMs)
    } catch (e) {
      console.error('[azure-pa] setup failed', e)
      done(null)
    }
  })
}

// Сколько ждать потоковое распознавание. НЕ константа: SDK шлёт аудио в сервис
// со скоростью примерно ×2 от реального времени (после первых 5 с включается
// троттлинг, см. ServiceRecognizerBase.sendAudio), поэтому ответ на 3 минуты
// физически не успевает уложиться в фиксированные 60 с — раньше такой ответ
// молча обрезался, и уровень ставился по половине речи. Считаем бюджет от
// длины аудио с запасом: замер на 90 с речи — 35 с с выключенным троттлингом.
export function recognitionBudgetMs(durationSec) {
  return Math.min(600_000, 45_000 + Math.max(0, durationSec) * 1000)
}

// Троттлинг отправки отключаем: аудио уже целиком в памяти, пропускная
// способность канала до Azure на порядок больше, а «реалтайм-темп» тут лишний.
// 90 с речи: 56 с с троттлингом против 35 с без него (замер).
const NO_THROTTLE_MS = '3600000'

function applyNoThrottle(speechConfig) {
  speechConfig.setProperty('SPEECH-TransmitLengthBeforThrottleMs', NO_THROTTLE_MS)
}

function pcmDurationSec(parsed) {
  return parsed.pcm.length / 2 / (parsed.sampleRate || 16000)
}

// Fast Transcription (REST, api-version 2024-11-15): весь файл одним запросом,
// без потокового темпа — пятиминутный ответ распознаётся за секунды. Доступна
// не во всех регионах: centralus отвечает 400 «Fast transcription is not
// supported in this region», eastus — поддерживает. Регион ключа меняется без
// нашего участия, поэтому не хардкодим, а пробуем и запоминаем ответ, чтобы не
// платить лишним запросом на каждый ответ ученика.
let fastUnsupportedFor = null

// Только для тестов: сбросить кеш «регион не умеет fast».
export function resetFastTranscriptionCache() {
  fastUnsupportedFor = null
}

// Возвращает распознанный текст, либо null — «этим путём нельзя, иди в
// потоковый». Пустая строка означает «сработало, но речи не нашлось».
export async function transcribeWavFast(wav, { locale = 'en-US', timeoutMs = 120_000 } = {}) {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return null
  if (fastUnsupportedFor === region) return null

  const form = new FormData()
  form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'audio.wav')
  form.append('definition', JSON.stringify({ locales: [locale] }))

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(
      `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`,
      {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key },
        body: form,
        signal: ctrl.signal,
      },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      // 404 — у ресурса нет этого эндпоинта, 400 «not supported in this region»
      // — регион не тот. И то и другое не лечится повтором: гасим путь до
      // смены региона (перезапуск процесса при деплое сбросит кеш).
      if (res.status === 404 || /not supported in this region/i.test(body)) {
        fastUnsupportedFor = region
        console.warn(`[azure-stt-fast] недоступна в регионе ${region}, уходим в потоковый путь`)
      } else {
        console.error('[azure-stt-fast] HTTP', res.status, body.slice(0, 300))
      }
      return null
    }
    const data = await res.json()
    const phrases = Array.isArray(data?.combinedPhrases) ? data.combinedPhrases : []
    return phrases
      .map((p) => (p?.text || '').trim())
      .filter(Boolean)
      .join(' ')
  } catch (e) {
    console.error('[azure-stt-fast] failed', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Plain speech-to-text over a short clip (the Speaking Part 1 answers). Azure
// replaces felix's Gemini STT here — this app has no Gemini key, and the Speech
// SDK is already a dependency for the pronunciation path. Returns "" when
// unconfigured or nothing was recognized; the caller advances either way.
export async function transcribeWav(wav) {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return ''

  const parsed = extractPcm(wav)
  if (!parsed || parsed.pcm.length === 0) return ''

  const durationSec = pcmDurationSec(parsed)
  const budgetMs = recognitionBudgetMs(durationSec)

  let sdk
  try {
    sdk = await import('microsoft-cognitiveservices-speech-sdk')
  } catch (e) {
    console.error('[azure-stt] SDK import failed', e)
    return ''
  }

  return new Promise((resolve) => {
    let settled = false
    const done = (v) => {
      if (settled) return
      settled = true
      resolve(v)
    }
    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
      speechConfig.speechRecognitionLanguage = 'en-US'
      const format = sdk.AudioStreamFormat.getWaveFormatPCM(parsed.sampleRate, 16, 1)
      const pushStream = sdk.AudioInputStream.createPushStream(format)
      pushStream.write(
        parsed.pcm.buffer.slice(
          parsed.pcm.byteOffset,
          parsed.pcm.byteOffset + parsed.pcm.byteLength,
        ),
      )
      pushStream.close()
      applyNoThrottle(speechConfig)
      const recognizer = new sdk.SpeechRecognizer(
        speechConfig,
        sdk.AudioConfig.fromStreamInput(pushStream),
      )

      // Continuous, not recognizeOnce: a Part 1 answer can run past the ~15s
      // single-shot cap, and we want every utterance, not just the first.
      const texts = []
      recognizer.recognized = (_s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const t = e.result.text?.trim()
          if (t) texts.push(t)
        }
      }
      // Клапан снимаем при нормальном завершении: иначе таймер доживал до
      // конца бюджета уже после отданного ответа, писал в лог ложное
      // «бюджет исчерпан» и дёргал stop у закрытого распознавателя.
      let valve = null
      const finish = () => {
        if (valve) clearTimeout(valve)
        valve = null
        try {
          recognizer.close()
        } catch {
          /* ignore */
        }
        done(texts.join(' '))
      }
      recognizer.canceled = (_s, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          console.error('[azure-stt] canceled', e.errorDetails)
        }
        finish()
      }
      recognizer.sessionStopped = () => finish()
      recognizer.startContinuousRecognitionAsync(
        () => {},
        (err) => {
          console.error('[azure-stt] start failed', err)
          done('')
        },
      )
      // Клапан от зависшего соединения, а не лимит длины ответа: бюджет
      // считается от длительности аудио (см. recognitionBudgetMs).
      valve = setTimeout(() => {
        valve = null
        console.warn(
          `[azure-stt] бюджет ${Math.round(budgetMs / 1000)}с исчерпан на ${Math.round(durationSec)}с аудио — текст может быть неполным`,
        )
        recognizer.stopContinuousRecognitionAsync(finish, finish)
      }, budgetMs)
    } catch (e) {
      console.error('[azure-stt] setup failed', e)
      done('')
    }
  })
}

// Reference-based pronunciation assessment for ONE short phrase (Shadowing). В
// отличие от assessPronunciation (без сценария, continuous) здесь известен целевой
// текст: передаём его эталоном → Azure возвращает послово accuracy + errorType
// (Mispronunciation/Omission/Insertion), из чего строится тепловая карта. Фраза
// короткая (<15с) → recognizeOnce достаточно и быстрее continuous.
// Возвращает null при неконфигурации/сбое/тишине — вызывающий подставит mock.
export async function assessAgainstReference(wav, refText) {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return null

  const parsed = extractPcm(wav)
  if (!parsed || parsed.pcm.length === 0) return null

  let sdk
  try {
    sdk = await import('microsoft-cognitiveservices-speech-sdk')
  } catch (e) {
    console.error('[azure-pa-ref] SDK import failed', e)
    return null
  }

  return new Promise((resolve) => {
    let settled = false
    const done = (v) => {
      if (settled) return
      settled = true
      resolve(v)
    }
    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
      speechConfig.speechRecognitionLanguage = 'en-US'
      const format = sdk.AudioStreamFormat.getWaveFormatPCM(parsed.sampleRate, 16, 1)
      const pushStream = sdk.AudioInputStream.createPushStream(format)
      pushStream.write(
        parsed.pcm.buffer.slice(
          parsed.pcm.byteOffset,
          parsed.pcm.byteOffset + parsed.pcm.byteLength,
        ),
      )
      pushStream.close()
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

      const paConfig = new sdk.PronunciationAssessmentConfig(
        (refText || '').slice(0, 1000),
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true, // enableMiscue: штрафует пропуски/вставки относительно эталона
      )
      paConfig.enableProsodyAssessment = true

      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
      paConfig.applyTo(recognizer)

      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason !== sdk.ResultReason.RecognizedSpeech) return done(null)
            const pa = sdk.PronunciationAssessmentResult.fromResult(result)
            // Послово — из сырого JSON-ответа (NBest[0].Words), с accuracy и типом ошибки.
            let words = []
            try {
              const raw = result.properties.getProperty(
                sdk.PropertyId.SpeechServiceResponse_JsonResult,
              )
              const nb = JSON.parse(raw || '{}')?.NBest?.[0]?.Words || []
              words = nb.map((w) => ({
                word: w.Word,
                accuracy: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
                error: w.PronunciationAssessment?.ErrorType || 'None',
              }))
            } catch {
              /* карта слов не построится — числа всё равно вернём */
            }
            done({
              overall: Math.round(pa.pronunciationScore),
              accuracy: Math.round(pa.accuracyScore),
              fluency: Math.round(pa.fluencyScore),
              completeness: Math.round(pa.completenessScore),
              prosody: Math.round(pa.prosodyScore ?? pa.accuracyScore),
              words,
              transcript: result.text || '',
              mock: false,
            })
          } catch (e) {
            console.error('[azure-pa-ref] parse failed', e)
            done(null)
          } finally {
            try {
              recognizer.close()
            } catch {
              /* ignore */
            }
          }
        },
        (err) => {
          console.error('[azure-pa-ref] recognize failed', err)
          try {
            recognizer.close()
          } catch {
            /* ignore */
          }
          done(null)
        },
      )

      // Safety valve: короткая фраза оценивается быстро; не висим дольше 20с.
      // unref, чтобы уже отданный ответ не держал таймер до конца интервала.
      setTimeout(() => done(null), 20_000).unref?.()
    } catch (e) {
      console.error('[azure-pa-ref] setup failed', e)
      done(null)
    }
  })
}

// Deterministic pronunciation stand-in when Azure is unconfigured/unavailable.
// A neutral mid score so the overall band isn't skewed either way; clearly
// flagged mock so the UI can label it «оценочно».
export function mockPronunciation() {
  return {
    accuracy: 70,
    fluency: 70,
    completeness: 75,
    prosody: 70,
    overall: 70,
    mock: true,
  }
}
