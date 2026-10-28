# Подбор учителя — сторона ученика (сайт) — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «Мой учитель» в кабинете ученика по ТЗ 08: мастер «Формат → Время → Учитель», подтверждение расписания, «Пусть менеджер подберёт», смена формата и учителя, отпуск учителя, блоки профиля, часовой пояс — поверх бэкенда `modules/matching` v2.

**Architecture:** Чистая логика (`matchingState.js`, `slots.js`, `interests.js`, `texts.js`) под vitest; одна карточка подбора на вкладку в `matchingStore.js` (`useSyncExternalStore`), её читают меню, экраны, профиль и окна. Экраны — `MyTeacherPage`, `TeacherWizardPage`, `TeacherPickPage` в стейт-машине `App.jsx`. Вёрстка — по прототипу `data/jts-student-matching.html` (в шагах указаны его функции и строки), стили — `src/matching.css` с префиксом `mt-`.

**Tech Stack:** Next.js (App Router как оболочка), React 19, JS (не TS), vitest + Testing Library, Playwright.

**Спека:** `docs/superpowers/specs/2026-10-26-student-teacher-matching-design.md`. **Бэкенд:** план `docs/superpowers/plans/2026-10-26-student-matching-v2-backend.md` в worktree `C:\Users\nural\Desktop\backend-student-matching` (ветка `feat/student-matching-v2`).

## Global Constraints

- Worktree `C:\Users\nural\Desktop\jts-student-matching`, ветка `feat/student-teacher-matching` от `origin/develop` (локальный develop отстаёт на 72 коммита — в основной папке не работать).
- JavaScript, не TypeScript. Комментарии по-русски и про «почему».
- Тексты раздела — `src/matching/texts.js` (ru / kk / en, одинаковые ключи); в `src/i18n.jsx` только `nav.myTeacher` (ru «Мой учитель», en «My teacher», kk «Менің мұғалімім»).
- Стили — только `src/matching.css`, классы `mt-*`, без CSS-модулей; цвета токенами `--mt-*` на корне `.mt`, тёмная тема — блоком в `src/theme-dark.css` на токенах `--dk-*` (литеральный HEX в тёмной правке запрещён). Новых `font-family` нет (иначе `kkFont.test.js`).
- Тариф (направление, гарантия, длительность, уроков в неделю) ученик только видит — ни одного переключателя.
- Нигде нет «Написать в чат», телефона и почты учителя.
- Время на экране — в поясе ученика (`card.timezone` → пояс устройства), на сервер — UTC-слоты `{weekday: 1–7, start: 'HH:MM:SS'}`. Сроки бэкенда (`deadline`, `expiresAt`, `holdUntil`) — LocalDateTime школы (Алматы, UTC+5).
- «Разные дни» считаются по дню школы (как `MatchingSlots.validate` на сервере).
- Ширина 360 px — без горизонтального скролла страницы; сетка времени скроллится внутри своего блока.
- Проверка: `npm run build`, `npm run lint`, `npx vitest run src/matching src/components src/lib src/screens` (весь `npm test` видит чужие worktree — память vitest-scans-worktrees), `npx playwright test tests/student-matching.spec.js --workers=1`.

---

### Task 1: API и стор карточки

**Files:**
- Modify: `src/api.js` (рядом с `getMatchingCase`, ~791)
- Create: `src/matching/matchingStore.js`
- Test: `src/matching/matchingStore.test.js`

**Interfaces:**
- Produces:
  - `api.js`: `getStudentMatching(token) → Promise<{status:'ready', card} | {status:'not_added'} | {status:'unavailable'}>`; `getMatchingGrid(token, format?)`; `getMatchingTeachers(token)` (`GET /student/matching/candidates`); `getMatchingTeacher(token, id)`; `getMatchingTeacherPhoto(token, id) → Promise<Blob|null>`; `saveMatchingInterests(token, interests)`; `saveMatchingTimezone(token, tz)`; `changeMatchingFormat(token, format)`; `counterMatchingSchedule(token, slots)`; `reconfirmMatchingSchedule(token)`; `patchMatchingWish(token, wish)`. Прежние `saveMatchingPreferences`, `askMatchingManager`, `sendMatchingRequests`, `confirmMatchingSchedule`, `requestTeacherChange`, `getMatchingHandoffs`, `chooseMatchingHandoff` остаются.
  - `matchingStore.js`: `useMatching(token) → {status, card, handoffs, refresh}`; `refreshMatching(token) → Promise<void>`; `applyMatchingCard(card)`; `getMatchingSnapshot()`; `resetMatchingStore()` (для тестов и выхода).

- [ ] **Step 1: Падающий тест**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api.js', () => ({
  getStudentMatching: vi.fn(),
  getMatchingHandoffs: vi.fn(async () => []),
}))
import { getStudentMatching, getMatchingHandoffs } from '../api.js'
import { refreshMatching, getMatchingSnapshot, applyMatchingCard, resetMatchingStore } from './matchingStore.js'

describe('matchingStore', () => {
  beforeEach(() => { resetMatchingStore(); vi.clearAllMocks() })

  it('keeps the card and pending handoffs of the token', async () => {
    getStudentMatching.mockResolvedValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'self' } })
    getMatchingHandoffs.mockResolvedValue([{ id: 4, status: 'PENDING' }])
    await refreshMatching('t1')
    const s = getMatchingSnapshot()
    expect(s.status).toBe('ready')
    expect(s.card.matchStatus).toBe('self')
    expect(s.handoffs).toHaveLength(1)
  })

  it('treats an old backend card without apiVersion as unavailable', async () => {
    getStudentMatching.mockResolvedValue({ status: 'ready', card: { matchStatus: 'self' } })
    await refreshMatching('t1')
    expect(getMatchingSnapshot().status).toBe('unavailable')
  })

  it('does not let a late answer for an old token overwrite the new one', async () => {
    let release
    getStudentMatching.mockImplementationOnce(() => new Promise((r) => { release = r }))
    const old = refreshMatching('old')
    getStudentMatching.mockResolvedValueOnce({ status: 'not_added' })
    await refreshMatching('new')
    release({ status: 'ready', card: { apiVersion: 2, matchStatus: 'done' } })
    await old
    expect(getMatchingSnapshot()).toMatchObject({ token: 'new', status: 'not_added' })
  })

  it('applies a card returned by an action without a new request', () => {
    applyMatchingCard({ apiVersion: 2, matchStatus: 'sent' })
    expect(getMatchingSnapshot().card.matchStatus).toBe('sent')
  })
})
```

- [ ] **Step 2: `npx vitest run src/matching/matchingStore.test.js`** → FAIL (модуля нет).

- [ ] **Step 3: API** (`src/api.js`, после блока `getMatchingCase…`):

```js
// Подбор учителя v2 (спека 2026-10-26-student-teacher-matching-design.md). Карточку читаем своим fetch:
// 404 бывает двух видов — «ученика нет в подборе» (тело с code: 'not_added', нужен абонемент) и «ручки на стенде
// нет» (старый бэкенд), и только тело их различает; authGet тело у 404 не читает.
export async function getStudentMatching(token) {
  let res
  try {
    res = await fetch(BASE + '/student/matching', { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    return { status: 'unavailable' }
  }
  if (res.status === 401) reportUnauthorized(token)
  if (res.ok) return { status: 'ready', card: await res.json() }
  if (res.status === 404) {
    const body = await res.json().catch(() => null)
    if (body?.code === 'not_added') return { status: 'not_added' }
  }
  return { status: 'unavailable' }
}
export const getMatchingGrid = (token, format) =>
  authGet('/student/matching/grid' + (format ? '?format=' + encodeURIComponent(format) : ''), token)
export const getMatchingTeachers = (token) => authGet('/student/matching/candidates', token)
export const getMatchingTeacher = (token, id) => authGet(`/student/matching/teachers/${id}`, token)
// Фото — картинкой с токеном, поэтому не <img src>: blob и object URL (кэш — в TeacherPhoto).
export async function getMatchingTeacherPhoto(token, id) {
  try {
    const res = await fetch(`${BASE}/student/matching/teachers/${id}/photo`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}
export const saveMatchingInterests = (token, interests) => authPut('/student/matching/interests', token, { interests })
export const saveMatchingTimezone = (token, timezone) => authPut('/student/matching/timezone', token, { timezone })
export const changeMatchingFormat = (token, format) => authPost('/student/matching/format', token, { format })
export const counterMatchingSchedule = (token, slots) => authPost('/student/matching/counter', token, { slots })
export const reconfirmMatchingSchedule = (token) => authPost('/student/matching/reconfirm', token, {})
export const patchMatchingWish = (token, wish) => authPatch('/student/matching/ask-manager', token, { wish })
```

- [ ] **Step 4: Стор** (`src/matching/matchingStore.js`):

```js
import { useEffect, useSyncExternalStore } from 'react'
import { getStudentMatching, getMatchingHandoffs } from '../api.js'

// Одна карточка подбора на вкладку. Её читают меню (бейдж), «Мой учитель», профиль и окна при входе — каждый
// своим запросом это был бы десяток одинаковых обращений на каждую смену экрана. Опрос раз в 30 с — пока хоть
// кто-то подписан (ТЗ 2.1.1: тариф подтвердили, пока ученик на экране, — кнопка должна ожить без перезагрузки).
const POLL_MS = 30000
const EMPTY = { token: null, status: 'idle', card: null, handoffs: [] }
let snap = EMPTY
const listeners = new Set()
let users = 0
let timer = null

function emit(next) {
  snap = next
  listeners.forEach((fn) => fn())
}

export function getMatchingSnapshot() {
  return snap
}

export function resetMatchingStore() {
  clearInterval(timer)
  timer = null
  users = 0
  snap = EMPTY
}

export async function refreshMatching(token) {
  if (!token) return emit(EMPTY)
  if (snap.token !== token) emit({ ...EMPTY, token, status: 'loading' })
  const res = await getStudentMatching(token)
  if (snap.token !== token) return // ответ для прежнего входа
  if (res.status !== 'ready' || !(res.card?.apiVersion >= 2)) {
    return emit({ token, status: res.status === 'not_added' ? 'not_added' : 'unavailable', card: null, handoffs: [] })
  }
  const handoffs = await getMatchingHandoffs(token).catch(() => [])
  if (snap.token !== token) return
  emit({ token, status: 'ready', card: res.card, handoffs: Array.isArray(handoffs) ? handoffs : [] })
}

// Ответ действия (подтвердил, отправил заявки) — это уже свежая карточка: показываем её сразу.
export function applyMatchingCard(card) {
  if (card) emit({ ...snap, status: 'ready', card })
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useMatching(token) {
  const state = useSyncExternalStore(subscribe, getMatchingSnapshot, () => EMPTY)
  useEffect(() => {
    if (!token) return undefined
    users += 1
    if (snap.token !== token || snap.status === 'idle') refreshMatching(token)
    if (!timer) timer = setInterval(() => refreshMatching(snap.token), POLL_MS)
    return () => {
      users -= 1
      if (users <= 0) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [token])
  return { ...state, refresh: () => refreshMatching(token) }
}
```

- [ ] **Step 5: Прогон** → PASS. **Step 6: Commit** — `git commit -m "feat(matching): API v2 и общий стор карточки подбора"`

---

### Task 2: Статус ученика из карточки

**Files:**
- Create: `src/matching/matchingState.js`
- Test: `src/matching/matchingState.test.js`

**Interfaces:**
- Consumes: снимок стора `{status, card, handoffs}`.
- Produces: `matchingView(snap, now = new Date()) → View`, где
  `View = {status, badge, needsFormatStep, tariff: {name, guarantee, duration, perWeek, confirmed}, allDeclined, changeApproved, proposal, counter, requests, managerRequest, assignment, vacation, temporary, paused, change, limits}`;
  `status ∈ 'idle'|'loading'|'unavailable'|'no_subscription'|'tariff_pending'|'manager_picking'|'none'|'matching'|'schedule_proposed'|'change_requested'|'confirm_expired'|'change_pending'|'assigned'`;
  `popupFor(view) → {kind: 'proposal'|'all_declined'|'expired'|'approved'|'vacation', key: string} | null`;
  `needsTeacherPick(view) → boolean` (онбординг: статус `tariff_pending` или `none` без учителя).

- [ ] **Step 1: Падающие тесты** — по строке на каждую строку таблицы §2 спеки:

```js
import { describe, it, expect } from 'vitest'
import { matchingView, popupFor, needsTeacherPick } from './matchingState.js'

const now = new Date('2026-10-26T10:00:00Z')
const base = {
  apiVersion: 2, matchStatus: 'self', tariff: 'General', lessonDuration: 60, lessonsPerWeek: 2,
  guarantee: false, tariffConfirmed: true, requests: [], availableSlots: [], interests: [],
  proposedSlots: [], finalSlots: [], teacherChangesLeft: 2,
}
const view = (card, extra = {}) => matchingView({ status: 'ready', card: { ...base, ...card }, handoffs: [], ...extra }, now)

describe('matchingView', () => {
  it('maps store states without a card', () => {
    expect(matchingView({ status: 'not_added' }).status).toBe('no_subscription')
    expect(matchingView({ status: 'unavailable' }).status).toBe('unavailable')
  })
  it('tariff pending vs manager asked before tariff', () => {
    expect(view({ matchStatus: 'tariff', tariffConfirmed: false }).status).toBe('tariff_pending')
    expect(view({ matchStatus: 'tariff', tariffConfirmed: false, askedAt: '2026-10-26T12:00:00' }).status).toBe('manager_picking')
    expect(view({ matchStatus: 'ask' }).status).toBe('manager_picking')
  })
  it('self and recoverable help are "none" with a badge', () => {
    const v = view({ matchStatus: 'self' })
    expect(v).toMatchObject({ status: 'none', badge: 1 })
    expect(view({ matchStatus: 'help', reasonCode: 'all_declined' })).toMatchObject({ status: 'none', allDeclined: true })
    expect(view({ matchStatus: 'help', reasonCode: 'choose_timeout' }).status).toBe('none')
  })
  it('sent → matching with per-teacher statuses', () => {
    const v = view({ matchStatus: 'sent', requests: [
      { teacherId: 3, teacherName: 'Айгерим', priority: 1, status: 'sent', source: 'student', expiresAt: '2026-10-26T26:00:00' },
      { teacherId: 4, teacherName: 'Данияр', priority: 2, status: 'declined', source: 'student' },
    ] })
    expect(v.status).toBe('matching')
    expect(v.requests.map((r) => r.state)).toEqual(['waiting', 'declined'])
    expect(v.badge).toBe(0)
  })
  it('confirm → schedule_proposed, by manager or teacher; counter → change_requested', () => {
    const proposal = { matchStatus: 'confirm', assignedTeacherId: 3, assignedTeacherName: 'Айгерим', deadline: '2026-10-27T15:00:00',
      proposedSlots: [{ weekday: 1, start: '14:00:00' }],
      requests: [{ teacherId: 3, status: 'schedule_proposed', source: 'manager_proposal', availableSlots: [{ weekday: 1, start: '14:00:00' }] }] }
    const v = view(proposal)
    expect(v).toMatchObject({ status: 'schedule_proposed', badge: 1 })
    expect(v.proposal.by).toBe('manager')
    const c = view({ ...proposal, requests: [...proposal.requests, { teacherId: 3, status: 'sent', source: 'student_counter', expiresAt: '2026-10-26T22:00:00', proposedSlots: [] }] })
    expect(c.status).toBe('change_requested')
  })
  it('expired confirmation', () => {
    expect(view({ matchStatus: 'help', reasonCode: 'confirm_expired' })).toMatchObject({ status: 'confirm_expired', badge: 1 })
  })
  it('assigned, change pending, vacation badge', () => {
    expect(view({ matchStatus: 'done', assignedTeacherId: 3 }).status).toBe('assigned')
    expect(view({ matchStatus: 'change' }).status).toBe('change_pending')
    const v = view({ matchStatus: 'done', assignedTeacherId: 3 }, {
      handoffs: [{ id: 9, teacherName: 'Айгерим', dateFrom: '2026-11-02', dateTo: '2026-11-15', studentChoice: null }],
    })
    expect(v.vacation.id).toBe(9)
    expect(v.badge).toBe(1)
  })
  it('format step is skipped for guarantee, IELTS and SAT', () => {
    expect(view({}).needsFormatStep).toBe(true)
    expect(view({ guarantee: true }).needsFormatStep).toBe(false)
    expect(view({ tariff: 'IELTS' }).needsFormatStep).toBe(false)
    expect(view({ tariff: 'SAT' }).needsFormatStep).toBe(false)
  })
})

describe('popupFor', () => {
  it('one key per event', () => {
    const v = view({ matchStatus: 'confirm', deadline: '2026-10-27T15:00:00', proposedSlots: [], requests: [] })
    expect(popupFor(v)).toEqual({ kind: 'proposal', key: 'proposal:2026-10-27T15:00:00' })
    expect(popupFor(view({ matchStatus: 'self' }))).toBeNull()
  })
})

describe('needsTeacherPick', () => {
  it('only before a teacher exists', () => {
    expect(needsTeacherPick(view({ matchStatus: 'self' }))).toBe(true)
    expect(needsTeacherPick(view({ matchStatus: 'tariff', tariffConfirmed: false }))).toBe(true)
    expect(needsTeacherPick(view({ matchStatus: 'sent' }))).toBe(false)
  })
})
```

- [ ] **Step 2: Прогон** → FAIL.

- [ ] **Step 3: Реализация** (`src/matching/matchingState.js`):

```js
// Статус ученика в подборе — не хранится на сайте, а выводится из карточки бэкенда (спека §2): тогда меню,
// «Мой учитель», профиль и окна при входе не могут разойтись между собой.

const NO_FORMAT_TARIFFS = new Set(['IELTS', 'SAT'])
const LIVE_REQUEST = new Set(['sent'])

function requestState(r) {
  if (r.status === 'sent') return 'waiting'
  if (r.status === 'schedule_proposed' || r.status === 'schedule_confirmed') return 'accepted'
  if (r.status === 'declined') return 'declined'
  if (r.status === 'expired') return 'expired'
  return 'cancelled'
}

function statusOf(card) {
  const s = card.matchStatus
  if (s === 'tariff') return card.askedAt ? 'manager_picking' : card.tariffConfirmed ? 'none' : 'tariff_pending'
  if (s === 'ask') return 'manager_picking'
  if (s === 'self') return 'none'
  if (s === 'help') return card.reasonCode === 'confirm_expired' ? 'confirm_expired' : 'none'
  if (s === 'sent') return 'matching'
  if (s === 'confirm') {
    const counter = (card.requests || []).some((r) => r.source === 'student_counter' && LIVE_REQUEST.has(r.status))
    return counter ? 'change_requested' : 'schedule_proposed'
  }
  if (s === 'change') return 'change_pending'
  if (s === 'done') return 'assigned'
  return 'none'
}

export function matchingView(snap, now = new Date()) {
  if (!snap || snap.status === 'idle' || snap.status === 'loading') return { status: snap?.status || 'idle', badge: 0 }
  if (snap.status === 'not_added') return { status: 'no_subscription', badge: 0 }
  if (snap.status !== 'ready' || !snap.card) return { status: 'unavailable', badge: 0 }
  const card = snap.card
  const status = statusOf(card)
  const requests = (card.requests || [])
    .filter((r) => r.source === 'student' || r.source === 'manager_proposal' || r.source === 'manager_assigned')
    .map((r) => ({ ...r, state: requestState(r) }))
    .sort((a, b) => a.priority - b.priority)
  const proposedReq = (card.requests || []).find((r) => r.status === 'schedule_proposed')
  const counterReq = (card.requests || []).find((r) => r.source === 'student_counter' && LIVE_REQUEST.has(r.status))
  const vacationHandoff = (snap.handoffs || []).find((h) => !h.studentChoice)
  const pauseHandoff = (snap.handoffs || []).find((h) => h.studentChoice === 'pause')
  const today = now.toISOString().slice(0, 10)
  const temporary = card.temporaryFrom && card.temporaryTo && card.temporaryFrom <= today && today <= card.temporaryTo
    ? { from: card.temporaryFrom, to: card.temporaryTo, teacherName: card.assignedTeacherName }
    : null
  const proposal = (status === 'schedule_proposed' || status === 'change_requested' || status === 'confirm_expired')
    ? {
        teacherId: card.assignedTeacherId ?? proposedReq?.teacherId ?? null,
        teacherName: card.assignedTeacherName ?? proposedReq?.teacherName ?? '',
        slots: card.proposedSlots || [],
        deadline: card.deadline || null,
        by: String(proposedReq?.source || '').startsWith('manager') ? 'manager' : 'teacher',
        commonSlots: proposedReq?.availableSlots || [],
      }
    : null
  const badge = status === 'none' || status === 'schedule_proposed' || status === 'confirm_expired'
    || (status === 'assigned' && vacationHandoff) ? 1 : 0
  return {
    status,
    badge,
    needsFormatStep: !card.guarantee && !NO_FORMAT_TARIFFS.has(card.tariff),
    tariff: { name: card.tariff, guarantee: !!card.guarantee, duration: card.lessonDuration, perWeek: card.lessonsPerWeek, confirmed: !!card.tariffConfirmed },
    allDeclined: card.matchStatus === 'help' && card.reasonCode === 'all_declined',
    changeApproved: card.excludedTeacherId != null && status === 'none',
    proposal,
    counter: counterReq ? { slots: counterReq.proposedSlots || [], expiresAt: counterReq.expiresAt } : null,
    requests,
    managerRequest: status === 'manager_picking' ? { managerName: card.responsibleManagerName, wish: card.wish, dueAt: card.deadline, slots: card.availableSlots || [] } : null,
    assignment: status === 'assigned' || status === 'change_pending'
      ? { teacherId: card.assignedTeacherId, teacherName: card.assignedTeacherName, slots: card.finalSlots || [], format: card.format, duration: card.lessonDuration }
      : null,
    vacation: vacationHandoff ? { id: vacationHandoff.id, teacherName: vacationHandoff.teacherName, from: vacationHandoff.dateFrom, to: vacationHandoff.dateTo } : null,
    temporary,
    paused: pauseHandoff ? { from: pauseHandoff.dateFrom, to: pauseHandoff.dateTo } : null,
    change: card.change || null,
    limits: { formatChangeAvailableAt: card.formatChangeAvailableAt || null, teacherChangesLeft: card.teacherChangesLeft ?? 2 },
  }
}

// Окно при входе — только там, где ждут действия (ТЗ 2.12), и одно на событие: ключ несёт срок или id события,
// поэтому новое предложение после «другого времени» снова покажет окно, а повторный заход — нет.
export function popupFor(v) {
  if (!v) return null
  if (v.status === 'schedule_proposed') return { kind: 'proposal', key: 'proposal:' + (v.proposal?.deadline || '') }
  if (v.status === 'confirm_expired') return { kind: 'expired', key: 'expired:' + (v.proposal?.deadline || '') }
  if (v.allDeclined) return { kind: 'all_declined', key: 'declined:' + v.requests.map((r) => r.id).join(',') }
  if (v.changeApproved && v.change?.id) return { kind: 'approved', key: 'approved:' + v.change.id }
  if (v.vacation) return { kind: 'vacation', key: 'vacation:' + v.vacation.id }
  return null
}

export function needsTeacherPick(v) {
  return v?.status === 'tariff_pending' || v?.status === 'none'
}
```

- [ ] **Step 4: Прогон** → PASS. **Step 5: Commit** — `git commit -m "feat(matching): статус ученика из карточки подбора"`

---

### Task 3: Слоты, интересы, тексты

**Files:**
- Modify: `src/matching/slots.js` (переписать: старые `localSlot/slotDate/sameSlot` нужны только удаляемой панели)
- Create: `src/matching/interests.js`, `src/matching/texts.js`
- Test: `src/matching/slots.test.js`, `src/matching/interests.test.js`, `src/matching/texts.test.js`

**Interfaces:**
- Produces:
  - `slots.js`: `deviceTimezone()`, `studentTimezone(card)`, `zoneOffsetMin(tz, at?)`, `gridRows(duration) → number[]` (минуты суток 420…1320), `toUtcSlot(day, minutes, tz, at?) → Slot`, `localOf(slot, tz, at?) → {day, minutes}`, `slotKey(slot) → 'w-HH:MM'`, `sameSlot(a, b)`, `schoolDay(slot) → 1..7`, `schoolDaysCount(slots)`, `teachersFitting(cells, pickedKeys, n) → number[]`, `fitSlotsOf(cells, teacherId, pickedKeys) → Slot[]`, `bestCells(cells, pickedKeys, k=10) → string[]`, `hhmm(minutes)`, `schoolTimeToDate(localDateTime) → Date`.
  - `interests.js`: `INTEREST_CATS: Array<{id, items: string[]}>` (значения — русские названия из ТЗ §2.4, они же уходят на сервер), `MAX_INTERESTS = 5`, `toggleInterest(list, item) → {list, error: 'limit'|null}`.
  - `texts.js`: `useMatchingT() → (key, vars?) => string`, `matchingText(lang, key, vars?)`, `TEXTS = {ru, kk, en}`, `dayShort(lang, day)`, `interestLabel(lang, item)`, `formatName(lang, code)`.

- [ ] **Step 1: Падающие тесты**

```js
// slots.test.js
import { describe, it, expect } from 'vitest'
import { gridRows, toUtcSlot, localOf, schoolDay, schoolDaysCount, teachersFitting, bestCells, slotKey, zoneOffsetMin } from './slots.js'

const at = new Date('2026-10-26T10:00:00Z')
describe('slots', () => {
  it('grid rows: hourly for 60, half-hourly for 30, 07:00–22:00', () => {
    expect(gridRows(60)[0]).toBe(420)
    expect(gridRows(60).at(-1)).toBe(1320)
    expect(gridRows(60)).toHaveLength(16)
    expect(gridRows(30)).toHaveLength(31)
  })
  it('converts day and time together across midnight', () => {
    expect(zoneOffsetMin('Asia/Almaty', at)).toBe(300)
    expect(toUtcSlot(1, 7 * 60, 'Asia/Seoul', at)).toEqual({ weekday: 7, start: '22:00:00' }) // пн 07:00 Сеул = вс 22:00 UTC
    expect(toUtcSlot(1, 19 * 60, 'Europe/Moscow', at)).toEqual({ weekday: 1, start: '16:00:00' })
    expect(localOf({ weekday: 7, start: '22:00:00' }, 'Asia/Seoul', at)).toEqual({ day: 1, minutes: 420 })
  })
  it('counts different days by the school (Almaty) day', () => {
    expect(schoolDay({ weekday: 1, start: '20:00:00' })).toBe(2) // 01:00 вт в Алматы
    expect(schoolDaysCount([{ weekday: 1, start: '14:00:00' }, { weekday: 1, start: '15:00:00' }])).toBe(1)
  })
  it('teachersFitting needs N school days of picked slots', () => {
    const cells = [
      { weekday: 1, start: '14:00:00', teacherIds: [3, 4] },
      { weekday: 3, start: '14:00:00', teacherIds: [3] },
    ]
    const picked = cells.map(slotKey)
    expect(teachersFitting(cells, picked, 2)).toEqual([3])
    expect(bestCells(cells, [], 1)).toEqual(['1-14:00'])
  })
})

// interests.test.js
import { toggleInterest, INTEREST_CATS } from './interests.js'
it('caps interests at five and keeps six categories', () => {
  expect(INTEREST_CATS).toHaveLength(6)
  let list = ['Аниме', 'K-pop', 'Музыка', 'Игры', 'Книги']
  expect(toggleInterest(list, 'Наука')).toEqual({ list, error: 'limit' })
  expect(toggleInterest(list, 'Аниме').list).toHaveLength(4)
})

// texts.test.js
import { TEXTS } from './texts.js'
it('ru, kk and en have the same keys', () => {
  const keys = (o) => Object.keys(o).sort()
  expect(keys(TEXTS.kk)).toEqual(keys(TEXTS.ru))
  expect(keys(TEXTS.en)).toEqual(keys(TEXTS.ru))
})
```

- [ ] **Step 2: Прогон** → FAIL.

- [ ] **Step 3: `slots.js`**

```js
// Недельные слоты подбора хранятся в UTC (MatchingDtos.Slot бэкенда): ISO-день 1–7 + время. Ученик видит их в
// своём поясе, поэтому день и время переводятся ВМЕСТЕ — 07:00 понедельника в Сеуле это 22:00 воскресенья UTC.
const WEEK = 7 * 1440
const SCHOOL_OFFSET = 300 // Алматы, UTC+5 (Казахстан один пояс с 2024 г.)

export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Almaty'
  } catch {
    return 'Asia/Almaty'
  }
}

export function studentTimezone(card) {
  return card?.timezone || deviceTimezone()
}

// Смещение пояса в минутах на момент `at`: Intl отдаёт стеночное время пояса, разница с UTC и есть смещение.
export function zoneOffsetMin(tz, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(at).map((p) => [p.type, p.value]),
  )
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
  return Math.round((wall - Math.floor(at.getTime() / 60000) * 60000) / 60000)
}

export function hhmm(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
}

const weekMinutes = (slot) => (slot.weekday - 1) * 1440 + Number(slot.start.slice(0, 2)) * 60 + Number(slot.start.slice(3, 5))
const fromWeekMinutes = (m) => {
  const x = ((m % WEEK) + WEEK) % WEEK
  return { weekday: Math.floor(x / 1440) + 1, start: hhmm(x % 1440) + ':00' }
}

export function gridRows(duration) {
  const step = duration === 30 ? 30 : 60
  const out = []
  for (let m = 7 * 60; m <= 22 * 60; m += step) out.push(m)
  return out
}

export function toUtcSlot(day, minutes, tz, at = new Date()) {
  return fromWeekMinutes((day - 1) * 1440 + minutes - zoneOffsetMin(tz, at))
}

export function localOf(slot, tz, at = new Date()) {
  const x = (((weekMinutes(slot) + zoneOffsetMin(tz, at)) % WEEK) + WEEK) % WEEK
  return { day: Math.floor(x / 1440) + 1, minutes: x % 1440 }
}

export const slotKey = (s) => `${s.weekday}-${s.start.slice(0, 5)}`
export const sameSlot = (a, b) => slotKey(a) === slotKey(b)

// «Разные дни» — по дню школы, тем же правилом, что MatchingSlots.validate: иначе кнопка разрешала бы набор,
// который сервер отвергнет у ученика рядом с полуночью.
export function schoolDay(slot) {
  return Math.floor((((weekMinutes(slot) + SCHOOL_OFFSET) % WEEK) + WEEK) % WEEK / 1440) + 1
}

export function schoolDaysCount(slots) {
  return new Set(slots.map(schoolDay)).size
}

export function fitSlotsOf(cells, teacherId, pickedKeys) {
  const picked = new Set(pickedKeys)
  return cells.filter((c) => picked.has(slotKey(c)) && c.teacherIds.includes(teacherId))
    .map(({ weekday, start }) => ({ weekday, start }))
}

// Учитель подходит, если свободен в отмеченное время хотя бы в N разных днях (ТЗ §2.3).
export function teachersFitting(cells, pickedKeys, n) {
  const ids = new Set(cells.flatMap((c) => c.teacherIds))
  return [...ids].filter((id) => schoolDaysCount(fitSlotsOf(cells, id, pickedKeys)) >= n).sort((a, b) => a - b)
}

// «Подсвечены часы, где учителей больше всего» (ТЗ §2.3, «Подходит 0»).
export function bestCells(cells, pickedKeys, k = 10) {
  const picked = new Set(pickedKeys)
  return cells.filter((c) => !picked.has(slotKey(c)) && c.teacherIds.length)
    .sort((a, b) => b.teacherIds.length - a.teacherIds.length || weekMinutes(a) - weekMinutes(b))
    .slice(0, k).map(slotKey)
}

// Сроки бэкенда — LocalDateTime школы без пояса.
export function schoolTimeToDate(local) {
  if (!local) return null
  const d = new Date(String(local).slice(0, 19) + '+05:00')
  return Number.isNaN(d.getTime()) ? null : d
}
```

`interests.js` — категории ТЗ §2.4 дословно; `texts.js` — словарь всех строк раздела (снять из ТЗ §2 и прототипа; ru — как в ТЗ, en/kk — перевод; казахский — без русских слов вперемешку) и:

```js
import { useI18n } from '../i18n.jsx'
export function matchingText(lang, key, vars) {
  let s = (TEXTS[lang] && TEXTS[lang][key]) ?? TEXTS.ru[key] ?? key
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k])
  return s
}
export function useMatchingT() {
  const { lang } = useI18n()
  return (key, vars) => matchingText(lang, key, vars)
}
```

- [ ] **Step 4: Прогон** → PASS. **Step 5: Commit** — `git commit -m "feat(matching): слоты в поясе ученика, интересы, тексты ru/kk/en"`

---

### Task 4: Меню, адреса, экраны-каркасы, уход панели коллеги

**Files:**
- Modify: `src/components/Sidebar.jsx` (пункт + бейдж), `src/styles.css` (`.sb__badge`)
- Modify: `src/i18n.jsx` (`nav.myTeacher` × 3)
- Modify: `src/App.jsx` (импорт, `PERSISTABLE_SCREENS`, `handleNav`, три `case`)
- Modify: `src/lib/screenAccess.js` (`STUDENT_ONLY_SCREENS`), `src/lib/studentDeepLink.js` + тест
- Modify: `src/screens/HomePage.jsx` (убрать панель), `src/screens/LessonsPage.jsx` (ссылка-карточка)
- Create: `src/screens/MyTeacherPage.jsx`, `src/screens/TeacherWizardPage.jsx`, `src/screens/TeacherPickPage.jsx` (каркасы в `LearningLayout`), `src/matching/MatchingLinkCard.jsx`, `src/matching.css`; `src/app/layout.jsx` — импорт `../matching.css` после `../placement.css`
- Delete: `src/matching/TeacherMatchingPanel.jsx`, `.module.css`, `.test.jsx`
- Test: `src/components/SidebarMatching.test.jsx`, `src/lib/studentDeepLink.test.js`

**Interfaces:**
- Consumes: `useMatching`, `matchingView`.
- Produces: экраны `my-teacher`, `teacher-wizard`, `teacher-pick`; `handleNav('my-teacher' | 'teacher-wizard', payload?)` (payload `{step}`); пропсы экранов `{token, userName, userLevel, onNav, onProfile}` (+ `onDone` у `TeacherPickPage`).

- [ ] **Step 1: Падающие тесты**

```jsx
// SidebarMatching.test.jsx — по образцу SidebarIelts.test.jsx (моки api.js: getDemoAccess, getIeltsMe, getSatMeCached, getBalance)
vi.mock('../matching/matchingStore.js', () => ({ useMatching: vi.fn() }))
import { useMatching } from '../matching/matchingStore.js'

it('shows «Мой учитель» right after «Главная» with an action badge', async () => {
  useMatching.mockReturnValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'self', tariffConfirmed: true, requests: [] }, handoffs: [] })
  render(<I18nProvider><Sidebar token={studentToken} onNav={() => {}} /></I18nProvider>)
  const items = [...document.querySelectorAll('.sb__nav [data-nav]')].map((b) => b.dataset.nav)
  expect(items.slice(0, 2)).toEqual(['home', 'my-teacher'])
  expect(screen.getByText('1')).toHaveClass('sb__badge')
})

it('hides the item when the backend has no matching v2', () => {
  useMatching.mockReturnValue({ status: 'unavailable', card: null, handoffs: [] })
  render(<I18nProvider><Sidebar token={studentToken} onNav={() => {}} /></I18nProvider>)
  expect(document.querySelector('[data-nav="my-teacher"]')).toBeNull()
})

// studentDeepLink.test.js — заменить ожидание для 'teacher-matching'
expect(notificationTarget('teacher-matching')).toEqual({ screen: 'my-teacher', payload: null })
```

- [ ] **Step 2: Прогон** → FAIL.

- [ ] **Step 3: Реализация**
  - `Sidebar.jsx`: `const MY_TEACHER_ITEM = { key: 'my-teacher', label: 'nav.myTeacher', ico: 'person' }`; иконка `public/assets/home-v2/ico/person.svg` — контурный Material Symbol «person» в стиле соседних (24×24, `fill="currentColor"` не нужен: рисуется маской). В сборке `base` и `ieltsNav` — вставить сразу после `HOME_ITEM`, если `!teacher && matching.status ∉ {'unavailable','idle','loading'}`. Бейдж — `{badge > 0 && <span className="sb__badge">{badge}</span>}` внутри кнопки после подписи.
  - `.sb__badge` в `styles.css` рядом с `.sb__item`: `margin-left:auto; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:#E5484D; color:#fff; font:700 11px/20px inherit; text-align:center` (красный — только для «нужно действие», как `.nbell__badge`).
  - `App.jsx`: `PERSISTABLE_SCREENS` += `'my-teacher', 'teacher-wizard', 'teacher-pick'`; в `handleNav` — `else if (key === 'my-teacher') setScreen('my-teacher')`, `else if (key === 'teacher-wizard') { setWizardStep(payload?.step || null); setScreen('teacher-wizard') }`, `else if (key === 'teacher-pick') setScreen('teacher-pick')`; три `case` в `renderScreen` с пропсами экранов (по образцу `case 'homework'`).
  - `screenAccess.js`: три экрана в `STUDENT_ONLY_SCREENS`.
  - `studentDeepLink.js`: `'teacher-matching'` → `{ screen: 'my-teacher', payload: null }`.
  - `HomePage.jsx`: удалить импорт и строку `<TeacherMatchingPanel … />` (ТЗ §2.11: «Главная» без изменений).
  - `LessonsPage.jsx`: `{!teacher && <MatchingLinkCard token={token} onOpen={() => onNav?.('my-teacher')} />}` — карточка видна, только пока `matchingView().status ∈ {none, tariff_pending, matching, manager_picking, schedule_proposed, confirm_expired}`: «Подберите своего учителя» / статус + кнопка «Мой учитель →».
  - Каркасы экранов — `LearningLayout active="my-teacher"` и заголовок; содержимое — Task 6–8.

- [ ] **Step 4: Прогон** `npx vitest run src/components src/lib src/matching` → PASS; `npm run build` → OK. **Step 5: Commit** — `git commit -m "feat(matching): пункт «Мой учитель» с бейджем, адреса экранов, панель подбора уходит с «Главной»"`

---

### Task 5: Общие кирпичи раздела

**Files:**
- Create: `src/matching/ui.jsx` (`MtModal`, `useToast`/`MtToast`, `TariffLine`, `Pill`), `src/matching/TeacherPhoto.jsx`, `src/matching/InterestsPicker.jsx`, `src/matching/WizardHead.jsx`
- Modify: `src/matching.css`, `src/theme-dark.css`
- Test: `src/matching/InterestsPicker.test.jsx`, `src/matching/TeacherPhoto.test.jsx`

**Interfaces:**
- Produces:
  - `MtModal({title, onClose, wide, children, labelledBy})` — портал в `body`, скрим, Esc и фокус через `useDialogKeys` (`src/lib/useDialogKeys.js`), корень помечен `data-assistant-overlay="matching"` (Луна видит окно).
  - `useToast() → [toastNode, show(text)]` — 2.6 с, как `toast()` прототипа (стр. 404).
  - `TariffLine({tariff})` — «General English · гарантия · уроки по 60 мин · 2 раза в неделю», только чтение.
  - `TeacherPhoto({token, teacherId, name, size})` — blob из `getMatchingTeacherPhoto`, кэш `Map(id → objectURL)` на вкладку; без фото — инициалы.
  - `InterestsPicker({value, onChange, onLimit, compact})` — выбранные чипами с «✕» сверху, 6 `<details>` с счётчиком; 6-й → `onLimit()`.
  - `WizardHead({steps, index, tariff, onBack, onManager})` — «← Назад», шаги с ✓/номером, прогресс-бар, строка тарифа, «Пусть менеджер подберёт».

- [ ] **Step 1: Тесты**

```jsx
it('InterestsPicker refuses the sixth interest', async () => {
  const onLimit = vi.fn(), onChange = vi.fn()
  render(<I18nProvider><InterestsPicker value={['Аниме', 'K-pop', 'Музыка', 'Игры', 'Книги']} onChange={onChange} onLimit={onLimit} /></I18nProvider>)
  await userEvent.click(screen.getAllByText('Наука')[0])
  expect(onLimit).toHaveBeenCalled()
  expect(onChange).not.toHaveBeenCalled()
})

it('TeacherPhoto falls back to initials without a photo', async () => {
  vi.spyOn(api, 'getMatchingTeacherPhoto').mockResolvedValue(null)
  render(<TeacherPhoto token="t" teacherId={3} name="Айгерим Сапарова" />)
  expect(await screen.findByText('АС')).toBeInTheDocument()
})
```

- [ ] **Step 2–4:** реализация по прототипу (CSS-блоки прототипа стр. 51–291 → `src/matching.css` под `.mt`, токены `--mt-brand: #9047FF; --mt-brand-2: #7D33F0; --mt-soft: #F1E9FF; --mt-softer: #F7F4FE; --mt-ok: #22A55B; --mt-ok-soft: #E6F6EC; --mt-warn: #B7791F; --mt-warn-soft: #FDF3E1; --mt-bad: #D6408B; --mt-bad-soft: #FCE8F2; --mt-line: #E9E6F2; --mt-fg-2: #656172; --mt-fg-3: #8B8A97; --mt-surface: #fff; --mt-bg: #F7F6FB`), тёмная тема — блок в `theme-dark.css`: `html[data-theme='dark'] .mt { --mt-brand: var(--dk-violet); --mt-soft: var(--dk-violet-soft); … --mt-surface: var(--dk-surface); --mt-bg: var(--dk-bg); --mt-line: var(--dk-line) }` (имена `--dk-*` взять из начала `theme-dark.css`). Мобильная часть — `@media (max-width: 560px)` в том же файле (`.mt-tcard`, `.mt-layout3`, `.mt-grid3` в колонку, `.mt-gridwrap` `overflow-x:auto`).
- [ ] **Step 5: Commit** — `git commit -m "feat(matching): общие кирпичи раздела — окно, тост, фото, интересы, шапка мастера"`

---

### Task 6: Мастер подбора

**Files:**
- Create: `src/matching/wizardDraft.js` (+ тест), `src/matching/FormatStep.jsx`, `src/matching/TimeGrid.jsx` (+ тест), `src/matching/TeachersStep.jsx`, `src/matching/TeacherCard.jsx` (+ тест), `src/matching/ManagerPickModal.jsx`
- Modify: `src/screens/TeacherWizardPage.jsx`

**Interfaces:**
- Consumes: Tasks 1–5; API `getMatchingGrid`, `saveMatchingPreferences(token, {slots, interests, wish: null, format})`, `getMatchingTeachers`, `sendMatchingRequests`, `askMatchingManager(token, {slots, interests, wish, format})`.
- Produces: `loadDraft(userId) → {step, format, slots: Slot[], interests: string[], choices: number[]}`, `saveDraft(userId, draft)`, `clearDraft(userId)` (localStorage `jts_matching_draft:<id>`, всё в try/catch); `ManagerPickModal({token, view, slots, interests, onClose, onSent})` — переиспользуется в «Мой учитель» и онбординге.

- [ ] **Step 1: Тесты**

```js
// wizardDraft.test.js
it('round-trips a draft per user and survives broken storage', () => {
  saveDraft(7, { step: 'time', format: 'books', slots: [{ weekday: 1, start: '14:00:00' }], interests: ['Аниме'], choices: [] })
  expect(loadDraft(7).format).toBe('books')
  expect(loadDraft(8)).toEqual({ step: null, format: null, slots: [], interests: [], choices: [] })
  localStorage.setItem('jts_matching_draft:9', '{oops')
  expect(loadDraft(9).slots).toEqual([])
})
```

```jsx
// TimeGrid.test.jsx
const cells = [{ weekday: 1, start: '14:00:00', teacherIds: [3, 4, 5] }, { weekday: 3, start: '14:00:00', teacherIds: [3] }]
it('shows counts, disables empty cells and toggles picks', async () => {
  const onChange = vi.fn()
  render(<I18nProvider><TimeGrid cells={cells} duration={60} tz="Asia/Almaty" picked={[]} onChange={onChange} /></I18nProvider>)
  const mon19 = screen.getByRole('button', { name: /Пн 19:00: свободно 3/ })
  expect(mon19).toHaveClass('mt-slot--many')
  expect(screen.getByRole('button', { name: /Вт 19:00: свободно 0/ })).toBeDisabled()
  await userEvent.click(mon19)
  expect(onChange).toHaveBeenCalledWith(['1-14:00'])
})
```

```jsx
// TeacherCard.test.jsx
it('shows matching time k of M and refuses a fourth pick', async () => {
  const t = { id: 3, name: 'Айгерим Сапарова', yearsExperience: 4, specializations: ['General English'], sinceYear: 2023,
    isNew: false, matchPercent: 86, about: 'О себе', interests: ['Аниме'], formats: ['platform'], slots: [{ weekday: 1, start: '14:00:00' }] }
  const onPick = vi.fn()
  render(<I18nProvider><TeacherCard teacher={t} tz="Asia/Almaty" picked={3} pickedTotal={2} priority={-1} full myInterests={['Аниме']} onPick={onPick} /></I18nProvider>)
  expect(screen.getByText(/Пн 19:00/)).toBeInTheDocument()
  expect(screen.getByText(/\(1 из 3\)/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Выбрать' })).toBeDisabled()
  expect(screen.queryByText(/учеников/)).toBeNull()
})
```

- [ ] **Step 2: Прогон** → FAIL.
- [ ] **Step 3: Реализация** — по прототипу:
  - `TeacherWizardPage`: шаги `needsFormatStep ? ['format','time','teachers'] : ['time','teachers']`; при `view.status === 'matching'` → `onNav('my-teacher')` (ТЗ 2.6: повторный вход ведёт на статус); `tariff_pending` → онбординг-экран; черновик — `wizardDraft` по `card.studentId`, слоты при первом заходе — из `card.availableSlots`, интересы — из `card.interests`.
  - `FormatStep` — `stuFormat()` (стр. 543–548): три карточки `FORMATS`, «Доступно учителей: N» из `grid.formats`, кнопка «Дальше: время →».
  - `TimeGrid` — `stuTime()` (стр. 560–575): строки `gridRows(duration)`, столбцы Пн–Вс; ячейка = `toUtcSlot(day, minutes, tz)` → `cells` по `slotKey`; цифра = `teacherIds.length`, классы `mt-slot--many` (3+), `mt-slot--few` (1–2), `mt-slot--zero` (disabled, «—»), `aria-pressed`; протяжка мышью: `pointerdown` запоминает режим (добавлять/снимать) по первой ячейке, `pointerenter` с нажатой кнопкой применяет его (только `pointerType === 'mouse'`); `best` — подсветка `mt-slot--best` для `bestCells`.
  - Нижняя панель шага «Время»: «Отмечено: k слотов в d днях» (`schoolDaysCount`), `n = teachersFitting(cells, picked, perWeek).length`; валидация таблицы ТЗ §2.3 (меньше N дней — «· нужно минимум N разных дня», 0 — текст + `bestCells` + ссылка «Пусть менеджер подберёт», 1–2 — «Подходит n учителя. Добавьте ещё времени…»); кнопка «Показать учителей (n) →» → `saveMatchingPreferences` (слоты, интересы, формат) → шаг «Учителя».
  - `TeachersStep` — `stuTeachers()` (стр. 584–612): фильтры слева (интересы `InterestsPicker`, возраст по `ageGroup`, специализация по `specializations`, опыт по `yearsExperience`), смена интересов → `saveMatchingInterests` с задержкой 400 мс → `getMatchingTeachers` заново (процент считает сервер); строка «В выбранное время свободно n учителей · сортировка: лучшее совпадение»; список `TeacherCard`; пусто — текст ТЗ; выбор до 3 с приоритетом, 4-й — тост «Можно выбрать до 3 учителей. Уберите одного, чтобы добавить другого»; панель «Выбрано: k из 3 · 1. Имя · 2. Имя» + «Отправить заявки» → `sendMatchingRequests(ids)` → `applyMatchingCard` → `clearDraft` → `onNav('my-teacher')` + тост «Заявки отправлены. Ответ в течение 12 часов». Ошибка `slot_taken` → тост сервера и `getMatchingGrid` заново.
  - `TeacherCard` — карточка прототипа (стр. 598–607): фото, имя, «N% совпадение», «Новый учитель» (`isNew`), «{X} years experience · специализации · с {год} года», зелёная строка «Подходит ваше время: … (k из M)», две строки «О себе», интересы-чипы (общие — `mt-tag--hit`), форматы-чипы, «Выбрать»/номер+«Убрать», «Профиль».
  - `ManagerPickModal` — `mgrPick` прототипа (стр. 1050–1054): текст с именем менеджера (`card.responsibleManagerName`, иначе «Ваш менеджер»), удобное время чипами или «Не отмечено…», интересы, textarea до 500 со счётчиком, «Отмена» / «Отправить менеджеру»; при `view.status === 'matching'` сначала подтверждение «Ваши заявки учителям отменятся, подбором займётся менеджер. Продолжить?»; `already_asked` — кнопка в вызывающем месте становится «Запрос у менеджера · до {дата время}» (по `view.managerRequest`). После отправки — тост «Заявка у менеджера. Ответ до {дата время}» и `onSent(card)`.
- [ ] **Step 4: Прогон** → PASS; `npm run build`. **Step 5: Commit** — `git commit -m "feat(matching): мастер подбора — формат, сетка времени, учителя, «Пусть менеджер подберёт»"`

---

### Task 7: Профиль учителя и резюме

**Files:**
- Create: `src/matching/TeacherProfileModal.jsx`, `src/matching/TeacherResumeSheet.jsx`
- Modify: `src/matching.css` (лист резюме + `@media print`)
- Test: `src/matching/TeacherProfileModal.test.jsx`

**Interfaces:**
- Consumes: `getMatchingTeacher(token, id) → {card, experience, education, certificates, languages, focus, methods}`.
- Produces: `TeacherProfileModal({token, teacherId, mode: 'wizard'|'view', myInterests, mySlots, format, priority, canPick, onPick, onUnpick, onClose})`.

- [ ] **Step 1: Тест**

```jsx
it('shows no phone, no chat button and no video block without a video', async () => {
  vi.spyOn(api, 'getMatchingTeacher').mockResolvedValue({
    card: { id: 3, name: 'Айгерим Сапарова', matchPercent: 86, specializations: ['General English'], yearsExperience: 4,
      formats: ['platform'], interests: ['Аниме'], levels: ['A0', 'B1–B2'], sinceYear: 2023, languages: ['Казахский'] },
    experience: [], education: null, certificates: [{ name: 'CELTA', issuedBy: 'Cambridge', year: 2022 }],
    languages: [{ lang: 'Английский', level: 'C1' }], focus: [], methods: [],
  })
  render(<I18nProvider><TeacherProfileModal token="t" teacherId={3} mode="wizard" myInterests={['Аниме']} mySlots={[]} onClose={() => {}} /></I18nProvider>)
  expect(await screen.findByText('Айгерим Сапарова')).toBeInTheDocument()
  expect(screen.getByText('CELTA')).toBeInTheDocument()
  expect(screen.getAllByText(/Проверено/).length).toBeGreaterThan(0)
  expect(screen.queryByText(/Видео-знакомство/)).toBeNull()
  expect(screen.queryByText(/Написать/)).toBeNull()
  expect(screen.queryByText(/учеников сейчас/)).toBeNull()
})
```

- [ ] **Step 2–4:** реализация по `teacherProfileHTML(t, 'student')` (стр. 689–726) и `resumeHTML` (стр. 663–687): вкладки «Профиль» / «Резюме (PDF)», «Почему вам подходит» только в `mode='wizard'` (свободна в ваше время — пересечение `card.slots`, общие интересы, формат ✓, «Уроки: 30 и 60 минут ✓» если в `specializations`/доступе есть 30-мин), сертификаты — `name` + «issuedBy · year» + «✔ Проверено», плиток две («в Just to Study с», «уровни учеников»), нижняя панель «Выбрать учителя» / «Убрать из выбранных» с приоритетом (только `mode='wizard'`). «Скачать PDF» — `window.print()`; `@media print { body > *:not(.mt-print-root) { display: none } .mt-print-root .mt-resume { … } }`: на время печати модалка ставит на `body` класс `mt-printing`, лист — в портал `.mt-print-root`.
- [ ] **Step 5: Commit** — `git commit -m "feat(matching): профиль учителя для ученика и резюме с печатью в PDF"`

---

### Task 8: «Мой учитель» — все состояния и окна

**Files:**
- Modify: `src/screens/MyTeacherPage.jsx`
- Create: `src/matching/MyTeacherHero.jsx` (нет учителя / тариф / нет абонемента), `src/matching/RequestsStatus.jsx`, `src/matching/ConfirmCard.jsx` (+ тест), `src/matching/AssignedTeacher.jsx`, `src/matching/ChangeFormatModal.jsx`, `src/matching/ChangeTeacherModal.jsx` (+ тест), `src/matching/VacationModal.jsx`, `src/matching/TimezoneBanner.jsx`

**Interfaces:**
- Consumes: Tasks 1–7; API `confirmMatchingSchedule`, `counterMatchingSchedule`, `reconfirmMatchingSchedule`, `changeMatchingFormat`, `requestTeacherChange(token, reason, text)`, `chooseMatchingHandoff(token, id, choice)`, `patchMatchingWish`.
- Produces: `ConfirmCard({token, view, tz, onDone})` (её же рисует окно при входе), `celebrate(view)` — окно «🎉 Ваш учитель — …».

- [ ] **Step 1: Тесты**

```jsx
// ConfirmCard.test.jsx
const view = { status: 'schedule_proposed', tariff: { duration: 60, perWeek: 2 },
  proposal: { teacherId: 3, teacherName: 'Айгерим', by: 'teacher', deadline: '2026-10-27T15:00:00',
    slots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }],
    commonSlots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }, { weekday: 4, start: '14:00:00' }] } }

it('confirms once even on a double click', async () => {
  const spy = vi.spyOn(api, 'confirmMatchingSchedule').mockResolvedValue({ apiVersion: 2, matchStatus: 'done' })
  render(<I18nProvider><ConfirmCard token="t" view={view} tz="Asia/Almaty" onDone={() => {}} /></I18nProvider>)
  const b = screen.getByRole('button', { name: 'Подтвердить расписание' })
  await userEvent.dblClick(b)
  expect(spy).toHaveBeenCalledTimes(1)
})

it('other time: only common slots, exactly N on different days', async () => {
  render(<I18nProvider><ConfirmCard token="t" view={view} tz="Asia/Almaty" onDone={() => {}} /></I18nProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Выбрать другое время' }))
  const send = screen.getByRole('button', { name: 'Отправить учителю на согласование' })
  expect(send).toBeEnabled() // предложенные уже выбраны
  await userEvent.click(screen.getByRole('button', { name: /Пн 19:00/ }))
  expect(send).toBeDisabled()
  expect(screen.getAllByRole('button', { name: /19:00/ })).toHaveLength(3)
})

// ChangeTeacherModal.test.jsx
it('complaint needs a comment and the limit sends to the manager', async () => {
  render(<I18nProvider><ChangeTeacherModal token="t" limits={{ teacherChangesLeft: 2 }} onClose={() => {}} onSent={() => {}} /></I18nProvider>)
  await userEvent.click(screen.getByLabelText(/Жалоба на учителя/))
  expect(screen.getByRole('button', { name: 'Отправить запрос' })).toBeDisabled()
  cleanup()
  render(<I18nProvider><ChangeTeacherModal token="t" limits={{ teacherChangesLeft: 0 }} onClose={() => {}} onSent={() => {}} /></I18nProvider>)
  expect(screen.getByText('Дальнейшая смена — через менеджера')).toBeInTheDocument()
})
```

- [ ] **Step 2–4:** реализация по `stuMyTeacher()` (стр. 626–660), `teacherBlock()` (стр. 469–490), `confirmCard()` (стр. 613–625) и модалкам прототипа (стр. 1061–1070), строго по текстам ТЗ §2.6–§2.9:
  - `none` — `MyTeacherHero`: «Подберите своего учителя», шаги, «Подобрать учителя →» (`onNav('teacher-wizard')`), «Пусть менеджер подберёт»; при `changeApproved` — плашка «Запрос одобрен ✅ Выберите нового учителя — ваши формат и интересы уже сохранены»; при `allDeclined` — плашка с текстом окна №6 и кнопками «Выбрать учителей» (`onNav('teacher-wizard', {step: 'teachers'})`) / «Пусть менеджер подберёт».
  - `tariff_pending` — «Менеджер подтверждает тариф, обычно до 2 часов» + «Пусть менеджер подберёт».
  - `no_subscription` — «Чтобы выбрать учителя, оформите абонемент» + «Связаться с менеджером» (`onNav('pricing')`).
  - `unavailable` — «Раздел скоро появится».
  - `matching` — `RequestsStatus`: текст про 12 ч и ночь, строки «Ждём ответа · осталось N ч» (по `expiresAt`), «Принял — ждём учителя с более высоким приоритетом», «Отклонил» (без причины); «Пусть менеджер подберёт».
  - `manager_picking` — «Менеджер подбирает учителя до {дата время}», слоты, пожелание цитатой, «Изменить пожелания» (textarea → `patchMatchingWish`).
  - `schedule_proposed` — `ConfirmCard` вверху: метка «Учитель принял заявку» / «Менеджер подобрал учителя», «подтвердите в течение 24 ч», фото/имя/специализации/«профиль», строки «Пн 19:00 — каждую неделю · 60 мин», «Первый урок: пн 19:00, 02.11 · {пояс}» (ближайшая дата первого слота не раньше чем через 24 ч), таймер «Подтвердите до … До этого времени учитель держит эти часы для вас.», «Подтвердить расписание» (блок кнопки на время запроса) → окно «🎉 Ваш учитель — …»; «Выбрать другое время» → чипы `commonSlots`, ровно N в разных днях (`schoolDaysCount`), «Отправить учителю на согласование» → `counterMatchingSchedule` → «Учитель согласует новое время до {дата время}»; общих слотов меньше N — текст ТЗ + «Добавить время» (`onNav('teacher-wizard', {step: 'time'})`) / «Пусть менеджер подберёт».
  - `change_requested` — «Учитель согласует новое время до {expiresAt}» + прежняя карточка без кнопок.
  - `confirm_expired` — «Время с {учитель} больше не закреплено. Если оно ещё свободно — подтвердите снова, или выберите другое время»: «Подтвердить снова» (`reconfirmMatchingSchedule`; `slot_taken` → тост сервера) / «Другое время» (`onNav('teacher-wizard', {step: 'time'})`).
  - `change_pending` — плашка «Запрос на смену учителя на рассмотрении. Ответим в течение 24 часов. Занятия с текущим учителем продолжаются» над `AssignedTeacher`.
  - `assigned` — `AssignedTeacher` (сетка `grid2` прототипа): карточка учителя + «Профиль учителя»; «Расписание» (слоты с длительностью, пояс); «Формат обучения» + «Сменить формат» (гарантия — пометка и текст без кнопки; `limits.formatChangeAvailableAt` — кнопка неактивна, подсказка «Сменить формат можно через {дата}. Если нужно раньше — напишите менеджеру»); «Что-то не так?» + «Сменить учителя».
  - `ChangeFormatModal` — три формата; `teacher_format` → открыть `ChangeTeacherModal` с причиной «Хочу другой формат обучения»; успех — тост «Формат изменён. Учитель получил уведомление».
  - `ChangeTeacherModal` — шесть причин радиокнопками (первая выбрана), комментарий (обязателен для «Жалоба»), подпись «Учитель не видит ваше имя в жалобе. До решения занятия идут по расписанию.», «Отправить запрос» → тост «Запрос отправлен. Ответ в течение 1 рабочего дня»; `teacherChangesLeft === 0` — текст «Дальнейшая смена — через менеджера» и «Связаться с менеджером».
  - Отпуск: баннер «{учитель} в отпуске {от}–{до}.» + «Пауза или временный учитель» → `VacationModal` (два варианта: `pause` — «Уроки переносятся, срок абонемента продлевается на {N} дней», N = дни периода; `temp_teacher` — «Менеджер подберёт временного учителя в ваше обычное время. Он(а) видит ваш прогресс и заметки учителя. С {до+1} вы автоматически вернётесь к своему учителю.»), подпись «Если не выберете до {от − 2 дня}, ваш менеджер свяжется с вами»; после выбора — баннеры `temporary` / `paused` из `matchingView`.
  - `TimezoneBanner` — «Похоже, вы в другом часовом поясе ({tz}). Показывать время по нему?» «Да» → `saveMatchingTimezone(deviceTimezone())`, «Нет» → localStorage `jts_matching_tz_dismissed:<tz>`; показывается, когда `card.timezone` задан и ≠ пояса устройства.
- [ ] **Step 5: Commit** — `git commit -m "feat(matching): «Мой учитель» — заявки, подтверждение, другое время, смена формата и учителя, отпуск"`

---

### Task 9: Онбординг, окна при входе, профиль, настройки

**Files:**
- Modify: `src/screens/TeacherPickPage.jsx`, `src/App.jsx` (`continueAfterPlacement`, `case 'ge-route'` `onChosen`, `MatchingPopups` в глобальной зоне рядом с `PurchaseSuccessModal`)
- Create: `src/matching/MatchingPopups.jsx` (+ тест), `src/matching/ProfileBlocks.jsx`, `src/matching/TimezoneModal.jsx`
- Modify: `src/screens/ProfilePage.jsx` (блоки после `pf-stats`; строка «Часовой пояс» в «Настройках»; каналы в окне уведомлений)

**Interfaces:**
- Consumes: Tasks 1–8, `lib/assistant/visibility.js` (экраны, где помощник скрыт: тест, экзамен, урок, звонок).
- Produces: `MatchingPopups({token, screen, onNav})`; `ProfileBlocks({token, onNav})`; `TimezoneModal({token, current, onClose})`; ключи localStorage `jts_matching_popup:<studentId>:<key>`, `jts_teacher_pick_seen:<studentId>`.

- [ ] **Step 1: Тест**

```jsx
it('shows the proposal popup once per deadline and never in the wizard', () => {
  useMatching.mockReturnValue({ status: 'ready', handoffs: [], card: { apiVersion: 2, studentId: 7, matchStatus: 'confirm',
    deadline: '2026-10-27T15:00:00', assignedTeacherName: 'Айгерим', proposedSlots: [], requests: [], tariffConfirmed: true } })
  const { unmount } = render(<I18nProvider><MatchingPopups token="t" screen="home" onNav={() => {}} /></I18nProvider>)
  expect(screen.getByText(/Подтвердите расписание/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Закрыть/ }))
  unmount()
  render(<I18nProvider><MatchingPopups token="t" screen="home" onNav={() => {}} /></I18nProvider>)
  expect(screen.queryByText(/Подтвердите расписание/)).toBeNull()
  cleanup()
  localStorage.clear()
  render(<I18nProvider><MatchingPopups token="t" screen="teacher-wizard" onNav={() => {}} /></I18nProvider>)
  expect(screen.queryByText(/Подтвердите расписание/)).toBeNull()
})
```

- [ ] **Step 2–4: Реализация**
  - `TeacherPickPage` — `stuOnboard()` (стр. 521–535): пять заполненных сегментов, «Шаг 5 из 5», чип «Тест пройден · {уровень}», строка тарифа или чип «Тариф подтверждает менеджер» + баннер ТЗ 2.1.1, заголовок, подзаголовок (без «формат обучения» у гарантии/IELTS/SAT, с допиской для гарантии), три факта (`3 шага: Формат → Время → Учитель` / `2 шага: Время → Учитель`, «До 3 учителей — отправим заявки всем сразу», «Ответ до 12 ч»), кнопки «Выбрать учителя →» (неактивна при `tariff_pending`), «Пусть менеджер подберёт», «Сделаю позже» → `onNav('home')` + тост «Напомним в колокольчике. Выбрать учителя можно в разделе „Мой учитель“» и подпись «Через 24 часа напомним в WhatsApp, через 48 часов подключится менеджер». Kids — тексты «Интересы ребёнка» / «Когда ребёнку удобно заниматься». Экран без сайдбара (как `ge-onboarding`), отметка `jts_teacher_pick_seen:<id>` ставится при показе.
  - `App.jsx`: в `continueAfterPlacement` и в `onChosen` маршрута GE — если `next` ведёт на «Главную», а `needsTeacherPick(matchingView(getMatchingSnapshot()))` и отметки показа нет → `setScreen('teacher-pick')` (стор к этому моменту прогрет `refreshMatching(token)` в начале `continueAfterPlacement`).
  - `MatchingPopups` — `popupFor(view)`; не на экранах `teacher-wizard`, `teacher-pick`, `my-teacher` (там всё видно и так) и там, где помощник скрыт; содержимое: `proposal` — `ConfirmCard` в `MtModal`, `all_declined` / `expired` / `approved` / `vacation` — тексты ТЗ §6 (№6, №9, №16, №18) с кнопками. Закрытие пишет ключ.
  - `ProfileBlocks` после `pf-stats`: «Мой учитель» (`Закреплён` / `Не выбран`; учитель, формат, ближайший урок, «Открыть» — или «Выберите учителя: это займёт около 3 минут» + «Выбрать учителя»), «Мои интересы» ({k} / 5 · по ним подбираем учителя, `InterestsPicker` → `saveMatchingInterests`), «Настройки обучения» (часовой пояс + «Расписание показывается в этом времени» → `TimezoneModal`; формат; занятий в неделю; уведомления «Платформа, push, WhatsApp» → окно уведомлений). Блоков нет при `unavailable`.
  - `TimezoneModal` — «Авто ({пояс устройства})» + список: Asia/Almaty, Europe/Moscow, Asia/Bishkek, Asia/Tashkent, Asia/Dubai, Asia/Seoul, Europe/London, Europe/Berlin, затем `Intl.supportedValuesOf('timeZone')` (если есть); подпись UTC±X; сохранение → `saveMatchingTimezone` → `applyMatchingCard`.
  - `ProfilePage`: окно уведомлений получает раздел «Каналы»: WhatsApp — «на {телефон}» (подключён, если номер есть), Telegram — «скоро», «Приложение» — «скоро».
- [ ] **Step 5: Commit** — `git commit -m "feat(matching): онбординг «Выберите учителя», окна при входе, блоки профиля, часовой пояс"`

---

### Task 10: E2E, сборка, документация, PR

**Files:**
- Create: `tests/student-matching.spec.js`
- Modify: `CLAUDE.md` (абзац «Подбор учителя — сторона ученика» в разделе архитектуры: файлы, стор, статусы из карточки, ручки v2, решения)

- [ ] **Step 1: E2E** — мок бэкенда одним `page.route(/justtostudy\.kz/)` (как `tests/home-goal.spec.js`), состояние карточки в замыкании; POST ловятся по `route.request().method()` и регэкспу адреса (память e2e-post-mock-glob-query):

```js
test('self matching: format → time → teachers → requests → confirm', async ({ page }) => {
  const st = await setup(page, { card: { ...BASE_CARD, matchStatus: 'self' } })
  await page.goto('/?screen=teacher-pick')
  await page.getByRole('button', { name: 'Выбрать учителя →' }).click()
  await page.getByRole('button', { name: /По программе платформы/ }).click()
  await page.getByRole('button', { name: 'Дальше: время →' }).click()
  await page.getByRole('button', { name: /^Пн 19:00/ }).click()
  await expect(page.getByText('нужно минимум 2 разных дня')).toBeVisible()
  await page.getByRole('button', { name: /^Ср 19:00/ }).click()
  await page.getByRole('button', { name: /Показать учителей \(1\)/ }).click()
  await page.getByRole('button', { name: 'Выбрать' }).first().click()
  await page.getByRole('button', { name: 'Отправить заявки' }).click()
  await expect(page.getByText('Статус заявок')).toBeVisible()
  expect(st.sent).toEqual([3])
  st.card = PROPOSED_CARD
  await page.reload()
  await page.getByRole('button', { name: 'Подтвердить расписание' }).first().click()
  await expect(page.getByText(/Ваш учитель — Айгерим/)).toBeVisible()
})

test('tariff pending: choosing is closed, manager pick works', async ({ page }) => { … «Выбрать учителя →» disabled; «Пусть менеджер подберёт» → окно → «Отправить менеджеру» → «Менеджер подбирает учителя» })

test('360 px: no horizontal page scroll on the time grid', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  … открыть шаг «Время»
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 360)).toBe(true)
})
```

- [ ] **Step 2: Прогон** — `npx playwright test tests/student-matching.spec.js --workers=1` → PASS (порт 3100, память e2e-port-reuse-trap; системный Chrome — память e2e-system-chrome-wrapper).
- [ ] **Step 3: Полная проверка** — `npm run lint`, `npm run build`, `npx vitest run src` → без новых падений (известные красные — память develop-red-tests-baseline).
- [ ] **Step 4: Ручной прогон** — `npm run dev` в worktree (порт, не занятый основным стендом), `?screen=my-teacher` и мастер против мок-прокси на dev-server (память local-preview-mock-proxy) — скриншоты 1440 и 375.
- [ ] **Step 5: CLAUDE.md** — абзац раздела; **Commit**, push, PR в `develop` (описание: что видит ученик, что ждёт от бэкенда — PR `feat/student-matching-v2`, что панель коллеги убрана, ссылки на спеку и план). Мержить сайт **после** бэкенда: без `apiVersion: 2` пункт меню просто не появится, но ссылка из колокольчика `teacher-matching` уже поведёт в «Мой учитель» с текстом «Раздел скоро появится».
