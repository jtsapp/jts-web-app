'use client'

// Микрофон для караоке: определение «поёт / молчит» (VAD) и запись дубля.
//
// Две задачи решаются одним потоком с микрофона:
//  • живая полоска уровня и маска пения — считаются в браузере из AnalyserNode,
//    никуда не уходят;
//  • запись всего исполнения — уходит один раз в конце в собственный STT
//    приложения (/api/transcribe), чтобы оценить слова.
//
// Аудио НИГДЕ не сохраняется: ни на диск, ни на JTS-бэкенд. Единственный
// сетевой вызов — распознавание, и его результат — текст. Это обещание
// написано на экране запроса разрешения, поэтому нарушать его нельзя.

import { blobToWav16kMono } from '../../lib/ielts-audio.js'
import { MASK_STEP_MS, maskLength } from './scoring.js'

export function isMicSupported() {
  if (typeof window === 'undefined') return false
  const Ctx = window.AudioContext ?? window.webkitAudioContext ?? null
  return Boolean(navigator.mediaDevices?.getUserMedia) && Ctx !== null
}

export function requestMic() {
  // Эхоподавление и шумодав ОСТАВЛЯЕМ включёнными: без них в маску попадает
  // сама фонограмма из динамиков, и «спел» получается у любого, кто просто
  // включил трек. В наушниках это не важно, но большинство поёт без них.
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  })
}

export function stopStream(stream) {
  for (const t of stream?.getTracks?.() || []) t.stop()
}

function rmsOf(analyser, buf) {
  if (analyser.getFloatTimeDomainData) {
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    return Math.sqrt(sum / buf.length)
  }
  // Safari до 14.1 умеет только байтовый вариант — разворачиваем в [-1, 1].
  const bytes = new Uint8Array(buf.length)
  analyser.getByteTimeDomainData(bytes)
  let sum = 0
  for (let i = 0; i < bytes.length; i++) {
    const v = (bytes[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / bytes.length)
}

/**
 * Дубль: маска пения + запись.
 *
 * `positionSec` — функция, отдающая текущую позицию ТРЕКА, а не время с начала
 * записи. Это принципиально: если аудио подвисло на буферизации, стенные часы
 * уедут, а маска должна остаться привязанной к музыке — иначе ритм посчитается
 * по сдвинутым данным и балл будет враньём.
 */
export async function startTake({ stream, durationSec, positionSec, stepMs = MASK_STEP_MS }) {
  const Ctx = window.AudioContext ?? window.webkitAudioContext
  const ctx = new Ctx()
  if (ctx.state === 'suspended') await ctx.resume()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)

  // Калибровка фона: 1.5 секунды тишины перед стартом (ТЗ 8.1). Без неё порог
  // приходится ставить наугад, и в шумной комнате «поёт» показывается всегда.
  const floorSamples = []
  await new Promise((resolve) => {
    const t0 = Date.now()
    const tick = () => {
      floorSamples.push(rmsOf(analyser, buf))
      if (Date.now() - t0 >= 1500) resolve()
      else setTimeout(tick, 30)
    }
    tick()
  })
  floorSamples.sort((a, b) => a - b)
  const floor = floorSamples[Math.floor(floorSamples.length / 2)] || 0
  // Порог — втрое над медианой фона, но не ниже абсолютного минимума: в
  // идеальной тишине медиана уходит почти в ноль, и тогда триггером станет
  // любой шорох.
  const threshold = Math.max(floor * 3, 0.012)

  const mask = new Uint8Array(maskLength(durationSec, stepMs))
  const window5 = []
  let level = 0

  const timer = setInterval(() => {
    const rms = rmsOf(analyser, buf)
    // Сглаживание по 5 окнам (ТЗ 8.1): решает большинство, поэтому одиночный
    // щелчок не создаёт «спел», а вдох посреди строки не создаёт паузу.
    window5.push(rms > threshold ? 1 : 0)
    if (window5.length > 5) window5.shift()
    const voiced = window5.reduce((a, b) => a + b, 0) >= 3
    level = Math.min(1, rms / (threshold * 4))
    const pos = positionSec()
    const idx = Math.floor((pos * 1000) / stepMs)
    if (voiced && idx >= 0 && idx < mask.length) mask[idx] = 1
  }, stepMs)

  // Запись всего дубля. Битрейт занижен намеренно: 16 кГц моно WAV после
  // конвертации даёт ~32 КБ/с, и трёхминутная песня укладывается в 6 МБ —
  // это ниже и лимита роута (25 МБ), и client_max_body_size на прокси (32m).
  let chunks = []
  let recorder = null
  try {
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
      (m) => window.MediaRecorder?.isTypeSupported?.(m),
    )
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined)
    recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data)
    recorder.start(1000)
  } catch {
    recorder = null // без записи — просто не будет оценки слов
  }

  return {
    level: () => level,
    threshold,
    async stop() {
      clearInterval(timer)
      const blob = await new Promise((resolve) => {
        if (!recorder || recorder.state === 'inactive') return resolve(null)
        recorder.onstop = () => resolve(new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' }))
        try {
          recorder.stop()
        } catch {
          resolve(null)
        }
      })
      try {
        source.disconnect()
        await ctx.close()
      } catch {
        /* контекст уже закрыт — неважно */
      }
      let sung = 0
      for (let i = 0; i < mask.length; i++) if (mask[i]) sung++
      return { mask, sungSec: (sung * stepMs) / 1000, blob }
    },
  }
}

/**
 * Распознаёт дубль собственным STT приложения.
 *
 * Возвращает текст либо `null`, если распознавание недоступно: нет сети, роут
 * не настроен (503), тело не прошло прокси (413). Ноль вместо `null` вернуть
 * нельзя — «слова не оценивались» и «спел не те слова» дают разные веса в
 * итоговом балле (см. finalScore).
 */
export async function transcribeTake(blob) {
  if (!blob || blob.size === 0) return null
  try {
    const wav = await blobToWav16kMono(blob)
    const form = new FormData()
    form.append('audio', wav, 'take.wav')
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    if (!res.ok) return null
    const data = await res.json()
    const text = typeof data?.text === 'string' ? data.text.trim() : ''
    return text || null
  } catch {
    return null
  }
}
