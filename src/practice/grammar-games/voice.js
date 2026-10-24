'use client'

// Озвучка «Грамматики · игр»: слово и предложение из окна слова, 🔊 у примеров
// правила и фраза «Слушай и выбирай». Прототип читал их синтезом браузера
// (en-GB, 0.9) — на Windows и Android это робот или русский голос; у нас —
// Soniox через /api/tts британским голосом (VOICE.gb), а голос устройства —
// только если сервер не ответил: тишина на «послушай» хуже робота.

import { playTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

const RATE = 0.9

function speakDevice(text) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = RATE
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* нет синтеза — молча */
  }
}

export function speakGrammar(text) {
  playTts(text, { voice: VOICE.gb, lang: 'en', speed: RATE, onFail: (why) => why !== 'empty' && speakDevice(text) })
}

/** Замолчать при уходе из раздела: и общий <audio> (Soniox), и запасной голос устройства. */
export function stopGrammar() {
  stopTts()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* нет синтеза — молча */
  }
}
