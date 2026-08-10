// Загрузчик курса уровня из public/course/<level>/ (генератор —
// scripts/extract-course-lessons.js). Всё грузится по требованию и кэшируется
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
  const testByUnit = new Map((index.tests || []).map((t) => [t.unit, t]))
  const units = [...byUnit.keys()].sort((a, b) => a - b)
  // type — только «печенька» узла на тропе (иконка и цвет), как у старой
  // тропы: три урока юнита различаются по виду, тест закрывает юнит.
  const COOKIE_BY_NO = { 1: 'choice', 2: 'info', 3: 'audio' }
  let order = 0
  for (const u of units) {
    for (const l of byUnit.get(u).sort((a, b) => a.no - b.no)) {
      out.push({
        code: `L${l.n}`,
        kind: 'lesson',
        n: l.n,
        unit: u,
        order: order++,
        title: l.title,
        blurb: l.blurb,
        type: COOKIE_BY_NO[l.no] || 'choice',
      })
    }
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
  }
  return out
}

// Название юнита из UNITS курса (["Friends and money",[…три урока…]]).
export function unitName(index, unit) {
  const u = (index && index.units && index.units[unit - 1]) || null
  return Array.isArray(u) ? u[0] : ''
}
