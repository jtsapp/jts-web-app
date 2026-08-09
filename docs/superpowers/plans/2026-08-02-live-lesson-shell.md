# Live-Lesson Shell (sub-project #2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the `LiveLessonPage` placeholder with a working live-lesson shell — status badge, presence roster over STOMP, and role-aware controls (teacher start/pause/resume/complete; student read-only + waiting).

**Architecture:** Native WebSocket via `@stomp/stompjs` (same mechanism as web-admin: Authorization in the STOMP CONNECT frame, `brokerURL = wss://<api-host>/ws`). Pure helpers (jwt role, ws url, status maps) are isolated and unit-tested; a `useLessonPresence` hook owns the socket lifecycle; `LiveLessonPage` orchestrates REST load + polling + presence + role UI. No backend changes.

**Tech Stack:** Next.js/React 18, `@stomp/stompjs`, `src/api.js` (fetch+Bearer), i18n `src/i18n.jsx` (ru/en/kk), Vitest (already added in #1) for unit tests, Playwright (`tests/*.spec.js`, REST mocked with `page.route`) for e2e.

## Global Constraints
- No backend changes. Endpoints: `GET /admin/lessons/{id}`, `PUT /admin/lessons/{id}/start|pause|resume|complete` (server-scoped to the token's own lessons).
- STOMP: `brokerURL = wsBase()` (derive from `NEXT_PUBLIC_API_URL`, https→wss, +`/ws`); auth via `connectHeaders: { Authorization: 'Bearer <token>' }` (CONNECT frame, NOT an HTTP header). Presence: subscribe `/topic/lesson/{id}/presence`, publish `/app/lesson/{id}/presence/join`. Socket must degrade softly: no connection → empty roster, page still renders.
- Role from JWT (`roleFromToken`); controls allowed for TEACHER/ADMIN/MANAGER only.
- i18n keys added to ALL three blocks (ru, en, kk) of `src/i18n.jsx`.
- `LiveLessonPage` keeps its prop contract: `lessonId, token, userName, userLevel, onNav, onProfile, onBack`.
- New api function names use the `...LiveLesson` suffix to avoid colliding with the existing `completeLesson` (mobile lesson-modules).
- Commit messages end with:
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

---

### Task 1: Pure helpers (jwt role, ws url, live status)

**Files:**
- Create: `src/lib/jwt.js`, `src/lib/wsUrl.js`, `src/screens/live/liveStatus.js`
- Test: `src/lib/jwt.test.js`, `src/lib/wsUrl.test.js`, `src/screens/live/liveStatus.test.js`

**Interfaces produced:**
- `roleFromToken(token: string): string|null`
- `wsBase(): string`
- `statusKey(lessonStatus: string): 'inProgress'|'paused'|'scheduled'|'completed'|'cancelled'`
- `canControl(role: string): boolean`
- `canJoinLive(lessonStatus: string): boolean`

- [ ] **Step 1: Write failing tests**

`src/lib/jwt.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { roleFromToken } from './jwt.js'

// header.payload.signature where payload = base64url({"role":"STUDENT"})
const tokenWithRole = (role) => {
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${payload}.s`
}

describe('roleFromToken', () => {
  it('extracts the role claim', () => {
    expect(roleFromToken(tokenWithRole('STUDENT'))).toBe('STUDENT')
    expect(roleFromToken(tokenWithRole('TEACHER'))).toBe('TEACHER')
  })
  it('returns null for missing/garbage input', () => {
    expect(roleFromToken(null)).toBeNull()
    expect(roleFromToken('')).toBeNull()
    expect(roleFromToken('not-a-jwt')).toBeNull()
    expect(roleFromToken('a.b')).toBe(null) // b is not valid base64 json → null
  })
})
```

`src/lib/wsUrl.test.js`:
```js
import { describe, it, expect, afterEach, vi } from 'vitest'
import { wsBase } from './wsUrl.js'

afterEach(() => { vi.unstubAllEnvs() })

describe('wsBase', () => {
  it('converts https api to wss and appends /ws', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://dev-server.justtostudy.kz')
    expect(wsBase()).toBe('wss://dev-server.justtostudy.kz/ws')
  })
  it('converts http api to ws', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8080')
    expect(wsBase()).toBe('ws://localhost:8080/ws')
  })
  it('strips a trailing slash before /ws', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://x.kz/')
    expect(wsBase()).toBe('wss://x.kz/ws')
  })
})
```

`src/screens/live/liveStatus.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { statusKey, canControl, canJoinLive } from './liveStatus.js'

describe('liveStatus', () => {
  it('maps backend statuses to i18n keys', () => {
    expect(statusKey('IN_PROGRESS')).toBe('inProgress')
    expect(statusKey('PAUSED')).toBe('paused')
    expect(statusKey('COMPLETED')).toBe('completed')
    expect(statusKey('CANCELLED')).toBe('cancelled')
    expect(statusKey('SCHEDULED')).toBe('scheduled')
    expect(statusKey('WHATEVER')).toBe('scheduled')
  })
  it('canControl only for staff roles', () => {
    expect(canControl('TEACHER')).toBe(true)
    expect(canControl('ADMIN')).toBe(true)
    expect(canControl('MANAGER')).toBe(true)
    expect(canControl('STUDENT')).toBe(false)
    expect(canControl(null)).toBe(false)
  })
  it('canJoinLive only when live/paused', () => {
    expect(canJoinLive('IN_PROGRESS')).toBe(true)
    expect(canJoinLive('PAUSED')).toBe(true)
    expect(canJoinLive('SCHEDULED')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` (worktree has no node_modules yet → first run `npm install`, then `npm test`)
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement the three modules**

`src/lib/jwt.js`:
```js
// Read the JWT payload client-side (no verification — server enforces auth). Used only
// to pick the UI variant by role; never for authorization decisions.
export function roleFromToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    const payload = JSON.parse(json)
    return payload.role ?? null
  } catch {
    return null
  }
}
```

`src/lib/wsUrl.js`:
```js
// STOMP broker URL derived from the REST API base: https→wss, http→ws, plus /ws.
// NEXT_PUBLIC_API_URL is inlined by Next at build; falls back to the dev server.
export function wsBase() {
  const api = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) || 'https://dev-server.justtostudy.kz'
  const ws = api.replace(/^http/, 'ws')
  return ws.replace(/\/+$/, '') + '/ws'
}
```

`src/screens/live/liveStatus.js`:
```js
export function statusKey(lessonStatus) {
  switch (lessonStatus) {
    case 'IN_PROGRESS': return 'inProgress'
    case 'PAUSED': return 'paused'
    case 'COMPLETED': return 'completed'
    case 'CANCELLED': return 'cancelled'
    default: return 'scheduled'
  }
}

// Only staff drive the lesson lifecycle; a STUDENT gets a read-only view.
export function canControl(role) {
  return role === 'TEACHER' || role === 'ADMIN' || role === 'MANAGER'
}

export function canJoinLive(lessonStatus) {
  return lessonStatus === 'IN_PROGRESS' || lessonStatus === 'PAUSED'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — new tests green; #1 tests (lessonFormat, scheduleApi) still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/jwt.js src/lib/jwt.test.js src/lib/wsUrl.js src/lib/wsUrl.test.js src/screens/live/liveStatus.js src/screens/live/liveStatus.test.js
git commit -m "feat(live): pure helpers — jwt role, ws url, live status

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: API — lesson load + lifecycle controls

**Files:**
- Modify: `src/api.js` (add `authPut` helper + 5 functions after `getLessonsSummary`)
- Test: `src/screens/live/liveApi.test.js`

**Interfaces produced:**
- `getLessonById(token, id): Promise<object>`
- `startLiveLesson(token, id): Promise<object>`
- `pauseLiveLesson(token, id, minutes): Promise<object>`
- `resumeLiveLesson(token, id): Promise<object>`
- `completeLiveLesson(token, id): Promise<object>`

- [ ] **Step 1: Write failing test**

`src/screens/live/liveApi.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson } from '../../api.js'

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 14, status: 'IN_PROGRESS' }) }))
})

describe('live lesson api', () => {
  it('getLessonById GETs /admin/lessons/{id} with Bearer', async () => {
    await getLessonById('TOK', 14)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
  })
  it('startLiveLesson PUTs /start', async () => {
    await startLiveLesson('TOK', 14)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14/start')
    expect(opts.method).toBe('PUT')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
  })
  it('pauseLiveLesson PUTs /pause with minutes', async () => {
    await pauseLiveLesson('TOK', 14, 5)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/14/pause?minutes=5')
    expect(opts.method).toBe('PUT')
  })
  it('resumeLiveLesson PUTs /resume, completeLiveLesson PUTs /complete', async () => {
    await resumeLiveLesson('TOK', 14)
    expect(String(global.fetch.mock.calls[0][0])).toContain('/admin/lessons/14/resume')
    await completeLiveLesson('TOK', 14)
    expect(String(global.fetch.mock.calls[1][0])).toContain('/admin/lessons/14/complete')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/screens/live/liveApi.test.js`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Add `authPut` + functions to `src/api.js`**

Add an `authPut` helper next to `authGet` (after the `authGet` function definition):
```js
async function authPut(path, token, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json().catch(() => null)
}
```

Add the five functions immediately after `getLessonsSummary`:
```js
// Живой урок: загрузка одного урока и управление жизненным циклом (учитель/админ).
// Бэкенд скоупит /admin/lessons/{id} под личность токена.
export function getLessonById(token, id) {
  return authGet(`/admin/lessons/${id}`, token)
}

export function startLiveLesson(token, id) {
  return authPut(`/admin/lessons/${id}/start`, token)
}

export function pauseLiveLesson(token, id, minutes) {
  return authPut(`/admin/lessons/${id}/pause?minutes=${encodeURIComponent(minutes)}`, token)
}

export function resumeLiveLesson(token, id) {
  return authPut(`/admin/lessons/${id}/resume`, token)
}

export function completeLiveLesson(token, id) {
  return authPut(`/admin/lessons/${id}/complete`, token)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — live api tests green; all prior tests green.

- [ ] **Step 5: Commit**

```bash
git add src/api.js src/screens/live/liveApi.test.js
git commit -m "feat(live): api getLessonById + lesson lifecycle controls

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Presence hook over STOMP

**Files:**
- Modify: `package.json` (add `@stomp/stompjs`)
- Create: `src/screens/live/useLessonPresence.js`
- Test: `src/screens/live/useLessonPresence.test.js`

**Interfaces:**
- Consumes: `wsBase()` (Task 1).
- Produces: `useLessonPresence(lessonId, token): { roster: {userId, name?, role?}[], connected: boolean }`

- [ ] **Step 1: Add the dependency**

In `package.json` add to `dependencies`: `"@stomp/stompjs": "^7.3.0"`. Run `npm install`.

- [ ] **Step 2: Write failing test**

`src/screens/live/useLessonPresence.test.js` (mock the STOMP Client; drive onConnect + a presence message; assert brokerURL/headers/destinations/roster):
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

let lastClient
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.subs = {}; this.published = []; lastClient = this }
    activate() { this.cfg.onConnect && this.cfg.onConnect() }
    subscribe(dest, cb) { this.subs[dest] = cb; return { unsubscribe() {} } }
    publish(frame) { this.published.push(frame) }
    deactivate() { this.deactivated = true }
  }
  return { Client }
})

import { useLessonPresence } from './useLessonPresence.js'

beforeEach(() => { lastClient = undefined })

describe('useLessonPresence', () => {
  it('connects with wss brokerURL + Bearer, subscribes presence, publishes join, parses roster', async () => {
    const { result } = renderHook(() => useLessonPresence(14, 'TOK'))
    expect(lastClient.cfg.brokerURL).toMatch(/^wss?:\/\/.+\/ws$/)
    expect(lastClient.cfg.connectHeaders.Authorization).toBe('Bearer TOK')
    await waitFor(() => expect(result.current.connected).toBe(true))
    expect(lastClient.published[0].destination).toBe('/app/lesson/14/presence/join')
    act(() => {
      lastClient.subs['/topic/lesson/14/presence']({ body: JSON.stringify([{ userId: 116, name: 'Сабина', role: 'STUDENT' }]) })
    })
    await waitFor(() => expect(result.current.roster).toEqual([{ userId: 116, name: 'Сабина', role: 'STUDENT' }]))
  })
})
```
Note: this test needs `@testing-library/react` + jsdom. Add them as devDependencies in Step 1 as well (`@testing-library/react`, `jsdom`) and set the test file's environment. Put `// @vitest-environment jsdom` as the FIRST line of this test file. (`vitest.config.js` from #1 keeps the default node environment for the pure tests; the per-file docblock overrides it for this one.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test src/screens/live/useLessonPresence.test.js`
Expected: FAIL — hook not implemented.

- [ ] **Step 4: Implement the hook**

`src/screens/live/useLessonPresence.js`:
```js
import { useEffect, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// Live roster of who is actually connected to this lesson, driven by the server's
// presence broadcast. Auth rides the STOMP CONNECT frame (connectHeaders), not the
// WebSocket HTTP handshake. Degrades softly: no connection → empty roster.
export function useLessonPresence(lessonId, token) {
  const [roster, setRoster] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!lessonId || !token) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lesson/${lessonId}/presence`, (m) => {
          try { setRoster(normalizeRoster(JSON.parse(m.body))) } catch { /* ignore malformed frame */ }
        })
        client.publish({ destination: `/app/lesson/${lessonId}/presence/join`, body: '{}' })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    client.activate()
    return () => { client.deactivate(); setConnected(false); setRoster([]) }
  }, [lessonId, token])

  return { roster, connected }
}

// The server may send an array or an object wrapping the participants; accept both,
// keep only entries with a user id.
function normalizeRoster(payload) {
  const list = Array.isArray(payload) ? payload : (payload?.participants ?? payload?.users ?? [])
  return list
    .map((p) => ({ userId: p.userId ?? p.id, name: p.name, role: p.role }))
    .filter((p) => p.userId != null)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — hook test green; all prior tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/screens/live/useLessonPresence.js src/screens/live/useLessonPresence.test.js
git commit -m "feat(live): useLessonPresence STOMP hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: LiveLessonPage shell — status, roster, controls + e2e

**Files:**
- Create: `src/screens/live/LiveStatusBadge.jsx`, `src/screens/live/PresenceRoster.jsx`, `src/screens/live/TeacherControls.jsx`
- Modify: `src/screens/LiveLessonPage.jsx` (replace placeholder body)
- Modify: `src/i18n.jsx` (`live.*` keys in ru/en/kk), `src/styles.css` (`.live*`)
- Test: `tests/live-lesson.spec.js` (Playwright, REST mocked)

**Interfaces:**
- Consumes: `getLessonById`, `startLiveLesson`, `pauseLiveLesson`, `resumeLiveLesson`, `completeLiveLesson` (Task 2); `useLessonPresence` (Task 3); `roleFromToken` (Task 1); `statusKey`, `canControl` (Task 1); `useI18n()`; `LearningLayout`.

- [ ] **Step 1: Add i18n keys (ru, en, kk)**

Add to EACH language block in `src/i18n.jsx` (next to the existing `live.wipTitle`/`live.wipSubtitle` from #1 — keep those):

RU:
```js
    'live.title': 'Живой урок',
    'live.loadError': 'Не удалось загрузить урок',
    'live.waiting': 'Преподаватель ещё не начал урок',
    'live.roster.title': 'В классе',
    'live.roster.you': 'Вы',
    'live.roster.empty': 'Пока никого',
    'live.connected': 'На связи',
    'live.disconnected': 'Нет соединения',
    'live.status.inProgress': 'Идёт',
    'live.status.paused': 'На паузе',
    'live.status.scheduled': 'Запланирован',
    'live.status.completed': 'Завершён',
    'live.status.cancelled': 'Отменён',
    'live.controls.start': 'Начать урок',
    'live.controls.pause': 'Пауза',
    'live.controls.resume': 'Продолжить',
    'live.controls.complete': 'Завершить',
```

EN:
```js
    'live.title': 'Live lesson',
    'live.loadError': 'Could not load the lesson',
    'live.waiting': 'The teacher has not started the lesson yet',
    'live.roster.title': 'In class',
    'live.roster.you': 'You',
    'live.roster.empty': 'Nobody yet',
    'live.connected': 'Connected',
    'live.disconnected': 'Disconnected',
    'live.status.inProgress': 'Live',
    'live.status.paused': 'Paused',
    'live.status.scheduled': 'Scheduled',
    'live.status.completed': 'Completed',
    'live.status.cancelled': 'Cancelled',
    'live.controls.start': 'Start lesson',
    'live.controls.pause': 'Pause',
    'live.controls.resume': 'Resume',
    'live.controls.complete': 'Finish',
```

KK:
```js
    'live.title': 'Тікелей сабақ',
    'live.loadError': 'Сабақты жүктеу мүмкін болмады',
    'live.waiting': 'Мұғалім сабақты әлі бастаған жоқ',
    'live.roster.title': 'Сыныпта',
    'live.roster.you': 'Сіз',
    'live.roster.empty': 'Әзірге ешкім жоқ',
    'live.connected': 'Байланыста',
    'live.disconnected': 'Байланыс жоқ',
    'live.status.inProgress': 'Жүріп жатыр',
    'live.status.paused': 'Кідіртілді',
    'live.status.scheduled': 'Жоспарланған',
    'live.status.completed': 'Аяқталды',
    'live.status.cancelled': 'Бас тартылды',
    'live.controls.start': 'Сабақты бастау',
    'live.controls.pause': 'Кідірту',
    'live.controls.resume': 'Жалғастыру',
    'live.controls.complete': 'Аяқтау',
```

- [ ] **Step 2: Add styles**

Append to `src/styles.css`:
```css
/* --- Live lesson shell --- */
.live { padding: 16px; max-width: 900px; }
.live__back { background: none; border: 0; color: #7a4dff; font-weight: 600; cursor: pointer; padding: 8px 0; }
.live__head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 8px 0 16px; }
.live__title { font-size: 20px; font-weight: 700; margin: 0; }
.live__teacher { color: #6b7280; }
.live-badge { font-size: 12px; border-radius: 999px; padding: 3px 10px; background: #e6ecff; color: #2b57d6; }
.live-badge--inProgress, .live-badge--paused { background: #d3ecff; color: #0b74c4; }
.live-badge--completed { background: #dcf3e2; color: #2c8a45; }
.live-badge--cancelled { background: #eceef1; color: #6b7280; }
.live__status-msg { color: #6b7280; margin: 8px 0; }
.live__section { background: #fff; border: 1px solid #eceef1; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.live__section-h { font-size: 13px; font-weight: 600; color: #6b7280; margin: 0 0 10px; }
.live-roster { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.live-roster__item { display: flex; align-items: center; gap: 6px; }
.live-roster__avatar { width: 34px; height: 34px; border-radius: 50%; background: #7a4dff; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; position: relative; }
.live-roster__dot { width: 9px; height: 9px; border-radius: 50%; background: #2c8a45; position: absolute; right: -1px; bottom: -1px; border: 2px solid #fff; }
.live-roster__name { font-size: 13px; }
.live-conn { font-size: 12px; margin-left: auto; }
.live-conn--on { color: #2c8a45; }
.live-conn--off { color: #9aa0a6; }
.live-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.live-controls button { border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
.live-controls .btn-start, .live-controls .btn-resume { background: #7a4dff; color: #fff; }
.live-controls .btn-pause { background: #f0e9ff; color: #5b34d6; }
.live-controls .btn-complete { background: #eceef1; color: #333; }
```

- [ ] **Step 3: Create `LiveStatusBadge.jsx`**

`src/screens/live/LiveStatusBadge.jsx`:
```jsx
import { useI18n } from '../../i18n.jsx'
import { statusKey } from './liveStatus.js'

export default function LiveStatusBadge({ status }) {
  const { t } = useI18n()
  const key = statusKey(status)
  return <span className={`live-badge live-badge--${key}`}>{t(`live.status.${key}`)}</span>
}
```

- [ ] **Step 4: Create `PresenceRoster.jsx`**

`src/screens/live/PresenceRoster.jsx`:
```jsx
import { useI18n } from '../../i18n.jsx'

export default function PresenceRoster({ roster, connected, selfUserId }) {
  const { t } = useI18n()
  return (
    <div className="live__section">
      <div className="live__section-h">
        {t('live.roster.title')}
        <span className={`live-conn ${connected ? 'live-conn--on' : 'live-conn--off'}`}>
          {connected ? t('live.connected') : t('live.disconnected')}
        </span>
      </div>
      {roster.length === 0 ? (
        <div className="live-roster__name">{t('live.roster.empty')}</div>
      ) : (
        <div className="live-roster">
          {roster.map((p) => {
            const label = p.userId === selfUserId ? t('live.roster.you') : (p.name || '—')
            const initial = (label || '·').trim().charAt(0).toUpperCase()
            return (
              <div key={p.userId} className="live-roster__item">
                <span className="live-roster__avatar">{initial}<span className="live-roster__dot" /></span>
                <span className="live-roster__name">{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `TeacherControls.jsx`**

`src/screens/live/TeacherControls.jsx`:
```jsx
import { useI18n } from '../../i18n.jsx'

export default function TeacherControls({ status, busy, onStart, onPause, onResume, onComplete }) {
  const { t } = useI18n()
  return (
    <div className="live__section">
      <div className="live-controls">
        {status === 'SCHEDULED' && <button className="btn-start" disabled={busy} onClick={onStart}>{t('live.controls.start')}</button>}
        {status === 'IN_PROGRESS' && <button className="btn-pause" disabled={busy} onClick={onPause}>{t('live.controls.pause')}</button>}
        {status === 'PAUSED' && <button className="btn-resume" disabled={busy} onClick={onResume}>{t('live.controls.resume')}</button>}
        {(status === 'IN_PROGRESS' || status === 'PAUSED') && <button className="btn-complete" disabled={busy} onClick={onComplete}>{t('live.controls.complete')}</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Replace `LiveLessonPage.jsx` body**

`src/screens/LiveLessonPage.jsx` (full replacement):
```jsx
import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson } from '../api.js'
import { roleFromToken } from '../lib/jwt.js'
import { canControl } from './live/liveStatus.js'
import { useLessonPresence } from './live/useLessonPresence.js'
import LiveStatusBadge from './live/LiveStatusBadge.jsx'
import PresenceRoster from './live/PresenceRoster.jsx'
import TeacherControls from './live/TeacherControls.jsx'

const PAUSE_MINUTES = 5

export default function LiveLessonPage({ lessonId, userName, userLevel, token, onNav, onProfile, onBack }) {
  const { t } = useI18n()
  const [lesson, setLesson] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [busy, setBusy] = useState(false)
  const role = roleFromToken(token)
  const isStaff = canControl(role)
  const { roster, connected } = useLessonPresence(lessonId, token)
  const pollRef = useRef(null)

  function load() {
    return getLessonById(token, lessonId)
      .then((data) => { setLesson(data); setState('ready') })
      .catch(() => setState('error'))
  }

  useEffect(() => {
    if (!lessonId || !token) return undefined
    load()
    // No STOMP status topic exists; a student polls so "teacher started" appears on its own.
    if (!isStaff) {
      pollRef.current = setInterval(() => {
        getLessonById(token, lessonId).then((d) => setLesson(d)).catch(() => {})
      }, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, token, isStaff])

  async function act(fn) {
    setBusy(true)
    try { const updated = await fn(token, lessonId); if (updated) setLesson(updated); else await load() }
    catch { /* keep current lesson; surface via reload */ await load() }
    finally { setBusy(false) }
  }

  const status = lesson?.status
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="live">
        <button className="live__back" onClick={onBack}>← {t('schedule.back')}</button>

        {state === 'loading' && <p className="live__status-msg">{t('schedule.loading')}</p>}
        {state === 'error' && <p className="live__status-msg">{t('live.loadError')}</p>}

        {state === 'ready' && lesson && (
          <>
            <div className="live__head">
              <h1 className="live__title">{t('live.title')}</h1>
              <span className="live__teacher">{lesson.teacherName || ''}</span>
              <LiveStatusBadge status={status} />
            </div>

            {!isStaff && status === 'SCHEDULED' && <p className="live__status-msg">{t('live.waiting')}</p>}

            {isStaff && (
              <TeacherControls
                status={status}
                busy={busy}
                onStart={() => act(startLiveLesson)}
                onPause={() => act((tk, id) => pauseLiveLesson(tk, id, PAUSE_MINUTES))}
                onResume={() => act(resumeLiveLesson)}
                onComplete={() => act(completeLiveLesson)}
              />
            )}

            <PresenceRoster roster={roster} connected={connected} selfUserId={undefined} />
          </>
        )}
      </div>
    </LearningLayout>
  )
}
```

- [ ] **Step 7: Write the e2e test**

`tests/live-lesson.spec.js`:
```js
import { test, expect } from '@playwright/test'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// JWT with a role claim (header.payload.sig); payload = base64url({role})
const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 1 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

const OCC = (status) => ([
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-02T03:00:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: status, participantStatus: 'SCHEDULED' },
])
const SUMMARY = { conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 }

async function enterLesson(page, { role, lessonStatus }) {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt(role))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 1, name: 'U', role, languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCC(lessonStatus))))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json(SUMMARY)))
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: lessonStatus, teacherName: 'Test Teacher DEV', participants: [] })))
  await page.goto('/')
  await page.getByText('Уроки', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Войти в класс' }).first().click()
  await expect(page.getByText('Живой урок')).toBeVisible()
}

test('teacher on an in-progress lesson sees lifecycle controls', async ({ page }) => {
  await enterLesson(page, { role: 'TEACHER', lessonStatus: 'IN_PROGRESS' })
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Завершить' })).toBeVisible()
})

test('student on an in-progress lesson sees status but no controls', async ({ page }) => {
  await enterLesson(page, { role: 'STUDENT', lessonStatus: 'IN_PROGRESS' })
  await expect(page.getByText('Идёт').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Пауза' })).toHaveCount(0)
})

test('teacher can start a scheduled lesson and the badge flips to live', async ({ page }) => {
  await enterLesson(page, { role: 'TEACHER', lessonStatus: 'SCHEDULED' })
  await page.route('**/admin/lessons/14/start', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', teacherName: 'Test Teacher DEV', participants: [] })))
  await page.getByRole('button', { name: 'Начать урок' }).click()
  await expect(page.locator('.live-badge').getByText('Идёт')).toBeVisible()
})
```
Note: the schedule join gate requires an enterable status. For the SCHEDULED test, the schedule row won't show «Войти в класс» (gate = IN_PROGRESS/PAUSED). So for the "start a scheduled lesson" case the teacher cannot reach the live screen via the schedule join button. Handle this in the test by seeding the schedule occurrence with `IN_PROGRESS` for navigation but mocking `/admin/lessons/14` (the live screen's own load) with `SCHEDULED` — i.e. call `enterLesson(page, { role:'TEACHER', lessonStatus:'IN_PROGRESS' })` for navigation, then override the `/admin/lessons/14` route to return SCHEDULED before asserting the Start button, then mock `/start`. Adjust the third test accordingly during implementation so navigation stays possible while the live screen shows SCHEDULED.

- [ ] **Step 8: Run e2e (RED → GREEN)**

Run: `npm run test:e2e -- live-lesson`
Expected: after Steps 1-6, PASS on the default project. If nav/selectors differ, follow the #1 pattern (open mobile drawer, or `--project=desktop`) until green; do not weaken role/status assertions.

- [ ] **Step 9: Confirm the unit suite still passes**

Run: `npm test`
Expected: PASS — Task 1-3 unit tests green.

- [ ] **Step 10: Commit**

```bash
git add src/screens/live/LiveStatusBadge.jsx src/screens/live/PresenceRoster.jsx src/screens/live/TeacherControls.jsx src/screens/LiveLessonPage.jsx src/i18n.jsx src/styles.css tests/live-lesson.spec.js
git commit -m "feat(live): live-lesson shell — status, presence roster, teacher controls

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after Task 4)
- `npm run dev`; log in as the student (Сабина, OTP 0000); open «Уроки» → join the in-progress lesson → the live shell loads with the status badge and presence roster; open the same lesson as the teacher in web-admin and confirm both appear in each other's roster (verifies STOMP from jts-web-app end-to-end).
- Confirm the presence payload shape matches `normalizeRoster`; if the server wraps entries differently, adjust `normalizeRoster` and note it.

## Notes for later sub-projects
- The live shell's body is the seam for #3 (board) / #4 (sections) / #5 (mirror): add panels inside `LiveLessonPage` below the roster, reusing the same `token`/`lessonId` and a board socket built like `useLessonPresence`.
