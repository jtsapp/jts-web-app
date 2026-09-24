// Озвучка немых карточек, слов «Listen. Choose the word you hear», фраз
// «Послушайте и повторите» и образцов «послушайте, затем запишите себя»
// (шаг record) в готовых шагах курса (public/course/<level>/steps-*.json).
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
const { mp3Frames } = require('./selfstudy/cut-clip')
const { isFrame } = require('./lib/course-frame')

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
//
// Образцы record у B1 — рамки для своего ответа, и в них то же самое: «→»
// разделяет вопрос и начало его косвенной формы («What time does the museum
// close? → Could you tell me…?»), а «(pause)» — ремарка «помолчите», а не
// слово.
const speakable = (text) =>
  strip(String(text))
    .replace(/\(pause\)/gi, '…')
    .replace(/([.!?…])?\s*[·→]\s*/g, (m, end) => (end ? `${end} ` : '. '))
    .replace(/\s*[/—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

// Образцы шага record («послушайте, затем запишите себя») — строки, и
// записи к ним кладутся параллельным массивом s.itemAudio (тот же индекс,
// null — записи нет). Не объектом { text, src } в items: плеер до recordLine
// на объекте ПАДАЕТ («Objects are not valid as a React child»), а вкладка со
// старым бандлом качает свежие шаги. Объекты, которыми данные недолго
// писались, при простановке ссылок разворачиваются обратно в строки.

/** Образец record → { text, src } с учётом itemAudio. */
const recordLine = (it, audio = null) =>
  it && typeof it === 'object' ? { text: String(it.text ?? ''), src: it.src || audio || null } : { text: String(it ?? ''), src: audio || null }
const recordLines = (s) => (s.items || []).map((it, i) => recordLine(it, s.itemAudio?.[i]))

// Строки record у B1 больше чем наполовину — не образцы, а задания по-русски
// («Одно в Present Simple: как часто вы встречаетесь с друзьями»): студент их
// читает, а говорит своё. Английский голос прочёл бы кириллицу мусором, поэтому
// озвучиваются только английские строки, а задание плеер показывает текстом.
const CYRILLIC = /\p{Script=Cyrillic}/u
const isSample = (text) => !!text && !CYRILLIC.test(String(text))

// Синтез не детерминирован и изредка срывается в бормотание: рамка B1 из 11
// слов «The school I went to … . There was a … , and the … was … .» вышла
// записью на 23 с («…there was a—was a—was was—om. NTC»), а тот же текст
// повторно — на 5 с. Живая речь Owen на 0.85 — около 0.4 с на слово, рамки с
// паузами — до 1 с, поэтому запись длиннее «1.2 с на слово + 4 с» — брак:
// такую переспрашиваем, а не кладём в урок. Короче 0.1 с на слово — тоже брак
// (тишина или обрезок): у 435 записей образцов меньше 0.21 не бывает.
const MAX_TRIES = 3
const wordCount = (text) => String(text).split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
const tooLong = (text, seconds) => seconds > wordCount(text) * 1.2 + 4
const tooShort = (text, seconds) => seconds < wordCount(text) * 0.1

/**
 * Запись текста — или null, если синтез срывался все попытки подряд.
 * synth и gapMs подменяются в тесте.
 */
async function synthesizeChecked(text, { synth = synthesizeSoniox, gapMs = SONIOX_GAP_MS } = {}) {
  for (let i = 1; i <= MAX_TRIES; i++) {
    const buf = await synth(speakable(text))
    let seconds = null
    try {
      seconds = mp3Frames(buf).duration
    } catch {
      // Ответ не разобрался как MP3 — та же неудачная попытка, а не падение
      // всего прогона на середине уровня.
    }
    if (seconds !== null && !tooLong(text, seconds) && !tooShort(text, seconds)) return buf
    const what = seconds === null ? 'не MP3' : `${seconds.toFixed(1)} с`
    console.warn(`  ! ${what} на «${text}» — синтез сорвался, попытка ${i}/${MAX_TRIES}`)
    if (i < MAX_TRIES) await sleep(gapMs)
  }
  return null
}

/**
 * Что озвучить на уровне: немые карточки, say, фразы и образцы record без
 * записи. Рамки с пропуском «…» — нет: синтез читает их кашей
 * (lib/course-frame.js), и немота у них намеренная.
 */
function plan(level) {
  const texts = new Map()
  const want = (text) => text && !isFrame(text)
  for (const f of stepFiles(level)) {
    const { steps = [] } = JSON.parse(fs.readFileSync(path.join(COURSE, level, f), 'utf8'))
    for (const s of steps) {
      if (s.type === 'cards') for (const w of s.words || []) if (!w.audio && want(w.en)) texts.set(sayAudioFile(w.en), w.en)
      if (s.type === 'choice' && s.say && !s.sayTrack && want(s.say)) texts.set(sayAudioFile(s.say), s.say)
      if (s.type === 'phrases') for (const it of s.items || []) if (!it.src && want(it.text)) texts.set(sayAudioFile(it.text), it.text)
      if (s.type === 'record') {
        for (const line of recordLines(s)) if (!line.src && isSample(line.text) && want(line.text)) texts.set(sayAudioFile(line.text), line.text)
      }
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
    // Рамку не пропишем, даже если файл где-то остался: её немота намеренная.
    const onDisk = (text) => !isFrame(text) && fs.existsSync(path.join(AUDIO, level, sayAudioFile(text)))
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
      if (s.type === 'record') {
        const lines = recordLines(s)
        const audio = lines.map((line) => line.src || (isSample(line.text) && onDisk(line.text) ? sayAudioUrl(level, line.text) : null))
        const wasObjects = (s.items || []).some((it) => it && typeof it === 'object')
        const added = audio.filter((a, i) => a && a !== (s.itemAudio?.[i] ?? null)).length
        if (wasObjects || added) {
          s.items = lines.map((line) => line.text)
          if (audio.some(Boolean)) s.itemAudio = audio
          else delete s.itemAudio
          touched = true
          changed += added
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
    let skipped = 0
    for (const [i, t] of missing.entries()) {
      const buf = await synthesizeChecked(t.text)
      // Файла нет — нет и ссылки: образец останется на синтезе браузера, а
      // сторож courseAudioCoverage.test.js покажет его в списке.
      if (!buf) {
        skipped++
        console.warn(`  [${i + 1}/${missing.length}] ПРОПУЩЕНО ${t.file}  ${t.text}`)
        continue
      }
      fs.writeFileSync(path.join(AUDIO, level, t.file), buf)
      console.log(`  [${i + 1}/${missing.length}] ${t.file}  ${t.text}  ${buf.length} Б`)
      await sleep(SONIOX_GAP_MS)
    }
    console.log(`${level}: прописано ссылок ${link(level)}${skipped ? `, пропущено ${skipped} — синтез срывался` : ''}`)
  }
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = { plan, link, isSample, speakable, tooLong, tooShort, synthesizeChecked }
