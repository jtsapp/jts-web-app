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
