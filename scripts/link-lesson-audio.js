// Привязка уже сгенерированных записей к нативным урокам «Обучения».
//
// Уроки A0/A1 рендерятся из public/learning/<level>.json (KingdomInteriorPage
// зовёт nativeLessonSteps, а не steps-<n>.json курса), и ссылку на mp3 туда
// ставит экстрактор — но ему нужен исходный html уровня на 257 МБ, которого
// на машине обычно нет. Из-за этого 25.08 прогон «слова A1/A2/B1 звучат»
// пересобрал шаги курса и обошёл нативный json стороной: 452 записи легли на
// диск, а карточки A1 остались с браузерным синтезом.
//
// Скрипт делает ровно один шаг того прогона — привязку — и ему хватает папки
// public/learning/audio/<level>/. Идемпотентен: если всё уже привязано, файл
// не переписывается.
//
// Запуск:
//   node scripts/link-lesson-audio.js            # a0 и a1
//   node scripts/link-lesson-audio.js --level a1
//   node scripts/link-lesson-audio.js --dry      # только показать
const fs = require('node:fs')
const path = require('node:path')
const { attachNarration } = require('./jts-self/attach-audio')

const LEARNING = path.join(__dirname, '..', 'public/learning')
// Только уровни, чей урок собирается из нативных данных (STEP_LEVELS в
// src/learning/nativeSteps.js). У A2/B1/B2 json тоже лежит, но это старый
// Speakout, который сайт не показывает, — трогать его незачем.
const LEVELS = ['a0', 'a1']

function parseArgs() {
  const argv = process.argv.slice(2)
  const at = argv.indexOf('--level')
  return { levels: at >= 0 && argv[at + 1] ? [argv[at + 1]] : LEVELS, dry: argv.includes('--dry') }
}

function linkLevel(level, { dry = false } = {}) {
  const file = path.join(LEARNING, `${level}.json`)
  if (!fs.existsSync(file)) return { level, skipped: 'нет файла' }

  const before = fs.readFileSync(file, 'utf8')
  const data = JSON.parse(before)
  const total = { words: 0, choice: 0, info: 0 }
  for (const lesson of Object.values(data.lessons || {})) {
    const n = attachNarration(lesson.tasks || [], level)
    total.words += n.words
    total.choice += n.choice
    total.info += n.info
  }

  // Форматирование как у экстрактора: он пишет JSON.stringify без отступов.
  const after = JSON.stringify(data)
  const changed = after !== before
  if (changed && !dry) fs.writeFileSync(file, after)
  return { level, ...total, changed }
}

function run() {
  const { levels, dry } = parseArgs()
  for (const level of levels) {
    const r = linkLevel(level, { dry })
    if (r.skipped) {
      console.log(`${r.level}: ${r.skipped}`)
      continue
    }
    const state = r.changed ? (dry ? 'изменится' : 'записан') : 'без изменений'
    console.log(`${r.level}: слова ${r.words}, choice.say ${r.choice}, info.say ${r.info} — ${state}`)
  }
}

if (require.main === module) run()

module.exports = { linkLevel, LEVELS }
