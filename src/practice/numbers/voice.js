'use client'

// Звук «Чисел»: голос Soniox Freya через /api/tts (src/lib/speech.js).
//
// Синтез всегда на скорости 1, а темп раунда (0.85 у тем, 0.95–1.15 у боссов,
// нарастание до 1.3 в Lab, Slow 0.7) — на устройстве (`rate`): одна фраза —
// один синтез и один кэш на все темпы.
//
// Синтеза устройства нет намеренно: прототип читал числа голосом браузера, и на
// компьютере с одними русскими голосами «thirteen» звучало по-русски — задание
// «услышь -teen или -ty» теряло смысл. Звук не пришёл (сеть, лимит Soniox,
// 503) — задание показывает слово. После двух провалов подряд раунд сразу
// показывает слова; новый раунд пробует звук заново.

import { playTts, prefetchTts, stopTts, unlockSpeech } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

const opts = (rate, extra) => ({ voice: VOICE.gb, lang: 'en', speed: 1, rate, ...extra })

export function createNumbersVoice() {
  let fails = 0
  return {
    ok: () => fails < 2,
    reset: () => { fails = 0 },
    /** onFail — только если звука так и не было (не «нет жеста»: тогда ученик жмёт ▶ сам). */
    say(text, rate = 0.85, onFail) {
      return playTts(text, opts(rate, {
        onStart: () => { fails = 0 },
        onFail: (why) => {
          if (why === 'blocked') return
          fails++
          onFail?.(why)
        },
      }))
    },
    stop: () => stopTts(),
    prefetch: (text) => { if (text) prefetchTts(text, opts(1)) },
    // В тике нажатия: iPhone выдаёт право на звук жесту и конкретному элементу.
    unlock: () => unlockSpeech(),
  }
}
