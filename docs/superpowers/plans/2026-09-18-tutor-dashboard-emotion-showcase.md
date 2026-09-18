# Витрина эмоций на дашборде тьютора — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** лицо тьютора в орбе дашборда листает все 13 эмоций по кругу, начиная с родной эмоции тьютора.

**Architecture:** порядок круга — данные в `avatarEmotions.js`; таймер — хук `useEmotionShowcase` (шаг раз в 3 с, стоит при reduced-motion и на скрытой вкладке); `TutorFace` получает проп `preload`, чтобы следующая эмоция догружалась заранее; дашборд рисует лицо через маленький `ShowcaseFace`, чтобы раз в 3 с перерисовывалось только лицо.

**Tech Stack:** React 19, Next 16 (SPA внутри App Router), vitest 2 + @testing-library/react 16 (jsdom), Playwright.

Спека: `docs/superpowers/specs/2026-09-18-tutor-dashboard-emotion-showcase-design.md`.

## Global Constraints

- JavaScript, не TypeScript (`.js`/`.jsx`).
- Комментарии на русском и объясняют «почему», не «что».
- Стили — только существующие классы `tutor.css`; новых CSS не нужно.
- Круг: 13 эмоций, 3 с на эмоцию, порядок `idle → listening → thinking → talking → happy → celebrate → surprised → confused → gloat → angry → rage → sympathy → sleepy`, старт с родной эмоции тьютора.
- `prefers-reduced-motion: reduce` → круга нет, лицо на родной эмоции, preload пуст.
- Круг только на дашборде; звонок (`TutorVoiceChatPage`) и Джарвис (`face: 'orb'`) не меняются.
- Все команды — из корня worktree `.claude/worktrees/face-showcase`.
- Playwright — только с явным `E2E_PORT` (иначе `reuseExistingServer` прогонит чужой dev-сервер на 3100).

---

### Task 1: Порядок круга в avatarEmotions

**Files:**
- Modify: `src/tutor/avatarEmotions.js` (после `EMOTIONS`)
- Test: `src/tutor/avatarEmotions.test.js`

**Interfaces:**
- Produces: `SHOWCASE_ORDER: string[]` (13 ключей `EMOTIONS`), `showcaseFrom(mood: string): string[]` — круг, начатый с `mood`; незнакомый `mood` → круг с `idle`.

- [ ] **Step 1: Write the failing test**

В `src/tutor/avatarEmotions.test.js` заменить строку импорта:

```js
import { EMOTIONS, SHOWCASE_ORDER, moodToEmotion, showcaseFrom } from './avatarEmotions.js'
```

и дописать в конец файла:

```js
describe('круг витрины', () => {
  it('каждая эмоция в круге ровно один раз', () => {
    expect([...SHOWCASE_ORDER].sort()).toEqual(Object.keys(EMOTIONS).sort())
  })

  it('круг начинается с родной эмоции, порядок тот же', () => {
    const n = SHOWCASE_ORDER.length
    const start = SHOWCASE_ORDER.indexOf('angry')
    expect(showcaseFrom('angry')[0]).toBe('angry')
    expect(showcaseFrom('angry')).toEqual(SHOWCASE_ORDER.map((_, i) => SHOWCASE_ORDER[(start + i) % n]))
  })

  it('незнакомая эмоция — круг с дефолта', () => {
    expect(showcaseFrom('nope')).toEqual(SHOWCASE_ORDER)
    expect(showcaseFrom(undefined)[0]).toBe('idle')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tutor/avatarEmotions.test.js`
Expected: FAIL — `SHOWCASE_ORDER is not iterable` / `showcaseFrom is not a function`.

- [ ] **Step 3: Write minimal implementation**

В `src/tutor/avatarEmotions.js` сразу после объекта `EMOTIONS`:

```js
// Круг витрины на дашборде (useEmotionShowcase): все эмоции по одному разу.
// Порядок свой, а не как в EMOTIONS: там порядок вариантов макета, и подряд
// шли бы «Злится → Скука». Здесь соседи близки по смыслу — лицо не прыгает из
// ярости в сон, а от скуки по кругу возвращается к спокойному дефолту.
export const SHOWCASE_ORDER = [
  'idle',
  'listening',
  'thinking',
  'talking',
  'happy',
  'celebrate',
  'surprised',
  'confused',
  'gloat',
  'angry',
  'rage',
  'sympathy',
  'sleepy',
]

/**
 * Круг витрины, начатый с родной эмоции тьютора (mood в tutors.js): первым
 * ученик видит характер персонажа, дальше весь спектр в том же порядке.
 * Незнакомая эмоция → круг с idle.
 */
export function showcaseFrom(mood) {
  const start = Math.max(0, SHOWCASE_ORDER.indexOf(mood))
  return [...SHOWCASE_ORDER.slice(start), ...SHOWCASE_ORDER.slice(0, start)]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tutor/avatarEmotions.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tutor/avatarEmotions.js src/tutor/avatarEmotions.test.js
git commit -m "feat(tutor): порядок круга эмоций для витрины на дашборде"
```

---

### Task 2: Проп preload у TutorFace

**Files:**
- Modify: `src/tutor/TutorFace.jsx`
- Test: `src/tutor/TutorFace.test.jsx`

**Interfaces:**
- Produces: `<TutorFace preload={string[]} />` — наборы этих эмоций монтируются скрытыми сразу; незнакомые ключи и `null` пропускаются; видимое лицо не меняется.

- [ ] **Step 1: Write the failing tests**

Дописать в `describe('TutorFace', …)` в `src/tutor/TutorFace.test.jsx`:

```js
  it('preload монтирует набор скрытым, видимое лицо не меняется', () => {
    const { container } = render(<TutorFace emotion="idle" preload={['happy']} />)
    expect(shownKey(container)).toBe('idle')
    const happy = container.querySelector('.t-face__stack.t-face--happy')
    expect(happy).not.toBeNull()
    expect(happy.classList.contains('is-on')).toBe(false)
  })

  it('заранее догруженный набор показывается сразу, без ожидания', () => {
    const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} />)
    fireEvent.load(body(container, 'happy'))
    rerender(<TutorFace emotion="happy" />)
    expect(shownKey(container)).toBe('happy')
  })

  it('незнакомые ключи и null в preload пропускаются', () => {
    const { container } = render(<TutorFace emotion="idle" preload={['nope', 'constructor', null]} />)
    expect(container.querySelectorAll('.t-face__stack')).toHaveLength(1)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tutor/TutorFace.test.jsx`
Expected: FAIL — первые два (набора `happy` нет в DOM). Третий зелёный и до правки: он сторож на ключи прототипа после неё.

- [ ] **Step 3: Write minimal implementation**

В `src/tutor/TutorFace.jsx`:

1) В шапке заменить предложение «Грузим лишь то, что реально просили, — дашборду с одним лицом не нужны все 13 наборов.» на:

```
 * местом. Грузим лишь то, что реально просили (эмоцию и preload), а не все 13
 * наборов разом.
```

(строка «…мигал бы пустым» перед ней остаётся, слово «местом.» переносится в новую строку.)

2) В JSDoc после `@param speaking …` добавить:

```
 * @param preload   ключи эмоций, которые скоро понадобятся (витрина на
 *                  дашборде знает следующую): их наборы монтируются скрытыми
 *                  заранее и к смене уже догружены. Незнакомое и null
 *                  пропускаются
```

3) Сигнатура и накопление наборов:

```js
export default function TutorFace({ emotion = 'idle', speaking = false, preload = [], className = 't-voice__face' }) {
  const known = EMOTIONS[emotion] ? emotion : 'idle'
  const want = speaking && !EMOTIONS[known].speaks ? 'talking' : known

  // Однажды запрошенные наборы не размонтируем: повторная смена на них
  // мгновенная, файлы уже декодированы. preload проверяем по собственным полям
  // EMOTIONS: у литерала есть прототип, и 'constructor' прошёл бы проверку.
  const [keys, setKeys] = useState([want])
  const missing = [want, ...preload].filter(
    (key, i, all) => Object.hasOwn(EMOTIONS, key) && !keys.includes(key) && all.indexOf(key) === i
  )
  if (missing.length) setKeys([...keys, ...missing])
```

(заменяет прежние `const [keys, setKeys] = useState([want])` и `if (!keys.includes(want)) setKeys([...keys, want])` вместе с комментарием над ними).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tutor/TutorFace.test.jsx`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tutor/TutorFace.jsx src/tutor/TutorFace.test.jsx
git commit -m "feat(tutor): TutorFace грузит заранее эмоции из preload"
```

---

### Task 3: Хук useEmotionShowcase

**Files:**
- Create: `src/tutor/useEmotionShowcase.js`
- Test: `src/tutor/useEmotionShowcase.test.js`

**Interfaces:**
- Consumes: `showcaseFrom(mood)` из Task 1.
- Produces: `useEmotionShowcase(mood: string, dwellMs = 3000): { emotion: string, next: string | null }`.

- [ ] **Step 1: Write the failing test**

`src/tutor/useEmotionShowcase.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEmotionShowcase } from './useEmotionShowcase.js'
import { showcaseFrom } from './avatarEmotions.js'

// Шаг круга — setState из таймера, поэтому часы двигаем внутри act.
const tick = (ms) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('useEmotionShowcase', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    // matchMedia в jsdom нет, а hidden — геттер прототипа: снимаем свои подмены.
    delete window.matchMedia
    delete document.hidden
  })

  it('начинает с родной эмоции и знает следующую', () => {
    const { result } = renderHook(() => useEmotionShowcase('angry'))
    expect(result.current).toEqual({ emotion: 'angry', next: 'rage' })
  })

  it('шагает раз в dwell и замыкает круг', () => {
    const order = showcaseFrom('happy')
    const { result } = renderHook(() => useEmotionShowcase('happy', 3000))
    tick(2999)
    expect(result.current.emotion).toBe('happy')
    tick(1)
    expect(result.current).toEqual({ emotion: order[1], next: order[2] })
    tick(3000 * (order.length - 1))
    expect(result.current.emotion).toBe('happy')
  })

  it('сменился тьютор — круг заново с его родной эмоции', () => {
    const { result, rerender } = renderHook(({ mood }) => useEmotionShowcase(mood), {
      initialProps: { mood: 'happy' },
    })
    tick(6000)
    rerender({ mood: 'idle' })
    expect(result.current.emotion).toBe('idle')
    tick(3000)
    expect(result.current.emotion).toBe('listening')
  })

  it('при «уменьшить движение» стоит на родной эмоции и ничего не подгружает', () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
    const { result } = renderHook(() => useEmotionShowcase('angry'))
    tick(9000)
    expect(result.current).toEqual({ emotion: 'angry', next: null })
  })

  it('на скрытой вкладке круг стоит, вернулся — идёт дальше', () => {
    const { result } = renderHook(() => useEmotionShowcase('idle'))
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    tick(9000)
    expect(result.current.emotion).toBe('idle')
    delete document.hidden
    tick(3000)
    expect(result.current.emotion).toBe('listening')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tutor/useEmotionShowcase.test.js`
Expected: FAIL — `Failed to resolve import "./useEmotionShowcase.js"`.

- [ ] **Step 3: Write minimal implementation**

`src/tutor/useEmotionShowcase.js`:

```js
import { useEffect, useState, useSyncExternalStore } from 'react'
import { showcaseFrom } from './avatarEmotions.js'

/**
 * Витрина эмоций на дашборде: лицо в орбе идёт по кругу SHOWCASE_ORDER с
 * родной эмоции тьютора — ученик видит весь спектр персонажа, а не одну маску.
 *
 * Шаг — раз в dwellMs. Пока вкладка скрыта, круг стоит: вернулся ученик — идёт
 * дальше с того же места. При «уменьшить движение» круга нет вовсе: лицо стоит
 * на родной эмоции, как до витрины, и заранее ничего не грузится.
 *
 * @param mood    родная эмоция тьютора (mood в tutors.js)
 * @param dwellMs сколько держится каждая эмоция
 * @returns emotion — что показывать сейчас; next — что покажется следующим (его
 *          TutorFace монтирует заранее через preload), null — круга нет
 */
export function useEmotionShowcase(mood, dwellMs = 3000) {
  const reduced = useReducedMotion()
  // Шаг хранится вместе с тьютором, для которого он считан: профиль может
  // догрузиться уже на дашборде и сменить тьютора — тогда круг заново с его
  // родной эмоции, а не с середины чужого.
  const [pos, setPos] = useState({ mood, step: 0 })
  if (pos.mood !== mood) setPos({ mood, step: 0 })

  useEffect(() => {
    if (reduced) return undefined
    const id = setInterval(() => {
      if (document.hidden) return
      setPos((p) => ({ ...p, step: p.step + 1 }))
    }, dwellMs)
    return () => clearInterval(id)
  }, [reduced, dwellMs, mood])

  if (reduced) return { emotion: mood, next: null }
  const order = showcaseFrom(mood)
  return { emotion: order[pos.step % order.length], next: order[(pos.step + 1) % order.length] }
}

// «Уменьшить движение» — через useSyncExternalStore, а не эффект с setState:
// на сервере matchMedia нет, и первый кадр гидратации обязан совпасть с
// серверным (false); переключение настройки в системе подхватывается на лету.
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange) {
  const mq = window.matchMedia?.(REDUCED_MOTION)
  mq?.addEventListener?.('change', onChange)
  return () => mq?.removeEventListener?.('change', onChange)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => Boolean(window.matchMedia?.(REDUCED_MOTION).matches),
    () => false
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tutor/useEmotionShowcase.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tutor/useEmotionShowcase.js src/tutor/useEmotionShowcase.test.js
git commit -m "feat(tutor): хук круга эмоций — шаг, reduced-motion, скрытая вкладка"
```

---

### Task 4: Витрина на дашборде

**Files:**
- Modify: `src/screens/TutorDashboardPage.jsx`
- Modify: `src/tutor/tutors.js:5-7` (комментарий к `mood`)
- Modify: `docs/superpowers/specs/2026-09-18-tutor-dashboard-emotion-showcase-design.md` (раздел «Код»)
- Test: `tests/tutor-dashboard.spec.js`

**Interfaces:**
- Consumes: `useEmotionShowcase(mood)` из Task 3, `TutorFace` c `preload` из Task 2.

- [ ] **Step 1: Write the failing e2e test**

Дописать в конец `tests/tutor-dashboard.spec.js`:

```js
test.describe('дашборд тьютора — витрина эмоций', () => {
  // Видимая эмоция — ключ из класса t-face--<ключ> у набора с is-on.
  const shownEmotion = (page) =>
    page
      .locator('.t-dash__face .t-face__stack.is-on')
      .evaluate((el) => [...el.classList].find((c) => c.startsWith('t-face--')).slice(8))

  test('лицо в орбе листает эмоции по кругу', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    const first = await shownEmotion(page)
    // Смена раз в 3 с; запас — на подгрузку картинок следующего набора.
    await expect.poll(() => shownEmotion(page), { timeout: 10_000 }).not.toBe(first)
  })

  test('при «уменьшить движение» лицо стоит на родной эмоции', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?screen=tutor-dashboard')
    const first = await shownEmotion(page)
    // Дольше одного шага круга: будь витрина включена, лицо бы уже сменилось.
    await page.waitForTimeout(4_000)
    expect(await shownEmotion(page)).toBe(first)
  })
})
```

- [ ] **Step 2: Run e2e to verify it fails**

Run: `E2E_PORT=3281 npx playwright test tests/tutor-dashboard.spec.js --project=desktop -g "витрина"`
Expected: FAIL — «листает эмоции по кругу» (лицо стоит на `happy`); второй зелёный и до правки — сторож.

- [ ] **Step 3: Wire the dashboard**

В `src/screens/TutorDashboardPage.jsx`:

1) Импорт после `import TutorFace …`:

```js
import { useEmotionShowcase } from '../tutor/useEmotionShowcase.js'
```

2) Комментарий над орбом заменить на:

```jsx
              {/* Орб вместо микрофона: у кнопки лицо выбранного тьютора. Круг
                  эмоций начинается с его характера (Декстер злится, Луна
                  спокойна, Спарк радуется) и проходит весь спектр — то же лицо,
                  что потом ведёт разговор. */}
```

3) `<TutorFace className="t-dash__face" emotion={mood} />` заменить на `<ShowcaseFace mood={mood} />`.

4) В конец файла, после `export default function …`:

```jsx
// Лицо в орбе идёт по кругу всех эмоций с родной (useEmotionShowcase). Круг
// крутится в своём маленьком компоненте, а не в самом дашборде: раз в 3 с
// перерисовывается одно лицо, а не страница со списком сценариев, и у Джарвиса
// (орб вместо лица) таймер не заводится вовсе. В звонке круга нет — там эмоцию
// задаёт агент.
function ShowcaseFace({ mood }) {
  const { emotion, next } = useEmotionShowcase(mood)
  return <TutorFace className="t-dash__face" emotion={emotion} preload={[next]} />
}
```

5) `src/tutor/tutors.js`, строки 5–7 комментария заменить на:

```js
// mood — родная эмоция тьютора: с неё начинается круг эмоций в орбе на
// дашборде (useEmotionShowcase). Ключ из EMOTIONS (avatarEmotions.js). Это
// ЛИЦО ПЕРСОНАЖА, а не реакция на реплику: внутри разговора эмоция всё так же
// приходит тегом от агента.
```

6) В спеке, раздел «Код», пункт про `TutorDashboardPage` заменить на:

```
- `TutorDashboardPage` — лицо рисует маленький `ShowcaseFace` в том же файле:
  хук крутится внутри него, поэтому раз в 3 с перерисовывается одно лицо, а не
  дашборд со списком сценариев, а у Джарвиса таймер не заводится вовсе.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `E2E_PORT=3281 npx playwright test tests/tutor-dashboard.spec.js`
Expected: PASS — все тесты файла в обоих проектах (mobile + desktop).

Run: `npx vitest run src/tutor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TutorDashboardPage.jsx src/tutor/tutors.js tests/tutor-dashboard.spec.js docs/superpowers/specs/2026-09-18-tutor-dashboard-emotion-showcase-design.md
git commit -m "feat(tutor): лицо на дашборде листает все эмоции по кругу"
```

---

### Task 5: Проверка и PR

**Files:** —

- [ ] **Step 1: Подтянуть свежий develop**

```bash
git fetch origin
git merge origin/develop
```

Expected: fast-forward/merge без конфликтов.

- [ ] **Step 2: Гейты**

```bash
npm test
npm run lint
npm run build
E2E_PORT=3281 npx playwright test tests/tutor-dashboard.spec.js
```

Expected: vitest зелёный (кроме известных Windows-падений `textCollapse`/`disabled-controls` с `C:\C:\…`), lint без новых ошибок, build ок, e2e зелёный.

- [ ] **Step 3: Глазами**

Поднять dev-сервер worktree, открыть `/?screen=tutor-dashboard`, убедиться, что лицо меняется раз в ~3 с с кроссфейдом, без мигания пустым местом; скриншот.

- [ ] **Step 4: Ревью ветки субагентом** — diff `origin/develop...HEAD`.

- [ ] **Step 5: Push и PR в develop**

```bash
git push -u origin feat/tutor-dashboard-emotion-showcase
gh pr create --base develop --title "feat(tutor): лицо на дашборде листает все эмоции по кругу" --body-file <файл с описанием>
```

После — `gh pr view <N> --json state`.
