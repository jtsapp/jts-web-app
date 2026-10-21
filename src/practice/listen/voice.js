'use client'

// Озвучка Just Listen It. Прототип читал голосом браузера (en-GB), а он разный
// на каждом устройстве, — здесь Soniox через /api/tts британским голосом.
// «Медленнее» — тот же адрес с темпом устройства: нового синтеза не нужно, и
// лимит Soniox (общий с тьютором) не тратится. Звук не начался (лимит, сеть) —
// голос устройства на темпах прототипа: тишина на диктанте хуже робота.

import { playTts, prefetchTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

export const SPEED = 0.9
export const SLOW_RATE = 0.75
const TTS = { voice: VOICE.gb, lang: 'en', speed: SPEED }
// Темпы прототипа для голоса устройства: speak(t, .9), «Медленнее» — .55 / .6.
const DEVICE_RATE = 0.9
const DEVICE_SLOW = { word: 0.55, sentence: 0.6 }

function deviceSay(text, rate) {
  try {
    const u = new window.SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = rate
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* синтеза нет — молчим */
  }
}

export function say(text, { kind = 'word', slow = false } = {}) {
  if (!text) return
  playTts(text, {
    ...TTS,
    rate: slow ? SLOW_RATE : 1,
    onFail: () => deviceSay(text, slow ? DEVICE_SLOW[kind] : DEVICE_RATE),
  })
}

/** Заранее попросить запись: следующее слово и предложение задания. */
export function prefetch(text) {
  if (text) prefetchTts(text, TTS)
}

export function silence() {
  stopTts()
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* синтеза нет */
  }
}
