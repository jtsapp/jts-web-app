'use client'

// Озвучка Tenses World: кнопка «Listen» после ответа читает предложение
// задания. Прототип читал его синтезом браузера (британский голос, темп 0.92),
// а на Windows и Android это робот или русский голос. Правило то же, что у
// Pronunciation World, и код тот же: британский Soniox через /api/tts (темп 0.9 —
// 0.92 Soniox всё равно округлил бы до 0.9), голос устройства — только если
// сервер не ответил; onEnd — ровно один раз, и когда звука не было вовсе.
// Своего модуля не заводим: второй копии правила «Soniox → голос устройства»
// разъезжаться не с чем.

export { speakPronunciation as speakTenses, stopPronunciation as stopTenses } from '../pronunciation/voice.js'
