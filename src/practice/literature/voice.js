'use client'

// Голос Literature World — кнопка «Hear» у слова (шаг 3 из шести) читает само
// слово. Прототип читал синтезом браузера (en-GB, темп 0.85), а на Windows и
// Android это робот или русский голос. У нас — Soniox через /api/tts
// британским голосом; голос устройства — только если сервер не ответил:
// тишина на «послушай» хуже робота. Записи Commons (стихи) играют свои
// <audio> движка — сюда не идут.

import { playTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

// Темп прототипа (rate .85).
const RATE = 0.85

function speakDevice(text) {
  try {
    const synth = window.speechSynthesis
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = RATE
    synth.cancel()
    synth.speak(u)
  } catch {
    /* нет синтеза — молча, как у прототипа */
  }
}

/** Сказать text: Soniox, по провалу — голосом устройства. */
export function speakLiterature(text) {
  const t = String(text || '').trim()
  if (!t) return
  playTts(t, {
    voice: VOICE.gb,
    lang: 'en',
    speed: RATE,
    onFail: (why) => {
      if (why !== 'empty') speakDevice(t)
    },
  })
}

/** Замолчать: и общий <audio> (Soniox), и запасной голос устройства. */
export function stopLiterature() {
  stopTts()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* нет синтеза — молча */
  }
}
