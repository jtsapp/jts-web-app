// Загрузчик курса уровня из public/course/<level>/ (генератор —
// scripts/extract-selfstudy-course.js). Всё грузится по требованию и кэшируется
// в модуле: каталог уровня лёгкий, а урок — сотня килобайт разметки, поэтому
// тянуть весь уровень разом нельзя.
//
// Уровни, для которых курс не выгружен, отдают null — вызывающий код тогда
// работает по-старому (public/learning/<level>.json + LessonPlayer).

const base = (level) => `/course/${String(level || '').toLowerCase()}`

const indexCache = new Map() // level -> Promise<index|null>
const lessonCache = new Map() // "level:n" -> Promise<lesson>
const testCache = new Map() // "level:u" -> Promise<test>
const shellCache = new Map() // level -> Promise<string>
const imgCache = new Map() // level -> Promise<object>

async function getJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json()
}

// Каталог уровня: { level, units:[[name,[titles]]…], lessons:[…], tests:[…] }.
// Нет файла — уровень просто не переведён на новый курс, это не ошибка.
export function getCourseIndex(level) {
  const code = String(level || '').toLowerCase()
  if (!indexCache.has(code)) {
    indexCache.set(
      code,
      getJson(`${base(code)}/index.json`).catch(() => null),
    )
  }
  return indexCache.get(code)
}

export function loadCourseLesson(level, n) {
  const key = `${level}:${n}`
  if (!lessonCache.has(key)) lessonCache.set(key, getJson(`${base(level)}/lesson-${n}.json`))
  return lessonCache.get(key)
}

// Шаги урока для пошагового плеера (генератор — scripts/extract-selfstudy-course.js).
const stepsCache = new Map()
export function loadCourseSteps(level, n) {
  const key = `${level}:${n}`
  if (!stepsCache.has(key)) stepsCache.set(key, getJson(`${base(level)}/steps-${n}.json`))
  return stepsCache.get(key)
}

export function loadCourseTest(level, unit) {
  const key = `${level}:${unit}`
  if (!testCache.has(key)) testCache.set(key, getJson(`${base(level)}/test-${unit}.json`))
  return testCache.get(key)
}

// Слово → картинка на весь уровень: словарь курса показывает картинку слова и
// тогда, когда оно повторяется через десять юнитов после своего урока.
export function loadCourseImages(level) {
  const code = String(level || '').toLowerCase()
  if (!imgCache.has(code)) imgCache.set(code, getJson(`${base(code)}/img-index.json`).catch(() => ({})))
  return imgCache.get(code)
}

// Разметка оболочки курса (сайдбар, шапка, рабочая область, словарь) — движок
// ищет её узлы по id, поэтому она обязана оказаться в DOM до его запуска.
export function loadCourseShell(level) {
  const code = String(level || '').toLowerCase()
  if (!shellCache.has(code)) {
    shellCache.set(
      code,
      fetch(`${base(code)}/shell.html`).then((r) => {
        if (!r.ok) throw new Error(`shell ${r.status}`)
        return r.text()
      }),
    )
  }
  return shellCache.get(code)
}

// Тропа уровня из каталога курса: 12 юнитов, в каждом три урока и юнит-тест
// последним узлом. Формат совпадает с тем, что рисует KingdomInteriorPage.
export function courseTrail(index) {
  if (!index) return []
  const out = []
  const byUnit = new Map()
  for (const l of index.lessons || []) {
    if (!byUnit.has(l.unit)) byUnit.set(l.unit, [])
    byUnit.get(l.unit).push(l)
  }
  // Тест после юнита бывает двух видов. У A0–B1 он свой у каждого юнита
  // (test-<u>.json, код T<u>), у B2 их четыре на весь уровень — большие, с
  // общим банком вопросов, и стоят после юнитов 3, 6, 9 и 12 (поле after,
  // код X<id>). Тропа рисует и те и другие одинаково — узлом в конце юнита.
  const testByUnit = new Map((index.tests || []).filter((t) => !t.id).map((t) => [t.unit, t]))
  // Больших тестов после одного и того же юнита бывает два: у B2 за
  // двенадцатым идут и блочный тест, и финальный. Ключ по «after» поэтому
  // хранит список, а не одну запись, — иначе финальный тест исчезал с тропы.
  const examByUnit = new Map()
  for (const t of (index.tests || []).filter((x) => x.id)) {
    const at = examByUnit.get(t.after) || []
    at.push(t)
    examByUnit.set(t.after, at)
  }
  const units = [...byUnit.keys()].sort((a, b) => a - b)
  // type — только «печенька» узла на тропе (иконка и цвет), как у старой
  // тропы: уроки юнита различаются по виду, тест закрывает юнит. Считаем по
  // месту урока В ЮНИТЕ, а не по полю no: у A2/B1 оно и есть номер внутри
  // юнита, а у A0/A1/B2 — сквозной номер по уровню, и все уроки с четвёртого
  // получали одну и ту же печеньку.
  const COOKIE_CYCLE = ['choice', 'info', 'audio']
  let order = 0
  for (const u of units) {
    byUnit
      .get(u)
      .sort((a, b) => a.no - b.no)
      .forEach((l, j) => {
        out.push({
          code: `L${l.n}`,
          kind: 'lesson',
          n: l.n,
          unit: u,
          order: order++,
          title: l.title,
          blurb: l.blurb,
          type: COOKIE_CYCLE[j % COOKIE_CYCLE.length],
        })
      })
    const t = testByUnit.get(u)
    if (t) {
      out.push({
        code: `T${u}`,
        kind: 'test',
        n: u,
        unit: u,
        order: order++,
        title: t.title,
        items: t.items,
        pass: t.pass,
        type: 'final',
      })
    }
    for (const e of examByUnit.get(u) || []) {
      out.push({
        code: `X${e.id}`,
        kind: 'test',
        n: e.id,
        unit: u,
        order: order++,
        title: e.title,
        blurb: e.blurb || '',
        items: e.items,
        pass: e.pass,
        type: 'final',
      })
    }
  }
  return out
}

// Название юнита из UNITS курса (["Friends and money",[…три урока…]]).
export function unitName(index, unit) {
  const u = (index && index.units && index.units[unit - 1]) || null
  return Array.isArray(u) ? u[0] : ''
}
