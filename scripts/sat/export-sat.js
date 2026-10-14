// Экспорт контента SAT из прототипа jts-sat-platform в JSON для бэкенда и админки (фаза 0 плана docs/sat/PLAN.md,
// пункты A1–A7 SAT-SYNC-PLAN.md).
//
// Данные прототипа — JavaScript (`js/data/*.js`, `js/data/units/*.js` зовут JTS.data.addQuestions/addPaper/unit) и,
// с октября 2026, JSON: `js/data/questions/index.json`, `js/data/lessons/index.json`, `js/data/papers/index.json`. JSON
// прототип грузит своими же загрузчиками (loadQuestionFiles / loadLessonFiles / loadPaperFiles) через fetch. Поэтому мы
// не разбираем ни то, ни другое руками: исполняем скрипты в node:vm в порядке index.html, а fetch подменяем чтением с
// диска — и экспорт получает ровно то, что видел прототип: записи-строки и объекты `{file, lessonCode, assetBase,
// idPrefix}` индекса, формат выгрузки банка (stemHtml, choices, correctAnswer, acceptedAnswers), пути картинок
// относительно assetBase, замену вопросов с тем же id и наборы юнитов из JSON вместо старых lesson-questions.js.
//
// Запуск: node scripts/sat/export-sat.js [--src <путь к jts-sat-platform>] [--out build/sat] [--hold-cb]
//
// Пишет (build/ — в .gitignore, это не исходник, а посылка для импорта):
//   questions/<группа>.json  — пакеты { format: 'jts-sat-bundle', items }: банк — по 8 доменам; вопросы без навыка
//                              (наборы юнитов, Challenge, пробники) — по юниту (`lesson-U1`, `lesson-CH11`) и пробнику
//                              (`paper-jts-1`); так каждый пакет меньше предела импорта (1000)
//   papers.json              — состав пробников: модули по порядку экзамена и id вопросов
//   taxonomy.json            — домены и навыки с examWeight (его же копия — backend src/main/resources/sat/taxonomy.json)
//   reference/*.json         — вузы, даты экзаменов, главы онбординга, гид Desmos, глоссарий, курс, словарь, игры
//   media/<sha256-24>.<ext> — картинки вопросов (имя как у медиа IELTS бэкенда); в HTML вместо пути стоит
//                              `sat-media:<имя>`, адрес подставит сервер. SVG — как есть (бэкенд санитизирует при загрузке)
//   report.json              — счётчики, источники, отклонённые вопросы и дубли
//
// Картинки: берём только те файлы `assets/sat/...`, на которые ссылается вопрос (в папке их ~50 000), base64 внутри
// HTML раскладывается в файлы. Имя — хэш содержимого, поэтому одинаковые картинки ложатся одним файлом.
//
// Вопрос, не прошедший проверку (scripts/sat/bank-validate.js — порт validateAll), в посылку не попадает и
// перечисляется в report.json → rejected с причиной: прототип чинят в прототипе, а экспорт ничего не «угадывает».
//
// Материалы College Board (A7). У школы есть лицензия (решение 13.10.2026), поэтому они идут в посылку целиком, ничего
// не придерживается. Прототип ставил им `licenseStatus: "original"`, что неверно, — экспорт ставит `licensed`, а
// источник оставляет в `meta.source`. Признак — id из college-board-review/items.csv прототипа или источник «Question
// Bank» / «College Board» / «Bluebook». Флаг --hold-cb возвращает прежнее поведение (не выгружать их вовсе), если
// лицензия окажется не той; report.json → collegeBoard показывает, сколько их вышло, а → provenance — источники, о
// которых решения нет (Challenge Verbal, полные «hard»-симуляции).

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { validateBank, sprValue } = require('./bank-validate.js')

const arg = (name, def) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : def
}
const ROOT = path.resolve(__dirname, '..', '..')
const SRC = path.resolve(arg('--src', path.join(ROOT, '..', 'jts-sat-platform')))
const OUT = path.resolve(ROOT, arg('--out', 'build/sat'))

// ---------------------------------------------------------------- прототип в node:vm

// Сообщения загрузчиков прототипа («file not loaded», «repeated question ids») — в отчёт, а не в никуда
const protoLog = []
const quietConsole = {
  log: () => {},
  info: (...a) => protoLog.push({ level: 'info', text: a.map(String).join(' ') }),
  warn: (...a) => protoLog.push({ level: 'warn', text: a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') }),
  error: (...a) => protoLog.push({ level: 'error', text: a.map(String).join(' ') }),
}

// fetch прототипа ходит относительными путями от корня приложения (js/data/questions/index.json) — читаем их с диска
function fileFetch(url) {
  const rel = decodeURIComponent(String(url).split('?')[0])
  const file = path.join(SRC, rel)
  if (!file.startsWith(SRC) || !fs.existsSync(file)) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) })
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) })
}

// Порядок — ровно как в index.html прототипа: таксономия и база банка раньше доменных файлов, units/*.js после
// programme-units.js. Новый файл данных в прототипе подключают там же, поэтому список не дублируем.
function dataScripts() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8')
  return [...html.matchAll(/<script\s+src="(js\/data\/[^"?]+\.js)/g)].map((m) => m[1])
}

async function loadPrototype() {
  const sandbox = { console: quietConsole, fetch: fileFetch, setTimeout, clearTimeout }
  sandbox.window = sandbox
  sandbox.JTS = {}
  vm.createContext(sandbox)
  const scripts = dataScripts()
  if (!scripts.length) throw new Error('В index.html прототипа нет js/data/*.js — формат прототипа сменился?')
  for (const rel of scripts) vm.runInContext(fs.readFileSync(path.join(SRC, rel), 'utf8'), sandbox, { filename: rel })
  const d = sandbox.JTS.data
  const loaded = await Promise.all([d.loadQuestionFiles(), d.loadLessonFiles(), d.loadPaperFiles()])
  return { d, scripts, loaded: { questionFiles: loaded[0], lessonFiles: loaded[1], paperFiles: loaded[2] } }
}

// Индексы JSON прототипа — для отчёта и для источника вопросов: у файла выгрузки банка (questions-m-adv.json) источник
// записан шапкой файла, а не в meta вопроса, и загрузчик ставит вопросу безликое «JSON: <файл>»
function readIndex(dir) {
  const p = path.join(SRC, 'js', 'data', dir, 'index.json')
  if (!fs.existsSync(p)) return []
  return (JSON.parse(fs.readFileSync(p, 'utf8')).files || []).map((e) => (typeof e === 'string' ? { file: e } : e))
}
function fileSources(entries) {
  const out = {}
  for (const e of entries) {
    const p = path.join(SRC, 'js', 'data', 'questions', e.file)
    if (!fs.existsSync(p)) continue
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (data && !Array.isArray(data) && typeof data.source === 'string') out[e.file] = data.source
  }
  return out
}

// ---------------------------------------------------------------- картинки
const media = new Map() // хэш-имя → источник (для отчёта)
const missing = []
const unresolved = []
const IMAGE_EXT = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', svg: 'svg', gif: null }

function putMedia(buf, ext, from) {
  const name = `${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24)}.${ext}`
  if (!media.has(name)) {
    fs.writeFileSync(path.join(OUT, 'media', name), buf)
    media.set(name, from)
  }
  return `sat-media:${name}`
}

// Крошки: PDF College Board местами режет из строки обрывок в 5×5 px (точка, кусок штриха) — на экране это соринка
// посреди формулы («Line J·»). Ширину и высоту берём из заголовка PNG (IHDR), не декодируя картинку.
const specks = []
function isSpeck(file) {
  if (!/\.png$/i.test(file)) return false
  const head = Buffer.alloc(24)
  const fd = fs.openSync(file, 'r')
  fs.readSync(fd, head, 0, 24, 0)
  fs.closeSync(fd)
  return head.readUInt32BE(16) <= 6 && head.readUInt32BE(20) <= 7
}

// &amp; и %20 в пути картинки — так их пишут конвертеры HTML; папки бумажных тестов называются «paper 1» с пробелом
const assetFile = (rel) => {
  const plain = rel.replace(/&amp;/g, '&')
  const direct = path.join(SRC, plain)
  if (fs.existsSync(direct)) return direct
  try {
    const decoded = path.join(SRC, decodeURIComponent(plain))
    if (fs.existsSync(decoded)) return decoded
  } catch {
    /* не URI — значит, файла нет */
  }
  return null
}

function rewriteHtml(html, qid) {
  return html
    .replace(/<img[^>]*src="(assets\/sat\/[^"]+)"[^>]*>/g, (m, rel) => {
      const file = assetFile(rel)
      if (file && isSpeck(file)) {
        specks.push({ id: qid, src: rel })
        return ''
      }
      return m
    })
    .replace(/src="(assets\/sat\/[^"]+)"/g, (m, rel) => {
      const file = assetFile(rel)
      const ext = IMAGE_EXT[path.extname(rel).slice(1).toLowerCase()]
      if (!file || !ext) {
        missing.push({ id: qid, src: rel, reason: file ? 'тип файла не поддерживается' : 'нет файла' })
        return m
      }
      return `src="${putMedia(fs.readFileSync(file), ext, rel)}"`
    })
    .replace(/src="data:image\/(png|jpe?g|webp|svg\+xml);base64,([^"]+)"/g, (m, type, b64) => {
      const ext = type === 'jpeg' ? 'jpg' : type === 'svg+xml' ? 'svg' : type
      return `src="${putMedia(Buffer.from(b64, 'base64'), ext, `${qid}:base64`)}"`
    })
}

// картинки встречаются в stem, passage, options, explanation, distractors — обходим всё дерево вопроса
// NUL в текстах College Board — потерянный при выгрузке PDF знак минуса (подписи осей «\u000015 \u000010» = −15 −10).
// Postgres такую строку в jsonb не принимает вовсе («unsupported Unicode escape sequence»), а читатель её не видит.
const fixNul = (s) => (s.includes('\u0000') ? s.replace(/\u0000/g, '−') : s)

// Слова, которые PDF College Board разрезал пробелом — почти всегда на «rt» («cer tain» ×73, «propor tional»,
// «ver tical», «bir th»). Чиним только по списку: правило «r + пробел + t» склеило бы и живые «four times», «per ton».
// Список собран сверкой банка 13.10.2026: половинка почти не встречается отдельно, а целое слово в банке есть.
const SPLIT_WORDS = [
  'certain', 'certainly', 'certification', 'property', 'worth', 'shirts', 'sweatshirts', 'fertilizer', 'fertilizers',
  'party', 'parts', 'participant', 'participants', 'particular', 'particularly', 'proportion', 'proportional',
  'exerted', 'starts', 'started', 'vertical', 'birth', 'fourth', 'artist', 'article', 'portion', 'department',
  'departmental', 'reported', 'converted', 'north', 'transportation',
]
// [слово, где разрезано] — у «rt»-слов разрез после r; три редких слова разрезаны в другом месте
const SPLITS = [
  ...SPLIT_WORDS.map((w) => [w, w.indexOf('rt') + 1]),
  ['homogeneous', 3], ['kanamycin', 5], ['jasmonic', 4],
]
// «cer tain» → «certain», и с заглавной («Cer tain»); границы слова — чтобы «cer tainty» не стал словом наполовину
const SPLIT_RE = SPLITS.map(([w, i]) => new RegExp(`\\b(${w.slice(0, i)}) (${w.slice(i)})\\b`, 'gi'))
const splitFixed = { count: 0 }
function fixSplitWords(s) {
  let out = s
  for (const re of SPLIT_RE) out = out.replace(re, (m, a, b) => (splitFixed.count++, a + b))
  return out
}
const fixText = (s) => fixSplitWords(fixNul(s))

function deepRewrite(v, qid) {
  if (typeof v === 'string') return v.includes('src="') ? rewriteHtml(fixText(v), qid) : fixText(v)
  if (Array.isArray(v)) return v.map((x) => deepRewrite(x, qid))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepRewrite(x, qid)]))
  return v
}

// после переписывания в документе не должно остаться картинки, которую сервер не отдаст: относительный путь,
// не найденный в assets/sat, ушёл бы ученику битой ссылкой
function unresolvedImages(item) {
  const out = []
  for (const m of JSON.stringify(item).matchAll(/<img[^>]*?src=\\"([^"\\]*)\\"/g)) {
    if (!/^(sat-media:|https?:|data:)/.test(m[1])) out.push(m[1])
  }
  return out
}

// ---------------------------------------------------------------- нормализация вопроса

const fixes = { sprThousands: 0, stemAdded: 0, emptyExplanationDropped: 0, assetPathsDropped: 0, sourceFromFile: 0 }
// «6,632» в ответе вписывания: запятую-разделитель тысяч ученик не наберёт (и Bluebook её не принимает) — храним 6632
const thousands = (a) => (typeof a === 'string' && /^[−-]?\d{1,3}(,\d{3})+$/.test(a.trim()) ? (fixes.sprThousands++, a.trim().replace(/,/g, '')) : a)

// Вписывание с ответом-заглушкой («see explanation below», «given in the explanation»): конвертер PDF не нашёл ответ в
// отдельном поле, а College Board пишет его в разборе одной и той же фразой — «The correct answer is 2.5» / «either 0
// or 3» и «Note that 2.5 and 5/2 are examples of ways to enter a correct answer». Берём ответ оттуда, только если там
// одни числа; ответ картинкой (формула) не угадываем — такой вопрос остаётся отклонённым.
const NUM = '[−-]?\\d*\\.?\\d+(?:\\/\\d+)?'
const CORRECT_IS = new RegExp(`The correct answer is (?:either )?(${NUM}(?:(?:,\\s*(?:or\\s+)?|\\s+or\\s+)${NUM})*)\\s*\\.(?:\\s|$)`)
const NOTE_THAT = new RegExp(`Note that (${NUM}(?:(?:,\\s*(?:and\\s+)?|\\s+and\\s+)${NUM})*) (?:is an example|are examples) of ways? to enter a correct answer`)
const recovered = []
function sprFromExplanation(q) {
  const text = String(q.explanation?.en || '').replace(/<img[^>]*>/g, ' [IMG] ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const found = []
  for (const re of [CORRECT_IS, NOTE_THAT]) {
    const m = re.exec(text)
    if (m) found.push(...m[1].split(/,\s*(?:or|and)?\s*|\s+(?:or|and)\s+/).map((s) => s.trim().replace(/^−/, '-')).filter(Boolean))
  }
  const out = [...new Set(found)]
  return out.length && out.every((a) => sprValue(a) !== null) ? out : null
}

function normalizeQuestion(q, sourceOfFile) {
  if (q.type === 'spr' && [].concat(q.answer ?? []).some((a) => sprValue(a) === null && /explanation/i.test(String(a)))) {
    const answers = sprFromExplanation(q)
    if (answers) {
      recovered.push({ id: q.id, answer: answers })
      q.answer = answers
    }
  }
  // юнит 1 курса: у «Words in Context» прототип не записал вопрос — только текст с пропуском. Формулировка у SAT
  // одна и та же, без неё бэкенд вопрос не принимает («Нет текста вопроса»), а ученик не понял бы, что делать
  if (!String(q.stem ?? '').trim() && q.skillId === 'rw.cs.words-in-context' && /_{3,}/.test(q.passage || '')) {
    q.stem = 'Which choice completes the text with the most logical and precise word or phrase?'
    fixes.stemAdded++
  }
  if (q.type === 'spr') q.answer = Array.isArray(q.answer) ? q.answer.map(thousands) : thousands(q.answer)
  // загрузчик прототипа уже слил acceptedAnswers в answer; второй копии в документе незачем расходиться с первой
  delete q.acceptedAnswers
  // пустой разбор (`explanationHtml: ""` у Challenge) — не разбор: прототип оставляет его строкой ''
  if (q.explanation === '' || (q.explanation && typeof q.explanation === 'object' && !q.explanation.en && !q.explanation.ru && !q.explanation.kk)) {
    delete q.explanation
    fixes.emptyExplanationDropped++
  }
  // assetPaths — служебный список файлов конвертера: пути вне assetBase, ученику и бэкенду они не нужны
  if (q.assetPaths) {
    delete q.assetPaths
    fixes.assetPathsDropped++
  }
  if (q.skillId == null) delete q.skillId
  const m = /^JSON: (.+)$/.exec(q.meta?.source || '')
  if (m && sourceOfFile[m[1]]) {
    q.meta.source = sourceOfFile[m[1]]
    fixes.sourceFromFile++
  }
}

// Варианты, испорченные выгрузкой PDF: два одинаковых ответа («3», «3») или дробь «−30/1» вместо числа — у таких вопросов
// правильный ответ не выбрать или он выглядит иначе, чем в разборе. Не выгружаем, пока их не поправят в прототипе.
// Четыре пустых варианта — не брак: картинка вопроса сама показывает A–D, ученик отвечает буквой (пробники, Challenge).
const optionText = (o) => String(o ?? '').replace(/<img[^>]*src="([^"]+)"[^>]*>/g, ' [$1] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
function brokenOptions(questions) {
  const out = []
  for (const q of questions) {
    if (q.type !== 'mcq' || !Array.isArray(q.options)) continue
    const texts = q.options.map(optionText)
    if (texts.every((t) => t === '')) continue
    if (new Set(texts).size !== texts.length) out.push({ id: q.id, path: '/options', message: 'повторяющиеся варианты ответа (испорчены выгрузкой PDF)' })
    else if (texts.some((t) => /^[−-]?\d+\/1$/.test(t))) out.push({ id: q.id, path: '/options', message: 'вариант-дробь «N/1» (испорчен выгрузкой PDF)' })
  }
  return out
}

// Правки ключей после ручной проверки банка (scripts/sat/corrections/*.json). Прототип мы не трогаем, поэтому
// исправления живут здесь и накладываются при каждой выгрузке. Файл: { "corrections": [ { "id", "set": { поле: значение },
// "exclude": true, "reason" } ] }. `set` заменяет поля верхнего уровня (answer, options, stem, passage, explanation …),
// `meta` — сливает. `exclude` — ключ не восстановить: вопрос не выгружается (у вопроса пробника это снимает весь
// пробник, поэтому там только правка). Неизвестный id — ошибка: правка не должна молча отвалиться при смене прототипа.
const CORRECTIONS = path.join(__dirname, 'corrections')
function applyCorrections(questions) {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const out = { applied: [], excluded: [], fixedOptions: new Set() }
  if (!fs.existsSync(CORRECTIONS)) return out
  for (const file of fs.readdirSync(CORRECTIONS).filter((f) => f.endsWith('.json')).sort()) {
    for (const c of JSON.parse(fs.readFileSync(path.join(CORRECTIONS, file), 'utf8')).corrections || []) {
      const q = byId.get(c.id)
      if (!q) throw new Error(`corrections/${file}: нет вопроса ${c.id}`)
      if (c.exclude) {
        out.excluded.push({ id: c.id, path: '/', message: `исключён при проверке: ${c.reason || 'без причины'}` })
        continue
      }
      for (const [k, v] of Object.entries(c.set || {})) {
        if (k === 'meta') q.meta = { ...q.meta, ...v }
        else q[k] = v
      }
      if (c.set && 'options' in c.set) out.fixedOptions.add(c.id)
      out.applied.push({ id: c.id, file, fields: Object.keys(c.set || {}), reason: c.reason || '' })
    }
  }
  corrections.push(...out.applied)
  return out
}
const corrections = []

// материалы College Board: список проверки прототипа или источник, который сам себя так называет
// («SAT Question Bank PDF», «SAT-Math-Question-Bank.html», «SAT Math — Geometry and Trigonometry — source PDF» …)
const CB_SOURCE = /question[\s-]*bank|college board|bluebook|^SAT Math\b/i

// JSON.stringify молча выбрасывает функции (у programme это byCode, unitsOf …) — для данных это и нужно
const plain = (v) => JSON.parse(JSON.stringify(v ?? null))

function writeJson(rel, data) {
  const file = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 1))
}

// группа пакета: банк — домен навыка; вопрос без навыка — его юнит или пробник
function groupOf(q, domainOf) {
  const kind = q.meta?.kind || 'bank'
  if (kind === 'lesson') return `lesson-${q.meta.lessonCode}`
  if (kind === 'paper') return `paper-${q.meta.paperId}`
  return domainOf.get(q.skillId) || 'unknown'
}

async function main() {
  if (!fs.existsSync(path.join(SRC, 'js', 'data'))) throw new Error(`нет прототипа SAT: ${SRC}`)
  const { d, scripts, loaded } = await loadPrototype()
  const questionIndex = readIndex('questions')
  const sourceOfFile = fileSources(questionIndex)

  const skillIds = new Set(d.skills.map((s) => s.id))
  const lessonCodes = new Set((d.programme?.lessons || []).map((l) => l.code))

  // наборы юнитов: у юнита, получившего набор из JSON, прототип показывает только его (sets[code] заменён), а
  // старые вопросы lesson-questions.js остаются в банке прототипа мёртвым грузом — в посылку их не берём
  const sets = d.lessonQuestions || {}
  const inSet = new Set(Object.values(sets).flat())
  const stale = d.questions.filter((q) => q.meta?.kind === 'lesson' && !inSet.has(q.id)).map((q) => q.id)
  const staleSet = new Set(stale)

  const duplicates = { questions: [] }
  const qById = new Map()
  for (const q of d.questions) {
    if (staleSet.has(q.id)) continue
    if (qById.has(q.id)) duplicates.questions.push(q.id)
    qById.set(q.id, q)
  }
  const unique = [...qById.values()].map((q) => plain(q))
  for (const q of unique) normalizeQuestion(q, sourceOfFile)
  const corrected = applyCorrections(unique)

  const problems = [
    ...validateBank(unique, { skillIds, lessonCodes }),
    ...brokenOptions(unique.filter((q) => !corrected.fixedOptions.has(q.id))),
    ...corrected.excluded,
  ]
  const rejectedIds = new Set(problems.map((p) => p.id))

  const heldFile = path.join(SRC, 'college-board-review', 'items.csv')
  const cbList = new Set(
    fs.existsSync(heldFile) ? fs.readFileSync(heldFile, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',')[0]) : [],
  )
  const isCb = (q) => cbList.has(q.id) || CB_SOURCE.test(q.meta?.source || '')
  const cbIds = new Set(unique.filter(isCb).map((q) => q.id))
  const held = process.argv.includes('--hold-cb') ? cbIds : new Set()
  // материалы College Board — по лицензии: метка `licensed`, а не `original` прототипа; источник — как был
  for (const q of unique) if (cbIds.has(q.id) && q.meta) q.meta.licenseStatus = 'licensed'
  const questions = unique.filter((q) => !rejectedIds.has(q.id) && !held.has(q.id))

  // пробник с отклонённым или придержанным вопросом неполон — не выгружаем его целиком, а не с дыркой в модуле
  const papers = d.papers
  const gone = (id) => rejectedIds.has(id) || held.has(id) || !qById.has(id)
  const paperRejected = papers.filter((p) => p.modules.some((m) => m.questionIds.some(gone)))

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'media'), { recursive: true })

  // вопросы — пакетами: одному пакету проще пройти импорт админки, чем 4 тыс. файлов
  const domainOf = new Map(d.skills.map((s) => [s.id, s.domain]))
  const groups = new Map()
  const unresolvedById = []
  for (const q of questions) {
    if (q.meta?.kind === 'paper' && paperRejected.some((p) => p.id === q.meta.paperId)) continue
    const item = deepRewrite(q, q.id)
    const bad = unresolvedImages(item)
    if (bad.length) unresolvedById.push({ id: q.id, src: bad })
    const g = groupOf(q, domainOf)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(item)
  }
  for (const [g, items] of groups) {
    const domain = domainOf.has(items[0].skillId) && !items[0].meta?.kind ? g : null
    writeJson(`questions/${g}.json`, { format: 'jts-sat-bundle', schemaVersion: 1, domain, group: g, items })
  }
  unresolved.push(...unresolvedById)

  writeJson('papers.json', {
    papers: papers.filter((p) => !paperRejected.includes(p)).map((p) => ({
      id: p.id,
      title: p.title,
      year: p.year ?? null,
      note: p.note ?? null,
      modules: p.modules.map((m) => ({ key: m.key, section: m.section, questionIds: [...m.questionIds] })),
    })),
  })
  writeJson('taxonomy.json', { domains: plain(d.domains), skills: plain(d.skills) })
  writeJson('reference/colleges.json', { meta: plain(d.collegesMeta), rows: plain(d.colleges) })
  writeJson('reference/exam-dates.json', { meta: plain(d.examDatesMeta), dates: plain(d.examDates) })
  writeJson('reference/sat-info.json', { meta: plain(d.satInfoMeta), chapters: plain(d.satInfo) })
  writeJson('reference/desmos-guide.json', plain(d.desmosGuide))
  writeJson('reference/glossary.json', plain(d.glossary))
  writeJson('reference/programme.json', plain(d.programme))
  writeJson('reference/vocab.json', { meta: plain(d.vocabMeta), cards: plain(d.vocab) })
  writeJson('reference/vocab-games.json', { meta: plain(d.vocabGamesMeta), cloze: plain(d.vocabCloze), register: plain(d.vocabRegister) })

  const exported = [...groups.values()].flat()
  const count = (pred) => exported.filter(pred).length
  const lessonSets = {}
  for (const q of exported) if (q.meta?.kind === 'lesson') lessonSets[q.meta.lessonCode] = (lessonSets[q.meta.lessonCode] || 0) + 1
  const bySource = (list) => list.reduce((a, q) => {
    const k = `${q.meta?.source || '?'} · ${q.meta?.licenseStatus || '?'}`
    a[k] = (a[k] || 0) + 1
    return a
  }, {})
  const report = {
    source: SRC,
    prototype: { scripts: scripts.length, ...loaded, questionIndex: questionIndex.length, lessonIndex: readIndex('lessons').length, paperIndex: readIndex('papers').length },
    questions: {
      sourceTotal: d.questions.length,
      staleLessonItems: stale.length,
      exported: exported.length,
      bank: count((q) => !q.meta?.kind),
      paper: count((q) => q.meta?.kind === 'paper'),
      lesson: count((q) => q.meta?.kind === 'lesson'),
      withoutSkill: count((q) => !q.skillId),
      rw: count((q) => q.section === 'rw'),
      math: count((q) => q.section === 'math'),
      mcq: count((q) => q.type === 'mcq'),
      spr: count((q) => q.type === 'spr'),
      draft: count((q) => q.meta?.reviewStatus === 'draft'),
      licensed: count((q) => q.meta?.licenseStatus === 'licensed'),
      original: count((q) => q.meta?.licenseStatus === 'original'),
    },
    lessonSets,
    sources: bySource(exported),
    groups: Object.fromEntries([...groups].map(([k, v]) => [k, v.length])),
    papers: papers.map((p) => ({ id: p.id, title: p.title, modules: p.modules.map((m) => `${m.key}:${m.questionIds.length}`), incomplete: paperRejected.includes(p) })),
    duplicates,
    corrections: { applied: corrections.length, items: corrections },
    collegeBoard: {
      listedInReview: cbList.size,
      marked: cbIds.size,
      exported: exported.filter((q) => cbIds.has(q.id)).length,
      held: unique.filter((q) => held.has(q.id)).length,
      rule: 'id в college-board-review/items.csv или meta.source ~ ' + CB_SOURCE,
    },
    // источники, о происхождении которых решения нет (SAT-SYNC-PLAN.md A7: «уточнить») — метка у них прежняя
    provenance: bySource(exported.filter((q) => !cbIds.has(q.id) && q.meta?.source !== 'JTS Original')),
    rejected: {
      total: problems.length,
      byMessage: problems.reduce((a, p) => ((a[p.message] = (a[p.message] || 0) + 1), a), {}),
      items: problems,
    },
    // правки текста College Board при выгрузке: склеенные слова и выброшенные соринки
    cleanup: { splitWordsJoined: splitFixed.count, specksRemoved: specks.length, ...fixes, sprFromExplanation: recovered.length, recovered, specks },
    media: {
      files: media.size,
      byExt: [...media.keys()].reduce((a, n) => ((a[n.split('.').pop()] = (a[n.split('.').pop()] || 0) + 1), a), {}),
      bytes: [...media.keys()].reduce((a, n) => a + fs.statSync(path.join(OUT, 'media', n)).size, 0),
      missing,
      unresolved,
    },
    reference: { colleges: d.colleges?.length, examDates: d.examDates?.length, vocab: d.vocab?.length, cloze: d.vocabCloze?.length, register: d.vocabRegister?.length, desmosSections: d.desmosGuide?.length ?? d.desmosGuide?.sections?.length, lessonsWithText: Object.keys(d.programme?.teach || {}).length },
    prototypeLog: protoLog.filter((l) => l.level !== 'info'),
  }
  writeJson('report.json', report)
  const brief = { ...report, corrections: report.corrections.applied, rejected: { total: report.rejected.total, byMessage: report.rejected.byMessage }, cleanup: { ...report.cleanup, specks: report.cleanup.specks.length } }
  console.log(JSON.stringify(brief, null, 1))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
