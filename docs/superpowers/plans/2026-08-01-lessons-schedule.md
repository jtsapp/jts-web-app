# Lessons Schedule (sub-project #1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the logged-in user's full lesson journal (past + future) at the top of the «Уроки» → «Онлайн» tab in jts-web-app, and make an in-progress lesson clickable to a `live-lesson` screen (placeholder in this sub-project).

**Architecture:** Native React in the existing single-`<App/>` screen state machine. A self-contained `LessonSchedule` block fetches two already-scoped backend endpoints and renders a journal grouped by day; pure formatting/grouping logic lives in a separate testable module. Clicking an in-progress lesson sets a new `live-lesson` screen (real workspace comes in sub-projects #2–6).

**Tech Stack:** Next.js (App renders one client `<App/>`), React 18, plain `fetch` + Bearer (`src/api.js`), i18n via `src/i18n.jsx` (`useI18n().t`), Playwright e2e (`tests/*.spec.js`, backend mocked with `page.route`), Vitest (added here) for pure-function unit tests.

## Global Constraints

- No backend changes. Reuse `GET /admin/lessons/occurrences` and `GET /admin/lessons/summary` (server scopes both to the token's own lessons).
- Auth token lives in `localStorage['jts_access_token']`; session restore is `POST /api/auth/me` `{token}` → `{user}`. Guest (no token) → schedule block not rendered.
- i18n keys MUST be added to all three language blocks in `src/i18n.jsx`: `ru` (starts line 13), `en` (line 305), `kk` (line 595). Kazakh code is `kk`, not `kz`. `t()` supports `{param}` interpolation.
- `scheduledAt` is a zone-less LocalDateTime (`"2026-08-10T11:30:00"`); parse with `new Date(scheduledAt)` so it reads as LOCAL wall-clock (no UTC shift). Never append `Z`.
- Mobile-first. Do NOT modify the «Клубы» tab or the existing modules grid (`ls__grid`).
- Branch `feat/lessons-schedule` off `develop`; PR into `develop` (no direct push). Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Follow existing code style: named `export function` in `api.js`, `.jsx` function components, class-name conventions (`ls__*`, `soon__*`).

---

### Task 1: Pure schedule helpers + Vitest

**Files:**
- Create: `src/screens/schedule/lessonFormat.js`
- Test: `src/screens/schedule/lessonFormat.test.js`
- Modify: `package.json` (add `vitest` devDependency + `"test"` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseLessonDate(scheduledAt: string): Date`
  - `lessonEnd(occ: {scheduledAt, durationMinutes}): Date`
  - `canJoin(lessonStatus: string): boolean`
  - `lessonStateKey(occ, now?: Date): 'inProgress'|'paused'|'scheduled'|'overdue'|'completed'|'cancelled'`
  - `dayKey(date: Date): string` (`"YYYY-MM-DD"`, local)
  - `dayLabelKey(date: Date, now?: Date): 'today'|'tomorrow'|null`
  - `groupByDay(occurrences: object[]): { dayKey: string, date: Date, items: object[] }[]` (day buckets ascending; items ascending by start time)

- [ ] **Step 1: Add Vitest to package.json**

In `package.json`, add to `devDependencies`: `"vitest": "^2.1.0"`, and add to `scripts`: `"test": "vitest run"`. Then run `npm install` in the worktree.

Run: `npm install`
Expected: vitest installed, no errors.

- [ ] **Step 2: Write the failing test**

Create `src/screens/schedule/lessonFormat.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  parseLessonDate, canJoin, lessonStateKey, dayKey, groupByDay,
} from './lessonFormat.js'

describe('lessonFormat', () => {
  it('parseLessonDate reads a naive datetime as local time (no UTC shift)', () => {
    const d = parseLessonDate('2026-08-10T11:30:00')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7) // August
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(11)
    expect(d.getMinutes()).toBe(30)
  })

  it('canJoin is true only for IN_PROGRESS and PAUSED', () => {
    expect(canJoin('IN_PROGRESS')).toBe(true)
    expect(canJoin('PAUSED')).toBe(true)
    expect(canJoin('SCHEDULED')).toBe(false)
    expect(canJoin('COMPLETED')).toBe(false)
    expect(canJoin('CANCELLED')).toBe(false)
  })

  it('lessonStateKey marks a SCHEDULED lesson whose end has passed as overdue', () => {
    const occ = { scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' }
    expect(lessonStateKey(occ, new Date('2026-08-10T13:00:00'))).toBe('overdue')
  })

  it('lessonStateKey keeps a future SCHEDULED lesson as scheduled', () => {
    const occ = { scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' }
    expect(lessonStateKey(occ, new Date('2026-08-10T09:00:00'))).toBe('scheduled')
  })

  it('lessonStateKey passes through live and terminal statuses', () => {
    const base = { scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60 }
    expect(lessonStateKey({ ...base, lessonStatus: 'IN_PROGRESS' })).toBe('inProgress')
    expect(lessonStateKey({ ...base, lessonStatus: 'PAUSED' })).toBe('paused')
    expect(lessonStateKey({ ...base, lessonStatus: 'COMPLETED' })).toBe('completed')
    expect(lessonStateKey({ ...base, lessonStatus: 'CANCELLED' })).toBe('cancelled')
  })

  it('dayKey formats local Y-M-D', () => {
    expect(dayKey(new Date(2026, 7, 1, 3, 9))).toBe('2026-08-01')
  })

  it('groupByDay buckets by local day (ascending) and sorts items by time', () => {
    const occ = [
      { lessonId: 2, scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' },
      { lessonId: 1, scheduledAt: '2026-08-01T03:09:00', durationMinutes: 60, lessonStatus: 'IN_PROGRESS' },
      { lessonId: 3, scheduledAt: '2026-08-10T09:00:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' },
    ]
    const groups = groupByDay(occ)
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-08-01', '2026-08-10'])
    expect(groups[1].items.map((i) => i.lessonId)).toEqual([3, 2])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `lessonFormat.js` does not exist / functions undefined.

- [ ] **Step 4: Implement `lessonFormat.js`**

Create `src/screens/schedule/lessonFormat.js`:

```js
// Pure helpers for the lesson-schedule journal. No network, no React — unit-tested.

// scheduledAt is a zone-less LocalDateTime ("2026-08-10T11:30:00"). new Date() on a
// string without "Z"/offset parses in LOCAL time, which is exactly what we want.
export function parseLessonDate(scheduledAt) {
  return new Date(scheduledAt)
}

export function lessonEnd(occ) {
  const start = parseLessonDate(occ.scheduledAt)
  return new Date(start.getTime() + (occ.durationMinutes || 0) * 60000)
}

export function canJoin(lessonStatus) {
  return lessonStatus === 'IN_PROGRESS' || lessonStatus === 'PAUSED'
}

// Maps backend lessonStatus (+ wall-clock) to an i18n suffix under schedule.status.*.
// A SCHEDULED lesson whose end time is in the past is "overdue" (mirrors web-admin).
export function lessonStateKey(occ, now = new Date()) {
  switch (occ.lessonStatus) {
    case 'IN_PROGRESS': return 'inProgress'
    case 'PAUSED': return 'paused'
    case 'COMPLETED': return 'completed'
    case 'CANCELLED': return 'cancelled'
    case 'SCHEDULED':
    default:
      return lessonEnd(occ) < now ? 'overdue' : 'scheduled'
  }
}

export function dayKey(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

// 'today' | 'tomorrow' | null (null => caller formats the actual date).
export function dayLabelKey(date, now = new Date()) {
  const k = dayKey(date)
  if (k === dayKey(now)) return 'today'
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (k === dayKey(tomorrow)) return 'tomorrow'
  return null
}

// Day buckets ascending by date; items within a day ascending by start time.
export function groupByDay(occurrences) {
  const buckets = new Map()
  for (const occ of occurrences) {
    const d = parseLessonDate(occ.scheduledAt)
    const k = dayKey(d)
    if (!buckets.has(k)) {
      buckets.set(k, { dayKey: k, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [] })
    }
    buckets.get(k).items.push(occ)
  }
  const groups = [...buckets.values()]
  groups.sort((a, b) => a.date - b.date)
  for (const g of groups) {
    g.items.sort((a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt))
  }
  return groups
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `lessonFormat` tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/screens/schedule/lessonFormat.js src/screens/schedule/lessonFormat.test.js
git commit -m "feat(schedule): pure lesson-journal helpers + vitest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: API functions for schedule data

**Files:**
- Modify: `src/api.js` (add two functions next to `getLessonModules`, ~line 121)
- Test: `src/screens/schedule/scheduleApi.test.js`

**Interfaces:**
- Consumes: existing `authGet(path, token)` in `src/api.js` (`fetch(BASE+path, { headers: { Authorization: 'Bearer '+token } })`, returns parsed JSON, throws on network/!ok).
- Produces:
  - `getMyLessonOccurrences(token): Promise<object[]>` → `GET /admin/lessons/occurrences`
  - `getLessonsSummary(token): Promise<{conducted,remaining,cancelled,rescheduled}>` → `GET /admin/lessons/summary`

- [ ] **Step 1: Write the failing test**

Create `src/screens/schedule/scheduleApi.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ lessonId: 14 }] }))
})

describe('schedule api', () => {
  it('getMyLessonOccurrences GETs /admin/lessons/occurrences with a Bearer token', async () => {
    const data = await getMyLessonOccurrences('TOK')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/occurrences')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data).toEqual([{ lessonId: 14 }])
  })

  it('getLessonsSummary GETs /admin/lessons/summary with a Bearer token', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 }) }))
    const data = await getLessonsSummary('TOK')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/summary')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data.remaining).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/screens/schedule/scheduleApi.test.js`
Expected: FAIL — functions not exported from `api.js`.

- [ ] **Step 3: Add the functions to `src/api.js`**

Insert immediately after the `getLessonModules` function (around line 123):

```js
// Расписание вошедшего пользователя. Бэкенд скоупит /admin/lessons* под личность
// токена: ученик/учитель получают только СВОИ занятия (чужие → 400).
export function getMyLessonOccurrences(token) {
  return authGet('/admin/lessons/occurrences', token)
}

export function getLessonsSummary(token) {
  return authGet('/admin/lessons/summary', token)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — schedule api tests green (Task 1 tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/api.js src/screens/schedule/scheduleApi.test.js
git commit -m "feat(schedule): api getMyLessonOccurrences + getLessonsSummary

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Schedule UI, integration, and live-lesson placeholder

**Files:**
- Create: `src/screens/schedule/ScheduleSummary.jsx`
- Create: `src/screens/schedule/LessonRow.jsx`
- Create: `src/screens/schedule/LessonSchedule.jsx`
- Create: `src/screens/LiveLessonPage.jsx`
- Modify: `src/i18n.jsx` (add `schedule.*` + `live.*` to `ru`, `en`, `kk`)
- Modify: `src/styles.css` (append `.sch*` and `.live*` styles)
- Modify: `src/screens/LessonsPage.jsx` (render `<LessonSchedule>` above the grid; accept `onOpenLesson`)
- Modify: `src/App.jsx` (import `LiveLessonPage`; `liveLessonId` state; pass `onOpenLesson`; add `case 'live-lesson'`)
- Test: `tests/lessons-schedule.spec.js` (Playwright, mocked backend)

**Interfaces:**
- Consumes: `getMyLessonOccurrences`, `getLessonsSummary` (Task 2); `groupByDay`, `dayLabelKey`, `parseLessonDate`, `lessonStateKey`, `canJoin` (Task 1); `useI18n()` from `src/i18n.jsx` (returns `{ t, lang }`); `LearningLayout` from `src/components/LearningLayout.jsx`.
- Produces: `<LessonSchedule token onOpenLesson />`; `App` screen `'live-lesson'` driven by `liveLessonId`.

- [ ] **Step 1: Add i18n keys (ru, en, kk)**

In `src/i18n.jsx`, add these keys inside EACH of the three language objects (`ru` after line ~94, `en`, `kk`), next to the existing `lessons.*` keys. Use the translations for the matching language.

RU (in the `ru:` block):
```js
    'schedule.title': 'Мой график',
    'schedule.today': 'Сегодня',
    'schedule.tomorrow': 'Завтра',
    'schedule.summary.conducted': 'Проведено',
    'schedule.summary.remaining': 'Осталось',
    'schedule.summary.cancelled': 'Отменено',
    'schedule.summary.rescheduled': 'Перенесено',
    'schedule.status.inProgress': 'Идёт',
    'schedule.status.paused': 'На паузе',
    'schedule.status.scheduled': 'Запланирован',
    'schedule.status.overdue': 'Просрочен',
    'schedule.status.completed': 'Проведён',
    'schedule.status.cancelled': 'Отменён',
    'schedule.format.online': 'Онлайн',
    'schedule.format.offline': 'Оффлайн',
    'schedule.join': 'Войти в класс',
    'schedule.notStarted': 'Преподаватель ещё не начал урок',
    'schedule.empty': 'Пока нет занятий',
    'schedule.loading': 'Загрузка графика…',
    'schedule.error': 'Не удалось загрузить график',
    'schedule.back': 'Назад',
    'live.wipTitle': 'Живой урок',
    'live.wipSubtitle': 'Урок #{id} — раздел в разработке',
```

EN (in the `en:` block):
```js
    'schedule.title': 'My schedule',
    'schedule.today': 'Today',
    'schedule.tomorrow': 'Tomorrow',
    'schedule.summary.conducted': 'Conducted',
    'schedule.summary.remaining': 'Remaining',
    'schedule.summary.cancelled': 'Cancelled',
    'schedule.summary.rescheduled': 'Rescheduled',
    'schedule.status.inProgress': 'Live',
    'schedule.status.paused': 'Paused',
    'schedule.status.scheduled': 'Scheduled',
    'schedule.status.overdue': 'Overdue',
    'schedule.status.completed': 'Completed',
    'schedule.status.cancelled': 'Cancelled',
    'schedule.format.online': 'Online',
    'schedule.format.offline': 'Offline',
    'schedule.join': 'Join class',
    'schedule.notStarted': 'The teacher has not started the lesson yet',
    'schedule.empty': 'No lessons yet',
    'schedule.loading': 'Loading schedule…',
    'schedule.error': 'Could not load the schedule',
    'schedule.back': 'Back',
    'live.wipTitle': 'Live lesson',
    'live.wipSubtitle': 'Lesson #{id} — under construction',
```

KK (in the `kk:` block):
```js
    'schedule.title': 'Менің кестем',
    'schedule.today': 'Бүгін',
    'schedule.tomorrow': 'Ертең',
    'schedule.summary.conducted': 'Өткізілді',
    'schedule.summary.remaining': 'Қалды',
    'schedule.summary.cancelled': 'Бас тартылды',
    'schedule.summary.rescheduled': 'Ауыстырылды',
    'schedule.status.inProgress': 'Жүріп жатыр',
    'schedule.status.paused': 'Кідіртілді',
    'schedule.status.scheduled': 'Жоспарланған',
    'schedule.status.overdue': 'Мерзімі өтті',
    'schedule.status.completed': 'Өткізілді',
    'schedule.status.cancelled': 'Бас тартылды',
    'schedule.format.online': 'Онлайн',
    'schedule.format.offline': 'Оффлайн',
    'schedule.join': 'Сабаққа кіру',
    'schedule.notStarted': 'Мұғалім сабақты әлі бастаған жоқ',
    'schedule.empty': 'Әзірге сабақтар жоқ',
    'schedule.loading': 'Кесте жүктелуде…',
    'schedule.error': 'Кестені жүктеу мүмкін болмады',
    'schedule.back': 'Артқа',
    'live.wipTitle': 'Тікелей сабақ',
    'live.wipSubtitle': '#{id} сабақ — әзірленуде',
```

- [ ] **Step 2: Add styles**

Append to `src/styles.css`:

```css
/* --- Lesson schedule (Уроки → Онлайн) --- */
.sch { margin: 0 0 20px; }
.sch__title { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
.sch__status { color: #6b7280; font-size: 14px; padding: 8px 0; }
.sch__status--error { color: #c0392b; }
.sch__summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.sch-tile { background: #f4f5f7; border-radius: 12px; padding: 10px; text-align: center; }
.sch-tile__num { font-size: 20px; font-weight: 700; }
.sch-tile__label { font-size: 11px; color: #6b7280; margin-top: 2px; }
.sch__day { margin-bottom: 14px; }
.sch__day-h { font-size: 13px; font-weight: 600; color: #6b7280; margin: 0 0 8px; text-transform: capitalize; }
.sch-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #eceef1; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
.sch-row__time { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 48px; }
.sch-row__main { flex: 1; min-width: 0; }
.sch-row__teacher { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sch-row__meta { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.sch-badge { font-size: 11px; border-radius: 999px; padding: 2px 8px; background: #e6ecff; color: #2b57d6; }
.sch-badge--inProgress, .sch-badge--paused { background: #d3ecff; color: #0b74c4; }
.sch-badge--completed { background: #dcf3e2; color: #2c8a45; }
.sch-badge--overdue { background: #fdecd2; color: #b26a12; }
.sch-badge--cancelled { background: #eceef1; color: #6b7280; }
.sch-row__format { font-size: 11px; color: #6b7280; }
.sch-row__join { background: #7a4dff; color: #fff; border: 0; border-radius: 10px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
.sch-row__hint { font-size: 11px; color: #9aa0a6; max-width: 120px; text-align: right; }
.live { padding: 16px; }
.live__back { background: none; border: 0; color: #7a4dff; font-weight: 600; cursor: pointer; padding: 8px 0; }
@media (max-width: 480px) { .sch__summary { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 3: Create `ScheduleSummary.jsx`**

Create `src/screens/schedule/ScheduleSummary.jsx`:

```jsx
import { useI18n } from '../../i18n.jsx'

export default function ScheduleSummary({ summary }) {
  const { t } = useI18n()
  if (!summary) return null
  const tiles = ['conducted', 'remaining', 'cancelled', 'rescheduled']
  return (
    <div className="sch__summary">
      {tiles.map((key) => (
        <div key={key} className={`sch-tile sch-tile--${key}`}>
          <div className="sch-tile__num">{summary[key] ?? 0}</div>
          <div className="sch-tile__label">{t(`schedule.summary.${key}`)}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `LessonRow.jsx`**

Create `src/screens/schedule/LessonRow.jsx`:

```jsx
import { useI18n } from '../../i18n.jsx'
import { parseLessonDate, lessonStateKey, canJoin } from './lessonFormat.js'

export default function LessonRow({ occ, onOpenLesson }) {
  const { t, lang } = useI18n()
  const time = parseLessonDate(occ.scheduledAt).toLocaleTimeString(lang || 'ru', { hour: '2-digit', minute: '2-digit' })
  const stateKey = lessonStateKey(occ)
  const joinable = canJoin(occ.lessonStatus)
  const format = (occ.format || 'ONLINE').toLowerCase()
  return (
    <div className={`sch-row sch-row--${stateKey}`}>
      <div className="sch-row__time">{time}</div>
      <div className="sch-row__main">
        <div className="sch-row__teacher">{occ.teacherName || '—'}</div>
        <div className="sch-row__meta">
          <span className={`sch-badge sch-badge--${stateKey}`}>{t(`schedule.status.${stateKey}`)}</span>
          <span className="sch-row__format">{t(`schedule.format.${format}`)}</span>
        </div>
      </div>
      {joinable ? (
        <button className="sch-row__join" onClick={() => onOpenLesson(occ.lessonId)}>{t('schedule.join')}</button>
      ) : (
        <span className="sch-row__hint">{t('schedule.notStarted')}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `LessonSchedule.jsx`**

Create `src/screens/schedule/LessonSchedule.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'
import { groupByDay, dayLabelKey } from './lessonFormat.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import LessonRow from './LessonRow.jsx'

export default function LessonSchedule({ token, onOpenLesson }) {
  const { t, lang } = useI18n()
  const [occ, setOcc] = useState([])
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

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

  if (!token) return null

  const groups = groupByDay(occ)
  return (
    <section className="sch">
      <h2 className="sch__title">{t('schedule.title')}</h2>
      {state === 'loading' && <p className="sch__status">{t('schedule.loading')}</p>}
      {state === 'error' && <p className="sch__status sch__status--error">{t('schedule.error')}</p>}
      {state === 'ready' && (
        <>
          <ScheduleSummary summary={summary} />
          {groups.length === 0 && <p className="sch__status">{t('schedule.empty')}</p>}
          {groups.map((g) => {
            const labelKey = dayLabelKey(g.date)
            const heading = labelKey
              ? t(`schedule.${labelKey}`)
              : g.date.toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long', weekday: 'short' })
            return (
              <div key={g.dayKey} className="sch__day">
                <div className="sch__day-h">{heading}</div>
                {g.items.map((o) => (
                  <LessonRow key={o.participantId ?? o.lessonId} occ={o} onOpenLesson={onOpenLesson} />
                ))}
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 6: Create `LiveLessonPage.jsx` (placeholder)**

Create `src/screens/LiveLessonPage.jsx`:

```jsx
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'

export default function LiveLessonPage({ lessonId, userName, userLevel, token, onNav, onProfile, onBack }) {
  const { t } = useI18n()
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="live">
        <button className="live__back" onClick={onBack}>← {t('schedule.back')}</button>
        <div className="soon">
          <div className="soon__text">
            <b>{t('live.wipTitle')}</b>
            <span>{t('live.wipSubtitle', { id: lessonId })}</span>
          </div>
        </div>
      </div>
    </LearningLayout>
  )
}
```

- [ ] **Step 7: Wire `LessonSchedule` into `LessonsPage.jsx`**

In `src/screens/LessonsPage.jsx`:
1. Add import at top: `import LessonSchedule from './schedule/LessonSchedule.jsx'`
2. Change the signature to accept `onOpenLesson`:
   `export default function LessonsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onOpenLesson }) {`
3. Inside the `{tab === 'online' && (` block, render the schedule as the FIRST child of `<div className="ls__body">`, before the loading/error/grid logic:

```jsx
        {tab === 'online' && (
          <div className="ls__body">
            <LessonSchedule token={token} onOpenLesson={onOpenLesson} />
            {loading && <p className="ls__status">{t('lessons.loading')}</p>}
```

(Leave the rest of the `online` block — loading/error/empty/grid — unchanged.)

- [ ] **Step 8: Wire the `live-lesson` screen into `App.jsx`**

In `src/App.jsx`:
1. Add import near the other screen imports (next to `import LessonsPage from './screens/LessonsPage.jsx'`):
   `import LiveLessonPage from './screens/LiveLessonPage.jsx'`
2. Add state next to `const [kingdom, setKingdom] = useState(null)`:
   `const [liveLessonId, setLiveLessonId] = useState(null)`
3. Change the `case 'lessons'` render to pass `onOpenLesson`:

```jsx
    case 'lessons':
      return <LessonsPage userLevel={userLevel} userName={name} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onOpenLesson={(id) => { setLiveLessonId(id); setScreen('live-lesson') }} />
```

4. Add a new case right after `case 'lessons'`:

```jsx
    case 'live-lesson':
      return <LiveLessonPage lessonId={liveLessonId} userName={name} userLevel={userLevel} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onBack={() => setScreen('lessons')} />
```

- [ ] **Step 9: Write the failing e2e test**

Create `tests/lessons-schedule.spec.js`:

```js
import { test, expect } from '@playwright/test'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const OCCURRENCES = [
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-01T03:09:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'IN_PROGRESS', participantStatus: 'SCHEDULED' },
  { lessonId: 13, participantId: 13, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'SCHEDULED', participantStatus: 'SCHEDULED' },
]
const SUMMARY = { conducted: 3, remaining: 2, cancelled: 1, rescheduled: 0 }

test('schedule renders in Уроки and an in-progress lesson opens the live screen', async ({ page }) => {
  // Logged-in session: token in storage + /api/auth/me returns a student user.
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCCURRENCES)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json(SUMMARY)))

  await page.goto('/')
  // Open the «Уроки» section from the nav.
  await page.getByText('Уроки', { exact: true }).first().click()

  // Schedule block is visible with summary + rows.
  await expect(page.getByText('Мой график')).toBeVisible()
  await expect(page.getByText('Test Teacher DEV').first()).toBeVisible()
  await expect(page.getByText('Идёт').first()).toBeVisible()

  // Clicking «Войти в класс» on the in-progress lesson opens the live placeholder.
  await page.getByRole('button', { name: 'Войти в класс' }).first().click()
  await expect(page.getByText('Живой урок')).toBeVisible()
})
```

- [ ] **Step 10: Run the e2e test to verify it fails, then passes**

Run: `npm run test:e2e -- lessons-schedule`
Expected first run (before Steps 1–8 applied): FAIL. After Steps 1–8: PASS.
If a selector (nav label / burger menu on mobile viewport) doesn't match, adjust the navigation click to match the actual shell (open the mobile menu first, or use the `desktop` project: `npm run test:e2e -- --project=desktop lessons-schedule`), then re-run until green. Do not change assertions about the schedule content.

- [ ] **Step 11: Verify the full unit suite still passes**

Run: `npm test`
Expected: PASS — Task 1 + Task 2 unit tests green.

- [ ] **Step 12: Commit**

```bash
git add src/screens/schedule/ScheduleSummary.jsx src/screens/schedule/LessonRow.jsx src/screens/schedule/LessonSchedule.jsx src/screens/LiveLessonPage.jsx src/screens/LessonsPage.jsx src/App.jsx src/i18n.jsx src/styles.css tests/lessons-schedule.spec.js
git commit -m "feat(schedule): show lesson journal in Уроки + live-lesson placeholder

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after Task 3)

Run the dev server and check the real dev backend end-to-end (student Сабина, OTP `0000`):
- `npm run dev`, log in as the student, open «Уроки» → «Онлайн»: the «Мой график» block shows above the module grid with the summary tiles and lesson rows.
- The in-progress lesson shows «Идёт» and «Войти в класс»; clicking opens the live placeholder.
- A future lesson shows «Запланирован» and the «Преподаватель ещё не начал урок» hint (no join button).
- Guest (logged out) sees «Уроки» with NO schedule block (only modules).

## Notes for later sub-projects

- The `live-lesson` screen and `liveLessonId` are the seam for sub-project #2 (live-каркас): replace `LiveLessonPage`'s placeholder body with the real workspace shell (STOMP, presence, status), keeping the same props (`lessonId`, `token`, role from session).
