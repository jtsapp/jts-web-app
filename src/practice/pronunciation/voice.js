'use client'

// Озвучка Pronunciation World для текста без записи. Прототип читал его
// синтезом браузера (британский голос, «Медленно» — 0.6, обычный темп — 0.9;
// американский — для ga-), а на Windows и Android это робот или русский голос.
// У нас — Soniox через /api/tts: британский голос (VOICE.gb), для
// американского варианта — американский (VOICE.us); голос устройства — только
// если сервер не ответил: тишина на «послушай звук» хуже робота.
// Записи курса (1694 клипа) сюда не относятся — они играют файлами (playUrl).
//
// Контракт движка: onEnd зовётся всегда и один раз — дозвучало, оборвали или
// звука не было вовсе (onStart тогда не приходит, и кнопка покажет «звук не
// воспроизвёлся»). Иначе очередь эха в игре ждала бы вечно.

import { playTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

// Темп прототипа; 0.6 «Медленно» Soniox не умеет (минимум 0.7).
const RATE = 0.9
const SLOW = 0.7

function speakDevice(text, { accent, slow, onStart, onEnd }) {
  let started = false
  try {
    const synth = window.speechSynthesis
    const u = new SpeechSynthesisUtterance(text)
    u.lang = accent === 'GA' ? 'en-US' : 'en-GB'
    u.rate = slow ? 0.6 : RATE
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
 * @param {{ accent?: string, slow?: boolean, onStart?: () => void, onEnd?: () => void }} [opts]
 */
export function speakPronunciation(text, { accent, slow, onStart, onEnd } = {}) {
  let done = false
  const end = () => {
    if (done) return
    done = true
    onEnd?.()
  }
  playTts(text, {
    voice: accent === 'GA' ? VOICE.us : VOICE.gb,
    lang: 'en',
    speed: slow ? SLOW : RATE,
    onStart,
    onEnd: end,
    onCancel: end,
    onFail: (why) => (why === 'empty' ? end() : speakDevice(text, { accent, slow, onStart, onEnd: end })),
  })
}

/** Замолчать: и общий <audio> (записи, Soniox), и запасной голос устройства. */
export function stopPronunciation() {
  stopTts()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* нет синтеза — молча */
  }
}
