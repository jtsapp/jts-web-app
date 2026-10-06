# Кэш озвучки в Redis — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** записи `/api/tts` (Soniox) хранятся в Redis и переживают деплой, чтобы одна фраза синтезировалась один раз для всех учеников.

**Architecture:** новый сервис `redis` в `compose.yaml` (AOF в volume, maxmemory + allkeys-lru), `src/lib/redis.js` → `getRedis()` (null без `REDIS_URL`), чтение/запись кэша в `src/lib/soniox-tts.js` идут в Redis, если он задан, иначе на диск, как сейчас. Роут получает заголовок `X-TTS-Cache` и `DELETE` под `x-internal-key`.

**Tech Stack:** Next.js 16 route handlers (nodejs runtime), ioredis 5, vitest 2, docker compose.

Спека: `docs/superpowers/specs/2026-10-06-tts-redis-cache-design.md`.

## Global Constraints

- JavaScript, не TypeScript; комментарии на русском и объясняют «почему».
- `getRedis()` никогда не бросает на импорте; без `REDIS_URL` → `null`.
- Env чистится от BOM (`/^﻿/`) — после записи файла проверить, что в
  исходнике escape, а не настоящий символ (`grep -c $'\xEF\xBB\xBF'` = 0).
- Ключ Redis: `tts:<sha1 из cacheKey>`; TTL `TTS_CACHE_TTL_DAYS`, по умолчанию 90.
- Потолок чтения из Redis 300 мс; ошибка/таймаут = промах.
- Redis задан, но недоступен → НЕ диск, а промах.
- Redis без проброса порта наружу; `REDIS_URL: ${REDIS_URL:-redis://redis:6379}`.
- Тесты гонять `npx vitest run <файл>`; полный прогон — `npx vitest run --exclude '.claude/**'`.

---

### Task 1: клиент Redis

**Files:**
- Create: `src/lib/redis.js`
- Test: `src/lib/redis.test.js`
- Modify: `package.json`, `package-lock.json` (ioredis — уже установлен `npm install ioredis@^5`)

**Interfaces:**
- Produces: `getRedis(): import('ioredis').Redis | null` — синглтон на процесс.

- [ ] **Step 1: тест**

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ioredis подменяем: настоящий клиент полез бы в сеть.
const ctor = vi.hoisted(() => vi.fn())
vi.mock('ioredis', () => ({
  default: class {
    constructor(...args) {
      ctor(...args)
      this.on = vi.fn()
    }
  },
}))

let getRedis

beforeEach(async () => {
  ctor.mockClear()
  vi.resetModules()
  ;({ getRedis } = await import('./redis.js'))
})

afterEach(() => vi.unstubAllEnvs())

describe('getRedis', () => {
  it('без REDIS_URL — null, клиента не создаём', () => {
    vi.stubEnv('REDIS_URL', '')
    expect(getRedis()).toBeNull()
    expect(ctor).not.toHaveBeenCalled()
  })

  it('BOM и пробелы из env срезаны, команды не копятся в офлайне', () => {
    vi.stubEnv('REDIS_URL', '﻿ redis://redis:6379 ')
    const r = getRedis()
    expect(r).not.toBeNull()
    const [url, opts] = ctor.mock.calls[0]
    expect(url).toBe('redis://redis:6379')
    expect(opts.enableOfflineQueue).toBe(false)
    expect(r.on).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('один клиент на процесс', () => {
    vi.stubEnv('REDIS_URL', 'redis://redis:6379')
    expect(getRedis()).toBe(getRedis())
    expect(ctor).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: прогнать — FAIL** (`Failed to resolve import "./redis.js"`)

Run: `npx vitest run src/lib/redis.test.js`

- [ ] **Step 3: реализация `src/lib/redis.js`**

```js
// Общий клиент Redis. Пока в нём живёт только кэш озвучки /api/tts
// (src/lib/soniox-tts.js): дисковый кэш в /tmp контейнера умирал на каждом
// деплое (CI делает `up --force-recreate`), и всё синтезировалось и
// оплачивалось заново. Redis со своим volume переживает пересоздание.
//
// Как getSql(): без REDIS_URL — null, и вызывающий тихо обходится без Redis.
// На импорте не бросаем.
//
// Redis — кэш, а не хранилище: если он лёг, запрос должен идти дальше в Soniox,
// а не ждать. Поэтому офлайн-очередь выключена (команда падает сразу, а не
// копится до переподключения), а время на команду ограничено.

import Redis from 'ioredis'

let cached

export function getRedis() {
  if (cached !== undefined) return cached
  // BOM из Windows-пайпа рвёт разбор адреса — тот же класс бага, что в sql.js.
  const url = (process.env.REDIS_URL ?? '').replace(/^﻿/, '').trim()
  if (!url) return (cached = null)
  const client = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 1000,
    // Переподключаемся бесконечно, но не чаще раза в 10 с: Redis поднимется
    // после деплоя чуть позже сайта.
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  })
  // Без слушателя ioredis пишет каждую неудачную попытку в лог. Одна строка
  // в минуту — достаточно, чтобы заметить, и не забивает лог.
  let lastWarn = 0
  client.on('error', (e) => {
    const now = Date.now()
    if (now - lastWarn < 60_000) return
    lastWarn = now
    console.warn('[redis]', e?.message || e)
  })
  return (cached = client)
}
```

- [ ] **Step 4: прогнать — PASS**; проверить, что BOM в исходнике escape: `grep -c $'\xEF\xBB\xBF' src/lib/redis.js src/lib/redis.test.js` → `0`.

- [ ] **Step 5: коммит**

```bash
git add package.json package-lock.json src/lib/redis.js src/lib/redis.test.js
git commit -m "feat(tts): клиент Redis — getRedis() без REDIS_URL возвращает null"
```

---

### Task 2: кэш озвучки в Redis + `X-TTS-Cache`

**Files:**
- Modify: `src/lib/soniox-tts.js` (блок «Дисковый кэш»)
- Modify: `src/app/api/tts/route.js` (`cachedResponse`, ответ промаха)
- Test: `src/app/api/tts/route.test.js`

**Interfaces:**
- Consumes: `getRedis()` из Task 1.
- Produces: `readCached(key): Promise<Buffer|null>`, `writeCached(key, buf): Promise<void>`, `dropCached(keys: string[]): Promise<number>` — все сами выбирают Redis или диск.

- [ ] **Step 1: тесты** — в начало `route.test.js` (после импортов):

```js
// Redis подменяем на Map: по умолчанию его нет (null) — старые тесты идут по
// дисковому кэшу, как без REDIS_URL на локалке.
const redisBox = vi.hoisted(() => ({ client: null }))
vi.mock('../../../lib/redis.js', () => ({ getRedis: () => redisBox.client }))

function fakeRedis() {
  const store = new Map()
  const ttl = new Map()
  return {
    store,
    ttl,
    getBuffer: vi.fn(async (k) => store.get(k) ?? null),
    set: vi.fn(async (k, v, mode, sec) => {
      store.set(k, Buffer.from(v))
      ttl.set(k, sec)
      return 'OK'
    }),
    del: vi.fn(async (...ks) => ks.reduce((n, k) => n + (store.delete(k) ? 1 : 0), 0)),
  }
}
```

в `afterEach` добавить `redisBox.client = null`. В тест «попадание в кэш» добавить
`expect(full.headers.get('x-tts-cache')).toBe('hit')`, в «промах кэша» —
`expect(res.headers.get('x-tts-cache')).toBe('miss')`. Новый блок:

```js
describe('GET /api/tts с Redis', () => {
  let redis
  beforeEach(() => {
    redis = fakeRedis()
    redisBox.client = redis
  })

  it('промах пишется в Redis со сроком 90 дней, не на диск; повтор — из Redis', async () => {
    const first = await GET(req('v=Grace&l=en&s=0.9&t=apple'))
    expect(first.headers.get('x-tts-cache')).toBe('miss')
    await first.arrayBuffer()
    await vi.waitFor(() => expect(redis.set).toHaveBeenCalledTimes(1))
    const [key, , mode, sec] = redis.set.mock.calls[0]
    expect(key).toMatch(/^tts:[0-9a-f]{40}$/)
    expect(mode).toBe('EX')
    expect(sec).toBe(90 * 86400)
    expect(cachedFiles()).toHaveLength(0)

    fetchMock.mockClear()
    const again = await GET(req('v=Grace&l=en&s=0.9&t=apple'))
    expect(again.headers.get('x-tts-cache')).toBe('hit')
    expect(Buffer.from(await again.arrayBuffer()).equals(MP3)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('срок жизни берётся из TTS_CACHE_TTL_DAYS', async () => {
    vi.stubEnv('TTS_CACHE_TTL_DAYS', '1')
    await (await GET(req('v=Grace&t=ttl'))).arrayBuffer()
    await vi.waitFor(() => expect(redis.set).toHaveBeenCalled())
    expect(redis.set.mock.calls[0][3]).toBe(86400)
  })

  it('Redis бросает — звук всё равно есть (Soniox), на диск не откатываемся', async () => {
    redis.getBuffer.mockRejectedValue(new Error("Stream isn't writeable"))
    redis.set.mockRejectedValue(new Error("Stream isn't writeable"))
    const res = await GET(req('v=Grace&t=down'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-tts-cache')).toBe('miss')
    expect(Buffer.from(await res.arrayBuffer()).equals(MP3)).toBe(true)
    await new Promise((r) => setTimeout(r, 30))
    expect(cachedFiles()).toHaveLength(0)
  })

  it('Redis висит — через 300 мс считаем промахом и идём в Soniox', async () => {
    redis.getBuffer.mockImplementation(() => new Promise(() => {}))
    const t0 = Date.now()
    const res = await GET(req('v=Grace&t=slow'))
    expect(res.status).toBe(200)
    expect(Date.now() - t0).toBeGreaterThanOrEqual(290)
    expect(Date.now() - t0).toBeLessThan(2000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: прогнать — FAIL** (`x-tts-cache` null, `redis.set` не вызван)

Run: `npx vitest run src/app/api/tts/route.test.js`

- [ ] **Step 3: `soniox-tts.js`** — импорт `import { getRedis } from './redis.js'`,
обновить шапку (п. 2 — кэш в Redis), заменить `readCached` / `writeCached`,
добавить `dropCached`:

```js
// Redis (REDIS_URL задан) — основной кэш: он в своём volume и переживает
// деплой, а /tmp контейнера — нет. Без Redis (локалка, тесты) — диск.
const REDIS_PREFIX = 'tts:'
// Кэш не должен тормозить звук: дольше этого ждать Redis дороже, чем
// синтезировать заново.
const REDIS_READ_MS = 300
// Синтез не детерминирован и изредка срывается; с вечным кэшем брак жил бы у
// всех вечно. 90 дней — компромисс: популярное слово переплатим раз в квартал.
const ttlSec = () => (Number(env('TTS_CACHE_TTL_DAYS')) || 90) * 86400

let redisWarnedAt = 0
function redisWarn(op, e) {
  const now = Date.now()
  if (now - redisWarnedAt < 60_000) return
  redisWarnedAt = now
  console.warn(`[tts] redis ${op} skipped:`, e?.message || e)
}

function within(promise, ms) {
  let timer
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
  })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

export async function readCached(key) {
  const redis = getRedis()
  if (redis) {
    // Redis задан, но не ответил — промах, а НЕ диск: два кэша дали бы на одно
    // слово два разных звука.
    try {
      return await within(redis.getBuffer(REDIS_PREFIX + key), REDIS_READ_MS)
    } catch (e) {
      redisWarn('read', e)
      return null
    }
  }
  try {
    return await fsp.readFile(cachePath(key))
  } catch {
    return null
  }
}

export async function writeCached(key, buf) {
  if (!looksLikeMp3(buf)) return
  const redis = getRedis()
  if (redis) {
    await redis.set(REDIS_PREFIX + key, buf, 'EX', ttlSec())
    return
  }
  // …дальше прежний дисковый код без изменений (mkdir, .part, rename, prune)
}

/** Удалить записи по ключам (брак синтеза). Возвращает, сколько нашлось. */
export async function dropCached(keys) {
  if (!keys.length) return 0
  const redis = getRedis()
  if (redis) return redis.del(...keys.map((k) => REDIS_PREFIX + k))
  let n = 0
  for (const k of keys) {
    try {
      await fsp.unlink(cachePath(k))
      n++
    } catch {
      /* такой записи не было */
    }
  }
  return n
}
```

- [ ] **Step 4: `route.js`** — в `cachedResponse` в `base` добавить
`'X-TTS-Cache': 'hit'`; в финальном `new Response(toClient, …)` —
`'X-TTS-Cache': 'miss'`. Комментарий к заголовку: «по нему curl'ом видно,
пережил ли кэш деплой».

- [ ] **Step 5: прогнать — PASS** (все тесты файла, старые дисковые тоже).

- [ ] **Step 6: коммит**

```bash
git add src/lib/soniox-tts.js src/app/api/tts/route.js src/app/api/tts/route.test.js
git commit -m "feat(tts): кэш записей в Redis со сроком 90 дней, заголовок X-TTS-Cache"
```

---

### Task 3: `DELETE /api/tts` — удалить брак

**Files:**
- Modify: `src/app/api/tts/route.js`
- Test: `src/app/api/tts/route.test.js`

**Interfaces:**
- Consumes: `dropCached(keys)`, `cacheKey(n)` (soniox-tts), `normalizeTts`,
  `TTS_VOICES`, `TTS_SPEED_MIN/MAX` (ttsShared), `isTrustedInternalCaller`
  (auth-server).

- [ ] **Step 1: тесты** — импорт `DELETE` рядом с `GET`
(`;({ GET, DELETE } = await import('./route.js'))`, `let DELETE`), хелпер
`const del = (qs, headers = {}) => new Request(\`http://localhost/api/tts?${qs}\`, { method: 'DELETE', headers })`,
в `beforeEach` — `vi.stubEnv('INTERNAL_API_KEY', 'k_test')`. В Redis-блок:

```js
  it('DELETE без ключа — 401, ничего не удаляем', async () => {
    const res = await DELETE(del('t=apple'))
    expect(res.status).toBe(401)
    expect(redis.del).not.toHaveBeenCalled()
  })

  it('DELETE: пустой INTERNAL_API_KEY закрывает канал (fail-closed)', async () => {
    vi.stubEnv('INTERNAL_API_KEY', '')
    const res = await DELETE(del('t=apple', { 'x-internal-key': '' }))
    expect(res.status).toBe(401)
  })

  it('DELETE только с текстом сносит все варианты фразы', async () => {
    await (await GET(req('v=Grace&s=0.9&t=apple'))).arrayBuffer()
    await (await GET(req('v=Freya&s=0.7&t=apple'))).arrayBuffer()
    await (await GET(req('v=Grace&s=0.9&t=pear'))).arrayBuffer()
    await vi.waitFor(() => expect(redis.store.size).toBe(3))

    // Пробелы нормализуются, регистр — нет: «Apple» был бы другим текстом.
    const res = await DELETE(del('t=%20apple%20', { 'x-internal-key': 'k_test' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ deleted: 2 })
    expect(redis.store.size).toBe(1)

    fetchMock.mockClear()
    const again = await GET(req('v=Grace&s=0.9&t=apple'))
    expect(again.headers.get('x-tts-cache')).toBe('miss')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('DELETE с голосом и темпом — только этот вариант', async () => {
    await (await GET(req('v=Grace&s=0.9&t=apple'))).arrayBuffer()
    await (await GET(req('v=Freya&s=0.9&t=apple'))).arrayBuffer()
    await vi.waitFor(() => expect(redis.store.size).toBe(2))
    const res = await DELETE(del('v=Grace&s=0.9&t=apple', { 'x-internal-key': 'k_test' }))
    expect(await res.json()).toEqual({ deleted: 1 })
    expect(redis.store.size).toBe(1)
  })

  it('DELETE: неизвестный голос — 400, пустой текст — 400', async () => {
    const h = { 'x-internal-key': 'k_test' }
    expect((await DELETE(del('v=Nobody&t=apple', h))).status).toBe(400)
    expect((await DELETE(del('t=%20', h))).status).toBe(400)
  })
```

и в дисковый блок:

```js
  it('DELETE без Redis удаляет файл записи', async () => {
    await (await GET(req('v=Grace&s=0.9&t=apple'))).arrayBuffer()
    await vi.waitFor(() => expect(cachedFiles()).toHaveLength(1))
    const res = await DELETE(del('t=apple', { 'x-internal-key': 'k_test' }))
    expect(await res.json()).toEqual({ deleted: 1 })
    expect(cachedFiles()).toHaveLength(0)
  })
```

- [ ] **Step 2: прогнать — FAIL** (`DELETE is not a function`)

- [ ] **Step 3: реализация в `route.js`**

```js
import { isTrustedInternalCaller } from '../../../lib/auth-server.js'
// + dropCached в импорт из soniox-tts, TTS_SPEED_MIN/TTS_SPEED_MAX из ttsShared

// Все темпы, которые normalizeTts может выдать (шаг 0.05).
const SPEEDS = []
for (let i = Math.round(TTS_SPEED_MIN * 20); i <= Math.round(TTS_SPEED_MAX * 20); i++) SPEEDS.push(i / 20)
const LANG_CODES = ['en', 'ru', 'kk']

// Удалить бракованную запись. Синтез изредка срывается (бормотание вместо
// слова), а кэш теперь переживает деплой — без этой двери брак жил бы у всех
// 90 дней. Закрыто тем же ключом, что канал агента: удалить запись = заставить
// заплатить за новый синтез, это не для всех.
//
// Не указанный параметр = все его значения: «удали apple» сносит и обычный, и
// медленный темп, и американский, и британский голос. Текст — тот, что ушёл в
// синтез (для омографов Словаря это «reed», а не «read»).
export async function DELETE(request) {
  if (!isTrustedInternalCaller(request)) return fail(401, 'Unauthorized.')
  const q = new URL(request.url).searchParams
  const v = q.get('v')
  if (v && !TTS_VOICES.has(v)) return fail(400, 'Unknown voice.')
  const voices = v ? [v] : [...TTS_VOICES]
  const langs = q.get('l') ? [q.get('l')] : LANG_CODES
  const speeds = q.get('s') ? [q.get('s')] : SPEEDS
  const keys = new Set()
  for (const voice of voices)
    for (const lang of langs)
      for (const speed of speeds) {
        const n = normalizeTts({ text: q.get('t'), voice, lang, speed })
        if (!n) return fail(400, 'Text is required.')
        keys.add(cacheKey(n))
      }
  const deleted = await dropCached([...keys])
  return Response.json({ deleted }, { headers: { 'Cache-Control': 'no-store' } })
}
```

- [ ] **Step 4: прогнать — PASS**

- [ ] **Step 5: коммит**

```bash
git add src/app/api/tts/route.js src/app/api/tts/route.test.js
git commit -m "feat(tts): DELETE /api/tts под внутренним ключом — снести брак синтеза"
```

---

### Task 4: compose, env, документация, сборка

**Files:**
- Modify: `compose.yaml` (сервис `redis`, volume `jts-web-app-redis`)
- Modify: `compose-app.yaml` (`REDIS_URL` в `web.environment`)
- Modify: `.env.example` (рядом с `TTS_CACHE_DIR`)
- Modify: `CLAUDE.md` (раздел «Внешние сервисы»)

- [ ] **Step 1: `compose.yaml`** — после `postgres`:

```yaml
  # Кэш озвучки /api/tts (src/lib/soniox-tts.js). Раньше он жил в /tmp
  # контейнера web и пропадал на каждом деплое (`up --force-recreate`), а
  # каждый промах — платный синтез Soniox. Здесь записи в своём volume.
  #
  # Порт наружу НЕ пробрасываем: Redis без пароля, и виден он только web
  # внутри сети compose. AOF раз в секунду — пересоздание контейнера
  # поднимает кэш с диска. maxmemory + allkeys-lru: переполнился — выкинул
  # давно не слушанные записи, а не упал. mem_limit с запасом над maxmemory —
  # перезапись AOF делает fork.
  redis:
    image: 'redis:7-alpine'
    restart: unless-stopped
    command:
      - redis-server
      - --appendonly
      - 'yes'
      - --appendfsync
      - everysec
      - --save
      - ''
      - --maxmemory
      - ${TTS_REDIS_MAXMEMORY:-256mb}
      - --maxmemory-policy
      - allkeys-lru
    mem_limit: 512m
    volumes:
      - jts-web-app-redis:/data
```

и в `volumes:` — `jts-web-app-redis:`.

- [ ] **Step 2: `compose-app.yaml`** — в `environment` web рядом с `SONIOX_API_KEY`:

```yaml
      # Кэш озвучки (см. сервис redis в compose.yaml). Не секрет: внутреннее
      # имя сервиса, поэтому дефолт здесь, а не в GitLab.
      REDIS_URL: ${REDIS_URL:-redis://redis:6379}
      TTS_CACHE_TTL_DAYS: ${TTS_CACHE_TTL_DAYS:-90}
```

- [ ] **Step 3: `.env.example`** после строки `TTS_CACHE_MAX_MB`:

```
# REDIS_URL=                 # (опц.) кэш /api/tts в Redis; пусто → диск (TTS_CACHE_DIR).
#                            # На сервере задаёт compose (redis://redis:6379).
# TTS_CACHE_TTL_DAYS=90      # (опц.) срок жизни записи в Redis, дней.
```

- [ ] **Step 4: `CLAUDE.md`** — в «Внешние сервисы» после строки про Neon:

```
- Redis (`compose.yaml`, сервис `redis`): только кэш озвучки `/api/tts`,
  `src/lib/redis.js` → `getRedis()` = `null` без `REDIS_URL` (тогда кэш на
  диске). Наружу не открыт; брак синтеза сносится `DELETE /api/tts?t=…` с
  `x-internal-key`.
```

- [ ] **Step 5: проверить compose** — `docker compose -f compose.yaml -f compose-app.yaml config >/dev/null` (если docker есть; иначе `node -e` с пакетом `yaml` нет — проверить отступы глазами и `git diff`).

- [ ] **Step 6: сборка, линт, тесты**

```bash
npm run build
npm run lint
npx vitest run --exclude '.claude/**'
```

Expected: build ок; линт — только известные 6 ошибок practice/vocab
(pre-existing); vitest — известный красный `practice-contract`/флак `vocab`, без
новых падений.

- [ ] **Step 7: коммит**

```bash
git add compose.yaml compose-app.yaml .env.example CLAUDE.md docs/superpowers
git commit -m "chore(tts): сервис redis в compose, REDIS_URL, документация"
```

---

### Task 5: PR и проверка на dev

- [ ] **Step 1:** `git push -u origin feat/tts-redis-cache`, PR в `develop`.
- [ ] **Step 2:** после мержа и деплоя dev:
  `curl -s -o /dev/null -D - "https://dev-tutor.justtostudy.kz/api/tts?v=Grace&l=en&s=0.9&t=<уникальная фраза>" | grep -i x-tts-cache` → `miss`, повтор → `hit`.
- [ ] **Step 3:** после СЛЕДУЮЩЕГО деплоя dev — тот же запрос → `hit`.
- [ ] **Step 4:** PR develop → main по процессу релиза.
