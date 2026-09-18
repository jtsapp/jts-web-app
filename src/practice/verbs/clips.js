// Записи форм — порт rhythmVoice из data/jtsverbs.html.
//
// Файлы — WAV 16 кГц моно (public/practice/verbs/audio/<ключ>.wav, режет
// scripts/extract-verbs.js), и разбираем их сами, как прототип, а не через
// decodeAudioData: у того на Safari до сих пор колбэчная сигнатура и свои
// капризы, а PCM 16 бит раскладывается в пять строк.
//
// Загрузка и разбор не требуют AudioContext — поэтому записи следующего
// глагола можно подтянуть заранее, до первого касания. AudioBuffer строится
// уже при воспроизведении, из того же контекста, что держит бит: тогда
// форма ложится ровно на долю.

import { audioContext, resumeAudio } from './beat.js'

export const AUDIO_BASE = '/practice/verbs/audio/'

/**
 * WAV → { rate, samples }. Чанки перебираются по длинам, как в прототипе:
 * между fmt и data бывает LIST с метаданными кодера.
 * @param {ArrayBuffer|Uint8Array} input
 * @returns {{rate: number, samples: Float32Array} | null}
 */
export function parseWav(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.length < 12) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (at) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3])
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null
  let offset = 12
  let rate = 16000
  let start = 0
  let size = 0
  while (offset + 8 <= bytes.length) {
    const id = tag(offset)
    const len = view.getUint32(offset + 4, true)
    if (id === 'fmt ') rate = view.getUint32(offset + 12, true)
    if (id === 'data') {
      start = offset + 8
      size = Math.min(len, bytes.length - start)
      break
    }
    offset += 8 + len + (len % 2)
  }
  if (!size) return null
  const samples = new Float32Array(Math.floor(size / 2))
  for (let j = 0; j < samples.length; j++) samples[j] = view.getInt16(start + j * 2, true) / 32768
  return { rate, samples }
}

/**
 * @param {object} [opts]
 * @param {() => (AudioContext|null)} [opts.getContext]
 * @param {(url: string) => Promise<ArrayBuffer>} [opts.load] загрузка файла (тест подменяет)
 */
export function createClips({ getContext = audioContext, load, base = AUDIO_BASE } = {}) {
  const fetchBytes =
    load ||
    ((url) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`clip ${r.status}`)
        return r.arrayBuffer()
      }))
  const pcm = new Map() // ключ → { rate, samples }
  const loading = new Map() // ключ → промис
  const buffers = new Map() // ключ → AudioBuffer (на контекст, он один)
  let sources = []
  let gain = null
  let volume = 90

  function fetchClip(key) {
    if (pcm.has(key)) return Promise.resolve(pcm.get(key))
    if (loading.has(key)) return loading.get(key)
    const p = fetchBytes(base + encodeURIComponent(key) + '.wav')
      .then((buf) => {
        const parsed = parseWav(buf)
        if (!parsed) throw new Error(`clip ${key}: не WAV`)
        pcm.set(key, parsed)
        return parsed
      })
      .finally(() => loading.delete(key))
    loading.set(key, p)
    return p
  }

  function bufferFor(key) {
    if (buffers.has(key)) return buffers.get(key)
    const ctx = getContext()
    const clip = pcm.get(key)
    if (!ctx || !clip) return null
    // Старый webkitAudioContext (Safari до 14.1) не строит буфер на 16 кГц и
    // бросает NotSupportedError. Прототип ловил это там же и честно говорил
    // «голос не загрузился» — null здесь ведёт ровно туда.
    try {
      const b = ctx.createBuffer(1, clip.samples.length, clip.rate)
      b.getChannelData(0).set(clip.samples)
      buffers.set(key, b)
      return b
    } catch {
      return null
    }
  }

  function output(ctx) {
    if (!gain) {
      gain = ctx.createGain()
      gain.connect(ctx.destination)
    }
    gain.gain.setValueAtTime(volume / 100, ctx.currentTime)
    return gain
  }

  return {
    /**
     * Поднять и разбудить контекст. Зовётся синхронно из клика: запись
     * играет уже после загрузки, вне жеста, и iPhone без этого промолчит.
     */
    wake() {
      resumeAudio(getContext())
    },

    /** Подтянуть записи заранее. Промах не бросаем — это только прогрев. */
    prefetch(keys) {
      for (const k of keys) fetchClip(k).catch(() => {})
    },

    /**
     * Все записи готовы к игре. Отказ — если хоть одной нет или звука нет
     * вовсе: попытка без голоса тьютора бессмысленна, и прототип в этом
     * случае честно говорил «встроенный голос не загрузился».
     */
    ensure(keys) {
      if (!getContext()) return Promise.reject(new Error('no audio'))
      return Promise.all(keys.map(fetchClip)).then(() => undefined)
    },

    has(key) {
      return pcm.has(key)
    },

    /** Сыграть на время часов контекста. false — записи нет или звука нет. */
    play(key, at, onEnded) {
      const ctx = getContext()
      const buffer = bufferFor(key)
      if (!ctx || !buffer) return false
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(output(ctx))
      src.onended = () => {
        const i = sources.indexOf(src)
        if (i >= 0) sources.splice(i, 1)
        try {
          src.disconnect()
        } catch {
          /* уже отключён */
        }
        if (onEnded) onEnded()
      }
      src.start(at == null ? ctx.currentTime : at)
      sources.push(src)
      return true
    },

    stop() {
      const list = sources
      sources = []
      for (const s of list) {
        s.onended = null
        try {
          s.stop()
          s.disconnect()
        } catch {
          /* уже отыграл */
        }
      }
    },

    // Контекст здесь НЕ создаём: громкость ставится при монтировании экрана,
    // до касания, и лишний AudioContext родился бы на паузе с ругательством в
    // консоль. Нет выхода — значение просто подхватит output() при первой игре.
    setVolume(v) {
      volume = v
      const ctx = gain && gain.context
      if (ctx) gain.gain.setValueAtTime(volume / 100, ctx.currentTime)
    },
  }
}
