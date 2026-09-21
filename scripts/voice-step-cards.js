// Озвучка немых карточек, слов «Listen. Choose the word you hear» и фраз
// «Послушайте и повторите» в готовых шагах курса
// (public/course/<level>/steps-*.json).
//
// make-lesson-audio.js собирает слова из ИСХОДНИКА курса (VOCAB в lesson-<n>.json
// и public/learning/<level>.json), а шаги A0–B2 теперь режет экстрактор нового
// поколения из файла уровня, которого в репозитории нет. Слова в карточках
// шагов с исходником не совпадают, и генератор отвечал «нечего генерировать»,
// хотя 331 карточка оставалась немой (озвучивал их браузерный синтез — на
// Android без английского голоса кнопка просто молчала). Этот скрипт идёт от
// самих шагов: что студент видит, то и озвучивается.
//
// Файлы — те же, что у make-lesson-audio.js: public/learning/audio/<level>/
// <sha1 текста>.mp3 тем же голосом (Soniox, Owen, 0.85). Одно слово звучит
// одинаково на карточке и в задании на слух, а экстрактор при следующем
// прогоне найдёт файл по тому же хэшу сам.
//
//   node scripts/voice-step-cards.js --dry           # показать план
//   node scripts/voice-step-cards.js                 # озвучить и прописать
//   node scripts/voice-step-cards.js --level a1
//
// Ключ SONIOX_API_KEY — из .env.local в корне дерева (см. make-lesson-audio.js).
const fs = require('node:fs')
const path = require('node:path')
const { sayAudioFile, sayAudioUrl } = require('./jts-self/say-audio')
const { synthesizeSoniox, sleep, loadEnv, SONIOX_GAP_MS } = require('./make-lesson-audio')
const { strip } = require('./lib/html-text.js')

const ROOT = path.join(__dirname, '..')
const COURSE = path.join(ROOT, 'public/course')
const AUDIO = path.join(ROOT, 'public/learning/audio')

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const ONLY = args.includes('--level') ? args[args.indexOf('--level') + 1] : null

const stepFiles = (level) =>
  fs.readdirSync(path.join(COURSE, level)).filter((f) => /^steps-.*\.json$/.test(f)).sort()

// Что произносить. Пары на карточках пишутся через разделитель («loose / lose»,
// «employer — employee»), и синтез читал бы «slash» — вслух это пауза между
// словами. Имя файла при этом остаётся хэшем ИСХОДНОГО текста: по нему
// карточку находят плеер и экстрактор.
//
// Фразы B1 бывают размечены («<b>On the phone:</b> I understand that… · Could
// you tell me…?»): теги синтез прочитал бы вслух, а «·» — граница реплик, то
// есть пауза. Точку добавляем, только если реплика не закончилась своим знаком.
const speakable = (text) =>
  strip(String(text))
    .replace(/([.!?…])?\s*·\s*/g, (m, end) => (end ? `${end} ` : '. '))
    .replace(/\s*[/—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

/** Что озвучить на уровне: немые карточки и say без записи. */
function plan(level) {
  const texts = new Map()
  for (const f of stepFiles(level)) {
    const { steps = [] } = JSON.parse(fs.readFileSync(path.join(COURSE, level, f), 'utf8'))
    for (const s of steps) {
      if (s.type === 'cards') for (const w of s.words || []) if (!w.audio && w.en) texts.set(sayAudioFile(w.en), w.en)
      if (s.type === 'choice' && s.say && !s.sayTrack) texts.set(sayAudioFile(s.say), s.say)
      if (s.type === 'phrases') for (const it of s.items || []) if (!it.src && it.text) texts.set(sayAudioFile(it.text), it.text)
    }
  }
  return [...texts].map(([file, text]) => ({ file, text, have: fs.existsSync(path.join(AUDIO, level, file)) }))
}

/** Прописать ссылки на записи, которые теперь лежат на диске. */
function link(level) {
  let changed = 0
  for (const f of stepFiles(level)) {
    const p = path.join(COURSE, level, f)
    const raw = fs.readFileSync(p, 'utf8')
    const data = JSON.parse(raw)
    let touched = false
    const onDisk = (text) => fs.existsSync(path.join(AUDIO, level, sayAudioFile(text)))
    for (const s of data.steps || []) {
      if (s.type === 'cards') {
        for (const w of s.words || []) {
          if (!w.audio && w.en && onDisk(w.en)) {
            w.audio = sayAudioUrl(level, w.en)
            touched = true
            changed++
          }
        }
      }
      if (s.type === 'choice' && s.say && !s.sayTrack && onDisk(s.say)) {
        s.sayTrack = sayAudioUrl(level, s.say)
        touched = true
        changed++
      }
      if (s.type === 'phrases') {
        for (const it of s.items || []) {
          if (!it.src && it.text && onDisk(it.text)) {
            it.src = sayAudioUrl(level, it.text)
            touched = true
            changed++
          }
        }
      }
    }
    // Форматирование файла сохраняем как было: иначе дифф на весь файл.
    if (touched) {
      const indent = /^\{\r?\n( +)/.exec(raw)?.[1]?.length || 0
      const eol = raw.includes('\r\n') ? '\r\n' : '\n'
      let out = JSON.stringify(data, null, indent || undefined)
      if (eol === '\r\n') out = out.replace(/\n/g, '\r\n')
      if (/\r?\n$/.test(raw)) out += eol
      fs.writeFileSync(p, out)
    }
  }
  return changed
}

async function run() {
  loadEnv()
  const levels = fs.readdirSync(COURSE).filter((d) => fs.statSync(path.join(COURSE, d)).isDirectory())
  for (const level of levels.filter((l) => !ONLY || l === ONLY)) {
    const todo = plan(level)
    const missing = todo.filter((t) => !t.have)
    console.log(`${level}: ${todo.length} текстов без ссылки, из них без файла ${missing.length}`)
    if (DRY) {
      for (const t of missing.slice(0, 5)) console.log(`  ${t.file}  ${t.text}`)
      continue
    }
    fs.mkdirSync(path.join(AUDIO, level), { recursive: true })
    for (const [i, t] of missing.entries()) {
      const buf = await synthesizeSoniox(speakable(t.text))
      fs.writeFileSync(path.join(AUDIO, level, t.file), buf)
      console.log(`  [${i + 1}/${missing.length}] ${t.file}  ${t.text}  ${buf.length} Б`)
      await sleep(SONIOX_GAP_MS)
    }
    console.log(`${level}: прописано ссылок ${link(level)}`)
  }
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = { plan, link }
