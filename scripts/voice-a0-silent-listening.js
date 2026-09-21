// Записи для четырёх шагов «Аудирования» A0, у которых в данных нет звука.
//
// В уроках 21 и 24 вопрос на слух и следующее за ним «Послушайте. Дополните…»
// выгрузились с src: null: кнопка молчала, а ответ шёл в зачёт наугад. Штатный
// путь для таких мест — правка `say` в scripts/selfstudy/clip-fixes.js, но она
// адресует клип по ключу из исходного файла курса (f3, t13…), а исходника в
// репозитории нет. Поэтому запись собирается здесь, по тексту самих заданий, и
// прописывается прямо в шаги. При следующей выгрузке курса эти четыре места
// надо перенести в clip-fixes.js (ключ клипа будет виден в исходнике), иначе
// экстрактор снова поставит src: null.
//
// Текст взят из заданий, а не придуман сверху: вопрос урока 21 — «Что
// происходит прямо сейчас?» (ответ «It's raining.»), пропуск — «It's ___ right
// now.»; вопрос урока 24 — «Зачем человек путешествует?» (ответ «on holiday»),
// пропуск — «— Where are you from? — I'm ___ Kazakhstan.».
//
//   node scripts/voice-a0-silent-listening.js
//
// Ключ SONIOX_API_KEY — из .env.local (см. make-lesson-audio.js).
const fs = require('node:fs')
const path = require('node:path')
const { sayAudioFile, sayAudioUrl } = require('./jts-self/say-audio')
const { synthesizeSoniox, sleep, loadEnv, SONIOX_GAP_MS } = require('./make-lesson-audio')

const ROOT = path.join(__dirname, '..')
const LEVEL = 'a0'

// Реплики: [голос, текст]. Диалог — двумя голосами, иначе на слух не понять,
// где вопрос, а где ответ. Темп — как у материала урока (0.85).
const CLIPS = [
  {
    steps: [['steps-21.json', 26], ['steps-21.json', 27]],
    lines: [['Grace', "Look! It's raining right now."]],
  },
  {
    steps: [['steps-24.json', 28], ['steps-24.json', 29]],
    lines: [
      ['Noah', 'Hi! Where are you from?'],
      ['Grace', "I'm from Kazakhstan."],
      ['Noah', 'Are you here on business?'],
      ['Grace', "No, I'm here on holiday."],
    ],
  },
]

// Файлы шагов однострочные — пишем тем же видом, чтобы дифф был в одно поле.
function patchStep(file, index, src) {
  const p = path.join(ROOT, 'public/course', LEVEL, file)
  const raw = fs.readFileSync(p, 'utf8')
  const data = JSON.parse(raw)
  const step = data.steps[index]
  if (!step || !/^Послушайте/.test(step.title || '')) throw new Error(`${file}#${index}: не тот шаг — ${step && step.title}`)
  if (step.src && step.src !== src) throw new Error(`${file}#${index}: у шага уже есть запись ${step.src}`)
  step.src = src
  fs.writeFileSync(p, JSON.stringify(data) + (/\n$/.test(raw) ? '\n' : ''))
}

async function run() {
  loadEnv()
  for (const clip of CLIPS) {
    const text = clip.lines.map(([, line]) => line).join(' ')
    const out = path.join(ROOT, 'public/learning/audio', LEVEL, sayAudioFile(text))
    if (!fs.existsSync(out)) {
      const parts = []
      for (const [voice, line] of clip.lines) {
        parts.push(await synthesizeSoniox(line, { voice, speed: 0.85 }))
        await sleep(SONIOX_GAP_MS)
      }
      // MP3 одного кодировщика склеивается побайтно: кадры независимы.
      fs.writeFileSync(out, Buffer.concat(parts))
      console.log(`записано ${path.basename(out)}  «${text}»`)
    }
    for (const [file, index] of clip.steps) patchStep(file, index, sayAudioUrl(LEVEL, text))
  }
  console.log('шаги прописаны')
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
