# Луна: «Застряли? Подсказать?» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** облачко «Подсказать?» у кнопки Луны после двух неверных проверок подряд или 90 с простоя на задании; по нажатию Луна сразу разбирает задание (голосом, если звук не выключен).

**Architecture:** окно Луны само смотрит на экран той же разметкой, по которой Луна читает задания (`snapshotScreen`): чистый счётчик `stuck.js` решает «пора», хук `useStuckWatch.js` слушает действия и простой, виджет рисует облачко и шлёт служебную пометку «ученик застрял»; `buildTurns` ставит указание рядом с пометкой, роут не даёт действий и пишет строку лога.

**Tech Stack:** Next.js 16 (JS, без TS), React 19, vitest + jsdom, Playwright (системный Chrome), Anthropic SDK (зонд).

## Global Constraints

- Пороги: `wrongLimit: 2`, `idleMs: 90_000`, `cooldownMs: 180_000`, `ignoreLimit: 2`, облачко живёт 12 с — константы в `stuck.js`.
- Тексты: ru «Подсказать?», kk «Көмектесейін бе?», en «Need a hint?».
- Пометки: `[ученик застрял: две ошибки подряд]`, `[ученик застрял: долго без действий]`.
- Не на тестах: корень помечается `data-assistant-test`.
- Комментарии — по-русски, объясняют «почему»; JS, без TS; стили — в `src/assistant.css`, цвета токенами/как у `.asst__hint`.
- Правка промпта — только с замером (зонд Haiku 5.5 с параметрами роута).

---

### Task 1: Счётчик «застрял» (`stuck.js`)

**Files:**
- Create: `src/lib/assistant/stuck.js`
- Test: `src/lib/assistant/stuck.test.js`

**Interfaces:**
- Produces: `STUCK` (константы), `verdictMarks(text) → { wrong: string, right: string }`, `createStuckTracker(opts?) → { baseline({ screen, text }), observe({ screen, text, now }) → 'errors'|null, idle({ screen, now, lastActionAt, task }) → 'idle'|null, taken(), ignored(), isOff() }`.

- [ ] **Step 1: тест**

```js
import { describe, it, expect } from 'vitest'
import { STUCK, createStuckTracker, verdictMarks } from './stuck.js'

const wrongPick = (w) => `Выберите. [кнопка «like»${w === 'like' ? ' (отмечено как неверное)' : ''}] [кнопка «don't like»${w === 'dont' ? ' (отмечено как неверное)' : ''}]`

describe('verdictMarks', () => {
  it('неверное — пометки вариантов и полей и эталон сайта; верное — отдельно', () => {
    const m = verdictMarks('[поле: ученик ввёл «goed» (отмечено как неверное)] [кнопка «Далее»]\n [верный ответ по заданию: «went»] \n[кнопка «a» (отмечено как верное)]')
    expect(m.wrong).toBe('[поле: ученик ввёл «goed» (отмечено как неверное)]|[верный ответ по заданию: «went»]')
    expect(m.right).toBe('[кнопка «a» (отмечено как верное)]')
    expect(verdictMarks('Выберите. [кнопка «like»]')).toEqual({ wrong: '', right: '' })
  })
})

describe('createStuckTracker', () => {
  it('две неверные проверки подряд — errors; одна — нет', () => {
    const s = createStuckTracker()
    s.baseline({ screen: 'kingdom-interior', text: wrongPick(null) })
    expect(s.observe({ screen: 'kingdom-interior', text: wrongPick('like'), now: 1000 })).toBe(null)
    // «Продолжить» — следующее задание, пометок нет: счёт не сбрасывается.
    expect(s.observe({ screen: 'kingdom-interior', text: 'Next. [кнопка «a»]', now: 2000 })).toBe(null)
    expect(s.observe({ screen: 'kingdom-interior', text: wrongPick('dont'), now: 3000 })).toBe('errors')
  })

  it('та же пометка после «Послушать» — не новая ошибка; новый ввод — новая', () => {
    const s = createStuckTracker()
    const field = (v) => `[поле: ученик ввёл «${v}» (отмечено как неверное)]`
    s.observe({ screen: 'workbook', text: field('goed'), now: 1 })
    expect(s.observe({ screen: 'workbook', text: field('goed'), now: 2 })).toBe(null)
    expect(s.observe({ screen: 'workbook', text: field('wented'), now: 3 })).toBe('errors')
  })

  it('верная проверка сбрасывает счёт; уход с экрана — тоже', () => {
    const s = createStuckTracker()
    s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })
    s.observe({ screen: 'a', text: '[кнопка «x» (отмечено как верное)]', now: 2 })
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 3 })).toBe(null)
    s.observe({ screen: 'b', text: wrongPick('like'), now: 4 })
    expect(s.observe({ screen: 'b', text: 'чисто', now: 5 })).toBe(null)
    expect(s.observe({ screen: 'c', text: wrongPick('dont'), now: 6 })).toBe(null)
  })

  it('пометки, что уже были на экране при входе, ошибкой не считаются', () => {
    const s = createStuckTracker()
    s.baseline({ screen: 'a', text: wrongPick('like') })
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })).toBe(null)
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 2 })).toBe(null)
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: 3 })).toBe('errors')
  })

  it(`не чаще раза в ${STUCK.cooldownMs / 60000} мин`, () => {
    const s = createStuckTracker()
    const pair = (t0) => {
      s.observe({ screen: 'a', text: wrongPick('like'), now: t0 })
      return s.observe({ screen: 'a', text: wrongPick('dont'), now: t0 + 1 })
    }
    expect(pair(0)).toBe('errors')
    expect(pair(1000)).toBe(null)
    expect(pair(STUCK.cooldownMs + 10)).toBe('errors')
  })

  it(`простой ${STUCK.idleMs / 1000} с на задании — idle, один раз на простой`, () => {
    const s = createStuckTracker()
    expect(s.idle({ screen: 'a', now: STUCK.idleMs - 1, lastActionAt: 0, task: true })).toBe(null)
    expect(s.idle({ screen: 'a', now: STUCK.idleMs, lastActionAt: 0, task: false })).toBe(null)
    expect(s.idle({ screen: 'a', now: STUCK.idleMs, lastActionAt: 0, task: true })).toBe('idle')
    expect(s.idle({ screen: 'a', now: STUCK.idleMs + STUCK.cooldownMs, lastActionAt: 0, task: true })).toBe(null)
    const later = STUCK.idleMs + STUCK.cooldownMs
    expect(s.idle({ screen: 'a', now: later + STUCK.idleMs, lastActionAt: later, task: true })).toBe('idle')
  })

  it(`дважды не нажал — до конца визита облачка нет; нажал — счёт игнора с нуля`, () => {
    const s = createStuckTracker({ cooldownMs: 0 })
    s.ignored()
    s.taken()
    s.ignored()
    expect(s.isOff()).toBe(false)
    s.ignored()
    expect(s.isOff()).toBe(true)
    s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 2 })).toBe(null)
  })
})
```

- [ ] **Step 2: прогнать — падает** — `npx vitest run src/lib/assistant/stuck.test.js` → FAIL (нет модуля).

- [ ] **Step 3: реализация**

```js
// «Застряли? Подсказать?» (28.10.2026, решение владельца): когда ученик ошибся
// дважды подряд или полторы минуты ничего не делает на задании, у кнопки Луны
// выходит облачко. Здесь — только счёт «пора или нет», без DOM и таймеров:
// снимки экрана и время приносит useStuckWatch.js.
//
// Ошибку видно по той же разметке, по которой Луна читает задание
// (screenSnapshot.js): «(отмечено как неверное)» у вариантов и полей и эталон
// «[верный ответ по заданию: …]» — его сайт ставит только после неверного
// ответа. Разделы при этом не трогаем: всё, что размечено для Луны,
// подхватывается само.
//
// «Подряд» — без верной проверки между ними, на одном экране, но не обязательно
// на одном задании: в уроках «Обучения» после ошибки сайт показывает ответ и
// ведёт дальше, и двух ошибок на одном задании там не бывает.

export const STUCK = { wrongLimit: 2, idleMs: 90_000, cooldownMs: 180_000, ignoreLimit: 2, showMs: 12_000 }

const WRONG_TOKEN = /\[[^\]]*отмечено как неверное[^\]]*\]|\[верный ответ по заданию: [^\]]*\]/g
const RIGHT_TOKEN = /\[[^\]]*отмечено как верное[^\]]*\]/g

const sig = (text, re) => (String(text ?? '').match(re) || []).map((t) => t.replace(/\s+/g, ' ').trim()).join('|')

/** Подписи проверки на экране: всё неверное и всё верное — строками для сравнения. */
export function verdictMarks(text) {
  return { wrong: sig(text, WRONG_TOKEN), right: sig(text, RIGHT_TOKEN) }
}

export function createStuckTracker(opts = {}) {
  const o = { ...STUCK, ...opts }
  let screen = null
  let last = { wrong: '', right: '' }
  let errors = 0
  let shownAt = -Infinity
  let idleFor = null // простой, о котором уже сказали (его lastActionAt)
  let ignoredInRow = 0
  let off = false

  const enter = (id, text = '') => {
    if (id === screen) return
    screen = id
    last = verdictMarks(text)
    errors = 0
  }
  const canShow = (now) => !off && now - shownAt >= o.cooldownMs
  const show = (now) => {
    shownAt = now
    errors = 0
  }

  return {
    /** Экран открылся (или наблюдение началось): его пометки — не ошибки ученика. */
    baseline({ screen: id, text }) {
      screen = null
      enter(id, text)
    },
    /** Снимок после действия ученика: 'errors' — пора предложить подсказку. */
    observe({ screen: id, text, now }) {
      enter(id)
      const m = verdictMarks(text)
      if (m.wrong && m.wrong !== last.wrong) errors++
      else if (m.right && m.right !== last.right && !m.wrong) errors = 0
      last = m
      if (errors < o.wrongLimit || !canShow(now)) return null
      show(now)
      return 'errors'
    },
    /** Ученик ничего не делает с lastActionAt: 'idle' — один раз на простой. */
    idle({ screen: id, now, lastActionAt, task }) {
      enter(id)
      if (!task || now - lastActionAt < o.idleMs || idleFor === lastActionAt || !canShow(now)) return null
      idleFor = lastActionAt
      show(now)
      return 'idle'
    },
    /** Ученик нажал облачко. */
    taken() {
      ignoredInRow = 0
    },
    /** Облачко ушло без нажатия: дважды подряд — до конца визита его нет. */
    ignored() {
      ignoredInRow++
      if (ignoredInRow >= o.ignoreLimit) off = true
    },
    isOff: () => off,
  }
}
```

- [ ] **Step 4: прогнать — проходит** — `npx vitest run src/lib/assistant/stuck.test.js` → PASS.
- [ ] **Step 5: коммит** — `git add src/lib/assistant/stuck.js src/lib/assistant/stuck.test.js && git commit -m "feat(помощник): счётчик «застрял» — две ошибки подряд и простой"`.

### Task 2: Пометка «застрял» в модели и роуте

**Files:**
- Modify: `src/lib/assistant/opening.js` (пометки, `stuckReason`, `isOpeningTurn`)
- Modify: `src/lib/assistant/prompt.js` (`buildTurns`, реэкспорт)
- Modify: `src/app/api/assistant/chat/route.js` (без действия, лог)
- Test: `src/lib/assistant/opening.test.js`, `src/lib/assistant/prompt.test.js`, `src/app/api/assistant/chat/route.test.js`

**Interfaces:**
- Produces: `STUCK_ERRORS_MARK`, `STUCK_IDLE_MARK`, `stuckReason(content) → 'errors'|'idle'|null`, `stuckMark(reason) → string` (из `opening.js`, реэкспорт в `prompt.js`).

- [ ] **Step 1: тесты** (opening.test.js):

```js
it('пометки «застрял» — служебный ход с причиной', () => {
  expect(stuckReason(STUCK_ERRORS_MARK)).toBe('errors')
  expect(stuckReason(STUCK_IDLE_MARK)).toBe('idle')
  expect(stuckReason('где домашка')).toBe(null)
  expect(isOpeningTurn(STUCK_IDLE_MARK)).toBe(true)
  expect(stuckMark('idle')).toBe(STUCK_IDLE_MARK)
  expect(stuckMark('errors')).toBe(STUCK_ERRORS_MARK)
})
```

prompt.test.js:

```js
it('«застрял» — указание разобрать задание рядом с пометкой, без совета сайта', () => {
  const turns = buildTurns({
    messages: [{ role: 'user', content: STUCK_ERRORS_MARK }],
    screen: { id: 'kingdom-interior', text: 'Choose. [кнопка «went» (отмечено как неверное)]\n [верный ответ по заданию: «goes»] ' },
    lang: 'ru',
    studentContext: 'Совет сайта: домашка (метка [[OPEN homework]])\nНавыки: …',
  })
  const c = turns[0].content
  expect(c).toContain(STUCK_ERRORS_MARK)
  expect(c).toContain('две неверные проверки подряд')
  expect(c).toContain('без метки')
  expect(c).not.toContain('Совет сайта')
})
it('«застрял» на непроверенном задании — только подсказка', () => {
  const turns = buildTurns({
    messages: [{ role: 'user', content: STUCK_IDLE_MARK }],
    screen: { id: 'workbook', text: 'Fill in. [пустое поле] [кнопка «Проверить»]' },
    lang: 'kk',
  })
  expect(turns[0].content).toContain('не называй правильный')
  expect(turns[0].content).toContain('Язык ответа: казахский')
})
```

route.test.js (в стиле соседних тестов: модель подменена, ответ с меткой):

```js
it('«застрял»: метку раздела модели роут не отдаёт, заметку не пишет, лог — причина без текста', async () => {
  // модель отвечает «… Открыть?\n[[OPEN practice]]»
  // ожидание: в потоке нет [[ASST_ACTION, saveAdviceNote не вызван, console.info с {"kind":"stuck","reason":"errors"}
})
```

- [ ] **Step 2: прогнать — падают.**

- [ ] **Step 3: реализация.** `opening.js`:

```js
// Ученик застрял (stuck.js): дважды подряд ошибся или полторы минуты ничего не делает
// на задании, и нажал облачко «Подсказать?». Тоже служебный ход: Луна сразу разбирает
// задание на экране — без приветствия и без совета раздела (решение 28.10.2026).
export const STUCK_ERRORS_MARK = '[ученик застрял: две ошибки подряд]'
export const STUCK_IDLE_MARK = '[ученик застрял: долго без действий]'

/** Причина «застрял» по служебному ходу или null. */
export function stuckReason(content) {
  const text = String(content ?? '').trim()
  return text === STUCK_ERRORS_MARK ? 'errors' : text === STUCK_IDLE_MARK ? 'idle' : null
}

/** Служебный ход для причины из stuck.js. */
export const stuckMark = (reason) => (reason === 'idle' ? STUCK_IDLE_MARK : STUCK_ERRORS_MARK)
```

и `isOpeningTurn`: `return text === OPENING_MARK || text === WAKE_MARK || stuckReason(text) != null`.

`prompt.js` `buildTurns` — ветка до `opening`:

```js
const stuck = stuckReason(last.content)
...
: stuck
  ? [
      last.content.trim(),
      answerLang,
      `Ученик застрял на задании на экране (${stuck === 'idle' ? 'полторы минуты ничего не делает' : 'две неверные проверки подряд'}) и нажал «Подсказать?». Разбери именно это задание: что не так или на что посмотреть. Без приветствия.`,
      focus.unchecked
        ? 'Задание ещё не проверено: не оценивай введённый ответ и не называй правильный — только подсказка.'
        : 'Верный ответ называй, только если сайт его показал («верный ответ по заданию»); иначе — подсказка, без ответа.',
      'Без советов про другие разделы, без прошлых советов и без метки.',
      'Не больше 4 коротких предложений.',
    ].join('\n')
```

и `const context = focus.task || wake || stuck ? withoutAdvice(studentContext) : studentContext`.

`route.js`: `const stuck = stuckReason(lastContent)`; в `finalAction` — `if (focusTask || wake || stuck) return null`; после разбора запроса — `if (stuck) console.info('[assistant]', JSON.stringify({ kind: 'stuck', reason: stuck }))`.

- [ ] **Step 4: прогнать — проходят** — `npx vitest run src/lib/assistant/opening.test.js src/lib/assistant/prompt.test.js src/app/api/assistant/chat`.
- [ ] **Step 5: коммит** — `feat(помощник): пометка «ученик застрял» — указание рядом и без действий`.

### Task 3: Хук `useStuckWatch`

**Files:**
- Create: `src/lib/assistant/useStuckWatch.js`
- Test: `src/lib/assistant/useStuckWatch.test.jsx`

**Interfaces:**
- Consumes: `createStuckTracker`, `STUCK` (Task 1); `snapshotScreen` (`screenSnapshot.js`); `openingFocus` (`opening.js`); `isTtsActive` (`speech.js`).
- Produces: `useStuckWatch({ active: boolean, screen: string|null, canOffer?: () => boolean, rootSelector?: string }) → { offer: null | { reason: 'errors'|'idle' }, take: () => ('errors'|'idle'|null), dismiss: () => void }`; `stuckBlocked(root, doc) → boolean`.

- [ ] **Step 1: тест** (jsdom, фальшивые таймеры): корень `.scr-in` с кнопкой; клик → кнопка получает `is-wrong` → через 800 мс снимок; второй клик → другая кнопка `is-wrong` → `offer.reason === 'errors'`; через 12 с без нажатия `offer === null`; `take()` возвращает причину и убирает облачко; при `data-assistant-test` на корне облачка нет; простой: `vi.advanceTimersByTime(STUCK.idleMs + 5000)` на экране с `[пустое поле]` → `idle`.

- [ ] **Step 2: прогнать — падает.**

- [ ] **Step 3: реализация** — см. код в `src/lib/assistant/useStuckWatch.js` (слушатели `click`/`keydown` в capture на `document`, `composedPath` для Shadow DOM; прочие `pointerdown`/`wheel`/`touchstart`/`input`/`scroll` только сдвигают `lastActionAt`; снимки через 800 и 2000 мс после действия; раз в 5 с — проверка простоя, снимок только когда простой уже ≥ `idleMs`; медиа страницы играет или звучит Луна — это не простой; `stuckBlocked` — `[data-assistant-test]` в корне или `.t-tour__pop` в документе; облачко живёт `STUCK.showMs`, уходит без нажатия — `ignored()`; действие ученика в экране, пока облачко на месте, — тоже уход без нажатия).

- [ ] **Step 4: прогнать — проходит.**
- [ ] **Step 5: коммит** — `feat(помощник): useStuckWatch — наблюдатель «застрял» за экраном`.

### Task 4: Облачко в окне, тексты, пометка тестов

**Files:**
- Modify: `src/components/AssistantWidget.jsx` (хук, облачко-кнопка, `takeStuck`, кнопка Луны при облачке)
- Modify: `src/assistant.css` (`.asst__hint--stuck`: `pointer-events: auto; cursor: pointer`, кнопка без рамки браузера)
- Modify: `src/i18n.jsx` (`assistant.stuck` ru/en/kk)
- Modify: `src/learning/LevelExam.jsx:97`, `src/learning/CourseStepPlayer.jsx:327`, `src/screens/workbook/WorkbookAct.jsx` — `data-assistant-test`

- [ ] **Step 1:** виджет:

```js
const stuck = useStuckWatch({
  active: enabled && Boolean(token) && !open && !call,
  screen,
  canOffer: () => !badge && !introHint && !inFlightRef.current && !isTtsActive(),
})
const takeStuck = () => {
  const reason = stuck.take()
  if (!reason) return false
  const cur = stateRef.current
  unlockSpeech()
  showCmd(null)
  setOpen(true)
  const root = document.querySelector(SCREEN_ROOT)
  greetedRef.current = screenStateKey(cur.screen, snapshotScreen(root))
  send(stuckMark(reason), { voice: !cur.muted, opening: true })
  return true
}
const openWindow = () => {
  if (takeStuck()) return
  ...прежнее
}
```

Разметка рядом с вводным облачком:

```jsx
{stuck.offer && !open && !badge && (
  <button type="button" className={`asst__hint asst__hint--stuck${free ? ' is-free' : ''}${hintLeft ? ' is-left' : ''}`} style={hintStyle} data-stuck={stuck.offer.reason} onClick={takeStuck}>
    <b className="asst__hint-title">{t('assistant.stuck')}</b>
  </button>
)}
```

Вводное облачко не рисуется, пока есть `stuck.offer`.

- [ ] **Step 2:** CSS, i18n, `data-assistant-test`:
  - `LevelExam.jsx`: `<div className="cp ex" data-assistant-test="">`
  - `CourseStepPlayer.jsx`: `<div className="cp" data-assistant-test={exam ? '' : undefined}>`
  - `WorkbookAct.jsx`: `<div className="wb-card" data-assistant-test={lesson.test ? '' : undefined}>`
- [ ] **Step 3:** `npx vitest run src/lib/assistant src/components` → PASS; `npx eslint` по изменённым файлам → 0 ошибок.
- [ ] **Step 4: коммит** — `feat(помощник): облачко «Подсказать?» у кнопки Луны, тесты помечены`.

### Task 5: e2e, зонд модели, CLAUDE.md

**Files:**
- Create: `tests/assistant-stuck.spec.js`
- Modify: `CLAUDE.md` (абзац о Луне)

- [ ] **Step 1: e2e** — вход учеником (`jts_access_token` + мок `/api/auth/me`, как в `assistant-voice.spec.js`), мок чата (пишет тела), урок A2 (`?screen=kingdom-interior&level=A2&unlock=1`, как `course-lesson.spec.js`): дойти до первого `.cp-choice`, выбрать неверный (ответ из `steps-1.json`), «Проверить», «Продолжить», и так до второй ошибки → `.asst__hint--stuck` видно → клик → в чат ушла пометка `[ученик застрял: две ошибки подряд]` с `voice: true`, окно открыто. Отдельно: одна ошибка → облачка нет.
- [ ] **Step 2: зонд** — скрипт в scratchpad: `buildSystemPrompt`/`buildTurns` из worktree, `claude-haiku-5-5`, `thinking: disabled`, `output_config.effort: 'low'`, 4 сценария × 4 (урок после двух ошибок с эталоном; воркбук до окончательной проверки; простой на непроверенном задании; казахский интерфейс). Критерии: нет ответа там, где проверка не окончательна; нет метки `[[`; ≤ 4 предложений; язык верный.
- [ ] **Step 3:** CLAUDE.md — абзац «Застряли? Подсказать?» после абзаца «Луна — преподаватель…».
- [ ] **Step 4: коммит.**

### Task 6: Проверка и PR

- [ ] `npx vitest run --exclude '**/node_modules/**' --exclude '.next/**' --exclude '.claude/**' --exclude 'tests/**/*.spec.js'`
- [ ] `npm run build`
- [ ] e2e системным Chrome: `assistant-*.spec.js`, `course-lesson.spec.js`, `level-exam.spec.js`
- [ ] `git fetch && git merge origin/develop` при сдвиге, затем push и PR в develop.
