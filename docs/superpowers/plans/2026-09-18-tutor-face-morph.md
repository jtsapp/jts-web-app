# Плавная смена эмоций на дашборде — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на дашборде лицо тьютора меняет эмоцию плавно — одно тело доворачивается к позе новой эмоции, глаза и значки перетекают; шаг витрины 2 с.

**Architecture:** `buddyPose.js` считает позу набора относительно видимой эмоции (сдвиг центров тел + разница наклонов). `TutorFace` с пропом `morph` ставит все наборы в позу видимого и помечает уходящий `is-leaving`; CSS-переход позы общий у всех наборов, поэтому тела совпадают в каждом кадре. Селекторы движений лица расширены до `:is(.is-on, .is-leaving)`.

**Tech Stack:** React 19, CSS transitions, vitest 2 + @testing-library/react 16, Playwright (системный Chrome через обёртку-конфиг).

Спека: `docs/superpowers/specs/2026-09-18-tutor-face-morph-design.md`.

## Global Constraints

- Только дашборд: без `morph` поведение `TutorFace` (звонок) не меняется ни на пиксель.
- `SWAP_MS = 600`, кривая позы `ease-in-out`; проявление — первые 50 %, угасание — с 25 % до 85 %.
- Шаг витрины по умолчанию — 2000 мс.
- reduced-motion: переходы гасятся (`transition: none !important`).
- Комментарии на русском, «почему», а не «что»; JS, не TS.

---

### Task 1: Поза набора — `buddyPose.js`

**Files:** Create `src/tutor/buddyPose.js`, `src/tutor/buddyPose.test.js`.

**Produces:** `SWAP_MS: number`, `BODY_CENTER: Record<emotion, [x%, y%]>`, `poseStyle(key, anchor) → { transformOrigin, transform }`.

- [ ] Тест (`buddyPose.test.js`):

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BODY_CENTER, poseStyle } from './buddyPose.js'
import { EMOTIONS } from './avatarEmotions.js'

describe('buddyPose', () => {
  it('центр тела есть у каждой эмоции и лежит у центра холста', () => {
    expect(Object.keys(BODY_CENTER).sort()).toEqual(Object.keys(EMOTIONS).sort())
    for (const [key, [x, y]] of Object.entries(BODY_CENTER)) {
      expect(Math.abs(x - 50), key).toBeLessThan(5)
      expect(Math.abs(y - 50), key).toBeLessThan(5)
    }
  })

  it('набор в позе своей же эмоции стоит на месте', () => {
    expect(poseStyle('talking', 'talking')).toEqual({
      transformOrigin: '46.69% 50.46%',
      transform: 'translate(0%, 0%) rotate(0deg)',
    })
  })

  it('поза — разница центров и наклонов вокруг центра своего тела', () => {
    // talking: центр 46.69/50.46, наклон 9.2°; happy: 50.01/50.04, −18°.
    expect(poseStyle('happy', 'talking')).toEqual({
      transformOrigin: '50.01% 50.04%',
      transform: 'translate(-3.32%, 0.42%) rotate(27.2deg)',
    })
  })

  it('точные центры совпадают с точками опоры петель в tutor.css', () => {
    const css = readFileSync(join(process.cwd(), 'src/tutor.css'), 'utf8')
    for (const key of ['talking', 'happy', 'thinking', 'gloat']) {
      const m = css.match(new RegExp(`t-face--${key} \\.t-face__body \\{\\s*transform-origin: ([\\d.]+)% ([\\d.]+)%`))
      expect(m, key).not.toBeNull()
      expect(BODY_CENTER[key], key).toEqual([Number(m[1]), Number(m[2])])
    }
  })
})
```

- [ ] `npx vitest run src/tutor/buddyPose.test.js` → FAIL (нет модуля).
- [ ] Реализация (`buddyPose.js`): `SWAP_MS = 600`; `BODY_CENTER` — talking 46.69/50.46, happy 50.01/50.04, thinking 46.697/52.249, gloat 49.994/50.046 (из Figma), остальные — замер + 0.06: idle 50.03/50.05, confused 46.67/50.45, listening 51.91/51.53, celebrate 50.02/50.04, angry 49.97/50.04, sleepy 50/50.03, surprised 46.66/50.39, sympathy 49.97/50.04, rage 49.97/50.04; `poseStyle` — `translate(ax−x %, ay−y %) rotate(tiltAnchor−tiltKey deg)`, origin — центр своего тела, числа округлены до тысячных.
- [ ] Тест → PASS. Коммит `feat(tutor): поза тела эмоции для плавной смены`.

### Task 2: CSS — уходящее лицо доигрывает, правила плавной смены

**Files:** Modify `src/tutor.css` (блок `.t-face*` 1044–1475), create `src/tutor/tutorFaceCss.test.js`.

- [ ] Тест (`tutorFaceCss.test.js`):

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/tutor.css'), 'utf8')

describe('tutor.css — лицо тьютора', () => {
  it('движения лица висят и на уходящем наборе, а не только на видимом', () => {
    expect(css).not.toMatch(/\.is-on\.t-face--/)
    expect(css.match(/:is\(\.is-on, \.is-leaving\)\.t-face--/g).length).toBeGreaterThan(50)
  })

  it('плавная смена: поза едет у всех наборов одной кривой, новый — поверх', () => {
    expect(css).toMatch(/\.t-face\.is-morph \.t-face__stack \{[^}]*transform var\(--face-swap\) ease-in-out/)
    expect(css).toMatch(/\.t-face\.is-morph \.t-face__stack\.is-on \{[^}]*z-index: 1;[^}]*transform var\(--face-swap\) ease-in-out/)
  })

  it('при «уменьшить движение» переходы гасятся и в плавном режиме', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.t-face__stack \{\s*transition: none !important;/)
  })
})
```

- [ ] FAIL → `sed -i 's/\.is-on\.t-face--/:is(.is-on, .is-leaving).t-face--/g' src/tutor.css`; комментарий блока движений — про is-leaving; после `.t-face__stack.is-on {…}` правила `.t-face.is-morph .t-face__stack` (opacity `calc(var(--face-swap) * 0.6) ease-in calc(var(--face-swap) * 0.25)`, transform `var(--face-swap) ease-in-out`) и `.t-face.is-morph .t-face__stack.is-on` (`z-index: 1`, opacity `calc(var(--face-swap) * 0.5) ease-out`, тот же transform); reduced-motion — `transition: none !important`.
- [ ] PASS. Коммит `feat(tutor): уходящее лицо доигрывает движение, правила плавной смены`.

### Task 3: `TutorFace` — проп `morph`

**Files:** Modify `src/tutor/TutorFace.jsx`, `src/tutor/TutorFace.test.jsx`.

**Consumes:** `poseStyle`, `SWAP_MS` из Task 1.

- [ ] Тесты (дописать; импорт `vi` из vitest, `act` из RTL, `SWAP_MS` из `./buddyPose.js`):

```js
  it('без morph смена как раньше: ни позы, ни is-morph, ни is-leaving', () => {
    const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} />)
    expect(container.querySelector('.t-face').classList.contains('is-morph')).toBe(false)
    expect(container.querySelector('.t-face--happy').style.transform).toBe('')
    fireEvent.load(body(container, 'happy'))
    rerender(<TutorFace emotion="happy" />)
    expect(container.querySelector('.is-leaving')).toBeNull()
  })

  it('morph ставит каждый набор в позу видимого', () => {
    const { container } = render(<TutorFace emotion="talking" preload={['happy']} morph />)
    expect(container.querySelector('.t-face').classList.contains('is-morph')).toBe(true)
    const happy = container.querySelector('.t-face--happy')
    expect(happy.style.transform).toBe('translate(-3.32%, 0.42%) rotate(27.2deg)')
    expect(happy.style.transformOrigin).toBe('50.01% 50.04%')
    expect(container.querySelector('.t-face--talking').style.transform).toBe('translate(0%, 0%) rotate(0deg)')
  })

  it('morph: уходящее лицо доигрывает движение, пока гаснет', () => {
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} morph />)
      fireEvent.load(body(container, 'happy'))
      rerender(<TutorFace emotion="happy" morph />)
      expect(shownKey(container)).toBe('happy')
      const idle = container.querySelector('.t-face--idle')
      expect(idle.classList.contains('is-leaving')).toBe(true)
      expect(idle.style.transform).toBe('translate(-0.02%, -0.01%) rotate(-3deg)')
      act(() => {
        vi.advanceTimersByTime(SWAP_MS)
      })
      expect(idle.classList.contains('is-leaving')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
```

- [ ] FAIL → реализация: проп `morph = false`; корень `className + ' t-face' + (morph ? ' is-morph' : '')`, `style={morph ? { '--face-swap': `${SWAP_MS}ms` } : undefined}`; стейт `leaving`, при смене видимого `if (morph && shown !== null) setLeaving(shown)`; эффект снимает `leaving` через `SWAP_MS`; класс набора `is-on` / `is-leaving`; стиль набора `{ '--tilt', ...(morph ? poseStyle(key, visible) : null) }`; JSDoc про `morph`.
- [ ] PASS. Коммит `feat(tutor): TutorFace — плавная смена эмоций (morph)`.

### Task 4: Дашборд — `morph` и шаг 2 с

**Files:** Modify `src/tutor/useEmotionShowcase.js`, `src/tutor/useEmotionShowcase.test.js`, `src/screens/TutorDashboardPage.jsx`, `tests/tutor-dashboard.spec.js`, `docs/superpowers/specs/2026-09-18-tutor-dashboard-emotion-showcase-design.md`.

- [ ] Тесты хука под 2 с: новый «по умолчанию шаг — 2 с» (`tick(1999)` → родная, `tick(1)` → следующая); «сменился тьютор» — `tick(5000)`, `rerender`, `tick(1999)`/`tick(1)`; «на лету» — `tick(4000)` → `sympathy`, после `flip(false)` — `tick(2000)` → `rage`; «скрытая вкладка» — `tick(8000)` скрыто, `tick(2000)` → `listening`.
- [ ] e2e: комментарий «раз в 2 с»; новый тест — `.t-dash__face` с `is-morph`, при смене появляется `.t-face__stack.is-leaving` (`toHaveCount(1, { timeout: 5_000 })`).
- [ ] FAIL → `dwellMs = 2000`; `ShowcaseFace` передаёт `morph`, комментарии «2 с»; в старой спеке — строка-обновление со ссылкой на новую.
- [ ] PASS (vitest `src/tutor`, e2e дашборда через обёртку, `E2E_PORT` свой). Коммит `feat(tutor): витрина — плавная смена и шаг 2 с`.

### Task 5: Проверка и PR

- [ ] `git fetch` + `origin/develop` в ветку; vitest весь, lint, build.
- [ ] Глазами: dev-сервер воркtree, пауза переходов посреди смены (`document.getAnimations()`), скриншот — тело одно, без двойного контура.
- [ ] Ревью субагентом, правки.
- [ ] Push, PR в develop, `gh pr view --json state`.
