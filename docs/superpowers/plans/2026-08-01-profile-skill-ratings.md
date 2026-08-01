# Profile Skill Ratings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать в профиле jts-web-app оценку по 6 навыкам (Listening, Speaking, Reading, Writing, Grammar, Vocabulary) шкалой 2–10 полосок, считая «всего заданий» и «верно с первой попытки», с хранением в Postgres приложения.

**Architecture:** Разделы Практика и Обучение при грейдинге вызывают `recordSkill(skill, correct)`. Клиентский модуль накапливает дельты в localStorage и debounce-флашит их инкрементами на новый роут `/api/skills`, который атомарно увеличивает счётчики в новой таблице `skill_stat`. Профиль читает агрегаты и рисует карточку `SkillRatings`. Вся чистая логика (формула полосок, слияние дельт, валидация) вынесена в модули без DOM/fetch — их тестирует Playwright-раннер в node-контексте.

**Tech Stack:** Next.js (App Router), React (client components), Postgres через драйвер `postgres` (porsager, tagged-template `sql`), Playwright как тест-раннер, i18n через `src/i18n.jsx`.

## Global Constraints

- Ветка `feat/profile-skill-ratings` от `develop`; PR в `develop`, прямой пуш запрещён.
- НЕ трогать: IELTS-экраны/роуты, Java-бэкенд `/mobile/*`, Flutter-приложение.
- Хранилище — Postgres самого Next.js (`DATABASE_URL`, драйвер `postgres`), НЕ внешний бэкенд из `src/api.js`.
- Клиент к `/api/*` ходит относительным `fetch('/api/...')` с `Authorization: Bearer <loadToken()>`; helpers из `src/api.js` (они префиксуют внешний `BASE`) не использовать.
- Graceful degradation: `getSql()` может вернуть `null` (БД не поднята) → чтение отдаёт нули, запись — no-op. Без токена клиентский синк — no-op (как `pushModule`).
- Названия полей в JS везде `{ done, firstTry }`; SQL-колонки `tasks_done`, `first_try_correct`.
- 6 навыков (строковые ключи): `listening`, `speaking`, `reading`, `writing`, `grammar`, `vocab`.
- Формула полосок: `done===0 → 2`; иначе `bars = clamp(2 + round(8 * accuracy * confidence), 2, 10)`, где `accuracy = min(1, firstTry/done)`, `confidence = min(1, done/25)`.
- i18n: новые ключи `profile.skills.*` добавлять во ВСЕ три локали (`ru`, `en`, `kk`) в `src/i18n.jsx`.
- Тесты чистой логики: файл `tests/<name>.spec.js`, `import { test, expect } from '@playwright/test'`, импорт модуля напрямую. Запуск: `npx playwright test tests/<name>.spec.js --project=mobile`.
- В репозитории НЕТ тёмной темы (в `styles.css` ноль правил `prefers-color-scheme`/`data-theme`) — стили пишем под светлую тему, как остальной профиль. Анимацию заполнения гасить под `prefers-reduced-motion`.

## File Structure

Новые файлы:
- `src/practice/skillStatsCore.js` — чистая логика: `SKILLS`, `emptyStats`, `skillBars`, `addDelta`, `mergeDeltas`. Без DOM/fetch.
- `src/lib/skillContract.js` — валидация серверного тела: `isValidSkill`, `validateDeltas`. Без DOM/fetch.
- `src/lib/db/skillStats.js` — SQL-слой: `loadSkillStats`, `applySkillDeltas`.
- `src/app/api/skills/route.js` — GET (агрегаты профиля) + POST (инкремент дельтами).
- `src/practice/skillStats.js` — `'use client'`: `recordSkill`, `flushSkillStats`, `loadSkillStatsRemote`, `hydrateSkillStats`. Тонкие обёртки над core + fetch + localStorage.
- `src/components/SkillRatings.jsx` — карточка профиля со шкалами и локальными иконками навыков.
- `tests/skill-stats-core.spec.js`, `tests/skill-contract.spec.js`, `tests/skill-stats-db.spec.js`, `tests/profile-skills.spec.js` — тесты.

Изменяемые файлы:
- `src/lib/schema.sql` — добавить таблицу `skill_stat`.
- `src/i18n.jsx` — ключи `profile.skills.*` в 3 локали.
- `src/screens/ProfilePage.jsx` — стейт + загрузка + вставка `<SkillRatings>`.
- `src/styles.css` — блок `.pf-skills*`.
- Инструментирование: `src/practice/grammar/ActivityPlayer.jsx`, `src/screens/ListeningPage.jsx`, `src/practice/vocab/Session.jsx`, `src/learning/LessonPlayer.jsx`, `src/screens/ShadowingPage.jsx`, `src/screens/BookDetail.jsx`.

---

### Task 1: Чистая логика статистики (`skillStatsCore.js`)

**Files:**
- Create: `src/practice/skillStatsCore.js`
- Test: `tests/skill-stats-core.spec.js`

**Interfaces:**
- Produces:
  - `SKILLS: string[]` = `['listening','speaking','reading','writing','grammar','vocab']`
  - `emptyStats(): Record<skill, {done:number, firstTry:number}>` — все навыки в нулях
  - `skillBars({done, firstTry}): number` — 2..10
  - `addDelta(map, skill, correct): map` — иммутабельно прибавляет `{done:1, firstTry: correct?1:0}` к навыку
  - `mergeDeltas(a, b): map` — суммирует два map'а дельт по навыкам

- [ ] **Step 1: Написать падающий тест**

```js
// tests/skill-stats-core.spec.js
import { test, expect } from '@playwright/test'
import { SKILLS, emptyStats, skillBars, addDelta, mergeDeltas } from '../src/practice/skillStatsCore.js'

test.describe('skillBars — формула полосок', () => {
  test('нет данных → 2 полоски', () => {
    expect(skillBars({ done: 0, firstTry: 0 })).toBe(2)
  })
  test('малый объём при 100% не даёт максимума', () => {
    expect(skillBars({ done: 3, firstTry: 3 })).toBe(3)
  })
  test('25 заданий на 100% → 10 полосок', () => {
    expect(skillBars({ done: 25, firstTry: 25 })).toBe(10)
  })
  test('25 заданий на 60% → 7 полосок', () => {
    expect(skillBars({ done: 25, firstTry: 15 })).toBe(7)
  })
  test('никогда не ниже 2 и не выше 10', () => {
    expect(skillBars({ done: 100, firstTry: 0 })).toBe(2)
    expect(skillBars({ done: 1000, firstTry: 1000 })).toBe(10)
  })
  test('firstTry > done не ломает (accuracy зажата в 1)', () => {
    expect(skillBars({ done: 25, firstTry: 40 })).toBe(10)
  })
})

test.describe('emptyStats / addDelta / mergeDeltas', () => {
  test('emptyStats — все навыки в нулях', () => {
    const e = emptyStats()
    expect(Object.keys(e).sort()).toEqual([...SKILLS].sort())
    for (const s of SKILLS) expect(e[s]).toEqual({ done: 0, firstTry: 0 })
  })
  test('addDelta прибавляет и не мутирует исходный', () => {
    const a = emptyStats()
    const b = addDelta(a, 'grammar', true)
    expect(a.grammar).toEqual({ done: 0, firstTry: 0 })
    expect(b.grammar).toEqual({ done: 1, firstTry: 1 })
    const c = addDelta(b, 'grammar', false)
    expect(c.grammar).toEqual({ done: 2, firstTry: 1 })
  })
  test('addDelta с неизвестным навыком — возвращает исходный без изменений', () => {
    const a = emptyStats()
    expect(addDelta(a, 'nope', true)).toBe(a)
  })
  test('mergeDeltas суммирует по навыкам', () => {
    const a = { grammar: { done: 2, firstTry: 1 } }
    const b = { grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } }
    const m = mergeDeltas(a, b)
    expect(m.grammar).toEqual({ done: 5, firstTry: 3 })
    expect(m.vocab).toEqual({ done: 1, firstTry: 1 })
  })
})
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `npx playwright test tests/skill-stats-core.spec.js --project=mobile`
Expected: FAIL — `Cannot find module '../src/practice/skillStatsCore.js'`.

- [ ] **Step 3: Реализовать модуль**

```js
// src/practice/skillStatsCore.js
// Чистая логика рейтинга навыков: без DOM/fetch, поэтому тестируется в node.
// Поля везде { done, firstTry } (SQL-колонки tasks_done/first_try_correct).

export const SKILLS = ['listening', 'speaking', 'reading', 'writing', 'grammar', 'vocab']

const CONF_FULL = 25 // столько «первых попыток» = полная уверенность (максимум полосок)

export function emptyStats() {
  const out = {}
  for (const s of SKILLS) out[s] = { done: 0, firstTry: 0 }
  return out
}

// 2..10 полосок. Пусто → 2. Точность зажата объёмом (уверенностью): пока заданий
// мало, максимума не достичь; растёт по мере практики.
export function skillBars({ done = 0, firstTry = 0 } = {}) {
  if (!done || done <= 0) return 2
  const accuracy = Math.min(1, firstTry / done)
  const confidence = Math.min(1, done / CONF_FULL)
  const bars = 2 + Math.round(8 * accuracy * confidence)
  return Math.max(2, Math.min(10, bars))
}

// Иммутабельно прибавляет одну попытку к навыку. Неизвестный навык — no-op.
export function addDelta(map, skill, correct) {
  if (!SKILLS.includes(skill)) return map
  const cur = map[skill] || { done: 0, firstTry: 0 }
  return {
    ...map,
    [skill]: { done: cur.done + 1, firstTry: cur.firstTry + (correct ? 1 : 0) },
  }
}

// Суммирует два набора дельт по навыкам (для склейки буфера).
export function mergeDeltas(a, b) {
  const out = { ...a }
  for (const skill of Object.keys(b || {})) {
    const x = out[skill] || { done: 0, firstTry: 0 }
    const y = b[skill] || { done: 0, firstTry: 0 }
    out[skill] = { done: (x.done || 0) + (y.done || 0), firstTry: (x.firstTry || 0) + (y.firstTry || 0) }
  }
  return out
}
```

- [ ] **Step 4: Запустить, убедиться что проходит**

Run: `npx playwright test tests/skill-stats-core.spec.js --project=mobile`
Expected: PASS (все кейсы).

- [ ] **Step 5: Commit**

```bash
git add src/practice/skillStatsCore.js tests/skill-stats-core.spec.js
git commit -m "feat(skills): чистая логика рейтинга навыков (формула полосок, дельты)"
```

---

### Task 2: Валидация серверного тела (`skillContract.js`)

**Files:**
- Create: `src/lib/skillContract.js`
- Test: `tests/skill-contract.spec.js`

**Interfaces:**
- Consumes: `SKILLS` from `src/practice/skillStatsCore.js`
- Produces:
  - `isValidSkill(s): boolean`
  - `validateDeltas(body): {skill:{done,firstTry}} | null` — принимает `{ deltas: {...} }`, возвращает нормализованные дельты или `null` при невалидном вводе (неизвестный навык, нецелые/отрицательные, `firstTry > done`).

- [ ] **Step 1: Написать падающий тест**

```js
// tests/skill-contract.spec.js
import { test, expect } from '@playwright/test'
import { isValidSkill, validateDeltas } from '../src/lib/skillContract.js'

test.describe('skillContract', () => {
  test('isValidSkill', () => {
    expect(isValidSkill('grammar')).toBe(true)
    expect(isValidSkill('nope')).toBe(false)
    expect(isValidSkill(null)).toBe(false)
  })
  test('валидные дельты нормализуются', () => {
    const out = validateDeltas({ deltas: { grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } } })
    expect(out).toEqual({ grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } })
  })
  test('пустое/битое тело → null', () => {
    expect(validateDeltas(null)).toBeNull()
    expect(validateDeltas({})).toBeNull()
    expect(validateDeltas({ deltas: {} })).toBeNull()
  })
  test('неизвестный навык → null', () => {
    expect(validateDeltas({ deltas: { nope: { done: 1, firstTry: 1 } } })).toBeNull()
  })
  test('отрицательные/нецелые → null', () => {
    expect(validateDeltas({ deltas: { grammar: { done: -1, firstTry: 0 } } })).toBeNull()
    expect(validateDeltas({ deltas: { grammar: { done: 1.5, firstTry: 0 } } })).toBeNull()
  })
  test('firstTry больше done → null', () => {
    expect(validateDeltas({ deltas: { grammar: { done: 1, firstTry: 2 } } })).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `npx playwright test tests/skill-contract.spec.js --project=mobile`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать модуль**

```js
// src/lib/skillContract.js
// Валидация тела POST /api/skills. Без побочек — тестируется в node.

import { SKILLS } from '../practice/skillStatsCore.js'

export function isValidSkill(s) {
  return typeof s === 'string' && SKILLS.includes(s)
}

function isCount(n) {
  return Number.isInteger(n) && n >= 0
}

// body = { deltas: { <skill>: { done, firstTry } } }
// Возвращает нормализованные дельты (только валидные навыки) или null.
export function validateDeltas(body) {
  if (!body || typeof body !== 'object') return null
  const deltas = body.deltas
  if (!deltas || typeof deltas !== 'object') return null
  const keys = Object.keys(deltas)
  if (keys.length === 0) return null
  const out = {}
  for (const skill of keys) {
    if (!isValidSkill(skill)) return null
    const d = deltas[skill]
    if (!d || typeof d !== 'object') return null
    const done = d.done
    const firstTry = d.firstTry
    if (!isCount(done) || !isCount(firstTry)) return null
    if (firstTry > done) return null
    out[skill] = { done, firstTry }
  }
  return out
}
```

- [ ] **Step 4: Запустить, убедиться что проходит**

Run: `npx playwright test tests/skill-contract.spec.js --project=mobile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/skillContract.js tests/skill-contract.spec.js
git commit -m "feat(skills): валидация дельт статистики навыков"
```

---

### Task 3: Схема БД + SQL-слой (`skill_stat`, `db/skillStats.js`)

**Files:**
- Modify: `src/lib/schema.sql` (добавить таблицу после блока `shadowing_assess`, ~строка 233)
- Create: `src/lib/db/skillStats.js`
- Test: `tests/skill-stats-db.spec.js`

**Interfaces:**
- Consumes: `getSql` from `src/lib/db/sql.js`, `SKILLS`/`emptyStats` from `src/practice/skillStatsCore.js`
- Produces:
  - `loadSkillStats(profileId, sql=getSql()): Promise<{skill:{done,firstTry}}>` — все 6 навыков (отсутствующие → нули)
  - `applySkillDeltas(profileId, deltas, sql=getSql()): Promise<void>` — атомарный инкремент по каждому навыку

- [ ] **Step 1: Добавить таблицу в `schema.sql`**

Вставить после таблицы `shadowing_assess` (после строки 233), в «новом» profile-keyed стиле (inline PK, без FK):

```sql
-- ===========================================================================
-- Рейтинг навыков в профиле. Счётчики по аккаунту: сколько заданий сделано и
-- сколько верно с первой попытки, по каждому из 6 навыков. Инкрементируется
-- дельтами из Практики/Обучения (см. lib/db/skillStats.js, /api/skills).
-- profile_id = 'user-<id>' из resolveProfileId. Схема применяется вручную (как
-- practice_state) — в приложении бутстрапа schema.sql нет.
-- ===========================================================================
create table if not exists skill_stat (
  profile_id        text        not null,
  skill             text        not null,   -- listening|speaking|reading|writing|grammar|vocab
  tasks_done        integer     not null default 0,
  first_try_correct integer     not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (profile_id, skill)
);
```

- [ ] **Step 2: Написать падающий тест (инъекция фейкового `sql`)**

```js
// tests/skill-stats-db.spec.js
import { test, expect } from '@playwright/test'
import { loadSkillStats, applySkillDeltas } from '../src/lib/db/skillStats.js'

// Фейковый tagged-template `sql`: вызывается как sql`...${v}...`.
// Для SELECT возвращает заранее заданные строки; для остального — [] и лог вызова.
function fakeSql(selectRows = []) {
  const calls = []
  const fn = (strings, ...values) => {
    const text = strings.join('?')
    calls.push({ text, values })
    if (/select/i.test(text)) return Promise.resolve(selectRows)
    return Promise.resolve([])
  }
  fn.calls = calls
  return fn
}

test.describe('db/skillStats', () => {
  test('loadSkillStats — пустая БД отдаёт нули по всем навыкам', async () => {
    const stats = await loadSkillStats('user-1', fakeSql([]))
    expect(stats.grammar).toEqual({ done: 0, firstTry: 0 })
    expect(stats.speaking).toEqual({ done: 0, firstTry: 0 })
    expect(Object.keys(stats).length).toBe(6)
  })

  test('loadSkillStats — строки БД маппятся в {done,firstTry}', async () => {
    const rows = [{ skill: 'grammar', tasks_done: 10, first_try_correct: 7 }]
    const stats = await loadSkillStats('user-1', fakeSql(rows))
    expect(stats.grammar).toEqual({ done: 10, firstTry: 7 })
    expect(stats.vocab).toEqual({ done: 0, firstTry: 0 })
  })

  test('loadSkillStats — sql=null (БД не поднята) → нули без запроса', async () => {
    const stats = await loadSkillStats('user-1', null)
    expect(stats.reading).toEqual({ done: 0, firstTry: 0 })
  })

  test('applySkillDeltas — по одному upsert-инкременту на навык', async () => {
    const sql = fakeSql([])
    await applySkillDeltas('user-1', { grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } }, sql)
    const upserts = sql.calls.filter((c) => /insert into skill_stat/i.test(c.text))
    expect(upserts.length).toBe(2)
    expect(upserts[0].values).toContain('user-1')
  })

  test('applySkillDeltas — sql=null → no-op без ошибок', async () => {
    await applySkillDeltas('user-1', { grammar: { done: 1, firstTry: 1 } }, null)
  })
})
```

- [ ] **Step 3: Запустить, убедиться что падает**

Run: `npx playwright test tests/skill-stats-db.spec.js --project=mobile`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: Реализовать SQL-слой**

```js
// src/lib/db/skillStats.js
// SQL-слой рейтинга навыков. profileId из resolveProfileId ('user-<id>').
// Мягкая деградация: getSql() === null → чтение отдаёт нули, запись — no-op.

import { getSql } from './sql.js'
import { SKILLS, emptyStats } from '../../practice/skillStatsCore.js'

export async function loadSkillStats(profileId, sql = getSql()) {
  const out = emptyStats()
  if (!sql) return out
  const rows = await sql`
    select skill, tasks_done, first_try_correct
    from skill_stat where profile_id = ${profileId}
  `
  for (const r of rows) {
    if (SKILLS.includes(r.skill)) {
      out[r.skill] = { done: Number(r.tasks_done) || 0, firstTry: Number(r.first_try_correct) || 0 }
    }
  }
  return out
}

// Атомарный инкремент: складываем дельты с текущими значениями прямо в БД,
// поэтому синк с разных устройств не теряется (в отличие от записи абсолютов).
export async function applySkillDeltas(profileId, deltas, sql = getSql()) {
  if (!sql) return
  for (const skill of Object.keys(deltas || {})) {
    if (!SKILLS.includes(skill)) continue
    const { done = 0, firstTry = 0 } = deltas[skill] || {}
    if (!done && !firstTry) continue
    await sql`
      insert into skill_stat (profile_id, skill, tasks_done, first_try_correct)
      values (${profileId}, ${skill}, ${done}, ${firstTry})
      on conflict (profile_id, skill) do update
        set tasks_done = skill_stat.tasks_done + ${done},
            first_try_correct = skill_stat.first_try_correct + ${firstTry},
            updated_at = now()
    `
  }
}
```

- [ ] **Step 5: Запустить, убедиться что проходит**

Run: `npx playwright test tests/skill-stats-db.spec.js --project=mobile`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.sql src/lib/db/skillStats.js tests/skill-stats-db.spec.js
git commit -m "feat(skills): таблица skill_stat + SQL-слой инкрементов"
```

> **Deploy-note (не автостеп):** бутстрапа схемы в приложении нет — DDL из шага 1 нужно применить к БД вручную (dev `dev_app` :5434 и prod :5455 на jtsmain), с подтверждением пользователя перед prod. Команда (dev): `psql "<DATABASE_URL dev>" -c "<DDL блока skill_stat>"`.

---

### Task 4: Роут `/api/skills` (GET + POST)

**Files:**
- Create: `src/app/api/skills/route.js`

**Interfaces:**
- Consumes: `isDbConfigured` (`@/lib/db/sql.js`), `loadSkillStats`/`applySkillDeltas` (`@/lib/db/skillStats.js`), `resolveProfileId` (`@/lib/auth-server.js`), `unauthorizedIfNoBearer` (`@/lib/practiceContract.js`), `validateDeltas` (`@/lib/skillContract.js`)
- Produces: HTTP-роут. GET → `{ configured:true, stats:{skill:{done,firstTry}} }`. POST `{ deltas }` → `{ configured:true, stats }` (новые агрегаты).

- [ ] **Step 1: Реализовать роут (по образцу `practice/state/route.js`)**

```js
// src/app/api/skills/route.js
// Рейтинг навыков по аккаунту. GET — агрегаты 6 навыков, POST — инкремент
// дельтами. Только для залогиненных: аутентификация первична (401 без Bearer).

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadSkillStats, applySkillDeltas } from '@/lib/db/skillStats.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { validateDeltas } from '@/lib/skillContract.js'

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
    const stats = await loadSkillStats(resolved.id)
    return Response.json({ configured: true, stats })
  } catch (err) {
    console.error('[skills.GET] failed', err)
    return Response.json({ configured: true, error: 'Skill stats lookup failed.' }, { status: 500 })
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

  const deltas = validateDeltas(body)
  if (!deltas) {
    return Response.json({ configured: true, error: 'Invalid deltas.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    await applySkillDeltas(resolved.id, deltas)
    const stats = await loadSkillStats(resolved.id)
    return Response.json({ configured: true, stats })
  } catch (err) {
    console.error('[skills.POST] failed', err)
    return Response.json({ configured: true, error: 'Skill stats save failed.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Проверить, что `unauthorizedIfNoBearer` экспортируется**

Run: `grep -n "export function unauthorizedIfNoBearer" src/lib/practiceContract.js`
Expected: одна строка с определением (используется и в `practice/state/route.js`). Если сигнатура иная — использовать её как в `practice/state/route.js`.

- [ ] **Step 3: Проверить сборку роута**

Run: `npx next build 2>&1 | tail -20`
Expected: сборка проходит без ошибок про `src/app/api/skills/route.js`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/skills/route.js
git commit -m "feat(skills): роут /api/skills (GET агрегаты, POST инкремент)"
```

---

### Task 5: Клиентский синк (`skillStats.js`)

**Files:**
- Create: `src/practice/skillStats.js`
- Test: `tests/skill-stats-core.spec.js` (дополнить кейсом на сериализацию буфера — чистую часть; сам fetch не тестируем)

**Interfaces:**
- Consumes: `loadToken` (`../lib/session.js`), `addDelta`/`mergeDeltas`/`emptyStats`/`skillBars`/`SKILLS` (`./skillStatsCore.js`)
- Produces (используются инструментированием и профилем):
  - `recordSkill(skill, correct): void` — прибавляет попытку в localStorage-мираж + буфер дельт, планирует debounce-флаш
  - `flushSkillStats(): void` — POST накопленных дельт (если есть токен и буфер); при 200 очищает буфер и принимает вернувшиеся агрегаты
  - `loadSkillStatsRemote(token): Promise<{skill:{done,firstTry}} | null>` — GET агрегатов (для профиля)
  - `readLocalSkillStats(): {skill:{done,firstTry}}` — локальный мираж (мгновенный показ/гость)

- [ ] **Step 1: Реализовать модуль**

```js
// src/practice/skillStats.js
'use client'

// Клиентский сбор рейтинга навыков. Работает и для гостей (локальный мираж в
// localStorage). Дельты копятся в буфере и debounce-флашатся на /api/skills
// инкрементами; без токена — только локально (на сервер не пишем, как pushModule).

import { loadToken } from '../lib/session.js'
import { addDelta, mergeDeltas, emptyStats, SKILLS } from './skillStatsCore.js'

const MIRROR_KEY = 'jts_skill_stats'
const PENDING_KEY = 'jts_skill_stats_pending'
const FLUSH_DELAY = 800

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* приватный режим / квота — работаем без персиста */
  }
}

export function readLocalSkillStats() {
  const m = readJson(MIRROR_KEY, null)
  return m && typeof m === 'object' ? { ...emptyStats(), ...m } : emptyStats()
}

let timer = null

export function recordSkill(skill, correct) {
  if (!SKILLS.includes(skill)) return
  writeJson(MIRROR_KEY, addDelta(readLocalSkillStats(), skill, correct))
  const pending = addDelta(readJson(PENDING_KEY, emptyStats()), skill, correct)
  writeJson(PENDING_KEY, pending)
  clearTimeout(timer)
  timer = setTimeout(flushSkillStats, FLUSH_DELAY)
}

function hasPending(p) {
  return SKILLS.some((s) => p[s] && (p[s].done || p[s].firstTry))
}

export function flushSkillStats() {
  const token = loadToken()
  if (!token) return
  const pending = readJson(PENDING_KEY, emptyStats())
  if (!hasPending(pending)) return
  // Оптимистично очищаем буфер перед отправкой; при сбое возвращаем.
  writeJson(PENDING_KEY, emptyStats())
  fetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ deltas: pending }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('bad status ' + res.status)
      return res.json()
    })
    .then((data) => {
      if (data?.stats) writeJson(MIRROR_KEY, data.stats) // сервер — источник истины
    })
    .catch((e) => {
      console.warn('[skill.sync] flush failed', e)
      // вернуть дельты в буфер, чтобы не потерять при следующем флаше
      writeJson(PENDING_KEY, mergeDeltas(readJson(PENDING_KEY, emptyStats()), pending))
    })
}

export async function loadSkillStatsRemote(token) {
  if (!token) return null
  try {
    const res = await fetch('/api/skills', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.stats) {
      writeJson(MIRROR_KEY, data.stats)
      return data.stats
    }
  } catch (e) {
    console.warn('[skill.sync] load failed', e)
  }
  return null
}
```

- [ ] **Step 2: Убедиться, что чистая логика (уже покрытая в Task 1) не сломана**

Run: `npx playwright test tests/skill-stats-core.spec.js --project=mobile`
Expected: PASS (модуль `skillStats.js` использует только протестированные функции core; сам fetch/localStorage покрываем ручной проверкой в Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/practice/skillStats.js
git commit -m "feat(skills): клиентский синк recordSkill/flush/load (localStorage + /api/skills)"
```

---

### Task 6: Компонент `SkillRatings` + стили + i18n

**Files:**
- Create: `src/components/SkillRatings.jsx`
- Modify: `src/styles.css` (добавить блок `.pf-skills*` после правил `.pf-stat` — ~строка 4267)
- Modify: `src/i18n.jsx` (ключи `profile.skills.*` в блоки `ru`/`en`/`kk`)

**Interfaces:**
- Consumes: `skillBars`, `SKILLS` (`../practice/skillStatsCore.js`), `useI18n` (`../i18n.jsx`)
- Produces: `export default function SkillRatings({ stats, loading })` — карточка. `stats` = `{skill:{done,firstTry}}` или `null`.

- [ ] **Step 1: Добавить i18n-ключи**

В `src/i18n.jsx` в блок `ru` (рядом с `profile.*`, ~строка 127) добавить:

```js
    'profile.skills.title': 'Навыки',
    'profile.skills.listening': 'Аудирование',
    'profile.skills.speaking': 'Говорение',
    'profile.skills.reading': 'Чтение',
    'profile.skills.writing': 'Письмо',
    'profile.skills.grammar': 'Грамматика',
    'profile.skills.vocab': 'Словарь',
    'profile.skills.meta': '{done} заданий · {pct}% с первой',
    'profile.skills.empty': 'нет данных',
```

В блок `en` (~строка 415) добавить:

```js
    'profile.skills.title': 'Skills',
    'profile.skills.listening': 'Listening',
    'profile.skills.speaking': 'Speaking',
    'profile.skills.reading': 'Reading',
    'profile.skills.writing': 'Writing',
    'profile.skills.grammar': 'Grammar',
    'profile.skills.vocab': 'Vocabulary',
    'profile.skills.meta': '{done} tasks · {pct}% first-try',
    'profile.skills.empty': 'no data yet',
```

В блок `kk` (~строка 705) добавить:

```js
    'profile.skills.title': 'Дағдылар',
    'profile.skills.listening': 'Тыңдалым',
    'profile.skills.speaking': 'Сөйлеу',
    'profile.skills.reading': 'Оқылым',
    'profile.skills.writing': 'Жазылым',
    'profile.skills.grammar': 'Грамматика',
    'profile.skills.vocab': 'Сөздік',
    'profile.skills.meta': '{done} тапсырма · {pct}% бірінші реттен',
    'profile.skills.empty': 'дерек жоқ',
```

- [ ] **Step 2: Реализовать компонент**

```jsx
// src/components/SkillRatings.jsx
// Карточка профиля: рейтинг 6 навыков шкалой из 10 сегментов (2..10 заполнено).
// stats = { skill: { done, firstTry } } | null. Иконки — локальные (как Pf*Icon
// в ProfilePage), чтобы не раздувать общий icons.jsx.

import { useI18n } from '../i18n.jsx'
import { SKILLS, skillBars } from '../practice/skillStatsCore.js'

const TOTAL_SEGMENTS = 10

function Bars({ filled, muted }) {
  return (
    <div className="pf-skill__bars" aria-hidden="true">
      {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
        <i key={i} className={i < filled ? (muted ? 'pf-skill__seg is-muted' : 'pf-skill__seg is-on') : 'pf-skill__seg'} />
      ))}
    </div>
  )
}

function SkillRow({ skill, stat, t }) {
  const done = stat?.done || 0
  const firstTry = stat?.firstTry || 0
  const bars = skillBars({ done, firstTry })
  const empty = done === 0
  const pct = empty ? 0 : Math.round(Math.min(1, firstTry / done) * 100)
  return (
    <div className="pf-skill">
      <span className="pf-skill__ic"><SkillIcon skill={skill} /></span>
      <div className="pf-skill__body">
        <div className="pf-skill__top">
          <span className="pf-skill__name">{t('profile.skills.' + skill)}</span>
          <span className="pf-skill__meta">
            {empty ? t('profile.skills.empty') : t('profile.skills.meta', { done, pct })}
          </span>
        </div>
        <Bars filled={bars} muted={empty} />
      </div>
    </div>
  )
}

export default function SkillRatings({ stats, loading }) {
  const { t } = useI18n()
  return (
    <>
      <div className="pf-label">{t('profile.skills.title')}</div>
      <div className="pf-card pf-skills">
        {SKILLS.map((skill) => (
          <SkillRow
            key={skill}
            skill={skill}
            stat={loading ? null : stats?.[skill]}
            t={t}
          />
        ))}
      </div>
    </>
  )
}

// Локальные иконки навыков (24×24, currentColor). Простые линейные глифы.
function SkillIcon({ skill }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (skill) {
    case 'listening':
      return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0" /><rect x="2.5" y="13" width="4" height="7" rx="2" /><rect x="17.5" y="13" width="4" height="7" rx="2" /></svg>
    case 'speaking':
      return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
    case 'reading':
      return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
    case 'writing':
      return <svg {...p}><path d="M4 20h16" /><path d="M14.5 4.5 19 9 8 20l-4.5.5.5-4.5 10.5-11.5Z" /></svg>
    case 'grammar':
      return <svg {...p}><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>
    case 'vocab':
      return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
    default:
      return null
  }
}
```

- [ ] **Step 3: Добавить стили в `styles.css`** (после правил `.pf-stat`, ~строка 4267)

```css
/* Рейтинг навыков */
.pf-skills {
  padding: 6px 4px;
}
.pf-skill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f3;
}
.pf-skill:last-child {
  border-bottom: none;
}
.pf-skill__ic {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f0ebff;
  color: #9047ff;
}
.pf-skill__body {
  flex: 1;
  min-width: 0;
}
.pf-skill__top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.pf-skill__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.pf-skill__meta {
  font-size: 11px;
  color: #a6a5b2;
  white-space: nowrap;
}
.pf-skill__bars {
  display: flex;
  gap: 3px;
}
.pf-skill__seg {
  flex: 1;
  height: 8px;
  border-radius: 3px;
  background: #f0ebff;
  transition: background-color 0.4s ease;
}
.pf-skill__seg.is-on {
  background: #9047ff;
}
.pf-skill__seg.is-muted {
  background: #d9d7e4;
}
@media (prefers-reduced-motion: reduce) {
  .pf-skill__seg {
    transition: none;
  }
}
```

- [ ] **Step 4: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: сборка без ошибок про `SkillRatings.jsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillRatings.jsx src/styles.css src/i18n.jsx
git commit -m "feat(skills): компонент SkillRatings, стили .pf-skills, i18n-ключи"
```

---

### Task 7: Встроить `SkillRatings` в профиль

**Files:**
- Modify: `src/screens/ProfilePage.jsx` (импорт; стейт ~строка 81; загрузка ~строка 139; вставка JSX между строками 329 и 331)
- Test: `tests/profile-skills.spec.js`

**Interfaces:**
- Consumes: `SkillRatings` (`../components/SkillRatings.jsx`), `loadSkillStatsRemote`/`readLocalSkillStats` (`../practice/skillStats.js`)

- [ ] **Step 1: Написать падающий e2e-тест (пустое состояние)**

```js
// tests/profile-skills.spec.js
import { test, expect } from '@playwright/test'

test.describe('профиль / рейтинг навыков', () => {
  test('карточка навыков видна, 6 строк, у каждой 10 сегментов', async ({ page }) => {
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf')).toBeVisible({ timeout: 20_000 })
    const card = page.locator('.pf-skills')
    await expect(card).toBeVisible()
    await expect(card.locator('.pf-skill')).toHaveCount(6)
    // без данных (гость) — каждая шкала имеет 10 сегментов, 2 приглушённых заполнены
    const firstRow = card.locator('.pf-skill').first()
    await expect(firstRow.locator('.pf-skill__seg')).toHaveCount(10)
    await expect(firstRow.locator('.pf-skill__seg.is-muted')).toHaveCount(2)
  })
})
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `npx playwright test tests/profile-skills.spec.js --project=mobile`
Expected: FAIL — `.pf-skills` не найден.

- [ ] **Step 3: Добавить импорты**

В шапку `src/screens/ProfilePage.jsx` (рядом с другими импортами компонентов) добавить:

```jsx
import SkillRatings from '../components/SkillRatings.jsx'
import { loadSkillStatsRemote, readLocalSkillStats } from '../practice/skillStats.js'
```

- [ ] **Step 4: Добавить стейт** (после строки 81, `const [toast, setToast] = useState('')`)

```jsx
  const [skillStats, setSkillStats] = useState(null)
```

- [ ] **Step 5: Добавить загрузку** (сразу после закрывающего `}, [token, userLevel])` эффекта на строке 139)

```jsx
  // Рейтинг навыков: сперва локальный мираж (мгновенно, работает и для гостя),
  // затем серверные агрегаты для залогиненного (источник истины).
  useEffect(() => {
    setSkillStats(readLocalSkillStats())
    if (!token) return
    let alive = true
    loadSkillStatsRemote(token).then((s) => {
      if (alive && s) setSkillStats(s)
    })
    return () => {
      alive = false
    }
  }, [token])
```

- [ ] **Step 6: Вставить компонент** — между `</section>` (строка 329) и `<div className="pf-label">{t('profile.sectionPersonalization')}</div>` (строка 331):

```jsx
        </section>

        <SkillRatings stats={skillStats} loading={skillStats === null} />

        <div className="pf-label">{t('profile.sectionPersonalization')}</div>
```

- [ ] **Step 7: Запустить, убедиться что проходит**

Run: `npx playwright test tests/profile-skills.spec.js --project=mobile`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/screens/ProfilePage.jsx tests/profile-skills.spec.js
git commit -m "feat(skills): показать SkillRatings в профиле (локальный мираж + серверные агрегаты)"
```

---

### Task 8: Инструментировать Грамматику (Практика)

**Files:**
- Modify: `src/practice/grammar/ActivityPlayer.jsx` (функция `finish`, ~строки 120-126)

**Interfaces:**
- Consumes: `recordSkill` (`../skillStats.js`)

- [ ] **Step 1: Импорт**

В шапку `src/practice/grammar/ActivityPlayer.jsx` добавить:

```jsx
import { recordSkill } from '../skillStats.js'
```

- [ ] **Step 2: Записать попытку в `finish`**

Текущий код (строки 120-126):

```jsx
  const finish = (ok, why) => {
    if (firedRef.current) return
    firedRef.current = true
    setAnswered(true)
    setFeedback({ ok, why: why || '' })
    onResult(ok)
  }
```

Заменить на (не считаем инфо-типы flashcard/speaking — они вызывают `finish(true)` без реальной проверки):

```jsx
  const finish = (ok, why) => {
    if (firedRef.current) return
    firedRef.current = true
    setAnswered(true)
    setFeedback({ ok, why: why || '' })
    if (a?.type !== 'flashcard' && a?.type !== 'speaking') recordSkill('grammar', ok)
    onResult(ok)
  }
```

> Примечание: `a` — активность в области видимости `finish` (см. вызовы `finish(picked === a.answer, …)`). `firedRef` гарантирует один грейд на активность = первая попытка.

- [ ] **Step 3: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: без ошибок про `ActivityPlayer.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/practice/grammar/ActivityPlayer.jsx
git commit -m "feat(skills): грамматика Практики пишет recordSkill('grammar')"
```

---

### Task 9: Инструментировать Аудирование (Практика)

**Files:**
- Modify: `src/screens/ListeningPage.jsx` (функция `submit`, ~строки 316-333)

**Interfaces:**
- Consumes: `recordSkill` (`../practice/skillStats.js`)

- [ ] **Step 1: Импорт**

В шапку `src/screens/ListeningPage.jsx` добавить:

```jsx
import { recordSkill } from '../practice/skillStats.js'
```

- [ ] **Step 2: Записать первую попытку**

Текущий код (строки 316-323):

```jsx
  const submit = useCallback(() => {
    if (!current || answered) return
    const { ok } = checkAnswer(current, response)
    let requeued = false
    if (ok) {
      setCoins((c) => c + COINS_PER_TASK)
      setCorrect((c) => c + 1)
      markTaskDone(current.id)
    } else {
```

Вставить запись сразу после вычисления `ok`, до ветвления — считаем только первую встречу задания (`!current._retry`):

```jsx
  const submit = useCallback(() => {
    if (!current || answered) return
    const { ok } = checkAnswer(current, response)
    let requeued = false
    if (!current._retry) recordSkill('listening', ok)
    if (ok) {
      setCoins((c) => c + COINS_PER_TASK)
      setCorrect((c) => c + 1)
      markTaskDone(current.id)
    } else {
```

- [ ] **Step 3: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: без ошибок про `ListeningPage.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ListeningPage.jsx
git commit -m "feat(skills): аудирование Практики пишет recordSkill('listening') на первой попытке"
```

---

### Task 10: Инструментировать Словарь (Практика)

**Files:**
- Modify: `src/practice/vocab/Session.jsx` (функция `grade`, ~строки 75-89)

**Interfaces:**
- Consumes: `recordSkill` (`../skillStats.js`)

- [ ] **Step 1: Импорт**

В шапку `src/practice/vocab/Session.jsx` добавить:

```jsx
import { recordSkill } from '../skillStats.js'
```

- [ ] **Step 2: Записать первый грейд слова в сессии**

Текущий код (строки 75-89):

```jsx
  const grade = useCallback(
    (w, correct, knew) => {
      let becameNew = false
      setQuiet((cur) => {
        const { st, wasNew } = gradeWord(cur, w, correct, knew)
        becameNew = wasNew
        return { srs: { ...cur.srs, [w.id]: st }, seenCount: cur.seenCount + (wasNew ? 1 : 0) }
      })
      if (becameNew) statsRef.current.newLearned++
      L.buf.push({ id: w.id, ok: !!correct })
    },
    [setQuiet, L],
  )
```

Заменить тело так, чтобы засчитать навык только на первом предъявлении слова в сессии (движок переспрашивает неверные — `it.reps` растёт только в `processBuf`, поэтому `reps === 0` = первая задача по слову):

```jsx
  const grade = useCallback(
    (w, correct, knew) => {
      let becameNew = false
      setQuiet((cur) => {
        const { st, wasNew } = gradeWord(cur, w, correct, knew)
        becameNew = wasNew
        return { srs: { ...cur.srs, [w.id]: st }, seenCount: cur.seenCount + (wasNew ? 1 : 0) }
      })
      if (becameNew) statsRef.current.newLearned++
      const it = L.items.find((i) => String(i.w.id) === String(w.id))
      if (!it || it.reps === 0) recordSkill('vocab', !!correct)
      L.buf.push({ id: w.id, ok: !!correct })
    },
    [setQuiet, L],
  )
```

- [ ] **Step 3: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: без ошибок про `Session.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/practice/vocab/Session.jsx
git commit -m "feat(skills): словарь Практики пишет recordSkill('vocab') на первом предъявлении слова"
```

---

### Task 11: Инструментировать раздел Обучение (LessonPlayer)

**Files:**
- Modify: `src/learning/LessonPlayer.jsx` (функция `LessonTask.finish`, ~строки 120-134; добавить хелпер классификации навыка)

**Interfaces:**
- Consumes: `recordSkill` (`../practice/skillStats.js`)

- [ ] **Step 1: Импорт + хелпер классификации**

В шапку `src/learning/LessonPlayer.jsx` добавить импорт:

```jsx
import { recordSkill } from '../practice/skillStats.js'
```

Рядом с `splitSec` (после строки 40) добавить хелпер: навык из типа задачи и метки секции. `gap` (ввод текста) — это Writing (продукция) плюс предметный навык по `sec`.

```jsx
// Навыки, засчитываемые за одно graded-задание урока. type=gap (ввод) считаем и
// за предметный навык по sec, и за Writing. type=listen — Listening.
function skillsForTask(task) {
  const label = splitSec(task?.sec).label.toLowerCase()
  const out = new Set()
  if (task?.type === 'listen' || /listen|numbers/.test(label)) out.add('listening')
  if (/grammar/.test(label)) out.add('grammar')
  if (/vocab/.test(label)) out.add('vocab')
  if (task?.type === 'gap') out.add('writing')
  return [...out]
}
```

- [ ] **Step 2: Записать в `finish`**

Текущий код (строки 128-134):

```jsx
  const finish = (ok, shownAnswer) => {
    if (firedRef.current) return
    firedRef.current = true
    setAnswered(true)
    setFeedback({ ok, answer: shownAnswer || '' })
    onGraded(ok)
  }
```

Заменить на (считаем только реально оцениваемые задачи — `graded`):

```jsx
  const finish = (ok, shownAnswer) => {
    if (firedRef.current) return
    firedRef.current = true
    setAnswered(true)
    setFeedback({ ok, answer: shownAnswer || '' })
    if (graded) for (const s of skillsForTask(task)) recordSkill(s, ok)
    onGraded(ok)
  }
```

> `task`, `graded` и `splitSec(task.sec)` уже в области видимости `LessonTask`. `firedRef` + отсутствие пере-очереди → каждый `finish` = первая и единственная попытка.

- [ ] **Step 3: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: без ошибок про `LessonPlayer.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/learning/LessonPlayer.jsx
git commit -m "feat(skills): уроки Обучения пишут recordSkill по типу/секции (grammar/vocab/listening/writing)"
```

---

### Task 12: Инструментировать Speaking (Shadowing, первая оценка)

**Files:**
- Modify: `src/screens/ShadowingPage.jsx` (функция `assessAndStore`, ~строки 417-424)

**Interfaces:**
- Consumes: `recordSkill` (`../practice/skillStats.js`), `MASTERY_THRESHOLD` (`../practice/shadowing/mastery.js`)

- [ ] **Step 1: Импорты**

В шапку `src/screens/ShadowingPage.jsx` добавить (если `MASTERY_THRESHOLD` ещё не импортирован — проверить существующие импорты из `mastery.js`):

```jsx
import { recordSkill } from '../practice/skillStats.js'
import { MASTERY_THRESHOLD } from '../practice/shadowing/mastery.js'
```

- [ ] **Step 2: Записать первую оценку сегмента**

Текущий код (строки 417-424):

```jsx
      setResults((r) => ({ ...r, [i]: res }))
      const segId = segmentId(curId, i)
      saveTake(segId, blob, res.overall)
      setScores((m) => {
        const n = new Map(m)
        n.set(segId, Math.max(n.get(segId) || 0, res.overall))
        return n
      })
```

Вставить запись навыка ДО слияния в `scores` (по `!scores.has(segId)` определяем первую оценку сегмента):

```jsx
      setResults((r) => ({ ...r, [i]: res }))
      const segId = segmentId(curId, i)
      if (!scores.has(segId)) recordSkill('speaking', res.overall >= MASTERY_THRESHOLD)
      saveTake(segId, blob, res.overall)
      setScores((m) => {
        const n = new Map(m)
        n.set(segId, Math.max(n.get(segId) || 0, res.overall))
        return n
      })
```

> `scores` — это Map «segId → лучший балл»; `!scores.has(segId)` истинно только на первой оценке сегмента. Speaking считает лишь сегменты, которые реально оценивались (оценка платная/ручная) — это честное приближение.

- [ ] **Step 3: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: без ошибок про `ShadowingPage.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ShadowingPage.jsx
git commit -m "feat(skills): shadowing пишет recordSkill('speaking') на первой оценке сегмента"
```

---

### Task 13: Инструментировать Reading (завершение книги)

**Files:**
- Modify: `src/screens/BookDetail.jsx` (функция `openChapter`, ~строки 172-179)

**Interfaces:**
- Consumes: `recordSkill` (`../practice/skillStats.js`)

- [ ] **Step 1: Импорт**

В шапку `src/screens/BookDetail.jsx` добавить:

```jsx
import { recordSkill } from '../practice/skillStats.js'
```

- [ ] **Step 2: Засчитать «дочитал» один раз на книгу**

Добавить рядом со стейтом (после `const [visited, setVisited] = useState(...)`, ~строка 137) флаг, чтобы не считать книгу дважды за сессию:

```jsx
  const readCountedRef = useRef(false)
```

> Если `useRef` ещё не импортирован из `'react'` — добавить его в существующий импорт React.

Текущий код `openChapter` (строки 172-179):

```jsx
  const openChapter = (i, m = 'read') => {
    setCh(i)
    setVisited((s) => new Set(s).add(i))
    setMode(m)
  }
```

Заменить на (когда посещены все главы — считаем чтение книги завершённым; correct=true, книга дочитана):

```jsx
  const openChapter = (i, m = 'read') => {
    setCh(i)
    setVisited((s) => {
      const next = new Set(s).add(i)
      if (!readCountedRef.current && chapters.length > 0 && next.size >= chapters.length) {
        readCountedRef.current = true
        recordSkill('reading', true)
      }
      return next
    })
    setMode(m)
  }
```

> `chapters` в области видимости (`const total = chapters.length || 1`). Reading — приближение: «дочитал» = посетил все главы. Тексты сказок (fairytale) — отдельный источник, вне этой задачи (follow-up).

- [ ] **Step 3: Проверить сборку**

Run: `npx next build 2>&1 | tail -20`
Expected: без ошибок про `BookDetail.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/BookDetail.jsx
git commit -m "feat(skills): чтение книги (все главы) пишет recordSkill('reading')"
```

---

### Task 14: Финальная проверка и прогон

**Files:** нет (проверочная задача)

- [ ] **Step 1: Прогнать все новые тесты**

Run: `npx playwright test tests/skill-stats-core.spec.js tests/skill-contract.spec.js tests/skill-stats-db.spec.js tests/profile-skills.spec.js --project=mobile`
Expected: все PASS.

- [ ] **Step 2: Статический анализ**

Run: `npx eslint src/practice/skillStats.js src/practice/skillStatsCore.js src/lib/skillContract.js src/lib/db/skillStats.js src/app/api/skills/route.js src/components/SkillRatings.jsx`
Expected: без ошибок (при наличии — починить, не глушить).

- [ ] **Step 3: Ручной прогон флоу (dev-сервер + БД)**

1. Применить DDL `skill_stat` к dev-БД (см. deploy-note Task 3).
2. `npx next dev -p 3100`, залогиниться, пройти пару заданий Грамматики/Словаря/Аудирования и один урок Обучения.
3. Открыть `/?screen=profile` → карточка «Навыки» показывает ненулевые полоски по соответствующим навыкам; перезагрузка страницы (GET `/api/skills`) сохраняет значения.
Expected: значения持ятся между перезагрузками и растут по мере практики.

- [ ] **Step 4: Обновить спеку под реальность (dark-mode)**

В `docs/superpowers/specs/2026-08-01-profile-skill-ratings-design.md` в разделе UI заменить пункт про тёмную тему на: «В репозитории тёмной темы нет — стили светлые, как остальной профиль». Commit:

```bash
git add docs/superpowers/specs/2026-08-01-profile-skill-ratings-design.md
git commit -m "docs(skills): убрать dark-mode из спеки — в репозитории его нет"
```

---

## Self-Review

**Spec coverage:** модель данных → Task 3; роут `/api/skills` → Task 4; клиентский сбор → Task 5; формула → Task 1; UI/токены/состояния → Task 6-7; источники всех 6 навыков → Task 8-13 (grammar 8/11, vocab 10/11, listening 9/11, writing 11, speaking 12, reading 13); тесты → Task 1-3, 7, 14; деплой схемы → Task 3 note + Task 14. Всё покрыто.

**Placeholder scan:** плейсхолдеров нет — каждый шаг содержит реальный код/команду.

**Type consistency:** `{ done, firstTry }` единообразно в core/db/client/component/contract; `recordSkill(skill, correct)`, `skillBars({done,firstTry})`, `loadSkillStats`/`applySkillDeltas`, `validateDeltas` совпадают между задачами, которые их определяют и потребляют.
