# Lessons Calendar + Fullscreen + Sidebar Rail — Design

Date: 2026-08-04
Repo: `jts-web-app` (client for dev-tutor.justtostudy.kz)
Base branch: `develop` → feature branch `feat/lessons-calendar` → PR into `develop`
Backend: unchanged (reuse existing endpoints)

## Goal

In the "Уроки" screen, "Онлайн-уроки" tab:

1. Replace the day-grouped lesson list with a **full month calendar + selected-day panel**.
2. On entering the "Уроки" section, put the browser into **real fullscreen** (Fullscreen API).
3. Make the sidebar a **narrow icon rail that expands** — but only inside the "Уроки" section; other sections keep the current fixed sidebar.

Everything currently visible stays: the tabs (Спикинг-клабы / Онлайн-уроки), the summary stat tiles (Проведено / Осталось / Отменено / Перенесено), and the lessons of the selected day (the "Сегодня" cards).

## Current state (develop)

- `src/screens/LessonsPage.jsx` — owns the tab shell, wraps content in `LearningLayout`. `online` tab renders `<LessonSchedule>`.
- `src/screens/schedule/LessonSchedule.jsx` — loads occurrences + summary, groups by day, renders `ScheduleSummary` + day sections of `LessonRow`.
- `src/screens/schedule/ScheduleSummary.jsx` — 4 stat tiles (`conducted`/`remaining`/`cancelled`/`rescheduled`).
- `src/screens/schedule/LessonRow.jsx` — one lesson: time, teacher, status badge, format, join button / "not started" hint.
- `src/screens/schedule/lessonFormat.js` — pure, unit-tested helpers: `parseLessonDate`, `lessonEnd`, `canJoin`, `lessonStateKey`, `dayKey`, `dayLabelKey`, `groupByDay`.
- Data: `getMyLessonOccurrences(token)` → `GET /admin/lessons/occurrences`; `getLessonsSummary(token)` → `GET /admin/lessons/summary` (`src/api.js`).
- Occurrence fields used: `scheduledAt` (zone-less LocalDateTime), `durationMinutes`, `teacherName`, `lessonStatus`, `format`, `lessonId`, `participantId`.
- Status keys (`lessonStateKey`): `inProgress`, `paused`, `completed`, `cancelled`, `overdue`, `scheduled`. Badge colors in `src/styles.css` `.sch-badge--*`.
- App shell: `src/App.jsx` — no router; `screen` string state + `switch`. `handleNav(key)` maps `lessons`→`lessons` screen. `LearningLayout` composes `Sidebar` + `<main>` + `Footer`.
- `src/components/Sidebar.jsx` — fixed `position: sticky` aside, width 272px (`.sb` in styles.css). No collapse logic exists anywhere.
- Design tokens: `:root` in styles.css — `--purple: #9047ff`, `--ink: #171326`, `--muted: #8b8a97`, `--card-radius: 22px`. Plain global CSS, BEM-ish class names, single `styles.css`.
- i18n: `src/i18n.jsx` `dict` (ru/en/kk), `useI18n().t(key, vars)`. `schedule.*` keys already defined (title, today, tomorrow, summary.*, status.*, format.*, join, notStarted, empty, loading, error).
- Tests: **vitest + @testing-library/react + jsdom** (`vitest.config.js`, `npm test` = `vitest run`). Existing tests: `lessonFormat.test.js`, `scheduleApi.test.js`.

## Design

### 1. Calendar (Онлайн-уроки tab)

Keep the existing decomposition; add a calendar layer. `ScheduleSummary`, `LessonRow`, and the `LessonsPage` tab shell stay unchanged.

**`lessonFormat.js` — add pure helpers (unit-tested):**
- `buildMonthMatrix(year, month)` → array of 6 weeks × 7 `Date`s (Monday-first), including leading/trailing days from adjacent months. Each entry `{ date, inMonth: boolean }`.
- `occurrencesByDayKey(occurrences)` → `Map<dayKey, occ[]>`, items within a day sorted ascending by start time (reuse the sort from `groupByDay`).
- `monthShift(year, month, delta)` → `{ year, month }` normalized across year boundaries.

Month title and weekday headers use `Intl.DateTimeFormat(lang, …)` / `toLocaleDateString` (matches existing code), not hardcoded month names.

**`MonthCalendar.jsx` (new):**
- Props: `{ year, month, selectedDayKey, occByDay, onSelectDay, onPrevMonth, onNextMonth }`.
- Renders: month header `‹ {monthLabel} {year} ›` with prev/next `<button>`s; weekday row (Пн…Вс); 6×7 grid of day `<button>`s.
- Each day cell: day number; muted if `!inMonth`; "today" ring; "selected" fill; if the day has occurrences, up to N colored dots (color per `lessonStateKey` via the `.sch-badge--*` palette) + a "+k" overflow.
- Click a day → `onSelectDay(dayKey)`.
- a11y: each day is a `<button aria-selected>` with `aria-label` = full localized date; prev/next buttons have `schedule.prevMonth`/`schedule.nextMonth` aria-labels.

**`DayPanel.jsx` (new):**
- Props: `{ dayDate, items, onOpenLesson }`.
- Heading via existing `dayLabelKey` (today/tomorrow) or localized date.
- Renders the day's `LessonRow` list (reused unchanged), or an empty state (`schedule.dayEmpty`).

**`LessonSchedule.jsx` (refactor into container):**
- Loading of `occ` + `summary` unchanged (same `Promise.all`, same loading/error states).
- Local UI state: `viewYear`/`viewMonth` (default: current month) and `selectedDayKey` (default: today's `dayKey`).
- Build `occByDay = occurrencesByDayKey(occ)` once (memoized).
- Layout: `ScheduleSummary` (unchanged) on top, then a two-column row `MonthCalendar | DayPanel`. On narrow screens (≤ 720px) the columns stack (calendar above, day panel below).
- Prev/next month = local state only; no refetch (occurrence set is small and already client-side).

**Known limitation:** if `/admin/lessons/occurrences` returns only upcoming occurrences, past days render empty. Backend is not changed; this is acceptable.

### 2. Fullscreen on entering "Уроки"

- New helper `src/lib/fullscreen.js`:
  - `isFullscreenSupported()` — feature-detect `requestFullscreen` + vendor-prefixed variants.
  - `requestAppFullscreen()` — call on `document.documentElement` with vendor fallbacks; swallow rejections.
  - `exitAppFullscreen()` — `document.exitFullscreen` + vendor fallbacks; guard on `document.fullscreenElement`.
- Wire in `src/App.jsx` `handleNav(key)` (the click handler — a valid user gesture; a mount `useEffect` would be blocked by the browser):
  - navigating **to** `lessons` → `requestAppFullscreen()`.
  - navigating **away from** `lessons` (previous screen was lessons) → `exitAppFullscreen()`.
- Add a `fullscreenchange` listener so pressing ESC (user-initiated exit) doesn't desync app state; app must not crash or loop.
- iOS Safari (no Fullscreen API) → `requestAppFullscreen` is a no-op; the calendar + rail still work. No in-page immersive fallback in this scope.

### 3. Sidebar icon rail (scoped to "Уроки")

- `LearningLayout.jsx` passes `rail={active === 'lessons'}` to `Sidebar`.
- `Sidebar.jsx` gains a `rail` prop. In rail mode: root gets `sb--rail`; a toggle `<button>` (chevron / hamburger) with `aria-expanded` and `aria-label` (`nav.expandSidebar` / `nav.collapseSidebar`) pins it open.
- CSS `.sb--rail`: width ~64px, icons only, labels/logo-text/profile-text/balance-labels hidden. Expands to full 272px on `:hover`, `:focus-within`, or pinned-open — rendered as an **overlay** (absolute/fixed within the layout) so `<main>` keeps full width and the calendar does not reflow.
- Other screens: `rail` is false → sidebar renders exactly as today.
- a11y: keyboard-focusable rail (focus-within expands, visible focus ring); transitions gated by `prefers-reduced-motion`.

### i18n (add, mirrored ru/en/kk)

- `schedule.prevMonth`, `schedule.nextMonth` — month nav aria-labels.
- `schedule.dayEmpty` — "Нет занятий в этот день".
- `schedule.weekday.mon`…`schedule.weekday.sun` OR derive from `Intl` (prefer `Intl` to avoid new keys; fall back to keys only if `Intl` weekday output is unsatisfactory).
- `nav.expandSidebar`, `nav.collapseSidebar` — rail toggle aria-labels.

## Tests (same commit, vitest + testing-library)

- `lessonFormat.test.js` (extend): `buildMonthMatrix` — month with leading/trailing days, February (non-leap + leap), a month starting on Sunday, a month starting on Monday; `occurrencesByDayKey` grouping + intra-day sort; `monthShift` year rollover both directions.
- `MonthCalendar.test.jsx` (new): renders 42 day cells; marks the correct days with dots for given `occByDay`; clicking a day fires `onSelectDay` with its `dayKey`; today + selected day get their classes; prev/next fire handlers.
- `DayPanel.test.jsx` (new): renders one `LessonRow` per item; shows empty state when items is empty.
- `fullscreen.test.js` (new): `requestAppFullscreen` calls the (mocked) element method; `exitAppFullscreen` guards on `fullscreenElement`; both no-op safely when unsupported.

## Accessibility & states

- Day cells are `<button>` with `aria-selected` and full-date `aria-label`; month nav buttons labelled.
- Designed states: loading, error, empty month, empty day, dark mode.
- Motion: defined duration/easing on the rail expand + calendar transitions; all gated by `prefers-reduced-motion`.
- Palette reused from tokens (`--purple`, `--ink`, `--muted`) and `.sch-badge--*` status colors — no new ad-hoc colors.

## Out of scope

- Backend / API changes (occurrence window, new endpoints).
- Speaking Clubs ("Спикинг-клабы") tab — stays the existing placeholder.
- Rescheduling / booking actions from the calendar (view-only; join uses the existing `onOpenLesson`).
- In-page immersive fallback for browsers without the Fullscreen API.
