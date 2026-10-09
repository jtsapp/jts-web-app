// Порог громкости с гистерезисом.
// Короткие провалы между слогами не мигают сценой: голос должен продержаться
// ONSET_MS, чтобы включиться, и держится RELEASE_MS после того, как стих.
// Порог считается от шума комнаты, снятого калибровкой микрофона.
//
// И от уровня самого говорящего. Микрофон открыт без автоусиления, поэтому
// внятный голос с ноутбука на столе приходит на ~0.006 RMS, а с гарнитуры — на
// 0.2. Исходный жёсткий пол 0.012 первый не слышал вовсе: распознаватель писал
// все слова, а игра считала раунд тишиной и отдавала дерево за 11 с (разбор PR
// #524, фейковый микрофон). Поэтому порог — на ATTACK_DB ниже недавнего пика
// гласных говорящего: для громкого голоса это прежние 0.012/0.008, для тихого
// он опускается до пола MIN_*. Пик берём только с кадров с высотой — стук или
// хлопок порог не задирают, — и он тает за PEAK_HALF_LIFE_MS, чтобы после
// громкой фразы и паузы снова слышать тихую.

export const ONSET_MS = 60
export const RELEASE_MS = 280

const MIN_ATTACK = 0.003
const MIN_RELEASE = 0.002
const ATTACK_DB = 30
const RELEASE_DB = 34
const PEAK_HALF_LIFE_MS = 2500

const below = (db) => 10 ** (-db / 20)

/**
 * `detect(volume, now, pitched)`: `pitched` — есть ли у кадра высота (гласная,
 * voiceFeatures.pitched). Без него порог держится только на шуме комнаты.
 */
export function createVoiceActivity(noiseFloor) {
  let speaking = false
  let lastVoice = -Infinity
  let aboveSince = null
  let peak = 0
  let peakAt = 0
  return (volume, now, pitched = false) => {
    peak *= 0.5 ** ((now - peakAt) / PEAK_HALF_LIFE_MS)
    peakAt = now
    if (pitched) peak = Math.max(peak, volume)
    const attack = Math.max(MIN_ATTACK, noiseFloor * 3, peak * below(ATTACK_DB))
    const release = Math.max(MIN_RELEASE, noiseFloor * 1.8, peak * below(RELEASE_DB))
    if (volume >= (speaking ? release : attack)) {
      aboveSince ??= now
      if (speaking || now - aboveSince >= ONSET_MS) {
        speaking = true
        lastVoice = now
      }
    } else aboveSince = null
    if (now - lastVoice > RELEASE_MS) speaking = false
    return speaking
  }
}
