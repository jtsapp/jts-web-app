// «Практика IELTS» по дизайну «IELTS new» (Figma, раздел 3): каталог по навыкам, страницы навыков с вкладками и короткие
// тренировки — строки из каталогов банка (/mobile/ielts/tests). Чистые функции: экран только рисует, строка знает,
// куда ведёт («open»: место в хабе или прямой запуск диктовки). Опубликованное показывается, пустое — «скоро».
import { CATEGORY_LABEL, DRILLS } from '../reading/meta.js'
import { drills, forTrack, fullTests, singleTexts, typeTrainers } from '../reading/catalog.js'
import { aggLevel, bandLabel } from '../model/levels.js'

export const SKILLS = ['listening', 'reading', 'writing', 'speaking']

// Вкладки страницы навыка: ключ, вид хаба (старый адрес списка — диплинки и «Начать» из плана ведут сюда же)
export const SKILL_TABS = {
  listening: [
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

function testRow(t, skill, view, mode = 'practice') {
  return {
    id: t.id,
    skill,
    title: t.title,
    minutes: minutesOf(t),
    mode,
    status: statusOf([t]),
    // уровень задания для фишки «Band 6.0–7.0» (model/levels.js); level above — «на вырост»
    band: bandLabel(t),
    level: t.level,
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
    // полный тест Listening (4 части) — вкладкой «Части»: с новыми «Mock-тестами» он идёт ещё и секцией полного mock
    const kind = { parts: ['part', 'test'], types: ['types'], dictation: ['dictation'], spelling: ['spelling'] }[tab] || ['part']
    const view = { parts: 'listening-tasks', types: 'listening-types', dictation: 'listening-dictation', spelling: 'listening-spelling' }[tab]
    return L.filter((t) => kind.includes(t.kind)).map((t) => testRow(t, skill, view))
  }
  if (skill === 'writing') {
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

/** Куда ведёт строка-набор: страница выбора заданий набора по уровню (вид хаба practice-list, ключ — ?ieltsList=). */
const listOpen = (key) => ({ tab: 'learn', view: 'practice-list', list: key })

/**
 * Тренировка-вид (диктовка, правописание, Task 1, Part 1, shadowing) одной строкой, как дриллы Reading: подпись
 * переведена, «Открыть» ведёт в выбор заданий вида по уровню, а не запускает первое (правка владельца в Figma).
 */
function kindRow(L, skill, kind, track) {
  const tests = (skill === 'writing' ? forTrack(L, track) : L).filter((t) => t.kind === kind)
  if (!tests.length) return []
  const first = tests.find((t) => !t.attemptCount) || tests[0]
  return [{
    id: `short:${kind}`, skill, titleKey: `ieltsPractice.short.${kind}`, minutes: SHORT_MIN[kind] || minutesOf(first), mode: kind === 'task1' || kind === 'part1' ? 'ai' : 'practice',
    count: tests.length, status: statusOf(tests), band: rangeLabel(tests), level: aggLevel(tests), open: listOpen(`${skill}:${kind}`),
  }]
}

// «короткая» версия длинных видов: одно задание Task 1 или одна тема Part 1 — а не секция целиком
const SHORT_MIN = { task1: 20, part1: 5, shadowing: 5, dictation: 8, spelling: 6 }

/** «Короткие тренировки» по навыку: один навык за раз, у каждого навыка — свои короткие дриллы. */
export function shortRows(skill, lists, track) {
  if (skill === 'reading') return drillRows(lists.reading || [], track)
  if (skill === 'listening') return kindRow(lists.listening || [], 'listening', 'dictation').concat(kindRow(lists.listening || [], 'listening', 'spelling'))
  if (skill === 'speaking') return kindRow(lists.speaking || [], 'speaking', 'part1').concat(kindRow(lists.speaking || [], 'speaking', 'shadowing'))
  // Writing: короткий дрилл — одно задание Task 1 (20 минут) и разбор приёмов по гиду «Как писать»
  return kindRow(lists.writing || [], 'writing', 'task1', track)
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
