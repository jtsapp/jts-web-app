// Единая точка «преподаватель сейчас слушает эфир живого урока» — и словарные
// карточки/вопросы на слух (practice/vocab/audio.js), и плеер уроков
// (learning/CourseStepPlayer.jsx), и настоящие <audio> из разметки (InfoBlock)
// зовут reportAudio при каждом проигрывании. LiveLessonPage подписывает сюда
// sendAudio на время урока (см. useLessonLiveSocket) и снимает подписку при
// выходе. Вне живого урока (личный Словарь, самостоятельное «Обучение») ничего
// не подписано — вызов молча ничего не делает.
let reporter = null

export function setAudioReporter(fn) {
  reporter = fn
}

export function reportAudio(payload) {
  reporter?.(payload)
}

// Обратное направление: преподаватель транслирует аудио всему классу
// ("Транслировать классу"), ученик проигрывает у себя. Синтез — напрямую
// через speechSynthesis, а не через practice/vocab/audio.js speak(): тот сам
// зовёт reportAudio при каждом произнесении, и трансляция учителя вернулась
// бы обратно как «ученик тоже слушает» — тот самый цикл, которого тут не
// должно быть (см. reportAudio выше).
let broadcastAudioEl = null
// Поколение трансляции — тот же приём, что sampleSeq в lib/ielts-audio.js:
// элемент один на все трансляции, и вторая, ставя паузу первой, получает от неё
// AbortError уже ПОСЛЕ своего старта. Без счётчика обработчик отменённой
// трансляции сообщал бы «заблокировано» про ту, что как раз играет.
let broadcastSeq = 0
let ttsWatchdog = null

// 5 мс тишины (WAV, 8 кГц моно). Разблокировать можно только элемент С
// источником: play() на пустом Audio браузер отклоняет (NotSupportedError) ещё
// до старта и разрешения не выдаёт. Класть ради этого файл в статику незачем —
// тут сорок нулевых сэмплов.
const SILENCE_WAV =
  'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

// speechSynthesis.speak() ничего не возвращает, а отказ без жеста в части версий
// Safari не приходит даже в onerror — синтез просто не начинается. Поэтому ждём
// onstart: не дождались за это время — считаем, что отказали. Секунда с лишним,
// а не пара сотен миллисекунд: на первой реплике браузер ещё грузит голоса.
const TTS_START_GRACE_MS = 1200

/**
 * Снять запрет на звук заранее — на настоящем жесте входа в урок.
 *
 * На iOS Safari разрешение играть выдаётся ЖЕСТОМ и КОНКРЕТНОМУ <audio>, а
 * трансляция приходит сокет-событием, когда жеста нет ни одного. Поэтому у
 * трансляции один переиспользуемый элемент, «прогретый» здесь: дальше ему
 * меняется только src, а разрешение остаётся при нём.
 *
 * Зовётся СИНХРОННО из обработчика нажатия «Присоединиться к уроку» (App.jsx):
 * любой await перед play() съедает жест — то же ограничение, из-за которого в
 * lib/ielts-audio.js элемент создаётся до похода в сеть.
 *
 * Повторный вход безопасен: играть заново нечего, элемент и разрешение уже есть.
 */
export function unlockBroadcastAudio() {
  if (typeof window === 'undefined') return
  try {
    if (!broadcastAudioEl) broadcastAudioEl = new Audio()
    // Тишину ставим ТОЛЬКО пока элемент пуст: перебить ею уже играющую
    // трансляцию значило бы оборвать урок ради разблокировки.
    if (!broadcastAudioEl.dataset.url) {
      broadcastAudioEl.src = SILENCE_WAV
      broadcastAudioEl.play()?.then(() => broadcastAudioEl?.pause()).catch(() => {})
    }
  } catch {
    /* звук — не то, ради чего стоит не пустить ученика в урок */
  }
  // Синтез разрешается ОТДЕЛЬНО от <audio> и тоже только жестом. Пустая реплика
  // на нулевой громкости не звучит, но снимает запрет.
  try {
    if (window.speechSynthesis && typeof SpeechSynthesisUtterance === 'function') {
      const warm = new SpeechSynthesisUtterance(' ')
      warm.volume = 0
      window.speechSynthesis.speak(warm)
    }
  } catch {
    /* браузер без синтеза — трансляция файлом всё равно сыграет */
  }
}

/**
 * @param {object} evt событие трансляции с сокета
 * @param {{ onStarted?: () => void, onBlocked?: (evt: object) => void }} [handlers]
 *   onBlocked — браузер отказал (жеста не было): вызывающему надо показать
 *   кнопку «Включить звук», а не молчать. Раньше отказ глушился через
 *   .catch(() => {}) и выглядел как «преподаватель ничего не включал».
 */
export function playBroadcastAudio(evt, { onStarted, onBlocked } = {}) {
  if (!evt) return
  if (evt.action === 'stop') {
    stopBroadcastAudio()
    return
  }
  const seq = ++broadcastSeq
  const stale = () => seq !== broadcastSeq
  if (evt.kind === 'tts' && evt.text) {
    stopBroadcastAudio()
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(evt.text)
    u.lang = evt.accent === 'GB' ? 'en-GB' : 'en-US'
    u.onstart = () => {
      if (stale()) return
      clearTimeout(ttsWatchdog)
      onStarted?.()
    }
    u.onerror = () => {
      if (stale()) return
      clearTimeout(ttsWatchdog)
      onBlocked?.(evt)
    }
    clearTimeout(ttsWatchdog)
    ttsWatchdog = setTimeout(() => {
      if (stale()) return
      window.speechSynthesis?.cancel()
      onBlocked?.(evt)
    }, TTS_START_GRACE_MS)
    window.speechSynthesis.speak(u)
  } else if (evt.kind === 'file' && evt.url) {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    // Ту же дорожку НЕ перематываем в начало: «слушать вместе» — это
    // остановиться там, где непонятно, разобрать и поехать дальше. Место берём
    // от преподавателя (evt.position), а не от своего элемента: пауза на его
    // стороне и наша могли разъехаться на пару секунд сети.
    //
    // Новый Audio() на смену дорожки НЕ создаём: разрешение на iOS выдано
    // конкретному элементу (unlockBroadcastAudio), и свежесозданный молчал бы
    // намертво. Меняем источник у того же.
    if (!broadcastAudioEl) broadcastAudioEl = new Audio()
    if (broadcastAudioEl.dataset.url !== evt.url) {
      broadcastAudioEl.pause()
      broadcastAudioEl.src = evt.url
      broadcastAudioEl.dataset.url = evt.url
    }
    seekTo(broadcastAudioEl, evt.position)
    broadcastAudioEl
      .play()
      .then(() => {
        if (!stale()) onStarted?.()
      })
      .catch(() => {
        // Нас прервала следующая трансляция — это норма, а не отказ браузера.
        if (!stale()) onBlocked?.(evt)
      })
  }
}

/**
 * Перемотка до места преподавателя. Пока метаданные не пришли, currentTime
 * задать нельзя — браузер молча его проглотит, и дорожка пошла бы с начала.
 */
function seekTo(el, position) {
  const at = Number(position)
  if (!Number.isFinite(at) || at < 0) return
  if (el.readyState > 0) {
    el.currentTime = at
    return
  }
  el.addEventListener('loadedmetadata', () => { el.currentTime = at }, { once: true })
}

/**
 * Остановка не забывает дорожку: следующий «play» от преподавателя продолжит с
 * его места, а не начнёт заново. Элемент отпускаем при выходе из урока
 * (releaseBroadcastAudio).
 */
export function stopBroadcastAudio() {
  clearTimeout(ttsWatchdog)
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  broadcastAudioEl?.pause()
}

/** Урок закрыт — дорожку больше не держим. */
export function releaseBroadcastAudio() {
  stopBroadcastAudio()
  broadcastAudioEl = null
}
