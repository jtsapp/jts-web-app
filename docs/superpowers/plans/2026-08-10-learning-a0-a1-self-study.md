# A0/A1 self-study в разделе «Обучение» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** перенести ветку Self-Study курсов A0 и A1 в раздел «Обучение» нативно — теми же компонентами и дизайном, что и нынешние уроки-королевства, с тропой и картой.

**Architecture:** новый экстрактор читает исходный файл курса (`a0.html`/`a1.html`), оставляет блоки режима `self`, режет урок по стадиям на узлы тропы и пишет в существующий статический формат `public/learning/<level>.json` + `index.json`. Плеер получает два новых типа задания (`order`, `multi`) и показ пояснения `why`. Карта королевств сдвигает уровни на один узел и теряет C2.

**Tech Stack:** Node 20+ (CommonJS-скрипты), jsdom (уже в devDependencies), React 19 + Next 15, vitest + @testing-library/react (юнит), @playwright/test (e2e).

## Global Constraints

- Спека: `docs/superpowers/specs/2026-08-10-learning-a0-a1-self-study-design.md`. Она главнее этого плана при расхождении.
- Ветка работы: `feat/learning-a0-a1-self-study` (уже создана от `develop`).
- Проект на JavaScript, не TypeScript. Никаких `.ts`/`.tsx` файлов (`jsconfig.json`).
- Комментарии — на русском и объясняют «почему», а не «что».
- Стили — только в `src/styles.css`, классами в существующем стиле. Никаких CSS-модулей и styled-components.
- Строки UI — через `t(key)`; ключ добавляется сразу в три языка `ru`, `en`, `kk` в `src/i18n.jsx`.
- Новых runtime-зависимостей не добавлять. Парсинг HTML — через `jsdom` (devDependency).
- Юнит-тесты — vitest (`npm test`), файлы `*.test.js` рядом с кодом. `tests/*.spec.js` исключены из vitest и принадлежат Playwright (`npm run test:e2e`).
- Медиа-аудио не выгружается: ссылка строится как `https://files-dev.justtostudy.kz/development/course-catalog/<level>/audio/<файл>.mp3`.
- Исходные файлы курса лежат в `~/Downloads/a0.html` и `~/Downloads/a1.html`; `a1.html` — 257 МБ, поэтому CLI запускается с `node --max-old-space-size=8192`.

---

## Файловая структура

Создаётся:

- `scripts/jts-self/read-course.js` — достаёт объявления `UNITS`/`LESSONS`/`REVIEWS` из файла курса.
- `scripts/jts-self/collect-lesson.js` — jsdom: оставляет ветку `self`, разбирает урок на стадии и сырые блоки.
- `scripts/jts-self/normalize-task.js` — сырой блок → задание в нативном формате плеера.
- `scripts/jts-self/build-nodes.js` — стадии урока → узлы тропы (со склейкой коротких).
- `scripts/jts-self/vocab-cards.js` — карточки словаря урока из `VOCAB`/`IMG`.
- `scripts/extract-jts-self-lessons.js` — CLI: склейка всего, запись `public/learning/*`.
- `scripts/jts-self/*.test.js` — юнит-тесты к каждому модулю.
- `src/learning/LessonPlayer.test.jsx` — тесты новых типов задания и пояснения.
- `src/kingdoms.test.js` — тесты раскладки королевств.

Модифицируется:

- `src/learning/LessonPlayer.jsx` — типы `order`, `multi`, поле `why`.
- `src/styles.css` — стили `.kl-order`, `.kl-multi`, `.kl-fb__why`, `.kl-vocab`.
- `.gitignore` — staging медиа `public/learning/media/`.
- `src/i18n.jsx` — ключи `lesson.order.hint`, `lesson.multi.hint`, `lesson.why`.
- `src/kingdoms.js` — сдвиг уровней, удаление C2.
- `public/learning/a0.json` (новый), `a1.json`, `index.json` — вывод экстрактора.
- `web-admin/src/app/feature/system/lesson-modules/lesson-module.model.ts` — A0 в `MODULE_LEVELS`.

Почему модулями, а не одним файлом как `extract-kingdom-lessons.js`: тот скрипт читает уже вычисленный браузером `window.TASKS`, ему нечего разбирать. Здесь разбор ручной и составляет основную часть логики — четыре чистые функции тестируются мгновенно в vitest, а один файл на 600 строк не тестировался бы по частям.

---

### Task 1: Чтение файла курса

**Files:**
- Create: `scripts/jts-self/read-course.js`
- Test: `scripts/jts-self/read-course.test.js`

**Interfaces:**
- Produces: `readDecl(src, name) → string|null`, `readCourse(filePath) → { level, label, units, lessons, reviews }`, где `units: [{ no, name }]`, `lessons: [{ no, unit, title, blurb, tracks, html }]`, `reviews: [{ no, unit, title, html }]`.

Формат объявлений в файлах курса разный: A0 хранит урок одной строкой с JSON-совместимыми ключами, A1 — pretty-print с некавыченными ключами и шаблонными строками. Поэтому литерал вырезается по балансу скобок с учётом `'`, `"` и бэктиков и вычисляется как JS-выражение.

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/jts-self/read-course.test.js`:

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readDecl, readCourse } from './read-course.js'

function tmpCourse(body) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-')), 'course.html')
  fs.writeFileSync(file, body)
  return file
}

describe('readDecl', () => {
  it('вырезает объект целиком, не спотыкаясь о скобки в строках', () => {
    const src = 'const A={a:"}{",b:{c:1}};\nconst B=[1];'
    expect(readDecl(src, 'A')).toBe('{a:"}{",b:{c:1}}')
  })

  it('понимает шаблонные строки — в них живёт html урока', () => {
    const src = 'const A={h:`<b>}</b>`};'
    expect(readDecl(src, 'A')).toBe('{h:`<b>}</b>`}')
  })

  it('возвращает null для отсутствующего объявления', () => {
    expect(readDecl('const A=1;', 'B')).toBeNull()
  })
})

describe('readCourse', () => {
  it('собирает уровень, юниты, уроки и юнит-тесты', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const UNITS=[["Lessons 1–3",["One","Two"]],["Lessons 4–6",["Three"]]];
      const LESSONS={
      1:{"unit":1,"no":1,"title":"One","blurb":"B1","tracks":{"t1":"a0_1.mp3"},"html":"<section class=\\"stage\\"></section>"},
      2:{"unit":2,"no":2,"title":"Three","blurb":"B2","tracks":{},"html":"<b>x</b>"}
      };
      const REVIEWS={1:{unit:1,items:21,pass:15,title:"Unit Test · Unit 1",html:\`<i>t</i>\`}};
      </script>`)
    const course = readCourse(file)

    expect(course.level).toBe('a0')
    expect(course.label).toBe('A0')
    expect(course.units).toEqual([{ no: 1, name: 'Lessons 1–3' }, { no: 2, name: 'Lessons 4–6' }])
    expect(course.lessons).toHaveLength(2)
    expect(course.lessons[0]).toMatchObject({ no: 1, unit: 1, title: 'One', tracks: { t1: 'a0_1.mp3' } })
    expect(course.reviews).toEqual([{ no: 1, unit: 1, title: 'Unit Test · Unit 1', html: '<i>t</i>' }])
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- scripts/jts-self/read-course.test.js`
Expected: FAIL — `Failed to resolve import "./read-course.js"`.

- [ ] **Step 3: Реализовать модуль**

Создать `scripts/jts-self/read-course.js`:

```js
// Достаёт объявления курса из единого HTML-файла уровня (a0.html / a1.html).
//
// Формат объявлений у уровней разный: A0 пишет урок одной строкой с
// JSON-совместимыми ключами, A1 — pretty-print с некавыченными ключами и
// шаблонными строками. Общего парсера на это нет, поэтому литерал вырезается
// по балансу скобок и вычисляется как JS-выражение: источник свой, скачанный
// нами, и другого способа прочитать невалидный для JSON литерал нет.
const fs = require('node:fs')

/** Литерал объявления `const <name>=…` целиком, вместе с внешними скобками. */
function readDecl(src, name) {
  const head = `const ${name}=`
  const start = src.indexOf(head)
  if (start < 0) return null

  let i = start + head.length
  const open = src[i]
  if (open !== '{' && open !== '[') return null
  const close = open === '{' ? '}' : ']'

  let depth = 0
  let quote = ''
  let esc = false
  for (; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return src.slice(start + head.length, i + 1)
    }
  }
  return null
}

function evalDecl(src, name) {
  const literal = readDecl(src, name)
  // eslint-disable-next-line no-eval
  return literal ? eval('(' + literal + ')') : null
}

/** Код уровня из <title>: «just to study — A0 · Course» → a0/A0. */
function readLevel(src) {
  const m = /<title>[^<]*?—\s*([A-C][0-2])\b/i.exec(src)
  const label = m ? m[1].toUpperCase() : ''
  if (!label) throw new Error('в файле курса не найден уровень в <title>')
  return { level: label.toLowerCase(), label }
}

function readCourse(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const { level, label } = readLevel(src)

  const rawUnits = evalDecl(src, 'UNITS') || []
  const units = rawUnits.map((u, i) => ({ no: i + 1, name: Array.isArray(u) ? u[0] : String(u) }))

  const rawLessons = evalDecl(src, 'LESSONS') || {}
  const lessons = Object.keys(rawLessons)
    .map(Number)
    .sort((a, b) => a - b)
    .map((no) => {
      const l = rawLessons[no]
      return { no, unit: l.unit, title: l.title || '', blurb: l.blurb || '', tracks: l.tracks || {}, html: l.html || '' }
    })

  const rawReviews = evalDecl(src, 'REVIEWS') || {}
  const reviews = Object.keys(rawReviews)
    .map(Number)
    .sort((a, b) => a - b)
    .map((no) => {
      const r = rawReviews[no]
      return { no, unit: r.unit, title: r.title || '', html: r.html || '' }
    })

  return { level, label, units, lessons, reviews }
}

module.exports = { readDecl, readCourse }
```

- [ ] **Step 4: Прогнать тест и убедиться, что он проходит**

Run: `npm test -- scripts/jts-self/read-course.test.js`
Expected: PASS, 5 тестов.

- [ ] **Step 5: Коммит**

```bash
git add scripts/jts-self/read-course.js scripts/jts-self/read-course.test.js
git commit -m "feat(learning): чтение файла курса A0/A1"
```

---

### Task 2: Сбор ветки self и стадий урока

**Files:**
- Create: `scripts/jts-self/collect-lesson.js`
- Test: `scripts/jts-self/collect-lesson.test.js`

**Interfaces:**
- Consumes: ничего из предыдущих задач.
- Produces: `collectLesson(html) → [{ name, blocks }]`, где `blocks` — массив сырых блоков одного из видов:
  - `{ kind: 'info', html }`
  - `{ kind: 'choice', prompt, options: string[], correct: number, why }`
  - `{ kind: 'multi', prompt, options: string[], correct: number[], why }`
  - `{ kind: 'select', prompt, options: string[], answer: string, why }`
  - `{ kind: 'gap', before, after, answer: string, why }`
  - `{ kind: 'order', words: string[], order: number[], why }`
  - `{ kind: 'audio', trackId, label }`

Разметка источника: стадия — `<section class="stage" data-stage="Имя">`, внутри блоки режимов помечены `data-only="self solo group"`. Узел без `self` в списке удаляется — та же семантика, что у `prune-by-mode.ts` в web-admin. Строка задания — `.row`; варианты — `.opts[data-correct]` (индекс верного) или `.opts[data-multi]` (список верных); пояснение — `data-why` на поле ввода. Аудио вызывается инлайном: `playRange(A('a01cf00'),…)` в A0 и `playTrack('6_1',…)` в A1 — id трека достаётся из `onclick`.

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/jts-self/collect-lesson.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { collectLesson } from './collect-lesson.js'

const stage = (name, inner) => `<section class="stage" data-stage="${name}">${inner}</section>`

describe('collectLesson', () => {
  it('оставляет только блоки режима self', () => {
    const html = stage('Warm-up', `
      <div data-only="self"><p>для себя</p></div>
      <div data-only="group"><p>для группы</p></div>
      <div data-only="group solo"><p>и для группы, и для пары</p></div>`)
    const [s] = collectLesson(html)
    expect(s.name).toBe('Warm-up')
    expect(s.blocks).toHaveLength(1)
    expect(s.blocks[0]).toMatchObject({ kind: 'info' })
    expect(s.blocks[0].html).toContain('для себя')
    expect(s.blocks[0].html).not.toContain('для группы')
  })

  it('строка с .opts[data-correct] → choice с индексом верного', () => {
    const html = stage('Grammar', `<div class="task" data-task data-tid="pr-quiz">
      <div class="row"><span class="num">1</span><span class="body">☕ coffee → ___ coffee.
        <div class="opts" data-correct="1">
          <button class="opt" data-val="0">I likes</button>
          <button class="opt" data-val="1">I like</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks).toEqual([
      { kind: 'choice', prompt: '☕ coffee → ___ coffee.', options: ['I likes', 'I like'], correct: 1, why: '' },
    ])
  })

  it('строка с .opts[data-multi] → multi со списком верных', () => {
    const html = stage('Listening', `<div class="task" data-task>
      <div class="row"><span class="body">Отметь всё, что услышал
        <div class="opts" data-multi="0,2">
          <button class="opt" data-val="0">read</button>
          <button class="opt" data-val="1">cook</button>
          <button class="opt" data-val="2">travel</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'multi', correct: [0, 2], options: ['read', 'cook', 'travel'] })
  })

  it('select → варианты из option, ответ из data-answer, пустой option отброшен', () => {
    const html = stage('Vocabulary', `<div class="task" data-task>
      <div class="row"><span class="body"><b>👂 listen</b>
        <select data-answer="слушать">
          <option value="">choose…</option><option>спрашивать</option><option>слушать</option>
        </select></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toEqual({ kind: 'select', prompt: '👂 listen', options: ['спрашивать', 'слушать'], answer: 'слушать', why: '' })
  })

  it('input[data-answer] → gap с текстом до и после и пояснением', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body">I <input class="gap" data-answer="like|love" data-why="I like + вещь"> coffee.</span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toEqual({ kind: 'gap', before: 'I', after: 'coffee.', answer: 'like|love', why: 'I like + вещь' })
  })

  it('.order → слова в показанном порядке и эталонная перестановка', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="order" data-order="1,2,3">
        <button class="ochip" data-val="3"><span class="pin"></span><span class="txt">coffee</span></button>
        <button class="ochip" data-val="1"><span class="pin"></span><span class="txt">I</span></button>
        <button class="ochip" data-val="2"><span class="pin"></span><span class="txt">like</span></button>
      </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'order', words: ['coffee', 'I', 'like'], order: [3, 1, 2] })
  })

  it('кнопка аудио → блок audio с id трека (оба синтаксиса вызова)', () => {
    const a0 = stage('Listening', `<button class="btn btn-audio" onclick="playRange(A('a01cf00'),0,null,this,'Stop')">🔊 Слушать</button>`)
    const a1 = stage('Listen', `<button class="btn btn-audio segbtn" onclick="playTrack('6_1',this)">🔊 Track 1</button>`)
    expect(collectLesson(a0)[0].blocks[0]).toMatchObject({ kind: 'audio', trackId: 'a01cf00', label: '🔊 Слушать' })
    expect(collectLesson(a1)[0].blocks[0]).toMatchObject({ kind: 'audio', trackId: '6_1', label: '🔊 Track 1' })
  })

  it('несколько стадий сохраняют порядок', () => {
    const html = stage('Warm-up', '<div data-only="self">a</div>') + stage('Wrap', '<div data-only="self">b</div>')
    expect(collectLesson(html).map((s) => s.name)).toEqual(['Warm-up', 'Wrap'])
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- scripts/jts-self/collect-lesson.test.js`
Expected: FAIL — `Failed to resolve import "./collect-lesson.js"`.

- [ ] **Step 3: Реализовать модуль**

Создать `scripts/jts-self/collect-lesson.js`:

```js
// Разбирает html урока курса на стадии и сырые блоки ветки Self-Study.
//
// Три режима урока живут в одном html и различаются атрибутом data-only. Мы
// удаляем чужие узлы ДО разбора, иначе задания 1-to-1 и Group попали бы в
// тропу вперемешку с self — в источнике они стоят рядом, а не в разных ветках
// дерева.
const { JSDOM } = require('jsdom')

const MODE = 'self'

function pruneToMode(root) {
  for (const el of [...root.querySelectorAll('[data-only]')]) {
    const modes = (el.getAttribute('data-only') || '').split(/\s+/).filter(Boolean)
    if (!modes.includes(MODE)) el.remove()
  }
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()

/** Текст строки без содержимого интерактивных элементов. */
function promptOf(row, ...drop) {
  const copy = row.cloneNode(true)
  for (const sel of ['.opts', 'select', 'input', '.order', 'button', '.num', ...drop]) {
    for (const el of [...copy.querySelectorAll(sel)]) el.remove()
  }
  return clean(copy.textContent)
}

const optionsOf = (opts) => [...opts.querySelectorAll('.opt')].map((b) => clean(b.textContent))
const whyOf = (el) => clean(el.getAttribute('data-why'))

/** id трека из инлайнового вызова: playRange(A('x'),…) в A0, playTrack('x',…) в A1. */
function trackIdOf(button) {
  const on = button.getAttribute('onclick') || ''
  const m = /play(?:Track|Range)\(\s*(?:A\(\s*)?['"]([^'"]+)['"]/.exec(on)
  return m ? m[1] : null
}

/** Строка задания → сырой блок или null, если интерактива в ней нет. */
function blockFromRow(row) {
  const multi = row.querySelector('.opts[data-multi]')
  if (multi) {
    const correct = (multi.getAttribute('data-multi') || '')
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isInteger(n))
    return { kind: 'multi', prompt: promptOf(row), options: optionsOf(multi), correct, why: whyOf(multi) }
  }

  const opts = row.querySelector('.opts[data-correct]')
  if (opts) {
    return {
      kind: 'choice',
      prompt: promptOf(row),
      options: optionsOf(opts),
      correct: Number(opts.getAttribute('data-correct')),
      why: whyOf(opts),
    }
  }

  const select = row.querySelector('select[data-answer]')
  if (select) {
    // Первый option — приглашение «choose…» с пустым value; вариантом ответа
    // он не является.
    const options = [...select.querySelectorAll('option')]
      .filter((o) => o.getAttribute('value') !== '')
      .map((o) => clean(o.textContent))
      .filter(Boolean)
    return {
      kind: 'select',
      prompt: promptOf(row),
      options,
      answer: clean(select.getAttribute('data-answer')),
      why: whyOf(select),
    }
  }

  const input = row.querySelector('input[data-answer], textarea[data-answer]')
  if (input) {
    const parts = splitAround(row)
    return { kind: 'gap', before: parts.before, after: parts.after, answer: clean(input.getAttribute('data-answer')), why: whyOf(input) }
  }

  const order = row.querySelector('.order[data-order]')
  if (order) {
    const chips = [...order.querySelectorAll('.ochip')]
    return {
      kind: 'order',
      prompt: promptOf(row),
      words: chips.map((c) => clean((c.querySelector('.txt') || c).textContent)),
      order: chips.map((c) => Number(c.getAttribute('data-val'))),
      why: whyOf(order),
    }
  }

  return null
}

/**
 * Текст строки до и после поля ввода. Разрезать по первому пробелу нельзя:
 * «I ___ like Mondays.» дало бы before="I", after="like" и потеряло хвост,
 * поэтому место поля помечается меткой, которую не съест схлопывание пробелов.
 */
function splitAround(row) {
  const copy = row.cloneNode(true)
  for (const el of [...copy.querySelectorAll('.num')]) el.remove()
  const mark = copy.querySelector('input[data-answer], textarea[data-answer]')
  if (!mark) return { before: clean(copy.textContent), after: '' }

  const SENTINEL = ' §gap§ '
  mark.replaceWith(copy.ownerDocument.createTextNode(SENTINEL))
  const [before = '', after = ''] = clean(copy.textContent).split('§gap§')
  return { before: clean(before), after: clean(after) }
}

const audioButtonsOf = (node) =>
  node.matches('button.btn-audio') ? [node] : [...node.querySelectorAll('button.btn-audio')]

function pushAudio(node, blocks) {
  for (const button of audioButtonsOf(node)) {
    const trackId = trackIdOf(button)
    if (trackId) blocks.push({ kind: 'audio', trackId, label: clean(button.textContent) })
  }
}

/**
 * Объяснения, карточки слов, грамматическая справка. Они нужны целиком: без
 * них урок превращается в голый тест. Отдельно стоящую кнопку аудио дублировать
 * блоком info незачем — она уже стала блоком audio.
 */
function pushInfo(node, blocks) {
  if (node.matches('button.btn-audio')) return
  const html = node.outerHTML.trim()
  if (clean(node.textContent) || /<(img|audio|video|table)/i.test(html)) blocks.push({ kind: 'info', html })
}

/**
 * Блоки одной стадии в порядке документа. Порядок здесь — часть методики:
 * инструкция и объяснение стоят перед вопросами, к которым относятся, поэтому
 * обходим детей стадии подряд, а не собираем сперва все задания.
 */
function collectStage(section) {
  const blocks = []
  const container = section.querySelector('.stage-body') || section

  for (const child of [...container.children]) {
    if (child.classList.contains('stage-head')) continue

    const isTask = child.matches('.task, [data-task]')
    const tasks = isTask ? [child] : [...child.querySelectorAll('.task, [data-task]')]

    if (!tasks.length) {
      pushAudio(child, blocks)
      pushInfo(child, blocks)
      continue
    }

    if (!isTask) {
      const intro = child.cloneNode(true)
      for (const task of [...intro.querySelectorAll('.task, [data-task]')]) task.remove()
      pushInfo(intro, blocks)
    }

    for (const task of tasks) {
      pushAudio(task, blocks)
      const rows = [...task.querySelectorAll('.row')]
      for (const row of rows.length ? rows : [task]) {
        const block = blockFromRow(row)
        if (block) blocks.push(block)
      }
    }
  }
  return blocks
}

function collectLesson(html) {
  const { window } = new JSDOM(`<body>${html}</body>`)
  pruneToMode(window.document.body)

  return [...window.document.body.querySelectorAll('section.stage')].map((section) => ({
    name: section.getAttribute('data-stage') || '',
    blocks: collectStage(section),
  }))
}

module.exports = { collectLesson }
```

- [ ] **Step 4: Прогнать тест и убедиться, что он проходит**

Run: `npm test -- scripts/jts-self/collect-lesson.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 5: Коммит**

```bash
git add scripts/jts-self/collect-lesson.js scripts/jts-self/collect-lesson.test.js
git commit -m "feat(learning): разбор ветки self урока на стадии и блоки"
```

---

### Task 3: Нормализация блока в задание плеера

**Files:**
- Create: `scripts/jts-self/normalize-task.js`
- Test: `scripts/jts-self/normalize-task.test.js`

**Interfaces:**
- Consumes: сырые блоки из `collectLesson` (Task 2).
- Produces: `normalizeBlock(block, ctx) → task|null` и `trackUrl(level, file) → string`. `ctx` — `{ sec, level, trackFile(id) }`. Выходные задания — в формате нынешнего `public/learning/<level>.json`: `{ type, sec, title, sub, … }` с типами `choice | gap | multi | order | listen | info`.

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/jts-self/normalize-task.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { normalizeBlock, trackUrl } from './normalize-task.js'

const ctx = { sec: '2. Vocabulary', trackFile: (id) => (id === 't1' ? 'a0_1.mp3' : null), level: 'a0' }

describe('normalizeBlock', () => {
  it('choice → options и answer по индексу', () => {
    const t = normalizeBlock({ kind: 'choice', prompt: 'I ___ coffee.', options: ['likes', 'like'], correct: 1, why: 'без -s' }, ctx)
    expect(t).toMatchObject({ type: 'choice', sec: '2. Vocabulary', word: 'I ___ coffee.', options: ['likes', 'like'], answer: 'like', why: 'без -s' })
  })

  it('choice с битым индексом отбрасывается — задание без верного ответа непроверяемо', () => {
    expect(normalizeBlock({ kind: 'choice', prompt: 'x', options: ['a', 'b'], correct: 5, why: '' }, ctx)).toBeNull()
  })

  it('select → choice, ответ строкой', () => {
    const t = normalizeBlock({ kind: 'select', prompt: 'listen', options: ['слушать', 'спрашивать'], answer: 'слушать', why: '' }, ctx)
    expect(t).toMatchObject({ type: 'choice', word: 'listen', answer: 'слушать' })
  })

  it('select с ответом вне вариантов отбрасывается', () => {
    expect(normalizeBlock({ kind: 'select', prompt: 'x', options: ['a'], answer: 'b', why: '' }, ctx)).toBeNull()
  })

  it('gap → answers[] из вариантов через |', () => {
    const t = normalizeBlock({ kind: 'gap', before: 'I', after: 'coffee.', answer: 'like|love', why: 'w' }, ctx)
    expect(t).toMatchObject({ type: 'gap', gapBefore: 'I ', gapAfter: ' coffee.', answers: ['like', 'love'], why: 'w' })
  })

  it('multi → answer как отсортированный набор индексов', () => {
    const t = normalizeBlock({ kind: 'multi', prompt: 'p', options: ['a', 'b', 'c'], correct: [2, 0], why: '' }, ctx)
    expect(t).toMatchObject({ type: 'multi', options: ['a', 'b', 'c'], answer: [0, 2] })
  })

  it('order → слова и эталонный порядок', () => {
    const t = normalizeBlock({ kind: 'order', prompt: '', words: ['coffee', 'I', 'like'], order: [3, 1, 2], why: '' }, ctx)
    expect(t).toMatchObject({ type: 'order', words: ['coffee', 'I', 'like'], answer: ['I', 'like', 'coffee'] })
  })

  it('audio → listen с абсолютным URL файл-сервера', () => {
    const t = normalizeBlock({ kind: 'audio', trackId: 't1', label: 'Слушать' }, ctx)
    expect(t.type).toBe('listen')
    expect(t.tracks).toEqual([{ src: 'https://files-dev.justtostudy.kz/development/course-catalog/a0/audio/a0_1.mp3', label: 'Слушать' }])
  })

  it('audio без файла в треках урока отбрасывается', () => {
    expect(normalizeBlock({ kind: 'audio', trackId: 'нет', label: 'x' }, ctx)).toBeNull()
  })

  it('info → html как есть', () => {
    const t = normalizeBlock({ kind: 'info', html: '<p class="x">текст</p>' }, ctx)
    expect(t).toMatchObject({ type: 'info', html: '<p class="x">текст</p>' })
  })

  it('пустой info отбрасывается', () => {
    expect(normalizeBlock({ kind: 'info', html: '   ' }, ctx)).toBeNull()
  })
})

describe('trackUrl', () => {
  it('строит ссылку на бандл уровня в админке', () => {
    expect(trackUrl('a1', 'A1_L1_6_1.mp3')).toBe('https://files-dev.justtostudy.kz/development/course-catalog/a1/audio/A1_L1_6_1.mp3')
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- scripts/jts-self/normalize-task.test.js`
Expected: FAIL — `Failed to resolve import "./normalize-task.js"`.

- [ ] **Step 3: Реализовать модуль**

Создать `scripts/jts-self/normalize-task.js`:

```js
// Сырой блок урока → задание в формате нативного плеера «Обучения»
// (public/learning/<level>.json). Формат менять нельзя: его читают
// LessonPlayer.jsx и уже выпущенные уровни a2–c1.

// Аудио уроков уже опубликовано админкой вместе с бандлом уровня и отдаётся
// публично, поэтому треки не выгружаются, а адресуются по месту.
const AUDIO_BASE = 'https://files-dev.justtostudy.kz/development/course-catalog'

function trackUrl(level, file) {
  return `${AUDIO_BASE}/${level}/audio/${file}`
}

function normalizeBlock(block, ctx) {
  const base = { sec: ctx.sec || '', title: '', sub: '' }

  switch (block.kind) {
    case 'choice': {
      const answer = block.options[block.correct]
      if (!answer) return null
      return { ...base, type: 'choice', visual: null, word: block.prompt, options: block.options, answer, two: block.options.length === 2, why: block.why || '' }
    }

    case 'select': {
      if (!block.options.includes(block.answer)) return null
      return { ...base, type: 'choice', visual: null, word: block.prompt, options: block.options, answer: block.answer, two: block.options.length === 2, why: block.why || '' }
    }

    case 'gap': {
      const answers = String(block.answer || '').split('|').map((s) => s.trim()).filter(Boolean)
      if (!answers.length) return null
      // Пробелы вокруг пропуска рисует не CSS, а сама строка: плеер печатает
      // gapBefore, поле и gapAfter подряд.
      return { ...base, type: 'gap', gapBefore: block.before ? block.before + ' ' : '', gapAfter: block.after ? ' ' + block.after : '', answers, why: block.why || '' }
    }

    case 'multi': {
      const answer = [...new Set(block.correct)].filter((i) => i >= 0 && i < block.options.length).sort((a, b) => a - b)
      if (!answer.length) return null
      return { ...base, type: 'multi', word: block.prompt, options: block.options, answer, why: block.why || '' }
    }

    case 'order': {
      if (block.words.length < 2 || block.words.length !== block.order.length) return null
      // data-order — позиция каждого чипа в верном предложении: чип с data-val
      // «3» стоит в ответе третьим.
      const answer = block.words.map((w, i) => [block.order[i], w]).sort((a, b) => a[0] - b[0]).map(([, w]) => w)
      return { ...base, type: 'order', word: block.prompt, words: block.words, answer, why: block.why || '' }
    }

    case 'audio': {
      const file = ctx.trackFile(block.trackId)
      if (!file) return null
      return { ...base, type: 'listen', tracks: [{ src: trackUrl(ctx.level, file), label: block.label || '' }] }
    }

    case 'info': {
      const html = String(block.html || '').trim()
      if (!html) return null
      return { ...base, type: 'info', html }
    }

    default:
      return null
  }
}

module.exports = { normalizeBlock, trackUrl }
```

- [ ] **Step 4: Прогнать тест и убедиться, что он проходит**

Run: `npm test -- scripts/jts-self/normalize-task.test.js`
Expected: PASS, 12 тестов.

- [ ] **Step 5: Коммит**

```bash
git add scripts/jts-self/normalize-task.js scripts/jts-self/normalize-task.test.js
git commit -m "feat(learning): нормализация блоков self-урока в задания плеера"
```

---

### Task 4: Узлы тропы из стадий урока

**Files:**
- Create: `scripts/jts-self/build-nodes.js`
- Test: `scripts/jts-self/build-nodes.test.js`

**Interfaces:**
- Consumes: `collectLesson` (Task 2), `normalizeBlock` (Task 3).
- Produces: `buildLessonNodes({ lesson, level, stages }) → [{ code, title, unit, tasks }]`, `buildReviewNode({ review, level, stages }) → { code, title, unit, tasks }`, `lessonType(code, tasks) → 'audio'|'video'|'info'|'choice'|'final'`, `MIN_NODE_TASKS`.

Каждая стадия даёт свой узел тропы: `L01-1 … L01-7`, заголовок «<урок> · <стадия>». Узел короче `MIN_NODE_TASKS` (3) не создаётся — его задания дописываются в предыдущий узел урока, а если предыдущего нет — в следующий. Иначе на тропе появляются «печеньки» из одного клика.

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/jts-self/build-nodes.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildLessonNodes, buildReviewNode, lessonType, MIN_NODE_TASKS } from './build-nodes.js'

const lesson = { no: 1, unit: 1, title: 'Coffee — yes.', tracks: { t1: 'a0_1.mp3' }, html: '' }
const choice = (n) => ({ kind: 'choice', prompt: `q${n}`, options: ['a', 'b'], correct: 0, why: '' })
const stage = (name, count) => ({ name, blocks: Array.from({ length: count }, (_, i) => choice(i)) })

describe('buildLessonNodes', () => {
  it('одна стадия — один узел, код и заголовок из урока и стадии', () => {
    const [node] = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 4)] })
    expect(node).toMatchObject({ code: 'L01-1', title: 'Coffee — yes. · Warm-up', unit: 1 })
    expect(node.tasks).toHaveLength(4)
  })

  it('стадии нумеруются подряд и сохраняют порядок', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 4), stage('Grammar', 5)] })
    expect(nodes.map((n) => n.code)).toEqual(['L01-1', 'L01-2'])
    expect(nodes.map((n) => n.title)).toEqual(['Coffee — yes. · Warm-up', 'Coffee — yes. · Grammar'])
  })

  it('короткая стадия не даёт узла — уходит в предыдущий', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 4), stage('Riddles', 1)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].tasks).toHaveLength(5)
  })

  it('короткая стадия в начале уходит в следующий узел', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Intro', 1), stage('Grammar', 4)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].code).toBe('L01-1')
    expect(nodes[0].tasks).toHaveLength(5)
  })

  it('стадия ровно из MIN_NODE_TASKS остаётся своим узлом', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('A', 4), stage('B', MIN_NODE_TASKS)] })
    expect(nodes).toHaveLength(2)
  })

  it('урок без единого задания не даёт узлов', () => {
    expect(buildLessonNodes({ lesson, level: 'a0', stages: [{ name: 'Wrap', blocks: [] }] })).toEqual([])
  })

  it('номер урока дополняется нулём до двух знаков', () => {
    const [node] = buildLessonNodes({ lesson: { ...lesson, no: 7 }, level: 'a0', stages: [stage('A', 3)] })
    expect(node.code).toBe('L07-1')
  })
})

describe('buildReviewNode', () => {
  it('юнит-тест — один узел R0N без разбиения по стадиям', () => {
    const node = buildReviewNode({
      review: { no: 1, unit: 1, title: 'Unit Test · Unit 1', html: '' },
      level: 'a0',
      stages: [stage('Unit Test', 8)],
    })
    expect(node).toMatchObject({ code: 'R01', title: 'Unit Test · Unit 1', unit: 1 })
    expect(node.tasks).toHaveLength(8)
  })
})

describe('lessonType', () => {
  it('узел юнит-теста — final', () => {
    expect(lessonType('R01', [{ type: 'choice' }])).toBe('final')
  })

  it('иначе — по первому заданию узла', () => {
    expect(lessonType('L01-5', [{ type: 'listen' }])).toBe('audio')
    expect(lessonType('L01-1', [{ type: 'info' }])).toBe('info')
    expect(lessonType('L01-2', [{ type: 'gap' }])).toBe('choice')
    expect(lessonType('L01-3', [])).toBe('choice')
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- scripts/jts-self/build-nodes.test.js`
Expected: FAIL — `Failed to resolve import "./build-nodes.js"`.

- [ ] **Step 3: Реализовать модуль**

Создать `scripts/jts-self/build-nodes.js`:

```js
// Стадии урока → узлы тропы «Обучения».
//
// Урок источника — это 20–30 минут работы и до 130 экранов. Одним узлом тропы
// он был бы вдвое длиннее любого нынешнего урока и без права выйти с
// сохранением, поэтому каждая стадия становится своим узлом.
const { normalizeBlock } = require('./normalize-task')

/** Меньше — и на тропе появляется «печенька» из одного клика. */
const MIN_NODE_TASKS = 3

const pad2 = (n) => String(n).padStart(2, '0')

function tasksOfStage(stage, ctx) {
  return stage.blocks.map((b) => normalizeBlock(b, ctx)).filter(Boolean)
}

function buildLessonNodes({ lesson, level, stages }) {
  const trackFile = (id) => lesson.tracks[id] || null
  const code = `L${pad2(lesson.no)}`

  const built = stages
    .map((stage) => ({ name: stage.name, tasks: tasksOfStage(stage, { sec: stage.name, level, trackFile }) }))
    .filter((s) => s.tasks.length > 0)

  const nodes = []
  for (const stage of built) {
    const previous = nodes[nodes.length - 1]
    if (stage.tasks.length < MIN_NODE_TASKS && previous) {
      previous.tasks.push(...stage.tasks)
      continue
    }
    nodes.push({ name: stage.name, tasks: [...stage.tasks], unit: lesson.unit })
  }

  // Короткая стадия в начале урока «предыдущего» не имела — доклеиваем её к
  // тому узлу, который открылся после неё.
  if (nodes.length > 1 && nodes[0].tasks.length < MIN_NODE_TASKS) {
    nodes[1].tasks.unshift(...nodes[0].tasks)
    nodes[1].name = nodes[0].name
    nodes.shift()
  }

  return nodes.map((node, i) => ({
    code: `${code}-${i + 1}`,
    title: `${lesson.title} · ${node.name}`,
    unit: node.unit,
    tasks: node.tasks,
  }))
}

function buildReviewNode({ review, level, stages }) {
  const trackFile = () => null
  const tasks = stages.flatMap((stage) => tasksOfStage(stage, { sec: stage.name, level, trackFile }))
  return { code: `R${pad2(review.no)}`, title: review.title, unit: review.unit, tasks }
}

/** «Печенька» узла на тропе — та же группировка, что в KingdomInteriorPage. */
function taskGroup(type) {
  if (type === 'listen') return 'audio'
  if (type === 'watch' || type === 'video') return 'video'
  if (type === 'info') return 'info'
  return 'choice'
}

function lessonType(code, tasks) {
  if (/^R\d/i.test(code)) return 'final'
  const first = tasks && tasks[0]
  return first ? taskGroup(first.type) : 'choice'
}

module.exports = { buildLessonNodes, buildReviewNode, lessonType, MIN_NODE_TASKS }
```

- [ ] **Step 4: Прогнать тест и убедиться, что он проходит**

Run: `npm test -- scripts/jts-self/build-nodes.test.js`
Expected: PASS, 10 тестов.

- [ ] **Step 5: Коммит**

```bash
git add scripts/jts-self/build-nodes.js scripts/jts-self/build-nodes.test.js
git commit -m "feat(learning): сборка узлов тропы из стадий self-урока"
```

---

### Task 5: CLI-экстрактор и генерация данных A0/A1

**Files:**
- Create: `scripts/extract-jts-self-lessons.js`
- Modify: `public/learning/index.json`, `public/learning/a1.json`
- Create: `public/learning/a0.json`
- Test: `scripts/extract-jts-self-lessons.test.js`

**Interfaces:**
- Consumes: `readCourse` (Task 1), `collectLesson` (Task 2), `buildLessonNodes`/`buildReviewNode`/`lessonType` (Task 4).
- Produces: `extractCourse(filePath) → { level, label, lessons, catalog }`, где `lessons` — объект `{ [code]: { code, title, tasks } }`, а `catalog` — `[{ code, order, title, taskCount, type, unit }]`.

Юнит-тест урока закрывает свой юнит, поэтому узлы идут в порядке: все узлы уроков юнита, затем узел его теста.

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/extract-jts-self-lessons.test.js`:

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { extractCourse } from './extract-jts-self-lessons.js'

const stage = (name, rows) => `<section class="stage" data-stage="${name}">${rows}</section>`
const quiz = (n) => `<div class="task" data-task><div class="row"><span class="body">q${n}
  <div class="opts" data-correct="0"><button class="opt" data-val="0">yes</button><button class="opt" data-val="1">no</button></div>
</span></div></div>`
const stageOf = (name, count) => stage(name, Array.from({ length: count }, (_, i) => quiz(i)).join(''))

function tmpCourse() {
  const lessonHtml = stageOf('Warm-up', 4) + stageOf('Grammar', 4)
  const body = `
    <title>just to study — A0 · Course</title>
    <script>
    const UNITS=[["Lessons 1–3",["One"]]];
    const LESSONS={1:{"unit":1,"no":1,"title":"One","blurb":"","tracks":{},"html":${JSON.stringify(lessonHtml)}}};
    const REVIEWS={1:{unit:1,items:2,pass:1,title:"Unit Test · Unit 1",html:${JSON.stringify(stageOf('Unit Test', 3))}}};
    </script>`
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-')), 'a0.html')
  fs.writeFileSync(file, body)
  return file
}

describe('extractCourse', () => {
  it('даёт узлы уроков, затем узел юнит-теста, и согласованный каталог', () => {
    const out = extractCourse(tmpCourse())

    expect(out.level).toBe('a0')
    expect(out.label).toBe('A0')
    expect(out.catalog.map((n) => n.code)).toEqual(['L01-1', 'L01-2', 'R01'])
    expect(out.catalog.map((n) => n.order)).toEqual([0, 1, 2])
    expect(out.catalog.at(-1).type).toBe('final')
    expect(Object.keys(out.lessons)).toEqual(['L01-1', 'L01-2', 'R01'])
  })

  it('taskCount каталога совпадает с числом заданий узла', () => {
    const out = extractCourse(tmpCourse())
    for (const entry of out.catalog) {
      expect(entry.taskCount).toBe(out.lessons[entry.code].tasks.length)
    }
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- scripts/extract-jts-self-lessons.test.js`
Expected: FAIL — `Failed to resolve import "./extract-jts-self-lessons.js"`.

- [ ] **Step 3: Реализовать CLI**

Создать `scripts/extract-jts-self-lessons.js`:

```js
// Вытаскивает ветку Self-Study курса Just to Study (единый файл уровня
// a0.html / a1.html) в нативные данные раздела «Обучение».
//
// Источник — именно исходный файл курса, а не опубликованные админкой уроки:
// конвертер вырезает из них ключи ответов (ни data-answer, ни <select>, ни
// data-why), и проверять в плеере было бы нечего.
//
// Пишет:
//   public/learning/<level>.json — задания узлов тропы
//   public/learning/index.json   — каталог уровней и тропы
// Аудио не выгружается: треки уже опубликованы вместе с бандлом уровня.
//
// Запуск (a1.html — 257 МБ, потому увеличенная куча):
//   node --max-old-space-size=8192 scripts/extract-jts-self-lessons.js \
//     --src ~/Downloads/a0.html --src ~/Downloads/a1.html
const fs = require('node:fs')
const path = require('node:path')
const { readCourse } = require('./jts-self/read-course')
const { collectLesson } = require('./jts-self/collect-lesson')
const { buildLessonNodes, buildReviewNode, lessonType } = require('./jts-self/build-nodes')

const OUT = path.join(__dirname, '..', 'public/learning')

function extractCourse(filePath) {
  const course = readCourse(filePath)
  const reviewsByUnit = new Map(course.reviews.map((r) => [r.unit, r]))

  const nodes = []
  const seenUnits = new Set()

  for (const lesson of course.lessons) {
    // Юнит закрывается своим тестом: как только начался следующий юнит,
    // выкладываем тест предыдущего.
    if (!seenUnits.has(lesson.unit)) {
      for (const unit of seenUnits) {
        const review = reviewsByUnit.get(unit)
        if (review && !review.__done) {
          review.__done = true
          nodes.push(buildReviewNode({ review, level: course.level, stages: collectLesson(review.html) }))
        }
      }
      seenUnits.add(lesson.unit)
    }
    nodes.push(...buildLessonNodes({ lesson, level: course.level, stages: collectLesson(lesson.html) }))
  }
  for (const review of course.reviews) {
    if (!review.__done) nodes.push(buildReviewNode({ review, level: course.level, stages: collectLesson(review.html) }))
  }

  const lessons = {}
  const catalog = []
  for (const node of nodes) {
    if (!node.tasks.length) continue
    const order = catalog.length
    lessons[node.code] = { code: node.code, title: node.title, tasks: node.tasks }
    catalog.push({ code: node.code, order, title: node.title, taskCount: node.tasks.length, type: lessonType(node.code, node.tasks), unit: node.unit })
  }

  return { level: course.level, label: course.label, lessons, catalog }
}

function parseSources() {
  const out = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--src' && process.argv[i + 1]) out.push(process.argv[i + 1])
  }
  return out
}

function run() {
  const sources = parseSources()
  if (!sources.length) {
    console.error('нужен хотя бы один --src <файл курса>')
    process.exit(1)
  }

  const indexPath = path.join(OUT, 'index.json')
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

  for (const src of sources) {
    const { level, label, lessons, catalog } = extractCourse(src)
    fs.writeFileSync(path.join(OUT, `${level}.json`), JSON.stringify({ lessons }))

    index[level] = { lessons: catalog }
    const entry = { code: level, label, lessonCount: catalog.length }
    const at = index.levels.findIndex((l) => l.code === level)
    if (at >= 0) index.levels[at] = entry
    else index.levels.unshift(entry)

    const kb = (fs.statSync(path.join(OUT, `${level}.json`)).size / 1024) | 0
    console.log(`${level}: ${catalog.length} узлов → ${level}.json (${kb} KB)`)
  }

  index.levels.sort((a, b) => a.code.localeCompare(b.code))
  fs.writeFileSync(indexPath, JSON.stringify(index))
  console.log(`index.json: уровней ${index.levels.length}`)
}

if (require.main === module) run()

module.exports = { extractCourse }
```

- [ ] **Step 4: Прогнать тест и убедиться, что он проходит**

Run: `npm test -- scripts/extract-jts-self-lessons.test.js`
Expected: PASS, 2 теста.

- [ ] **Step 5: Сгенерировать данные A0 и A1**

Run:
```bash
node --max-old-space-size=8192 scripts/extract-jts-self-lessons.js \
  --src ~/Downloads/a0.html --src ~/Downloads/a1.html
```
Expected: две строки вида `a0: <N> узлов → a0.json (… KB)` и `a1: <M> узлов → a1.json (… KB)`, затем `index.json: уровней 6`. Ожидаемый порядок величин: A0 — 100–200 узлов, A1 — 150–300.

- [ ] **Step 6: Проверить вывод глазами**

Run:
```bash
node -e "
const idx=require('./public/learning/index.json');
console.log(idx.levels);
const a0=require('./public/learning/a0.json');
const codes=Object.keys(a0.lessons);
console.log('узлов',codes.length,'первый',JSON.stringify(a0.lessons[codes[0]]).slice(0,300));
const types={};for(const c of codes)for(const t of a0.lessons[c].tasks)types[t.type]=(types[t.type]||0)+1;
console.log('типы',types);
"
```
Expected: в `levels` шесть уровней начиная с `a0`; среди типов есть `choice`, `gap`, `order`, `multi`, `listen`, `info`; ни одного `undefined`.

- [ ] **Step 7: Коммит**

```bash
git add scripts/extract-jts-self-lessons.js scripts/extract-jts-self-lessons.test.js public/learning
git commit -m "feat(learning): экстрактор self-study A0/A1 и сгенерированные данные"
```

---

### Task 6: Карточки словаря с картинками

**Files:**
- Modify: `scripts/jts-self/read-course.js` — вернуть `vocab` и `images` урока
- Modify: `scripts/jts-self/read-course.test.js`
- Create: `scripts/jts-self/vocab-cards.js`
- Test: `scripts/jts-self/vocab-cards.test.js`
- Modify: `scripts/extract-jts-self-lessons.js` — запись картинок и врезка карточек

**Interfaces:**
- Consumes: `readCourse` (Task 1), `buildLessonNodes` (Task 4).
- Produces: `vocabCardsTask(lesson, imageUrl) → task|null` — задание `info` с сеткой карточек; `imageSlug(word) → string`; `writeImages(lesson, level, dir) → { [word]: filename }`.

Картинки слов лежат в уроке отдельной картой `IMG` (слово → data-URI) и в разметку не попадают — исходный курс подставляет их скриптом. Поэтому карточки собираются экстрактором: слово, перевод и картинка из `VOCAB`/`IMG`. Без картинок карточка остаётся текстовой, поэтому шаг не блокируется отсутствием доступа к бакету.

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/jts-self/vocab-cards.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { vocabCardsTask, imageSlug } from './vocab-cards.js'

const lesson = {
  no: 1,
  vocab: [
    ['like', '', 'нравится', 'ұнайды', 'to feel that something is good'],
    ["don't like", '', 'не нравится', 'ұнамайды', 'the opposite'],
  ],
}

describe('imageSlug', () => {
  it('приводит слово к безопасному имени файла', () => {
    expect(imageSlug('don’t like')).toBe('don-t-like')
    expect(imageSlug('Look at')).toBe('look-at')
  })
})

describe('vocabCardsTask', () => {
  it('собирает info-задание с карточкой на каждое слово', () => {
    const task = vocabCardsTask(lesson, () => 'https://cdn/img.jpg')
    expect(task.type).toBe('info')
    expect(task.html).toContain('like')
    expect(task.html).toContain('нравится')
    expect(task.html.match(/kl-vocab__card/g)).toHaveLength(2)
    expect(task.html).toContain('src="https://cdn/img.jpg"')
  })

  it('без картинки карточка остаётся текстовой', () => {
    const task = vocabCardsTask(lesson, () => null)
    expect(task.html).not.toContain('<img')
    expect(task.html).toContain('нравится')
  })

  it('урок без словаря не даёт задания', () => {
    expect(vocabCardsTask({ no: 1, vocab: [] }, () => null)).toBeNull()
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- scripts/jts-self/vocab-cards.test.js`
Expected: FAIL — `Failed to resolve import "./vocab-cards.js"`.

- [ ] **Step 3: Реализовать модуль карточек**

Создать `scripts/jts-self/vocab-cards.js`:

```js
// Карточки словаря урока. Слова и переводы лежат в VOCAB, картинки — в
// отдельной карте IMG, и в разметку урока ни то, ни другое не попадает:
// исходный курс рисует карточки скриптом. Поэтому собираем их сами.
const escapeHtml = (s) =>
  String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Имя файла картинки: слово в нижнем регистре, всё небуквенное — в дефис. */
function imageSlug(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Задание-карточки для стадии Vocabulary. imageUrl(word) → ссылка или null:
 * пока картинки не залиты, карточка остаётся текстовой, и это не ошибка.
 */
function vocabCardsTask(lesson, imageUrl) {
  const words = (lesson.vocab || []).filter((row) => Array.isArray(row) && row[0])
  if (!words.length) return null

  const cards = words
    .map(([word, , ru, kk, definition]) => {
      const src = imageUrl(word)
      const image = src ? `<img class="kl-vocab__img" src="${escapeHtml(src)}" alt="">` : ''
      return (
        `<div class="kl-vocab__card">${image}` +
        `<b class="kl-vocab__word">${escapeHtml(word)}</b>` +
        `<span class="kl-vocab__tr">${escapeHtml(ru)}${kk ? ' · ' + escapeHtml(kk) : ''}</span>` +
        (definition ? `<span class="kl-vocab__def">${escapeHtml(definition)}</span>` : '') +
        `</div>`
      )
    })
    .join('')

  return { type: 'info', sec: 'Vocabulary', title: '', sub: '', html: `<div class="kl-vocab">${cards}</div>` }
}

module.exports = { vocabCardsTask, imageSlug }
```

- [ ] **Step 4: Вернуть словарь и картинки из readCourse**

В `scripts/jts-self/read-course.js` в маппинге уроков добавить два поля:

```js
      return {
        no,
        unit: l.unit,
        title: l.title || '',
        blurb: l.blurb || '',
        tracks: l.tracks || {},
        // VOCAB у A0 разложен по режимам, у A1 — плоским списком.
        vocab: Array.isArray(l.VOCAB) ? l.VOCAB : (l.VOCAB && l.VOCAB.self) || [],
        images: l.IMG || {},
        html: l.html || '',
      }
```

Дописать проверку в `scripts/jts-self/read-course.test.js` внутрь `describe('readCourse')`:

```js
  it('берёт словарь режима self и карту картинок', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const UNITS=[["U",["One"]]];
      const LESSONS={1:{"unit":1,"no":1,"title":"One","blurb":"","tracks":{},
        "VOCAB":{"self":[["like","","нравится","ұнайды","def"]],"group":[]},
        "IMG":{"like":"data:image/jpeg;base64,AAA"},"html":""}};
      const REVIEWS={};
      </script>`)
    const [lesson] = readCourse(file).lessons
    expect(lesson.vocab).toEqual([['like', '', 'нравится', 'ұнайды', 'def']])
    expect(lesson.images).toEqual({ like: 'data:image/jpeg;base64,AAA' })
  })
```

- [ ] **Step 5: Писать картинки и врезать карточки в экстракторе**

В `scripts/extract-jts-self-lessons.js` добавить импорты и запись файлов:

```js
const { vocabCardsTask, imageSlug } = require('./jts-self/vocab-cards')

// Локальный staging медиа — в .gitignore; в git уходит только лёгкий JSON.
const MEDIA_DIR = path.join(OUT, 'media')
const MEDIA_URL_BASE = 'https://files-api.iqra.space/development/learning-media'

/** Пишет картинки слов урока и возвращает слово → публичная ссылка. */
function writeImages(lesson, level) {
  const dir = path.join(MEDIA_DIR, level)
  const urls = {}
  for (const [word, uri] of Object.entries(lesson.images || {})) {
    const m = /^data:image\/([a-z]+);base64,(.+)$/s.exec(String(uri))
    if (!m) continue
    const file = `${imageSlug(word)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, file), Buffer.from(m[2], 'base64'))
    urls[word] = `${MEDIA_URL_BASE}/${level}/${file}`
  }
  return urls
}
```

В `extractCourse` перед `nodes.push(...buildLessonNodes(...))` собрать карточки и врезать их первым заданием узла стадии Vocabulary:

```js
    const imageUrls = writeImages(lesson, course.level)
    const cards = vocabCardsTask(lesson, (word) => imageUrls[word] || null)
    const lessonNodes = buildLessonNodes({ lesson, level: course.level, stages: collectLesson(lesson.html) })
    if (cards) {
      const vocabNode = lessonNodes.find((n) => /vocab|words/i.test(n.title))
      if (vocabNode) vocabNode.tasks.unshift(cards)
    }
    nodes.push(...lessonNodes)
```

- [ ] **Step 6: Добавить стили карточек**

В `src/styles.css` рядом с прочими `.kl-*`:

```css
.kl-vocab { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.kl-vocab__card {
  display: flex; flex-direction: column; gap: 4px; padding: 12px;
  border: 1.5px solid #ece8fb; border-radius: 14px; background: #fff; text-align: center;
}
.kl-vocab__img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; }
.kl-vocab__word { font-size: 15px; color: var(--ink); }
.kl-vocab__tr { font-size: 13px; color: var(--muted); }
.kl-vocab__def { font-size: 12px; color: var(--muted); }
```

- [ ] **Step 7: Исключить staging медиа из git**

В `.gitignore` добавить строку:

```
public/learning/media/
```

- [ ] **Step 8: Прогнать тесты и пересобрать данные**

Run: `npm test -- scripts/jts-self`
Expected: PASS, включая новые тесты `vocab-cards` и `read-course`.

Run:
```bash
node --max-old-space-size=8192 scripts/extract-jts-self-lessons.js \
  --src ~/Downloads/a0.html --src ~/Downloads/a1.html
ls public/learning/media/a0 | wc -l
```
Expected: около 200 файлов картинок для A0.

- [ ] **Step 9: Коммит**

```bash
git add scripts/jts-self/vocab-cards.js scripts/jts-self/vocab-cards.test.js \
  scripts/jts-self/read-course.js scripts/jts-self/read-course.test.js \
  scripts/extract-jts-self-lessons.js src/styles.css .gitignore public/learning
git commit -m "feat(learning): карточки словаря с картинками в уроках A0/A1"
```

---

### Task 7: Тип задания «order» в плеере

**Files:**
- Modify: `src/learning/LessonPlayer.jsx:17` (`GRADED`), `:200-219` (`TaskBody`), конец файла — новый компонент
- Modify: `src/styles.css` — после блока `.kl-bank`/`.kl-chip` (около строки 5813)
- Modify: `src/i18n.jsx:213` (ru), `:695` (en), `:1175` (kk)
- Create: `src/learning/LessonPlayer.test.jsx`

**Interfaces:**
- Consumes: задания `{ type: 'order', word, words: string[], answer: string[], why }` из Task 3.
- Produces: рендер `.kl-order`, `.kl-order__line`, `.kl-order__chip`; задание участвует в начислении монет и снятии сердец.

- [ ] **Step 1: Написать падающий тест**

Создать `src/learning/LessonPlayer.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LessonPlayer from './LessonPlayer.jsx'

function renderLesson(tasks, props = {}) {
  const lesson = { code: 'L01-1', title: 'Тест', tasks }
  return render(
    <I18nProvider>
      <LessonPlayer lesson={lesson} level="a0" token="t" onExit={() => {}} onDone={() => {}} {...props} />
    </I18nProvider>,
  )
}

const orderTask = {
  type: 'order',
  sec: '4. Practice',
  word: 'Собери предложение',
  words: ['coffee', 'I', 'like'],
  answer: ['I', 'like', 'coffee'],
  why: 'подлежащее, глагол, дополнение',
}

describe('LessonPlayer — задание order', () => {
  it('кнопка проверки недоступна, пока собраны не все слова', () => {
    renderLesson([orderTask])
    const check = screen.getByRole('button', { name: /проверить/i })
    expect(check.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'I' }))
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  it('верный порядок засчитывается и даёт монеты', () => {
    const onDone = vi.fn()
    renderLesson([orderTask], { onDone })
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', correct: 1, wrong: 0, points: 10 }))
  })

  it('неверный порядок показывает правильный ответ', () => {
    renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(screen.getByText(/I like coffee/)).toBeTruthy()
  })

  it('повторный клик по слову возвращает его в банк', () => {
    renderLesson([orderTask])
    const word = screen.getByRole('button', { name: 'I' })
    fireEvent.click(word)
    fireEvent.click(screen.getByRole('button', { name: 'I' }))
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- src/learning/LessonPlayer.test.jsx`
Expected: FAIL — задание не рендерится, `getByRole('button', { name: 'I' })` не находит элемент.

- [ ] **Step 3: Добавить ключи локализации**

В `src/i18n.jsx` в блок `ru` (рядом со строкой `'lesson.check'`):

```js
    'lesson.order.hint': 'Нажимай на слова по порядку',
```

В блок `en`:

```js
    'lesson.order.hint': 'Tap the words in order',
```

В блок `kk`:

```js
    'lesson.order.hint': 'Сөздерді ретімен басыңыз',
```

- [ ] **Step 4: Добавить компонент в плеер**

В `src/learning/LessonPlayer.jsx` расширить `GRADED`:

```js
const GRADED = new Set(['choice', 'gap', 'chips', 'order'])
```

Добавить ветку в `TaskBody`:

```js
    case 'order':
      return <Order task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
```

И сам компонент — после `Chips`:

```jsx
// ——— order (собрать предложение из слов) ———
function Order({ task, answered, finish, setCanCheck, bind, t }) {
  const words = task.words || []
  const [picked, setPicked] = useState([]) // индексы слов в порядке нажатия
  useEffect(() => setCanCheck(picked.length === words.length && !answered), [picked, words.length, answered, setCanCheck])

  const line = picked.map((i) => words[i])
  bind(() => {
    if (answered || picked.length !== words.length) return
    const expected = task.answer || []
    finish(line.every((w, i) => w === expected[i]), expected.join(' '))
  })

  return (
    <>
      {task.word && <div className="kl-word">{task.word}</div>}
      <div className={`kl-order__line ${answered ? 'done' : ''}`}>
        {line.length ? line.join(' ') : <span className="kl-order__ph">{t('lesson.order.hint')}</span>}
      </div>
      <div className="kl-bank kl-order">
        {words.map((w, i) => (
          <button
            key={i}
            className={`kl-chip ${picked.includes(i) ? 'sel' : ''}`}
            disabled={answered}
            onClick={() => !answered && setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Добавить стили**

В `src/styles.css` после блока `.kl-chip:disabled`:

```css
.kl-order__line {
  min-height: 56px; display: flex; align-items: center; justify-content: center;
  padding: 12px 16px; border: 2px dashed #ded8f5; border-radius: 14px;
  font-size: 20px; font-weight: 700; color: var(--ink); text-align: center;
}
.kl-order__line.done { border-style: solid; }
.kl-order__ph { font-size: 15px; font-weight: 600; color: var(--muted); }
```

- [ ] **Step 6: Прогнать тесты и убедиться, что они проходят**

Run: `npm test -- src/learning/LessonPlayer.test.jsx`
Expected: PASS, 4 теста.

- [ ] **Step 7: Коммит**

```bash
git add src/learning/LessonPlayer.jsx src/learning/LessonPlayer.test.jsx src/styles.css src/i18n.jsx
git commit -m "feat(learning): тип задания order в нативном плеере"
```

---

### Task 8: Тип задания «multi» в плеере

**Files:**
- Modify: `src/learning/LessonPlayer.jsx` (`GRADED`, `TaskBody`, новый компонент)
- Modify: `src/styles.css`
- Modify: `src/i18n.jsx` (ru/en/kk)
- Modify: `src/learning/LessonPlayer.test.jsx`

**Interfaces:**
- Consumes: задания `{ type: 'multi', word, options: string[], answer: number[], why }` из Task 3.
- Produces: рендер `.kl-multi` поверх существующих `.kl-opt`; верно, когда набор отмеченных совпадает с эталонным.

- [ ] **Step 1: Написать падающий тест**

Дописать в `src/learning/LessonPlayer.test.jsx`:

```jsx
const multiTask = {
  type: 'multi',
  sec: '5. Listening',
  word: 'Отметь всё, что услышал',
  options: ['read', 'cook', 'travel'],
  answer: [0, 2],
  why: '',
}

describe('LessonPlayer — задание multi', () => {
  it('проверка недоступна, пока ничего не отмечено', () => {
    renderLesson([multiTask])
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  it('точное совпадение набора — верно', () => {
    const onDone = vi.fn()
    renderLesson([multiTask], { onDone })
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    fireEvent.click(screen.getByRole('button', { name: 'travel' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: 1, wrong: 0 }))
  })

  it('лишний отмеченный вариант — неверно, показан эталон', () => {
    renderLesson([multiTask])
    for (const option of ['read', 'cook', 'travel']) fireEvent.click(screen.getByRole('button', { name: option }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(screen.getByText(/read, travel/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- src/learning/LessonPlayer.test.jsx`
Expected: FAIL на трёх новых тестах — варианты не рендерятся.

- [ ] **Step 3: Добавить ключи локализации**

`src/i18n.jsx`, блок `ru`:

```js
    'lesson.multi.hint': 'Можно отметить несколько',
```

блок `en`:

```js
    'lesson.multi.hint': 'Choose all that apply',
```

блок `kk`:

```js
    'lesson.multi.hint': 'Бірнешеуін белгілеуге болады',
```

- [ ] **Step 4: Добавить компонент в плеер**

В `src/learning/LessonPlayer.jsx` расширить `GRADED`:

```js
const GRADED = new Set(['choice', 'gap', 'chips', 'order', 'multi'])
```

Ветка в `TaskBody`:

```js
    case 'multi':
      return <Multi task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
```

Компонент — после `Order`:

```jsx
// ——— multi (отметить несколько верных) ———
function Multi({ task, answered, finish, setCanCheck, bind, t }) {
  const options = task.options || []
  const [picked, setPicked] = useState([])
  useEffect(() => setCanCheck(picked.length > 0 && !answered), [picked, answered, setCanCheck])

  const expected = task.answer || []
  bind(() => {
    if (answered || !picked.length) return
    const mine = [...picked].sort((a, b) => a - b)
    const ok = mine.length === expected.length && mine.every((v, i) => v === expected[i])
    finish(ok, expected.map((i) => options[i]).join(', '))
  })

  return (
    <>
      {task.word && <div className="kl-word">{task.word}</div>}
      <div className="kl-multi__hint">{t('lesson.multi.hint')}</div>
      <div className="kl-opts kl-multi">
        {options.map((o, i) => {
          let cls = 'kl-opt'
          if (picked.includes(i) && !answered) cls += ' sel'
          if (answered) {
            if (expected.includes(i)) cls += ' correct'
            else if (picked.includes(i)) cls += ' wrong'
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={answered}
              onClick={() => !answered && setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
            >
              {o}
            </button>
          )
        })}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Добавить стиль подсказки**

В `src/styles.css` рядом со стилями `.kl-order__line`:

```css
.kl-multi__hint { margin-bottom: 12px; font-size: 13px; font-weight: 600; color: var(--muted); text-align: center; }
```

- [ ] **Step 6: Прогнать тесты и убедиться, что они проходят**

Run: `npm test -- src/learning/LessonPlayer.test.jsx`
Expected: PASS, 7 тестов.

- [ ] **Step 7: Коммит**

```bash
git add src/learning/LessonPlayer.jsx src/learning/LessonPlayer.test.jsx src/styles.css src/i18n.jsx
git commit -m "feat(learning): тип задания multi в нативном плеере"
```

---

### Task 9: Пояснение «почему» в блоке фидбэка

**Files:**
- Modify: `src/learning/LessonPlayer.jsx` — `finish`, состояние `feedback`, разметка `.kl-fb`
- Modify: `src/styles.css`
- Modify: `src/i18n.jsx` (ru/en/kk)
- Modify: `src/learning/LessonPlayer.test.jsx`

**Interfaces:**
- Consumes: поле `why` заданий из Task 3.
- Produces: строка `.kl-fb__why` в блоке фидбэка, когда у задания есть `why`.

В источнике объяснение — часть методики: «после каждой проверки читай „почему“ — это твой учитель». Без него урок теряет обучающую половину.

- [ ] **Step 1: Написать падающий тест**

Дописать в `src/learning/LessonPlayer.test.jsx`:

```jsx
describe('LessonPlayer — пояснение why', () => {
  it('показывает пояснение после неверного ответа', () => {
    renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/подлежащее, глагол, дополнение/)).toBeTruthy()
  })

  it('показывает пояснение и после верного ответа', () => {
    renderLesson([orderTask])
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/подлежащее, глагол, дополнение/)).toBeTruthy()
  })

  it('без why лишней строки нет', () => {
    renderLesson([{ ...orderTask, why: '' }])
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(document.querySelector('.kl-fb__why')).toBeNull()
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- src/learning/LessonPlayer.test.jsx`
Expected: FAIL на первых двух новых тестах — текста пояснения нет в документе.

- [ ] **Step 3: Добавить ключ локализации**

`src/i18n.jsx`, блоки `ru` / `en` / `kk` соответственно:

```js
    'lesson.why': 'Почему',
```

```js
    'lesson.why': 'Why',
```

```js
    'lesson.why': 'Неге',
```

- [ ] **Step 4: Показать пояснение в фидбэке**

В `src/learning/LessonPlayer.jsx` в `LessonTask` дополнить блок `.kl-fb` после строки с `kl-fb__ans`:

```jsx
            {task.why && <span className="kl-fb__why"><b>{t('lesson.why')}:</b> {task.why}</span>}
```

- [ ] **Step 5: Добавить стиль**

В `src/styles.css` после `.kl-fb__ans`:

```css
.kl-fb__why { font-size: 13px; line-height: 1.45; color: var(--muted); }
.kl-fb__why b { color: var(--ink); }
```

- [ ] **Step 6: Прогнать тесты и убедиться, что они проходят**

Run: `npm test -- src/learning/LessonPlayer.test.jsx`
Expected: PASS, 10 тестов.

- [ ] **Step 7: Коммит**

```bash
git add src/learning/LessonPlayer.jsx src/learning/LessonPlayer.test.jsx src/styles.css src/i18n.jsx
git commit -m "feat(learning): пояснение «почему» в фидбэке урока"
```

---

### Task 10: Карта — сдвиг уровней и уход C2

**Files:**
- Modify: `src/kingdoms.js:3-10` (`KINGDOMS`), `:30-39` (`computeKingdoms`). `LEVEL_ORDER` не трогать: в нём остаётся C2, иначе `levelIndex('C2')` у студента с таким уровнем вернёт 0.
- Create: `src/kingdoms.test.js`

**Interfaces:**
- Consumes: ничего.
- Produces: `KINGDOMS` из шести городов с уровнями A0–C1; `computeKingdoms(userLevel)` открывает A0 по умолчанию.

Города, короли, цвета колец и позиции остаются на местах — съезжает только ярлык уровня.

- [ ] **Step 1: Написать падающий тест**

Создать `src/kingdoms.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { KINGDOMS, computeKingdoms, roleForLevel } from './kingdoms.js'

describe('раскладка королевств', () => {
  it('шесть городов, уровни от A0 до C1, C2 нет', () => {
    expect(KINGDOMS.map((k) => k.level)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'])
  })

  it('города, короли и позиции не переехали', () => {
    expect(KINGDOMS.map((k) => k.id)).toEqual(['sunhaven', 'greendale', 'bridgeport', 'highspire', 'frostcrystal', 'goldcrown'])
    expect(KINGDOMS[0]).toMatchObject({ name: 'Redtown', king: 'Майкл Флот', map: { x: 45, y: 85 }, ring: '#EF6C2E' })
    expect(KINGDOMS[5]).toMatchObject({ name: 'Rosewind Town', level: 'C1' })
  })

  it('ни один город больше не «скоро»', () => {
    expect(KINGDOMS.some((k) => k.comingSoon)).toBe(false)
  })
})

describe('computeKingdoms', () => {
  it('новичку открыт A0 и закрыт A1', () => {
    const open = computeKingdoms('A0')
    expect(open.find((k) => k.level === 'A0')).toMatchObject({ unlocked: true, current: true })
    expect(open.find((k) => k.level === 'A1').unlocked).toBe(false)
  })

  it('уровень студента открывает всё до него включительно', () => {
    const open = computeKingdoms('B1')
    expect(open.filter((k) => k.unlocked).map((k) => k.level)).toEqual(['A0', 'A1', 'A2', 'B1'])
    expect(open.find((k) => k.current).level).toBe('B1')
  })

  it('C2 у студента не ломает карту — текущим становится C1', () => {
    const open = computeKingdoms('C2')
    expect(open.every((k) => k.unlocked)).toBe(true)
    expect(open.find((k) => k.current).level).toBe('C1')
  })

  it('звание A0 сохранено', () => {
    expect(roleForLevel('A0')).toMatchObject({ key: 'merchant' })
  })
})
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `npm test -- src/kingdoms.test.js`
Expected: FAIL — уровни `['A1','A2','B1','B2','C1','C2']` вместо ожидаемых.

- [ ] **Step 3: Сдвинуть уровни**

В `src/kingdoms.js` заменить массив `KINGDOMS`:

```js
// Уровни съехали на один узел: курс A0 занял первый город, C2 из раздела ушёл.
// Города, короли, цвета колец и позиции остались на местах — их знают в лицо.
export const KINGDOMS = [
  { id: 'sunhaven', name: 'Redtown', king: 'Майкл Флот', level: 'A0', map: { x: 45, y: 85 }, ring: '#EF6C2E' },
  { id: 'greendale', name: 'Bluewave Town', king: 'Барни', level: 'A1', map: { x: 63, y: 71 }, ring: '#2E86D6' },
  { id: 'bridgeport', name: 'Green Peace Town', king: 'Ди Флотио', level: 'A2', map: { x: 39, y: 57 }, ring: '#3AA35A' },
  { id: 'highspire', name: 'Music Town', king: 'Эван Доу', level: 'B1', map: { x: 57, y: 43 }, ring: '#7C43B4' },
  { id: 'frostcrystal', name: 'Cocalastic Town', king: 'Шелли Бумер', level: 'B2', map: { x: 40, y: 28 }, ring: '#E0A21F' },
  { id: 'goldcrown', name: 'Rosewind Town', king: 'Атлас Дон', level: 'C1', map: { x: 58, y: 15 }, ring: '#C43C93' },
]
```

- [ ] **Step 4: Открыть A0 по умолчанию**

В том же файле заменить тело `computeKingdoms`:

```js
// Гейтинг доступа (world_cubit): A0 открыт всегда, дальше — всё до уровня
// студента включительно. Уровень выше последнего города (C2) не оставляет
// карту без «текущего» — им становится последний.
export function computeKingdoms(userLevel) {
  const last = levelIndex(KINGDOMS[KINGDOMS.length - 1].level)
  const effIdx = Math.min(last, Math.max(levelIndex(userLevel), levelIndex('A0')))
  return KINGDOMS.map((k) => {
    const kIdx = levelIndex(k.level)
    const unlocked = !k.comingSoon && kIdx <= effIdx
    return { ...k, unlocked, current: !k.comingSoon && kIdx === effIdx }
  })
}
```

- [ ] **Step 5: Прогнать тесты и убедиться, что они проходят**

Run: `npm test -- src/kingdoms.test.js`
Expected: PASS, 7 тестов.

- [ ] **Step 6: Коммит**

```bash
git add src/kingdoms.js src/kingdoms.test.js
git commit -m "feat(learning): карта начинается с A0, уровень C2 убран"
```

---

### Task 11: Уровень A0 в модулях админки

**Files:**
- Modify: `/Users/mirasnurlanov/jts-workspace-3/web-admin/src/app/feature/system/lesson-modules/lesson-module.model.ts:9-16`

**Interfaces:**
- Consumes: ничего.
- Produces: `MODULE_LEVELS` с A0 первым — иначе модуль A0 не завести через UI на `/system/lessons`.

Это отдельный репозиторий: работа ведётся в `/Users/mirasnurlanov/jts-workspace-3/web-admin` на своей ветке.

- [ ] **Step 1: Создать ветку**

```bash
cd /Users/mirasnurlanov/jts-workspace-3/web-admin
git checkout develop && git pull --ff-only && git checkout -b feat/lesson-modules-a0
```

- [ ] **Step 2: Добавить уровень**

Заменить в `src/app/feature/system/lesson-modules/lesson-module.model.ts`:

```ts
/** The CEFR levels the learning section ships, in display order. */
export const MODULE_LEVELS: LanguageLevel[] = [
  LanguageLevel.A0,
  LanguageLevel.A1,
  LanguageLevel.A2,
  LanguageLevel.B1,
  LanguageLevel.B2,
  LanguageLevel.C1,
];
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: сборка проходит без ошибок TypeScript.

- [ ] **Step 4: Коммит**

```bash
git add src/app/feature/system/lesson-modules/lesson-module.model.ts
git commit -m "feat(lesson-modules): уровень A0 в списке модулей"
```

---

### Task 12: Полная проверка и подготовка PR

**Files:**
- Modify: `docs/superpowers/plans/2026-08-10-learning-a0-a1-self-study.md` (отметки выполнения)

**Interfaces:**
- Consumes: всё предыдущее.
- Produces: зелёные `npm test`, `npm run lint`, `npm run build` и живой прогон тропы A0.

- [ ] **Step 1: Прогнать юнит-тесты**

Run: `cd /Users/mirasnurlanov/jts-workspace-3/jts-web-app && npm test`
Expected: PASS, включая новые файлы `scripts/jts-self/*.test.js`, `scripts/extract-jts-self-lessons.test.js`, `src/learning/LessonPlayer.test.jsx`, `src/kingdoms.test.js`.

- [ ] **Step 2: Прогнать линтер**

Run: `npm run lint`
Expected: без ошибок. `eval` в `scripts/jts-self/read-course.js` уже закрыт построчным `eslint-disable-next-line no-eval`.

- [ ] **Step 3: Прогнать сборку**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 4: Прогнать e2e раздела**

Run: `npm run test:e2e -- tests/learning-lesson.spec.js`
Expected: PASS. Тест открывает первый доступный узел карты — теперь это A0; данные для него есть, потому что `a0.json` сгенерирован в Task 5.

- [ ] **Step 5: Посмотреть тропу вживую**

Run: `npm run dev`, открыть `http://localhost:3000/?screen=kingdom`
Проверить глазами: на карте шесть городов, первый — Redtown с ярлыком A0 и он открыт; внутри — тропа с узлами вида «Coffee — yes. Mondays — no. · Vocabulary»; узел юнит-теста отрисован «печенькой» final; в уроке работают задания `order`, `multi`, аудио играет, после проверки видно «Почему».

- [ ] **Step 6: Коммит и пуш**

```bash
git add docs/superpowers/plans/2026-08-10-learning-a0-a1-self-study.md
git commit -m "docs: план переноса self-study A0/A1 выполнен"
git push -u origin feat/learning-a0-a1-self-study
```

- [ ] **Step 7: Открыть PR**

```bash
gh pr create --base develop --title "Обучение: нативные self-study уроки A0 и A1" --body "$(cat <<'EOF'
Ветка Self-Study курсов A0 и A1 перенесена в раздел «Обучение» нативно.

- новый экстрактор `scripts/extract-jts-self-lessons.js` читает исходный файл курса и пишет `public/learning/a0.json`, `a1.json`, `index.json`
- каждая стадия урока — свой узел тропы; юнит-тесты — узлы типа final
- в плеере два новых типа задания (`order`, `multi`) и показ пояснения «Почему»
- карта: уровни съехали на один город, A0 первым, C2 убран
- аудио не выгружалось: треки уже опубликованы вместе с бандлом уровня

Требует парного PR в web-admin (A0 в `MODULE_LEVELS`) и ручного заведения модулей A0/A1 на `/system/lessons`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Ручные шаги после мержа

Кодом не делаются, выполняются в админке:

1. На `/system/lessons` завести модуль **A0**: `indexUrl` — `https://files-dev.justtostudy.kz/development/course-catalog/a0/index.html`, `lessonCount` — число узлов из вывода экстрактора, статус `PUBLISHED`.
2. Там же переназначить модуль **A1** на `https://files-dev.justtostudy.kz/development/course-catalog/a1/index.html` и обновить `lessonCount`.
3. Залить картинки словаря A0, когда появятся доступы к бакету (см. спеку, раздел «Медиа»). До заливки карточки слов рендерятся текстом.
