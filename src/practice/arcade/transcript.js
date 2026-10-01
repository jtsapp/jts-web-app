// Распознавание речи рядом с порогом громкости. Две работы сразу: решает, считать ли кадр
// речью (пилу отгоняют только СЛОВА), и копит стенограмму раунда для окна
// «Анализ» и ИИ-разбора.
//
// Распознаёт браузер (Web Speech API). Звук мы не записываем и никуда не шлём;
// стенограмма живёт в памяти и уходит на сервер, только если ученик сам нажал
// «ИИ-разбор». В Firefox распознавателя нет — тогда `startTranscript`
// возвращает null, и игра держится на одном пороге громкости. В Safari он
// есть (через Siri), а в Opera GX есть, но немой — см. START_TIMEOUT.

import { buildTranscript, chunks, hasWords, LATENCY } from './speechSegments.js'
import { createSteadinessTracker, STEADY } from './voiceFeatures.js'
import { ONSET_MS, RELEASE_MS } from './voiceActivity.js'

// Секунды. Распознанные слова держат голос «осмысленным» WORD_HOLD после
// последнего обновления. Новому отрезку голоса верим ONSET_GRACE, если в
// прошлом были слова, а самому первому в раунде — START_GRACE: распознаватель
// отвечает с задержкой, и её прощаем, а мычание — нет. После замеченной
// заминки засчитываются только слова, пришедшие позже неё.
export const WORD_HOLD = 1.2
export const ONSET_GRACE = 0.8
export const START_GRACE = 2

// Распознаватель, который есть, но не работает. Opera GX отдаёт
// webkitSpeechRecognition, принимает start() — и дальше тишина: ни старта, ни
// слов, ни ошибки; Edge на стенде стартовал, но слал пустые результаты. Без
// ошибки игра ждала слов вечно и считала весь раунд тишиной. Поэтому не верим
// наличию объекта, а проверяем поведение: нет события start за START_TIMEOUT
// после start() — или раунд ни разу не дал слов за SILENT_VOICE секунд голоса
// (без «э-э-э», иначе мычанием включался бы счёт по громкости), — значит,
// распознавания нет, и дальше решает порог громкости, как в Firefox.
export const START_TIMEOUT = 2
export const SILENT_VOICE = 4

// Причины отказа распознавателя → код для словаря (arcade.note.*).
const REASONS = {
  'not-allowed': 'blocked',
  'service-not-allowed': 'blocked',
  network: 'network',
  'audio-capture': 'audio',
}
// Код «распознаватель молчит» — для словаря (arcade.note.silent).
export const SILENT = 'silent'

/**
 * Слушает до stop()/abort() и отдаёт стенограмму после каждого изменения.
 * null — распознавателя в браузере нет. `onUnavailable(code)` — распознавание
 * отвалилось посреди раунда (blocked | network | audio | other): дальше решает
 * порог громкости, а голос после сбоя помечается «не распознано».
 * `clock` — та же шкала миллисекунд, что у кадров, приходящих в `sample`.
 */
export function startTranscript(onChange, onUnavailable = () => {}, clock = () => performance.now()) {
  const Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition
  if (!Recognition) return null
  const origin = clock()
  const seconds = (ms) => (ms - origin) / 1000
  const spans = []
  const utterances = []
  const held = createSteadinessTracker()
  // Отрезок голоса в работе. Высоту судим только по кадрам у его пика, чтобы
  // тихий хвост отпускания порога её не размывал.
  let open = null
  let spanHadWords = false
  let trustNextSpan = true
  let lastClosedAt = -Infinity
  let graceUntil = -Infinity
  let lastWordAt = -Infinity
  let hesitatedAt = -Infinity
  let isHesitating = false
  let failedAt = null
  let endedAt = null
  let listening = true
  // Сторож немого распознавателя: когда звали start(), пришёл ли старт, были
  // ли слова в раунде и сколько голоса накопилось без них.
  let startedAt = seconds(clock())
  let alive = false
  let anyWords = false
  let voiceWithoutWords = 0
  let lastSample = null
  // Одна сессия распознавателя: когда впервые пришло каждое накопленное слово,
  // и результаты, ещё не ставшие окончательными.
  let arrivals = []
  let pending = new Map()
  let finalized = new Set()
  const recognizer = new Recognition()
  recognizer.continuous = true
  recognizer.interimResults = true
  recognizer.lang = 'en-US'

  const closeSpan = (end) => {
    if (!open) return
    spans.push({ start: open.start, end: Math.max(open.start, end), voicing: open.frames ? open.pitched / open.frames : 1 })
    trustNextSpan = spanHadWords
    open = null
  }
  const emit = () => {
    const now = endedAt ?? seconds(clock())
    const all = open
      ? [...spans, { start: open.start, end: now, voicing: open.frames ? open.pitched / open.frames : 1 }]
      : spans
    onChange(buildTranscript(all, held.runs, utterances, now, failedAt))
  }
  const fail = (code) => {
    listening = false
    failedAt = seconds(clock())
    onUnavailable(code)
  }
  const begin = () => {
    startedAt = seconds(clock())
    alive = false
    try {
      recognizer.start()
    } catch {
      fail('other')
    }
  }
  // Слово может прийти сразу после того, как его отрезок голоса закрылся.
  const heardWords = (now) => {
    anyWords = true
    lastWordAt = now
    if (open) spanHadWords = true
    else if (now - lastClosedAt <= LATENCY) trustNextSpan = true
  }
  recognizer.onstart = () => {
    alive = true
  }
  recognizer.onresult = (event) => {
    const now = seconds(clock())
    let offset = 0
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i]
      const text = result[0].transcript
      const count = chunks(text).length
      if (i >= event.resultIndex && !finalized.has(i)) {
        while (arrivals.length < offset + count) arrivals.push(now)
        const known = pending.get(i)
        if (text !== known?.text && hasWords(text)) heardWords(now)
        const confidence = result[0].confidence
        const utterance = {
          text,
          confidence: result.isFinal && typeof confidence === 'number' && confidence > 0 ? confidence : null,
          arrivals: arrivals.slice(offset, offset + count),
          heardAt: known?.heardAt ?? now,
          confirmedAt: now,
        }
        if (!result.isFinal) pending.set(i, utterance)
        else {
          pending.delete(i)
          finalized.add(i)
          if (text.trim()) utterances.push(utterance)
        }
      }
      offset += count
    }
    emit()
  }
  // Пауза тишины («no-speech») — обычное дело; любая другая ошибка
  // распознавание заканчивает.
  recognizer.onerror = (event) => {
    if (listening && event.error !== 'no-speech') fail(REASONS[event.error] ?? 'other')
  }
  // Браузер сам завершает распознавание после пауз или примерно минуты —
  // возобновляем, пока раунд идёт. Неподтверждённые слова сохраняем в любом случае.
  recognizer.onend = () => {
    const now = seconds(clock())
    for (const u of pending.values()) if (u.text.trim()) utterances.push({ ...u, confirmedAt: now })
    arrivals = []
    pending = new Map()
    finalized = new Set()
    if (listening) begin()
    emit()
  }
  begin()

  return {
    // Кадр порога громкости (и его акустика, если есть): считать ли его речью.
    sample(voiced, now, features) {
      const t = seconds(now)
      if (voiced && !open) {
        // Порог включается через ONSET_MS после начала голоса.
        open = { start: Math.max(0, t - ONSET_MS / 1000), frames: 0, pitched: 0, peak: 0 }
        spanHadWords = false
        graceUntil = !spans.length ? t + START_GRACE : trustNextSpan ? t + ONSET_GRACE : -Infinity
      }
      if (open && voiced) {
        const level = features?.volume ?? 1
        open.peak = Math.max(open.peak, level)
        if (level >= open.peak / 4) {
          open.frames++
          if (!features || features.clarity >= STEADY.clarity) open.pitched++
        }
      }
      if (!voiced && open) {
        // …и выключается через RELEASE_MS после конца голоса.
        closeSpan(t - RELEASE_MS / 1000)
        lastClosedAt = t
      }
      isHesitating = held.update(voiced && features ? features : null, t)
      if (isHesitating) {
        hesitatedAt = t
        graceUntil = -Infinity
      }
      if (voiced && !isHesitating && !anyWords && lastSample !== null) voiceWithoutWords += t - lastSample
      lastSample = t
      if (failedAt === null && listening && ((!alive && t - startedAt > START_TIMEOUT) || voiceWithoutWords > SILENT_VOICE)) {
        fail(SILENT)
        try {
          recognizer.abort()
        } catch {
          /* уже остановлен */
        }
      }
      // Без распознавателя остаётся только порог громкости.
      if (failedAt !== null) return voiced
      const trusted = (lastWordAt > hesitatedAt && t - lastWordAt <= WORD_HOLD) || (!!open && t <= graceUntil)
      return voiced && !isHesitating && trusted
    },
    // Идёт ли сейчас протяжное «э-э-э».
    hesitating: () => isHesitating,
    // stop() даёт последним словам доехать после раунда; abort() их бросает.
    stop() {
      listening = false
      endedAt = seconds(clock())
      held.finish()
      closeSpan(endedAt)
      emit()
      try {
        recognizer.stop()
      } catch {
        /* уже остановлен */
      }
    },
    abort() {
      listening = false
      endedAt = seconds(clock())
      pending.clear()
      try {
        recognizer.abort()
      } catch {
        /* уже остановлен */
      }
    },
  }
}
