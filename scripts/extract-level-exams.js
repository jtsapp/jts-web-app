// Финальные экзамены уровней «Обучения» из data/jtsexam-<level>.html —
// standalone-тестов методиста (источник правды, правки контента идут туда).
//
// Банк вопросов в прототипе — JavaScript (массивы объектов, диалоги с номерами
// пропусков внутри реплик), поэтому не разбираем его руками, а даём V8 исполнить
// скрипт файла целиком в песочнице node:vm под заглушкой DOM. Целиком — потому
// что советы по навыкам (SKILLS) и сам подсчёт итогов (showResults) лежат в той
// же части, что и рендер: вырезать их по маркерам значило бы копировать логику,
// а она здесь нужна как оракул — порт обязан считать ровно так же.
//
// Запуск: node scripts/extract-level-exams.js
//
// Пишет:
//   public/exam/<level>/exam.json — вопросы для экрана (src/learning/LevelExam.jsx)
//   src/learning/__fixtures__/level-exam-oracle-<level>.json — что показал
//       прототипный showResults на наборах ответов; с ним сверяется
//       src/learning/levelExam.test.js. Дрейф порта = красный тест.
//
// Говорение и письмо не выгружаются: по замыслу их проверяет преподаватель
// вживую, в самостоятельном «Обучении» его нет, а балл экзамена и в оригинале
// считается только по 50 вопросам.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { sayAudioSlug } = require('./jts-self/say-audio')

const ROOT = path.join(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'public', 'exam')
const FIXTURES_DIR = path.join(ROOT, 'src', 'learning', '__fixtures__')
const I18N_SOURCE = path.join(__dirname, 'level-exam-i18n-source.json')

// Состав экзамена по разделам — ровно то, что обещает сам прототип («Grammar
// 20», «Vocabulary 10» …) и на чём стоит его порог 35 из 50. Другое число — это
// уже другой экзамен, и молча выкладывать его нельзя.
const EXPECTED = { grammar: 20, vocabulary: 10, reading: 10, listening: 10 }
const SKILLS = Object.keys(EXPECTED)
// Подписи навыков в прототипе → ключи разделов.
const SKILL_KEY = { Grammar: 'grammar', Vocabulary: 'vocabulary', Reading: 'reading', Listening: 'listening' }

function fail(msg) {
  throw new Error('[extract-level-exams] ' + msg)
}

/** Исходники экзаменов: data/jtsexam-<level>.html. */
function sourceFiles() {
  return fs
    .readdirSync(SRC_DIR)
    .map((name) => /^jtsexam-([a-c][0-9])\.html$/.exec(name))
    .filter(Boolean)
    .map((m) => ({ level: m[1], file: path.join(SRC_DIR, m[0]) }))
    .sort((a, b) => a.level.localeCompare(b.level))
}

function scriptOf(html) {
  const m = /<script>([\s\S]*?)<\/script>/.exec(html)
  if (!m) fail('в прототипе нет <script>')
  return m[1]
}

// Заглушка DOM ровно под то, что трогает прототип при загрузке и в showResults.
// querySelectorAll отдаёт пустой список: обработчики на радиокнопках нам не
// нужны — ответы кладутся прямо в его state. innerHTML с пустой строкой
// сбрасывает детей: showResults так чистит сетку навыков перед отрисовкой.
function element() {
  let html = ''
  const el = {
    className: '',
    dataset: {},
    style: {},
    textContent: '',
    disabled: false,
    children: [],
    classList: { add() {}, remove() {} },
    appendChild(child) {
      el.children.push(child)
      return child
    },
    addEventListener() {},
    querySelector: () => element(),
    querySelectorAll: () => [],
    scrollIntoView() {},
  }
  Object.defineProperty(el, 'innerHTML', {
    get: () => html,
    set: (v) => {
      html = String(v)
      if (!html) el.children = []
    },
  })
  return el
}

/** Исполнить скрипт прототипа целиком. byId — элементы, к которым он обращался. */
function runPrototype(html) {
  const byId = new Map()
  const document = {
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, element())
      return byId.get(id)
    },
    createElement: () => element(),
  }
  const ctx = vm.createContext({ document, window: {}, location: { reload() {} } })
  vm.runInContext(scriptOf(html), ctx, { timeout: 5000 })
  return { ctx, byId }
}

// Объекты из песочницы — чужого realm: JSON-круг отвязывает их от него, и
// дальше это обычные данные хоста.
function bankOf(proto) {
  const bank = vm.runInContext(
    '({ GRAMMAR, VOCABULARY, GRAMMAR_DIALOGUE, VOCAB_DIALOGUE, READING_PASSAGES, LISTENING_PASSAGES, SKILLS })',
    proto.ctx,
  )
  return JSON.parse(JSON.stringify(bank))
}

/** Порог сдачи прототип держит числом внутри showResults, а не константой. */
function passMarkOf(html) {
  const m = /const passed = totalCorrect >= (\d+);/.exec(scriptOf(html))
  if (!m) fail('не найден порог `const passed = totalCorrect >= N;` — прототип изменил подсчёт')
  return Number(m[1])
}

/**
 * Имя записи аудирования — хэш стенограммы: правка реплики в исходнике даёт
 * ровно одну новую запись, а не перезапись всех (scripts/voice-level-exams.js).
 */
function listeningAudioFile(lines) {
  return `${sayAudioSlug(lines.map((l) => `${l.sp}: ${l.t}`).join('\n'))}.mp3`
}

function choice(q, where) {
  const out = { id: String(q.id) }
  if (q.prompt != null) out.prompt = String(q.prompt)
  if (!Array.isArray(q.options) || q.options.length < 2) fail(`${where}/${q.id}: меньше двух вариантов`)
  out.options = q.options.map(String)
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= out.options.length) {
    fail(`${where}/${q.id}: ответ ${q.answer} вне вариантов`)
  }
  out.answer = q.answer
  return out
}

// True/False прототип рисует вариантами ["True","False"] с ответом 0 для true
// (renderTF) и так же его считает — держим ту же пару, иначе оракул разойдётся.
function readingQuestion(q, where) {
  if (q.type !== 'tf') return choice(q, where)
  if (typeof q.answer !== 'boolean') fail(`${where}/${q.id}: у True/False ответ не true/false`)
  return { id: String(q.id), prompt: String(q.prompt), options: ['True', 'False'], answer: q.answer ? 0 : 1, tf: true }
}

// Номер в реплике — только подпись пропуска: прототип берёт gaps[] по порядку
// появления (gapIndex++), а не по номеру. Номера, идущие не 1…n подряд, значили
// бы, что подпись и вопрос разъехались, — такое не выкладываем.
function dialogueOf(d, where) {
  let k = 0
  const lines = d.lines.map((line) => ({
    sp: String(line.sp),
    parts: line.parts.map((part) => {
      if (typeof part !== 'number') return String(part)
      if (part !== k + 1) fail(`${where}: пропуск с номером ${part} стоит ${k + 1}-м`)
      return { gap: k++ }
    }),
  }))
  if (k !== d.gaps.length) fail(`${where}: пропусков в репликах ${k}, вопросов к ним ${d.gaps.length}`)
  return { intro: String(d.intro), lines, gaps: d.gaps.map((g) => choice(g, where)) }
}

function tipsOf(level, bank, i18n) {
  const tips = {}
  for (const [label, key] of Object.entries(SKILL_KEY)) {
    const en = bank.SKILLS?.[label]?.tip
    if (!en) fail(`${level}: нет совета для навыка ${label}`)
    const tr = i18n[level]?.[key]
    // Совет сверяем с английским текстом из исходника: поправит методист
    // формулировку — перевод устареет, и экстрактор должен об этом сказать.
    if (!tr || tr.en !== en || !tr.ru || !tr.kk) {
      fail(`${level}/${key}: нет перевода совета в ${path.relative(ROOT, I18N_SOURCE)} (или английский текст изменился)`)
    }
    tips[key] = { en, ru: tr.ru, kk: tr.kk }
  }
  return tips
}

function buildExam(level, html, proto, i18n) {
  const bank = bankOf(proto)
  const sections = [
    {
      key: 'grammar',
      dialogue: dialogueOf(bank.GRAMMAR_DIALOGUE, `${level}/grammar`),
      questions: bank.GRAMMAR.map((q) => choice(q, `${level}/grammar`)),
    },
    {
      key: 'vocabulary',
      dialogue: dialogueOf(bank.VOCAB_DIALOGUE, `${level}/vocabulary`),
      questions: bank.VOCABULARY.map((q) => choice(q, `${level}/vocabulary`)),
    },
    {
      key: 'reading',
      passages: bank.READING_PASSAGES.map((p) => ({
        id: String(p.id),
        title: String(p.title),
        text: p.text.map(String),
        questions: p.questions.map((q) => readingQuestion(q, `${level}/reading/${p.id}`)),
      })),
    },
    {
      key: 'listening',
      passages: bank.LISTENING_PASSAGES.map((p) => {
        const lines = p.lines.map((l) => ({ sp: String(l.sp), t: String(l.t) }))
        return {
          id: String(p.id),
          audio: listeningAudioFile(lines),
          lines,
          questions: p.questions.map((q) => choice(q, `${level}/listening/${p.id}`)),
        }
      }),
    },
  ]

  const ids = new Set()
  let total = 0
  for (const s of sections) {
    const qs = [...(s.dialogue?.gaps || []), ...(s.questions || []), ...(s.passages || []).flatMap((p) => p.questions)]
    if (qs.length !== EXPECTED[s.key]) fail(`${level}/${s.key}: вопросов ${qs.length}, ждали ${EXPECTED[s.key]}`)
    for (const q of qs) {
      if (ids.has(q.id)) fail(`${level}: id ${q.id} повторяется`)
      ids.add(q.id)
    }
    total += qs.length
  }

  const pass = passMarkOf(html)
  if (!(pass > 0 && pass <= total)) fail(`${level}: порог ${pass} при ${total} вопросах`)
  // version — отпечаток вопросов: по нему черновик ответов на устройстве узнаёт,
  // что экзамен поменялся и старые ответы к нему уже не относятся.
  const version = crypto.createHash('sha1').update(JSON.stringify(sections)).digest('hex').slice(0, 8)
  return { level, version, total, pass, sections, tips: tipsOf(level, bank, i18n) }
}

function flatQuestions(exam) {
  return exam.sections.flatMap((s) => [
    ...(s.dialogue?.gaps || []),
    ...(s.questions || []),
    ...(s.passages || []).flatMap((p) => p.questions),
  ])
}

/**
 * Наборы ответов для оракула: крайние случаи (всё верно, всё мимо, ровно порог
 * и на один ниже, часть без ответа) и двадцать случайных с фиксированным зерном
 * — повторный прогон экстрактора даёт те же самые наборы. Половина случайных —
 * «почти готов» (~80 % верно): чистая угадайка проваливает экзамен всегда, и
 * без них оракул не видел бы сдачу с проседающим навыком.
 */
function answerSets(exam) {
  const qs = flatQuestions(exam)
  const all = (f) => Object.fromEntries(qs.map((q, i) => [q.id, f(q, i)]))
  const right = (q) => q.answer
  const wrong = (q) => (q.answer + 1) % q.options.length
  const sets = [
    ['всё верно', all(right)],
    ['всё неверно', all(wrong)],
    ['ровно порог', all((q, i) => (i < exam.pass ? right(q) : wrong(q)))],
    ['на один ниже порога', all((q, i) => (i < exam.pass - 1 ? right(q) : wrong(q)))],
    ['треть без ответа', Object.fromEntries(qs.filter((_, i) => i % 3).map((q) => [q.id, q.answer]))],
  ]
  let seed = 20260928
  const rnd = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
    return seed / 0x80000000
  }
  const guess = (q) => Math.floor(rnd() * q.options.length)
  for (let n = 1; n <= 10; n++) sets.push([`случайный ${n}`, all(guess)])
  for (let n = 1; n <= 10; n++) sets.push([`почти готов ${n}`, all((q) => (rnd() < 0.8 ? right(q) : guess(q)))])
  return sets
}

/** Что показывает прототип после «Finish test» на этих ответах. */
function oracleCase(proto, answers) {
  proto.ctx.__answers = answers
  vm.runInContext(
    'for (const k of Object.keys(state)) delete state[k]; Object.assign(state, __answers); showResults();',
    proto.ctx,
  )
  const get = (id) => proto.byId.get(id)
  const skills = {}
  for (const row of get('breakdownGrid').children) {
    const m = /<span>([^<]+)<\/span>\s*<span class="skill-score">(\d+)\/(\d+)<\/span>/.exec(row.innerHTML)
    if (!m || !SKILL_KEY[m[1]]) fail(`оракул: не разобрал строку навыка «${row.innerHTML.trim().slice(0, 80)}»`)
    skills[SKILL_KEY[m[1]]] = [Number(m[2]), Number(m[3])]
  }
  const weak = [...get('reviewList').innerHTML.matchAll(/<li><strong>([^<:]+):<\/strong>/g)].map((m) => SKILL_KEY[m[1]])
  return {
    correct: Number(get('scoreBig').textContent),
    pct: parseInt(get('scorePct').textContent, 10),
    passed: /\bpass\b/.test(get('statusPill').className),
    skills,
    weak,
  }
}

function oracleOf(exam, proto) {
  return {
    level: exam.level,
    version: exam.version,
    cases: answerSets(exam).map(([name, answers]) => ({ name, answers, expect: oracleCase(proto, answers) })),
  }
}

/** Фикстура построчно по случаю: читать диффом удобнее, чем одну строку в 60 КБ. */
function oracleJson(oracle) {
  const head = `{\n  "level": ${JSON.stringify(oracle.level)},\n  "version": ${JSON.stringify(oracle.version)},\n  "cases": [\n`
  return head + oracle.cases.map((c) => '    ' + JSON.stringify(c)).join(',\n') + '\n  ]\n}\n'
}

function readI18n() {
  return JSON.parse(fs.readFileSync(I18N_SOURCE, 'utf8'))
}

/** Экзамен и оракул одного исходника — без записи на диск (нужно и тесту). */
function extractLevel({ level, file }, i18n = readI18n()) {
  const html = fs.readFileSync(file, 'utf8')
  const proto = runPrototype(html)
  const exam = buildExam(level, html, proto, i18n)
  return { exam, oracle: oracleOf(exam, proto) }
}

function main() {
  const i18n = readI18n()
  const sources = sourceFiles()
  if (!sources.length) fail(`в ${path.relative(ROOT, SRC_DIR)} нет jtsexam-<level>.html`)
  for (const src of sources) {
    const { exam, oracle } = extractLevel(src, i18n)
    const dir = path.join(OUT_DIR, exam.level)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'exam.json'), JSON.stringify(exam, null, 2) + '\n')
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })
    fs.writeFileSync(path.join(FIXTURES_DIR, `level-exam-oracle-${exam.level}.json`), oracleJson(oracle))
    const audio = exam.sections.find((s) => s.key === 'listening').passages.length
    console.log(`${exam.level}: вопросов ${exam.total}, порог ${exam.pass}, записей ${audio}, наборов оракула ${oracle.cases.length}, version ${exam.version}`)
  }
}

module.exports = {
  EXPECTED,
  SKILLS,
  OUT_DIR,
  FIXTURES_DIR,
  I18N_SOURCE,
  sourceFiles,
  runPrototype,
  bankOf,
  buildExam,
  answerSets,
  oracleCase,
  extractLevel,
  listeningAudioFile,
  flatQuestions,
}

if (require.main === module) {
  try {
    main()
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
