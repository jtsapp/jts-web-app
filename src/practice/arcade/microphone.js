// Микрофон «Аркады» (порт javaTest src/services/microphoneService.ts). Меряем
// только громкость и акустику кадра — звук не записывается и никуда не уходит.
//
// Ошибки несут `code`, а не текст: экран сам переводит их в язык интерфейса.
// NotAllowedError (отказ в доступе) и AbortError (отмена) — от браузера как есть.

import { analyseFrame } from './voiceFeatures.js'

// Ждать разрешения дольше нет смысла: встроенные браузеры иногда не отвечают вовсе.
const PERMISSION_TIMEOUT_MS = 30000

function codedError(code) {
  const e = new Error(code)
  e.code = code
  return e
}

const aborted = () => new DOMException('Microphone request cancelled.', 'AbortError')

export async function openMicrophone(onCalibrating = () => {}, signal) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw codedError('unsupported')
  // Контекст создаём и будим прямо в тике нажатия, до ожидания разрешения:
  // иначе iPhone оставляет его спящим.
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext
  const context = new AudioCtx()
  let stream
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    stream?.getTracks().forEach((t) => t.stop())
    void context.close()
  }
  let abort = () => {}
  let timeout
  const interrupted = new Promise((_, reject) => {
    abort = () => {
      close()
      reject(aborted())
    }
    signal?.addEventListener('abort', abort, { once: true })
    timeout = setTimeout(() => {
      close()
      reject(codedError('timeout'))
    }, PERMISSION_TIMEOUT_MS)
  })
  const resumed = context.resume()
  try {
    const permission = navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((media) => {
        // Разрешение пришло после отмены — поток сразу гасим, иначе значок
        // записи в браузере так и горел бы.
        if (closed) {
          media.getTracks().forEach((t) => t.stop())
          throw aborted()
        }
        stream = media
        return media
      })
    const [media] = await Promise.race([Promise.all([permission, resumed]), interrupted])
    const source = context.createMediaStreamSource(media)
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    const volume = () => {
      analyser.getFloatTimeDomainData(samples)
      return Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length)
    }
    onCalibrating()
    const levels = []
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      if (closed) throw aborted()
      levels.push(volume())
    }
    // Нижняя четверть — одиночный щелчок за секунду калибровки порог не задирает.
    levels.sort((a, b) => a - b)
    return {
      noiseFloor: levels[5],
      // Высота, чистота и тембр последнего кадра — для детектора заминок.
      features: () => {
        analyser.getFloatTimeDomainData(samples)
        return analyseFrame(samples, context.sampleRate)
      },
      active: () => stream.getAudioTracks().some((t) => t.readyState === 'live') && context.state === 'running',
      volume,
      close() {
        source.disconnect()
        close()
      },
    }
  } catch (e) {
    close()
    throw e
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
