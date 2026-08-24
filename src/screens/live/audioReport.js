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
    stopBroadcastAudio()
    broadcastAudioEl = new Audio(evt.url)
    broadcastAudioEl.play().catch(() => {})
  }
}

export function stopBroadcastAudio() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  broadcastAudioEl?.pause()
  broadcastAudioEl = null
}
