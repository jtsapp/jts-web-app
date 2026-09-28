// Признаки кадра микрофона и детектор протяжного звука (порт javaTest
// src/services/voiceFeatures.ts, пороги те же). Всё считается локально.
//
// Зачем: заминка вроде «э-э-э» или «м-м-м» — один протяжный звонкий звук, у
// которого почти не меняются высота, тембр и громкость. Слова меняют всё это
// несколько раз в секунду, а у шума высоты нет вовсе. Без детектора ученик
// отгонял бы пилу мычанием.

const BANDS = 16
const LOW_HZ = 100
const HIGH_HZ = 4000
const PITCH_RATE = 12000
const MIN_HZ = 70
const MAX_HZ = 400

// БПФ по основанию 2 на месте; длина `re` — степень двойки.
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = (-2 * Math.PI) / size
    for (let start = 0; start < n; start += size)
      for (let k = 0; k < size / 2; k++) {
        const cos = Math.cos(step * k)
        const sin = Math.sin(step * k)
        const a = start + k
        const b = a + size / 2
        const tr = re[b] * cos - im[b] * sin
        const ti = re[b] * sin + im[b] * cos
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
  }
}

// Энергии логарифмических полос между LOW_HZ и HIGH_HZ за вычетом средней:
// остаётся только форма звука (тембр), а не его громкость.
function bandSpectrum(samples, sampleRate) {
  let n = 1
  while (n * 2 <= samples.length) n *= 2
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let i = 0; i < n; i++) re[i] = samples[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)))
  fft(re, im)
  const bands = new Float32Array(BANDS)
  const hzPerBin = sampleRate / n
  let mean = 0
  for (let b = 0; b < BANDS; b++) {
    const lo = LOW_HZ * (HIGH_HZ / LOW_HZ) ** (b / BANDS)
    const hi = LOW_HZ * (HIGH_HZ / LOW_HZ) ** ((b + 1) / BANDS)
    let energy = 1e-12
    for (let k = Math.ceil(lo / hzPerBin); k < hi / hzPerBin && k < n / 2; k++) energy += re[k] * re[k] + im[k] * im[k]
    bands[b] = 10 * Math.log10(energy)
    mean += bands[b] / BANDS
  }
  for (let b = 0; b < BANDS; b++) bands[b] -= mean
  return bands
}

// Нормированная автокорреляция на копии кадра ~12 кГц. Период — первый пик
// рядом с сильнейшим: так не путаем октаву.
function pitchOf(samples, sampleRate) {
  const factor = Math.max(1, Math.floor(sampleRate / PITCH_RATE))
  const rate = sampleRate / factor
  const x = new Float32Array(Math.floor(samples.length / factor))
  for (let i = 0; i < x.length; i++) {
    let sum = 0
    for (let j = 0; j < factor; j++) sum += samples[i * factor + j]
    x[i] = sum / factor
  }
  const minLag = Math.floor(rate / MAX_HZ)
  const maxLag = Math.min(Math.ceil(rate / MIN_HZ), x.length >> 1)
  const scores = new Float32Array(maxLag + 1)
  let best = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0
    let energy = 0
    for (let i = 0; i + lag < x.length; i++) {
      cross += x[i] * x[i + lag]
      energy += x[i] * x[i] + x[i + lag] * x[i + lag]
    }
    scores[lag] = energy > 0 ? (2 * cross) / energy : 0
    best = Math.max(best, scores[lag])
  }
  for (let lag = minLag + 1; lag < maxLag; lag++)
    if (scores[lag] >= 0.9 * best && scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1])
      return { pitch: rate / lag, clarity: Math.max(0, best) }
  return { pitch: 0, clarity: Math.max(0, best) }
}

/** { volume, pitch (Гц, 0 — без высоты), clarity (0..1), spectrum } одного кадра. */
export function analyseFrame(samples, sampleRate) {
  let sum = 0
  for (const s of samples) sum += s * s
  const volume = Math.sqrt(sum / samples.length)
  return {
    volume,
    ...pitchOf(samples, sampleRate),
    spectrum: bandSpectrum(samples, sampleRate),
  }
}

// Пределы «ровного» кадра. Протяжный звук плывёт медленно (падающее «э»,
// затухающее «м»), слова прыгают между звуками каждые несколько сотых секунды.
export const STEADY = {
  clarity: 0.6, // явная высота — шум сюда не попадает никогда
  pitchStep: 0.8, // полутонов от прошлого кадра
  levelStep: 2.5, // дБ от прошлого кадра
  timbre: 3.5, // средняя разница в дБ с медленно подстраиваемым спектром
  gap: 0.05, // секунд неровных кадров, которые отрезок может проглотить
}
// Протяжный звук такой длины — заминка, даже если слова ещё ожидаются.
export const MIN_HESITATION = 0.4
// Отрезки короче в игре не участвуют, но остаются в `runs` — как в исходнике.
export const MIN_STEADY = 0.2

const semitones = (hz) => 12 * Math.log2(hz)
const decibels = (rms) => 20 * Math.log10(Math.max(rms, 1e-9))

const pitched = (f) => f.clarity >= STEADY.clarity && f.pitch > 0
const begin = (f, t) => ({
  start: t,
  last: t,
  pitch: semitones(f.pitch),
  level: decibels(f.volume),
  shape: Float32Array.from(f.spectrum),
})
function fits(run, f) {
  if (Math.abs(semitones(f.pitch) - run.pitch) > STEADY.pitchStep) return false
  if (Math.abs(decibels(f.volume) - run.level) > STEADY.levelStep) return false
  let diff = 0
  for (let b = 0; b < f.spectrum.length; b++) diff += Math.abs(f.spectrum[b] - run.shape[b])
  return diff / f.spectrum.length <= STEADY.timbre
}
function extend(run, f, t) {
  run.last = t
  run.pitch = semitones(f.pitch)
  run.level = decibels(f.volume)
  for (let b = 0; b < run.shape.length; b++) run.shape[b] += 0.2 * (f.spectrum[b] - run.shape[b])
}

// Ведёт протяжные звонкие звуки кадр за кадром. `update` отвечает true, пока
// текущий протяжный звук длится не меньше MIN_HESITATION. Звук, который рвёт
// текущий отрезок, сразу заводит кандидата — так протяжный звук сразу после
// речи сохраняет своё настоящее начало.
export function createSteadinessTracker() {
  const runs = []
  let current = null
  let candidate = null
  const close = () => {
    if (current && current.last - current.start >= MIN_STEADY) runs.push({ start: current.start, end: current.last })
    current = candidate
    candidate = null
  }
  return {
    runs,
    update(f, t) {
      if (!f || !pitched(f)) {
        candidate = null
        if (current && t - current.last > STEADY.gap) close()
      } else if (current && fits(current, f)) {
        extend(current, f, t)
        candidate = null
      } else {
        if (candidate && fits(candidate, f)) extend(candidate, f, t)
        else candidate = begin(f, t)
        if (!current || t - current.last > STEADY.gap) close()
      }
      return !!current && current.last - current.start >= MIN_HESITATION
    },
    // Закрывает незаконченный отрезок — например, когда раунд остановлен.
    finish() {
      candidate = null
      close()
    },
  }
}
