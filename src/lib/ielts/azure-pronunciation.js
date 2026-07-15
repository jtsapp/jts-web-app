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

      const finish = () => {
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

      // Safety valve: a 2-min clip processes faster than real time, but never
      // hang the request. Force-finish after 60s of wall clock.
      setTimeout(() => {
        recognizer.stopContinuousRecognitionAsync(finish, finish)
      }, 60_000)
    } catch (e) {
      console.error('[azure-pa] setup failed', e)
      done(null)
    }
  })
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
      const finish = () => {
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
      setTimeout(() => {
        recognizer.stopContinuousRecognitionAsync(finish, finish)
      }, 60_000)
    } catch (e) {
      console.error('[azure-stt] setup failed', e)
      done('')
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
