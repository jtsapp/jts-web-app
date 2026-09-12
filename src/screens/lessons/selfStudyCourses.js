// Курсы каталога в разделе «Самостоятельно»: порядок чипов, их подписи и
// выбор.
//
// Раньше курс в каталоге был один на уровень CEFR, и код уровня служил ему
// именем: по нему ставился ключ чипа, выбранный чип и запомненный выбор. Теперь
// курсов одного уровня бывает несколько — общий B2 и, например, Business
// English с кодом B2 и отдельным доступом (`separateAccess`). С кодом вместо
// имени второй курс нельзя было выбрать вовсе: оба чипа загорались разом, а
// список показывал первый. Поэтому курс здесь опознаётся только по id, а код
// остался тем, чем он и является, — уровнем: по нему идут порядок чипов и
// запасное правило «докуда открыто».
//
// Модуль чистый — считается в тестах без DOM.

import { levelIndex } from '../../kingdoms.js'

/** Ключ курса: для React, для выбора и для запомненного значения. */
export function courseKey(course) {
  return String(course.id)
}

/**
 * Порядок чипов: по уровню, как идёт курс; внутри уровня общий курс раньше
 * отдельного — он и есть «этот уровень», а отдельный к нему прилагается; при
 * равенстве — по id, чтобы чипы не менялись местами от ответа к ответу.
 */
export function compareCourses(a, b) {
  return (
    levelIndex(a.code) - levelIndex(b.code) ||
    Number(Boolean(a.separateAccess)) - Number(Boolean(b.separateAccess)) ||
    Number(a.id) - Number(b.id)
  )
}

// Имя курса на чипе: courseShortName, courseNames и курсовая часть
// courseCaptions.
//
// ПРАВИЛО ОБЩЕЕ с web-admin (catalogMaterialLevelNames в
// src/app/core/utils/catalog-material-cards.util.ts): один и тот же курс
// ученик видит здесь, а преподаватель — в админке, и называться он должен
// одинаково. Фикстуры в selfStudyCourses.test.js («общее правило имён») —
// те же, что в catalog-material-cards.util.spec.ts; меняешь правило или
// фикстуры — меняй в обоих репозиториях, иначе приложения молча разойдутся.

// Бренд перед названием: «just to study — Business English · B2+/C1». Прежде
// он не срезался, и чип такого курса читался «B2 just to study». Бренд стоит
// только ДО первого « · »: в названии без бренда тире бывает уже в уровне
// («Business English · B2 – C1»), и срезать по нему значило бы потерять имя.
const BRAND_PREFIX = /^[^·]*?\s[—–]\s/

// Часть названия, где нет ничего, кроме уровня: «B2+/C1», «B1+», «A2 / B1».
const CEFR_ONLY = /^[ABC][0-2]\+?(?:\s*[/–-]\s*[ABC][0-2]\+?)*$/i

/** Части названия без бренда и без тех, что сводятся к уровню. */
function nameParts(label) {
  return String(label || '')
    .replace(BRAND_PREFIX, '')
    .trim()
    .split(' · ')
    .map((part) => part.trim())
    .filter((part) => part && !CEFR_ONLY.test(part))
}

/**
 * Короткое имя курса из его названия: первая часть после бренда, которая не
 * сводится к уровню. «just to study — Business English · B2+/C1» → «Business
 * English». Уровень на чипе и так стоит кодом, повторять его незачем, — и
 * поэтому имя, совпадающее с кодом, тоже пустое.
 */
export function courseShortName(label, code = '') {
  const first = nameParts(label)[0] || ''
  return first.toLowerCase() === String(code || '').toLowerCase() ? '' : first
}

/**
 * Имена курсов одного кода, попарно разные.
 *
 * Уникальное непустое короткое имя остаётся как есть. Остальным — совпавшим
 * («Intermediate B1+ · Course» и «Intermediate B1+ · Speaking Club») или пустым
 * — берутся все части названия без общего для них начала: иначе снова два
 * одинаковых чипа, ровно та поломка, от которой здесь уходим. Не различило и
 * это — дописывается номер курса: ученику он ничего не говорит, но хотя бы
 * различает.
 */
function distinctNames(group) {
  const shortOf = new Map(group.map((course) => [course, courseShortName(course.label, course.code)]))
  const isUnique = (course) => {
    const short = shortOf.get(course)
    return Boolean(short) && group.every((other) => other === course || shortOf.get(other) !== short)
  }

  const names = new Map()
  const rest = []
  for (const course of group) {
    if (isUnique(course)) names.set(course, shortOf.get(course))
    else rest.push(course)
  }

  const parts = rest.map((course) => nameParts(course.label))
  let common = 0
  while (parts.length && common < parts[0].length && parts.every((list) => list[common] === parts[0][common])) {
    common += 1
  }
  const fuller = parts.map((list) => list.slice(common).join(' · '))
  // Хвост сверяется и с уникальными короткими именами соседей: «Course» из
  // «Intermediate · Course» иначе встал бы рядом с курсом, который так и зовётся.
  const taken = new Set(names.values())
  rest.forEach((course, i) => {
    const name = fuller[i]
    const clash = !name || taken.has(name) || fuller.some((other, j) => j !== i && other === name)
    names.set(course, clash ? `${shortOf.get(course)} #${course.id}`.trim() : name)
  })
  return names
}

/**
 * Имена курсов, чей код повторяется: Map id → имя, у каждого курса такой
 * группы, включая первый. Каким чипам их показывать, решает вызывающий (см.
 * courseCaptions). Порядок курсов на имена не влияет.
 */
export function courseNames(courses) {
  const byCode = new Map()
  for (const course of courses) {
    const group = byCode.get(course.code)
    if (group) group.push(course)
    else byCode.set(course.code, [course])
  }

  const names = new Map()
  for (const group of byCode.values()) {
    if (group.length < 2) continue
    for (const [course, name] of distinctNames(group)) names.set(courseKey(course), name)
  }
  return names
}

/**
 * Подписи чипов рядом с кодом: Map id → имя, у кого код один не отличает.
 *
 * Имя стоит у курса с отдельным доступом всегда — это отдельный продукт, а не
 * «уровень C1», даже если другого C1 в каталоге нет, — и у каждого курса,
 * кроме первого, чей код повторяется. У общего курса уровня чип остаётся
 * прежним, одним кодом. В этом web-admin другой: там подписаны все курсы
 * повторяющегося кода и только они, — а само имя одно (courseNames).
 *
 * @param courses уже отсортированные compareCourses — те, что показываются
 * @param namingPool все курсы каталога: имя курса зависит от соседей по коду,
 *   и считать его по показанному значило бы назвать курс иначе, чем в
 *   админке, где каталог тот же, а отбор другой
 */
export function courseCaptions(courses, namingPool = courses) {
  const names = courseNames(namingPool)
  const seen = new Set()
  const captions = new Map()
  for (const course of courses) {
    const repeated = seen.has(course.code)
    seen.add(course.code)
    if (!course.separateAccess && !repeated) continue
    const key = courseKey(course)
    // Код не повторяется — имя одно, короткое; нет и его — номер курса.
    captions.set(key, names.get(key) || courseShortName(course.label, course.code) || `#${course.id}`)
  }
  return captions
}

/**
 * Курс по запомненному выбору, или undefined.
 *
 * До того как курсов одного уровня стало несколько, запоминался код уровня.
 * Такое значение уже лежит у учеников в браузере, и терять их место из-за
 * смены формата нельзя: код ведёт на первый курс этого уровня — общий, то есть
 * ровно тот, который ученик тогда и выбирал.
 */
export function findPickedCourse(courses, picked) {
  if (!picked) return undefined
  const value = String(picked)
  return courses.find((course) => courseKey(course) === value) || courses.find((course) => course.code === value)
}

/**
 * Курс, на котором раздел открывается впервые: самый высокий открытый общий.
 * Это уровень, до которого ученик дошёл; отдельный курс сюда не годится — он
 * выдан сбоку и о том, где ученик в программе, ничего не говорит.
 */
export function defaultCourse(courses) {
  const open = courses.filter((course) => !course.locked)
  const general = open.filter((course) => !course.separateAccess)
  return general[general.length - 1] || open[open.length - 1] || courses[0]
}
