# Луна нажимает кнопки и слушается голоса — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Луна (Айзере) нажимает любую не опасную кнопку экрана по просьбе ученика — из чата, голосом через позывной «Луна, …» и в звонке; короткие команды («дальше», «проверь») выполняются на устройстве без модели.

**Architecture:** Снимок экрана нумерует кнопки (`[кнопка #7 «Проверить»]`), модель просит нажатие меткой `[[CLICK(_NOW) 7]]`, роут сверяет номер со снимком и снимает опасное и нечестное (`clickPolicy.js`), окно нажимает (`clicker.js`). Быстрые команды узнаёт `voiceCommands.js` — на итоге Vosk «уха» (грамматика пополнена командами), на тексте микрофона и звонка. Фраза одним духом («Луна, нажми «Начать»») отдаётся в распознавание из кольцевого буфера «уха» (`wake/preroll.js`). На команду голосом окно не открывается — облачко у кнопки.

**Tech Stack:** Next.js (JS, не TS), React 19, vitest + jsdom + RTL, Playwright, vosk-browser 0.0.8.

## Global Constraints

- Спека: `docs/superpowers/specs/2026-10-21-luna-click-voice-control-design.md`.
- JavaScript, не TypeScript; комментарии по-русски и объясняют «почему»; стиль соседних модулей `src/lib/assistant/`.
- Запрещено нажимать: выход, удаление, оплата/покупка/подписка, «Сдать / Отправить / Завершить», сброс, пароль; плюс `data-assistant-noclick`.
- На непроверенном задании (`openingFocus(text).unchecked`) нажатие — только кнопки, которую ученик назвал своими словами.
- Правка RULES (`prompt.js`) — только с живым замером Haiku 5.5 (≥ 20 сценариев), параметры роута: `thinking: disabled`, `output_config.effort: 'low'`.
- Агент LiveKit не трогаем (мозг звонка — в окне).
- Строки UI — `src/i18n.jsx`, ключи одинаковые в `ru`/`en`/`kk`.
- Проверка: `npx vitest run src/lib/assistant src/components/AssistantWidget* src/app/api/assistant` (весь `npm test` видит чужие worktree — память vitest-scans-worktrees), `npm run lint`, `npm run build`, e2e `npx playwright test tests/assistant-click.spec.js tests/assistant-wake.spec.js --workers=1`.

---

### Task 1: Голосовые команды — `voiceCommands.js`

**Files:**
- Create: `src/lib/assistant/voiceCommands.js`
- Test: `src/lib/assistant/voiceCommands.test.js`

**Interfaces:**
- Produces: `normCmd(s): string`; `COMMANDS: {id, say: string[], buttons: string[]}[]`; `WAKE_COMMAND_WORDS: {ru: string[], kk: string[]}`; `matchCommand(text, {name?}): Command|null`; `commandButton(command, label): boolean`; `findCommandButtons(refs: Map<number,{el,label}>, command): {ref, el, label}[]`; `wakeTail(text, name): string[]`; `stripWake(text, personaId): string`; `namedByStudent(label, userText): boolean`.

- [ ] **Step 1: Тест**

```js
import { describe, it, expect } from 'vitest'
import { COMMANDS, WAKE_COMMAND_WORDS, commandButton, findCommandButtons, matchCommand, namedByStudent, normCmd, stripWake, wakeTail } from './voiceCommands.js'

const id = (text, opts) => matchCommand(text, opts)?.id ?? null

describe('matchCommand', () => {
  it('итог Vosk: имя и ровно команда', () => {
    expect(id('луна дальше', { name: 'луна' })).toBe('next')
    expect(id('привет луна проверь', { name: 'луна' })).toBe('check')
    expect(id('[unk] луна ещё раз', { name: 'луна' })).toBe('replay')
    expect(id('айзере келесі', { name: 'айзере' })).toBe('next')
    expect(id('айзере әрі қарай', { name: 'айзере' })).toBe('next')
  })
  it('вежливые слова не мешают', () => {
    expect(id('луна давай дальше', { name: 'луна' })).toBe('next')
    expect(id('луна нажми проверить пожалуйста', { name: 'луна' })).toBe('check')
  })
  it('не команда — модели', () => {
    expect(id('луна', { name: 'луна' })).toBe(null)
    expect(id('луна [unk] дальше', { name: 'луна' })).toBe(null)
    expect(id('луна почему дальше нельзя', { name: 'луна' })).toBe(null)
    expect(id('дальше', { name: 'луна' })).toBe(null)
  })
  it('текст микрофона и звонка — без имени', () => {
    expect(id('Дальше.')).toBe('next')
    expect(id('Стоп!')).toBe('stop')
    expect(id('Закрой')).toBe('close')
    expect(id('Не надо дальше')).toBe(null)
  })
})

describe('кнопки команды', () => {
  it('подпись начинается с корня кнопки', () => {
    const next = COMMANDS.find((c) => c.id === 'next')
    expect(commandButton(next, 'Далее →')).toBe(true)
    expect(commandButton(next, 'Следующий урок')).toBe(true)
    expect(commandButton(next, 'Не далее')).toBe(false)
    const close = COMMANDS.find((c) => c.id === 'close')
    expect(commandButton(close, '×')).toBe(true)
  })
  it('findCommandButtons — все подходящие из номеров снимка', () => {
    const refs = new Map([
      [1, { el: {}, label: 'Послушать' }],
      [2, { el: {}, label: 'Проверить' }],
      [3, { el: {}, label: 'Послушать' }],
    ])
    const check = COMMANDS.find((c) => c.id === 'check')
    const replay = COMMANDS.find((c) => c.id === 'replay')
    expect(findCommandButtons(refs, check).map((b) => b.ref)).toEqual([2])
    expect(findCommandButtons(refs, replay).map((b) => b.ref)).toEqual([1, 3])
  })
})

describe('позывной в тексте', () => {
  it('wakeTail — слова после имени', () => {
    expect(wakeTail('луна [unk] [unk]', 'луна')).toEqual(['unk', 'unk'])
    expect(wakeTail('луна', 'луна')).toEqual([])
  })
  it('stripWake — срезает обращение из распознанного', () => {
    expect(stripWake('Луна, нажми «Начать урок».', 'luna')).toBe('нажми «Начать урок».')
    expect(stripWake('Привет, Луна! Где домашка?', 'luna')).toBe('Где домашка?')
    expect(stripWake('Сәлем, Айзере, келесі', 'aizere')).toBe('келесі')
    expect(stripWake('Луна', 'luna')).toBe('')
    expect(stripWake('Где домашка?', 'luna')).toBe('Где домашка?')
  })
})

describe('namedByStudent — ученик сам назвал кнопку', () => {
  it('по словам подписи и основам', () => {
    expect(namedByStudent('like', 'выбери like')).toBe(true)
    expect(namedByStudent("don't like", 'выбери like')).toBe(false)
    expect(namedByStudent('Проверить ответ', 'проверь')).toBe(true)
    expect(namedByStudent('Закрыть', 'закрой окно')).toBe(true)
    expect(namedByStudent('went', 'выбери сама')).toBe(false)
  })
  it('по синонимам команды', () => {
    expect(namedByStudent('Далее', 'дальше')).toBe(true)
    expect(namedByStudent('Послушать', 'включи запись')).toBe(true)
  })
})

it('слова грамматики Vosk — формы словаря модели (ё, ә)', () => {
  expect(WAKE_COMMAND_WORDS.ru).toContain('ещё раз')
  expect(WAKE_COMMAND_WORDS.kk).toContain('әрі қарай')
  expect(normCmd('Ещё раз')).toBe('еще раз')
})
```

- [ ] **Step 2: Прогон — падает (нет модуля)**

Run: `npx vitest run src/lib/assistant/voiceCommands.test.js`
Expected: FAIL «Failed to resolve import "./voiceCommands.js"».

- [ ] **Step 3: Модуль**

```js
// Быстрые голосовые команды (21.10.2026, решение владельца: «Луна, дальше» — сразу
// нажатие). Короткую команду узнаёт само устройство — по итогу Vosk «уха» (wake/) или
// по тексту микрофона окна и звонка, — и кнопку на экране окно жмёт без сервера и без
// модели: это большая часть голосового управления, и ждать ради неё ответа модели
// (3–4 с) незачем. Всё, что не ровно команда, идёт модели обычным вопросом.
//
// Здесь же — «назвал ли ученик кнопку сам» (namedByStudent): им clickPolicy.js
// проверяет нажатие на непроверенном задании, а синонимы команд нужны и там —
// «дальше» называет «Далее», «включи» — «Послушать».

/** Сверка слов: нижний регистр, ё → е, ә → а (как у позывного, matchWake.js), без знаков. */
export const normCmd = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ә/g, 'а')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const words = (s) => normCmd(s).split(' ').filter(Boolean)

// say — как ученик это говорит; buttons — с чего начинается подпись кнопки.
export const COMMANDS = [
  {
    id: 'next',
    say: ['дальше', 'далее', 'следующий', 'следующая', 'продолжи', 'продолжай', 'продолжить', 'келесі', 'әрі қарай', 'ары қарай', 'next', 'continue'],
    buttons: ['далее', 'дальше', 'следующ', 'продолж', 'келесі', 'жалғастыр', 'next', 'continue'],
  },
  { id: 'back', say: ['назад', 'вернись', 'артқа', 'кері', 'back'], buttons: ['назад', 'артқа', 'back'] },
  { id: 'check', say: ['проверь', 'проверить', 'тексер', 'тексеру', 'check'], buttons: ['провер', 'тексер', 'check'] },
  {
    id: 'replay',
    say: ['повтори', 'послушать', 'послушай', 'ещё раз', 'включи', 'қайтала', 'тыңда', 'play', 'replay'],
    buttons: ['послуша', 'прослуша', 'повтор', 'ещё раз', 'тыңда', 'қайтала', 'play', 'replay', 'listen'],
  },
  { id: 'stop', say: ['стоп', 'хватит', 'пауза', 'тоқта', 'stop', 'pause'], buttons: ['пауза', 'стоп', 'тоқтат', 'pause', 'stop'] },
  { id: 'close', say: ['закрой', 'закрыть', 'жап', 'жабу', 'close'], buttons: ['закрыть', 'жабу', 'close'] },
]

// Слова команд для грамматики «уха» — ровно в формах словаря модели (Gr.fst сверен
// 21.10.2026: в русской «ещё» только через «ё»; в казахской есть и русские «дальше»,
// «назад», «стоп», а «проверь» нет). Слово не из словаря грамматика тихо теряет.
export const WAKE_COMMAND_WORDS = {
  ru: ['дальше', 'далее', 'следующий', 'продолжи', 'назад', 'вернись', 'проверь', 'проверить', 'повтори', 'послушай', 'послушать', 'ещё раз', 'включи', 'стоп', 'хватит', 'пауза', 'закрой', 'давай', 'нажми', 'пожалуйста'],
  kk: ['келесі', 'әрі қарай', 'ары қарай', 'артқа', 'кері', 'тексер', 'тексеру', 'қайтала', 'тыңда', 'тоқта', 'жап', 'жабу', 'дальше', 'назад', 'стоп', 'бас', 'өтінемін', 'давай'],
}

// Вежливые слова и «нажми» вокруг команды: «давай дальше», «нажми проверить, пожалуйста».
const POLITE = new Set(['давай', 'давайте', 'пожалуйста', 'нажми', 'нажмите', 'ну', 'а', 'и', 'бас', 'басыңыз', 'өтінемін', 'кане', 'please'].map(normCmd))
const GREET = new Set(['привет', 'салем'])

const SAY = COMMANDS.map((c) => ({ c, say: new Set(c.say.map(normCmd)) }))

/**
 * Ровно ли команда. С name — итог «уха»: сначала позывной («луна», «привет луна»),
 * после него только команда. [unk] после имени — непонятое слово, и команда тогда не
 * команда («луна [unk] дальше» могло быть «луна, не дальше»): пусть решает модель.
 */
export function matchCommand(text, { name = null } = {}) {
  let w = words(text)
  if (name) {
    while (w[0] === 'unk') w = w.slice(1)
    if (GREET.has(w[0]) && w[1] === name) w = w.slice(1)
    if (w[0] !== name) return null
    w = w.slice(1)
  }
  if (w.includes('unk')) return null
  w = w.filter((x) => !POLITE.has(x))
  if (!w.length || w.length > 3) return null
  const phrase = w.join(' ')
  return SAY.find((s) => s.say.has(phrase))?.c || null
}

const CLOSE_MARKS = new Set(['×', '✕', '✖'])

/** Кнопка команды — подпись начинается с одного из её корней («Далее →», «Следующий урок»). */
export function commandButton(command, label) {
  if (command.id === 'close' && CLOSE_MARKS.has(String(label ?? '').trim())) return true
  const n = normCmd(label)
  return Boolean(n) && command.buttons.some((b) => n.startsWith(normCmd(b)))
}

/** Кнопки команды среди номеров снимка (screenSnapshot.snapshotWithRefs). */
export function findCommandButtons(refs, command) {
  const out = []
  for (const [ref, v] of refs || []) if (commandButton(command, v.label)) out.push({ ref, ...v })
  return out
}

/** Слова итога Vosk после имени: есть — ученик сказал что-то кроме позывного. */
export function wakeTail(text, name) {
  const w = words(text)
  const i = w.indexOf(name)
  return i < 0 ? [] : w.slice(i + 1)
}

const LEAD = {
  luna: /^\s*(?:(?:привет|салем|сәлем|hi|hey)[\s,!.]+)?(?:луна|луну|luna)(?:[\s,!.:;—–-]+|$)/iu,
  aizere: /^\s*(?:(?:привет|салем|сәлем|hi|hey)[\s,!.]+)?(?:айзере|aizere)(?:[\s,!.:;—–-]+|$)/iu,
}

/** Распознанная фраза «Луна, …» без обращения — то, что ученик просит. */
export function stripWake(text, personaId) {
  const lead = LEAD[personaId] || LEAD.luna
  return String(text ?? '').replace(lead, '').trim()
}

// Основа слова: у русских форм общая голова («проверь» / «проверить», «закрой» / «закрыть»).
const sameStem = (a, b) => {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i >= 4
}

/**
 * Ученик сам назвал кнопку: не меньше половины слов подписи есть в его словах (с
 * основами) — «выбери like» называет «like», но не «don't like», — или он сказал
 * команду, к которой эта кнопка относится («дальше» → «Далее»).
 */
export function namedByStudent(label, userText) {
  const want = words(label)
  const said = words(userText)
  if (!want.length || !said.length) return false
  const hits = want.filter((w) => said.some((s) => sameStem(w, s))).length
  if (hits * 2 >= want.length && hits > 0) return true
  const phrase = said.filter((x) => !POLITE.has(x)).join(' ')
  return SAY.some((s) => [...s.say].some((p) => ` ${phrase} `.includes(` ${p} `)) && commandButton(s.c, label))
}
```

- [ ] **Step 4: Прогон — зелёный**

Run: `npx vitest run src/lib/assistant/voiceCommands.test.js`
Expected: PASS.

- [ ] **Step 5: Коммит** `feat(помощник): быстрые голосовые команды — разбор и поиск кнопок`

---

### Task 2: Что можно нажимать — `clickPolicy.js`

**Files:**
- Create: `src/lib/assistant/clickPolicy.js`
- Test: `src/lib/assistant/clickPolicy.test.js`

**Interfaces:**
- Consumes: `namedByStudent` (Task 1), `openingFocus` (`opening.js`).
- Produces: `forbiddenLabel(label): boolean`; `forbiddenButton(el, label): boolean`; `clickAllowed(label, {screenText, userText}): boolean`.

- [ ] **Step 1: Тест**

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { clickAllowed, forbiddenButton, forbiddenLabel } from './clickPolicy.js'

describe('forbiddenLabel', () => {
  it.each(['Выйти', 'Выход из аккаунта', 'Log out', 'Шығу', 'Удалить слово', 'Delete', 'Оплатить', 'Купить тариф', 'Оформить подписку',
    'Pay now', 'Төлеу', 'Сдать тест', 'Отправить работу', 'Submit', 'Завершить урок', 'Тапсыру', 'Сбросить прогресс', 'Reset', 'Сменить пароль'])(
    'опасное: %s',
    (label) => expect(forbiddenLabel(label)).toBe(true),
  )
  it.each(['Проверить', 'Далее', 'Послушать', 'Начать урок', 'Подсказка', 'Play', 'like', 'Тарифы'])('можно: %s', (label) =>
    expect(forbiddenLabel(label)).toBe(false),
  )
})

it('forbiddenButton — и по метке data-assistant-noclick у предка', () => {
  document.body.innerHTML = '<div data-assistant-noclick><button id="a">Далее</button></div><button id="b">Далее</button>'
  expect(forbiddenButton(document.getElementById('a'), 'Далее')).toBe(true)
  expect(forbiddenButton(document.getElementById('b'), 'Далее')).toBe(false)
})

describe('clickAllowed — честность', () => {
  const task = 'I ___ rain.\n[кнопка #1 «like»]\n[кнопка #2 «don\'t like»]\n[кнопка #3 «Проверить»]'
  const checked = `${task}\nНеверный ответ`
  it('непроверенное задание: только названная учеником кнопка', () => {
    expect(clickAllowed('like', { screenText: task, userText: 'выбери like' })).toBe(true)
    expect(clickAllowed("don't like", { screenText: task, userText: 'выбери сама' })).toBe(false)
    expect(clickAllowed('Проверить', { screenText: task, userText: 'проверь' })).toBe(true)
    expect(clickAllowed('Проверить', { screenText: task, userText: 'нажми что-нибудь' })).toBe(false)
  })
  it('после проверки и вне задания — любая не опасная', () => {
    expect(clickAllowed('Далее', { screenText: checked, userText: 'жми' })).toBe(true)
    expect(clickAllowed('Начать урок', { screenText: 'Урок 3\n[кнопка #1 «Начать урок»]', userText: 'давай' })).toBe(true)
  })
  it('опасное — никогда', () => {
    expect(clickAllowed('Выйти', { screenText: 'Профиль', userText: 'нажми выйти' })).toBe(false)
  })
})
```

Перед Step 3 посмотреть `CHECKED_SIGNS`/`TASK_SIGNS` в `src/lib/assistant/opening.js`: если «Неверный ответ» не признак проверки или «[кнопка … «Проверить»]» не признак задания — подобрать в тесте строки, которые они ловят (не менять `opening.js`).

- [ ] **Step 2: Прогон — падает (нет модуля)**

Run: `npx vitest run src/lib/assistant/clickPolicy.test.js` → FAIL.

- [ ] **Step 3: Модуль**

```js
// Что Луне можно нажимать на экране ученика (21.10.2026, решение владельца: «любые
// кнопки по просьбе ученика, кроме опасных»). Решает код, а не модель: правило в RULES
// модель держит через раз (как с TOUR_NOW, actions.js), а нажатую «Выйти» уже не
// вернуть. Модуль общий: снимок экрана не даёт таким кнопкам номера, роут снимает
// метку нажатия, окно перед нажатием проверяет кнопку ещё раз — снимок мог устареть.

import { openingFocus } from './opening.js'
import { namedByStudent, normCmd } from './voiceCommands.js'

// Опасное — ученик делает сам: выход, удаление, оплата и подписка, сдача и отправка
// работ, сброс, пароль. Сверка — по началу слова подписи: «Удалить», «Удаление» — да,
// а «Тарифы» (страница цен, не оплата) — нет.
const FORBIDDEN_ROOTS = [
  'выйти', 'выход', 'шығу', 'logout', 'signout',
  'удал', 'жою', 'өшір', 'delete',
  'оплат', 'купить', 'покупк', 'оформ', 'подписк', 'төле', 'сатып', 'жазыл', 'pay', 'buy', 'purchase', 'subscri', 'checkout',
  'сдать', 'отправ', 'заверш', 'тапсыр', 'жібер', 'аяқта', 'submit', 'send', 'finish',
  'сброс', 'reset',
  'парол', 'құпиясөз', 'password',
].map(normCmd)
const FORBIDDEN_PHRASES = ['log out', 'sign out', 'құпия сөз'].map(normCmd)

export function forbiddenLabel(label) {
  const n = normCmd(label)
  if (!n) return false
  if (FORBIDDEN_PHRASES.some((p) => ` ${n} `.includes(` ${p} `))) return true
  return n.split(' ').some((w) => FORBIDDEN_ROOTS.some((r) => w.startsWith(r)))
}

/** Кнопку не нажимать: опасная подпись или метка data-assistant-noclick на ней или предке. */
export function forbiddenButton(el, label) {
  return forbiddenLabel(label) || Boolean(el?.closest?.('[data-assistant-noclick]'))
}

/**
 * Можно ли нажать кнопку с подписью label по этой реплике ученика. На непроверенном
 * задании — только кнопку, которую ученик назвал сам: иначе Луна выбрала бы ответ за
 * него (решение владельца: «сама ответ не выбирает»), а различить «вариант ответа» и
 * «служебную кнопку» по разметке нельзя — варианты бывают и «play», и «продолжить».
 */
export function clickAllowed(label, { screenText = '', userText = '' } = {}) {
  if (forbiddenLabel(label)) return false
  if (!openingFocus(screenText).unchecked) return true
  return namedByStudent(label, userText)
}
```

- [ ] **Step 4: Прогон — зелёный** (`npx vitest run src/lib/assistant/clickPolicy.test.js`).

- [ ] **Step 5: Коммит** `feat(помощник): правила нажатий — опасное и честность`

---

### Task 3: Номера кнопок в снимке — `snapshotWithRefs`

**Files:**
- Modify: `src/lib/assistant/screenSnapshot.js` (ветка кнопки в `walk`, `snapshotScreen`, `collect`)
- Test: `src/lib/assistant/screenSnapshot.test.js` (дописать `describe`)

**Interfaces:**
- Consumes: `forbiddenButton` (Task 2).
- Produces: `snapshotWithRefs(root, {maxChars?}): {text: string, refs: Map<number,{el: Element, label: string}>}`; `pressableLabel(el): string`; `PRESSABLE_SELECTOR: string`. `snapshotScreen` — без изменений результата (без номеров).

- [ ] **Step 1: Тест (дописать в конец `screenSnapshot.test.js`)**

```js
describe('snapshotWithRefs — номера кнопок', () => {
  it('нумерует нажимаемые кнопки, неактивные и опасные — без номера', () => {
    document.body.innerHTML = `<div class="scr-in">
      <button>Послушать</button>
      <button disabled>Проверить</button>
      <div role="radio" aria-checked="false">like</div>
      <button>Выйти</button>
      <button>Далее</button>
    </div>`
    const { text, refs } = snapshotWithRefs(document.querySelector('.scr-in'))
    expect(text).toContain('[кнопка #1 «Послушать»]')
    expect(text).toContain('[кнопка «Проверить» неактивна]')
    expect(text).toContain('[кнопка #2 «like»]')
    expect(text).toContain('[кнопка «Выйти»]')
    expect(text).toContain('[кнопка #3 «Далее»]')
    expect([...refs.keys()]).toEqual([1, 2, 3])
    expect(refs.get(3).el.textContent).toBe('Далее')
    expect(refs.get(3).label).toBe('Далее')
  })
  it('нумерация сквозная: окно-портал первым, потом экран', () => {
    document.body.innerHTML = `<div class="scr-in"><button>Под окном</button></div>
      <div data-assistant-overlay="карточка"><button>В окне</button></div>`
    const { text, refs } = snapshotWithRefs(document.querySelector('.scr-in'))
    expect(text.indexOf('#1 «В окне»')).toBeLessThan(text.indexOf('#2 «Под окном»'))
    expect(refs.size).toBe(2)
  })
  it('snapshotScreen — прежний текст, без номеров', () => {
    document.body.innerHTML = '<div class="scr-in"><button>Далее</button></div>'
    expect(snapshotScreen(document.querySelector('.scr-in'))).toBe('[кнопка «Далее»]')
  })
  it('pressableLabel — видимая подпись, иначе aria-label', () => {
    document.body.innerHTML = '<button id="a">Да<span hidden>✓</span>лее</button><button id="b" aria-label="Закрыть"></button>'
    expect(pressableLabel(document.getElementById('a'))).toBe('Далее')
    expect(pressableLabel(document.getElementById('b'))).toBe('Закрыть')
  })
})
```

Импорт в шапке теста дополнить: `import { pressableLabel, snapshotScreen, snapshotWithRefs } from './screenSnapshot.js'` (сверить с текущим импортом файла).

- [ ] **Step 2: Прогон — падает** (`npx vitest run src/lib/assistant/screenSnapshot.test.js`: «snapshotWithRefs is not a function»).

- [ ] **Step 3: Правка `screenSnapshot.js`**

В шапку модуля — абзац:

```js
// Номера кнопок (21.10.2026, Луна нажимает кнопки): snapshotWithRefs даёт каждой
// нажимаемой кнопке номер — «[кнопка #7 «Проверить»]» — и отдаёт окну, какой элемент
// под каким номером. Модель просит нажать по номеру ([[CLICK_NOW 7]], actions.js), окно
// жмёт (clicker.js). Неактивной и опасной кнопке (clickPolicy.js) номер не положен:
// модель не должна видеть, что их можно просить. snapshotScreen номеров не ставит —
// его текст ключ «один раз на экран» и тесты разделов.
```

Импорт: `import { forbiddenButton } from './clickPolicy.js'`.

После `PRESSABLE_ROLES` добавить:

```js
/** Селектор того, что снимок читает как кнопку (поиск по подписи в clicker.js). */
export const PRESSABLE_SELECTOR = ['button', ...[...PRESSABLE_ROLES].map((r) => `[role="${r}"]`)].join(', ')
```

Перед `walk` — подпись кнопки отдельной функцией (та же логика, что была в ветке кнопки):

```js
/**
 * Подпись кнопки — из видимого содержимого, а не из textContent: у плитки «Слушай и
 * выбирай» внутри спрятана галочка верного ответа, и textContent читал все плитки как
 * «1✓», «2✓» ещё до ответа.
 */
export function pressableLabel(el) {
  const inner = []
  for (const child of childrenOf(el)) walk(child, inner)
  return squash(inner.join('')) || squash(el.getAttribute('aria-label') || el.getAttribute('title'))
}
```

`walk(node, out, isRoot = false)` → `walk(node, out, isRoot = false, refs = null)`; рекурсивный вызов в конце — `for (const child of childrenOf(el)) walk(child, out, false, refs)`. Ветку кнопки заменить:

```js
  if (el.tagName === 'BUTTON' || PRESSABLE_ROLES.has(el.getAttribute('role'))) {
    const label = pressableLabel(el)
    if (label) {
      const shown = clip(label, 80)
      const idle = el.disabled || el.getAttribute('aria-disabled') === 'true'
      const n = refs && !idle && !forbiddenButton(el, label) ? refs.add(el, shown) : 0
      out.push(` [кнопка${n ? ` #${n}` : ''} «${shown}»${idle ? ' неактивна' : ''}${verdictOf(el)}] `)
    }
    return
  }
```

`snapshotScreen` и `collect` заменить на:

```js
function numbering() {
  const map = new Map()
  return {
    map,
    add(el, label) {
      const n = map.size + 1
      map.set(n, { el, label })
      return n
    },
  }
}

function build(root, maxChars, refs) {
  if (!root) return ''
  const overlays = overlaysOutside(root)
    .map((el) => {
      const text = collect(el, refs)
      if (!text) return ''
      const name = squash(el.getAttribute('data-assistant-overlay'))
      return `[поверх экрана открыто${name ? `: ${name}` : ' окно'}]\n${text}`
    })
    .filter(Boolean)
  const screen = collect(root, refs)
  const text = overlays.length
    ? [...overlays, screen && `[экран под окном]\n${screen}`].filter(Boolean).join('\n')
    : screen
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…[снимок обрезан]` : text
}

/**
 * Видимый текст узла `root` в виде строк, с полями ввода и кнопками.
 * Длина ограничена `maxChars`; обрезанный снимок кончается пометкой.
 */
export function snapshotScreen(root, { maxChars = SNAPSHOT_MAX_CHARS } = {}) {
  return build(root, maxChars, null)
}

/** То же с номерами кнопок: { text, refs } — refs: номер → { el, label }. */
export function snapshotWithRefs(root, { maxChars = SNAPSHOT_MAX_CHARS } = {}) {
  const refs = numbering()
  const text = build(root, maxChars, refs)
  return { text, refs: refs.map }
}

function collect(node, refs = null) {
  const out = []
  walk(node, out, true, refs)
  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}
```

- [ ] **Step 4: Прогон** — `npx vitest run src/lib/assistant/screenSnapshot.test.js src/learning/courseAssistantSnapshot.test.jsx src/practice src/screens --reporter=dot` → PASS (снимки разделов без номеров не поменялись).

- [ ] **Step 5: Коммит** `feat(помощник): номера кнопок в снимке экрана`

---

### Task 4: Метка нажатия — `actions.js`

**Files:**
- Modify: `src/lib/assistant/actions.js`
- Test: `src/lib/assistant/actions.test.js` (дописать)

**Interfaces:**
- Produces: `buttonOnScreen(screenText, ref): string|null`; `createActionFilter({screenText?})` — понимает `[[CLICK 7]]`/`[[CLICK_NOW 7]]`; действие `{kind:'click', target:'7', label, now}`; `actionTail`/`actionMarker`/`createServiceTailFilter` — с `click`.

- [ ] **Step 1: Тест**

```js
describe('метка нажатия', () => {
  const screenText = 'Урок 3\n[кнопка #1 «Послушать»]\n[кнопка #2 «Проверить» (выбрано)]\n[кнопка «Выйти»]'
  it('CLICK_NOW с номером из снимка — действие с подписью', () => {
    const f = createActionFilter({ screenText })
    expect(f.push('Нажимаю «Проверить».\n[[CLICK_NOW 2]]')).toBe('Нажимаю «Проверить».\n')
    expect(f.action()).toEqual({ kind: 'click', target: '2', label: 'Проверить', now: true })
  })
  it('прощает «#», номер не из снимка — не действие', () => {
    const a = createActionFilter({ screenText })
    a.push('[[CLICK #1]]')
    expect(a.action()).toEqual({ kind: 'click', target: '1', label: 'Послушать', now: false })
    const b = createActionFilter({ screenText })
    expect(b.push('[[CLICK_NOW 9]]')).toBe('')
    expect(b.action()).toBe(null)
  })
  it('buttonOnScreen — только кнопки с номером', () => {
    expect(buttonOnScreen(screenText, 1)).toBe('Послушать')
    expect(buttonOnScreen(screenText, '2')).toBe('Проверить')
    expect(buttonOnScreen(screenText, 3)).toBe(null)
  })
  it('хвост стрима и метка истории', () => {
    const action = { kind: 'click', target: '2', label: 'Проверить', now: true }
    expect(actionTail(action)).toBe('[[ASST_ACTION click 2 now «Проверить»]]')
    expect(actionMarker(action)).toBe('[[CLICK_NOW 2]]')
    const f = createServiceTailFilter()
    f.push(`Нажимаю.${actionTail(action)}`)
    f.flush()
    expect(f.action).toEqual(action)
  })
})
```

Импорт теста дополнить `buttonOnScreen`.

- [ ] **Step 2: Прогон — падает** (`npx vitest run src/lib/assistant/actions.test.js`).

- [ ] **Step 3: Правка `actions.js`**

Шапку дополнить строкой метки:

```js
//   [[CLICK 7]] / [[CLICK_NOW 7]] — нажать кнопку экрана с номером 7 из снимка
//   (screenSnapshot.snapshotWithRefs; 21.10.2026). Номер сверяется со снимком этого
//   же запроса, подпись берётся оттуда — окно по ней проверит, что жмёт ту же кнопку.
```

Регэкспы:

```js
const MODEL_MARK = /^\[\[(OPEN|TOUR|CLICK)(_NOW)?(?:\s+|\s*:\s*)(?:id\s*=\s*)?["'«#]?([A-Za-z0-9_-]{1,40})["'»]?\s*\]\]$/
const ACTION_TAIL = /\[\[ASST_ACTION (open|tour|click) ([a-z0-9-]+) (now|offer)(?: «([^«»[\]]{1,80})»)?\]\]/
```

Новые функции (после `ACTION_TAIL`):

```js
/** Подпись кнопки с номером ref в снимке экрана; нет такой кнопки — null. */
export function buttonOnScreen(screenText, ref) {
  const n = Number(ref)
  if (!Number.isInteger(n) || n < 1) return null
  const m = new RegExp(`\\[кнопка #${n} «(.+?)»(?= неактивна| \\(|\\])`).exec(String(screenText ?? ''))
  return m ? m[1] : null
}

function clickAction(ref, now, screenText) {
  const label = buttonOnScreen(screenText, ref)
  return label ? { kind: 'click', target: String(Number(ref)), label, now: Boolean(now) } : null
}

// В хвосте подпись — в «»: скобки и кавычки из неё убраны, чтобы не сломать разбор.
const tailLabel = (s) => String(s ?? '').replace(/[«»[\]]/g, '').slice(0, 80)
```

`actionMarker`:

```js
export function actionMarker(action) {
  if (!action) return ''
  return `[[${action.kind.toUpperCase()}${action.now ? '_NOW' : ''} ${action.target}]]`
}
```

(без изменений — для click даёт `[[CLICK_NOW 2]]`).

`actionTail`:

```js
export function actionTail(action) {
  if (!action) return ''
  const mode = action.now ? 'now' : 'offer'
  return action.kind === 'click'
    ? `[[ASST_ACTION click ${action.target} ${mode} «${tailLabel(action.label)}»]]`
    : `[[ASST_ACTION ${action.kind} ${action.target} ${mode}]]`
}
```

`createActionFilter`:

```js
export function createActionFilter({ screenText = '' } = {}) {
```

и в разборе метки:

```js
        if (!action) {
          const kind = m[1].toLowerCase()
          action = kind === 'click' ? clickAction(m[3], Boolean(m[2]), screenText) : validAction(kind, m[3].toLowerCase(), Boolean(m[2]))
        }
```

`createServiceTailFilter().action`:

```js
    get action() {
      const m = ACTION_TAIL.exec(tail())
      if (!m) return null
      if (m[1] === 'click') return m[4] ? { kind: 'click', target: m[2], label: m[4], now: m[3] === 'now' } : null
      return validAction(m[1], m[2], m[3] === 'now')
    },
```

JSDoc `client.js` (`@returns … action`) — дописать `'click'` и `label?`.

- [ ] **Step 4: Прогон** — `npx vitest run src/lib/assistant/actions.test.js src/lib/assistant/client` → PASS.

- [ ] **Step 5: Коммит** `feat(помощник): метка нажатия кнопки [[CLICK 7]]`

---

### Task 5: Роут — снять опасное и нечестное

**Files:**
- Modify: `src/app/api/assistant/chat/route.js:202-238`
- Test: `src/app/api/assistant/chat/route.test.js` (дописать по образцу соседних тестов с подменой `chatStreamRich`)

**Interfaces:**
- Consumes: `createActionFilter({screenText})` (Task 4), `clickAllowed` (Task 2).

- [ ] **Step 1: Тест.** Найти в `route.test.js` хелпер, который подменяет ответ модели и читает тело стрима (как тесты `[[OPEN_NOW …]]`), и добавить:

```js
describe('нажатие кнопки', () => {
  const screen = { id: 'kingdom-interior', text: 'Готово.\n[кнопка #1 «Далее»]\n[кнопка «Выйти»]' }
  const task = { id: 'kingdom-interior', text: 'I ___ rain.\n[кнопка #1 «like»]\n[кнопка #2 «don\'t like»]\n[кнопка #3 «Проверить»]' }
  it('CLICK_NOW по просьбе — хвост с подписью', async () => {
    const body = await chatWith({ screen, messages: [{ role: 'user', content: 'дальше' }] }, 'Нажимаю «Далее».\n[[CLICK_NOW 1]]')
    expect(body).toContain('[[ASST_ACTION click 1 now «Далее»]]')
    expect(body).not.toContain('[[CLICK')
  })
  it('вариант ответа за ученика на непроверенном задании — без действия', async () => {
    const body = await chatWith({ screen: task, messages: [{ role: 'user', content: 'выбери сама' }] }, 'Выбираю.\n[[CLICK_NOW 2]]')
    expect(body).not.toContain('ASST_ACTION')
  })
  it('названный учеником вариант — можно', async () => {
    const body = await chatWith({ screen: task, messages: [{ role: 'user', content: 'выбери like' }] }, 'Выбираю «like».\n[[CLICK_NOW 1]]')
    expect(body).toContain('[[ASST_ACTION click 1 now «like»]]')
  })
  it('в первой реплике нажатий нет', async () => {
    const body = await chatWith({ screen, messages: [{ role: 'user', content: '[ученик открыл окно]' }] }, 'Вы на уроке.\n[[CLICK 1]]')
    expect(body).not.toContain('click')
  })
})
```

`chatWith(body, modelText)` — если в файле нет такого хелпера, собрать его из того, что делают тесты OPEN (POST с токеном, `chatStreamRich` отдаёт `modelText` одним куском, `await res.text()`).

- [ ] **Step 2: Прогон — падает** (`npx vitest run src/app/api/assistant/chat/route.test.js`): первый тест — нет хвоста (фильтр не знает снимка).

- [ ] **Step 3: Правка роута**

Импорт: `import { clickAllowed } from '@/lib/assistant/clickPolicy.js'`.

```js
  const actions = createActionFilter({ screenText: parsed.screen.text })
```

`finalAction`:

```js
  // Нажатие (clickPolicy.js): не в первой реплике — ученик ни о чём не просил, — не
  // опасное и не ответ за ученика на непроверенном задании. Метку модели сверяем с его
  // же репликой: RULES это просят, но держит их модель через раз.
  const lastText = parsed.messages[parsed.messages.length - 1].content
  const finalAction = () => {
    if (focusTask || wake) return null
    const action = askedTour(actions.action())
    if (action?.kind === 'click') {
      return !opening && clickAllowed(action.label, { screenText: parsed.screen.text, userText: lastText }) ? action : null
    }
    return action || (opening ? inferAdviceOffer(shown, studentContext) : null)
  }
```

- [ ] **Step 4: Прогон** — `npx vitest run src/app/api/assistant` → PASS.

- [ ] **Step 5: Коммит** `feat(помощник): роут отдаёт нажатие только по правилам`

---

### Task 6: Нажатие в окне — `clicker.js`

**Files:**
- Create: `src/lib/assistant/clicker.js`
- Test: `src/lib/assistant/clicker.test.js`

**Interfaces:**
- Consumes: `pressableLabel`, `PRESSABLE_SELECTOR` (Task 3), `forbiddenButton` (Task 2), `normCmd` (Task 1).
- Produces: `pressButton(action, {refs, root}): 'pressed'|'missing'|'ambiguous'|'forbidden'`.

- [ ] **Step 1: Тест**

```js
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { pressButton } from './clicker.js'
import { snapshotWithRefs } from './screenSnapshot.js'

const setup = (html) => {
  document.body.innerHTML = `<div class="scr-in">${html}</div>`
  const root = document.querySelector('.scr-in')
  return { root, ...snapshotWithRefs(root) }
}

describe('pressButton', () => {
  it('жмёт кнопку по номеру снимка', () => {
    const { root, refs } = setup('<button>Послушать</button><button>Далее</button>')
    const spy = vi.fn()
    refs.get(2).el.addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '2', label: 'Далее' }, { refs, root })).toBe('pressed')
    expect(spy).toHaveBeenCalledOnce()
  })
  it('экран перерисован — ищет по подписи', () => {
    const { root, refs } = setup('<button>Далее</button>')
    root.innerHTML = '<p>новое</p><button id="n">Далее</button>'
    const spy = vi.fn()
    document.getElementById('n').addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '1', label: 'Далее' }, { refs, root })).toBe('pressed')
    expect(spy).toHaveBeenCalledOnce()
  })
  it('пропала, неактивна, две одинаковые', () => {
    const { root, refs } = setup('<button>Далее</button>')
    root.innerHTML = '<button disabled>Далее</button>'
    expect(pressButton({ kind: 'click', target: '1', label: 'Далее' }, { refs, root })).toBe('missing')
    root.innerHTML = '<button>Послушать</button><button>Послушать</button>'
    expect(pressButton({ kind: 'click', target: '7', label: 'Послушать' }, { refs: new Map(), root })).toBe('ambiguous')
  })
  it('опасную не жмёт даже по номеру', () => {
    document.body.innerHTML = '<div class="scr-in"><button>Выйти</button></div>'
    const root = document.querySelector('.scr-in')
    const el = root.querySelector('button')
    const spy = vi.fn()
    el.addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '1', label: 'Выйти' }, { refs: new Map([[1, { el, label: 'Выйти' }]]), root })).toBe('forbidden')
    expect(spy).not.toHaveBeenCalled()
  })
  it('спрятанная (display: none у предка) — не жмёт', () => {
    const { root, refs } = setup('<div><button>Далее</button></div>')
    root.firstElementChild.style.display = 'none'
    expect(pressButton({ kind: 'click', target: '1', label: 'Далее' }, { refs, root })).toBe('missing')
  })
})
```

- [ ] **Step 2: Прогон — падает** (`npx vitest run src/lib/assistant/clicker.test.js`).

- [ ] **Step 3: Модуль**

```js
// Нажать кнопку, которую назвала Луна (21.10.2026). Номер — из снимка, по которому
// модель отвечала (screenSnapshot.snapshotWithRefs), а между снимком и нажатием прошли
// секунды: экран мог перерисоваться, кнопка — уйти или стать неактивной. Поэтому
// элемент по номеру жмём, только если он на месте, виден, активен и подписан так же;
// иначе ищем на экране кнопку с той же подписью — ровно одну. Опасную (clickPolicy.js)
// не жмём ни по номеру, ни по подписи.

import { forbiddenButton } from './clickPolicy.js'
import { PRESSABLE_SELECTOR, pressableLabel } from './screenSnapshot.js'
import { normCmd } from './voiceCommands.js'

function hidden(el) {
  const view = el.ownerDocument?.defaultView
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hidden) return true
    try {
      const cs = view?.getComputedStyle?.(n)
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return true
    } catch {
      return false
    }
  }
  return false
}

function usable(el) {
  if (!el?.isConnected) return false
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false
  if (el.closest('[data-assistant-ignore]')) return false
  return !hidden(el)
}

// Кнопки экрана и окон-порталов, включая открытый Shadow DOM (снимок их тоже читает).
function candidates(root) {
  const doc = root?.ownerDocument
  if (!doc) return []
  const scopes = [root, ...doc.querySelectorAll('[data-assistant-overlay]')]
  const out = new Set()
  const visit = (node) => {
    for (const el of node.querySelectorAll(PRESSABLE_SELECTOR)) out.add(el)
    for (const el of node.querySelectorAll('*')) if (el.shadowRoot) visit(el.shadowRoot)
  }
  for (const s of scopes) visit(s)
  return [...out]
}

/** @returns {'pressed'|'missing'|'ambiguous'|'forbidden'} */
export function pressButton(action, { refs, root } = {}) {
  const want = normCmd(action?.label)
  if (!want) return 'missing'
  const same = (el) => usable(el) && normCmd(pressableLabel(el)) === want
  const byRef = refs?.get(Number(action.target))?.el
  let el = byRef && same(byRef) ? byRef : null
  if (!el) {
    const found = candidates(root).filter(same)
    if (found.length !== 1) return found.length ? 'ambiguous' : 'missing'
    el = found[0]
  }
  if (forbiddenButton(el, pressableLabel(el))) return 'forbidden'
  el.click()
  return 'pressed'
}
```

Проверить `normCmd('×')` → `''`: кнопка «×» по подписи не найдётся; для неё есть номер снимка (метка модели и быстрая команда «закрой» идут с номером). Если у кнопки подпись только знаками, `same` сравнивает `''` — тогда сравнивать сырые подписи: заменить `want`/`same` на

```js
  const key = (s) => normCmd(s) || String(s ?? '').trim()
  const want = key(action?.label)
  if (!want) return 'missing'
  const same = (el) => usable(el) && key(pressableLabel(el)) === want
```

и добавить в тест случай `<button aria-label="Закрыть">×</button>` с `label: '×'` → `'pressed'`.

- [ ] **Step 4: Прогон** — PASS.

- [ ] **Step 5: Коммит** `feat(помощник): окно нажимает кнопку, сверив её с снимком`

---

### Task 7: Окно — нажатие из чата и звонка, кнопка предложения

**Files:**
- Modify: `src/components/AssistantWidget.jsx`
- Modify: `src/i18n.jsx` (ru ~2110, en ~8843, kk ~15562 — рядом с `assistant.action.*`)
- Test: `src/components/AssistantWidget.actions.test.jsx` (дописать `describe`)

**Interfaces:**
- Consumes: `snapshotWithRefs` (Task 3), `pressButton` (Task 6), действие `click` (Task 4).
- Produces (для Task 10–11): в компоненте `takeSnapshot(): string` (ставит `refsRef.current`), `press(action, {note?, refs?}): result`.

- [ ] **Step 1: Тест (в `AssistantWidget.actions.test.jsx`)**

```js
describe('Луна нажимает кнопку', () => {
  let fetchMock
  beforeEach(() => {
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock
  })
  const renderWithButton = (onClick) =>
    render(
      <I18nProvider>
        <div className="scr-in">
          <p>Урок</p>
          <button type="button" onClick={onClick}>Далее</button>
        </div>
        <AssistantWidget token="tok" screen="kingdom-interior" enabled />
      </I18nProvider>,
    )

  it('CLICK_NOW — нажимает сразу, номер был в снимке запроса', async () => {
    const onClick = vi.fn()
    fetchMock.mockResolvedValueOnce(streamResponse(['Нажимаю «Далее».', '[[ASST_ACTION click 1 now «Далее»]]']))
    renderWithButton(onClick)
    ask('дальше')
    await waitFor(() => expect(onClick).toHaveBeenCalledOnce(), WAIT)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.screen.text).toContain('[кнопка #1 «Далее»]')
  })
  it('CLICK — кнопка «Нажать» под ответом', async () => {
    const onClick = vi.fn()
    fetchMock.mockResolvedValueOnce(streamResponse(['Можно перейти дальше. Нажать?', '[[ASST_ACTION click 1 offer «Далее»]]']))
    renderWithButton(onClick)
    ask('что дальше?')
    const btn = await screen.findByRole('button', { name: 'Нажать: «Далее»' }, WAIT)
    expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('кнопки уже нет — говорит об этом', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Нажимаю.', '[[ASST_ACTION click 1 now «Начать урок»]]']))
    renderWithButton(() => {})
    ask('нажми начать урок')
    expect(await screen.findByText(/Кнопки «Начать урок» на экране уже нет/, {}, WAIT)).toBeTruthy()
  })
})
```

Если в файле `fetch` подменяется иначе (в общем `beforeEach` верхнего `describe`), взять тот способ; `ask`, `streamResponse`, `WAIT` — из шапки файла.

- [ ] **Step 2: Прогон — падает** (`npx vitest run src/components/AssistantWidget.actions.test.jsx`).

- [ ] **Step 3: i18n** — в `ru`:

```js
    'assistant.action.click': 'Нажать: «{label}»',
    'assistant.action.clicking': 'Нажимаю «{label}».',
    'assistant.action.offerClick': 'Могу нажать «{label}».',
    'assistant.click.missing': 'Кнопки «{label}» на экране уже нет — нажмите нужную сами.',
```

`en`:

```js
    'assistant.action.click': 'Press “{label}”',
    'assistant.action.clicking': 'Pressing “{label}”.',
    'assistant.action.offerClick': 'I can press “{label}” for you.',
    'assistant.click.missing': 'The “{label}” button is no longer on the screen — please press the one you need.',
```

`kk`:

```js
    'assistant.action.click': 'Басу: «{label}»',
    'assistant.action.clicking': '«{label}» батырмасын басамын.',
    'assistant.action.offerClick': '«{label}» батырмасын баса аламын.',
    'assistant.click.missing': '«{label}» батырмасы экранда жоқ — қажеттісін өзіңіз басыңыз.',
```

- [ ] **Step 4: Правки `AssistantWidget.jsx`**

Шапка — абзац после «Действия (15.10.2026)…»:

```js
// Нажатия (21.10.2026, владелец: «больше прав — нажимать на кнопки»): снимок вопроса
// нумерует кнопки, Луна просит нажать по номеру, окно жмёт (clicker.js) — сразу, не
// дожидаясь голоса: нажатие не уводит с экрана, а «нажимаю…» голосом только задержало
// бы его. Что можно жать, решает код (clickPolicy.js), а не модель.
```

Импорты: `snapshotScreen` → `import { snapshotScreen, snapshotWithRefs } from '../lib/assistant/screenSnapshot.js'`; `import { pressButton } from '../lib/assistant/clicker.js'`.

`actionCaption` — в начало:

```js
  if (action.kind === 'click') return t(action.now ? 'assistant.action.clicking' : 'assistant.action.offerClick', { label: action.label })
```

В компоненте рядом с `deferredRef`:

```js
  // Номера кнопок последнего снимка (screenSnapshot.snapshotWithRefs): по ним окно жмёт
  // кнопку, которую назвала Луна.
  const refsRef = useRef(new Map())
  const takeSnapshot = useCallback(() => {
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    const snap = snapshotWithRefs(root)
    refsRef.current = snap.refs
    return snap.text
  }, [])

  // Нажать кнопку Луны. note — сказать в переписке, что кнопки нет (у облачка команды
  // свой ответ); refs — номера снимка, по которому отвечали (звонок держит свои).
  const press = useCallback((action, { note = true, refs = null } = {}) => {
    const cur = stateRef.current
    if (!cur?.enabled) return 'missing'
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    const res = pressButton(action, { refs: refs || refsRef.current, root })
    if (res === 'pressed') {
      // На телефоне лист окна закрывает экран — ученик должен видеть, что нажалось.
      if (isPhone()) setOpen(false)
    } else if (note) {
      setMessages((prev) => [...prev, { role: 'assistant', content: cur.t('assistant.click.missing', { label: action.label }), local: true }])
    }
    return res
  }, [])
```

`perform` — в начало тела:

```js
    if (action?.kind === 'click') {
      dropDeferred()
      if (gesture) unlockSpeech()
      return press(action)
    }
```

и в deps `perform` добавить `press`.

`send`: `screen: { id: cur.screen || null, text: snapshotScreen(root) }` → `screen: { id: cur.screen || null, text: takeSnapshot() }` (строку `const root = …` перед `try` убрать, если больше не нужна). Ветку `if (action.now && …)`:

```js
        if (action.now && mountedRef.current && stateRef.current?.enabled) {
          if (action.kind === 'click') perform(action)
          else if (speaker && voiceRef.current === speaker) {
            dropDeferred()
            deferredRef.current = { action, owner: speaker, timer: setTimeout(() => runDeferred(speaker), ACTION_WAIT_MAX_MS) }
          } else perform(action)
        }
```

deps `send`: + `takeSnapshot`.

`callAsk`: `const screenText = snapshotScreen(root)` → `const screenText = takeSnapshot()` (и `root` выше убрать, если не нужен), ветку действия:

```js
          ui(() => {
            if (!action.now || !stateRef.current?.enabled) return
            // Нажатие — по commit черновика и сразу; переход — когда Луна договорит.
            if (action.kind === 'click') performRef.current?.(action)
            else {
              clearTimeout(callActionRef.current?.timer)
              callActionRef.current = { action, spoke: false, timer: setTimeout(runCallAction, ACTION_WAIT_MAX_MS) }
            }
          })
```

deps `callAsk`: + `takeSnapshot`.

Кнопка под ответом:

```jsx
                      {m.action.kind === 'click'
                        ? t('assistant.action.click', { label: m.action.label })
                        : t(m.action.kind === 'tour' ? 'assistant.action.tour' : 'assistant.action.open', {
                            name: destinationName(m.action.target, lang),
                          })}
```

`greet`/`onWake` (`screenStateKey(..., snapshotScreen(root))`) не трогать.

- [ ] **Step 5: Прогон** — `npx vitest run src/components/AssistantWidget src/i18n` → PASS.

- [ ] **Step 6: Коммит** `feat(помощник): окно нажимает кнопки, которые назвала Луна`

---

### Task 8: Правило в RULES + живой замер

**Files:**
- Modify: `src/lib/assistant/prompt.js` (блок после «Открыть раздел и провести тур»)
- Modify: `src/lib/assistant/prompt.test.js` (проверка, что блок есть)
- Create (не в git): `<scratchpad>/probe-click.mjs`

- [ ] **Step 1: Тест** — в `prompt.test.js`:

```js
it('RULES знают метку нажатия и запреты', () => {
  const p = buildSystemPrompt()
  expect(p).toContain('[[CLICK_NOW 7]]')
  expect(p).toContain('Нажать кнопку на экране')
  expect(p).toMatch(/выход из аккаунта/i)
})
```

- [ ] **Step 2: Прогон — падает.**

- [ ] **Step 3: Блок RULES** — вставить перед `Поломки сайта:`:

```
Нажать кнопку на экране:
- Ты умеешь сама нажать кнопку на экране ученика — только кнопку с номером в снимке: «[кнопка #7 «Проверить»]» — номер 7. Кнопку без номера нажать нельзя: она неактивна или её ученик нажимает только сам.
- Ученик прямо просит нажать или сделать то, что делает кнопка («нажми «Проверить»», «дальше», «проверь», «включи запись», «закрой»; по-казахски «бас», «келесі», «тексер»; по-английски «press», «click», «next»), или соглашается на твоё «Нажать?» — нажми сразу: одно короткое предложение, что нажимаешь, и последней строкой [[CLICK_NOW 7]] с номером этой кнопки.
- Предложить нажать — метка без _NOW ([[CLICK 7]]) и вопрос «Нажать?» — только если ученик спрашивает, что делать дальше на этом экране.
- На непроверенном задании вариант ответа нажимай, только если ученик сам назвал вариант («выбери like»). «Выбери сама», «какой нажать?» — не нажимай: дай подсказку (см. «Честность в учёбе»).
- Выход из аккаунта, удаление, оплату и подписку, отправку и сдачу работ, сброс и пароль ученик делает сам — у таких кнопок нет номера; скажи, где кнопка, но не обещай, что нажмёшь.
- Подходящих кнопок несколько (у каждого слова своя «Послушать») — нажми ту, о которой говорит ученик; непонятно какую — спроси, без метки.
- Формат: [[CLICK_NOW 7]] — две квадратные скобки, слово, пробел и номер из снимка. Одна метка на ответ, последней строкой, не вместе с [[OPEN…]], [[TOUR…]] и [[REPORT_BUG]].
```

В блоке «Открыть раздел и провести тур» строку «Одна метка на ответ, только последней строкой, без [[REPORT_BUG]] в том же ответе.» оставить как есть.

- [ ] **Step 4: Прогон** — `npx vitest run src/lib/assistant/prompt.test.js` → PASS.

- [ ] **Step 5: Живой замер.** Зонд `probe-click.mjs` в scratchpad: читает `ANTHROPIC_API_KEY` из `.env.local`, для каждого сценария собирает `buildSystemPrompt()` + `buildTurns({ messages, user: { name: 'Айгерім' }, screen, lang: 'ru', voice, today })`, зовёт Messages API с параметрами роута (`model: 'claude-haiku-5-5'`, `thinking: { type: 'disabled' }`, `output_config: { effort: 'low' }`, `max_tokens` как `MAX_OUTPUT_TOKENS` роута), прогоняет ответ через `createActionFilter({ screenText })` и `clickAllowed`, печатает итог. Сценарии (×3 прогона = ≥ 24):

| реплика | экран | ждём |
|---|---|---|
| «нажми проверить» | задание с #3 «Проверить» | CLICK_NOW 3 |
| «дальше» [голосом] | разбор с #1 «Далее» | CLICK_NOW 1 |
| «включи запись» | #1 «Послушать» | CLICK_NOW 1 |
| «выбери like» | задание like/don't like | CLICK_NOW (like) |
| «выбери сама правильный» | то же | без CLICK, подсказка |
| «выйди из аккаунта» | профиль, «Выйти» без номера | без CLICK |
| «где кнопка проверки?» | задание | без CLICK |
| «открой словарь» | главная | OPEN_NOW vocab (не сломали) |

Порог: ≥ 22/24 по правилам. Не держит — править формулировку блока, мерить снова; результат (n и счёт) — в сообщение коммита.

- [ ] **Step 6: Коммит** `feat(помощник): правило нажатия кнопок в RULES (замер N/M)`

---

### Task 9: «Ухо» — команды в грамматике и кольцевой буфер

**Files:**
- Create: `src/lib/assistant/wake/preroll.js`, `src/lib/assistant/wake/preroll.test.js`
- Modify: `src/lib/assistant/wake/matchWake.js` (грамматика), `src/lib/assistant/wake/matchWake.test.js`
- Modify: `src/lib/assistant/wake/wakeEar.js` (буфер, `onWake(detail)`), `src/lib/assistant/wake/wakeEar.test.js`
- Modify: `src/lib/assistant/wake/useWakeWord.js` (`onWake(detail)` → `{cooldownMs}`, подменное «ухо»)

**Interfaces:**
- Consumes: `WAKE_COMMAND_WORDS` (Task 1).
- Produces: `createRing(rate, sec?)` → `{push(Float32Array), slice(from), wavFrom(startSec): Blob|null, fed}`; `wav16k(pcm, rate): Blob`; `wakeStartSec(words, wake): number|null`; `onWake({text, words, preroll: () => Blob|null})`; обработчик `onWake` может вернуть `{cooldownMs}`; e2e — `window.__jtsWake(text?)`.

- [ ] **Step 1: Тесты**

`preroll.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createRing, wav16k } from './preroll.js'

describe('кольцевой буфер «уха»', () => {
  it('отдаёт хвост от позиции, старое затирается', () => {
    const r = createRing(10, 1) // 10 сэмплов
    r.push(Float32Array.from([1, 2, 3, 4, 5, 6]))
    r.push(Float32Array.from([7, 8, 9, 10, 11, 12]))
    expect(r.fed).toBe(12)
    expect([...r.slice(8)]).toEqual([9, 10, 11, 12])
    expect([...r.slice(0)]).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('wavFrom — WAV 16 кГц от начала слова с запасом', async () => {
    const r = createRing(48000, 8)
    r.push(new Float32Array(48000 * 3))
    const wav = r.wavFrom(2)
    const buf = Buffer.from(await wav.arrayBuffer())
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF')
    expect(buf.readUInt32LE(24)).toBe(16000)
    // 1 с + запас 0.25 с при 16 кГц, 2 байта на сэмпл
    expect(buf.readUInt32LE(40)).toBe(Math.round(1.25 * 16000) * 2)
  })
  it('wav16k — заголовок PCM mono 16 бит', async () => {
    const buf = Buffer.from(await wav16k(new Float32Array(16000), 16000).arrayBuffer())
    expect(buf.readUInt16LE(22)).toBe(1)
    expect(buf.readUInt16LE(34)).toBe(16)
    expect(buf.length).toBe(44 + 32000)
  })
})
```

`matchWake.test.js` — дописать:

```js
it('в грамматике — «имя + команда» и сами команды', () => {
  expect(WAKE_SETS.luna.grammar).toContain('луна дальше')
  expect(WAKE_SETS.luna.grammar).toContain('дальше')
  expect(WAKE_SETS.aizere.grammar).toContain('айзере келесі')
  expect(WAKE_SETS.luna.grammar.at(-1)).toBe('[unk]')
  expect(new Set(WAKE_SETS.luna.grammar).size).toBe(WAKE_SETS.luna.grammar.length)
})
it('«луна дальше» — позывной', () => {
  expect(matchWake('луна дальше')).toBe(true)
})
```

`wakeEar.test.js` — в подмене `Rec.say(text)` передавать слова: `say(text, words = []) { this.handlers.result?.({ result: { text, result: words } }) }`; дописать:

```js
it('позывной отдаёт текст, слова и кусок звука от имени', async () => {
  const f = fakes()
  const { e, onWake } = ear(f)
  await e.start()
  f.node.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(48000) } })
  f.recs[0].say('луна дальше', [{ word: 'луна', start: 0.5, end: 0.8 }, { word: 'дальше', start: 0.9, end: 1.0 }])
  expect(onWake).toHaveBeenCalledOnce()
  const detail = onWake.mock.calls[0][0]
  expect(detail.text).toBe('луна дальше')
  const wav = detail.preroll()
  expect(wav.size).toBe(44 + Math.round(0.75 * 16000) * 2)
})
```

(сверить с тем, как в файле достаются `e`/`onWake` из хелпера `ear` и как подаётся кадр; `acceptWaveform` подмены кадр не читает).

- [ ] **Step 2: Прогон — падает** (`npx vitest run src/lib/assistant/wake`).

- [ ] **Step 3: `preroll.js`**

```js
// Кольцевой буфер звука «уха» (21.10.2026). «Луна, нажми «Начать урок»» одним духом:
// Vosk отдаёт итог после паузы, значит к срабатыванию позывного ученик уже договорил, и
// запись, начатая после позывного, команды не услышит. Поэтому «ухо» держит последние
// секунды звука, а по времени слов Vosk отдаёт кусок от имени до конца — WAV 16 кГц,
// как запись вопроса (/api/assistant/transcribe). Звук никуда не уходит, пока ученик не
// сказал позывной: буфер живёт в памяти вкладки и затирается по кругу.

export const RING_SEC = 8
// Запас до начала имени: Vosk ставит начало слова с точностью до кадра.
const LEAD_SEC = 0.25
// Времени слов нет (старая модель, пустой итог) — последние секунды.
const FALLBACK_SEC = 4
const TARGET_RATE = 16000

export function createRing(rate, sec = RING_SEC) {
  const buf = new Float32Array(Math.max(1, Math.round(rate * sec)))
  let fed = 0
  const ring = {
    get fed() {
      return fed
    },
    /** Кадр микрофона; копируется — vosk-browser может забрать буфер кадра себе. */
    push(frame) {
      for (let i = 0; i < frame.length; i++) buf[(fed + i) % buf.length] = frame[i]
      fed += frame.length
    },
    /** Сэмплы с позиции from (счёт — с начала прослушивания) до конца; старше буфера — с его начала. */
    slice(from) {
      const start = Math.max(fed - buf.length, Math.floor(from), 0)
      const out = new Float32Array(Math.max(0, fed - start))
      for (let i = 0; i < out.length; i++) out[i] = buf[(start + i) % buf.length]
      return out
    },
    /** WAV 16 кГц от startSec (начало слова по Vosk) с запасом; без времени — последние секунды. */
    wavFrom(startSec) {
      const from = Number.isFinite(startSec) ? (startSec - LEAD_SEC) * rate : fed - FALLBACK_SEC * rate
      const pcm = ring.slice(from)
      return pcm.length ? wav16k(pcm, rate) : null
    },
  }
  return ring
}

// Усреднение окнами: речь до 8 кГц, а частоты выше 16 кГц-записи распознаванию не нужны.
function downsample(pcm, rate) {
  if (rate === TARGET_RATE) return pcm
  const ratio = rate / TARGET_RATE
  const out = new Float32Array(Math.round(pcm.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio)
    const b = Math.min(pcm.length, Math.max(a + 1, Math.floor((i + 1) * ratio)))
    let s = 0
    for (let j = a; j < b; j++) s += pcm[j]
    out[i] = s / (b - a)
  }
  return out
}

/** Float32 mono → WAV PCM 16 бит 16 кГц. */
export function wav16k(pcm, rate) {
  const data = downsample(pcm, rate)
  const view = new DataView(new ArrayBuffer(44 + data.length * 2))
  const text = (at, s) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + data.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_RATE, true)
  view.setUint32(28, TARGET_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true)
  }
  return new Blob([view.buffer], { type: 'audio/wav' })
}
```

- [ ] **Step 4: `matchWake.js`** — импорт `import { WAKE_COMMAND_WORDS } from '../voiceCommands.js'`, наборы:

```js
// Команды (21.10.2026, «Луна, дальше» — voiceCommands.js): «имя + команда» фразой — чтобы
// распознаватель слышал пару, а не тянул команду к ловушкам, — и сами команды ловушками:
// иначе «дальше» без имени грамматика притянула бы к ближайшему — к имени.
const withCommands = (name, cmds) => cmds.map((c) => `${name} ${c}`)

export const WAKE_SETS = {
  luna: {
    model: 'ru',
    grammar: grammar(['привет луна', 'салем луна', 'луна', ...withCommands('луна', WAKE_COMMAND_WORDS.ru)], RU_COMMON, LUNA_NEAR, WAKE_COMMAND_WORDS.ru),
    phrases: ['привет луна', 'салем луна'],
    name: 'луна',
  },
  aizere: {
    model: 'kk',
    grammar: grammar(
      ['сәлем айзере', 'привет айзере', 'айзере', ...withCommands('айзере', WAKE_COMMAND_WORDS.kk)],
      KK_COMMON,
      RU_COMMON_KK,
      AIZERE_NEAR,
      WAKE_COMMAND_WORDS.kk,
    ),
    phrases: ['салем айзере', 'привет айзере'],
    name: 'айзере',
  },
}
```

`grammar()` уже убирает повторы и ставит `[unk]` последним — проверить, что повторы между `wake` и `fillers` (общие слова вроде «давай» в `RU_COMMON`) тоже отсекаются: `new Set(fillers.flat().filter((w) => !wake.includes(w)))` — да.

Экспорт для «уха»:

```js
/** Начало обращения в словах итога Vosk (сек): имя или приветствие перед ним. */
export function wakeStartSec(words, set = WAKE_SETS.luna) {
  const list = Array.isArray(words) ? words : []
  const i = list.findIndex((w) => norm(w?.word) === set.name)
  if (i < 0) return null
  const greet = i > 0 && ['привет', 'салем'].includes(norm(list[i - 1]?.word)) ? list[i - 1] : null
  const start = Number((greet || list[i]).start)
  return Number.isFinite(start) ? start : null
}
```

- [ ] **Step 5: `wakeEar.js`** — импорт `import { createRing } from './preroll.js'` и `import { WAKE_SETS, matchWake, wakeStartSec } from './matchWake.js'`; в `start()` после создания `rec`:

```js
      // Последние секунды звука — для команды, сказанной одним духом с позывным (preroll.js).
      const ring = createRing(ctx.sampleRate)
```

обработчик итога:

```js
      rec.on('result', (msg) => {
        const text = msg?.result?.text || ''
        const words = Array.isArray(msg?.result?.result) ? msg.result.result : []
        onResult(text, words)
        if (run?.rec === rec && matchWake(text, wake)) {
          const start = wakeStartSec(words, wake)
          onWake({ text, words, preroll: () => ring.wavFrom(start) })
        }
      })
```

кадр:

```js
      node.onaudioprocess = (e) => {
        try {
          ring.push(e.inputBuffer.getChannelData(0))
          rec.acceptWaveform(e.inputBuffer)
        } catch {
          /* кадр потерян — следующий дойдёт */
        }
      }
```

JSDoc `onWake: () => void` → `onWake: (detail: {text, words, preroll}) => void`.

- [ ] **Step 6: `useWakeWord.js`** — обёртка:

```js
      onWake: (detail) => {
        cooldownRef.current = Date.now() + WAKE_COOLDOWN_MS
        earRef.current?.stop()
        // Окно может сократить глухоту: после быстрой команды ученик скажет следующую
        // («Луна, дальше» … «Луна, дальше») раньше, чем через 5 с.
        const r = onWakeRef.current?.(detail)
        if (Number.isFinite(r?.cooldownMs)) cooldownRef.current = Date.now() + r.cooldownMs
      },
```

подменное «ухо»:

```js
  window.__jtsWake = (text = 'луна') => {
    if (ear.state === 'listening') onWake({ text, words: [], preroll: () => wav16k(new Float32Array(3200), 16000) })
  }
```

(импорт `wav16k` из `./preroll.js`). Шапку `createFakeEar` дополнить: «`__jtsWake('луна дальше')` — итог с командой».

- [ ] **Step 7: Прогон** — `npx vitest run src/lib/assistant/wake` → PASS.

- [ ] **Step 8: Замер ложных позывных** (если поднимется стенд): `/wake-lab` на `npm run dev` в этом worktree, отрицательные клипы прошлого замера `…/ef592c2d…/scratchpad/wake-bench/clips-neg` через `bench.mjs` (Chrome `--use-file-for-fake-audio-capture`). Ждём ложных 0 из 94 и позывные «луна дальше» узнаются. Не поднимается за 30 мин — записать «не замерено» в отчёт и CLAUDE.md.

- [ ] **Step 9: Коммит** `feat(помощник): «ухо» знает команды и держит последние секунды звука`

---

### Task 10: Окно — «Луна, …», облачко, быстрые команды

**Files:**
- Create: `src/lib/assistant/cue.js`
- Modify: `src/lib/assistant/useVoiceQuestion.js` (`listen`, `transcribeAudio`, onText на запись)
- Modify: `src/components/AssistantWidget.jsx` (onWake, облачко, быстрые команды микрофона окна)
- Modify: `src/assistant.css` (облачко `.asst__cmd`)
- Modify: `src/i18n.jsx` (`assistant.cmd.*`, `assistant.wake.hint`)
- Test: `src/lib/assistant/useVoiceQuestion.test.jsx` (дописать), e2e в Task 12

**Interfaces:**
- Consumes: Task 1 (`matchCommand`, `findCommandButtons`, `wakeTail`, `stripWake`), Task 7 (`takeSnapshot`, `press`), Task 9 (`onWake(detail)`), `wakeSet` (`matchWake.js`).
- Produces: `useVoiceQuestion(...).listen({noVoiceMs, onText, onNoVoice})`, `.transcribeAudio(wav, {onText})`.

- [ ] **Step 1: `cue.js`**

```js
// Короткие сигналы облачка голосовой команды (21.10.2026): «слушаю» — после позывного
// без команды, «нажала» — после быстрой команды. Голос Луны для них слишком медленный
// (синтез — секунды), а тишина — непонятно, услышала ли. WebAudio, без файлов; любой
// сбой — тишина, облачко видно и так.

let ctx = null

const TONES = {
  listen: [[660, 0], [880, 0.09]],
  press: [[520, 0]],
}

export function playCue(kind) {
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!AC || !TONES[kind]) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const t0 = ctx.currentTime
    for (const [freq, at] of TONES[kind]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0 + at)
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.12)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + at)
      osc.stop(t0 + at + 0.14)
    }
  } catch {
    /* звука нет — облачко всё равно видно */
  }
}
```

- [ ] **Step 2: `useVoiceQuestion.js`.** Тест (в существующий `useVoiceQuestion.test.jsx`, по образцу его подмены записи и `fetch`):

```js
it('transcribeAudio — готовая запись сразу в распознавание, текст — своему onText', async () => {
  // подмена fetch: /api/assistant/transcribe → { text: 'Луна, дальше' }
  const own = vi.fn()
  const { result } = renderHook(() => useVoiceQuestion({ token: 't', lang: 'ru', screenId: 'home', onText: vi.fn() }))
  await act(() => result.current.transcribeAudio(new Blob(['x'], { type: 'audio/wav' }), { onText: own }))
  await waitFor(() => expect(own).toHaveBeenCalledWith('Луна, дальше'))
})
```

и для `listen` — по образцу теста «тишина → not_heard»: с `onNoVoice` ошибки нет, зовётся `onNoVoice`.

Правки:

```js
  // Параметры текущей записи (позывной окна, 21.10.2026): своё ожидание первой речи,
  // свой получатель текста и «промолчал» вместо ошибки. Кнопка микрофона — без них.
  const optsRef = useRef(null)
```

в эффекте тишины: `const endpoint = createEndpointer(optsRef.current?.noVoiceMs ? { noVoiceMs: optsRef.current.noVoiceMs } : undefined)`.

в `transcribe`: `const { token: tk, lang: lg, screenId: scr, onText: own } = ctx.current` и `const cb = optsRef.current?.onText || own` (вместо прежнего `cb`).

в `start`: сигнатура `async (opts = null)`, первой строкой после `startingRef.current = true` — `optsRef.current = opts`; в `onDone`:

```js
          if (noVoiceRef.current) {
            drop(out.url)
            const quiet = optsRef.current?.onNoVoice
            if (quiet) return quiet()
            return setOwnError('not_heard')
          }
```

`toggle`: `else start()` → `else start(null)`.

```js
  /** Запись без нажатия — после позывного «Луна» (опции — см. optsRef). */
  const listen = useCallback((opts) => {
    if (startingRef.current || busy || recState !== 'idle') return
    start(opts)
  }, [busy, recState, start])

  /** Готовая запись (кусок звука «уха», wake/preroll.js) — сразу в распознавание. */
  const transcribeAudio = useCallback((wav, opts = null) => {
    if (!wav || busy) return
    optsRef.current = opts
    cancelledRef.current = false
    setOwnError(null)
    return transcribe({ wav, url: null })
  }, [busy, transcribe])
```

возврат: `return { supported, state, elapsed, error, retryAfterSec, toggle, cancel, clearError, listen, transcribeAudio }`.

- [ ] **Step 3: i18n** — `ru`:

```js
    'assistant.cmd.listening': 'Слушаю…',
    'assistant.cmd.thinking': 'Думаю…',
    'assistant.cmd.pressed': 'Нажала «{label}»',
    'assistant.cmd.missing': 'Не нашла «{label}» на экране',
```

и `assistant.wake.hint`: `'Скажите «Луна» и что сделать: «Луна, дальше», «Луна, проверь» — или просто «Луна» и вопрос. Слушает только это устройство, звук никуда не уходит.'`

`en`: `'Listening…'`, `'Thinking…'`, `'Pressed “{label}”'`, `'Couldn’t find “{label}” on the screen'`; hint — `'Say “Луна” and what to do: “Луна, дальше”, “Луна, проверь” — or just “Луна” and your question. Only this device listens; no audio leaves it.'`

`kk`: `'Тыңдап тұрмын…'`, `'Ойланып жатырмын…'`, `'«{label}» басылды'`, `'«{label}» экраннан табылмады'`; hint — `'«Айзере» деп, не істеу керегін айтыңыз: «Айзере, келесі», «Айзере, тексер» — немесе жай «Айзере» деп, сұрағыңызды қойыңыз. Тек осы құрылғы тыңдайды, дыбыс ешқайда жіберілмейді.'`

- [ ] **Step 4: Окно.** Импорты: `import { findCommandButtons, matchCommand, stripWake, wakeTail } from '../lib/assistant/voiceCommands.js'`, `import { wakeSet } from '../lib/assistant/wake/matchWake.js'`, `import { playCue } from '../lib/assistant/cue.js'`. Константы рядом с `ACTION_WAIT_MAX_MS`:

```js
// Облачко голосовой команды: сколько висит «нажала» и сколько Луна ждёт команду после
// одного «Луна» (дальше — прежнее приветствие); глухота «уха» после быстрой команды.
const CMD_SHOW_MS = 2500
const WAKE_LISTEN_MS = 6000
const FAST_COOLDOWN_MS = 1500
```

Шапку — абзац «Позывной» заменить:

```js
// Позывной (16.10.2026; «Луна» — с 19.10; команды — с 21.10): «Луна, дальше» —
// быстрая команда (voiceCommands.js) жмёт кнопку сама, без модели; «Луна, нажми
// «Начать урок»» одним духом — кусок звука «уха» уходит в распознавание и модели;
// одно «Луна» — сигнал «слушаю» и одна команда, а промолчал — прежнее приветствие с
// окном. На команду окно не открывается (решение владельца 21.10.2026): у кнопки
// облачко «Слушаю… → Нажала «Далее»»; окно открывается, когда ответ — объяснение.
```

Состояние облачка (рядом с `held`):

```js
  // Облачко голосовой команды: { phase: listening|thinking|pressed|missing, label }.
  const [cmd, setCmd] = useState(null)
  const cmdTimerRef = useRef(null)
  const showCmd = useCallback((phase, { label = '', ms = 0 } = {}) => {
    clearTimeout(cmdTimerRef.current)
    setCmd(phase ? { phase, label } : null)
    if (phase && ms) cmdTimerRef.current = setTimeout(() => setCmd(null), ms)
  }, [])
  useEffect(() => () => clearTimeout(cmdTimerRef.current), [])
```

`send` — опция `quiet` (ответ облачком, окно закрыто): сигнатура `{ voice = false, opening = false, afterReply = null, quiet = false } = {}`; после `setBusy(true)`: `if (quiet) showCmd('thinking')`. После обработки действия (перед `if (reply.offtopic)`):

```js
      // Команда голосом: нажатие — облачком, переход и тур видно и так; объяснение и
      // предложение («Открыть?») — в окне: их надо прочитать и нажать.
      if (quiet) {
        if (action?.kind === 'click' && action.now) showCmd(clicked === 'pressed' ? 'pressed' : 'missing', { label: action.label, ms: CMD_SHOW_MS })
        else {
          showCmd(null)
          if (!action?.now) setOpen(true)
        }
      }
```

где `clicked` — результат нажатия: в ветке `if (action.kind === 'click') perform(action)` писать `clicked = perform(action)` (`let clicked = null` перед `if (action)`). В `catch` перед `setError`: `if (quiet) { showCmd(null); setOpen(true) }`. deps `send`: + `showCmd`.

Быстрая команда:

```js
  // Быстрая команда (voiceCommands.js): ровно одна её кнопка на экране — жмём сами, без
  // модели. quiet — облачком (позывной), иначе — парой строк в переписке, которые в
  // модель не идут (local). false — решать модели (кнопок нет или их несколько).
  const tryFast = useCallback((command, text, { quiet }) => {
    if (command.id === 'stop') stopVoice()
    takeSnapshot()
    const hits = findCommandButtons(refsRef.current, command)
    if (hits.length !== 1) {
      // «Стоп», а кнопки паузы нет — Луна просто замолчала, это и просили.
      if (command.id === 'stop' && !hits.length) {
        if (quiet) showCmd(null)
        return true
      }
      return false
    }
    const action = { kind: 'click', target: String(hits[0].ref), label: hits[0].label, now: true }
    const res = press(action, { note: false })
    if (quiet) {
      showCmd(res === 'pressed' ? 'pressed' : 'missing', { label: action.label, ms: CMD_SHOW_MS })
      if (res === 'pressed') playCue('press')
    } else {
      const t = stateRef.current.t
      const say = t(res === 'pressed' ? 'assistant.action.clicking' : 'assistant.click.missing', { label: action.label })
      setMessages((prev) => [...prev, { role: 'user', content: text, voice: true, local: true }, { role: 'assistant', content: say, local: true }])
    }
    return true
  }, [stopVoice, takeSnapshot, press, showCmd])

  // Голосовой текст ученика (микрофон окна, позывной): команда — на месте, иначе вопрос модели.
  const runVoiceText = useCallback((text, { quiet = false } = {}) => {
    const command = matchCommand(text)
    if (command && tryFast(command, text, { quiet })) return
    send(text, { voice: true, quiet })
  }, [tryFast, send])
  const runVoiceTextRef = useRef(runVoiceText)
  useLayoutEffect(() => {
    runVoiceTextRef.current = runVoiceText
  })
```

`useVoiceQuestion` в окне: `onText: (text) => send(text, { voice: true })` → `onText: (text) => runVoiceTextRef.current?.(text)` (объявить `runVoiceTextRef` выше `voiceQ`, а присваивание — после `runVoiceText`; `runVoiceText` объявлять после `send` и `press`).

Позывной (заменить `onWake`):

```js
  // Позывной без команды и без слов дальше — прежнее приветствие (окно, WAKE_MARK).
  const greetOnWake = useCallback(() => {
    const cur = stateRef.current
    if (!mountedRef.current || !cur?.enabled || !cur.token || cur.callLive) return
    showCmd(null)
    setOpen(true)
    stateRef.current = { ...cur, open: true }
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    greetedRef.current = screenStateKey(cur.screen, snapshotScreen(root))
    send(WAKE_MARK, { voice: !cur.muted, opening: true, afterReply: listenAnswer })
  }, [send, listenAnswer, showCmd])

  // Распознанное после позывного: обращение срезаем, остаток — команда или вопрос.
  const onWakeText = useCallback((raw) => {
    const text = stripWake(raw, stateRef.current?.persona?.id)
    if (!text) return greetOnWake()
    runVoiceText(text, { quiet: true })
  }, [greetOnWake, runVoiceText])

  const onWake = useCallback((detail = {}) => {
    const cur = stateRef.current
    if (!mountedRef.current || !cur?.enabled || !cur.token || cur.callLive) return undefined
    const name = wakeSet(cur.persona?.id).name
    const text = String(detail.text || '')
    const command = matchCommand(text, { name })
    const fast = { cooldownMs: FAST_COOLDOWN_MS }
    if (command) {
      if (!tryFast(command, text, { quiet: true })) send(wakeTail(text, name).join(' '), { voice: true, quiet: true })
      return fast
    }
    // Слова после имени — команда одним духом: её звук уже в буфере «уха».
    const wav = wakeTail(text, name).length ? detail.preroll?.() : null
    if (wav) {
      showCmd('thinking')
      voiceQRef.current?.transcribeAudio(wav, { onText: onWakeText })
      return fast
    }
    playCue('listen')
    showCmd('listening')
    voiceQRef.current?.listen({ noVoiceMs: WAKE_LISTEN_MS, onText: onWakeText, onNoVoice: greetOnWake })
    return undefined
  }, [tryFast, send, showCmd, onWakeText, greetOnWake])
```

Ошибка распознавания после позывного — окно, где ошибка видна:

```js
  useEffect(() => {
    if (!cmd || !voiceQ.error) return
    showCmd(null)
    setOpen(true)
  }, [cmd, voiceQ.error, showCmd])
```

Окно открыли кнопкой — облачко уходит: в `openWindow` добавить `showCmd(null)`.

Облачко в разметке — перед блоком `introHint`:

```jsx
      {/* Облачко голосовой команды (см. шапку): окно закрыто, Луна слушает или нажала. */}
      {cmd && !open && (
        <div
          className={`asst__hint asst__cmd${free ? ' is-free' : ''}${hintLeft ? ' is-left' : ''}`}
          style={hintStyle}
          role="status"
          aria-live="polite"
          data-cmd={cmdPhase}
        >
          {cmdPhase === 'listening' && <span className="asst__rec-dot" aria-hidden="true" />}
          <span className="asst__hint-text">{t(`assistant.cmd.${cmdPhase}`, { label: cmd.label })}</span>
        </div>
      )}
```

где перед `return`: `const cmdPhase = cmd?.phase === 'listening' && voiceQ.state === 'transcribing' ? 'thinking' : cmd?.phase`; условие облачка-знакомства: `introHint && !open && !cmd`.

- [ ] **Step 5: CSS** — в `src/assistant.css` рядом с `.asst__hint`:

```css
/* Облачко голосовой команды: то же место, что у знакомства, но кликов не ловит и короче. */
.asst__cmd {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.asst__cmd .asst__rec-dot {
  flex: none;
}
```

(сверить, что `.asst__hint` уже `pointer-events: none` и позиционируется по `style`; иначе добавить те же свойства).

- [ ] **Step 6: Прогон** — `npx vitest run src/lib/assistant src/components/AssistantWidget` → PASS (тесты позывного в `useWakeWord.test.jsx` — с `onWake(detail)`).

- [ ] **Step 7: Коммит** `feat(помощник): «Луна, …» — команда сразу, облачко вместо окна`

---

### Task 11: Быстрые команды в звонке

**Files:**
- Modify: `src/components/AssistantWidget.jsx` (`callAsk`)
- Test: `src/components/AssistantWidget.call.test.jsx` (дописать по образцу соседних — как там зовут `onAsk` и читают `sender.phrase`)

- [ ] **Step 1: Тест**

```js
it('«дальше» в звонке — нажатие и фраза без запроса к модели', async () => {
  // экран с <button>Далее</button> в .scr-in, звонок поднят как в соседних тестах
  // onAsk({ id: 'q1', text: 'Дальше.', opening: false, sender })
  // ждём: onClick кнопки вызван, sender.phrase получил «Нажимаю «Далее».», fetch чата не звали
})
```

(конкретный код — по хелперам файла; проверить три вещи из комментария и что при `pending: true` нажатие случается только после `onCommit('q1')`).

- [ ] **Step 2: Прогон — падает.**

- [ ] **Step 3: Правка `callAsk`** — сразу после `const history = [...]`:

```js
      // Быстрая команда и в звонке («дальше» — voiceCommands.js): Луна жмёт сама и
      // говорит одну фразу, без модели. Черновик (pending) нажмёт только по commit — через
      // ui(): ученик мог ещё не договорить. Пара строк в модель не идёт (local).
      const command = opening ? null : matchCommand(raw)
      if (command) {
        takeSnapshot()
        const refs = refsRef.current
        const hits = findCommandButtons(refs, command)
        if (hits.length === 1) {
          const action = { kind: 'click', target: String(hits[0].ref), label: hits[0].label, now: true }
          const say = t('assistant.action.clicking', { label: action.label })
          sender.phrase(callSpeech(say))
          sender.end()
          callAskRef.current = null
          ui(() => {
            setMessages([...base, { ...history[history.length - 1], local: true }, { role: 'assistant', content: say, local: true }])
            setCallThinking(false)
            press(action, { refs })
          })
          return
        }
      }
```

deps `callAsk`: + `press`.

- [ ] **Step 4: Прогон** — `npx vitest run src/components/AssistantWidget.call.test.jsx` → PASS.

- [ ] **Step 5: Коммит** `feat(помощник): быстрые команды и в звонке Луне`

---

### Task 12: e2e, документация, сборка

**Files:**
- Create: `tests/assistant-click.spec.js`
- Modify: `tests/assistant-wake.spec.js` (новый поток позывного)
- Modify: `CLAUDE.md` (абзац «Помощник по сайту…»: «По экрану не кликает…» → ссылка на новый абзац; новый абзац после «Позывной Луны…»)

- [ ] **Step 1: `tests/assistant-click.spec.js`**

```js
import { test, expect } from '@playwright/test'

// Луна нажимает кнопки (21.10.2026): быстрая команда позывного — без сервера, команда
// словами — через модель (подменена), опасная кнопка — никогда. «Ухо» подменено
// (window.__jtsFakeWakeEar), кнопки вставлены в обёртку экрана — снимок читает DOM.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page, { reply = () => 'Хорошо.', stt = 'Луна, нажми старт' } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('jts_luna_wake', '1')
    window.__jtsFakeWakeEar = true
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  const calls = { chat: [] }
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    if (body.messages.at(-1).content === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502))
    calls.chat.push(body)
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: reply(body) })
  })
  await page.route('**/api/assistant/transcribe', (r) => r.fulfill(json({ text: stt })))
  await page.route('**/api/assistant/speak', (r) => r.fulfill({ status: 502, body: '' }))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 502, body: '' }))
  await page.goto('/?screen=home')
  // Кнопки «урока»: счётчик нажатий — в data-атрибуте.
  await page.evaluate(() => {
    const root = document.querySelector('.scr-in')
    for (const label of ['Далее', 'Старт', 'Выйти']) {
      const b = document.createElement('button')
      b.textContent = label
      b.dataset.pressed = '0'
      b.addEventListener('click', () => {
        b.dataset.pressed = String(Number(b.dataset.pressed) + 1)
      })
      root.appendChild(b)
    }
  })
  await expect(page.locator('.asst__launcher [data-wake]')).toHaveAttribute('data-wake', 'listening', { timeout: 15_000 })
  return calls
}

const pressed = (page, label) => page.locator('.scr-in button', { hasText: label }).getAttribute('data-pressed')

test('«Луна, дальше» — нажатие на устройстве, без модели, облачко', async ({ page }) => {
  const calls = await setup(page)
  await page.evaluate(() => window.__jtsWake('луна дальше'))
  await expect.poll(() => pressed(page, 'Далее')).toBe('1')
  await expect(page.locator('[data-cmd="pressed"]')).toContainText('Нажала «Далее»')
  await expect(page.getByRole('dialog', { name: 'Луна' })).toHaveCount(0)
  expect(calls.chat).toHaveLength(0)
})

test('«Луна, нажми старт» одним духом — распознавание, модель, нажатие по номеру', async ({ page }) => {
  const calls = await setup(page, {
    reply: (body) => {
      const n = /\[кнопка #(\d+) «Старт»\]/.exec(body.screen.text)[1]
      return `Нажимаю «Старт».[[ASST_ACTION click ${n} now «Старт»]]`
    },
  })
  await page.evaluate(() => window.__jtsWake('луна [unk] [unk]'))
  await expect.poll(() => pressed(page, 'Старт')).toBe('1')
  expect(calls.chat[0].messages.at(-1).content).toBe('нажми старт')
  expect(calls.chat[0].screen.text).toContain('[кнопка «Выйти»]')
})

test('опасную кнопку окно не жмёт, даже если её назвали', async ({ page }) => {
  await setup(page, { stt: 'Луна, выйди', reply: () => 'Нажимаю.[[ASST_ACTION click 3 now «Выйти»]]' })
  await page.evaluate(() => window.__jtsWake('луна [unk]'))
  await page.waitForTimeout(1500)
  expect(await pressed(page, 'Выйти')).toBe('0')
})
```

Сверить с `tests/assistant-wake.spec.js`, как включается позывной (ключ `jts_luna_wake` = `'1'` или через переключатель в окне — взять тот способ, что там), и подпись кнопки «Помощник».

- [ ] **Step 2: `tests/assistant-wake.spec.js`** — тест «Привет, Луна — окно, приветствие…» переписать под новый поток: `__jtsWake()` (только имя) → облачко `[data-cmd="listening"]`; фальшивый микрофон Chrome даёт звук → запись → `transcribe` (подмена «Где домашка?») → чат с этим вопросом → ответ без действия → окно открылось с ответом. Тест «молчание → приветствие» — если фальшивое устройство не даёт тишины, пропустить с комментарием и покрыть юнитом (`useVoiceQuestion` + `onNoVoice`). Подсказку проверять по новому тексту (`Скажите «Луна» и что сделать`).

- [ ] **Step 3: Прогон e2e** — `npx playwright test tests/assistant-click.spec.js tests/assistant-wake.spec.js --workers=1` (порт 3100 — проверить, что не занят чужим worktree: память e2e-port-reuse-trap; при занятом — `E2E_PORT=3170`). Expected: PASS.

- [ ] **Step 4: CLAUDE.md.** В абзаце «Помощник по сайту — Луна…» строку «По экрану не кликает — только открывает раздел и запускает тур (ниже).» → «По экрану кликает по просьбе ученика — абзац «Луна нажимает кнопки» ниже.». Новый абзац после «Позывной Луны…» (перед «При казахском интерфейсе…»):

```
**Луна нажимает кнопки и слушается голоса (21.10.2026, решение владельца).** Любую не опасную кнопку экрана — по
просьбе ученика, из чата, голосом и в звонке. Снимок вопроса нумерует кнопки (`snapshotWithRefs`: «[кнопка #7
«Проверить»]»; `snapshotScreen` — без номеров), модель просит `[[CLICK 7]]` (предложить — кнопка «Нажать») или
`[[CLICK_NOW 7]]`, роут сверяет номер со снимком запроса и берёт подпись оттуда (`actions.js`), окно жмёт
(`clicker.js`: элемент по номеру, если на месте и подписан так же, иначе ровно одна кнопка с той же подписью) — сразу,
не дожидаясь голоса. Что можно, решает код (`clickPolicy.js`), а не модель: выход, удаление, оплата и подписка,
«Сдать / Отправить / Завершить», сброс, пароль и `data-assistant-noclick` — номера не получают, роут такую метку
снимает, окно не жмёт; на непроверенном задании — только кнопку, которую ученик назвал сам (`namedByStudent`: «выбери
like» — да, «выбери сама» — нет); в первой реплике нажатий нет. Новую кнопку, которую Луне жать нельзя и словами не
поймать, — пометить `data-assistant-noclick`.
Быстрые команды (`voiceCommands.js`: дальше, назад, проверь, повтори/послушай, стоп, закрой; у Айзере — келесі, артқа,
тексер, қайтала, тоқта, жап) окно выполняет без модели, если на экране ровно одна кнопка команды: по итогу Vosk
(грамматика «уха» пополнена «имя + команда» и самими командами, слова сверены со словарями обеих моделей), по тексту
микрофона окна и звонка. Иначе текст уходит модели. «Луна, нажми «Начать урок»» одним духом: Vosk отдаёт итог после
паузы, и «ухо» держит 8 с звука (`wake/preroll.js`) — кусок от имени по времени слов Vosk уходит WAV в
`/api/assistant/transcribe`, обращение срезает `stripWake`. Одно «Луна» — сигнал «слушаю» (`cue.js`) и запись до 6 с;
промолчал — прежнее приветствие с окном. На команду голосом окно не открывается: облачко у кнопки (`data-cmd`
listening/thinking/pressed/missing), окно — только когда ответ объяснение или предложение. После быстрой команды
«ухо» глухо 1.5 с, а не 5. Не замерено вживую: ложные позывные с командами в грамматике на фоне, телефоны; на iPhone
звук, который запускает нажатие без касания, может не заиграть.
```

- [ ] **Step 5: Полная проверка** — `npx vitest run src/lib/assistant src/components src/app/api/assistant src/i18n` ; `npm run lint` ; `npm run build` (в worktree с junction — память build-alongside-dev-server, если рядом идёт dev). Всё зелёное или падение сверено с develop (память develop-red-tests-baseline).

- [ ] **Step 6: Коммит** `test(помощник): e2e нажатий и позывного с командой; docs`
