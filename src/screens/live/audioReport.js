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

export function playBroadcastAudio(evt) {
  if (!evt) return
  if (evt.action === 'stop') {
    stopBroadcastAudio()
    return
  }
  if (evt.kind === 'tts' && evt.text) {
    stopBroadcastAudio()
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(evt.text)
    u.lang = evt.accent === 'GB' ? 'en-GB' : 'en-US'
    window.speechSynthesis.speak(u)
  } else if (evt.kind === 'file' && evt.url) {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    // Ту же дорожку НЕ пересоздаём: «слушать вместе» — это остановиться там, где
    // непонятно, разобрать и поехать дальше, а новый Audio() всегда начинал бы с
    // нуля. Место берём от преподавателя (evt.position), а не от своего элемента:
    // пауза на его стороне и наша могли разъехаться на пару секунд сети.
    if (!broadcastAudioEl || broadcastAudioEl.dataset.url !== evt.url) {
      broadcastAudioEl?.pause()
      broadcastAudioEl = new Audio(evt.url)
      broadcastAudioEl.dataset.url = evt.url
    }
    seekTo(broadcastAudioEl, evt.position)
    broadcastAudioEl.play().catch(() => {})
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
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  broadcastAudioEl?.pause()
}

/** Урок закрыт — дорожку больше не держим. */
export function releaseBroadcastAudio() {
  stopBroadcastAudio()
  broadcastAudioEl = null
}
