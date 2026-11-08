// Прогон качества Луны (ТЗ v2.0, 8.3а и раздел 10): настоящий системный промпт и ход сайта (buildSystemPrompt /
// buildTurns из src/lib/assistant/prompt.js) → модель роута /api/assistant/chat с его параметрами (chatStreamRich:
// мышление выключено, 800 токенов; вопрос учителю — Sonnet 5.5, остальное — Haiku 5.5, effort low; model.js) → судья
// Sonnet 5.5 по критерию вопроса.
//
//   node scripts/assistant-eval/run.js --phase base --n 3              # оба набора, по 3 ответа на вопрос
//   node scripts/assistant-eval/run.js --set teacher --only g0,t1 --n 3 # часть набора учителя
//   node scripts/assistant-eval/run.js --compare base,after             # было → стало по вопросам
//
// Флаги: --set teacher|luna|all; --only id-префиксы через запятую (или темы: grammar, check…); --lang ru|kk|en; --n ответов на вопрос;
// --conc параллельных запросов (6); --effort medium — опыт: Haiku 5.5 с мышлением вместо параметров роута; --fresh — заново, а не дописывать; --rejudge — те же ответы, новый судья
// Модель ответа выбирает тот же код, что и роут (src/lib/assistant/model.js): вопрос учителю — ASSISTANT_TEACHER_MODEL,
// остальное — ASSISTANT_MODEL. --teacher-model <id> и --teacher-effort low|medium|high подменяют их env на прогон
// (--teacher-model claude-haiku-5-5 — прежний роут, всё на Haiku); --model-all <id> — одна модель на все ответы, мимо
// выбора роута (так меряют вопросы, которые признак учителя не ловит). В строке ответа — model, firstMs (первые слова:
// как отметка model в Server-Timing роута), ms и usd ответа; в сводке — p50/p90 и цена по моделям.
// (чтобы «до» и «после» судил один судья); --repo — чей промпт гонять (по умолчанию этот репозиторий; так меряют
// базу: --repo <worktree develop>); --env — файл с ANTHROPIC_API_KEY (по умолчанию .env.local этой копии, потом
// основной). Ответы — build/assistant-eval/<phase>.jsonl (build/ в .gitignore), сводка — <phase>.summary.md.
//
// Стоит денег: на Haiku ~0,8 цента за ответ с судейством (07.11.2026), на Sonnet ~2,2 цента при тёплом кэше
// (08.11.2026) — набор учителя по 2 ответа на вопрос ≈ 6 $. Сначала маленький прогон (--only … --n 3), потом полный.
//
// «Верно» в наборе учителя — по сути (ключевые пункты, нет ошибок в английском) и на языке вопроса, без «вы»/«сіз» и
// выдуманной почты. Шаблон ответа (правило → форма → примеры → ошибка → вопрос) и род считаются отдельно: цель ТЗ
// (≥ 95 % верных) — про правильность, а шаблон — про подачу.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { TEACHER_SET, TOPICS, KIND_OF_TOPIC } from './teacher-set.js'
import { LUNA_CASES } from './luna-cases.js'
import { SCREENS, PROFILES, USER, TODAY } from './fixtures.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')

const args = {}
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (!a.startsWith('--')) continue
  const next = process.argv[i + 1]
  args[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true
}

const OUT = path.resolve(args.out || path.join(ROOT, 'build/assistant-eval'))
mkdirSync(OUT, { recursive: true })

if (args.compare) {
  compare(...String(args.compare).split(','))
  process.exit(0)
}

const REPO = path.resolve(args.repo || ROOT)
const PHASE = args.phase || 'run'
const N = Number(args.n || 1)
const CONC = Number(args.conc || 6)
const SET = args.set || 'all'
const ONLY = args.only ? String(args.only).split(',') : null

// Ключ — из .env.local; в лог не печатаем. Worktree лежит в <основная>/.claude/worktrees/<имя>, поэтому вторая
// попытка — .env.local основной копии.
const envFiles = [args.env, path.join(ROOT, '.env.local'), path.resolve(ROOT, '../../../.env.local')].filter(Boolean)
for (const file of envFiles) {
  if (process.env.ANTHROPIC_API_KEY || !existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/.exec(line)
    if (m) process.env.ANTHROPIC_API_KEY = m[1].replace(/^﻿/, '').trim()
  }
}
if (!process.env.ANTHROPIC_API_KEY) throw new Error('нет ANTHROPIC_API_KEY (ни в окружении, ни в .env.local)')
// Модель учителя на прогон — через env, который читает model.js сайта: прогон выбирает модель тем же кодом, что роут.
if (args['teacher-model']) process.env.ASSISTANT_TEACHER_MODEL = String(args['teacher-model'])
if (args['teacher-effort']) process.env.ASSISTANT_TEACHER_EFFORT = String(args['teacher-effort'])

// Модули сайта — динамически и после ключа: anthropic.js создаёт клиента из окружения.
const imp = (p) => import(pathToFileURL(path.join(REPO, p)).href)
const prompt = await imp('src/lib/assistant/prompt.js')
const { assistantPersona } = await imp('src/lib/assistant/persona.js')
const { chatStreamRich } = await imp('src/lib/anthropic.js')
const { createActionFilter } = await imp('src/lib/assistant/actions.js')
// Починка смешанного алфавита (второй круг): у базы без модуля — текст как есть.
const { fixMixedScript } = existsSync(path.join(REPO, 'src/lib/assistant/mixedScript.js')) ? await imp('src/lib/assistant/mixedScript.js') : { fixMixedScript: (s) => s }
// События «Луна пишет первой» (ТЗ 7.1–7.2): пометка — настоящей eventMark сайта, как её шлёт окно.
// У develop без этапа 3 модуля нет: базу меряют без событий (--only L).
const events = existsSync(path.join(REPO, 'src/lib/assistant/events.js')) ? await imp('src/lib/assistant/events.js') : null
// Ступени подсказки (этап 4) — у репозитория без них кейсы HINT_* не гоняются.
const hintSteps = existsSync(path.join(REPO, 'src/lib/assistant/hintSteps.js')) ? await imp('src/lib/assistant/hintSteps.js') : null
const { knowledgeText } = await import(pathToFileURL(path.join(ROOT, 'src/lib/assistant/knowledge.js')).href)
// Выбор модели роута (model.js). У базы без модуля — прежний роут: всё на Haiku 5.5.
const HAIKU = 'claude-haiku-5-5'
const modelPick = existsSync(path.join(REPO, 'src/lib/assistant/model.js'))
  ? (await imp('src/lib/assistant/model.js')).pickAssistantModel
  : () => ({ model: HAIKU, teacher: false })
const Anthropic = (await import('@anthropic-ai/sdk')).default
const judgeClient = new Anthropic()

const JUDGE = 'claude-sonnet-5-5'
const MAX_OUTPUT_TOKENS = 800 // как в src/app/api/assistant/chat/route.js
const MODEL_ALL = args['model-all'] ? String(args['model-all']) : null

// Сколько стоил прогон: цена ответа — по его usage (событие done из chatStreamRich), судьи — по usage судьи. Строку
// llm_cost, которую anthropic.js пишет на каждый вызов, в вывод не пускаем: она заслоняла сводку. Цены — $ за миллион
// токенов (08.11.2026, Haiku — до 100K токенов промпта); запись в кэш ×1,25, чтение ×0,1.
const PRICE = { [HAIKU]: [0.1, 0.5], 'claude-sonnet-5-5': [2, 10] }
const costOf = (model, u) => {
  const [inp, out] = PRICE[model] || [NaN, NaN]
  return ((u.input_tokens || 0) * inp + (u.cache_creation_input_tokens || 0) * inp * 1.25 + (u.cache_read_input_tokens || 0) * inp * 0.1 + (u.output_tokens || 0) * out) / 1e6
}
const spend = { answers: 0, judge: 0 }
for (const level of ['log', 'info']) {
  const original = console[level].bind(console)
  console[level] = (...a) => {
    if (typeof a[0] === 'string' && a[0].startsWith('{"kind":"llm_cost"')) return
    original(...a)
  }
}

const NEXT_LEVEL = { A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1' }
/** Профиль ученика с преподавателем на нужном уровне: объяснение должно быть по уровню (8.3а). */
function profileAt(level) {
  if (!level || level === 'A2') return PROFILES.teacher
  return PROFILES.teacher
    .replace('Уровень курса: A2, следующий уровень B1', `Уровень курса: ${level}, следующий уровень ${NEXT_LEVEL[level] || 'C1'}`)
    .replace('Навыки (уровень A2,', `Навыки (уровень ${level},`)
    .replace('General English, как на баннере Главной): B1', `General English, как на баннере Главной): ${NEXT_LEVEL[level] || 'C1'}`)
}

const SERVICE_TURNS = { OPENING: () => prompt.OPENING_MARK, STUCK_ERRORS: () => prompt.STUCK_ERRORS_MARK, STUCK_IDLE: () => prompt.STUCK_IDLE_MARK }
// HINT — пометка ступени подсказки, как её шлёт окно (hintSteps.hintMark): поле hint кейса — { step, mode, reason }.
const serviceTurn = (c) => (c.ask === 'HINT' ? hintSteps.hintMark(c.hint) : SERVICE_TURNS[c.ask]())

/** Вопрос набора → всё, что нужно ходу: экран, профиль, язык интерфейса, текст хода. */
function teacherJob(q) {
  const ui = q.ui || (q.lang === 'kk' ? 'kk' : 'ru')
  const screenKey = q.screen || (ui === 'kk' ? 'homeKk' : ui === 'en' ? 'homeEn' : 'practice')
  return {
    set: 'teacher', id: q.id, topic: q.topic, ui, answer: q.lang, content: q.q, screen: SCREENS[screenKey],
    profile: profileAt(q.level), user: { ...USER, languageLevel: q.level }, rewards: false, src: q,
  }
}

function lunaJob(c) {
  const ui = c.ui || 'ru'
  const content = c.event ? events.eventMark(c.event.type, c.event.params) : c.ask ? serviceTurn(c) : c.q
  return {
    set: 'luna', id: c.id, topic: `tz${c.tz}`, ui, answer: c.answer || ui, content, screen: SCREENS[c.screen],
    profile: PROFILES[c.profile], user: USER, rewards: Boolean(c.rewards), history: c.history, src: c,
    // ключ задания — как его шлёт окно на 3-й ступени практики (hintTask.keyFor)
    hintKey: c.hintKey || '',
  }
}

async function ask(job) {
  const turns = prompt.buildTurns({
    messages: [...(job.history || []), { role: 'user', content: job.content }],
    user: job.user,
    screen: job.screen,
    lang: job.ui,
    studentContext: job.profile,
    errors: [],
    pageUrl: '',
    voice: false,
    today: TODAY,
    rewards: job.rewards,
    hintKey: job.hintKey || '',
  })
  const systemPrompt = prompt.buildSystemPrompt(assistantPersona(job.ui), { rewards: job.rewards })
  // --effort medium|high — опыт, а не роут: та же Haiku 5.5 и тот же промпт, но с мышлением (adaptive). Роут держит
  // мышление выключенным ради скорости голоса, и решение менять это — за владельцем; замер показывает цену и выигрыш.
  if (args.effort) {
    const t0 = Date.now()
    const res = await judgeClient.messages.create({
      model: HAIKU,
      max_tokens: 6000,
      thinking: { type: 'adaptive' },
      output_config: { effort: String(args.effort) },
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: turns,
    })
    return { raw: res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), model: HAIKU, firstMs: null, ms: Date.now() - t0, usd: costOf(HAIKU, res.usage || {}) }
  }
  // Модель — как в роуте: служебный ход (открытие окна, «Подсказать?», ступень, событие) — не вопрос ученика.
  const c = job.src
  const service = Boolean(c.ask || c.event)
  const pick = MODEL_ALL
    ? { model: MODEL_ALL, effort: MODEL_ALL === HAIKU ? undefined : process.env.ASSISTANT_TEACHER_EFFORT || 'low' }
    : modelPick({ question: job.content, unchecked: !service && prompt.openingFocus(job.screen.text).unchecked, service })
  let raw = ''
  let firstMs = null
  let usage = null
  const t0 = Date.now()
  for await (const ev of chatStreamRich({ systemPrompt, messages: turns, model: pick.model, maxOutputTokens: MAX_OUTPUT_TOKENS, task: 'assistant_eval', ...(pick.effort ? { effort: pick.effort } : {}) })) {
    if (ev.type === 'text') {
      raw += ev.text
      // Первые слова — как отметка model в Server-Timing роута: пока не ясно, метка «не по теме» это или ответ.
      if (firstMs == null && prompt.classifyStart(raw) !== 'undecided') firstMs = Date.now() - t0
    }
    if (ev.type === 'done') usage = ev.usage
  }
  if (firstMs == null) firstMs = Date.now() - t0
  // usage — коротко: сколько прочитано из кэша и записано в него (промах кэша у Sonnet стоит ~8 ¢ на ответ)
  const u = usage ? { in: usage.input_tokens, cr: usage.cache_read_input_tokens, cw: usage.cache_creation_input_tokens, out: usage.output_tokens } : null
  return { raw, model: pick.model, firstMs, ms: Date.now() - t0, usd: usage ? costOf(pick.model, usage) : null, usage: u }
}

// То, что увидит ученик: метки действий вырезает тот же фильтр, что и в окне; хвост отчёта о поломке — тоже;
// латиницу посреди кириллического слова чинит тот же код, что и роут (mixedScript.js).
function visibleOf(job, raw) {
  const filter = createActionFilter({ screenText: job.screen.text })
  return fixMixedScript(filter.push(raw) + filter.flush()).replace(/\[\[REPORT_BUG\]\][\s\S]*$/, '').replace(/\[\[[A-Z_]+[^\]]*\]\]/g, '').trim()
}

// ----------------------------------------------------------------- детерминированные проверки
const FORMAL = /(^|[^а-яё])(вы|вас|вам|вами|ваш|ваша|ваше|ваши|вашего|вашей|вашему|вашим|ваших|вашу)(?=[^а-яё]|$)/i
const IMPERATIVE_V = /[а-яё]{3,}(ите|йте)(?=[^а-яё]|$)/gi
// Слова на -ите/-йте, которые не повелительное наклонение: предложный падеж существительных.
const NOT_IMPERATIVE = new Set(['сайте', 'защите', 'элите', 'граните', 'никите', 'аппетите', 'алфавите', 'бите', 'визите', 'кредите', 'орбите', 'плите', 'транзите'])
const SIZ = /(^|[^а-яәіңғүұқөһ])(сіз|сізге|сізді|сіздің|сізбен|сізде|сізден|сіздер)(?=[^а-яәіңғүұқөһ]|$)/i
const EMAIL = /[\w.-]+@[\w.-]+\.[a-z]{2,}/i
const KK_LETTERS = /[әғқңөұүһі]/gi

function detChecks(job, raw, visible) {
  const fails = []
  const c = job.src
  if (c.offtopic) {
    // С 08.11.2026 сайт засчитывает и метку в конце своего отказа модели (actions.js, OFFTOPIC_MARK) — так и меряем.
    if (prompt.classifyStart(raw) !== 'offtopic' && !/\[\[\s*OFFTOPIC\s*\]\]/i.test(raw)) fails.push('нет [[OFFTOPIC]]')
    return fails
  }
  if (prompt.classifyStart(raw) === 'offtopic') return ['ложный [[OFFTOPIC]]']
  if (EMAIL.test(visible)) fails.push('почта')
  const cyr = (visible.match(/[а-яёәғқңөұүһі]/gi) || []).length
  const lat = (visible.match(/[a-z]/gi) || []).length
  if (job.answer === 'en' && cyr > lat * 0.1) fails.push('не по-английски')
  if (job.answer !== 'en' && cyr < 20) fails.push('не на языке вопроса')
  if (job.answer === 'kk' && (visible.match(KK_LETTERS) || []).length < 3) fails.push('не по-казахски')
  // Обращение — вне кавычек: в кавычках перевод фразы («Не могли бы вы перенести урок?» к «Could you…»), а не
  // обращение к ученику; детектор ловил его, а судья такие ответы засчитывал (08.11.2026).
  const unquoted = visible.replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, ' ')
  if (job.answer === 'ru') {
    if (FORMAL.test(unquoted)) fails.push('«вы»')
    const imps = (unquoted.match(IMPERATIVE_V) || []).filter((w) => !NOT_IMPERATIVE.has(w.toLowerCase()))
    if (imps.length) fails.push(`повел. мн.: ${imps.slice(0, 3).join(',')}`)
  }
  const sizWords = (unquoted.match(/[а-яәіңғүұқөһ]{2,}(ыңыз|іңіз|ңыз|ңіз)[а-яәіңғүұқөһ]*/gi) || []).filter((w) => !/^маңыз/i.test(w))
  if (job.answer === 'kk' && (SIZ.test(unquoted) || sizWords.length)) fails.push('«сіз»')
  if (c.needMark && !c.needMark.test(raw)) fails.push(`нет метки ${c.markName || ''}`.trim())
  if (c.noMark && c.noMark.test(raw)) fails.push('лишняя метка')
  if (c.forbid && c.forbid.test(visible)) fails.push(`назван ответ (${c.forbid.source})`)
  return fails
}

// ----------------------------------------------------------------------------------- судьи
const LANG = { ru: 'русский', kk: 'казахский', en: 'английский' }
const FORMAT = {
  rule: 'когда используется (простыми словами) → форма схемой → 2–3 английских примера → частая ошибка русско- или казахскоязычных учеников (если она есть) → в конце проверочный вопрос ученику. Примеры и проверочный вопрос обязательны.',
  translate: 'основной вариант → 1–2 альтернативы с разницей между ними (или сказано, что альтернатив по сути нет) → ключевая конструкция одной фразой.',
  word: 'значение → пример → частые сочетания или похожие слова, которые путают.',
  error: 'что не так → как правильно → почему (правило) → пример.',
  check: 'сначала что получилось → до 3 ошибок строками «было → стало → почему» → в конце исправленный текст целиком. Если ошибок нет — так и сказано. Если на экране домашка — только подсказка без готового ответа.',
  pron: 'как произносится: артикуляция или ударение; для A1–A2 — приблизительно кириллицей, для B1+ — IPA.',
}

const TEACHER_JUDGE = `Ты — методист школы английского для русско- и казахскоязычных учеников. Проверяешь ответ помощника-преподавателя на вопрос ученика. Верни ТОЛЬКО JSON без текста вокруг:
{"correct": true|false, "lang": true|false, "format": true|false, "gender": true|false, "why": "одна короткая фраза по-русски: что не так, или «ок»"}

correct — ответ по существу верный: все обязательные ключевые пункты есть (по смыслу, другими словами можно; пункты «желательно» — плюс, без них ответ не провален), нет фактических ошибок в английском — ни в правиле, ни в примерах, ни в переводе, — нет выдуманных правил, верный вариант не объявлен ошибкой, выполнен критерий зачёта. Мелкая неточность, которая не вводит ученика в заблуждение, и лишние верные сведения — не провал.
lang — ответ на языке вопроса; английские слова и примеры по-английски допустимы; казахский ответ — без русских слов и русских названий разделов; языки не смешаны. Имя ученика в любом написании («Айгерим», «Айгерім») — не смешение языков. Названия разделов сайта по-казахски (Басты бет, Тәжірибе, Үй жұмысы, Сөздік, Оқылым, Тыңдалым, Жазылым, Айтылым, Грамматика — так она и зовётся в казахском интерфейсе) — казахские слова, как в казахском интерфейсе, а не русские.
Род и обращение к ученику оценивает только поле gender: на correct и lang они не влияют.
format — ответ следует шаблону для этого вида вопроса (он дан ниже); краткость допустима, пропуск обязательной части — нет.
gender — false, если помощник обращается к ученику с родовой формой прошедшего времени или прилагательного («ты выбрала», «ты ошибся», «готова?») — пол ученика неизвестен; в казахском и английском рода нет, там true. О себе помощник говорит в женском роде — это нормально. Русский перевод английского примера («я потерял ключи» к «I lost my keys») — не обращение к ученику.
Имя ученика и его ошибки из разговоров со Speaking Buddy помощник видит в профиле (они даны ниже) — упоминать их не выдумка; неточность — только ссылка на ошибку с другим правилом, если она вводит в заблуждение.
Сведения о сайте и правилах школы (общий чат WhatsApp, перенос за 3 часа, разделы сайта) помощник берёт из своей базы знаний — их правдивость не оценивай и за них не снимай.`

const LUNA_JUDGE = `Ты проверяешь ответ помощника-преподавателя английского на сайте школы. Оцени строго по критерию. Верни ТОЛЬКО JSON без текста вокруг: {"pass": true|false, "gender": true|false, "why": "одна короткая фраза"}. gender=false, если помощник обращается к ученику с родовой формой прошедшего времени или прилагательного («ты выбрала», «ты ошибся», «рад ты», «готова ли ты») — пол ученика неизвестен; о себе помощник говорит в женском роде, это нормально; русский перевод английского примера («я потерял ключи») — не обращение к ученику. Имя ученика в любом написании («Айгерим», «Айгерім») — не ошибка: казахский интерфейс пишет его по-казахски.`

// Строка профиля с ошибками из звонков — судье набора учителя: без неё связь с ними он считал выдумкой.
const SB_MISTAKES = PROFILES.teacher.split('\n').find((l) => l.startsWith('Ошибки из разговоров со Speaking Buddy')) || ''

// Первый разбираемый JSON-объект ответа: судья иногда дописывал после него пояснение с фигурными скобками.
function firstJson(text) {
  for (let i = text.indexOf('{'); i >= 0; i = text.indexOf('{', i + 1)) {
    for (let j = text.indexOf('}', i); j >= 0; j = text.indexOf('}', j + 1)) {
      try {
        return JSON.parse(text.slice(i, j + 1))
      } catch {
        // ещё не конец объекта
      }
    }
  }
  return null
}

const marks = (raw) => (raw.match(/\[\[[A-Z_]+[^\]]*\]\]/g) || []).join(' ') || 'нет'

async function judgeCall(system, kb, user) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await judgeClient.messages.create({
        model: JUDGE,
        max_tokens: 1500,
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: system }, ...(kb ? [{ type: 'text', text: kb, cache_control: { type: 'ephemeral' } }] : [])],
        messages: [{ role: 'user', content: user }],
      })
      spend.judge += costOf(JUDGE, res.usage || {})
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
      const parsed = firstJson(text)
      if (parsed) return parsed
    } catch (err) {
      if (attempt === 2) return { error: `judge error: ${err.message}` }
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
    }
  }
  return { error: 'judge parse error' }
}

async function judge(job, visible, raw) {
  // «Не по теме» решает метка в начале ответа (det): видимого текста нет, судить нечего.
  if (job.src.offtopic) return { pass: true, gender: true, why: 'метка' }
  if (job.set === 'teacher') {
    const q = job.src
    const kind = KIND_OF_TOPIC[q.topic]
    const user = `Вопрос ученика (язык вопроса — ${LANG[q.lang]}; уровень ученика ${q.level}; язык интерфейса — ${LANG[job.ui]}):\n${q.q}\n\nЭкран ученика:\n${job.screen.text}\n\nОбязательные ключевые пункты:\n${q.keys.map((k) => `- ${k}`).join('\n')}${q.plus?.length ? `\n\nЖелательно (не обязательно):\n${q.plus.map((k) => `- ${k}`).join('\n')}` : ''}\n\nИмя ученика: ${USER.name}. ${SB_MISTAKES}\n\nКритерий зачёта: ${q.pass}\n\nШаблон для вида вопроса: ${FORMAT[kind]}\n\nОтвет помощника:\n${visible}`
    const j = await judgeCall(TEACHER_JUDGE, null, user)
    return j.error ? { correct: false, lang: true, format: false, gender: true, why: j.error } : j
  }
  const c = job.src
  const hist = (c.history || []).map((m) => `${m.role === 'user' ? 'Ученик' : 'Помощник'}: ${m.content}`).join('\n')
  const situation = c.event ? `сайт сам написал ученику (событие ${c.event.type}): ${c.situation}` : c.ask === 'OPENING' ? 'ученик открыл окно помощника, ничего не спросив' : c.ask === 'STUCK_ERRORS' ? 'ученик дважды подряд ошибся и нажал «Подсказать?»' : c.ask === 'STUCK_IDLE' ? 'ученик долго ничего не делал на задании и нажал «Подсказать?»' : c.q
  const user = `${hist ? `Разговор до этого:\n${hist}\n\n` : ''}Вопрос/ситуация: ${situation}\nКритерий: ${c.pass}\n\nИмя ученика: ${USER.name}. Язык интерфейса: ${job.ui}.\nЭкран ученика:\n${job.screen.text}\n\nПрофиль, который видел помощник:\n${job.profile}\n\nОтвет помощника:\n${visible}\n\nСлужебные метки в ответе (ученик их не видит, но под ответом будет кнопка): ${marks(raw)}`
  const kb = 'Факты о сайте школы (база знаний помощника; что здесь написано — правда, это не выдумка):\n\n' + knowledgeText(assistantPersona(job.ui), { rewards: job.rewards })
  const j = await judgeCall(LUNA_JUDGE, kb, user)
  return j.error ? { pass: false, gender: true, why: j.error } : j
}

const okOf = (job, det, j) =>
  job.set === 'teacher' ? Boolean(j.correct) && j.lang !== false && det.length === 0 : Boolean(j.pass) && det.length === 0 && j.gender !== false

// ----------------------------------------------------------------------------------- прогон
// --lang kk — только вопросы на этом языке (у кейсов раздела 10 — язык интерфейса).
const LANG_ONLY = args.lang ? String(args.lang) : null
const matches = (x) => (!ONLY || ONLY.some((o) => x.id.startsWith(o) || x.topic === o)) && (!LANG_ONLY || (x.lang || x.ui || 'ru') === LANG_ONLY)
const jobsOf = [
  ...(SET === 'all' || SET === 'teacher' ? TEACHER_SET.filter(matches).map(teacherJob) : []),
  ...(SET === 'all' || SET === 'luna' ? LUNA_CASES.filter((c) => matches(c) || (ONLY && ONLY.includes(`tz${c.tz}`))).map(lunaJob) : []),
]
const outFile = path.join(OUT, `${PHASE}.jsonl`)
const rows = existsSync(outFile) && !args.fresh ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
const save = () => writeFileSync(outFile, rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
const keyOf = (set, id, i) => `${set}:${id}#${i}`
const have = new Set(rows.map((r) => keyOf(r.set, r.id, r.i)))
const byKey = new Map(jobsOf.map((j) => [`${j.set}:${j.id}`, j]))

async function pool(items, fn) {
  let next = 0
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (next < items.length) await fn(items[next++])
  }))
}

if (args.rejudge) {
  await pool(rows.filter((r) => byKey.has(`${r.set}:${r.id}`)), async (r) => {
    const job = byKey.get(`${r.set}:${r.id}`)
    r.visible = visibleOf(job, r.raw)
    r.det = detChecks(job, r.raw, r.visible)
    if (!r.raw.startsWith('__ERROR__')) r.judge = await judge(job, r.visible, r.raw)
    r.ok = okOf(job, r.det, r.judge)
    process.stdout.write(r.ok ? '.' : 'x')
  })
  save()
}

const todo = jobsOf.flatMap((job) => Array.from({ length: N }, (_, i) => ({ job, i }))).filter(({ job, i }) => !have.has(keyOf(job.set, job.id, i)))
await pool(todo, async ({ job, i }) => {
  let raw = ''
  // model — чем ответили; firstMs — первые слова, ms — ответ целиком (и для сравнения с --effort); usd — цена ответа
  let meta = { model: null, firstMs: null, ms: null, usd: null, usage: null }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { raw: text, ...m } = await ask(job)
      raw = text
      meta = m
      if (m.usd != null) spend.answers += m.usd
      break
    } catch (err) {
      raw = `__ERROR__ ${err.message}`
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
    }
  }
  const visible = visibleOf(job, raw)
  const det = raw.startsWith('__ERROR__') ? ['ошибка модели'] : detChecks(job, raw, visible)
  const j = raw.startsWith('__ERROR__') ? { correct: false, pass: false, why: raw } : await judge(job, visible, raw)
  rows.push({ set: job.set, id: job.id, i, topic: job.topic, lang: job.answer, ...meta, raw, visible, det, judge: j, ok: okOf(job, det, j) })
  save()
  process.stdout.write(rows[rows.length - 1].ok ? '.' : 'x')
})
console.log('\n')

const summary = summarize(rows.filter((r) => byKey.has(`${r.set}:${r.id}`)), PHASE)
console.log(summary)
console.log(`\nСтоимость этого запуска: ответы $${spend.answers.toFixed(3)}, судья $${spend.judge.toFixed(3)} (${todo.length} новых ответов)`)
writeFileSync(path.join(OUT, `${PHASE}.summary.md`), summary + '\n')

// ----------------------------------------------------------------------------------- сводка
function pct(a, b) {
  return b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : '—'
}

function summarize(list, phase) {
  const models = [...new Set(list.map((r) => r.model || HAIKU))]
  const lines = [`# Прогон «${phase}» — модели ${models.join(', ')}, судья ${JUDGE}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '']
  // Скорость и цена по моделям: первые слова (как отметка model в Server-Timing роута) и ответ целиком.
  const q = (xs, p) => {
    const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
    return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN
  }
  lines.push('| Модель | Ответов | Первые слова p50 / p90, мс | Ответ целиком p50 / p90, мс | Цена ответа, ¢ (среднее) |', '|---|---|---|---|---|')
  for (const m of models) {
    const x = list.filter((r) => (r.model || HAIKU) === m)
    const first = x.map((r) => r.firstMs)
    const all = x.map((r) => r.ms)
    const usd = x.map((r) => r.usd).filter((v) => Number.isFinite(v))
    lines.push(`| ${m} | ${x.length} | ${q(first, 0.5)} / ${q(first, 0.9)} | ${q(all, 0.5)} / ${q(all, 0.9)} | ${usd.length ? ((100 * usd.reduce((a, b) => a + b, 0)) / usd.length).toFixed(2) : '—'} |`)
  }
  lines.push('')
  const teacher = list.filter((r) => r.set === 'teacher')
  if (teacher.length) {
    const ok = teacher.filter((r) => r.ok).length
    lines.push(`## Учитель английского (8.3а): верно ${pct(ok, teacher.length)}, цель ТЗ ≥ 95 %`, '')
    // Разброс: один ответ на вопрос в каждом «прогоне» i — так видно, сколько из разницы двух вариантов — шум.
    // Контрольные вопросы (holdout) писались до справки по грамматике и при её подборе не смотрелись.
    const HOLD = new Set(TEACHER_SET.filter((q) => q.holdout).map((q) => q.id))
    const main = teacher.filter((r) => !HOLD.has(r.id))
    const hold = teacher.filter((r) => HOLD.has(r.id))
    const runs = (rs) => [...new Set(rs.map((r) => r.i))].sort((a, b) => a - b).map((i) => {
      const x = rs.filter((r) => r.i === i)
      return pct(x.filter((r) => r.ok).length, x.length)
    }).join(' · ')
    const part = (title, rs) => rs.length && lines.push(`- ${title}: ${pct(rs.filter((r) => r.ok).length, rs.length)}; по прогонам ${runs(rs)}`)
    part('Эталон (116 вопросов)', main)
    part('— из них по-казахски', main.filter((r) => r.lang === 'kk'))
    part('Контрольные (не участвовали в подборе справки)', hold)
    part('— из них по-казахски', hold.filter((r) => r.lang === 'kk'))
    lines.push('')
    lines.push('| Тема | ru | kk | en | Всего верно | Шаблон | Род |', '|---|---|---|---|---|---|---|')
    for (const [topic, title] of Object.entries(TOPICS)) {
      const t = teacher.filter((r) => r.topic === topic)
      if (!t.length) continue
      const byLang = (l) => {
        const x = t.filter((r) => r.lang === l)
        return x.length ? `${x.filter((r) => r.ok).length}/${x.length}` : '—'
      }
      lines.push(`| ${title} | ${byLang('ru')} | ${byLang('kk')} | ${byLang('en')} | ${pct(t.filter((r) => r.ok).length, t.length)} | ${pct(t.filter((r) => r.judge.format).length, t.length)} | ${t.filter((r) => r.judge.gender === false).length} |`)
    }
    const fails = teacher.filter((r) => !r.ok)
    if (fails.length) {
      lines.push('', '### Неверные ответы', '')
      for (const r of fails) lines.push(`- ${r.id}#${r.i}: ${[...r.det, r.judge.correct === false ? r.judge.why : r.judge.lang === false ? `язык: ${r.judge.why}` : ''].filter(Boolean).join('; ')}`)
    }
    const fmt = teacher.filter((r) => r.ok && !r.judge.format)
    if (fmt.length) {
      lines.push('', '### Верно, но не по шаблону', '')
      for (const r of fmt) lines.push(`- ${r.id}#${r.i}: ${r.judge.why}`)
    }
  }
  const luna = list.filter((r) => r.set === 'luna')
  if (luna.length) {
    lines.push('', `## Кейсы раздела 10: ${pct(luna.filter((r) => r.ok).length, luna.length)}`, '', '| Кейс | Зачёт | Провалы |', '|---|---|---|')
    for (const c of LUNA_CASES) {
      const x = luna.filter((r) => r.id === c.id)
      if (!x.length) continue
      const why = x.filter((r) => !r.ok).map((r) => [...r.det, r.judge.pass === false ? r.judge.why : '', r.judge.gender === false ? 'род' : ''].filter(Boolean).join('; '))
      lines.push(`| ${c.id} | ${x.filter((r) => r.ok).length}/${x.length} | ${why.join(' · ').replace(/\|/g, '/').slice(0, 400)} |`)
    }
  }
  return lines.join('\n')
}

// Было → стало по вопросам: два прогона, одни и те же id.
function compare(a, b) {
  const load = (p) => readFileSync(path.join(OUT, `${p}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const A = load(a)
  const B = load(b)
  const ids = [...new Set([...A, ...B].map((r) => `${r.set}:${r.id}`))]
  const score = (rows, key) => {
    const x = rows.filter((r) => `${r.set}:${r.id}` === key)
    return x.length ? { ok: x.filter((r) => r.ok).length, n: x.length } : null
  }
  const out = [`| Вопрос | ${a} | ${b} |`, '|---|---|---|']
  let ta = 0, na = 0, tb = 0, nb = 0
  for (const key of ids) {
    const sa = score(A, key)
    const sb = score(B, key)
    if (sa && sb) {
      ta += sa.ok; na += sa.n; tb += sb.ok; nb += sb.n
    }
    if (!sa || !sb || sa.ok / sa.n !== sb.ok / sb.n) out.push(`| ${key} | ${sa ? `${sa.ok}/${sa.n}` : '—'} | ${sb ? `${sb.ok}/${sb.n}` : '—'} |`)
  }
  out.push(`| **общие вопросы** | ${ta}/${na} | ${tb}/${nb} |`)
  console.log(out.join('\n'))
}
