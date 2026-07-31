# Практика: прогресс по аккаунту — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сохранять прохождение практики (аудирование / словарь / грамматика) по аккаунту в собственном Neon Postgres приложения, чтобы прогресс был одинаков на всех устройствах залогиненного пользователя.

**Architecture:** Всё внутри `jts-web-app` (Next.js App Router + Neon), переиспользуя механизмы тьютора: `resolveProfileId` (Bearer → `user-<id>`), слой `src/lib/db/*` с мягкой деградацией `getSql()`, роуты `src/app/api/*`. Одна таблица `practice_state` (блоб на модуль), пара роутов `/api/practice/state`, тонкий клиентский синк. Тьютор и Spring-бэкенд не трогаются. Гостевой прогресс на сервер не пишется.

**Tech Stack:** Next.js (App Router, `runtime = 'nodejs'`), `@neondatabase/serverless`, React (клиентские экраны), Playwright (`npm run test:e2e`) — единственный тест-раннер; чистая логика тестируется node-спеками без `{ page }` и с относительными импортами.

## Global Constraints

- **Тест-раннер только Playwright** (`npm run test:e2e`). Node-логику тестируем спеками без `{ page }`, импорт — относительный путь (не алиас `@`). Браузерные — с `{ page }` / `{ request }`.
- **Node ≥18** (глобальные `Request`/`Response`/`Response.json` из undici — на них опираются гейт и его тест).
- **Чистые (unit-тестируемые) модули не импортируют алиас `@`** и не трогают `localStorage`/сеть на верхнем уровне — только внутри функций или через инъекцию зависимостей.
- **Только для залогиненных:** роуты практики требуют Bearer-токен (нет → 401). Аноним на сервер не пишет и не читает.
- **Семантика записи:** `grammar`/`listening` — union множеств `done` (монотонность); `vocab` — replace всего блоба.
- **localStorage-ключи неизменны:** `jts_vocab2` (объект), `jts_grammar_done` (JSON-массив), `jts_listening_done` (JSON-массив, новый). Экраны читают их как раньше.
- **Ветки:** реализация на `feat/practice-progress-sync` (от `origin/develop`) → PR в `develop`; затем черри-пик в `backport/practice-progress-sync` (от `origin/main`) → PR в `main`. Схему применять вручную: `psql "$DATABASE_URL" -f src/lib/schema.sql`.
- Коммиты частые, по шагам. Перед PR: `npm run test:e2e` зелёный.

---

## Обзор файлов

Создаются:
- `src/practice/practiceKeys.js` — единый источник ключей localStorage и имён событий (pure).
- `src/lib/practiceContract.js` — валидация/нормализация/merge + гейт аутентификации (pure).
- `src/lib/db/practice.js` — SQL-слой (Neon), использует контракт.
- `src/app/api/practice/state/route.js` — GET/POST-роут.
- `src/practice/practiceSyncCore.js` — чистые хелперы клиента (serialize/apply), зависимости инъектируются.
- `src/practice/practiceSync.js` — тонкие обёртки (`'use client'`): fetch/localStorage/window.
- `src/practice/listening/listeningProgress.js` — «пройдено» для аудирования (по образцу `grammarProgress.js`).
- Тесты: `tests/practice-contract.spec.js`, `tests/practice-db-degrade.spec.js`, `tests/practice-route.spec.js`, `tests/practice-sync-core.spec.js`, `tests/listening-progress.spec.js`, `tests/practice-sync-app.spec.js`.

Модифицируются:
- `src/lib/schema.sql` — добавить таблицу `practice_state`.
- `src/practice/grammar/grammarProgress.js` — брать ключ/событие из `practiceKeys.js`, добавить `pushModule` в `markUnitDone`.
- `src/practice/vocab/state.js` — добавить `pushModule('vocab', s)` в `persist`.
- `src/screens/ListeningPage.jsx` — на верный ответ вызывать `markTaskDone(current.id)`; показать счётчик пройденных на интро.
- `src/App.jsx` — hydrate при входе/восстановлении, clear при выходе.

---

## Task 1: Ключи практики + чистый контракт

**Files:**
- Create: `src/practice/practiceKeys.js`
- Create: `src/lib/practiceContract.js`
- Test: `tests/practice-contract.spec.js`

**Interfaces:**
- Produces (`practiceKeys.js`): `VOCAB_KEY`, `GRAMMAR_KEY`, `LISTENING_KEY`, `GRAMMAR_PROGRESS_EVENT`, `LISTENING_PROGRESS_EVENT` (string-константы).
- Produces (`practiceContract.js`): `PRACTICE_MODULES: string[]`, `isValidModule(m): boolean`, `normalizeDone(arr): string[]`, `emptyState(module): object`, `mergeModuleState(module, existing, incoming): object`, `unauthorizedIfNoBearer(request): Response|null`.

- [ ] **Step 1: Создать `src/practice/practiceKeys.js`**

```js
// Единый источник ключей localStorage и имён DOM-событий для разделов практики.
// Держим отдельно, чтобы и модули прогресса, и клиентский синк ссылались на одни
// и те же строки (иначе рассинхрон ключей молча ломает гидратацию).

export const VOCAB_KEY = 'jts_vocab2'
export const GRAMMAR_KEY = 'jts_grammar_done'
export const LISTENING_KEY = 'jts_listening_done'

export const GRAMMAR_PROGRESS_EVENT = 'grammar-progress'
export const LISTENING_PROGRESS_EVENT = 'listening-progress'
```

- [ ] **Step 2: Написать падающий тест `tests/practice-contract.spec.js`**

```js
import { test, expect } from '@playwright/test'
import {
  PRACTICE_MODULES,
  isValidModule,
  normalizeDone,
  emptyState,
  mergeModuleState,
  unauthorizedIfNoBearer,
} from '../src/lib/practiceContract.js'

test.describe('practiceContract — валидация и merge', () => {
  test('модули: белый список', () => {
    expect(PRACTICE_MODULES).toEqual(['vocab', 'grammar', 'listening'])
    expect(isValidModule('grammar')).toBe(true)
    expect(isValidModule('tutor')).toBe(false)
    expect(isValidModule(undefined)).toBe(false)
  })

  test('normalizeDone: только строки, без дублей', () => {
    expect(normalizeDone(['a', 'a', 'b', '', 1, null])).toEqual(['a', 'b'])
    expect(normalizeDone('nope')).toEqual([])
  })

  test('emptyState: done-модули пустой массив, vocab — объект', () => {
    expect(emptyState('grammar')).toEqual({ done: [] })
    expect(emptyState('listening')).toEqual({ done: [] })
    expect(emptyState('vocab')).toEqual({})
  })

  test('mergeModuleState: grammar/listening объединяют done', () => {
    expect(mergeModuleState('grammar', { done: ['a1:1'] }, { done: ['a1:2', 'a1:1'] }))
      .toEqual({ done: ['a1:1', 'a1:2'] })
    expect(mergeModuleState('listening', undefined, { done: ['a1_001'] }))
      .toEqual({ done: ['a1_001'] })
  })

  test('mergeModuleState: vocab заменяет блоб целиком', () => {
    const incoming = { level: 'B1', srs: { 5: { box: 2 } } }
    expect(mergeModuleState('vocab', { level: 'A1' }, incoming)).toEqual(incoming)
    // мусорный incoming не затирает прежнее
    expect(mergeModuleState('vocab', { level: 'A1' }, null)).toEqual({ level: 'A1' })
  })

  test('unauthorizedIfNoBearer: нет токена → 401, есть → null', async () => {
    const withTok = new Request('http://x', { headers: { authorization: 'Bearer abc' } })
    expect(unauthorizedIfNoBearer(withTok)).toBeNull()
    const noTok = new Request('http://x')
    const res = unauthorizedIfNoBearer(noTok)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npm run test:e2e -- practice-contract`
Expected: FAIL (модуль `../src/lib/practiceContract.js` не найден).

- [ ] **Step 4: Создать `src/lib/practiceContract.js`**

```js
// Чистые (без БД/сети/DOM) хелперы синхронизации прогресса практики. Пример
// проверяем на Web Request — поэтому здесь нет ни импортов алиаса `@`, ни доступа
// к localStorage: всё unit-тестируется в node.

export const PRACTICE_MODULES = ['vocab', 'grammar', 'listening']

// Модули, чей state — это растущее множество пройденных id: прохождение нельзя
// терять при синхронизации двух устройств, поэтому их POST объединяет, а не
// заменяет.
const DONE_MODULES = ['grammar', 'listening']

export function isValidModule(m) {
  return PRACTICE_MODULES.includes(m)
}

// Множество пройденных id: только непустые строки, без дублей, стабильный порядок.
export function normalizeDone(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  for (const x of arr) if (typeof x === 'string' && x) seen.add(x)
  return [...seen]
}

export function emptyState(module) {
  return DONE_MODULES.includes(module) ? { done: [] } : {}
}

// Семантика записи: union для done-модулей (монотонность прохождения), replace
// для vocab (настройки + SRS перезаписываются целиком).
export function mergeModuleState(module, existing, incoming) {
  if (DONE_MODULES.includes(module)) {
    return {
      done: normalizeDone([
        ...normalizeDone(existing?.done),
        ...normalizeDone(incoming?.done),
      ]),
    }
  }
  return incoming && typeof incoming === 'object' ? incoming : existing ?? {}
}

// Гейт «только для залогиненных»: без валидного Bearer-заголовка возвращаем
// готовый 401, иначе null. Аутентификация первична — проверяется до наличия БД.
export function unauthorizedIfNoBearer(request) {
  const header = (request.headers.get('authorization') || '').trim()
  if (/^Bearer\s+\S+/i.test(header)) return null
  return Response.json({ configured: true, error: 'Authentication required.' }, { status: 401 })
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npm run test:e2e -- practice-contract`
Expected: PASS (все проекты mobile/desktop).

- [ ] **Step 6: Commit**

```bash
git add src/practice/practiceKeys.js src/lib/practiceContract.js tests/practice-contract.spec.js
git commit -m "feat(practice): pure contract + shared storage keys for progress sync"
```

---

## Task 2: Схема БД + SQL-слой

**Files:**
- Modify: `src/lib/schema.sql` (добавить блок в конец)
- Create: `src/lib/db/practice.js`
- Test: `tests/practice-db-degrade.spec.js`

**Interfaces:**
- Consumes: `getSql` (`src/lib/db/sql.js`), `isValidModule`/`emptyState`/`mergeModuleState` (Task 1).
- Produces: `loadPracticeState(profileId): Promise<{vocab, grammar:{done}, listening:{done}}>`, `savePracticeState(profileId, module, state): Promise<object|undefined>`.

- [ ] **Step 1: Добавить таблицу в `src/lib/schema.sql`** (в самый конец файла)

```sql
-- ===========================================================================
-- Прогресс разделов практики (аудирование / словарь / грамматика), по аккаунту.
-- Один блоб на модуль; содержимое зеркалит клиентские localStorage-payload'ы.
-- profile_id = 'user-<id>' из resolveProfileId. Независимо от таблиц тьютора.
-- ===========================================================================
create table if not exists practice_state (
  profile_id text        not null,
  module     text        not null,   -- 'vocab' | 'grammar' | 'listening'
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, module)
);
```

- [ ] **Step 2: Написать падающий тест `tests/practice-db-degrade.spec.js`**

```js
import { test, expect } from '@playwright/test'

// Контракт мягкой деградации: без DATABASE_URL getSql() === null, поэтому чтение
// отдаёт дефолты, а запись — no-op (не бросает). Детерминированно, без Neon.
// Важно: getSql кэширует результат на первом вызове, а DATABASE_URL читает внутри
// вызова — поэтому чистим env ДО первого обращения (динамический импорт).

test.describe('practice db — деградация без DATABASE_URL', () => {
  test('load отдаёт дефолты, save не бросает', async () => {
    delete process.env.DATABASE_URL
    const { loadPracticeState, savePracticeState } = await import('../src/lib/db/practice.js')
    const state = await loadPracticeState('user-1')
    expect(state).toEqual({ vocab: {}, grammar: { done: [] }, listening: { done: [] } })
    await expect(savePracticeState('user-1', 'grammar', { done: ['a1:1'] })).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npm run test:e2e -- practice-db-degrade`
Expected: FAIL (модуль `../src/lib/db/practice.js` не найден).

- [ ] **Step 4: Создать `src/lib/db/practice.js`**

```js
// SQL-слой прогресса практики (Neon). Ключ profileId приходит из resolveProfileId
// ('user-<id>'). Мягкая деградация: getSql() === null → чтение отдаёт дефолты,
// запись — no-op (как в остальных db-модулях приложения).

import { getSql } from './sql.js'
import { isValidModule, emptyState, mergeModuleState } from '../practiceContract.js'

export async function loadPracticeState(profileId) {
  const out = { vocab: {}, grammar: { done: [] }, listening: { done: [] } }
  const sql = getSql()
  if (!sql) return out
  const rows = await sql`
    select module, state from practice_state where profile_id = ${profileId}
  `
  for (const r of rows) if (isValidModule(r.module)) out[r.module] = r.state
  return out
}

export async function savePracticeState(profileId, module, state) {
  const sql = getSql()
  if (!sql) return
  if (!isValidModule(module)) throw new Error(`unknown practice module: ${module}`)
  // read-merge-write: union для done-модулей не теряет прохождение при синке
  // с разных устройств; для vocab merge просто отдаёт incoming (replace).
  const rows = await sql`
    select state from practice_state
    where profile_id = ${profileId} and module = ${module}
  `
  const existing = rows[0]?.state ?? emptyState(module)
  const merged = mergeModuleState(module, existing, state)
  await sql`
    insert into practice_state (profile_id, module, state)
    values (${profileId}, ${module}, ${JSON.stringify(merged)}::jsonb)
    on conflict (profile_id, module) do update
      set state = ${JSON.stringify(merged)}::jsonb, updated_at = now()
  `
  return merged
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npm run test:e2e -- practice-db-degrade`
Expected: PASS.

- [ ] **Step 6: Применить схему на dev-Neon и проверить таблицу**

```bash
psql "$DATABASE_URL" -f src/lib/schema.sql
psql "$DATABASE_URL" -c "\d practice_state"
```
Expected: таблица `practice_state` с колонками `profile_id, module, state, updated_at` и PK `(profile_id, module)`. (Если `$DATABASE_URL` не выставлен локально — применить на dev-стенде перед мёрджем; шаг обязателен до деплоя роута.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/schema.sql src/lib/db/practice.js tests/practice-db-degrade.spec.js
git commit -m "feat(practice): practice_state table + Neon load/save with union semantics"
```

---

## Task 3: API-роут `/api/practice/state`

**Files:**
- Create: `src/app/api/practice/state/route.js`
- Test: `tests/practice-route.spec.js`

**Interfaces:**
- Consumes: `isDbConfigured` (`@/lib/db/sql.js`), `loadPracticeState`/`savePracticeState` (Task 2), `resolveProfileId` (`@/lib/auth-server.js`), `isValidModule`/`unauthorizedIfNoBearer` (Task 1).
- Produces: HTTP `GET`/`POST` на `/api/practice/state`.

- [ ] **Step 1: Написать падающий тест `tests/practice-route.spec.js`**

```js
import { test, expect } from '@playwright/test'

// Гейт аутентификации проверяется ДО наличия БД, поэтому 401 детерминирован и не
// требует Neon. Happy-path (200 + запись) требует токен + БД → ручная проверка в
// плане (Task 3, Step 6).
test.describe('/api/practice/state — гейт аутентификации', () => {
  test('POST без Bearer → 401', async ({ request }) => {
    const res = await request.post('/api/practice/state', {
      data: { module: 'grammar', state: { done: [] } },
    })
    expect(res.status()).toBe(401)
  })

  test('GET без Bearer → 401', async ({ request }) => {
    const res = await request.get('/api/practice/state')
    expect(res.status()).toBe(401)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm run test:e2e -- practice-route`
Expected: FAIL (роут отсутствует → 404, не 401).

- [ ] **Step 3: Создать `src/app/api/practice/state/route.js`**

```js
// Прогресс практики по аккаунту. GET — весь стейт трёх модулей, POST — upsert
// одного. Только для залогиненных: аутентификация первична (401 без Bearer, ещё
// до проверки БД). Идентичность — resolveProfileId (валидный токен → user-<id>).

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadPracticeState, savePracticeState } from '@/lib/db/practice.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { isValidModule, unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

function dbUnavailable() {
  return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
}

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    const state = await loadPracticeState(resolved.id)
    return Response.json({ configured: true, state })
  } catch (err) {
    console.error('[practice.GET] failed', err)
    return Response.json({ configured: true, error: 'Practice state lookup failed.' }, { status: 500 })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело → провалит валидацию ниже */
  }

  if (!isValidModule(body.module)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }
  if (!body.state || typeof body.state !== 'object') {
    return Response.json({ configured: true, error: 'Invalid state.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    await savePracticeState(resolved.id, body.module, body.state)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[practice.POST] failed', err)
    return Response.json({ configured: true, error: 'Practice state save failed.' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm run test:e2e -- practice-route`
Expected: PASS (401 на GET и POST без токена).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/practice/state/route.js tests/practice-route.spec.js
git commit -m "feat(practice): /api/practice/state GET+POST, logged-in only"
```

- [ ] **Step 6: Ручная проверка happy-path (нужны токен + dev-Neon)**

```bash
# TOKEN — валидный access-токен реального пользователя (из localStorage jts_access_token в браузере).
curl -s -X POST "$BASE/api/practice/state" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"module":"grammar","state":{"done":["a1:1"]}}'
# → {"configured":true,"ok":true}
curl -s "$BASE/api/practice/state" -H "Authorization: Bearer $TOKEN"
# → {"configured":true,"state":{...,"grammar":{"done":["a1:1"]},...}}
# Повторный POST с {"done":["a1:2"]} → GET показывает {"done":["a1:1","a1:2"]} (union).
```

---

## Task 4: Чистое ядро клиентского синка

**Files:**
- Create: `src/practice/practiceSyncCore.js`
- Test: `tests/practice-sync-core.spec.js`

**Interfaces:**
- Consumes: `normalizeDone` (Task 1), ключи/события из `practiceKeys.js` (Task 1).
- Produces: `serializeForPush(module, raw): object`, `applyHydratedState(serverState, {setItem, dispatch}): void`.

- [ ] **Step 1: Написать падающий тест `tests/practice-sync-core.spec.js`**

```js
import { test, expect } from '@playwright/test'
import { serializeForPush, applyHydratedState } from '../src/practice/practiceSyncCore.js'

test.describe('practiceSyncCore — сериализация и применение', () => {
  test('serializeForPush: done-модули из Set/массива → {done:[...]}', () => {
    expect(serializeForPush('grammar', new Set(['a1:1', 'a1:1', 'a1:2'])))
      .toEqual({ done: ['a1:1', 'a1:2'] })
    expect(serializeForPush('listening', ['a1_001'])).toEqual({ done: ['a1_001'] })
  })

  test('serializeForPush: vocab отдаёт объект как есть', () => {
    const s = { level: 'B1', srs: {} }
    expect(serializeForPush('vocab', s)).toBe(s)
  })

  test('applyHydratedState: пишет ключи и будит каталоги', () => {
    const writes = {}
    const events = []
    applyHydratedState(
      { vocab: { level: 'A2' }, grammar: { done: ['a1:3', 'a1:3'] }, listening: { done: ['a1_002'] } },
      { setItem: (k, v) => (writes[k] = v), dispatch: (e) => events.push(e) },
    )
    expect(JSON.parse(writes.jts_vocab2)).toEqual({ level: 'A2' })
    expect(JSON.parse(writes.jts_grammar_done)).toEqual(['a1:3']) // массив, без дублей
    expect(JSON.parse(writes.jts_listening_done)).toEqual(['a1_002'])
    expect(events).toEqual(['grammar-progress', 'listening-progress'])
  })

  test('applyHydratedState: мусорный вход игнорируется', () => {
    let called = false
    applyHydratedState(null, { setItem: () => (called = true), dispatch: () => (called = true) })
    expect(called).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm run test:e2e -- practice-sync-core`
Expected: FAIL (модуль отсутствует).

- [ ] **Step 3: Создать `src/practice/practiceSyncCore.js`**

```js
// Чистые хелперы клиентского синка: что отправлять на сервер и как разложить
// серверный стейт по локальным хранилищам. Ни fetch, ни прямых глобалей —
// localStorage.setItem и window.dispatchEvent инъектируются, поэтому node-тест.

import { normalizeDone } from '../lib/practiceContract.js'
import {
  VOCAB_KEY,
  GRAMMAR_KEY,
  LISTENING_KEY,
  GRAMMAR_PROGRESS_EVENT,
  LISTENING_PROGRESS_EVENT,
} from './practiceKeys.js'

// raw: для vocab — объект стейта; для grammar/listening — Set или массив id.
export function serializeForPush(module, raw) {
  if (module === 'vocab') return raw && typeof raw === 'object' ? raw : {}
  const arr = raw instanceof Set ? [...raw] : raw
  return { done: normalizeDone(arr) }
}

// serverState — ответ GET /api/practice/state (поле state). Пишем в те же ключи,
// что читают экраны, и будим каталоги теми же событиями, что и локальная отметка.
export function applyHydratedState(serverState, { setItem, dispatch }) {
  if (!serverState || typeof serverState !== 'object') return
  if (serverState.vocab && typeof serverState.vocab === 'object') {
    setItem(VOCAB_KEY, JSON.stringify(serverState.vocab))
  }
  if (serverState.grammar) {
    setItem(GRAMMAR_KEY, JSON.stringify(normalizeDone(serverState.grammar.done)))
    dispatch(GRAMMAR_PROGRESS_EVENT)
  }
  if (serverState.listening) {
    setItem(LISTENING_KEY, JSON.stringify(normalizeDone(serverState.listening.done)))
    dispatch(LISTENING_PROGRESS_EVENT)
  }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm run test:e2e -- practice-sync-core`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/practice/practiceSyncCore.js tests/practice-sync-core.spec.js
git commit -m "feat(practice): pure sync core — serialize push + apply hydrated state"
```

---

## Task 5: Обёртки синка + подключение словаря и грамматики

**Files:**
- Create: `src/practice/practiceSync.js`
- Modify: `src/practice/grammar/grammarProgress.js` (ключ/событие из `practiceKeys.js`; push в `markUnitDone`)
- Modify: `src/practice/vocab/state.js` (push в `persist`)

**Interfaces:**
- Consumes: `loadToken` (`../lib/session.js`), `applyHydratedState`/`serializeForPush` (Task 4), ключи (Task 1).
- Produces: `isSyncEnabled(): boolean`, `pushModule(module, raw): void` (debounce), `hydratePractice(token): Promise<void>`, `clearLocalPractice(): void`.

- [ ] **Step 1: Создать `src/practice/practiceSync.js`**

```js
'use client'

// Тонкие обёртки клиентского синка практики: fetch + localStorage + window.
// Вся чистая логика — в practiceSyncCore.js (там же тесты). Синк работает только
// для залогиненных: без токена pushModule/hydrate — no-op (гость на сервер не
// пишет). Best-effort: сетевые осечки логируются, localStorage уже записан.

import { loadToken } from '../lib/session.js'
import { applyHydratedState, serializeForPush } from './practiceSyncCore.js'
import { VOCAB_KEY, GRAMMAR_KEY, LISTENING_KEY } from './practiceKeys.js'

export function isSyncEnabled() {
  return !!loadToken()
}

// Debounce на модуль: словарь пишет SRS по ходу задания, грамматика/аудирование —
// по факту прохождения; частые записи схлопываем в один POST.
const timers = {}
export function pushModule(module, raw) {
  const token = loadToken()
  if (!token) return
  const state = serializeForPush(module, raw)
  clearTimeout(timers[module])
  timers[module] = setTimeout(() => {
    fetch('/api/practice/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ module, state }),
    }).catch((e) => console.warn('[practice.sync] push failed', module, e))
  }, 600)
}

// Прогружает серверный прогресс в локальные ключи. Перезаписываем ТОЛЬКО при
// успешном ответе: сетевая осечка не должна стирать локальный кэш. Успешная
// гидратация == «сервер — источник истины»: пустой стейт модуля затирает
// локальный (изоляция аккаунтов + «гостевой прогресс не переносится»).
export async function hydratePractice(token) {
  if (!token) return
  let data
  try {
    const res = await fetch('/api/practice/state', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    data = await res.json()
  } catch (e) {
    console.warn('[practice.sync] hydrate failed', e)
    return
  }
  if (!data?.state) return
  applyHydratedState(data.state, {
    setItem: (k, v) => {
      try { localStorage.setItem(k, v) } catch {}
    },
    dispatch: (name) => {
      try { window.dispatchEvent(new Event(name)) } catch {}
    },
  })
}

export function clearLocalPractice() {
  for (const k of [VOCAB_KEY, GRAMMAR_KEY, LISTENING_KEY]) {
    try { localStorage.removeItem(k) } catch {}
  }
}
```

- [ ] **Step 2: Обновить `src/practice/grammar/grammarProgress.js`** — брать ключ/событие из общего модуля и слать push при прохождении. Заменить строки 7-8:

```js
import { GRAMMAR_KEY as KEY, GRAMMAR_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'
```

(удалить прежние `const KEY = 'jts_grammar_done'` и `const EVENT = 'grammar-progress'`). Затем в `markUnitDone` после `write(set)` добавить push всего множества:

```js
export function markUnitDone(level, unitId) {
  const set = read()
  const key = unitKey(level, unitId)
  if (set.has(key)) return
  set.add(key)
  write(set)
  pushModule('grammar', set) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}
```

- [ ] **Step 3: Обновить `src/practice/vocab/state.js`** — слать push после локальной записи. Добавить импорт вверху (после строки 1):

```js
import { pushModule } from '../practiceSync.js'
```

и в `persist` (строки 28-34) добавить push:

```js
function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* приватный режим / переполнение — прогресс просто не сохранится */
  }
  pushModule('vocab', s) // debounced серверный синк (no-op для гостя)
}
```

- [ ] **Step 4: Регрессия существующих тестов практики (импорты/поведение не сломаны)**

Run: `npm run test:e2e -- grammar vocab practice-vocab`
Expected: PASS (грамматика/словарь работают как раньше; push для гостя — no-op, сеть не дёргается).

- [ ] **Step 5: Commit**

```bash
git add src/practice/practiceSync.js src/practice/grammar/grammarProgress.js src/practice/vocab/state.js
git commit -m "feat(practice): sync wrappers + wire vocab & grammar write-through"
```

---

## Task 6: Аудирование — понятие «пройдено» + синк

**Files:**
- Create: `src/practice/listening/listeningProgress.js`
- Modify: `src/screens/ListeningPage.jsx` (отметка на верный ответ; счётчик на интро)
- Test: `tests/listening-progress.spec.js`

**Interfaces:**
- Consumes: ключи/события (Task 1), `pushModule` (Task 5).
- Produces: `getListeningDone(level): Set<string>`, `isTaskDone(taskId): boolean`, `markTaskDone(taskId): void`, реэкспорт `LISTENING_PROGRESS_EVENT`.

- [ ] **Step 1: Написать падающий тест `tests/listening-progress.spec.js`** (node-спек со стабами глобалей)

```js
import { test, expect } from '@playwright/test'

// listeningProgress трогает localStorage/window, но логика чистая — тестируем в
// node с минимальным shim глобалей (браузерный dynamic import из /src в Next не
// резолвится). pushModule без токена — no-op, поэтому сеть не задействована.
test.describe('listeningProgress — отметка пройденных заданий', () => {
  test('markTaskDone добавляет id, игнорирует дубли, фильтрует по уровню', async () => {
    const store = {}
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
    globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} }

    const m = await import('../src/practice/listening/listeningProgress.js')
    m.markTaskDone('a1_001')
    m.markTaskDone('a1_001') // дубль игнорируется
    m.markTaskDone('a2_005')

    expect(JSON.parse(store.jts_listening_done).sort()).toEqual(['a1_001', 'a2_005'])
    expect(m.isTaskDone('a1_001')).toBe(true)
    expect([...m.getListeningDone('a1')]).toEqual(['a1_001'])
  })
})
```

> Примечание для исполнителя: `getListeningDone('a1')` фильтрует по префиксу `a1_`, поэтому `a2_005` в набор уровня a1 не попадает. Стаб глобалей ставим ДО `import` (модуль читает `localStorage` внутри функций, но подстраховываемся).

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm run test:e2e -- listening-progress`
Expected: FAIL (модуль отсутствует).

- [ ] **Step 3: Создать `src/practice/listening/listeningProgress.js`** (по образцу `grammarProgress.js`)

```js
'use client'

// Пройденные задания аудирования. У раздела не было ни хранения, ни понятия
// «пройдено» — вводим множество id верно выполненных заданий (id стабильны:
// a1_001, a2_005, … в public/practice/listening/content/<level>.json). Ключ и
// событие — общие из practiceKeys.js.

import { LISTENING_KEY as KEY, LISTENING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'

function read() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function write(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
}

export function isTaskDone(taskId) {
  return read().has(taskId)
}

// Множество пройденных id для уровня (префикс id — код уровня: a1_001 → 'a1').
export function getListeningDone(level) {
  const prefix = `${String(level).toLowerCase()}_`
  const out = new Set()
  for (const id of read()) if (id.startsWith(prefix)) out.add(id)
  return out
}

export function markTaskDone(taskId) {
  if (typeof taskId !== 'string' || !taskId) return
  const set = read()
  if (set.has(taskId)) return
  set.add(taskId)
  write(set)
  pushModule('listening', set) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export const LISTENING_PROGRESS_EVENT = EVENT
```

- [ ] **Step 4: Отмечать задание пройденным в `src/screens/ListeningPage.jsx`** — импорт вверху экрана (рядом с прочими импортами практики):

```js
import { markTaskDone, getListeningDone, LISTENING_PROGRESS_EVENT } from '../practice/listening/listeningProgress.js'
```

В `submit` (ветка `if (ok)`) добавить отметку по id текущего задания:

```js
    if (ok) {
      setCoins((c) => c + COINS_PER_TASK)
      setCorrect((c) => c + 1)
      markTaskDone(current.id)
    } else {
```

- [ ] **Step 5: Показать счётчик пройденных на интро** — в `ListeningPage` (компонент экрана, где `level` уже вычислен) добавить хук и передать в `Intro`:

```js
  // Счётчик пройденных заданий уровня — обновляется на отметку и на гидратацию
  // (событие LISTENING_PROGRESS_EVENT шлёт и локальная отметка, и синк при входе).
  const [doneCount, setDoneCount] = useState(() => getListeningDone(level).size)
  useEffect(() => {
    const refresh = () => setDoneCount(getListeningDone(level).size)
    refresh()
    window.addEventListener(LISTENING_PROGRESS_EVENT, refresh)
    return () => window.removeEventListener(LISTENING_PROGRESS_EVENT, refresh)
  }, [level])
```

Передать `doneCount` в `<Intro ... doneCount={doneCount} />` (строка с `phase === 'intro'`) и в компоненте `Intro` (около строки 206) отрисовать под бейджем уровня:

```jsx
      <div className="lt-intro__level">
        {t('kingdom.levelBadge', { label: level.toUpperCase() })}
      </div>
      {doneCount > 0 && (
        <div className="lt-intro__done">{t('listening.doneCount', { count: doneCount })}</div>
      )}
```

Добавить ключ `listening.doneCount` в файлы строк аудирования (там же, где `listening.loadError`; формат с `{count}` — по образцу существующих плюрализованных ключей раздела). Значение (ru): `«Пройдено заданий: {count}»`.

> Примечание для исполнителя: точное имя файла строк и функция `t` — те, что уже используются в `ListeningPage.jsx` (`listening.loadError`, `kingdom.levelBadge`). Добавить перевод во все локали, присутствующие для раздела, чтобы не сыпать fallback.

- [ ] **Step 6: Запустить тесты**

Run: `npm run test:e2e -- listening-progress practice-listening`
Expected: PASS (новый модуль + существующие listening-тесты не сломаны).

- [ ] **Step 7: Commit**

```bash
git add src/practice/listening/listeningProgress.js src/screens/ListeningPage.jsx src/practice/listening/strings.js
git commit -m "feat(practice): listening completion tracking + per-account sync"
```

---

## Task 7: Подключение auth-флоу в App.jsx + интеграционный тест

**Files:**
- Modify: `src/App.jsx` (hydrate при входе/восстановлении, clear при выходе)
- Test: `tests/practice-sync-app.spec.js`

**Interfaces:**
- Consumes: `hydratePractice`/`clearLocalPractice` (Task 5).

- [ ] **Step 1: Написать падающий тест `tests/practice-sync-app.spec.js`**

```js
import { test, expect } from '@playwright/test'

// Интеграция проводки App: при живой сессии (restoreSession → setToken) App
// вызывает hydratePractice, который тянет /api/practice/state и раскладывает
// прогресс по localStorage. Стабаем сеть, чтобы не зависеть от бэкенда/OTP.
test.describe('App wiring — гидратация прогресса практики при входе', () => {
  test('восстановление сессии прогружает пройденные юниты грамматики в localStorage', async ({ page }) => {
    await page.route('**/api/auth/me', (r) =>
      r.fulfill({ json: { user: { userId: 1, name: 'T', phone: null, role: null, languageLevel: 'A1' } } }),
    )
    await page.route('**/api/profile**', (r) => r.fulfill({ json: { configured: true, profile: {} } }))
    await page.route('**/api/practice/state**', (r) =>
      r.fulfill({ json: { configured: true, state: { vocab: {}, grammar: { done: ['a1:3'] }, listening: { done: [] } } } }),
    )
    await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
    await page.goto('/')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('jts_grammar_done')))
      .toContain('a1:3')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm run test:e2e -- practice-sync-app`
Expected: FAIL (App пока не зовёт hydratePractice → ключ `jts_grammar_done` не появляется).

- [ ] **Step 3: Импортировать синк в `src/App.jsx`** — добавить к импорту сессии (после строки 47):

```js
import { hydratePractice, clearLocalPractice } from './practice/practiceSync.js'
```

- [ ] **Step 4: Гидратировать при восстановлении сессии** — в блоке `if (session)` эффекта восстановления (после `setToken(session.token)`, строка 78):

```js
        if (session) {
          setToken(session.token)
          hydratePractice(session.token)
          if (session.name) setName(session.name)
          if (session.phone) setPhone(session.phone)
          if (session.languageLevel) setUserLevel(session.languageLevel)
        }
```

- [ ] **Step 5: Гидратировать при логине** — в обоих местах, где после входа вызывается `mergeAnonymousProgress(tok)` (строки ~203 и ~248), добавить рядом:

```js
        mergeAnonymousProgress(tok)
        hydratePractice(tok)
```

(Успешная гидратация перезаписывает локальные ключи серверным стейтом — гостевой прогресс в аккаунт не переносится, что соответствует принятому решению.)

- [ ] **Step 6: Очищать при выходе** — в обработчике логаута (строка 304, рядом с `clearToken()`):

```js
    clearToken()
    clearLocalPractice()
```

- [ ] **Step 7: Запустить — убедиться, что проходит**

Run: `npm run test:e2e -- practice-sync-app`
Expected: PASS (`jts_grammar_done` содержит `a1:3` после загрузки).

- [ ] **Step 8: Полный прогон + Commit**

```bash
npm run test:e2e
git add src/App.jsx tests/practice-sync-app.spec.js
git commit -m "feat(practice): hydrate progress on login/restore, clear on logout"
```

---

## Финализация

- [ ] **Прогнать весь набор:** `npm run test:e2e` — всё зелёное.
- [ ] **Применить схему на dev-Neon** (если ещё не): `psql "$DATABASE_URL" -f src/lib/schema.sql`.
- [ ] **Ручная сквозная проверка per-account:** залогиниться в двух браузерах одним аккаунтом → пройти юнит грамматики / задание аудирования / словарь в первом → во втором после перезагрузки прогресс виден. Гость (без входа) → прогресс только локальный, при входе не переносится.
- [ ] **PR в develop:** `feat/practice-progress-sync` → база `develop`. Описание: причина (localStorage вместо сервера), решение (таблица `practice_state` + `/api/practice/state` + синк), результат тестов.
- [ ] **Бэкпорт в main:** после мёрджа — `git checkout -b backport/practice-progress-sync origin/main`, черри-пик коммитов задач 1-7, разрешить возможный конфликт контекста в `schema.sql` (у main нет блока `review_item` — добавить блок `practice_state` в конец), `npm run test:e2e`, PR в `main`. Применить схему на prod-Neon перед мёрджем.

---

## Self-Review (выполнено при написании плана)

**Покрытие спека:** аудирование/словарь/грамматика → задачи 5-6; таблица + семантика union/replace → задачи 1-2; роут + гейт «только залогиненные» → задача 3; клиентский синк + hydrate/clear-жизненный-цикл → задачи 4-5, 7; «гостевой прогресс не переносится» → гейт 401 (задача 3) + перезапись при hydrate (задача 5, 7); деградация без Neon → задача 2; обе ветки → финализация. Тьютор/Spring не затрагиваются — новых зависимостей на них нет.

**Плейсхолдеры:** явные «примечания для исполнителя» касаются только имени файла строк аудирования и резолва dynamic import в тесте — с конкретными fallback-инструкциями, не «TODO».

**Согласованность типов:** `pushModule(module, raw)`, `serializeForPush(module, raw)`, `applyHydratedState(state, {setItem, dispatch})`, `hydratePractice(token)`, `clearLocalPractice()`, `markTaskDone(taskId)`, `getListeningDone(level)` — имена совпадают во всех задачах, где потребляются. Ключи/события — единый источник `practiceKeys.js`.
