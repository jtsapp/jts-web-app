'use client'

// Голос Луны в Punctuation World — она читает предложения вслух («Hear the
// difference», примеры правил, документ урока, задание игры по L). Прототип
// читал синтезом браузера (en-GB, темп 0.9), а на Windows и Android это робот
// или русский голос. У нас — Soniox через /api/tts британским голосом; голос
// устройства — только если сервер не ответил: тишина на «послушай» хуже робота.
//
// Контракт движка: onEnd зовётся всегда и один раз — дозвучало, оборвали или
// звука не было вовсе. Иначе кнопка «слушать» осталась бы гореть.

import { playTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

// Темп прототипа (rate .9).
const RATE = 0.9

function speakDevice(text, { onStart, onEnd }) {
  let started = false
  try {
    const synth = window.speechSynthesis
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = RATE
    u.onstart = () => {
      started = true
      onStart?.()
    }
    u.onend = () => onEnd()
    u.onerror = () => onEnd()
    synth.cancel()
    synth.speak(u)
    // Бывают движки без onstart и без onend: не начал за 5 с — считаем, что звука нет.
    setTimeout(() => {
      if (!started) onEnd()
    }, 5000)
  } catch {
    onEnd()
  }
}

/**
 * Сказать text: Soniox, по провалу — голосом устройства.
 * @param {string} text
 * @param {{ onStart?: () => void, onEnd?: () => void }} [opts]
 */
export function speakPunctuation(text, { onStart, onEnd } = {}) {
  let done = false
  const end = () => {
    if (done) return
    done = true
    onEnd?.()
  }
  playTts(text, {
    voice: VOICE.gb,
    lang: 'en',
    speed: RATE,
    onStart,
    onEnd: end,
    onCancel: end,
    onFail: (why) => (why === 'empty' ? end() : speakDevice(text, { onStart, onEnd: end })),
  })
}

/** Замолчать: и общий <audio> (Soniox), и запасной голос устройства. */
export function stopPunctuation() {
  stopTts()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* нет синтеза — молча */
  }
}
