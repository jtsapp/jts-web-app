# Прогресс «Чтения» с сервера — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** результаты «Чтения» у вошедшего ученика живут на сервере (слияние «лучший результат»), экраны берут их из памяти, загруженной с сервера, итог показывает числа сервера — переполненный localStorage больше ничего не ломает.

**Architecture:** чистый модуль `src/lib/readingState.js` (форма, слияние, дельта) общий для клиента и сервера. Сервер сливает дельты атомарно (advisory-замок в транзакции) и отвечает итоговым состоянием. `readingProgress.js` держит состояние в памяти страницы, шлёт дельты очередью, localStorage — только черновик.

**Tech Stack:** Next.js 16 (App Router как оболочка), React 19, JS (без TS), porsager `postgres`, vitest + jsdom, playwright.

Спека: `docs/superpowers/specs/2026-10-05-reading-progress-server-design.md`.

## Global Constraints

- Только JS (.js/.jsx), без TS-файлов.
- Комментарии на русском, объясняют «почему».
- jsonb пишется только через `sql.json()` / `tx.json()`.
- Экраны «Чтения» берут строки через `useI18n` → `src/i18n.jsx` (ru/en/kk).
- Гость (нет токена) — без сети, как сейчас.
- Тесты гонять с `--exclude '.claude/**'` не нужно: прогон из корня воркtree по путям.

---

### Task 1: Чистые правила формы — `src/lib/readingState.js`

**Files:**
- Create: `src/lib/readingState.js`
- Create: `src/lib/readingState.test.js`
- Modify: `src/lib/practiceContract.js` (комментарий про reading, `mergeModuleState`)

**Interfaces:**
- Produces: `sanitizeReadingState(raw) → {texts}|null`, `mergeReadingState(existing, incoming) → {texts}`, `readingDelta(base, next) → {texts}|null`, `READING_LIMITS`.

- [ ] **Step 1: тест** — `src/lib/readingState.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { sanitizeReadingState, mergeReadingState, readingDelta } from './readingState.js'
import { mergeModuleState } from './practiceContract.js'

const r = (score, total) => ({ score, total })

describe('mergeReadingState', () => {
  it('по заданию побеждает лучший счёт, done только включается', () => {
    const a = { texts: { t1: { ex: { 0: r(5, 5), 1: r(1, 6) }, done: true } } }
    const b = { texts: { t1: { ex: { 0: r(2, 5), 1: r(6, 6) }, done: false } } }
    expect(mergeReadingState(a, b)).toEqual({ texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6) }, done: true } } })
  })

  it('урезанная дельта не стирает остальные задания и тексты', () => {
    const a = { texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6) }, done: false }, t2: { ex: { 0: r(1, 2) }, done: true } } }
    const delta = { texts: { t1: { ex: { 2: r(3, 6) } } } }
    expect(mergeReadingState(a, delta)).toEqual({
      texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6), 2: r(3, 6) }, done: false }, t2: { ex: { 0: r(1, 2) }, done: true } },
    })
  })

  it('повтор той же дельты ничего не меняет', () => {
    const a = { texts: { t1: { ex: { 0: r(3, 5) }, done: false } } }
    const once = mergeReadingState(a, { texts: { t1: { ex: { 0: r(4, 5) } } } })
    expect(mergeReadingState(once, { texts: { t1: { ex: { 0: r(4, 5) } } } })).toEqual(once)
  })

  it('мусор вместо существующего — как пустое', () => {
    expect(mergeReadingState('"{}"', { texts: { t1: { ex: { 0: r(1, 1) } } } }))
      .toEqual({ texts: { t1: { ex: { 0: r(1, 1) }, done: false } } })
  })

  it('mergeModuleState для reading сливает, а не заменяет', () => {
    const a = { texts: { t1: { ex: { 0: r(5, 5) }, done: false } } }
    expect(mergeModuleState('reading', a, { texts: { t1: { ex: { 0: r(0, 5) } } } }).texts.t1.ex[0]).toEqual(r(5, 5))
  })
})

describe('sanitizeReadingState', () => {
  it('приводит к форме и отбрасывает лишние поля', () => {
    expect(sanitizeReadingState({ texts: { t1: { ex: { 0: { score: 1, total: 2, x: 1 } }, extra: 1 } }, junk: 1 }))
      .toEqual({ texts: { t1: { ex: { 0: r(1, 2) }, done: false } } })
  })

  it('пустой объект — пустое состояние', () => {
    expect(sanitizeReadingState({})).toEqual({ texts: {} })
  })

  it.each([
    ['не объект', null],
    ['массив', []],
    ['texts массив', { texts: [] }],
    ['счёт больше максимума', { texts: { t1: { ex: { 0: r(3, 2) } } } }],
    ['отрицательный счёт', { texts: { t1: { ex: { 0: r(-1, 2) } } } }],
    ['дробный счёт', { texts: { t1: { ex: { 0: r(1.5, 2) } } } }],
    ['индекс не число', { texts: { t1: { ex: { a: r(1, 2) } } } }],
    ['индекс за пределом', { texts: { t1: { ex: { 50: r(1, 2) } } } }],
    ['done не boolean', { texts: { t1: { ex: {}, done: 'yes' } } }],
    ['слишком длинный id', { texts: { ['x'.repeat(65)]: { ex: {} } } }],
  ])('отклоняет: %s', (_, raw) => {
    expect(sanitizeReadingState(raw)).toBeNull()
  })

  it('отклоняет больше 1000 текстов', () => {
    const texts = {}
    for (let i = 0; i < 1001; i++) texts['t' + i] = { ex: {} }
    expect(sanitizeReadingState({ texts })).toBeNull()
  })
})

describe('readingDelta', () => {
  it('возвращает только то, что лучше базы', () => {
    const base = { texts: { t1: { ex: { 0: r(5, 5), 1: r(2, 6) }, done: true } } }
    const next = { texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6) }, done: true }, t2: { ex: {}, done: true } } }
    expect(readingDelta(base, next)).toEqual({ texts: { t1: { ex: { 1: r(6, 6) } }, t2: { ex: {}, done: true } } })
  })

  it('нечего досылать — null', () => {
    const s = { texts: { t1: { ex: { 0: r(5, 5) }, done: true } } }
    expect(readingDelta(s, s)).toBeNull()
  })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/readingState.test.js` → FAIL (модуля нет).

- [ ] **Step 3: реализация** — `src/lib/readingState.js`:

```js
// Прогресс «Чтения» {texts: {<id>: {ex: {<i>: {score, total}}, done}}} — чистые
// правила, общие для клиента и сервера: ни БД, ни DOM, ни сети.
//
// Почему слияние, а не замена. До 05.10.2026 клиент слал состояние целиком
// (replace), собранное из localStorage. Когда хранилище забивал кэш каталогов,
// запись в него молча не проходила, и каждое «Проверить» отправляло «старое +
// одно задание»: на сервере оставалось только последнее, а итог показывал 0 %.
// Теперь сервер сливает по заданию «лучший результат» (та же семантика, что у
// пересдачи в прототипе), и никакая отправка не может уменьшить сохранённое.

export const READING_LIMITS = { texts: 1000, idLen: 64, exIndex: 49, total: 1000 }

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Вход с клиента → чистая форма или null (тогда роут отвечает 400). Лишние поля
 * отбрасываем, а не храним: jsonb-колонку читают профиль и квоты, и мусор в ней
 * переживёт любой клиент.
 */
export function sanitizeReadingState(raw) {
  if (!isObj(raw)) return null
  const texts = raw.texts === undefined ? {} : raw.texts
  if (!isObj(texts)) return null
  const ids = Object.keys(texts)
  if (ids.length > READING_LIMITS.texts) return null
  const out = {}
  for (const id of ids) {
    if (!id || id.length > READING_LIMITS.idLen) return null
    const t = texts[id]
    if (!isObj(t)) return null
    const ex = t.ex === undefined ? {} : t.ex
    if (!isObj(ex)) return null
    if (t.done !== undefined && typeof t.done !== 'boolean') return null
    const cleanEx = {}
    for (const k of Object.keys(ex)) {
      if (!/^\d+$/.test(k) || Number(k) > READING_LIMITS.exIndex) return null
      const r = ex[k]
      if (!isObj(r)) return null
      const { score, total } = r
      if (!Number.isInteger(score) || !Number.isInteger(total)) return null
      if (score < 0 || score > total || total > READING_LIMITS.total) return null
      cleanEx[k] = { score, total }
    }
    out[id] = { ex: cleanEx, done: t.done === true }
  }
  return { texts: out }
}

/**
 * existing ⊕ incoming: по каждому заданию — запись с большим счётом (при
 * равенстве входящая: так обновляется total, если текст в данных поменялся);
 * done только включается. Монотонно и идемпотентно — поэтому порядок прихода
 * ответов и повторы отправок ничего не портят.
 */
export function mergeReadingState(existing, incoming) {
  const a = isObj(existing) && isObj(existing.texts) ? existing.texts : {}
  const b = isObj(incoming) && isObj(incoming.texts) ? incoming.texts : {}
  const texts = {}
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = isObj(a[id]) ? a[id] : {}
    const y = isObj(b[id]) ? b[id] : {}
    const ex = { ...(isObj(x.ex) ? x.ex : {}) }
    for (const [k, rec] of Object.entries(isObj(y.ex) ? y.ex : {})) {
      const prev = ex[k]
      if (!prev || rec.score >= prev.score) ex[k] = rec
    }
    texts[id] = { ex, done: !!(x.done || y.done) }
  }
  return { texts }
}

/** Что в next строго лучше, чем в base, — дельта для досылки; null, если нечего. */
export function readingDelta(base, next) {
  const a = isObj(base) && isObj(base.texts) ? base.texts : {}
  const out = {}
  for (const [id, y] of Object.entries(isObj(next) && isObj(next.texts) ? next.texts : {})) {
    const x = isObj(a[id]) ? a[id] : {}
    const ex = {}
    for (const [k, rec] of Object.entries(isObj(y.ex) ? y.ex : {})) {
      const prev = isObj(x.ex) ? x.ex[k] : undefined
      if (!prev || rec.score > prev.score) ex[k] = rec
    }
    const done = !!y.done && !x.done
    if (Object.keys(ex).length || done) out[id] = done ? { ex, done: true } : { ex }
  }
  return Object.keys(out).length ? { texts: out } : null
}
```

`src/lib/practiceContract.js`: импорт `import { mergeReadingState } from './readingState.js'`; комментарий про `'reading'` → «сливается по заданию “лучший результат” (readingState.js), а не заменяется»; в `mergeModuleState` первой строкой `if (module === 'reading') return mergeReadingState(existing, incoming)`.

- [ ] **Step 4:** `npx vitest run src/lib/readingState.test.js` → PASS.
- [ ] **Step 5:** commit `feat(reading): правила формы и слияния прогресса «Чтения»`.

---

### Task 2: Сервер — атомарное слияние и ответ состоянием

**Files:**
- Modify: `src/lib/db/practice.js` (`savePracticeState` в транзакции с замком)
- Create: `src/lib/db/practice.test.js`
- Modify: `src/app/api/practice/state/route.js` (POST: sanitize + `state` в ответе; GET: `?module=`)
- Create: `src/app/api/practice/state/route.test.js`

**Interfaces:**
- Consumes: `sanitizeReadingState`, `mergeModuleState('reading')` (Task 1).
- Produces: `POST /api/practice/state` → `{configured, ok, state}`; `GET /api/practice/state?module=reading` → `{configured, state: {reading}}`.

- [ ] **Step 1: тесты.**

`src/lib/db/practice.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { savePracticeState } from './practice.js'

// Фейковый sql: запоминает запросы и держит одну строку practice_state. Точность
// самого SQL — на Postgres; здесь контракт: замок первым, слияние, а не замена.
function makeFakeSql(row) {
  const log = []
  const tag = async (strings, ...vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase()
    log.push(q)
    if (q.startsWith('select pg_advisory_xact_lock')) return []
    if (q.startsWith('select state from practice_state')) return row.state ? [{ state: row.state }] : []
    if (q.startsWith('insert into practice_state')) {
      row.state = vals[3].__json
      return []
    }
    throw new Error('unexpected query: ' + q)
  }
  tag.json = (v) => ({ __json: v })
  tag.begin = async (fn) => {
    log.push('begin')
    return fn(tag)
  }
  return { sql: tag, log }
}

describe('savePracticeState', () => {
  it('reading: сливает «лучший результат» и возвращает итог', async () => {
    const row = { state: { texts: { t1: { ex: { 0: { score: 5, total: 5 } }, done: false } } } }
    const { sql, log } = makeFakeSql(row)
    const merged = await savePracticeState('user-1', 'reading', { texts: { t1: { ex: { 0: { score: 1, total: 5 }, 1: { score: 6, total: 6 } } } } }, sql)
    expect(merged).toEqual({ texts: { t1: { ex: { 0: { score: 5, total: 5 }, 1: { score: 6, total: 6 } }, done: false } } })
    expect(row.state).toEqual(merged)
    expect(log[0]).toBe('begin')
    expect(log[1]).toMatch(/^select pg_advisory_xact_lock/)
  })

  it('без БД — no-op', async () => {
    expect(await savePracticeState('user-1', 'reading', { texts: {} }, null)).toBeUndefined()
  })
})
```

Insert в фейке читает `vals[3]` — порядок параметров в запросе: `profileId, module, json(merged), json(merged)`; первое `json` — `vals[2]`, второе — `vals[3]`; берём любой (одинаковы).

`src/app/api/practice/state/route.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true }))
const store = vi.hoisted(() => ({ saved: [], state: {} }))
vi.mock('@/lib/db/practice.js', () => ({
  loadPracticeState: vi.fn(async () => store.state),
  savePracticeState: vi.fn(async (id, module, state) => {
    store.saved.push({ id, module, state })
    return { merged: true, module }
  }),
}))
vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: async () => ({ id: 'user-1' }) }))

const { GET, POST } = await import('./route.js')

const auth = { authorization: 'Bearer t' }
const post = (body) => POST(new Request('http://x/api/practice/state', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(body) }))

beforeEach(() => {
  store.saved = []
  store.state = { vocab: {}, reading: { texts: { t1: { ex: {}, done: true } } }, grammar: { done: [] } }
})

describe('POST /api/practice/state', () => {
  it('reading: чистит вход и отвечает слитым состоянием', async () => {
    const res = await post({ module: 'reading', state: { texts: { t1: { ex: { 0: { score: 1, total: 2 } } } }, junk: 1 } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: true, ok: true, state: { merged: true, module: 'reading' } })
    expect(store.saved[0].state).toEqual({ texts: { t1: { ex: { 0: { score: 1, total: 2 } }, done: false } } })
  })

  it('reading: кривая форма — 400, в БД ничего', async () => {
    const res = await post({ module: 'reading', state: { texts: { t1: { ex: { 0: { score: 9, total: 2 } } } } } })
    expect(res.status).toBe(400)
    expect(store.saved).toEqual([])
  })
})

describe('GET /api/practice/state', () => {
  it('?module=reading отдаёт только этот модуль', async () => {
    const res = await GET(new Request('http://x/api/practice/state?module=reading', { headers: auth }))
    expect(await res.json()).toEqual({ configured: true, state: { reading: { texts: { t1: { ex: {}, done: true } } } } })
  })

  it('неизвестный модуль — 400', async () => {
    const res = await GET(new Request('http://x/api/practice/state?module=nope', { headers: auth }))
    expect(res.status).toBe(400)
  })

  it('без параметра — весь стейт, как раньше', async () => {
    const body = await (await GET(new Request('http://x/api/practice/state', { headers: auth }))).json()
    expect(Object.keys(body.state)).toEqual(['vocab', 'reading', 'grammar'])
  })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/db/practice.test.js src/app/api/practice/state/route.test.js` → FAIL.

- [ ] **Step 3: реализация.**

`src/lib/db/practice.js`, `savePracticeState`:

```js
export async function savePracticeState(profileId, module, state, sql = getSql()) {
  if (!sql) return
  if (!isValidModule(module)) throw new Error(`unknown practice module: ${module}`)
  // read-merge-write одной транзакцией под замком на (ученик, модуль). Без замка
  // два параллельных POST (две вкладки, «Проверить» подряд) читают одно и то же
  // состояние, и последний затирает слитое первым — для reading это ровно та
  // потеря результата, которую слияние должно исключить. Замок транзакционный:
  // снимается сам на commit/rollback.
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${`${profileId}:${module}`}))`
    const rows = await tx`
      select state from practice_state
      where profile_id = ${profileId} and module = ${module}
    `
    const existing = rows[0]?.state ?? emptyState(module)
    const merged = mergeModuleState(module, existing, state)
    // jsonb — только через .json() (см. ловушку porsager выше по файлу).
    await tx`
      insert into practice_state (profile_id, module, state)
      values (${profileId}, ${module}, ${tx.json(merged)}::jsonb)
      on conflict (profile_id, module) do update
        set state = ${tx.json(merged)}::jsonb, updated_at = now()
    `
    return merged
  })
}
```

(Комментарий про двойное кодирование jsonb из старой версии сохранить над insert.)

`src/app/api/practice/state/route.js`: импорт `emptyState` из practiceContract и `sanitizeReadingState` из `@/lib/readingState.js`. GET — после `if (!isDbConfigured())`:

```js
  const only = new URL(request.url).searchParams.get('module')
  if (only !== null && !isValidModule(only)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }
```
и ответ `state: only ? { [only]: state[only] ?? emptyState(only) } : state`.

POST — после проверки формы:

```js
  // «Чтение» сливается на сервере (readingState.js), поэтому вход чистим строго:
  // мусор в jsonb пережил бы любой клиент.
  let incoming = body.state
  if (body.module === 'reading') {
    incoming = sanitizeReadingState(body.state)
    if (!incoming) return Response.json({ configured: true, error: 'Invalid state.' }, { status: 400 })
  }
```
сохранение `const merged = await savePracticeState(resolved.id, body.module, incoming)` и ответ `{ configured: true, ok: true, state: merged ?? null }`.

- [ ] **Step 4:** те же тесты → PASS.
- [ ] **Step 5:** commit `feat(practice): сервер сливает «Чтение» атомарно и отвечает состоянием`.

---

### Task 3: Клиент — память, очередь дельт, загрузка с сервера

**Files:**
- Modify (переписать): `src/practice/reading/readingProgress.js`
- Modify (переписать): `src/practice/reading/readingProgress.test.js`

**Interfaces:**
- Consumes: `mergeReadingState`, `readingDelta` (Task 1); `POST/GET /api/practice/state` (Task 2).
- Produces (для экранов): `readState()`, `textState(id)`, `markExercise(id, i, score, total)`, `markTextDone(id)`, `progressOf(text, state?)`, `levelProgress(texts, state?)`, `levelDoneCount(texts, state?)` — как раньше; новые `loadReadingFromServer(): Promise<boolean>`, `flushReading(): Promise<{ok, state, local?}>`, `resetReadingMemory()` (для тестов).

- [ ] **Step 1: тесты** — `readingProgress.test.js` целиком (код ниже, в Step 3 реализация). Сценарии: старые (пустой стейт, битый JSON, best-of, idempotent done, событие, progressOf/levelProgress/levelDoneCount) — гостем без сети; новые:
  1. localStorage.setItem бросает `QuotaExceededError` → `markExercise` × 2 → `textState` видит оба;
  2. вошедший: `markExercise` → POST `{module:'reading', state:{texts:{id:{ex:{0:…}}}}}`, ответ сервера с другим текстом попадает в `readState()`;
  3. ответ на раннюю дельту не откатывает позднюю (две отправки подряд — вторая ждёт первую и уходит слитой);
  4. сеть упала → `flushReading()` повторяет и возвращает `{ok:true, state}` с GET;
  5. сеть лежит всё время → `flushReading()` → `{ok:false}`;
  6. смена токена → память другого ученика не видна;
  7. `loadReadingFromServer` подтягивает серверное и досылает то, чего на сервере нет;
  8. гость: fetch не вызывается, `flushReading()` → `{ok:true, local:true}`.

- [ ] **Step 2:** `npx vitest run src/practice/reading/readingProgress.test.js` → FAIL.
- [ ] **Step 3:** реализация `readingProgress.js` (см. код в коммите задачи; ключевые части):
  - `owner()` — `'guest'` без токена, иначе `'user:' + (sub || userId || phone || 'unknown')` из `payloadOf`;
  - `readState()` — память при совпадении `owner`, иначе черновик из localStorage (очередь чужого `owner` сбрасывается);
  - `commit(delta)` — `mergeReadingState(mem.state, delta)` → черновик (ошибку квоты глотаем) → событие → для вошедшего `enqueue(delta)`;
  - `pump()` — одна отправка в полёте; ответ `adopt(who, data.state)` = `mergeReadingState(server, mem.state)`; ошибка — дельта обратно в очередь, без автоповтора;
  - `loadReadingFromServer()` — GET `?module=reading`, `readingDelta(server, mem.state)` досылается, `adopt`;
  - `flushReading()` — `await pump()`, при неудаче ещё раз, затем GET; гость — сразу из памяти.
- [ ] **Step 4:** тесты → PASS.
- [ ] **Step 5:** commit `feat(reading): прогресс в памяти и на сервере, localStorage — черновик`.

---

### Task 4: Экраны — загрузка при открытии, итог с сервера

**Files:**
- Modify: `src/screens/ReadingPage.jsx` (эффект `loadReadingFromServer` по `token`)
- Modify: `src/screens/reading/ReadingResult.jsx` (`flushReading`, «Сохраняем…», плашка)
- Modify: `src/i18n.jsx` (3 ключа × ru/en/kk)
- Create: `src/screens/reading/ReadingResult.test.jsx`

**Interfaces:**
- Consumes: `loadReadingFromServer`, `flushReading`, `markTextDone`, `readState`, `progressOf` (Task 3).

- [ ] **Step 1: тест** `ReadingResult.test.jsx`: вошедший (фейковый JWT в `jts_access_token`), мок fetch: POST → `{ok, state}`, GET → серверное состояние 2/2. Ожидаем сначала «Сохраняем результат…», потом «100%». Второй тест: fetch всегда reject → «Не удалось сохранить…» и кнопка «Повторить»; после того как fetch починился, клик «Повторить» → «100%». Моки: `./ReadingKeywords.jsx`, `../../practice/practiceHomework.js`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** реализация:
  - `ReadingPage`: `useEffect(() => { if (token) loadReadingFromServer() }, [token])`.
  - `ReadingResult`: стейт `save = {status:'saving'|'saved'|'failed', state}`; эффект на `text.id`: `markTextDone(text.id)`, затем `flushReading().then(...)`; отображаемое состояние — `save.state ?? readState()`; пока `saving` — вместо блока `.rd-stats` одна `.rd-stat` с `⏳ reading.result.saving`; при `failed` — `.rd-note.rd-note--err` с текстом и кнопкой `reading.result.retrySave`.
  - i18n: `reading.result.saving` / `saveFailed` / `retrySave` — ru «Сохраняем результат…» / «Не удалось сохранить результат на сервере.» / «Повторить»; en «Saving your result…» / «Could not save your result to the server.» / «Retry»; kk «Нәтиже сақталуда…» / «Нәтижені серверге сақтау мүмкін болмады.» / «Қайталау».
- [ ] **Step 4:** тесты → PASS; весь набор «Чтения» + `tests/reading.spec.js` (гость) зелёные; `npm run build`; `eslint` по изменённым файлам.
- [ ] **Step 5:** commit `feat(reading): итог «Чтения» из ответа сервера, «Сохраняем…» и повтор`.

---

### Task 5: Проверка и PR

- [ ] Локальный стенд (гость): текст с «Проверить» → 100%; забитый localStorage (`zz-`-ключи) → всё равно 100%.
- [ ] Ревью диффа субагентом.
- [ ] PR в `develop`; вошедший путь владелец проверяет на dev после выкатки.
