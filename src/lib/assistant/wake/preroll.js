// Кольцевой буфер звука «уха» (21.10.2026). «Луна, нажми «Начать урок»» одним духом:
// Vosk отдаёт итог после паузы, значит к срабатыванию позывного ученик уже договорил, и
// запись, начатая после позывного, команды не услышит. Поэтому «ухо» держит последние
// секунды звука, а по времени слов Vosk отдаёт кусок от имени до конца — WAV 16 кГц,
// как запись вопроса (/api/assistant/transcribe). Звук никуда не уходит, пока ученик не
// сказал позывной: буфер живёт в памяти вкладки и затирается по кругу.

export const RING_SEC = 8
// Запас до начала имени: Vosk ставит начало слова с точностью до кадра.
const LEAD_SEC = 0.25
// Времени слов нет (пустой итог, другая модель) — последние секунды.
const FALLBACK_SEC = 4
const TARGET_RATE = 16000

export function createRing(rate, sec = RING_SEC) {
  const buf = new Float32Array(Math.max(1, Math.round(rate * sec)))
  let fed = 0
  const ring = {
    get fed() {
      return fed
    },
    /** Кадр микрофона; копируется — vosk-browser может забрать буфер кадра себе. */
    push(frame) {
      for (let i = 0; i < frame.length; i++) buf[(fed + i) % buf.length] = frame[i]
      fed += frame.length
    },
    /** Сэмплы с позиции from (счёт — с начала прослушивания) до конца; старше буфера — с его начала. */
    slice(from) {
      const start = Math.max(fed - buf.length, Math.floor(from), 0)
      const out = new Float32Array(Math.max(0, fed - start))
      for (let i = 0; i < out.length; i++) out[i] = buf[(start + i) % buf.length]
      return out
    },
    /** WAV 16 кГц от startSec (начало слова по Vosk) с запасом; без времени — последние секунды. */
    wavFrom(startSec) {
      const from = Number.isFinite(startSec) ? (startSec - LEAD_SEC) * rate : fed - FALLBACK_SEC * rate
      const pcm = ring.slice(from)
      return pcm.length ? wav16k(pcm, rate) : null
    },
  }
  return ring
}

// Усреднение окнами: распознаванию нужна речь до 8 кГц, частоты выше в 16 кГц-записи не
// поместятся всё равно, а без фильтра они завернулись бы в слышимый шум.
function downsample(pcm, rate) {
  if (rate === TARGET_RATE) return pcm
  const ratio = rate / TARGET_RATE
  const out = new Float32Array(Math.round(pcm.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio)
    const b = Math.min(pcm.length, Math.max(a + 1, Math.floor((i + 1) * ratio)))
    let s = 0
    for (let j = a; j < b; j++) s += pcm[j]
    out[i] = s / (b - a)
  }
  return out
}

/** Float32 mono → WAV PCM 16 бит 16 кГц. */
export function wav16k(pcm, rate) {
  const data = downsample(pcm, rate)
  const view = new DataView(new ArrayBuffer(44 + data.length * 2))
  const text = (at, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + data.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_RATE, true)
  view.setUint32(28, TARGET_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true)
  }
  return new Blob([view.buffer], { type: 'audio/wav' })
}
