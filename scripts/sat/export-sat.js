// Экспорт контента SAT из прототипа jts-sat-platform в JSON для бэкенда и админки (фаза 0 плана docs/sat/PLAN.md).
//
// Данные прототипа — JavaScript (`js/data/*.js` зовут JTS.data.addQuestions/addPaper), поэтому не парсим их руками,
// а исполняем в node:vm, как extract-reading.js: пробники при загрузке сами переводятся в схему банка
// (`paperQuestion`), и экспорт получает ровно то, что видел прототип.
//
// Запуск: node scripts/sat/export-sat.js [--src <путь к jts-sat-platform>] [--out build/sat]
//
// Пишет (build/ — в .gitignore, это не исходник, а посылка для импорта):
//   questions/<домен>.json   — пакеты { format: 'jts-sat-bundle', items } по 8 доменам, вперемешку bank/paper/lesson
//   papers.json              — состав пробников: модули по порядку экзамена и id вопросов
//   taxonomy.json            — домены и навыки с examWeight (их читают планировщик, mock и онбординг)
//   reference/*.json         — вузы, даты экзаменов, главы онбординга, гид Desmos, глоссарий, курс, словарь, игры
//   media/<sha256-24>.<ext> — картинки вопросов (имя как у медиа IELTS бэкенда); в HTML вместо пути стоит `sat-media:<имя>`, адрес подставит сервер
//   report.json              — счётчики, отклонённые вопросы и дубли
//
// Картинки: пути `assets/sat/...` копируются, base64 внутри HTML (134 вопроса) раскладывается в файлы. Имя — хэш
// содержимого, поэтому одинаковые картинки ложатся одним файлом, а перевыгрузка не плодит копий.
//
// Вопрос, не прошедший проверку (scripts/sat/bank-validate.js — порт validateAll), в посылку не попадает и
// перечисляется в report.json → rejected с причиной: прототип чинят в прототипе, а экспорт ничего не «угадывает».
// Вопросы из списка college-board-review/items.csv прототипа — материалы College Board SAT Suite Question Bank. С
// 13.10.2026 они идут в посылку: у школы есть лицензия на их использование (сообщение разработчика команды; сам документ
// владельцу хранить рядом со списком). Прототип помечал их `licenseStatus: "original"`, что неверно, — экспорт ставит им
// `licensed`, а `meta.source` оставляет как есть. Флаг --hold-cb возвращает прежнее поведение (не выгружать их вовсе),
// если лицензия окажется не той; report.json → collegeBoard показывает, сколько их вышло.
// Пробник с повторным id (paper-01 и paper-02 оба объявлены `jts-p2`) берётся последний объявленный — так же его
// видел и прототип; вопросы с одинаковым id — тоже последний. Оба случая — в report.json → duplicates.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { validateBank } = require('./bank-validate.js')

const arg = (name, def) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : def
}
const ROOT = path.resolve(__dirname, '..', '..')
const SRC = path.resolve(arg('--src', path.join(ROOT, '..', 'jts-sat-platform')))
const OUT = path.resolve(ROOT, arg('--out', 'build/sat'))

// Порядок загрузки — как в index.html прототипа: таксономия и база банка раньше доменных файлов
const FIRST = ['skills.js', 'questions.js', 'papers.js', 'programme.js', 'programme-units.js']

function loadPrototype() {
  const sandbox = { console }
  sandbox.window = sandbox
  sandbox.JTS = {}
  vm.createContext(sandbox)
  const dir = path.join(SRC, 'js', 'data')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'))
  for (const f of [...FIRST, ...files.filter((f) => !FIRST.includes(f))]) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f })
  }
  return sandbox.JTS.data
}

// ---------------------------------------------------------------- картинки
const media = new Map() // хэш-имя → источник (для отчёта)
const missing = []

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

function rewriteHtml(html, qid) {
  return html
    .replace(/<img[^>]*src="(assets\/sat\/[^"]+)"[^>]*>/g, (m, rel) => {
      const file = path.join(SRC, rel)
      if (fs.existsSync(file) && isSpeck(file)) {
        specks.push({ id: qid, src: rel })
        return ''
      }
      return m
    })
    .replace(/src="(assets\/sat\/[^"]+)"/g, (m, rel) => {
      const file = path.join(SRC, rel)
      if (!fs.existsSync(file)) {
        missing.push({ id: qid, src: rel })
        return m
      }
      return `src="${putMedia(fs.readFileSync(file), path.extname(rel).slice(1).toLowerCase(), rel)}"`
    })
    .replace(/src="data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,([^"]+)"/g, (m, type, b64) => {
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

// Наборы юнитов курса (lesson-questions.js) писали навык длинным именем, а таксономия — короткими id. Без перевода
// все наборы отклонялись («unknown skillId»), и юниты курса показывали «набор готовится».
const SKILL_ALIAS = {
  'math.alg.linear-equations': 'm.alg.linear',
  'math.alg.linear-functions': 'm.alg.linear',
  'math.alg.systems': 'm.alg.systems',
  'math.alg.inequalities-absolute-value': 'm.alg.inequalities',
  'math.adv.quadratics': 'm.adv.quadratics',
  'math.adv.exponentials-radicals': 'm.adv.exponential',
  'math.adv.functions-polynomials-rational': 'm.adv.polynomials',
  'math.psda.ratios-rates-percentages': 'm.psda.ratios',
  'math.psda.statistics-probability': 'm.psda.statistics',
  'math.geo.lines-triangles-area-volume': 'm.geo.triangles',
  'math.geo.right-triangles-trigonometry-circles': 'm.geo.trig-ratios',
  'rw.ii.central-ideas-details': 'rw.ii.central-ideas',
  'rw.ii.command-evidence-textual': 'rw.ii.evidence-textual',
  'rw.ii.command-evidence-quantitative': 'rw.ii.evidence-quantitative',
  'rw.eoi.rhetorical-synthesis': 'rw.ei.rhetorical-synthesis',
  'rw.eoi.transitions': 'rw.ei.transitions',
  // пробник jts-p2, вопрос |2x − 5| = 9: в таксономии нет «нелинейных уравнений», ближайший навык — линейные уравнения
  'unknown:absolute_value': 'm.alg.linear',
}
const fixes = { skillAlias: 0, sprThousands: 0 }
// «6,632» в ответе вписывания: запятую-разделитель тысяч ученик не наберёт (и Bluebook её не принимает) — храним 6632
const thousands = (a) => (typeof a === 'string' && /^[−-]?\d{1,3}(,\d{3})+$/.test(a.trim()) ? (fixes.sprThousands++, a.trim().replace(/,/g, '')) : a)
function normalizeQuestion(q) {
  if (SKILL_ALIAS[q.skillId]) {
    q.skillId = SKILL_ALIAS[q.skillId]
    fixes.skillAlias++
  }
  // юнит 1 курса: у «Words in Context» прототип не записал вопрос — только текст с пропуском. Формулировка у SAT
  // одна и та же, без неё бэкенд вопрос не принимает («Нет текста вопроса»), а ученик не понял бы, что делать
  if (!String(q.stem ?? '').trim() && q.skillId === 'rw.cs.words-in-context' && /_{3,}/.test(q.passage || '')) {
    q.stem = 'Which choice completes the text with the most logical and precise word or phrase?'
    fixes.stemAdded = (fixes.stemAdded || 0) + 1
  }
  if (q.type === 'spr') q.answer = Array.isArray(q.answer) ? q.answer.map(thousands) : thousands(q.answer)
}

// Варианты, испорченные выгрузкой PDF: два одинаковых ответа («3», «3») или дробь «−30/1» вместо числа — у таких вопросов
// правильный ответ не выбрать или он выглядит иначе, чем в разборе. Не выгружаем, пока их не поправят в прототипе.
const optionText = (o) => String(o ?? '').replace(/<img[^>]*src="([^"]+)"[^>]*>/g, ' [$1] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
function brokenOptions(questions) {
  const out = []
  for (const q of questions) {
    if (q.type !== 'mcq' || !Array.isArray(q.options)) continue
    const texts = q.options.map(optionText)
    if (new Set(texts).size !== texts.length) out.push({ id: q.id, path: '/options', message: 'повторяющиеся варианты ответа (испорчены выгрузкой PDF)' })
    else if (texts.some((t) => /^[−-]?\d+\/1$/.test(t))) out.push({ id: q.id, path: '/options', message: 'вариант-дробь «N/1» (испорчен выгрузкой PDF)' })
  }
  return out
}

// JSON.stringify молча выбрасывает функции (у programme это byCode, unitsOf …) — для данных это и нужно
const plain = (v) => JSON.parse(JSON.stringify(v ?? null))

function writeJson(rel, data) {
  const file = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 1))
}

function main() {
  if (!fs.existsSync(path.join(SRC, 'js', 'data'))) throw new Error(`нет прототипа SAT: ${SRC}`)
  const d = loadPrototype()

  const skillIds = new Set(d.skills.map((s) => s.id))
  const lessonCodes = new Set(d.questions.filter((q) => q.meta?.kind === 'lesson').map((q) => q.meta.lessonCode).filter((c) => d.programme?.byCode?.(c)))

  // дубли: последний объявленный побеждает (пробник и его вопросы — одной парой)
  const duplicates = { papers: [], questions: [] }
  const paperById = new Map()
  for (const p of d.papers) {
    if (paperById.has(p.id)) duplicates.papers.push({ id: p.id, dropped: paperById.get(p.id).modules.map((m) => m.key).join(','), kept: p.modules.map((m) => m.key).join(',') })
    paperById.set(p.id, p)
  }
  const papers = [...paperById.values()]
  const qById = new Map()
  for (const q of d.questions) {
    if (qById.has(q.id)) duplicates.questions.push(q.id)
    qById.set(q.id, q)
  }
  const unique = [...qById.values()]

  for (const q of unique) normalizeQuestion(q)
  const problems = [...validateBank(unique, { skillIds, lessonCodes }), ...brokenOptions(unique)]
  const rejectedIds = new Set(problems.map((p) => p.id))
  const heldFile = path.join(SRC, 'college-board-review', 'items.csv')
  const cbList = new Set(
    fs.existsSync(heldFile) ? fs.readFileSync(heldFile, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',')[0]) : [],
  )
  const held = process.argv.includes('--hold-cb') ? cbList : new Set()
  // материалы College Board — по лицензии: метка `licensed`, а не `original` прототипа
  for (const q of unique) if (cbList.has(q.id) && q.meta) q.meta.licenseStatus = 'licensed'
  const questions = unique.filter((q) => !rejectedIds.has(q.id) && !held.has(q.id))
  // пробник с отклонённым вопросом неполон — не выгружаем его целиком, а не с дыркой в модуле
  const paperRejected = papers.filter((p) => p.modules.some((m) => (m.questionIds || m.questions || []).some((x) => rejectedIds.has(typeof x === 'string' ? x : x.id))))

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'media'), { recursive: true })

  // вопросы — пакетами по доменам: одному пакету проще пройти импорт админки, чем 3 тыс. файлов
  const domainOf = new Map(d.skills.map((s) => [s.id, s.domain]))
  const byDomain = new Map()
  for (const q of questions) {
    const item = deepRewrite(plain(q), q.id)
    const dom = domainOf.get(q.skillId)
    if (!byDomain.has(dom)) byDomain.set(dom, [])
    byDomain.get(dom).push(item)
  }
  for (const [dom, items] of byDomain) writeJson(`questions/${dom}.json`, { format: 'jts-sat-bundle', schemaVersion: 1, domain: dom, items })

  writeJson('papers.json', {
    papers: papers.filter((p) => !paperRejected.includes(p)).map((p) => ({
      id: p.id,
      title: p.title,
      year: p.year ?? null,
      note: p.note ?? null,
      modules: p.modules.map((m) => ({ key: m.key, section: m.section, questionIds: (m.questionIds || m.questions || []).map((x) => (typeof x === 'string' ? x : x.id)) })),
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

  const count = (pred) => questions.filter(pred).length
  const report = {
    source: SRC,
    questions: {
      sourceTotal: d.questions.length,
      exported: questions.length,
      bank: count((q) => !q.meta?.kind),
      paper: count((q) => q.meta?.kind === 'paper'),
      lesson: count((q) => q.meta?.kind === 'lesson'),
      rw: count((q) => q.section === 'rw'),
      math: count((q) => q.section === 'math'),
      mcq: count((q) => q.type === 'mcq'),
      spr: count((q) => q.type === 'spr'),
      draft: count((q) => q.meta?.reviewStatus === 'draft'),
    },
    // откуда вопросы по словам самого прототипа: licenseStatus «original» у элементов с source «SAT Question Bank PDF»
    // — противоречие, которое должен разрешить владелец контента до запуска (см. docs/sat/PLAN.md)
    sources: questions.reduce((a, q) => {
      const k = `${q.meta?.source || '?'} · ${q.meta?.licenseStatus || '?'}`
      a[k] = (a[k] || 0) + 1
      return a
    }, {}),
    domains: Object.fromEntries([...byDomain].map(([k, v]) => [k, v.length])),
    papers: papers.map((p) => ({ id: p.id, title: p.title, modules: p.modules.map((m) => `${m.key}:${(m.questionIds || m.questions || []).length}`), incomplete: paperRejected.includes(p) })),
    duplicates,
    collegeBoard: {
      listed: cbList.size,
      exported: questions.filter((q) => cbList.has(q.id)).length,
      held: unique.filter((q) => held.has(q.id)).length,
      list: cbList.size ? 'jts-sat-platform/college-board-review/items.csv' : null,
    },
    rejected: {
      total: problems.length,
      byMessage: problems.reduce((a, p) => ((a[p.message] = (a[p.message] || 0) + 1), a), {}),
      items: problems,
    },
    // правки текста College Board при выгрузке: склеенные слова и выброшенные соринки
    cleanup: { splitWordsJoined: splitFixed.count, specksRemoved: specks.length, ...fixes, specks },
    media: { files: media.size, bytes: [...media.keys()].reduce((a, n) => a + fs.statSync(path.join(OUT, 'media', n)).size, 0), missing },
    reference: { colleges: d.colleges?.length, examDates: d.examDates?.length, vocab: d.vocab?.length, cloze: d.vocabCloze?.length, register: d.vocabRegister?.length, desmosSections: d.desmosGuide?.length ?? d.desmosGuide?.sections?.length },
  }
  writeJson('report.json', report)
  console.log(JSON.stringify(report, null, 1))
}

main()
