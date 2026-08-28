// Привязка сгенерированных записей (scripts/make-lesson-audio.js) к заданиям
// нативного уровня.
//
// Жила внутри extract-jts-self-lessons.js, но экстрактору нужен исходный html
// уровня (a1.html — 257 МБ), а привязке — только папка с mp3. Из-за этого
// прогон «сгенерировали слова → пересобрали шаги» однажды обошёл
// public/learning/a1.json стороной: записи легли на диск, шаги курса
// пересобрались, а уроки A1 (они рендерятся как раз из нативного json)
// остались с браузерным синтезом на все 452 слова. Отдельный модуль нужен,
// чтобы ту же привязку можно было прогнать без исходника — см.
// scripts/link-lesson-audio.js.
const fs = require('node:fs')
const path = require('node:path')
const { sayAudioFile, sayAudioUrl } = require('./say-audio')

const AUDIO_DIR = path.join(__dirname, '..', '..', 'public/learning/audio')

/**
 * Проставляет заданиям ссылки на записи, которые уже лежат в
 * public/learning/audio/<level>/. Привязка по хэшу самого текста: экстрактор
 * гоняют заново после каждой правки курса, и любая привязка по номеру урока
 * разъехалась бы на первой вставке нового задания. Записи нет — задание просто
 * остаётся текстовым, как и было.
 *
 * Идемпотентна: повторный прогон ничего не меняет.
 *
 * @returns {{words:number, choice:number, info:number}} сколько ссылок стоит после прогона
 */
function attachNarration(tasks, level) {
  const audioFor = (text) => {
    const word = String(text || '').trim()
    if (!word) return null
    return fs.existsSync(path.join(AUDIO_DIR, level, sayAudioFile(word))) ? sayAudioUrl(level, word) : null
  }

  const linked = { words: 0, choice: 0, info: 0 }
  for (const task of tasks) {
    // Связный кусок материала: экран слушания.
    if (task.type === 'info' && task.say) {
      const url = audioFor(task.say)
      if (url) task.track = url
      if (task.track) linked.info++
      continue
    }
    // Слово на слух («Listen. Choose the word you hear.») и слова карточек
    // словаря — один и тот же файл на одно и то же слово. Иначе задание
    // проверяло бы не память, а способность узнать другой голос.
    if (task.type === 'choice' && task.say) {
      const url = audioFor(task.say)
      if (url) task.sayTrack = url
      if (task.sayTrack) linked.choice++
      continue
    }
    if (task.type === 'cards') {
      for (const word of task.words || []) {
        const url = audioFor(word.en)
        if (url) word.audio = url
        if (word.audio) linked.words++
      }
    }
  }
  return linked
}

module.exports = { attachNarration, AUDIO_DIR }
