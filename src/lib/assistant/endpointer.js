// Когда ученик договорил голосовой вопрос. Пока голоса не было — ждём (думает,
// подбирает слова) до NO_VOICE_MS и сдаёмся: молчащая запись ушла бы в платное
// распознавание впустую. После речи конец — SILENCE_END_MS тишины: короче —
// режет фразу на запинке, длиннее — ученик ждёт и не понимает, услышали ли его.

export const SILENCE_END_MS = 1500
export const NO_VOICE_MS = 8000

/** (voiced, now) → 'go' | 'end' | 'no_voice' */
export function createEndpointer({ silenceMs = SILENCE_END_MS, noVoiceMs = NO_VOICE_MS } = {}) {
  let start = null
  let heard = false
  let lastVoice = 0
  return (voiced, now) => {
    start ??= now
    if (voiced) {
      heard = true
      lastVoice = now
      return 'go'
    }
    if (!heard) return now - start >= noVoiceMs ? 'no_voice' : 'go'
    return now - lastVoice >= silenceMs ? 'end' : 'go'
  }
}
