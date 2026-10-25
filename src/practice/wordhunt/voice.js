'use client'

// Озвучка слов Word Hunt. Прототип играл студийную запись (есть только у A0)
// своим new Audio(), а остальные слова — синтезом браузера с выбором голоса
// en-GB; на Windows и Android это робот или русский голос. У нас запись —
// общим элементом приложения (playUrl: разрешение iOS живёт на нём), без
// записи или если она не загрузилась — Soniox через /api/tts британским
// голосом (прототип просил en-GB), голос устройства — только если и сервер не
// ответил: тишина на «послушай слово» хуже робота.
//
// done зовётся ровно один раз — когда слово дозвучало, оборвано или не
// прозвучало вовсе: по нему кроссворд читает следующее решённое слово.

import { playTts, playUrl, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

const SPEED = 0.95
// Некоторые движки синтеза так и не присылают onend (прототип ждал так же).
const DEVICE_GIVE_UP_MS = 4000

function speakDevice(text, rate, done) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return done()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = rate || SPEED
    u.onend = done
    u.onerror = done
    synth.cancel()
    synth.speak(u)
    setTimeout(done, DEVICE_GIVE_UP_MS)
  } catch {
    done()
  }
}

function speakTts(text, rate, done) {
  playTts(text, {
    voice: VOICE.gb,
    lang: 'en',
    speed: SPEED,
    // «Звук» в кроссворде просит 0.9 — темп на устройстве, адрес синтеза один на слово (кэш).
    rate: rate && rate < 1 ? rate / SPEED : undefined,
    onEnd: done,
    onCancel: done,
    onFail: (why) => (why === 'empty' ? done() : speakDevice(text, rate, done)),
  })
}

/** cfg.say движка: { text, url, rate, done }. */
export function sayWord({ text, url, rate, done = () => {} }) {
  let fin = false
  const end = () => {
    if (fin) return
    fin = true
    done()
  }
  if (url) {
    playUrl(url, { rate: rate || 1, onEnd: end, onCancel: end, onFail: () => speakTts(text, rate, end) })
    return
  }
  speakTts(text, rate, end)
}

/** Замолчать: и общий <audio> (записи, Soniox), и запасной голос устройства — на уходе из раздела. */
export function stopWords() {
  stopTts()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* нет синтеза — молча */
  }
}
