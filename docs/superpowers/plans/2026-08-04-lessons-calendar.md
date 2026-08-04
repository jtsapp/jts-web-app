# Lessons Calendar + Fullscreen + Sidebar Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the day-list in the "Уроки → Онлайн-уроки" tab with a month calendar + selected-day panel, put the browser into real fullscreen when entering "Уроки", and collapse the sidebar to an expand-on-hover icon rail while in "Уроки".

**Architecture:** Extend the existing, unit-tested `schedule/` module. Pure date/grouping logic goes in `lessonFormat.js`; two new presentational components (`MonthCalendar`, `DayPanel`) reuse the existing `LessonRow`/`ScheduleSummary`. `LessonSchedule.jsx` becomes a thin container holding view-month + selected-day state. Fullscreen is a standalone cross-browser helper wired into `App.jsx` nav handlers (click gesture). The rail is a CSS-only collapsed state toggled by a `rail` prop on `Sidebar`.

**Tech Stack:** React (no router; `screen` string state in `App.jsx`), plain global CSS in `src/styles.css`, i18n via `src/i18n.jsx` `useI18n()`, tests with vitest + @testing-library/react + jsdom.

## Global Constraints

- Base branch `develop`; work is on `feat/lessons-calendar` in worktree `/Users/mirasnurlanov/Desktop/jtsapp-workspace/jts-web-app-lessons-calendar`. PR into `develop`. **No direct push to develop.**
- **No backend/API changes.** Reuse `getMyLessonOccurrences(token)` and `getLessonsSummary(token)` from `src/api.js`.
- Reuse existing design tokens (`--purple: #9047ff`, `--ink`, `--muted`) and the `.sch-badge--*` status palette. No new ad-hoc colors.
- i18n keys mirrored across ru/en/kk in `src/i18n.jsx`.
- `useI18n()` returns `useContext(I18nCtx)` which defaults to `null` — **every component test must wrap render in `<I18nProvider>`** (exported from `src/i18n.jsx`).
- Occurrence fields: `scheduledAt` (zone-less LocalDateTime string), `durationMinutes`, `teacherName`, `lessonStatus`, `format`, `lessonId`, `participantId`.
- Status keys from `lessonStateKey`: `inProgress`, `paused`, `completed`, `cancelled`, `overdue`, `scheduled`.
- Run all tests from the worktree root: `cd /Users/mirasnurlanov/Desktop/jtsapp-workspace/jts-web-app-lessons-calendar`.
- Commit after every task. Commit trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

- `src/screens/schedule/lessonFormat.js` — MODIFY: add `buildMonthMatrix`, `occurrencesByDayKey`, `monthShift`, `dateFromKey`.
- `src/screens/schedule/lessonFormat.test.js` — MODIFY: tests for the above.
- `src/lib/fullscreen.js` — CREATE: `isFullscreenSupported`, `requestAppFullscreen`, `exitAppFullscreen`.
- `src/lib/fullscreen.test.js` — CREATE.
- `src/screens/schedule/MonthCalendar.jsx` — CREATE.
- `src/screens/schedule/MonthCalendar.test.jsx` — CREATE.
- `src/screens/schedule/DayPanel.jsx` — CREATE.
- `src/screens/schedule/DayPanel.test.jsx` — CREATE.
- `src/screens/schedule/LessonSchedule.jsx` — MODIFY: refactor into calendar container.
- `src/screens/schedule/LessonSchedule.test.jsx` — CREATE.
- `src/components/Sidebar.jsx` — MODIFY: add `rail` prop → `sb--rail` class.
- `src/components/Sidebar.test.jsx` — CREATE.
- `src/components/LearningLayout.jsx` — MODIFY: pass `rail={active === 'lessons'}`.
- `src/App.jsx` — MODIFY: fullscreen on nav to/from `lessons`.
- `src/styles.css` — MODIFY: calendar + rail CSS.
- `src/i18n.jsx` — MODIFY: add `schedule.prevMonth`, `schedule.nextMonth`, `schedule.dayEmpty` (ru/en/kk).

---

### Task 1: Pure calendar helpers in `lessonFormat.js`

**Files:**
- Modify: `src/screens/schedule/lessonFormat.js`
- Test: `src/screens/schedule/lessonFormat.test.js`

**Interfaces:**
- Consumes: existing `dayKey(date)`, `parseLessonDate(scheduledAt)` from the same file.
- Produces:
  - `buildMonthMatrix(year, month) → Array<Array<{ date: Date, inMonth: boolean }>>` (6 weeks × 7 days, Monday-first).
  - `occurrencesByDayKey(occurrences) → Map<string, occ[]>` (items sorted ascending by `scheduledAt`).
  - `monthShift(year, month, delta) → { year, month }` (normalized across year boundaries).
  - `dateFromKey(key) → Date` (local midnight from `"YYYY-MM-DD"`).

- [ ] **Step 1: Write the failing tests**

Append to `src/screens/schedule/lessonFormat.test.js`:

```js
import { buildMonthMatrix, occurrencesByDayKey, monthShift, dateFromKey } from './lessonFormat.js'

describe('buildMonthMatrix', () => {
  it('returns 6 weeks of 7 days, Monday-first', () => {
    const weeks = buildMonthMatrix(2026, 7) // August 2026
    expect(weeks).toHaveLength(6)
    weeks.forEach((w) => expect(w).toHaveLength(7))
    // Aug 1 2026 is a Saturday → first cell is Monday Jul 27 2026
    expect(weeks[0][0].date.getFullYear()).toBe(2026)
    expect(weeks[0][0].date.getMonth()).toBe(6) // July
    expect(weeks[0][0].date.getDate()).toBe(27)
    expect(weeks[0][0].inMonth).toBe(false)
    // First in-month day is Aug 1 at column index 5 (Saturday)
    expect(weeks[0][5]).toMatchObject({ inMonth: true })
    expect(weeks[0][5].date.getDate()).toBe(1)
  })

  it('marks only the target month as inMonth', () => {
    const weeks = buildMonthMatrix(2026, 1) // Feb 2026 (non-leap)
    const inMonthDays = weeks.flat().filter((c) => c.inMonth)
    expect(inMonthDays).toHaveLength(28)
    expect(Math.max(...inMonthDays.map((c) => c.date.getDate()))).toBe(28)
  })

  it('handles a leap February', () => {
    const weeks = buildMonthMatrix(2024, 1) // Feb 2024 (leap)
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(29)
  })

  it('handles a month starting on Monday without a blank leading week gap', () => {
    const weeks = buildMonthMatrix(2026, 5) // June 2026 starts Monday
    expect(weeks[0][0]).toMatchObject({ inMonth: true })
    expect(weeks[0][0].date.getDate()).toBe(1)
  })
})

describe('occurrencesByDayKey', () => {
  it('buckets by local day and sorts within a day by start time', () => {
    const occ = [
      { lessonId: 1, scheduledAt: '2026-08-04T20:00:00' },
      { lessonId: 2, scheduledAt: '2026-08-04T09:30:00' },
      { lessonId: 3, scheduledAt: '2026-08-05T10:00:00' },
    ]
    const map = occurrencesByDayKey(occ)
    expect(map.get('2026-08-04').map((o) => o.lessonId)).toEqual([2, 1])
    expect(map.get('2026-08-05').map((o) => o.lessonId)).toEqual([3])
    expect(map.has('2026-08-06')).toBe(false)
  })
})

describe('monthShift', () => {
  it('rolls forward across the year boundary', () => {
    expect(monthShift(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })
  it('rolls backward across the year boundary', () => {
    expect(monthShift(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe('dateFromKey', () => {
  it('parses YYYY-MM-DD to a local-midnight Date', () => {
    const d = dateFromKey('2026-08-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(4)
    expect(d.getHours()).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lessonFormat`
Expected: FAIL — `buildMonthMatrix is not a function` (and the other new exports undefined).

- [ ] **Step 3: Implement the helpers**

Append to `src/screens/schedule/lessonFormat.js`:

```js
// 6-week (42-day) Monday-first grid covering `month` (0-based) of `year`.
// Leading/trailing cells come from the adjacent months; `inMonth` flags the target month.
export function buildMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // JS getDay: 0=Sun..6=Sat → Monday-first offset
  const start = new Date(year, month, 1 - offset)
  const weeks = []
  for (let w = 0; w < 6; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
      days.push({ date, inMonth: date.getFullYear() === year && date.getMonth() === month })
    }
    weeks.push(days)
  }
  return weeks
}

// Map dayKey → occurrences of that day, each bucket sorted ascending by start time.
export function occurrencesByDayKey(occurrences) {
  const map = new Map()
  for (const occ of occurrences) {
    const k = dayKey(parseLessonDate(occ.scheduledAt))
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(occ)
  }
  for (const items of map.values()) {
    items.sort((a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt))
  }
  return map
}

// Shift a (year, month) pair by `delta` months, normalized across year boundaries.
export function monthShift(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

// Local-midnight Date from a "YYYY-MM-DD" dayKey.
export function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lessonFormat`
Expected: PASS (all describe blocks, including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
cd /Users/mirasnurlanov/Desktop/jtsapp-workspace/jts-web-app-lessons-calendar
git add src/screens/schedule/lessonFormat.js src/screens/schedule/lessonFormat.test.js
git commit -m "feat(schedule): add month-matrix and day-bucket calendar helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Cross-browser fullscreen helper

**Files:**
- Create: `src/lib/fullscreen.js`
- Test: `src/lib/fullscreen.test.js`

**Interfaces:**
- Produces:
  - `isFullscreenSupported() → boolean`
  - `requestAppFullscreen() → void` (requests fullscreen on `document.documentElement`; no-op if unsupported or already fullscreen; swallows rejections).
  - `exitAppFullscreen() → void` (exits if currently fullscreen; no-op otherwise).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fullscreen.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { isFullscreenSupported, requestAppFullscreen, exitAppFullscreen } from './fullscreen.js'

afterEach(() => {
  delete document.documentElement.requestFullscreen
  delete document.exitFullscreen
  // jsdom: fullscreenElement is a read-only getter → redefine per test as needed
  try { Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true }) } catch {}
})

describe('fullscreen helper', () => {
  it('reports support when requestFullscreen exists', () => {
    document.documentElement.requestFullscreen = vi.fn()
    expect(isFullscreenSupported()).toBe(true)
  })

  it('requestAppFullscreen calls the element method when not already fullscreen', () => {
    const fn = vi.fn(() => Promise.resolve())
    document.documentElement.requestFullscreen = fn
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
    requestAppFullscreen()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('requestAppFullscreen is a no-op when already fullscreen', () => {
    const fn = vi.fn(() => Promise.resolve())
    document.documentElement.requestFullscreen = fn
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true })
    requestAppFullscreen()
    expect(fn).not.toHaveBeenCalled()
  })

  it('requestAppFullscreen is a no-op when unsupported', () => {
    expect(() => requestAppFullscreen()).not.toThrow()
  })

  it('exitAppFullscreen exits only when currently fullscreen', () => {
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true })
    exitAppFullscreen()
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('exitAppFullscreen is a no-op when not fullscreen', () => {
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
    exitAppFullscreen()
    expect(exit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- fullscreen`
Expected: FAIL — module `./fullscreen.js` not found.

- [ ] **Step 3: Implement the helper**

Create `src/lib/fullscreen.js`:

```js
// Cross-browser fullscreen. Every function is a safe no-op where the API
// is missing (e.g. iOS Safari) or the request is rejected.

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)
}

function currentFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

export function requestAppFullscreen() {
  if (typeof document === 'undefined') return
  if (currentFullscreenElement()) return
  const el = document.documentElement
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
  if (!req) return
  try {
    const r = req.call(el)
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch { /* ignore — fullscreen is best-effort */ }
}

export function exitAppFullscreen() {
  if (typeof document === 'undefined') return
  if (!currentFullscreenElement()) return
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
  if (!exit) return
  try {
    const r = exit.call(document)
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- fullscreen`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/fullscreen.js src/lib/fullscreen.test.js
git commit -m "feat(lib): add cross-browser fullscreen helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `MonthCalendar` component (+ CSS + i18n keys)

**Files:**
- Create: `src/screens/schedule/MonthCalendar.jsx`
- Test: `src/screens/schedule/MonthCalendar.test.jsx`
- Modify: `src/styles.css` (calendar CSS)
- Modify: `src/i18n.jsx` (`schedule.prevMonth`, `schedule.nextMonth`)

**Interfaces:**
- Consumes: `buildMonthMatrix`, `dayKey`, `lessonStateKey` (Task 1 + existing); `useI18n`.
- Produces: `default MonthCalendar({ year, month, selectedDayKey, occByDay, onSelectDay, onPrevMonth, onNextMonth })`.
  - `occByDay` is a `Map<string, occ[]>` (from `occurrencesByDayKey`).
  - `onSelectDay(dayKey: string)`, `onPrevMonth()`, `onNextMonth()`.

- [ ] **Step 1: Add i18n keys**

In `src/i18n.jsx`, add these three keys to each of the ru, en, kk `schedule.*` groups (next to the existing `schedule.empty`):

ru (near line 117):
```js
    'schedule.prevMonth': 'Предыдущий месяц',
    'schedule.nextMonth': 'Следующий месяц',
    'schedule.dayEmpty': 'В этот день занятий нет',
```
en (near line 512):
```js
    'schedule.prevMonth': 'Previous month',
    'schedule.nextMonth': 'Next month',
    'schedule.dayEmpty': 'No lessons on this day',
```
kk (in the kk `schedule.*` block):
```js
    'schedule.prevMonth': 'Алдыңғы ай',
    'schedule.nextMonth': 'Келесі ай',
    'schedule.dayEmpty': 'Бұл күні сабақ жоқ',
```

(`schedule.dayEmpty` is used by Task 4 but added here so both tasks have it.)

- [ ] **Step 2: Write the failing test**

Create `src/screens/schedule/MonthCalendar.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import { occurrencesByDayKey } from './lessonFormat.js'

function renderCal(props) {
  return render(
    <I18nProvider>
      <MonthCalendar
        year={2026}
        month={7}
        selectedDayKey="2026-08-04"
        occByDay={new Map()}
        onSelectDay={() => {}}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        {...props}
      />
    </I18nProvider>
  )
}

describe('MonthCalendar', () => {
  it('renders 42 day cells', () => {
    const { container } = renderCal()
    expect(container.querySelectorAll('.cal__day')).toHaveLength(42)
  })

  it('marks days that have occurrences with dots', () => {
    const occByDay = occurrencesByDayKey([
      { lessonId: 1, scheduledAt: '2026-08-04T20:00:00', lessonStatus: 'COMPLETED', durationMinutes: 60 },
    ])
    const { container } = renderCal({ occByDay })
    expect(container.querySelectorAll('.cal__dot')).toHaveLength(1)
  })

  it('fires onSelectDay with the clicked day key', () => {
    const onSelectDay = vi.fn()
    renderCal({ onSelectDay })
    // Aug 4 2026 has aria-label containing "4" and the month; find by role + name.
    const cell = screen.getByRole('button', { name: /4 август/i })
    fireEvent.click(cell)
    expect(onSelectDay).toHaveBeenCalledWith('2026-08-04')
  })

  it('applies the selected class to the selected day', () => {
    const { container } = renderCal({ selectedDayKey: '2026-08-04' })
    const sel = container.querySelector('.cal__day--sel')
    expect(sel).not.toBeNull()
    expect(sel.textContent).toContain('4')
  })

  it('fires month navigation handlers', () => {
    const onPrevMonth = vi.fn()
    const onNextMonth = vi.fn()
    renderCal({ onPrevMonth, onNextMonth })
    fireEvent.click(screen.getByLabelText('Предыдущий месяц'))
    fireEvent.click(screen.getByLabelText('Следующий месяц'))
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- MonthCalendar`
Expected: FAIL — cannot resolve `./MonthCalendar.jsx`.

- [ ] **Step 4: Implement the component**

Create `src/screens/schedule/MonthCalendar.jsx`:

```jsx
import { useI18n } from '../../i18n.jsx'
import { buildMonthMatrix, dayKey, lessonStateKey } from './lessonFormat.js'

const MAX_DOTS = 3
// 2024-01-01 is a Monday — a fixed anchor for Monday-first weekday labels.
const MONDAY_ANCHOR = new Date(2024, 0, 1)

export default function MonthCalendar({
  year, month, selectedDayKey, occByDay,
  onSelectDay, onPrevMonth, onNextMonth,
}) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'
  const weeks = buildMonthMatrix(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const todayKey = dayKey(new Date())
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(MONDAY_ANCHOR.getFullYear(), 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
  )

  return (
    <div className="cal">
      <div className="cal__head">
        <button className="cal__nav" type="button" aria-label={t('schedule.prevMonth')} onClick={onPrevMonth}>‹</button>
        <div className="cal__title">{monthLabel}</div>
        <button className="cal__nav" type="button" aria-label={t('schedule.nextMonth')} onClick={onNextMonth}>›</button>
      </div>
      <div className="cal__grid cal__grid--head">
        {weekdayNames.map((w, i) => <div key={i} className="cal__wd">{w}</div>)}
      </div>
      <div className="cal__grid">
        {weeks.flat().map(({ date, inMonth }) => {
          const k = dayKey(date)
          const items = occByDay.get(k) || []
          const cls = [
            'cal__day',
            inMonth ? '' : 'cal__day--out',
            k === todayKey ? 'cal__day--today' : '',
            k === selectedDayKey ? 'cal__day--sel' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={k}
              type="button"
              className={cls}
              aria-selected={k === selectedDayKey}
              aria-label={date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              onClick={() => onSelectDay(k)}
            >
              <span className="cal__num">{date.getDate()}</span>
              {items.length > 0 && (
                <span className="cal__dots">
                  {items.slice(0, MAX_DOTS).map((o, i) => (
                    <span key={i} className={`cal__dot cal__dot--${lessonStateKey(o)}`} />
                  ))}
                  {items.length > MAX_DOTS && <span className="cal__more">+{items.length - MAX_DOTS}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- MonthCalendar`
Expected: PASS (5 tests).

- [ ] **Step 6: Add calendar CSS**

Append to `src/styles.css` (after the `.sch*` block, near line 5889):

```css
/* Lessons calendar */
.cal-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 16px; align-items: start; }
.cal { background: #fff; border: 1px solid #eceef1; border-radius: 16px; padding: 12px 12px 8px; }
.cal__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.cal__title { font-weight: 700; text-transform: capitalize; }
.cal__nav { width: 32px; height: 32px; border: 0; background: #f4f5f7; border-radius: 8px; font-size: 18px; line-height: 1; cursor: pointer; color: var(--ink); }
.cal__nav:hover { background: #e9eaf0; }
.cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal__grid--head { margin-bottom: 4px; }
.cal__wd { text-align: center; font-size: 11px; color: #8b8a97; text-transform: capitalize; padding: 2px 0; }
.cal__day { position: relative; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; padding: 6px 2px; border: 1px solid transparent; border-radius: 10px; background: #fafafc; cursor: pointer; color: var(--ink); transition: background .15s ease, border-color .15s ease; }
.cal__day:hover { background: #f1f0f7; }
.cal__day--out { color: #c3c2cc; background: transparent; }
.cal__day--today .cal__num { color: var(--purple); font-weight: 700; }
.cal__day--sel { border-color: var(--purple); background: #f3eefe; }
.cal__num { font-size: 13px; font-variant-numeric: tabular-nums; }
.cal__dots { display: flex; align-items: center; gap: 3px; }
.cal__dot { width: 6px; height: 6px; border-radius: 999px; background: #2b57d6; }
.cal__dot--inProgress, .cal__dot--paused { background: #0b74c4; }
.cal__dot--completed { background: #2c8a45; }
.cal__dot--overdue { background: #b26a12; }
.cal__dot--cancelled { background: #9aa0a6; }
.cal__more { font-size: 9px; color: #8b8a97; }
.cal-day { background: #fff; border: 1px solid #eceef1; border-radius: 16px; padding: 12px; }
.cal-day__h { font-size: 13px; font-weight: 600; color: #6b7280; margin: 0 0 8px; text-transform: capitalize; }
@media (max-width: 720px) { .cal-layout { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .cal__day { transition: none; } }
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/schedule/MonthCalendar.jsx src/screens/schedule/MonthCalendar.test.jsx src/styles.css src/i18n.jsx
git commit -m "feat(schedule): add MonthCalendar grid with per-day status dots

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `DayPanel` component

**Files:**
- Create: `src/screens/schedule/DayPanel.jsx`
- Test: `src/screens/schedule/DayPanel.test.jsx`

**Interfaces:**
- Consumes: `dayLabelKey` (existing), `LessonRow` (existing, props `{ occ, onOpenLesson }`), `useI18n`, `schedule.dayEmpty` (added in Task 3).
- Produces: `default DayPanel({ dayDate, items, onOpenLesson })` — `dayDate` is a `Date`, `items` is `occ[]`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/schedule/DayPanel.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import DayPanel from './DayPanel.jsx'

function renderPanel(props) {
  return render(
    <I18nProvider>
      <DayPanel dayDate={new Date(2026, 7, 4)} items={[]} onOpenLesson={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('DayPanel', () => {
  it('renders one lesson row per item', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo 2', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(2)
  })

  it('shows the empty state when there are no items', () => {
    const { container } = renderPanel({ items: [] })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(0)
    expect(container.querySelector('.sch__status')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DayPanel`
Expected: FAIL — cannot resolve `./DayPanel.jsx`.

- [ ] **Step 3: Implement the component**

Create `src/screens/schedule/DayPanel.jsx`:

```jsx
import { useI18n } from '../../i18n.jsx'
import { dayLabelKey } from './lessonFormat.js'
import LessonRow from './LessonRow.jsx'

export default function DayPanel({ dayDate, items, onOpenLesson }) {
  const { t, lang } = useI18n()
  const labelKey = dayLabelKey(dayDate)
  const heading = labelKey
    ? t(`schedule.${labelKey}`)
    : dayDate.toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long', weekday: 'short' })
  return (
    <div className="cal-day">
      <div className="cal-day__h">{heading}</div>
      {items.length === 0
        ? <p className="sch__status">{t('schedule.dayEmpty')}</p>
        : items.map((o) => (
            <LessonRow key={o.participantId ?? o.lessonId} occ={o} onOpenLesson={onOpenLesson} />
          ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- DayPanel`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/schedule/DayPanel.jsx src/screens/schedule/DayPanel.test.jsx
git commit -m "feat(schedule): add DayPanel with reused LessonRow and empty state

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Refactor `LessonSchedule` into the calendar container

**Files:**
- Modify: `src/screens/schedule/LessonSchedule.jsx`
- Test: `src/screens/schedule/LessonSchedule.test.jsx`

**Interfaces:**
- Consumes: `getMyLessonOccurrences`, `getLessonsSummary` (existing api); `occurrencesByDayKey`, `monthShift`, `dayKey`, `dateFromKey` (Task 1); `ScheduleSummary` (existing), `MonthCalendar` (Task 3), `DayPanel` (Task 4).
- Produces: unchanged public API — `default LessonSchedule({ token, onOpenLesson })`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/schedule/LessonSchedule.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({
  getMyLessonOccurrences: vi.fn(async () => ([
    { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
  ])),
  getLessonsSummary: vi.fn(async () => ({ conducted: 1, remaining: 0, cancelled: 0, rescheduled: 0 })),
}))

import LessonSchedule from './LessonSchedule.jsx'

function renderSchedule() {
  return render(
    <I18nProvider>
      <LessonSchedule token="TOK" onOpenLesson={() => {}} />
    </I18nProvider>
  )
}

describe('LessonSchedule container', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the summary tiles and the calendar after loading', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    expect(container.querySelectorAll('.sch-tile')).toHaveLength(4)
    expect(container.querySelectorAll('.cal__day')).toHaveLength(42)
  })

  it('shows the occurrence in the day panel for the day that has a lesson', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    // Today defaults to the current date; select Aug 4 2026 explicitly.
    fireEvent.click(screen.getByRole('button', { name: /4 август/i }))
    await waitFor(() => expect(container.querySelectorAll('.cal-day .sch-row')).toHaveLength(1))
  })

  it('shows an error state when loading fails', async () => {
    const api = await import('../../api.js')
    api.getMyLessonOccurrences.mockRejectedValueOnce(new Error('boom'))
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.sch__status--error')).not.toBeNull())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LessonSchedule`
Expected: FAIL — no `.cal` element (current `LessonSchedule` renders the day-list, not a calendar).

- [ ] **Step 3: Rewrite `LessonSchedule.jsx`**

Replace the entire contents of `src/screens/schedule/LessonSchedule.jsx` with:

```jsx
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'
import { occurrencesByDayKey, monthShift, dayKey, dateFromKey } from './lessonFormat.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import DayPanel from './DayPanel.jsx'

export default function LessonSchedule({ token, onOpenLesson }) {
  const { t } = useI18n()
  const [occ, setOcc] = useState([])
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey(now))

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState('loading')
    Promise.all([getMyLessonOccurrences(token), getLessonsSummary(token)])
      .then(([o, s]) => {
        if (cancelled) return
        setOcc(Array.isArray(o) ? o : [])
        setSummary(s || null)
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [token])

  const occByDay = useMemo(() => occurrencesByDayKey(occ), [occ])

  if (!token) return null

  return (
    <section className="sch">
      <h2 className="sch__title">{t('schedule.title')}</h2>
      {state === 'loading' && <p className="sch__status">{t('schedule.loading')}</p>}
      {state === 'error' && <p className="sch__status sch__status--error">{t('schedule.error')}</p>}
      {state === 'ready' && (
        <>
          <ScheduleSummary summary={summary} />
          <div className="cal-layout">
            <MonthCalendar
              year={view.year}
              month={view.month}
              selectedDayKey={selectedDayKey}
              occByDay={occByDay}
              onSelectDay={setSelectedDayKey}
              onPrevMonth={() => setView((v) => monthShift(v.year, v.month, -1))}
              onNextMonth={() => setView((v) => monthShift(v.year, v.month, 1))}
            />
            <DayPanel
              dayDate={dateFromKey(selectedDayKey)}
              items={occByDay.get(selectedDayKey) || []}
              onOpenLesson={onOpenLesson}
            />
          </div>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LessonSchedule`
Expected: PASS (3 tests).

- [ ] **Step 5: Delete the now-unused helper import check**

Run: `grep -n "groupByDay\|dayLabelKey" src/screens/schedule/LessonSchedule.jsx`
Expected: no output (the container no longer imports them; `groupByDay`/`dayLabelKey` remain exported and used elsewhere — do NOT delete them from `lessonFormat.js`).

- [ ] **Step 6: Commit**

```bash
git add src/screens/schedule/LessonSchedule.jsx src/screens/schedule/LessonSchedule.test.jsx
git commit -m "feat(schedule): drive LessonSchedule from a month calendar + day panel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Sidebar icon rail (scoped to Lessons)

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/LearningLayout.jsx`
- Modify: `src/styles.css`
- Test: `src/components/Sidebar.test.jsx`

**Interfaces:**
- Consumes: existing `Sidebar` props; `useI18n`.
- Produces: `Sidebar` accepts a new `rail` boolean prop (default `false`). When `true`, the root `<aside>` gets the `sb--rail` class; behavior is otherwise unchanged. `LearningLayout` passes `rail={active === 'lessons'}`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Sidebar.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

function renderSidebar(props) {
  return render(
    <I18nProvider>
      <Sidebar userName="Demo" userLevel="A1" active="lessons" onNav={() => {}} onProfile={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('Sidebar rail mode', () => {
  it('adds sb--rail when rail is true', () => {
    const { container } = renderSidebar({ rail: true })
    expect(container.querySelector('aside.sb.sb--rail')).not.toBeNull()
  })

  it('does not add sb--rail by default', () => {
    const { container } = renderSidebar()
    expect(container.querySelector('aside.sb.sb--rail')).toBeNull()
    expect(container.querySelector('aside.sb')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Sidebar`
Expected: FAIL — `sb--rail` never applied.

- [ ] **Step 3: Add the `rail` prop to `Sidebar.jsx`**

In `src/components/Sidebar.jsx`, add `rail = false,` to the destructured props (after `onClose,` at line 50), and change the `<aside>` className at line 96 from:

```jsx
      <aside className={`sb ${open ? 'is-open' : ''}`}>
```
to:
```jsx
      <aside className={`sb ${open ? 'is-open' : ''} ${rail ? 'sb--rail' : ''}`}>
```

- [ ] **Step 4: Pass `rail` from `LearningLayout.jsx`**

In `src/components/LearningLayout.jsx`, add `rail={active === 'lessons'}` to the `<Sidebar>` props (after the `active={active}` line, ~line 34):

```jsx
        <Sidebar
          userName={userName}
          userLevel={userLevel}
          active={active}
          rail={active === 'lessons'}
          token={token}
          onNav={onNav}
          onProfile={onProfile}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- Sidebar`
Expected: PASS (2 tests).

- [ ] **Step 6: Add rail CSS**

Append to `src/styles.css` (after the calendar CSS from Task 3):

```css
/* Sidebar icon rail — desktop only, used on the Lessons screen. Collapses to
   an icon strip that expands on hover/focus as an overlay, so <main> keeps
   its full width and the calendar does not reflow. */
@media (min-width: 861px) {
  .sb--rail { width: 72px; overflow: visible; transition: width .18s ease; }
  .sb--rail .sb__logo,
  .sb--rail .sb__item span,
  .sb--rail .sb__profile-text,
  .sb--rail .sb__profile-chev,
  .sb--rail .sb__role-text,
  .sb--rail .sb__role-lvl,
  .sb--rail .sb__stat-num { opacity: 0; pointer-events: none; white-space: nowrap; transition: opacity .12s ease; }
  .sb--rail .sb__item { justify-content: center; }
  .sb--rail:hover,
  .sb--rail:focus-within { width: 272px; position: absolute; z-index: 40; height: 100%; box-shadow: 8px 0 24px rgba(20, 16, 31, 0.12); }
  .sb--rail:hover .sb__logo,
  .sb--rail:hover .sb__item span,
  .sb--rail:hover .sb__profile-text,
  .sb--rail:hover .sb__profile-chev,
  .sb--rail:hover .sb__role-text,
  .sb--rail:hover .sb__role-lvl,
  .sb--rail:hover .sb__stat-num,
  .sb--rail:focus-within .sb__logo,
  .sb--rail:focus-within .sb__item span,
  .sb--rail:focus-within .sb__profile-text,
  .sb--rail:focus-within .sb__profile-chev,
  .sb--rail:focus-within .sb__role-text,
  .sb--rail:focus-within .sb__role-lvl,
  .sb--rail:focus-within .sb__stat-num { opacity: 1; pointer-events: auto; }
  .sb--rail:hover .sb__item,
  .sb--rail:focus-within .sb__item { justify-content: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .sb--rail, .sb--rail .sb__item span { transition: none; }
}
```

Note: the `@media (min-width: 861px)` guard keeps the rail desktop-only; below that the existing mobile drawer (`.sb.is-open`) is untouched. If the repo's desktop breakpoint differs from 861px, match the value used by the existing `.sb` mobile media query (styles.css ~line 2266) so rail and drawer never both apply.

- [ ] **Step 7: Verify the mobile breakpoint value**

Run: `grep -nE "max-width:.*\.sb|\.sb \{" src/styles.css | head`
Then confirm the rail's `min-width: 861px` is exactly one pixel above the mobile drawer's `max-width`. If the mobile query is `max-width: 720px`, change the rail guard to `min-width: 721px`. Adjust and re-run `npm test -- Sidebar` (should still PASS).

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.jsx src/components/LearningLayout.jsx src/styles.css src/components/Sidebar.test.jsx
git commit -m "feat(sidebar): collapse to expand-on-hover icon rail on the Lessons screen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Fullscreen on entering/leaving Lessons (App.jsx wiring)

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `requestAppFullscreen`, `exitAppFullscreen` (Task 2). Reads the existing `screen` state to detect leaving Lessons.

This task modifies the large, untested `App.jsx`; verification is a build + focused manual walk-through (the fullscreen logic itself is unit-tested in Task 2).

- [ ] **Step 1: Add the import**

In `src/App.jsx`, after line 51 (`import { getDeviceId, authHeaders } from './lib/identity.js'`), add:

```jsx
import { requestAppFullscreen, exitAppFullscreen } from './lib/fullscreen.js'
```

- [ ] **Step 2: Wire `handleNav` (lines 375–386)**

Change the body of `handleNav` so the first line after the TUTOR_ONLY guard toggles fullscreen. Replace:

```jsx
  function handleNav(key, payload) {
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'learning' || key === 'learn') setScreen('kingdom')
```
with:
```jsx
  function handleNav(key, payload) {
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'lessons') requestAppFullscreen()
    else if (screen === 'lessons') exitAppFullscreen()
    if (key === 'learning' || key === 'learn') setScreen('kingdom')
```

- [ ] **Step 3: Wire `handleTutorNav` (lines 390–399)**

Apply the same toggle in `handleTutorNav`. Replace:

```jsx
  function handleTutorNav(key, tutorHome = 'tutor-dashboard') {
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'learn' || key === 'learning') setScreen('kingdom')
```
with:
```jsx
  function handleTutorNav(key, tutorHome = 'tutor-dashboard') {
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'lessons') requestAppFullscreen()
    else if (screen === 'lessons') exitAppFullscreen()
    if (key === 'learn' || key === 'learning') setScreen('kingdom')
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no new errors referencing `App.jsx` or `fullscreen.js`.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites (existing + Tasks 1–6).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat(lessons): enter fullscreen on nav to Lessons, exit on leaving

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS, no skipped suites.

- [ ] **Step 2: Lint/static check (if configured)**

Run: `npm run lint`
Expected: no new errors from the changed files. (Per project memory the lint config may be pre-broken; if it fails only on pre-existing unrelated issues, note it and continue — do not "fix" unrelated files.)

- [ ] **Step 3: Manual walk-through**

Run: `npm run dev`, open the app, log in, click **Уроки**. Verify, in order:
1. Browser enters fullscreen on the click.
2. The sidebar is a narrow icon rail; hovering/focusing it expands it as an overlay without shifting the calendar.
3. The **Онлайн-уроки** tab shows the summary tiles + a month calendar; today is highlighted; days with lessons show colored dots.
4. Clicking a day shows that day's lessons (or the empty-day message) in the right panel; the join button still opens the lesson.
5. Prev/next month navigates without refetching.
6. Clicking another sidebar item (e.g. **Обучение**) exits fullscreen.
7. On another screen the sidebar is the full fixed column (no rail).

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/lessons-calendar
gh pr create --base develop --title "feat(lessons): month calendar + fullscreen + sidebar rail" --body "$(cat <<'EOF'
## What
Replaces the day-list in Уроки → Онлайн-уроки with a month calendar + selected-day panel, enters real fullscreen when opening Уроки, and collapses the sidebar to an expand-on-hover icon rail while in Уроки.

## Details
- `MonthCalendar` + `DayPanel` reuse `LessonRow`/`ScheduleSummary`; pure date logic in `lessonFormat.js` (unit-tested).
- Fullscreen via a cross-browser helper wired into `App.jsx` nav handlers; iOS Safari → no-op.
- Sidebar rail is a CSS-only collapsed state (`rail` prop), scoped to the Lessons screen.
- No backend/API changes.

## Tests
vitest: `lessonFormat`, `fullscreen`, `MonthCalendar`, `DayPanel`, `LessonSchedule`, `Sidebar`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Month calendar + day panel → Tasks 1, 3, 4, 5. ✓
- Tabs + summary tiles preserved → Task 5 keeps `ScheduleSummary` and the tab shell in `LessonsPage` is untouched. ✓
- Real Fullscreen API on entering Уроки → Tasks 2, 7. ✓
- Icon rail sidebar, Lessons-only → Task 6. ✓
- i18n ru/en/kk → Task 3 Step 1. ✓
- Reused status palette / tokens → Task 3 CSS uses the `.sch-badge--*` colors. ✓
- Tests same-commit → every task commits test + impl together. ✓
- No backend changes → only `src/` client files touched. ✓
- Accessibility (day buttons `aria-selected`/`aria-label`, month-nav labels, focus-within rail, reduced-motion) → Tasks 3, 6. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `occByDay: Map<string, occ[]>` produced by `occurrencesByDayKey` (Task 1) and consumed by `MonthCalendar` (Task 3) and `LessonSchedule` (Task 5). `onSelectDay(dayKey)` fires a string; `selectedDayKey` is a string; `dateFromKey` converts it to a `Date` for `DayPanel`. `rail` boolean produced by `LearningLayout` and consumed by `Sidebar` (Task 6). Consistent. ✓

**Known-open item carried from spec:** if `/admin/lessons/occurrences` returns only upcoming occurrences, past calendar days render empty — accepted, no backend change.
