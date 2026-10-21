'use client'

// Озвучка примеров урока Prepositions World. Прототип читал их синтезом
// браузера (en-US, 0.85) — на Windows и Android это робот или русский голос;
// у нас — Soniox через /api/tts тем же «голосом уроков», а голос устройства —
// только если сервер не ответил: тишина на «послушай пример» хуже робота.
// Записи вопросов практики сюда не относятся — они играют файлами (playUrl).

import { playTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

const RATE = 0.85

function speakDevice(text) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = RATE
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* нет синтеза — молча */
  }
}

export function speakLesson(text) {
  playTts(text, { voice: VOICE.us, lang: 'en', speed: RATE, onFail: (why) => why !== 'empty' && speakDevice(text) })
}
