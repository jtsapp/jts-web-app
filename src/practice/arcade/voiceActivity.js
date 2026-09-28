// Порог громкости с гистерезисом (порт javaTest src/services/voiceActivity.ts).
// Короткие провалы между слогами не мигают сценой: голос должен продержаться
// ONSET_MS, чтобы включиться, и держится RELEASE_MS после того, как стих.
// Порог считается от шума комнаты, снятого калибровкой микрофона.

export const ONSET_MS = 60
export const RELEASE_MS = 280

export function createVoiceActivity(noiseFloor) {
  const attack = Math.max(0.012, noiseFloor * 3)
  const release = Math.max(0.008, noiseFloor * 1.8)
  let speaking = false
  let lastVoice = -Infinity
  let aboveSince = null
  return (volume, now) => {
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
