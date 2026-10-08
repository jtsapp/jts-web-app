import { useEffect, useRef, useState } from 'react'
import { createVoiceActivity } from '../../practice/arcade/voiceActivity.js'
import { analyseFrame, pitched } from '../../practice/arcade/voiceFeatures.js'

// Живая акустика под записью Speaking (Figma 11 «Speaking · Part 2»): волна, доля речи, паузы дольше 2 с и слова в
// минуту. Всё считается в браузере по микрофону, который уже открыт для записи, — звук никуда не уходит, как и сама
// запись (раздел обещает это на экране). Порог голоса — тот же, что у Аркады (voiceActivity.js): от шума комнаты и
// пика гласных самого ученика, иначе тихий ноутбук весь ответ числился бы тишиной.

export const FRAME_MS = 100
export const LONG_PAUSE_SEC = 2
export const WAVE_BARS = 22

/**
 * Итог по кадрам `[{ voiced }]` шагом FRAME_MS: доля речи от начала первого слова и число пауз дольше LONG_PAUSE_SEC
 * между словами. Тишина до первого слова — это раздумье перед ответом, не пауза в речи; хвост тишины в конце
 * считается паузой, только если она уже длиннее порога (ответ идёт — ученик замолчал).
 */
export function acousticStats(frames, frameMs = FRAME_MS) {
  const first = frames.findIndex((f) => f.voiced)
  if (first < 0) return { speechShare: null, longPauses: 0 }
  const tail = frames.slice(first)
  const voiced = tail.filter((f) => f.voiced).length
  const longRun = Math.ceil((LONG_PAUSE_SEC * 1000) / frameMs)
  let pauses = 0
  let run = 0
  for (const f of tail) {
    if (f.voiced) {
      if (run >= longRun) pauses++
      run = 0
    } else run++
  }
  if (run >= longRun) pauses++
  return { speechShare: Math.round((voiced / tail.length) * 100), longPauses: pauses }
}

/** Слов в минуту: по распознанным словам и времени от первого слова; меньше 10 с речи — рано судить. */
export function wordsPerMinute(words, speakingSec) {
  if (!words || speakingSec < 10) return null
  return Math.round(words / (speakingSec / 60))
}

const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0)

/**
 * Хук на поток микрофона: пока `active`, каждые FRAME_MS — кадр громкости и голоса. Слова — Web Speech API (en-GB),
 * если он есть и действительно отвечает; нет — «слов в минуту» остаётся пустым, а не выдуманным.
 * Возвращает { levels: [{ level, voiced }] (последние WAVE_BARS), hearing, speechShare, longPauses, wpm, device }.
 */
export function useLiveAcoustics(stream, active) {
  const [snap, setSnap] = useState({ levels: [], hearing: false, speechShare: null, longPauses: 0, wpm: null, device: '' })
  const frames = useRef([])

  useEffect(() => {
    if (!stream || !active) return undefined
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!Ctx) return undefined
    const ctx = new Ctx()
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    frames.current = []
    let noise = Infinity
    let detect = null
    const t0 = performance.now()
    let words = 0
    let firstVoiceAt = null
    let lastVoiceAt = -Infinity

    // слова — по распознавателю: финальные куски копятся, промежуточный считается поверх
    const Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition
    let recognizer = null
    let finalWords = 0
    let stopped = false
    let recFailed = false
    if (Recognition) {
      try {
        recognizer = new Recognition()
        recognizer.continuous = true
        recognizer.interimResults = true
        recognizer.lang = 'en-GB'
        recognizer.onresult = (e) => {
          let interim = 0
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const n = countWords(e.results[i][0].transcript)
            if (e.results[i].isFinal) finalWords += n
            else interim += n
          }
          words = finalWords + interim
        }
        // Распознаватель сам засыпает на паузах — пока идёт запись, будим снова. Но если он падает сразу (нет сети,
        // Brave, запрет сервиса), перезапуск крутился бы вхолостую всю запись: после трёх быстрых обрывов подряд
        // или отказа сервиса слова просто не считаются (прочерк, а не выдумка).
        let startedAt = performance.now()
        let quickEnds = 0
        recognizer.onerror = (e) => {
          if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(e?.error)) {
            stopped = true
            recFailed = true
          }
        }
        recognizer.onend = () => {
          if (stopped) return
          quickEnds = performance.now() - startedAt < 1000 ? quickEnds + 1 : 0
          if (quickEnds >= 3) {
            recFailed = true
            return
          }
          try {
            startedAt = performance.now()
            recognizer.start()
          } catch {
            /* уже запущен или браузер не даёт — слова просто не посчитаются */
          }
        }
        recognizer.start()
      } catch {
        recognizer = null
      }
    }

    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(buf)
      const now = performance.now()
      const f = analyseFrame(buf, ctx.sampleRate)
      // первые полсекунды — калибровка шума комнаты (самый тихий кадр)
      if (now - t0 < 500) {
        noise = Math.min(noise, f.volume)
        return
      }
      detect ??= createVoiceActivity(Number.isFinite(noise) ? noise : 0.002)
      const voiced = detect(f.volume, now, pitched(f))
      if (voiced) {
        firstVoiceAt ??= now
        lastVoiceAt = now
      }
      frames.current.push({ voiced, level: f.volume })
      const stats = acousticStats(frames.current)
      const peak = Math.max(0.02, ...frames.current.slice(-50).map((x) => x.level))
      setSnap({
        levels: frames.current.slice(-WAVE_BARS).map((x) => ({ level: Math.min(1, x.level / peak), voiced: x.voiced })),
        hearing: now - lastVoiceAt < 3000,
        ...stats,
        // распознаватель отказал — темпа нет, а не «0 слов в минуту»
        wpm: firstVoiceAt == null || !recognizer || recFailed ? null : wordsPerMinute(words, (now - firstVoiceAt) / 1000),
        device: stream.getAudioTracks()[0]?.label || '',
      })
    }, FRAME_MS)

    return () => {
      stopped = true
      clearInterval(id)
      try {
        recognizer?.abort()
      } catch {
        /* уже остановлен */
      }
      src.disconnect()
      ctx.close().catch(() => {})
    }
  }, [stream, active])

  return snap
}
