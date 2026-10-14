'use client'

// Звук «Чисел»: записи голоса Soniox Freya, а где записи нет — тот же голос
// на лету через /api/tts (src/lib/speech.js).
//
// Записи (public/practice/numbers/audio/<хэш>.mp3, список — audio/index.json,
// делает scripts/make-numbers-audio.js) звучат сразу и не зависят от лимита
// Soniox во время игры. Синтез — запасной путь: фраза, которой нет в списке
// (правка прототипа без перезаписи), или файл, который не загрузился.
//
// Темп всегда на устройстве (`rate` → playbackRate): записи и синтез сделаны на
// скорости 1, а игра гоняет одну фразу на 0.85–1.3 и Slow 0.7.
//
// Синтеза устройства нет намеренно: прототип читал числа голосом браузера, и на
// компьютере с одними русскими голосами «thirteen» звучало по-русски — задание
// «услышь -teen или -ty» теряло смысл. Звука не было совсем — задание
// показывает слово. После двух провалов подряд раунд сразу показывает слова;
// новый раунд пробует звук заново.

import { playTts, playUrl, prefetchTts, prefetchUrl, stopTts, unlockSpeech } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

export const AUDIO_BASE = '/practice/numbers/audio/'
const opts = (rate, extra) => ({ voice: VOICE.gb, lang: 'en', speed: 1, rate, ...extra })

/** @param {Record<string, string>} records текст фразы → имя файла записи */
export function createNumbersVoice(records = {}) {
  let fails = 0
  const recOf = (text) => (records[text] ? AUDIO_BASE + records[text] + '.mp3' : null)
  return {
    ok: () => fails < 2,
    reset: () => { fails = 0 },
    /** onFail — только если звука так и не было (не «нет жеста»: тогда ученик жмёт ▶ сам). */
    say(text, rate = 0.85, onFail) {
      const onStart = () => { fails = 0 }
      const tts = () => playTts(text, opts(rate, {
        onStart,
        onFail: (why) => {
          if (why === 'blocked') return
          fails++
          onFail?.(why)
        },
      }))
      const src = recOf(text)
      if (!src) return tts()
      return playUrl(src, {
        rate,
        onStart,
        // запись не загрузилась (деплой без медиа, сеть) — та же фраза синтезом
        onFail: (why) => { if (why !== 'blocked') tts() },
      })
    },
    stop: () => stopTts(),
    prefetch: (text) => {
      if (!text) return
      const src = recOf(text)
      if (src) prefetchUrl(src)
      else prefetchTts(text, opts(1))
    },
    // В тике нажатия: iPhone выдаёт право на звук жесту и конкретному элементу.
    unlock: () => unlockSpeech(),
  }
}
