// «Практика IELTS» по дизайну «IELTS new» (Figma, раздел 3): каталог по навыкам, страницы навыков с вкладками и короткие
// тренировки — строки из каталогов банка (/mobile/ielts/tests). Чистые функции: экран только рисует, строка знает,
// куда ведёт («open»: место в хабе или прямой запуск диктовки). Опубликованное показывается, пустое — «скоро».
import { CATEGORY_LABEL, DRILLS } from '../reading/meta.js'
import { drills, forTrack, fullTests, singleTexts, typeTrainers } from '../reading/catalog.js'
import { aggLevel, bandLabel } from '../model/levels.js'
import { drillCatalog } from '../writing/drills/drillModel.js'
import { SAMPLE_DRILLS } from '../writing/drills/sampleDrills.js'
import { mockLimits, mockTasks, mockTypeName, mockTypes } from '../writing/mockByType.js'

export const SKILLS = ['listening', 'reading', 'writing', 'speaking']

// Вкладки страницы навыка: ключ, вид хаба (старый адрес списка — диплинки и «Начать» из плана ведут сюда же)
export const SKILL_TABS = {
  listening: [
    // полные тесты (4 части, режим экзамена) отдельно от отдельных частей — правка владельца 11.10.2026
    { key: 'full', view: 'listening-full' },
    { key: 'parts', view: 'listening-tasks' },
    { key: 'types', view: 'listening-types' },
    { key: 'dictation', view: 'listening-dictation' },
    { key: 'spelling', view: 'listening-spelling' },
  ],
  reading: [
    { key: 'types', view: 'types' },
    { key: 'full', view: 'reading-full' },
    { key: 'texts', view: 'texts' },
    { key: 'drills', view: 'drills' },
  ],
  writing: [
    { key: 'task1', view: 'writing-task1' },
    { key: 'task2', view: 'writing-task2' },
    // mock по типу: одно задание графика / письма / жанра эссе в условиях экзамена — writing/mockByType.js, замечание
    // владельца 10 (30.10.2026)
    { key: 'mock', view: 'writing-mocks' },
    // короткие тренировки одного приёма (overview, связки, позиция, регистр) — writing/drills/, правка владельца 30.10.2026
    { key: 'drills', view: 'writing-drills' },
    // «Как писать» — вкладка страницы Writing (ТЗ §3.2); глава — ?ieltsSection=, строк у вкладки нет
    { key: 'guide', view: 'writing-guide' },
  ],
  speaking: [
    { key: 'part1', view: 'speaking-part1' },
    { key: 'part2', view: 'speaking-part2' },
    { key: 'part3', view: 'speaking-part3' },
    { key: 'shadowing', view: 'speaking-shadowing' },
  ],
}

/** Старый вид списка → навык и вкладка (адреса ?ieltsView=types и т. п. продолжают работать). */
export function skillTabOfView(view) {
  for (const skill of SKILLS) {
    const tab = SKILL_TABS[skill].find((x) => x.view === view)
    if (tab) return { skill, tab: tab.key }
  }
  return null
}

// Минуты без лимита в тесте — ориентиры прототипа (programmes.js minutes)
const DEFAULT_MIN = { types: 7, drill: 5, passage: 20, section: 20, test: 60, part: 10, dictation: 8, spelling: 6, task1: 20, task2: 40, part1: 5, part2: 4, part3: 5, shadowing: 5 }
const minutesOf = (t) => (t?.timeLimitSec ? Math.round(t.timeLimitSec / 60) : DEFAULT_MIN[t?.kind] || 10)

/** Статус строки по попыткам: done — всё сдано, started — начато, new — не начато, soon — нечего открыть. */
export function statusOf(tests) {
  const list = (tests || []).filter(Boolean)
  if (!list.length) return 'soon'
  const done = list.filter((t) => t.attemptCount > 0).length
  return done === list.length ? 'done' : done > 0 ? 'started' : 'new'
}

// уровень тренажёра типа — от самого простого до самого сложного из его заданий
function rangeLabel(tests) {
  const list = (tests || []).filter((x) => typeof x?.bandMin === 'number')
  if (!list.length) return null
  return bandLabel({ bandMin: Math.min(...list.map((x) => x.bandMin)), bandMax: Math.max(...list.map((x) => x.bandMax)) })
}

const ADDED_KINDS = new Set(['test', 'task1', 'task2', 'part1', 'part2', 'part3'])

function testRow(t, skill, view, mode = 'practice') {
  return {
    id: t.id,
    skill,
    title: t.title,
    // полный Listening без лимита в документе — 30 минут записи + 10 на перенос ответов, а не 60 минут полного Reading
    minutes: skill === 'listening' && t.kind === 'test' && !t.timeLimitSec ? 40 : minutesOf(t),
    mode,
    status: statusOf([t]),
    // уровень задания для фишки «Band 6.0–7.0» (model/levels.js); level above — «на вырост»
    band: bandLabel(t),
    // полный тест рекомендуется при любом уровне ученика (backend IeltsLevels.fitOf) — не «Неподходящие»
    level: t.kind === 'test' ? 'fit' : t.level,
    // «добавлен 8 окт» — у полных тестов, заданий Writing и частей Speaking: новое видно сразу (правка владельца 11.10.2026)
    added: ADDED_KINDS.has(t.kind) ? t.createdAt || null : null,
    open: t.kind === 'dictation' || t.kind === 'spelling' ? { run: { testId: t.id, kind: t.kind } } : { tab: 'learn', view, testId: t.id },
  }
}

/** Строки вкладки навыка. lists — каталоги навыков { reading, listening, writing, speaking } (items). */
export function skillRows(skill, tab, lists, track) {
  const L = lists[skill] || []
  if (skill === 'reading') {
    if (tab === 'types') {
      return typeTrainers(L, track).map((x) => {
        const first = x.demo || x.practice[0] || x.mini
        // тип открывает выбор заданий по уровню (practice-list), а не сразу первое: правка владельца в Figma
        return { id: `type:${x.id}`, skill, title: CATEGORY_LABEL[x.id] || x.id, minutes: minutesOf(first) || 7, mode: 'practice', status: statusOf(x.tests), band: rangeLabel(x.tests), level: aggLevel(x.tests), open: first ? listOpen(`reading:types:${x.id}`) : null }
      })
    }
    if (tab === 'drills') return drillRows(L, track)
    if (tab === 'full') return fullTests(L, track).map((t) => testRow(t, skill, 'texts', 'exam'))
    return singleTexts(L, track).map((t) => testRow(t, skill, 'texts', 'exam'))
  }
  if (skill === 'listening') {
    // полный тест (4 части, ~30 минут) — своя вкладка в режиме экзамена, как «Полные тесты» Reading; части — отдельно
    if (tab === 'full') return L.filter((t) => t.kind === 'test').map((t) => testRow(t, skill, 'listening-tasks', 'exam'))
    const kind = { parts: ['part'], types: ['types'], dictation: ['dictation'], spelling: ['spelling'] }[tab] || ['part']
    const view = { parts: 'listening-tasks', types: 'listening-types', dictation: 'listening-dictation', spelling: 'listening-spelling' }[tab]
    return L.filter((t) => kind.includes(t.kind)).map((t) => testRow(t, skill, view))
  }
  if (skill === 'writing') {
    if (tab === 'drills') return writingDrillRows(lists, track)
    if (tab === 'guide') return []
    if (tab === 'mock') return writingMockRows(lists, track)
    return forTrack(L, track).filter((t) => t.kind === tab).map((t) => testRow(t, skill, `writing-${tab}`, 'ai'))
  }
  return L.filter((t) => t.kind === tab).map((t) => testRow(t, skill, `speaking-${tab}`, tab === 'shadowing' ? 'practice' : 'ai'))
}

/** Дриллы Reading — «Короткие тренировки» (восемь навыков чтения; GT-дрилл только у General Training). */
export function drillRows(items, track) {
  const have = drills(items, track)
  return DRILLS.filter((id) => id !== 'gt' || track === 'general').map((id) => {
    const d = have.find((x) => x.id === id)
    const first = d?.tests.find((t) => !t.attemptCount) || d?.tests[0]
    return { id: `drill:${id}`, skill: 'reading', drill: id, titleKey: `ieltsReading.drill.${id}.name`, minutes: minutesOf(first) || 5, mode: 'practice', status: statusOf(d?.tests), band: rangeLabel(d?.tests), level: aggLevel(d?.tests), open: first ? listOpen(`reading:drill:${id}`) : null }
  })
}

/**
 * Дриллы Writing — «Короткие тренировки»: каждый дрилл одной строкой, «Открыть» — сразу сам дрилл (вид
 * writing-drills + testId). lists.writingDrills — каталог с прогрессом устройства (IeltsPage); без него — из банка
 * (lists.writing, kind drill), а пока банк дриллов не отдаёт — пробные (sampleDrills.js).
 */
export function writingDrillRows(lists, track) {
  const all = lists?.writingDrills || drillCatalog(lists?.writing, SAMPLE_DRILLS)
  return forTrack(all, track).map((x) => ({
    id: `wdrill:${x.id}`, skill: 'writing', title: x.title, minutes: x.minutes || minutesOf(x), mode: 'practice',
    status: statusOf([x]), band: bandLabel(x), level: x.level, sample: !!x.sample,
    open: { tab: 'learn', view: 'writing-drills', testId: x.id },
  }))
}

/**
 * Mock Writing по типу — строка на тип трека; «Открыть» ведёт на описание mock (вид writing-mock, ?ieltsList=task1:line):
 * там условия экзамена и старт, задание выбирается при старте. Тип без заданий — «скоро» (страница навыка такие прячет).
 * lists.writingMockDrafts — id заданий с начатым mock на устройстве: такой тип — «Продолжить».
 */
export function writingMockRows(lists, track) {
  const drafts = lists?.writingMockDrafts || []
  return mockTypes(track).map(({ kind, key }) => {
    const tests = mockTasks(lists?.writing, key, track)
    const started = tests.some((x) => drafts.includes(x.id))
    return {
      id: `wmock:${key}`, skill: 'writing', title: `Mock · ${mockTypeName(key)}`, minutes: mockLimits(kind).minutes, mode: 'exam',
      count: tests.length, status: started ? 'started' : statusOf(tests), band: rangeLabel(tests), level: aggLevel(tests),
      open: tests.length ? { tab: 'learn', view: 'writing-mock', list: key } : null,
    }
  })
}

/** Куда ведёт строка-набор: страница выбора заданий набора по уровню (вид хаба practice-list, ключ — ?ieltsList=). */
const listOpen = (key) => ({ tab: 'learn', view: 'practice-list', list: key })

/**
 * Тренировка-вид (диктовка, правописание, Part 1, shadowing) одной строкой, как дриллы Reading: подпись
 * переведена, «Открыть» ведёт в выбор заданий вида по уровню, а не запускает первое (правка владельца в Figma).
 */
function kindRow(L, skill, kind) {
  const tests = L.filter((t) => t.kind === kind)
  if (!tests.length) return []
  const first = tests.find((t) => !t.attemptCount) || tests[0]
  return [{
    id: `short:${kind}`, skill, titleKey: `ieltsPractice.short.${kind}`, minutes: SHORT_MIN[kind] || minutesOf(first), mode: kind === 'part1' ? 'ai' : 'practice',
    count: tests.length, status: statusOf(tests), band: rangeLabel(tests), level: aggLevel(tests), open: listOpen(`${skill}:${kind}`),
  }]
}

// «короткая» версия длинных видов: одна тема Part 1 — а не секция целиком
const SHORT_MIN = { part1: 5, shadowing: 5, dictation: 8, spelling: 6 }

/** «Короткие тренировки» по навыку: один навык за раз, у каждого навыка — свои короткие дриллы. */
export function shortRows(skill, lists, track) {
  if (skill === 'reading') return drillRows(lists.reading || [], track)
  if (skill === 'listening') return kindRow(lists.listening || [], 'listening', 'dictation').concat(kindRow(lists.listening || [], 'listening', 'spelling'))
  if (skill === 'speaking') return kindRow(lists.speaking || [], 'speaking', 'part1').concat(kindRow(lists.speaking || [], 'speaking', 'shadowing'))
  // Writing: дриллы приёмов письма и гид «Как писать». Раньше здесь стояла строка «Task 1» — она открывала список
  // полных заданий Task 1 на 20 минут вместо коротких тренировок (замечание владельца 30.10.2026)
  return writingDrillRows(lists, track)
    .concat([{ id: 'writing-guide', skill: 'writing', titleKey: 'ieltsPractice.writingGuide', minutes: 10, mode: 'theory', status: 'new', open: { tab: 'learn', view: 'writing-guide' } }])
}

// Вид списка банка → вид хаба, где задание открывается (страница задания или прямой запуск)
const LIST_VIEW = {
  'reading:types': 'types', 'reading:drill': 'drills', 'reading:passage': 'texts', 'reading:test': 'reading-full',
  'listening:dictation': 'listening-dictation', 'listening:spelling': 'listening-spelling', 'listening:part': 'listening-tasks',
  'writing:task1': 'writing-task1', 'writing:task2': 'writing-task2',
  'speaking:part1': 'speaking-part1', 'speaking:part2': 'speaking-part2', 'speaking:part3': 'speaking-part3', 'speaking:shadowing': 'speaking-shadowing',
}

/**
 * Задания одного набора для страницы выбора: ключ «навык:вид[:категория]» (reading:drill:ng, writing:task1). Строки —
 * по заданию, с уровнем; делит их по уровню экран (groupByLevel).
 */
export function listRows(key, lists, track) {
  const [skill, kind, category] = String(key || '').split(':')
  const L = lists?.[skill] || []
  const mine = skill === 'reading' || skill === 'writing' ? forTrack(L, track) : L
  const tests = mine.filter((t) => (kind === 'passage' ? t.kind === 'passage' || t.kind === 'section' : t.kind === kind) && (!category || t.category === category))
  const view = LIST_VIEW[`${skill}:${kind}`]
  const mode = skill === 'writing' || (skill === 'speaking' && kind !== 'shadowing') ? 'ai' : 'practice'
  return tests.map((t) => testRow(t, skill, view, mode))
}

/** Заголовок страницы выбора: имя дрилла, типа вопроса или вида тренировки. */
export function listTitle(key, t) {
  const [skill, kind, category] = String(key || '').split(':')
  if (kind === 'drill' && category) return t(`ieltsReading.drill.${category}.name`)
  if (kind === 'types' && category) return CATEGORY_LABEL[category] || category
  // вид задания из плана: жанр эссе, вид графика или регистр письма, вид карточки Part 2
  const cat = skill === 'writing' && category ? `ieltsWriting.p.${kind === 'task2' ? 'essay' : /formal$/.test(category) ? 'register' : 'visual'}.${category}`
    : skill === 'speaking' && category ? `ieltsSpeaking.p.cat.${category}` : null
  if (cat && t(cat) && t(cat) !== cat) return `${skill === 'speaking' ? 'Part' : 'Task'} ${kind.slice(-1)} · ${t(cat)}`
  const k = `ieltsPractice.short.${kind}`
  const v = t(k)
  return v && v !== k ? v : `${skill[0].toUpperCase()}${skill.slice(1)}`
}

/** Поиск по всем строкам всех навыков (названия тренажёров и тем). */
export function searchRows(q, lists, track, t) {
  const needle = String(q || '').trim().toLowerCase()
  if (!needle) return []
  const all = []
  for (const skill of SKILLS) for (const tab of SKILL_TABS[skill]) all.push(...skillRows(skill, tab.key, lists, track))
  const seen = new Set()
  return all.filter((r) => {
    const title = r.title || (r.titleKey ? t(r.titleKey) : '')
    if (seen.has(r.id) || !title.toLowerCase().includes(needle)) return false
    seen.add(r.id)
    return true
  })
}

/** Сколько опубликовано у навыка — пустой навык показывает «пока без материалов», а не кнопку в пустоту. */
export function skillCount(skill, lists, track) {
  return SKILL_TABS[skill].reduce((s, tab) => s + skillRows(skill, tab.key, lists, track).length, 0)
}

// ---------------------------------------------------------------- Writing: каталог по типам, тренировки типа, «по разбору»
// ТЗ §3.2–3.4, §5.4: задания и тренировки Writing делятся по типу задания (category каталога) — графику Task 1 AC,
// регистру письма GT и жанру эссе Task 2. Часть: T1 (Task 1 Academic), GT (письмо), T2 (эссе) — как в банке тренировок.

/** Типы части в порядке гида и прототипа — порядок чипов. */
export const WRITING_TYPES = {
  T1: ['line', 'bar', 'pie', 'table', 'process', 'map', 'multi'],
  GT: ['formal', 'semi_formal', 'informal'],
  T2: ['opinion', 'discussion', 'adv_disadv', 'problem_solution', 'two_part'],
}

/** Часть задания или дрилла каталога: Task 2 — T2, письмо General Training — GT, иначе T1. */
export function writingPartOf(t) {
  if (t?.part && WRITING_TYPES[t.part]) return t.part
  if (t?.kind === 'task2' || t?.category === 'task2' || t?.category === 'both') return 'T2'
  return t?.module === 'general' ? 'GT' : 'T1'
}

/** Части трека: у Academic — Task 1 графиками, у General Training — письмом; Task 2 общий. */
export const writingParts = (track) => (track === 'general' ? ['GT', 'T2'] : ['T1', 'T2'])

/** Глава гида «Как писать» (WR-GUIDE parts[].key + вид): «t1ac.line», «t2.problem_solution»; без типа — часть. */
export function guideSection(part, ty) {
  const p = { T1: 't1ac', GT: 't1gt', T2: 't2' }[part] || 't2'
  return ty && ty !== 'all' && ty !== 'common' ? `${p}.${ty}` : p
}

// Новые задания пакета (контракт §7): W1-AC-2xx, W1-GT-2xx, W2-2xx — бейдж «новое · проще»
export const isNewWritingTask = (id) => /^(W1-AC-2|W1-GT-2|W2-2)\d\d$/.test(String(id || ''))

const bandKey = (t) => (typeof t?.bandMin === 'number' ? t.bandMin : typeof t?.difficulty === 'number' ? t.difficulty : 99)

/** Задания Task 1 / Task 2 трека — от лёгких к сложным (bandMin, затем bandMax и id). */
export function writingTaskList(items, kind, track) {
  return forTrack(items, track)
    .filter((t) => t.kind === kind)
    .slice()
    .sort((a, b) => bandKey(a) - bandKey(b) || (a.bandMax ?? 99) - (b.bandMax ?? 99) || String(a.id).localeCompare(String(b.id)))
}

/** Чипы «Все · [типы]» со счётчиками: только типы, у которых есть задания, в порядке части. */
export function writingTypeChips(list, part) {
  const n = {}
  for (const t of list || []) n[t.category] = (n[t.category] || 0) + 1
  return [{ key: 'all', n: (list || []).length }, ...(WRITING_TYPES[part] || []).filter((k) => n[k]).map((k) => ({ key: k, n: n[k] }))]
}

export const byWritingType = (list, ty) => (!ty || ty === 'all' ? list || [] : (list || []).filter((t) => t.category === ty))

// Тренировки банка (drills-bank.json пакета): часть, типы и типы, у которых в общей тренировке ≥ 4 своих вопросов
// (§5.4 — с ними «Шаблоны» из Line graph показывают шаблоны линейных графиков). Каталог бэкенда (CatalogItem) этих
// полей пока не отдаёт — без таблицы чипы и «тренировки этого типа» были бы пусты. Поля строки каталога важнее.
const T1A = WRITING_TYPES.T1
const T2A = WRITING_TYPES.T2
const GTA = WRITING_TYPES.GT
const DRILL_META = {
  'T1-TPL': ['T1', 'all', T1A], 'T1-INTRO': ['T1', 'all', T1A], 'T1-OVERVIEW': ['T1', 'all', T1A], 'T1-ORDER': ['T1', 'all', ['line']],
  'T1-MISTAKES': ['T1', 'all', T1A], 'T1-ERRORS': ['T1', 'all', []],
  'T1-TREND': ['T1', ['line', 'bar', 'table', 'multi']], 'T1-NOUN': ['T1', ['line', 'bar', 'table', 'multi']],
  'T1-APPROX': ['T1', ['pie', 'table', 'bar', 'line', 'multi']], 'T1-PREP': ['T1', ['line', 'bar', 'table', 'pie', 'multi']],
  'T1-FEATURES': ['T1', ['line', 'bar', 'table', 'multi']], 'T1-PROPORTION': ['T1', ['pie', 'table', 'multi']],
  'T1-COMPARE': ['T1', ['bar', 'table', 'multi', 'line']], 'T1-FUTURE': ['T1', ['line', 'bar', 'table']],
  'T1-PROCESS': ['T1', ['process']], 'T1-PROCESS-SEQ': ['T1', ['process']], 'T1-MAP': ['T1', ['map']], 'T1-MAP-LOC': ['T1', ['map']],
  'GT-TPL': ['GT', 'all', GTA], 'GT-PURPOSE': ['GT', 'all', GTA], 'GT-LETTER': ['GT', 'all', GTA],
  'T2-TYPE': ['T2', 'all', T2A], 'T2-PLAN': ['T2', 'all', T2A], 'T2-TPL': ['T2', 'all', []], 'T2-INTRO': ['T2', 'all', T2A],
  'T2-PARA': ['T2', 'all', []], 'T2-CONCL': ['T2', 'all', T2A], 'T2-MISTAKES': ['T2', 'all', ['adv_disadv']],
  'T2-LINK': ['T2', 'all', []], 'T2-PARAPHRASE': ['T2', 'all', T2A], 'T2-RELEVANT': ['T2', 'all', T2A],
  'T2-BOTHSIDES': ['T2', ['discussion', 'adv_disadv']], 'T2-CAUSESOL': ['T2', ['problem_solution']],
  'T2-COMPLEX': ['T2', 'all', []], 'T2-ACADEMIC': ['T2', 'all', []], 'T2-MINI': ['T2', 'all', T2A],
}

/** Строка дрилла каталога + часть (part), типы (types: 'all' | [..]) и типы с ≥ 4 вопросами (tys), ключ drillKey. */
export function writingDrillInfo(x) {
  const key = x?.drillKey || String(x?.id || '').replace(/^WD-/, '')
  const meta = DRILL_META[key]
  return {
    ...x,
    drillKey: key,
    part: x?.part && WRITING_TYPES[x.part] ? x.part : meta?.[0] || writingPartOf(x),
    types: x?.types ?? meta?.[1] ?? 'all',
    tys: Array.isArray(x?.tys) ? x.tys : meta?.[2] || [],
  }
}

/** Тренировки Writing трека с частью и типами: каталог с прогрессом (IeltsPage) или банк, пока его нет — пробные. */
export function writingDrillList(lists, track) {
  const all = lists?.writingDrills || drillCatalog(lists?.writing, SAMPLE_DRILLS)
  const parts = writingParts(track)
  return forTrack(all, track).map(writingDrillInfo).filter((d) => parts.includes(d.part))
}

const typed = (d) => Array.isArray(d.types)
const hasType = (d, ty) => (typed(d) ? d.types.includes(ty) : d.tys.includes(ty))

/** 3–4 тренировки типа (§3.2, §3.4): сначала тренировки только этого типа, затем общие, где у типа ≥ 4 вопросов. */
export function writingDrillsForType(drills, part, ty, n = 4) {
  const mine = (drills || []).filter((d) => d.part === part)
  const special = mine.filter((d) => typed(d) && d.types.includes(ty))
  const general = mine.filter((d) => !typed(d) && d.tys.includes(ty))
  return special.concat(general).slice(0, n)
}

/** Чипы вкладки тренировок: Все · Общие · [типы] со счётчиками (типы — где есть тренировки только этого типа). */
export function writingDrillChips(drills, part) {
  const mine = (drills || []).filter((d) => d.part === part)
  const common = mine.filter((d) => !typed(d))
  const types = (WRITING_TYPES[part] || []).filter((k) => mine.some((d) => typed(d) && d.types.includes(k)))
  const chips = [{ key: 'all', n: mine.length }]
  if (common.length && types.length) chips.push({ key: 'common', n: common.length })
  return chips.concat(types.map((k) => ({ key: k, n: mine.filter((d) => typed(d) && d.types.includes(k)).length })))
}

/**
 * Группы списка тренировок по чипу: «Все» — «Общие — для любого типа» и «По типам заданий»; «Общие» — только первая;
 * тип — тренировки этого типа, затем общие, где у типа есть вопросы (с ними тренировка запускается с ty).
 */
export function writingDrillGroups(drills, part, filter = 'all') {
  const mine = (drills || []).filter((d) => d.part === part)
  const common = mine.filter((d) => !typed(d))
  if (!filter || filter === 'all') return [{ key: 'common', list: common }, { key: 'typed', list: mine.filter(typed) }].filter((g) => g.list.length)
  if (filter === 'common') return common.length ? [{ key: 'common', list: common }] : []
  const list = mine.filter((d) => typed(d) && d.types.includes(filter)).concat(common.filter((d) => hasType(d, filter)))
  return list.length ? [{ key: 'type', ty: filter, list }] : []
}

/** Слабые критерии разбора → тренировки (прототип CRIT2DRILLS). id тренировки — «WD-» + ключ. */
export const CRIT2DRILLS = {
  TA: ['T1-OVERVIEW', 'T1-FEATURES', 'T2-PLAN', 'T2-RELEVANT', 'T2-TYPE', 'GT-PURPOSE', 'GT-LETTER'],
  CC: ['T1-TPL', 'T2-TPL', 'T2-PARA', 'T2-LINK', 'T1-ORDER', 'GT-TPL'],
  LR: ['T1-TREND', 'T1-NOUN', 'T1-APPROX', 'T2-ACADEMIC', 'T2-PARAPHRASE'],
  GRA: ['T1-ERRORS', 'T1-FUTURE', 'T1-PROCESS', 'T2-COMPLEX'],
}
export const CRIT_SHORT = { taskResponse: 'TA', coherenceCohesion: 'CC', lexicalResource: 'LR', grammaticalRange: 'GRA' }

/**
 * «Рекомендуем по вашему разбору» (§3.1): до max тренировок под критерии ниже 6.5 последней оценённой работы, слабейший
 * первым. review — { criteria: { taskResponse: 5.5, … }, category, part }. Тренировка подходит, если её часть — часть
 * работы, а тип — общий или тип работы (как fits прототипа). Итог — [{ drill, crit }] (crit — ключ бэкенда).
 */
export function recommendWritingDrills(review, drills, max = 4) {
  if (!review?.criteria) return []
  const weak = Object.entries(review.criteria)
    .filter(([k, v]) => CRIT_SHORT[k] && Number.isFinite(Number(v)) && Number(v) < 6.5)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
  const byKey = new Map((drills || []).map((d) => [d.drillKey, d]))
  const out = []
  const seen = new Set()
  for (const [crit] of weak) {
    for (const key of CRIT2DRILLS[CRIT_SHORT[crit]]) {
      const d = byKey.get(key)
      if (!d || seen.has(key)) continue
      if (review.part && d.part !== review.part) continue
      if (review.category && typed(d) && !d.types.includes(review.category)) continue
      seen.add(key)
      out.push({ drill: d, crit })
      if (out.length >= max) return out
    }
  }
  return out
}

/** Счётчики вкладок Writing: Task 1 и Task 2 трека, тренировки трека. */
export function writingTabCounts(lists, track) {
  return {
    task1: writingTaskList(lists?.writing, 'task1', track).length,
    task2: writingTaskList(lists?.writing, 'task2', track).length,
    drills: writingDrillList(lists, track).length,
  }
}
