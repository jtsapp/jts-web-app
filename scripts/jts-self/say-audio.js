// Имена файлов озвучки уроков.
//
// Исходный курс не возил с собой записи для части заданий: текст лежал в
// атрибуте data-say, а читало его устройство браузерным синтезом («Read aloud
// by your device»). У нас такие задания оставались немыми. Записи генерируются
// один раз (scripts/make-lesson-audio.js) и лежат в репозитории, а привязка
// «текст → файл» держится на хэше самого текста: экстрактор гоняют заново
// после каждой правки курса, и любая привязка по номеру урока или порядку
// заданий разъехалась бы на первой же вставке нового задания.
const crypto = require('node:crypto')

const AUDIO_URL_BASE = '/learning/audio'

/** Ключ текста: он же имя файла. Пробелы и регистр не считаем значимыми. */
function sayAudioSlug(text) {
  const norm = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return crypto.createHash('sha1').update(norm).digest('hex').slice(0, 12)
}

const sayAudioFile = (text) => `${sayAudioSlug(text)}.mp3`
const sayAudioUrl = (level, text) => `${AUDIO_URL_BASE}/${level}/${sayAudioFile(text)}`

module.exports = { sayAudioSlug, sayAudioFile, sayAudioUrl, AUDIO_URL_BASE }
