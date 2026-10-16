# Позывной Луны («Привет, Луна») — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ученик говорит «Привет, Луна» / «Сәлем, Луна» на любом экране — окно Луны открывается, она здоровается, говорит, что видит, спрашивает, чем помочь, и сама слушает один ответ.

**Architecture:** Распознавание позывного — на устройстве: Vosk (`vosk-browser`, WASM в Web Worker) с грамматикой из двух фраз и `[unk]`. «Ухо» (`wakeEar.js`) отдаёт микрофон, когда его берёт любой раздел, — это видит `micArbiter.js`, обёртка над `getUserMedia` и `SpeechRecognition.start`. Хук `useWakeWord` решает, когда слушать; виджет на позывной шлёт служебную пометку `[ученик позвал голосом]`, сервер ставит рядом с ней указание «поздоровайся и спроси, чем помочь». Часть 1 (задачи 1–8) — прототип-лаборатория и замер на телефонах, решение «идём / не идём»; часть 2 (задачи 9–14) — встраивание, только после «идём».

**Tech Stack:** Next.js 16 (App Router как оболочка SPA), React 19, JavaScript (не TS), vitest 2 + @testing-library/react, Playwright, vosk-browser 0.0.8, модель vosk-model-small-ru-0.22.

**Спека:** `docs/superpowers/specs/2026-10-16-luna-wake-word-design.md`.

## Global Constraints

- Только JavaScript (`.js`/`.jsx`), TS-файлы не добавлять.
- Комментарии — по-русски и объясняют «почему», с контекстом решений (стиль `AssistantWidget.jsx`, `useVoiceQuestion.js`).
- Фразы — ровно `привет луна` и `салем луна`; грамматика распознавателя `["привет луна", "салем луна", "[unk]"]`.
- Модель: `https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip`, sha256 `961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4`; адрес на сайте `/assistant/wake/vosk-model-small-ru-0.22.tar.gz`; в git НЕ кладётся.
- `vosk-browser@0.0.8` (точная версия), грузится только динамическим `import()`.
- Служебная пометка — `[ученик позвал голосом]` (`WAKE_MARK`).
- Пауза после позывного или закрытия окна — 5000 мс; шаг хука — 500 мс; опрос арбитра — 1000 мс.
- Настройка устройства — ключ localStorage `jts_luna_wake` (`'1'` — включено).
- После приветствия — запись РОВНО одного ответа; дальше — кнопкой (отменённый 15.10 «разговор без кнопки» не делаем).
- Строки UI — через `useI18n` (`src/i18n.jsx`), ключи во всех трёх языках ru/en/kk. Стили — в `src/assistant.css`.
- Работа — в worktree `.claude/worktrees/luna-wake`, ветка от `origin/develop` (локальный `develop` отстаёт на сотни коммитов). PR — в `develop`.
- vitest запускать только изнутри worktree и с путями (из корня основного дерева он подбирает чужие worktree). E2E — `E2E_PORT=3257`, `--workers=1`, `--project=desktop`.
- Коммиты заканчиваются строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Карта файлов

| Файл | Что | Задача |
|---|---|---|
| `scripts/lib/tar.js` (+test) | писатель tar/tar.gz без зависимостей | 2 |
| `scripts/fetch-wake-model.js` (+test) | скачать zip, сверить sha256, перепаковать в tar.gz | 2 |
| `Dockerfile`, `.gitignore` | модель при сборке, не в git | 2 |
| `src/lib/assistant/wake/model.js` | адрес модели на сайте | 3 |
| `src/lib/assistant/wake/matchWake.js` (+test) | фразы, грамматика, сверка текста | 3 |
| `src/lib/assistant/wake/micArbiter.js` (+test) | кто ещё держит микрофон | 4 |
| `src/lib/assistant/wake/wakeEar.js` (+test) | Vosk + микрофон → `onWake` | 5 |
| `src/app/wake-lab/page.jsx`, `tests/wake-lab.spec.js` | лаборатория для замеров | 6 |
| `src/lib/assistant/opening.js`, `prompt.js`, `chat/route.js` (+tests) | пометка позывного на сервере | 9 |
| `.claude/probes/wake-opening.mjs` (не в git) | замер первой реплики на Haiku 5.5 | 10 |
| `src/lib/assistant/wake/wakeSetting.js`, `useWakeWord.js` (+test) | настройка устройства и хук | 11 |
| `src/components/AssistantWidget.jsx`, `src/i18n.jsx`, `src/assistant.css` | переключатель, значок, приветствие и запись ответа | 12 |
| `tests/assistant-wake.spec.js` | e2e окна | 13 |
| `CLAUDE.md` | абзац «Позывной Луны» | 14 |

---

# Часть 1 — прототип и решение

### Task 1: Worktree и зависимость

**Files:**
- Modify: `package.json`, `package-lock.json` (в worktree)
- Modify: `C:\Users\nural\Desktop\jts-web-app\.claude\launch.json` (основное дерево, не в git)

- [ ] **Step 1: Создать worktree от свежего develop**

```bash
cd C:/Users/nural/Desktop/jts-web-app
git fetch origin develop
git worktree add .claude/worktrees/luna-wake -b feat/luna-wake origin/develop
```

- [ ] **Step 2: node_modules — junction на основное дерево, .env.local — копией**

`package.json` основного дерева и `origin/develop` совпадают (проверено 16.10), поэтому junction безопасен.

```bash
cmd //c mklink /J "C:\\Users\\nural\\Desktop\\jts-web-app\\.claude\\worktrees\\luna-wake\\node_modules" "C:\\Users\\nural\\Desktop\\jts-web-app\\node_modules"
cp C:/Users/nural/Desktop/jts-web-app/.env.local C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/luna-wake/.env.local
```

Expected: `Junction created for …`. При удалении worktree junction снимается ПЕРВЫМ (`cmd //c rmdir <путь>\node_modules`), иначе `rm -rf` пройдёт по основному node_modules.

- [ ] **Step 3: Поставить vosk-browser**

```bash
cd C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/luna-wake
npm install vosk-browser@0.0.8 --save-exact
```

Expected: в `package.json` → `"vosk-browser": "0.0.8"`; `git diff --stat` — только `package.json` и `package-lock.json`.

- [ ] **Step 4: Конфиг превью для этого worktree**

В `C:\Users\nural\Desktop\jts-web-app\.claude\launch.json` добавить в `configurations` (порт 3257; если занят — любой свободный, и тот же порт в `E2E_PORT` ниже):

```json
{
  "name": "web-luna-wake",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["--prefix", ".claude/worktrees/luna-wake", "run", "dev", "--", "--port", "3257"],
  "port": 3257,
  "autoPort": false
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(помощник): vosk-browser для позывного Луны

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Модель — скачать, сверить, перепаковать при сборке

**Files:**
- Create: `scripts/lib/tar.js`, `scripts/lib/tar.test.js`
- Create: `scripts/fetch-wake-model.js`, `scripts/fetch-wake-model.test.js`
- Modify: `scripts/lib/zip.js:113-115` (комментарий `unzipSync`)
- Modify: `Dockerfile` (стадия builder), `.gitignore`

**Interfaces:**
- Produces: `tarSync(entries) → Buffer`, `tarGzSync(entries) → Buffer` где `entries: {name: string, data?: Buffer}[]` (имя на `/` — каталог); `MODEL = { url, sha256, out }`, `zipToTarGz(zipBuf) → Buffer`, `sha256(buf) → string` из `scripts/fetch-wake-model.js` (CommonJS).
- Consumes: `unzipSync` из `scripts/lib/zip.js`; `WAKE_MODEL_URL` из Task 3 (тест сверяет; создать `model.js` можно в этой задаче — см. Step 5).

- [ ] **Step 1: Падающий тест писателя tar**

`scripts/lib/tar.test.js`:

```js
import { describe, it, expect } from 'vitest'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { tarSync, tarGzSync } = require('./tar.js')

// Читатель — только для теста: имя, тип, размер, данные и сверка контрольной суммы.
function readTar(buf) {
  const out = []
  let i = 0
  while (i + 512 <= buf.length) {
    const h = buf.subarray(i, i + 512)
    if (h.every((b) => b === 0)) break
    const name = h.toString('utf8', 0, 100).replace(/\0.*$/s, '')
    const size = parseInt(h.toString('ascii', 124, 135), 8)
    const type = h.toString('ascii', 156, 157)
    const stored = parseInt(h.toString('ascii', 148, 154), 8)
    let sum = 0
    for (let k = 0; k < 512; k++) sum += k >= 148 && k < 156 ? 32 : h[k]
    out.push({ name, size, type, sumOk: stored === sum, data: buf.subarray(i + 512, i + 512 + size) })
    i += 512 + Math.ceil(size / 512) * 512
  }
  return out
}

describe('tar', () => {
  it('каталоги и файлы — с верной суммой, размером и данными', () => {
    const entries = readTar(
      tarSync([
        { name: 'm/' },
        { name: 'm/conf/model.conf', data: Buffer.from('--beam=10.0\n') },
        { name: 'm/am/final.mdl', data: Buffer.alloc(1300, 7) },
      ]),
    )
    expect(entries.map((e) => [e.name, e.type, e.size])).toEqual([
      ['m/', '5', 0],
      ['m/conf/model.conf', '0', 12],
      ['m/am/final.mdl', '0', 1300],
    ])
    expect(entries.every((e) => e.sumOk)).toBe(true)
    expect(entries[1].data.toString()).toBe('--beam=10.0\n')
    expect(entries[2].data.every((b) => b === 7)).toBe(true)
  })

  it('конец архива — два нулевых блока, размер кратен 512', () => {
    const buf = tarSync([{ name: 'a', data: Buffer.from('x') }])
    expect(buf.length % 512).toBe(0)
    expect(buf.subarray(-1024).every((b) => b === 0)).toBe(true)
  })

  it('слишком длинное имя — ошибка, а не обрезанный путь', () => {
    expect(() => tarSync([{ name: 'x'.repeat(100), data: Buffer.from('') }])).toThrow(/длиннее 99/)
  })

  it('tar.gz разжимается в тот же tar и побайтно стабилен', () => {
    const entries = [{ name: 'a/' }, { name: 'a/b', data: Buffer.from('hello') }]
    expect(zlib.gunzipSync(tarGzSync(entries))).toEqual(tarSync(entries))
    expect(tarGzSync(entries)).toEqual(tarGzSync(entries))
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run scripts/lib/tar.test.js`
Expected: FAIL — `Cannot find module './tar.js'`.

- [ ] **Step 3: Писатель tar**

`scripts/lib/tar.js`:

```js
// Минимальный писатель tar (ustar) без внешних зависимостей — пара к zip.js.
//
// Нужен под одно: модель Vosk для позывного Луны приезжает с alphacephei.com
// zip-архивом, а vosk-browser читает только .tar.gz (scripts/fetch-wake-model.js).
// Тянуть ради перепаковки tar/fflate не стали — как и с ZIP.
//
// mtime у всех записей нулевой: архив из одного и того же zip побайтно один и тот
// же при любом прогоне, и сборки не отличаются ничем, кроме кода.
const zlib = require('zlib')

// Числовые поля tar — восьмеричные строки фиксированной ширины с завершающим \0.
function octal(n, width) {
  return n.toString(8).padStart(width - 1, '0') + '\0'
}

function header(name, size, type) {
  // Длинные имена требуют поля prefix или расширений pax — у модели самое длинное
  // имя 54 байта, поэтому честно падаем, а не режем путь молча.
  if (Buffer.byteLength(name) > 99) throw new Error(`tar: имя длиннее 99 байт: ${name}`)
  const h = Buffer.alloc(512)
  h.write(name, 0, 'utf8')
  h.write(octal(type === '5' ? 0o755 : 0o644, 8), 100, 'ascii')
  h.write(octal(0, 8), 108, 'ascii')
  h.write(octal(0, 8), 116, 'ascii')
  h.write(octal(size, 12), 124, 'ascii')
  h.write(octal(0, 12), 136, 'ascii')
  // Контрольная сумма считается, пока её собственное поле заполнено пробелами.
  h.write('        ', 148, 'ascii')
  h.write(type, 156, 'ascii')
  h.write('ustar\0', 257, 'ascii')
  h.write('00', 263, 'ascii')
  let sum = 0
  for (const b of h) sum += b
  h.write(`${octal(sum, 7)} `, 148, 'ascii')
  return h
}

/**
 * Собирает несжатый tar.
 * @param {{name: string, data?: Buffer}[]} entries  имя, кончающееся на «/», — каталог
 * @returns {Buffer}
 */
function tarSync(entries) {
  const parts = []
  for (const e of entries) {
    const dir = e.name.endsWith('/')
    const data = dir ? Buffer.alloc(0) : Buffer.from(e.data ?? '')
    parts.push(header(e.name, data.length, dir ? '5' : '0'))
    if (data.length) {
      parts.push(data)
      const pad = (512 - (data.length % 512)) % 512
      if (pad) parts.push(Buffer.alloc(pad))
    }
  }
  parts.push(Buffer.alloc(1024))
  return Buffer.concat(parts)
}

/** tar, сжатый gzip. */
function tarGzSync(entries) {
  return zlib.gzipSync(tarSync(entries), { level: 9 })
}

module.exports = { tarSync, tarGzSync }
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run scripts/lib/tar.test.js`
Expected: PASS, 4 теста.

- [ ] **Step 5: Адрес модели на клиенте и падающий тест скрипта**

`src/lib/assistant/wake/model.js`:

```js
// Адрес модели позывного на сайте. Файл кладёт сборка (scripts/fetch-wake-model.js):
// в git его нет — 45 МБ. Имя — с версией модели: vosk-browser кэширует распакованную
// модель в IndexedDB по адресу, и новая версия модели обязана быть новым адресом.
export const WAKE_MODEL_URL = '/assistant/wake/vosk-model-small-ru-0.22.tar.gz'
```

`scripts/fetch-wake-model.test.js`:

```js
import { describe, it, expect } from 'vitest'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { WAKE_MODEL_URL } from '../src/lib/assistant/wake/model.js'

const require = createRequire(import.meta.url)
const { MODEL, zipToTarGz } = require('./fetch-wake-model.js')
const { zipSync } = require('./lib/zip.js')

const tarNames = (tar) => {
  const names = []
  for (let i = 0; i + 512 <= tar.length; ) {
    const h = tar.subarray(i, i + 512)
    if (h.every((b) => b === 0)) break
    const size = parseInt(h.toString('ascii', 124, 135), 8)
    names.push(h.toString('utf8', 0, 100).replace(/\0.*$/s, ''))
    i += 512 + Math.ceil(size / 512) * 512
  }
  return names
}

describe('модель позывного', () => {
  it('файл сборки и адрес на клиенте — один и тот же', () => {
    expect(`/${MODEL.out.replace(/^public\//, '')}`).toBe(WAKE_MODEL_URL)
  })

  it('закреплён sha256 именно той модели, чей словарь проверен', () => {
    expect(MODEL.url).toBe('https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip')
    expect(MODEL.sha256).toBe('961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4')
  })

  it('zip → tar.gz: те же файлы под той же папкой, по алфавиту', () => {
    const zip = zipSync([
      { name: 'vosk-model-small-ru-0.22/conf/model.conf', data: '--beam=10.0\n' },
      { name: 'vosk-model-small-ru-0.22/am/final.mdl', data: Buffer.alloc(700, 1) },
    ])
    expect(tarNames(zlib.gunzipSync(zipToTarGz(zip)))).toEqual([
      'vosk-model-small-ru-0.22/am/final.mdl',
      'vosk-model-small-ru-0.22/conf/model.conf',
    ])
  })

  it('не zip — ошибка, а не пустая модель', () => {
    expect(() => zipToTarGz(Buffer.from('not a zip'))).toThrow(/пустой/)
  })
})
```

- [ ] **Step 6: Убедиться, что падает**

Run: `npx vitest run scripts/fetch-wake-model.test.js`
Expected: FAIL — `Cannot find module './fetch-wake-model.js'`.

- [ ] **Step 7: Скрипт модели**

`scripts/fetch-wake-model.js`:

```js
#!/usr/bin/env node
// Модель Vosk для позывного Луны («Привет, Луна»): скачать, сверить, перепаковать.
//
// Модель весит 45 МБ, поэтому в git её нет (репозиторий и так почти весь из
// бинарей) — её кладёт сюда сборка (Dockerfile) и этот же скрипт локально.
// alphacephei.com отдаёт zip, а vosk-browser читает только .tar.gz с папкой
// модели внутри (первый уровень пути он срезает сам) — отсюда перепаковка.
//
// sha256 закреплён: модель исполняет распознаватель на устройстве каждого
// ученика, и подменённый архив должен ронять сборку, а не уезжать в прод. Словарь
// именно этой модели проверен по её Gr.fst (16.10.2026): «привет», «салем», «луна»
// в нём есть — без них грамматика позывного тихо потеряла бы слова.
//
// Готовый файл не перекачивается.
//
//   node scripts/fetch-wake-model.js          # сеть легла — ошибка
//   node scripts/fetch-wake-model.js --soft   # сеть легла — предупреждение и выход 0:
//                                             # Dockerfile — недоступный сайт моделей не
//                                             # должен валить деплой всего приложения;
//                                             # позывной тогда напишет «не загрузилось».
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { unzipSync } = require('./lib/zip.js')
const { tarGzSync } = require('./lib/tar.js')

const MODEL = {
  url: 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip',
  sha256: '961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4',
  // Совпадает с WAKE_MODEL_URL в src/lib/assistant/wake/model.js (сверяет тест).
  out: 'public/assistant/wake/vosk-model-small-ru-0.22.tar.gz',
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/** zip модели → tar.gz с той же раскладкой (каталоги — отдельными записями). */
function zipToTarGz(zipBuf) {
  const files = unzipSync(zipBuf)
  const names = Object.keys(files).sort()
  if (!names.length) throw new Error('zip пустой — или это не тот формат, что читает unzipSync')
  return tarGzSync(names.map((name) => (name.endsWith('/') ? { name } : { name, data: files[name] })))
}

async function main() {
  const soft = process.argv.includes('--soft')
  const out = path.join(__dirname, '..', MODEL.out)
  if (fs.existsSync(out)) {
    console.log(`[wake-model] уже есть: ${MODEL.out}`)
    return
  }
  let zip
  try {
    const res = await fetch(MODEL.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    zip = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    const msg = `[wake-model] не скачалась ${MODEL.url}: ${err.message}`
    if (soft) {
      console.warn(`${msg} — сборка идёт дальше, позывной Луны работать не будет`)
      return
    }
    throw new Error(msg)
  }
  // Несовпадение суммы роняет и --soft: это уже не «сеть легла», а чужой файл.
  const got = sha256(zip)
  if (got !== MODEL.sha256) throw new Error(`[wake-model] sha256 не совпал: ${got} ≠ ${MODEL.sha256}`)
  const tgz = zipToTarGz(zip)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  // Через временный файл: оборванная запись не должна выглядеть готовой моделью.
  fs.writeFileSync(`${out}.part`, tgz)
  fs.renameSync(`${out}.part`, out)
  console.log(`[wake-model] ${MODEL.out}: ${(tgz.length / 1e6).toFixed(1)} МБ`)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

module.exports = { MODEL, sha256, zipToTarGz }
```

В `scripts/lib/zip.js` заменить комментарий над `unzipSync`:

```js
// Читаем свои же архивы только в тестах — распаковщик умеет ровно то, что
// умеет писатель (store), и на чужих архивах с deflate вернёт пустоту.
```

на:

```js
// Читатель локальных заголовков: store и deflate, без data descriptor и zip64.
// Хватает своих архивов (тесты комиксов) и модели позывного Луны — её zip
// закреплён по sha256 (scripts/fetch-wake-model.js) и устроен ровно так.
```

- [ ] **Step 8: Тесты проходят**

Run: `npx vitest run scripts/lib/tar.test.js scripts/fetch-wake-model.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 9: Настоящий прогон и проверка архива**

```bash
node scripts/fetch-wake-model.js
tar -tzf public/assistant/wake/vosk-model-small-ru-0.22.tar.gz | head -5
node scripts/fetch-wake-model.js
```

Expected: первый прогон — `[wake-model] public/assistant/wake/vosk-model-small-ru-0.22.tar.gz: ~4x.x МБ`; `tar -tzf` печатает `vosk-model-small-ru-0.22/` и файлы внутри (`am/final.mdl`, `graph/Gr.fst`…); второй прогон — `уже есть`.

- [ ] **Step 10: Не в git, но в сборке**

В `.gitignore` в конец:

```gitignore
# Модель позывного Луны (45 МБ) — кладёт scripts/fetch-wake-model.js при сборке.
public/assistant/wake/
```

В `Dockerfile`, стадия builder, перед `RUN npm run build`:

```dockerfile
# Модель позывного Луны (45 МБ) в git не лежит — скачиваем и сверяем по sha256.
# --soft: недоступный сайт моделей не валит деплой, позывной просто не включится.
RUN node scripts/fetch-wake-model.js --soft
```

Run: `git status --short` — Expected: модели в списке нет.

- [ ] **Step 11: Commit**

```bash
git add scripts/lib/tar.js scripts/lib/tar.test.js scripts/lib/zip.js scripts/fetch-wake-model.js scripts/fetch-wake-model.test.js src/lib/assistant/wake/model.js .gitignore Dockerfile
git commit -m "feat(помощник): модель Vosk для позывного Луны — скачивается при сборке

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Сверка фразы

**Files:**
- Create: `src/lib/assistant/wake/matchWake.js`, `src/lib/assistant/wake/matchWake.test.js`

**Interfaces:**
- Produces: `WAKE_PHRASES: string[]`, `WAKE_GRAMMAR: string[]`, `matchWake(text: string|null) → boolean`.

- [ ] **Step 1: Падающий тест**

`src/lib/assistant/wake/matchWake.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { WAKE_GRAMMAR, matchWake } from './matchWake.js'

describe('позывной', () => {
  it('обе фразы — да, в любом регистре, с ё/ә и знаками', () => {
    expect(matchWake('привет луна')).toBe(true)
    expect(matchWake('Привет, Луна!')).toBe(true)
    expect(matchWake('салем луна')).toBe(true)
    expect(matchWake('Сәлем, Луна')).toBe(true)
  })

  it('с [unk] до или после — да: ученик сказал рядом что-то ещё', () => {
    expect(matchWake('[unk] привет луна')).toBe(true)
    expect(matchWake('привет луна [unk]')).toBe(true)
  })

  it('одно слово, разорванная фраза, склейка, пусто — нет', () => {
    expect(matchWake('луна')).toBe(false)
    expect(matchWake('привет')).toBe(false)
    expect(matchWake('привет [unk] луна')).toBe(false)
    expect(matchWake('приветлуна')).toBe(false)
    expect(matchWake('[unk]')).toBe(false)
    expect(matchWake('')).toBe(false)
    expect(matchWake(null)).toBe(false)
  })

  it('грамматика распознавателя — две фразы и [unk]', () => {
    expect(WAKE_GRAMMAR).toEqual(['привет луна', 'салем луна', '[unk]'])
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/lib/assistant/wake/matchWake.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`src/lib/assistant/wake/matchWake.js`:

```js
// Позывной Луны: «Привет, Луна» / «Сәлем, Луна» (решение 16.10.2026).
//
// Распознаватель ограничен грамматикой: он выбирает только между этими фразами и
// «чем-то другим» ([unk]), поэтому не «слышит» Луну в каждой реплике урока. Слова
// обязаны быть в словаре модели vosk-model-small-ru-0.22 — проверено по её Gr.fst
// 16.10.2026: «привет», «салем», «луна» есть, «сәлем» и «hey» — нет. Поэтому
// казахское «Сәлем» ловится русским «салем», а английского «Hey, Luna» нет вовсе.
// Фраза из двух слов, а не одно «Луна»: одно слово срабатывало бы ложно.
export const WAKE_PHRASES = ['привет луна', 'салем луна']
export const WAKE_GRAMMAR = [...WAKE_PHRASES, '[unk]']

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ә/g, 'а')
    .replace(/[^a-zа-я\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Финальный текст распознавателя — позывной? Фраза целиком, слова подряд. */
export function matchWake(text) {
  const t = ` ${norm(text)} `
  return WAKE_PHRASES.some((p) => t.includes(` ${p} `))
}
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/lib/assistant/wake/matchWake.test.js`
Expected: PASS, 4 теста.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/wake/matchWake.js src/lib/assistant/wake/matchWake.test.js
git commit -m "feat(помощник): фразы позывного и сверка распознанного текста

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Арбитр микрофона

**Files:**
- Create: `src/lib/assistant/wake/micArbiter.js`, `src/lib/assistant/wake/micArbiter.test.js`

**Interfaces:**
- Produces: `withOwnMic(fn: () => T) → T` (синхронная обёртка для вызова getUserMedia самого «уха»); `installMicArbiter({ onClaim?: () => void, win?: object }) → { isBusy(): boolean, subscribe(fn: (busy: boolean) => void): () => void, uninstall(): void }`. Арбитр — одиночка со счётчиком: снимается, когда снят последний.

- [ ] **Step 1: Падающий тест**

`src/lib/assistant/wake/micArbiter.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { installMicArbiter, withOwnMic } from './micArbiter.js'

function fakeTrack() {
  return {
    readyState: 'live',
    stop() {
      this.readyState = 'ended'
    },
  }
}

// Окно без DOM: getUserMedia и распознаватель речи — всё, на что смотрит арбитр.
function fakeWin() {
  const tracks = []
  const md = {
    getUserMedia: vi.fn(async () => {
      const t = fakeTrack()
      tracks.push(t)
      return { getAudioTracks: () => [t], getTracks: () => [t] }
    }),
  }
  class Rec extends EventTarget {
    start() {
      this.started = true
    }
  }
  return { navigator: { mediaDevices: md }, webkitSpeechRecognition: Rec, tracks, md, Rec }
}

let handles = []
const install = (opts) => {
  const h = installMicArbiter(opts)
  handles.push(h)
  return h
}
afterEach(() => {
  handles.forEach((h) => h.uninstall())
  handles = []
  vi.useRealTimers()
})

describe('арбитр микрофона', () => {
  it('чужой getUserMedia: сначала onClaim, занят с запроса и до конца дорожки', async () => {
    vi.useFakeTimers()
    const win = fakeWin()
    const order = []
    win.md.getUserMedia.mockImplementation(async () => {
      order.push('gum')
      const t = fakeTrack()
      win.tracks.push(t)
      return { getAudioTracks: () => [t] }
    })
    const arb = install({ win, onClaim: () => order.push('claim') })
    const seen = []
    arb.subscribe((b) => seen.push(b))
    const p = win.navigator.mediaDevices.getUserMedia({ audio: true })
    expect(arb.isBusy()).toBe(true)
    await p
    expect(order).toEqual(['claim', 'gum'])
    win.tracks[0].stop()
    await vi.advanceTimersByTimeAsync(1000)
    expect(arb.isBusy()).toBe(false)
    expect(seen).toEqual([true, false])
  })

  it('getUserMedia самого «уха» и запрос без звука — не чужие', async () => {
    const win = fakeWin()
    const claim = vi.fn()
    const arb = install({ win, onClaim: claim })
    await withOwnMic(() => win.navigator.mediaDevices.getUserMedia({ audio: true }))
    await win.navigator.mediaDevices.getUserMedia({ video: true })
    expect(claim).not.toHaveBeenCalled()
    expect(arb.isBusy()).toBe(false)
  })

  it('отказ в разрешении — не занят', async () => {
    const win = fakeWin()
    win.md.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
    const arb = install({ win })
    await expect(win.navigator.mediaDevices.getUserMedia({ audio: true })).rejects.toThrow('no')
    expect(arb.isBusy()).toBe(false)
  })

  it('распознавание речи: занят от start до end', () => {
    const win = fakeWin()
    const claim = vi.fn()
    const arb = install({ win, onClaim: claim })
    const rec = new win.webkitSpeechRecognition()
    rec.start()
    expect(claim).toHaveBeenCalledTimes(1)
    expect(rec.started).toBe(true)
    expect(arb.isBusy()).toBe(true)
    rec.dispatchEvent(new Event('end'))
    expect(arb.isBusy()).toBe(false)
  })

  it('снят последний — браузерные функции на месте', () => {
    const win = fakeWin()
    const gum = win.md.getUserMedia
    const start = win.Rec.prototype.start
    const a = installMicArbiter({ win })
    const b = installMicArbiter({ win })
    a.uninstall()
    expect(win.md.getUserMedia).not.toBe(gum)
    b.uninstall()
    expect(win.md.getUserMedia).toBe(gum)
    expect(win.Rec.prototype.start).toBe(start)
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/lib/assistant/wake/micArbiter.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`src/lib/assistant/wake/micArbiter.js`:

```js
// Кто ещё держит микрофон — чтобы «ухо» позывного Луны его отдавало.
//
// Микрофон берут ~20 мест: звонок тьютора, Ситуации, Караоке, Шэдоуинг, IELTS
// Speaking, Аркада, Глаголы, SpeakSpin, шаги курса, кнопка микрофона самой Луны…
// Вписывать «ухо» в каждое — забыть в двадцать первом, поэтому арбитр один и
// смотрит на сам браузер: оборачивает getUserMedia и start() у SpeechRecognition
// (Аркада, Глаголы и живая акустика IELTS слушают через него, а не через поток).
//
// Чужой запрос микрофона сначала синхронно зовёт onClaim — «ухо» гасит свой поток
// ДО того, как раздел получит свой: iPhone плохо делит микрофон между потоками, и
// раздел мог бы получить тишину. Занят — с самого запроса (пока браузер спрашивает
// разрешение, «ухо» не должно схватить микрофон обратно) и пока жива хоть одна
// чужая дорожка или идёт чужое распознавание. Живость дорожки — опросом
// readyState: после track.stop() браузер события ended не шлёт.
//
// Не видит код, который сохранил ссылку на getUserMedia ДО установки арбитра; в
// приложении таких мест нет — все зовут navigator.mediaDevices.getUserMedia в момент
// записи. Ставится, только пока ученик включил позывной: без него браузерные
// функции нетронуты.

const POLL_MS = 1000

let own = 0
let state = null

/** Вызов getUserMedia самого «уха» — его арбитр не считает чужим. fn — синхронный. */
export function withOwnMic(fn) {
  own += 1
  try {
    return fn()
  } finally {
    own -= 1
  }
}

function computeBusy(s) {
  for (const t of s.tracks) if (t.readyState === 'ended') s.tracks.delete(t)
  return s.tracks.size > 0 || s.recs.size > 0
}

function refresh() {
  if (!state) return
  const busy = computeBusy(state)
  if (busy === state.busy) return
  state.busy = busy
  for (const fn of state.listeners) fn(busy)
}

function claim() {
  for (const fn of state.claims) fn()
}

function wrapGetUserMedia(md, restore) {
  const orig = md.getUserMedia
  const hadOwn = Object.prototype.hasOwnProperty.call(md, 'getUserMedia')
  md.getUserMedia = function getUserMedia(constraints) {
    if (own > 0 || !state || !constraints?.audio) return orig.call(this, constraints)
    claim()
    const pending = { readyState: 'live' }
    state.tracks.add(pending)
    refresh()
    return orig.call(this, constraints).then(
      (stream) => {
        if (state) {
          state.tracks.delete(pending)
          for (const t of stream.getAudioTracks()) state.tracks.add(t)
          refresh()
        }
        return stream
      },
      (err) => {
        if (state) {
          state.tracks.delete(pending)
          refresh()
        }
        throw err
      },
    )
  }
  restore.push(() => {
    if (hadOwn) md.getUserMedia = orig
    else delete md.getUserMedia
  })
}

function wrapRecognition(proto, restore) {
  const orig = proto.start
  proto.start = function start(...args) {
    if (!state) return orig.apply(this, args)
    claim()
    const rec = this
    const done = () => {
      rec.removeEventListener?.('end', done)
      rec.removeEventListener?.('error', done)
      if (state) {
        state.recs.delete(rec)
        refresh()
      }
    }
    rec.addEventListener?.('end', done)
    rec.addEventListener?.('error', done)
    state.recs.add(rec)
    refresh()
    try {
      return orig.apply(this, args)
    } catch (err) {
      done()
      throw err
    }
  }
  restore.push(() => {
    proto.start = orig
  })
}

function install(win) {
  const restore = []
  const md = win.navigator?.mediaDevices
  if (md?.getUserMedia) wrapGetUserMedia(md, restore)
  const seen = new Set()
  for (const key of ['SpeechRecognition', 'webkitSpeechRecognition']) {
    const proto = win[key]?.prototype
    if (!proto?.start || seen.has(proto)) continue
    seen.add(proto)
    wrapRecognition(proto, restore)
  }
  return restore
}

/**
 * Поставить арбитра. Одиночка со счётчиком: снимается, когда снят последний.
 * @param {{ onClaim?: () => void, win?: object }} [opts]
 * @returns {{ isBusy: () => boolean, subscribe: (fn: (busy: boolean) => void) => () => void, uninstall: () => void }}
 */
export function installMicArbiter({ onClaim, win = globalThis.window } = {}) {
  if (!win) return { isBusy: () => false, subscribe: () => () => {}, uninstall: () => {} }
  if (!state) {
    state = { refs: 0, restore: [], tracks: new Set(), recs: new Set(), listeners: new Set(), claims: new Set(), busy: false, timer: null }
    state.restore = install(win)
    state.timer = setInterval(refresh, POLL_MS)
  }
  const mine = state
  mine.refs += 1
  if (onClaim) mine.claims.add(onClaim)
  const subs = new Set()
  let gone = false
  return {
    isBusy: () => (state === mine ? computeBusy(mine) : false),
    subscribe(fn) {
      mine.listeners.add(fn)
      subs.add(fn)
      return () => {
        mine.listeners.delete(fn)
        subs.delete(fn)
      }
    },
    uninstall() {
      if (gone) return
      gone = true
      if (onClaim) mine.claims.delete(onClaim)
      for (const fn of subs) mine.listeners.delete(fn)
      mine.refs -= 1
      if (mine.refs > 0 || state !== mine) return
      clearInterval(mine.timer)
      for (const undo of mine.restore) undo()
      state = null
    },
  }
}
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/lib/assistant/wake/micArbiter.test.js`
Expected: PASS, 5 тестов.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/wake/micArbiter.js src/lib/assistant/wake/micArbiter.test.js
git commit -m "feat(помощник): арбитр микрофона — позывной отдаёт микрофон любому разделу

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: «Ухо» на Vosk

**Files:**
- Create: `src/lib/assistant/wake/wakeEar.js`, `src/lib/assistant/wake/wakeEar.test.js`

**Interfaces:**
- Consumes: `withOwnMic` (Task 4), `WAKE_GRAMMAR`, `matchWake` (Task 3).
- Produces: `createWakeEar({ modelUrl, onWake, onState?, onResult?, loadModel?, getUserMedia?, createContext? }) → { start(): Promise<void>, prepare(): Promise<void>, stop(): void, resume(): void, dispose(): void, readonly state: 'idle'|'loading'|'asleep'|'listening'|'error' }`. `onState(state, error?)`, где `error ∈ 'model'|'denied'|'mic'`. `onResult(text)` — каждый финальный результат (для лаборатории).

- [ ] **Step 1: Падающий тест**

`src/lib/assistant/wake/wakeEar.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { createWakeEar } from './wakeEar.js'
import { installMicArbiter } from './micArbiter.js'

// Vosk, микрофон и AudioContext — подменные: проверяется порядок и состояния
// «уха», а не распознавание (его замеряет лаборатория, src/app/wake-lab).
function fakes() {
  const recs = []
  class Rec {
    constructor(rate, grammar) {
      this.rate = rate
      this.grammar = grammar
      this.handlers = {}
      this.removed = false
      this.fed = 0
      recs.push(this)
    }
    on(ev, fn) {
      this.handlers[ev] = fn
    }
    acceptWaveform() {
      this.fed += 1
    }
    remove() {
      this.removed = true
    }
    say(text) {
      this.handlers.result?.({ result: { text } })
    }
  }
  const model = { KaldiRecognizer: Rec, terminate: vi.fn() }
  const track = {
    readyState: 'live',
    stop: vi.fn(function stop() {
      this.readyState = 'ended'
    }),
  }
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
  const node = { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null }
  const ctx = {
    state: 'running',
    sampleRate: 48000,
    destination: {},
    onstatechange: null,
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
    createScriptProcessor: vi.fn(() => node),
    resume: vi.fn(async () => {
      ctx.state = 'running'
      ctx.onstatechange?.()
    }),
    suspend: vi.fn(async () => {
      ctx.state = 'suspended'
      ctx.onstatechange?.()
    }),
    close: vi.fn(async () => {}),
  }
  return {
    recs,
    model,
    track,
    node,
    ctx,
    loadModel: vi.fn(async () => model),
    getUserMedia: vi.fn(async () => stream),
    createContext: () => ctx,
  }
}

const ear = (f, extra = {}) => {
  const states = []
  const onWake = vi.fn()
  const e = createWakeEar({
    modelUrl: '/m.tar.gz',
    onWake,
    onState: (s, err) => states.push(err ? `${s}:${err}` : s),
    loadModel: f.loadModel,
    getUserMedia: f.getUserMedia,
    createContext: f.createContext,
    ...extra,
  })
  return { e, states, onWake }
}

describe('«ухо» позывного', () => {
  it('start: модель → микрофон → распознаватель с грамматикой и частотой контекста', async () => {
    const f = fakes()
    const { e, states } = ear(f)
    await e.start()
    expect(states).toEqual(['loading', 'listening'])
    expect(e.state).toBe('listening')
    expect(f.recs[0].rate).toBe(48000)
    expect(JSON.parse(f.recs[0].grammar)).toEqual(['привет луна', 'салем луна', '[unk]'])
    f.node.onaudioprocess({ inputBuffer: {} })
    expect(f.recs[0].fed).toBe(1)
  })

  it('позывной — onWake, остальное — нет', async () => {
    const f = fakes()
    const { e, onWake } = ear(f)
    await e.start()
    f.recs[0].say('[unk]')
    f.recs[0].say('привет луна')
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('stop отдаёт микрофон; повторный start не качает модель заново', async () => {
    const f = fakes()
    const { e, states } = ear(f)
    await e.start()
    e.stop()
    expect(f.track.stop).toHaveBeenCalled()
    expect(f.recs[0].removed).toBe(true)
    expect(e.state).toBe('idle')
    await e.start()
    expect(f.loadModel).toHaveBeenCalledTimes(1)
    expect(f.recs).toHaveLength(2)
    expect(states.at(-1)).toBe('listening')
  })

  it('повторный start, пока ждём микрофон, — не дубль', async () => {
    const f = fakes()
    const { e } = ear(f)
    await Promise.all([e.start(), e.start()])
    expect(f.getUserMedia).toHaveBeenCalledTimes(1)
    expect(f.recs).toHaveLength(1)
  })

  it('stop посреди загрузки модели — микрофон не берётся', async () => {
    const f = fakes()
    let release
    f.loadModel.mockImplementation(
      () =>
        new Promise((r) => {
          release = () => r(f.model)
        }),
    )
    const { e } = ear(f)
    const p = e.start()
    e.stop()
    release()
    await p
    expect(f.getUserMedia).not.toHaveBeenCalled()
    expect(e.state).toBe('idle')
  })

  it('prepare: модель и разрешение заранее, микрофон сразу отдан, не слушает', async () => {
    const f = fakes()
    const { e, states } = ear(f)
    await e.prepare()
    expect(states).toEqual(['loading', 'idle'])
    expect(f.track.stop).toHaveBeenCalled()
    expect(f.recs).toHaveLength(0)
    await e.start()
    expect(f.loadModel).toHaveBeenCalledTimes(1)
    expect(states.at(-1)).toBe('listening')
  })

  it('отказ в микрофоне — error:denied; модель не скачалась — error:model, повтор качает снова', async () => {
    const f = fakes()
    f.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    const a = ear(f)
    await a.e.start()
    expect(a.states.at(-1)).toBe('error:denied')

    const g = fakes()
    g.loadModel.mockRejectedValueOnce(new Error('404'))
    const b = ear(g)
    await b.e.start()
    expect(b.states.at(-1)).toBe('error:model')
    await b.e.start()
    expect(g.loadModel).toHaveBeenCalledTimes(2)
    expect(b.states.at(-1)).toBe('listening')
  })

  it('спящий контекст — asleep, resume будит', async () => {
    const f = fakes()
    f.ctx.state = 'suspended'
    f.ctx.resume.mockImplementationOnce(async () => {})
    const { e, states } = ear(f)
    await e.start()
    expect(states.at(-1)).toBe('asleep')
    e.resume()
    expect(states.at(-1)).toBe('listening')
  })

  it('микрофон «уха» арбитр чужим не считает', async () => {
    const f = fakes()
    const win = { navigator: { mediaDevices: { getUserMedia: f.getUserMedia } } }
    const claim = vi.fn()
    const arb = installMicArbiter({ win, onClaim: claim })
    const { e } = ear(f, { getUserMedia: (c) => win.navigator.mediaDevices.getUserMedia(c) })
    await e.start()
    expect(claim).not.toHaveBeenCalled()
    expect(arb.isBusy()).toBe(false)
    arb.uninstall()
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/lib/assistant/wake/wakeEar.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`src/lib/assistant/wake/wakeEar.js`:

```js
'use client'

// «Ухо» позывного Луны: Vosk (vosk-browser, WASM в Web Worker) слушает микрофон
// и ждёт «Привет, Луна» / «Сәлем, Луна». Звук никуда не уходит — распознаёт само
// устройство (решение 16.10.2026: слать звук на сервер — платить за каждую
// открытую вкладку и держать чужой микрофон в комнате ученика).
//
// vosk-browser грузится динамическим import() только у тех, кто включил позывной:
// 5.8 МБ с WASM внутри в общий бандл не идут. Модель он сам кэширует в IndexedDB по
// адресу — второй заход её не качает.
//
// Модель живёт до dispose(), микрофон — от start() до stop(): «ухо» отдаёт его,
// когда он нужен разделу (micArbiter.js). prepare() — то же, что start(), но без
// слушания: скачать модель и спросить разрешение заранее, в момент, когда ученик
// включает позывной, а не посреди урока.
//
// AudioContext без жеста браузер держит спящим (Chrome — до первого нажатия на
// странице, iPhone — до нажатия, разбудившего именно этот контекст): тогда
// состояние 'asleep', и будит его resume() — его зовут из обработчика нажатия.

import { withOwnMic } from './micArbiter.js'
import { WAKE_GRAMMAR, matchWake } from './matchWake.js'

// 4096 кадров ≈ 85 мс при 48 кГц: так кормит распознаватель пример vosk-browser.
const FRAME = 4096
const AUDIO = { audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }

async function loadVoskModel(url) {
  const mod = await import('vosk-browser')
  const createModel = mod.createModel || mod.default?.createModel
  // Воркер vosk-browser живёт по blob-адресу: относительный путь модели он разрешил
  // бы не от страницы — отдаём абсолютный.
  return createModel(new URL(url, window.location.href).href)
}

const micError = (err) => (err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'mic')

/**
 * @param {{ modelUrl: string, onWake: () => void,
 *   onState?: (state: 'idle'|'loading'|'asleep'|'listening'|'error', error?: 'model'|'denied'|'mic') => void,
 *   onResult?: (text: string) => void, loadModel?: (url: string) => Promise<any>,
 *   getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>, createContext?: () => AudioContext }} opts
 */
export function createWakeEar({
  modelUrl,
  onWake,
  onState = () => {},
  onResult = () => {},
  loadModel = loadVoskModel,
  getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c),
  createContext = () => new (window.AudioContext || window.webkitAudioContext)(),
}) {
  let state = 'idle'
  let model = null
  let modelPromise = null
  let ctx = null
  let run = null // { stream, source, node, rec }
  let starting = false
  // Поколение: stop() посреди загрузки или запроса микрофона отменяет начатый start.
  let gen = 0

  const set = (next, error) => {
    state = next
    onState(next, error)
  }
  const live = () => (ctx?.state === 'running' ? 'listening' : 'asleep')

  async function ensureModel() {
    if (model) return model
    modelPromise ??= loadModel(modelUrl).catch((err) => {
      modelPromise = null
      throw err
    })
    model = await modelPromise
    return model
  }

  function teardown() {
    if (!run) return
    const { stream, source, node, rec } = run
    run = null
    node.onaudioprocess = null
    try {
      source.disconnect()
      node.disconnect()
    } catch {
      /* уже отключены */
    }
    rec.remove()
    for (const t of stream.getTracks()) t.stop()
  }

  async function start() {
    if (run || starting) return
    starting = true
    const my = ++gen
    try {
      if (!model) {
        set('loading')
        try {
          await ensureModel()
        } catch {
          if (my === gen) set('error', 'model')
          return
        }
        if (my !== gen) return
      }
      let stream
      try {
        stream = await withOwnMic(() => getUserMedia(AUDIO))
      } catch (err) {
        if (my === gen) set('error', micError(err))
        return
      }
      if (my !== gen) {
        for (const t of stream.getTracks()) t.stop()
        return
      }
      ctx ??= createContext()
      ctx.onstatechange = () => {
        if (run) set(live())
      }
      const rec = new model.KaldiRecognizer(ctx.sampleRate, JSON.stringify(WAKE_GRAMMAR))
      rec.on('result', (msg) => {
        const text = msg?.result?.text || ''
        onResult(text)
        if (run?.rec === rec && matchWake(text)) onWake()
      })
      const source = ctx.createMediaStreamSource(stream)
      // ScriptProcessor, а не AudioWorklet: acceptWaveform vosk-browser берёт
      // AudioBuffer, и он есть в старом Safari.
      const node = ctx.createScriptProcessor(FRAME, 1, 1)
      node.onaudioprocess = (e) => {
        try {
          rec.acceptWaveform(e.inputBuffer)
        } catch {
          /* кадр потерян — следующий дойдёт */
        }
      }
      source.connect(node)
      // Без выхода в destination ScriptProcessor в Chrome не вызывается; пишет он тишину.
      node.connect(ctx.destination)
      run = { stream, source, node, rec }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      set(live())
    } finally {
      starting = false
    }
  }

  async function prepare() {
    if (run || starting) return
    starting = true
    const my = ++gen
    try {
      set('loading')
      try {
        await ensureModel()
      } catch {
        if (my === gen) set('error', 'model')
        return
      }
      if (my !== gen) return
      try {
        const probe = await withOwnMic(() => getUserMedia(AUDIO))
        for (const t of probe.getTracks()) t.stop()
      } catch (err) {
        if (my === gen) set('error', micError(err))
        return
      }
      if (my === gen) set('idle')
    } finally {
      starting = false
    }
  }

  function stop() {
    gen += 1
    teardown()
    // Спящий контекст не гонит аудиопоток между заходами; будит его следующий start.
    if (ctx?.state === 'running') ctx.suspend().catch(() => {})
    if (state !== 'idle' && state !== 'error') set('idle')
  }

  // Из обработчика нажатия: iPhone будит только контекст, разбуженный жестом.
  function resume() {
    try {
      ctx ??= createContext()
      ctx.resume()?.catch?.(() => {})
    } catch {
      /* нет AudioContext — start сообщит ошибку микрофона */
    }
  }

  function dispose() {
    stop()
    ctx?.close?.().catch(() => {})
    ctx = null
    model?.terminate?.()
    model = null
    modelPromise = null
  }

  return {
    start,
    prepare,
    stop,
    resume,
    dispose,
    get state() {
      return state
    },
  }
}
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/lib/assistant/wake`
Expected: PASS — `wakeEar` 9 тестов, плюс тесты Task 3–4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/wake/wakeEar.js src/lib/assistant/wake/wakeEar.test.js
git commit -m "feat(помощник): «ухо» позывного на Vosk — распознаёт на устройстве

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Лаборатория

**Files:**
- Create: `src/app/wake-lab/page.jsx`
- Create: `tests/wake-lab.spec.js`

**Interfaces:**
- Consumes: `createWakeEar` (Task 5), `WAKE_MODEL_URL` (Task 2).

- [ ] **Step 1: Страница**

`src/app/wake-lab/page.jsx`:

```jsx
'use client'

// Лаборатория позывного Луны (шаг 0 спеки 2026-10-16-luna-wake-word-design.md):
// только «ухо» и журнал — до встраивания в окно Луны замерить на настоящих
// телефонах попадания, ложные срабатывания и нагрузку. Отдельный адрес Next, а не
// экран App: ей не нужны ни вход, ни сайдбар. Открывается на локалке и дев-стенде;
// на проде страницы нет — ученикам она ни к чему.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { WAKE_MODEL_URL } from '../../lib/assistant/wake/model.js'
import { createWakeEar } from '../../lib/assistant/wake/wakeEar.js'

const LAB_HOSTS = /^(localhost|127\.0\.0\.1|.+\.localhost|dev-[\w-]+\.justtostudy\.kz)$/
const noop = () => () => {}
const isLabHost = () => LAB_HOSTS.test(window.location.hostname)
const clock = (ms) => new Date(ms).toLocaleTimeString('ru-RU')

export default function WakeLabPage() {
  const allowed = useSyncExternalStore(noop, isLabHost, () => null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [log, setLog] = useState([])
  const [wakes, setWakes] = useState(0)
  const [said, setSaid] = useState(0)
  const [loadMs, setLoadMs] = useState(null)
  const [storageMb, setStorageMb] = useState(null)
  const [since, setSince] = useState(null)
  const earRef = useRef(null)
  const loadStart = useRef(0)

  useEffect(() => () => earRef.current?.dispose(), [])

  const ear = () => {
    earRef.current ??= createWakeEar({
      modelUrl: WAKE_MODEL_URL,
      onWake: () => {
        setWakes((n) => n + 1)
        setLog((l) => [{ at: Date.now(), text: '★ ПОЗЫВНОЙ' }, ...l].slice(0, 300))
      },
      onResult: (text) => setLog((l) => [{ at: Date.now(), text: text || '(пусто)' }, ...l].slice(0, 300)),
      onState: (s, err) => {
        setState(s)
        setError(err || null)
        if (s === 'loading') loadStart.current = performance.now()
        else if (loadStart.current) {
          setLoadMs(Math.round(performance.now() - loadStart.current))
          loadStart.current = 0
        }
      },
    })
    return earRef.current
  }

  // В нажатии: resume будит AudioContext, иначе iPhone оставит его спящим.
  const onStart = () => {
    const e = ear()
    e.resume()
    setSince((s) => s ?? Date.now())
    e.start().then(() =>
      navigator.storage
        ?.estimate?.()
        .then((est) => setStorageMb(Math.round((est?.usage ?? 0) / 1e6)))
        .catch(() => {}),
    )
  }
  const onReset = () => {
    setLog([])
    setWakes(0)
    setSaid(0)
    setSince(Date.now())
  }

  if (allowed === null) return null
  if (!allowed) return <main style={{ padding: 24 }}>Нет такой страницы.</main>

  return (
    <main style={{ padding: 16, maxWidth: 640, margin: '0 auto', fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#171326', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22 }}>Позывной Луны — лаборатория</h1>
      <p>Фразы: «Привет, Луна», «Сәлем, Луна». Звук не покидает устройство.</p>
      <p data-testid="wake-state">
        Состояние: <b>{state}</b>
        {error ? ` (${error})` : ''}
        {loadMs != null ? ` · старт ${loadMs} мс` : ''}
      </p>
      <p>Хранилище сайта: {storageMb != null ? `${storageMb} МБ` : '—'}{since ? ` · с ${clock(since)}` : ''}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onStart}>Старт</button>
        <button type="button" onClick={() => earRef.current?.stop()}>Стоп</button>
        <button type="button" onClick={() => setSaid((n) => n + 1)}>+1 сказал позывной</button>
        <button type="button" onClick={onReset}>Сброс</button>
      </div>
      <p style={{ fontSize: 18 }}>
        Срабатываний: <b data-testid="wake-count">{wakes}</b> · сказано: <b>{said}</b>
        {said > 0 ? ` · попадания ${Math.round((Math.min(wakes, said) / said) * 100)}%` : ''}
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((r, i) => (
          <li key={`${r.at}-${i}`}>
            {clock(r.at)} — {r.text}
          </li>
        ))}
      </ol>
    </main>
  )
}
```

- [ ] **Step 2: Смоук с настоящим Vosk**

`tests/wake-lab.spec.js`:

```js
import fs from 'node:fs'
import { test, expect } from '@playwright/test'

// Лаборатория позывного с НАСТОЯЩИМ Vosk: модель грузится, воркер стартует, «ухо»
// слушает фальшивый микрофон Chrome. Слышит ли модель «Привет, Луна» — замеряют
// люди на телефонах (шаг 0 спеки); здесь — что цепочка вообще живая.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } })

const MODEL = 'public/assistant/wake/vosk-model-small-ru-0.22.tar.gz'

test('модель грузится, «ухо» слушает', async ({ page }) => {
  test.skip(!fs.existsSync(MODEL), 'нет модели: node scripts/fetch-wake-model.js')
  test.setTimeout(180_000)
  await page.goto('/wake-lab')
  await page.getByRole('button', { name: 'Старт' }).click()
  await expect(page.getByTestId('wake-state')).toContainText('listening', { timeout: 150_000 })
})
```

- [ ] **Step 3: Прогнать смоук**

Run: `E2E_PORT=3257 npx playwright test tests/wake-lab.spec.js --project=desktop --workers=1`
Expected: PASS, 1 тест (первый прогон дольше: модель распаковывается в IndexedDB). Если падает на `createModel is not a function` — посмотреть, что отдаёт `import('vosk-browser')` (`console.log(Object.keys(mod))` в `loadVoskModel`), и поправить выбор экспорта; если на загрузке воркера — прочитать консоль страницы (`page.on('console')`).

- [ ] **Step 4: Посмотреть глазами**

`preview_start` с `name: "web-luna-wake"`, открыть `http://localhost:3257/wake-lab`, нажать «Старт», сказать «Привет, Луна» в микрофон ноутбука. Expected: состояние `listening`, в журнале появляется `★ ПОЗЫВНОЙ`, счётчик растёт. Скриншот — в отчёт.

- [ ] **Step 5: Commit**

```bash
git add src/app/wake-lab/page.jsx tests/wake-lab.spec.js
git commit -m "feat(помощник): лаборатория позывного /wake-lab для замеров на устройствах

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Проверка и PR прототипа

- [ ] **Step 1: Сборка, линт, тесты**

```bash
npm run build
npm run lint
npx vitest run scripts/lib scripts/fetch-wake-model.test.js src/lib/assistant
```

Expected: сборка без ошибок (в выводе маршрутов есть `/wake-lab`); линт без новых ошибок в тронутых файлах; vitest зелёный. Если `npm run build` жалуется на `vosk-browser` (UMD-модуль) — проверить, что импорт только динамический в `wakeEar.js`.

- [ ] **Step 2: Push и PR**

```bash
git push -u origin feat/luna-wake
gh pr create --base develop --title "feat(помощник): позывной Луны — прототип и лаборатория" --body "$(cat <<'EOF'
Шаг 0 спеки `docs/superpowers/specs/2026-10-16-luna-wake-word-design.md`: всё, что нужно для замера позывного «Привет, Луна» на устройствах, без встраивания в окно Луны.

- `scripts/fetch-wake-model.js` — модель Vosk (45 МБ) не в git: качается при сборке, сверяется по sha256, перепаковывается zip → tar.gz (`--soft` в Dockerfile).
- `src/lib/assistant/wake/` — фразы и сверка, арбитр микрофона, «ухо» на vosk-browser.
- `/wake-lab` — страница замеров (только локалка и dev-стенд).

Проверено: vitest, `npm run build`, смоук `tests/wake-lab.spec.js` с настоящим Vosk.
Дальше: замеры на телефонах → решение «идём / не идём» → встраивание (часть 2 плана).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Проверить состояние PR**

PR в этом репозитории мержатся быстро, и коммит, запушенный после мержа, в него уже не войдёт. Run: `gh pr view --json state,mergedAt`. Если `MERGED` — дальнейшие правки идут новым PR.

---

### Task 8: Замер на устройствах и решение (ВОРОТА)

Это ручная задача. Делают люди — владелец и 2–3 человека; агент готовит стенд, сводит цифры и записывает итог.

- [ ] **Step 1: Модель и страница доехали до dev**

```bash
curl -sI https://dev-tutor.justtostudy.kz/assistant/wake/vosk-model-small-ru-0.22.tar.gz | head -5
curl -s -o /dev/null -w "%{http_code}\n" https://dev-tutor.justtostudy.kz/wake-lab
```

Expected: `HTTP/… 200` и `content-length` около 45 МБ; `/wake-lab` — 200. 404 на модели → в логе CI найти строку `[wake-model]` (сеть до alphacephei.com с раннера). 502 на стенде → см. память о переезде dev на новый сервер.

- [ ] **Step 2: Замеры**

На `https://dev-tutor.justtostudy.kz/wake-lab`, на каждом устройстве: средний Android (Chrome), iPhone (Safari), ноутбук (Chrome).

1. **Попадания.** «Старт», 20 раз «Привет, Луна» и 20 раз «Сәлем, Луна», после каждой фразы «+1 сказал». 2–3 человека, русское и казахское произношение, тихая комната и фоном. Цель ≥ 90 %.
2. **Ложные.** «Сброс», «Старт», 30 минут фоном аудио уроков и голос тьютора из колонок. Цель ≤ 1 срабатывания в час.
3. **Нагрузка.** На телефонах — нагрев и расход батареи за 30 минут; «старт … мс» первого и второго захода (второй — из IndexedDB); «Хранилище сайта» после загрузки.

- [ ] **Step 3: Записать итог в спеку**

В `docs/superpowers/specs/2026-10-16-luna-wake-word-design.md` перед разделом «## Тесты» добавить раздел с цифрами (пример формы — заполнить фактическими):

```markdown
## Результаты прототипа (дата)

| Устройство | Привет, Луна | Сәлем, Луна | Ложные / 30 мин | Старт: 1-й / 2-й | Хранилище | Нагрев, батарея |
|---|---|---|---|---|---|---|
| Android … | 19/20 | 17/20 | 0 | 21 с / 2 с | 95 МБ | тёплый, −4 % |

Решение: идём / не идём (кто решил, дата).
```

- [ ] **Step 4: Решение**

Цели выполнены → часть 2. Не выполнены → стоп: часть 2 не начинать, обсудить с владельцем Porcupine (платная лицензия, проверить ru/kk) или казахскую модель Vosk для «Сәлем».

Коммит итогов — отдельным маленьким PR в develop (`docs(помощник): замеры позывного Луны`).

---

# Часть 2 — встраивание (только после «идём»)

Продолжать в той же ветке, если PR прототипа ещё не смержен; если смержен — новая ветка `feat/luna-wake-widget` от свежего `origin/develop` в том же worktree:

```bash
git fetch origin develop
git switch -c feat/luna-wake-widget origin/develop
```

### Task 9: Пометка позывного на сервере

**Files:**
- Modify: `src/lib/assistant/opening.js`, `src/lib/assistant/opening.test.js`
- Modify: `src/lib/assistant/prompt.js`, `src/lib/assistant/prompt.test.js`
- Modify: `src/app/api/assistant/chat/route.js`, `src/app/api/assistant/chat/route.test.js`

**Interfaces:**
- Produces: `WAKE_MARK = '[ученик позвал голосом]'`, `isWakeTurn(content) → boolean` (экспорт из `opening.js` и `prompt.js`). `isOpeningTurn` теперь true и для `WAKE_MARK` — все защиты первой реплики (без паузы «не по теме», без отчёта о поломке) распространяются и на позывной.

- [ ] **Step 1: Падающие тесты**

В `src/lib/assistant/opening.test.js` — импорт расширить до `import { OPENING_MARK, WAKE_MARK, isOpeningTurn, isWakeTurn, openingFocus, screenStateKey } from './opening.js'` и добавить после первого `describe`:

```js
describe('пометка «ученик позвал голосом»', () => {
  it('служебный ход, как открытие окна, но различима', () => {
    expect(isOpeningTurn(WAKE_MARK)).toBe(true)
    expect(isWakeTurn(` ${WAKE_MARK}\n`)).toBe(true)
    expect(isWakeTurn(OPENING_MARK)).toBe(false)
    expect(isWakeTurn('Привет, Луна')).toBe(false)
  })
})
```

В `src/lib/assistant/prompt.test.js` — в импорт из `./prompt.js` добавить `WAKE_MARK`, в конец файла:

```js
describe('ученик позвал голосом', () => {
  const wake = (extra = {}) => parseChatRequest(ask(WAKE_MARK, { voice: true, ...extra }))
  const profile = 'Совет сайта, что сделать сейчас: Словарь — 14 слов ждут повторения (метка [[OPEN vocab]]).'

  it('пометка — с указанием поздороваться и спросить, без «вопроса ученика» и без «Совета сайта»', () => {
    const last = buildTurns({ ...wake(), user: null, studentContext: profile }).at(-1).content
    expect(last).not.toContain('Вопрос ученика:')
    expect(last).not.toContain('Совет сайта')
    expect(last).toContain(`</контекст>\n\n${WAKE_MARK}\nЯзык ответа: русский\nУченик сам позвал тебя голосом`)
    expect(last).toMatch(/Не больше 3 коротких предложений\.\n\n\[голосом\]$/)
  })

  it('на непроверенном задании — и тут без оценки ответа', () => {
    const screen = { id: 'kingdom-interior', text: 'He ___ (play) football. [поле: ученик ввёл «play»] [кнопка «Проверить»]' }
    const last = buildTurns({ ...wake({ screen }), user: null }).at(-1).content
    expect(last).toContain('Задание ещё не проверено: не оценивай введённый ответ и не называй правильный.')
  })

  it('в правилах — пометка и разрешение поздороваться', () => {
    expect(buildSystemPrompt()).toContain(`Пометка ${WAKE_MARK} — ученик сам позвал тебя голосом`)
  })
})
```

В `src/app/api/assistant/chat/route.test.js` — внутри `describe('POST /api/assistant/chat', …)`, после блока `describe('первая реплика при открытии окна', …)`:

```js
  describe('ученик позвал голосом', () => {
    const wake = (userId, extra = {}) => ({
      ...question(userId),
      screen: { id: 'home', text: 'Главная ВАШ УРОВЕНЬ A2' },
      messages: [{ role: 'user', content: '[ученик позвал голосом]' }],
      ...extra,
    })

    it('уходит в модель пометкой с указанием; кнопки раздела и заметки нет, даже если модель позвала', async () => {
      streamImpl = async function* () {
        yield { type: 'text', text: 'Здравствуйте, Толик! Вы на Главной. Чем помочь?\n[[OPEN homework]]' }
      }
      const text = await (await post(wake(701))).text()
      expect(text).toMatch(/^Здравствуйте, Толик! Вы на Главной\. Чем помочь\?\s*$/)
      expect(saveAdviceNote).not.toHaveBeenCalled()
      expect(calls[0].messages.at(-1).content).toContain('[ученик позвал голосом]\nЯзык ответа: русский')
    })

    it('отказ «не по теме» вместо приветствия — 502 без паузы ученику', async () => {
      streamImpl = async function* () {
        yield { type: 'text', text: '[[OFFTOPIC]]' }
      }
      const res = await post(wake(702))
      expect(res.status).toBe(502)
      expect(res.headers.get('x-assistant-offtopic')).toBeNull()
    })
  })
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/lib/assistant/opening.test.js src/lib/assistant/prompt.test.js src/app/api/assistant/chat/route.test.js`
Expected: FAIL — `WAKE_MARK` не экспортирован / `isWakeTurn is not a function`.

- [ ] **Step 3: opening.js**

Заменить строку

```js
/** Ход «ученик открыл окно», а не вопрос, набранный учеником. */
export const isOpeningTurn = (content) => String(content ?? '').trim() === OPENING_MARK
```

на:

```js
// Ученик позвал Луну голосом («Привет, Луна», lib/assistant/wake/). Тоже служебный
// ход, но ответ другой: позвали — значит нужна, и Луна здоровается и спрашивает, чем
// помочь, а не советует раздел (решение 16.10.2026).
export const WAKE_MARK = '[ученик позвал голосом]'

/** Служебный ход «ученик позвал голосом». */
export const isWakeTurn = (content) => String(content ?? '').trim() === WAKE_MARK

/**
 * Служебный ход — «ученик открыл окно» или «позвал голосом», а не вопрос, набранный
 * учеником. На оба действуют одни защиты: ни паузы «не по теме», ни отчёта о поломке.
 */
export const isOpeningTurn = (content) => {
  const text = String(content ?? '').trim()
  return text === OPENING_MARK || text === WAKE_MARK
}
```

- [ ] **Step 4: prompt.js**

Импорт и реэкспорт:

```js
import { OPENING_MARK, WAKE_MARK, isOpeningTurn, isWakeTurn, openingFocus } from './opening.js'
```

```js
export { OPENING_MARK, WAKE_MARK, isOpeningTurn, isWakeTurn, openingFocus }
```

В RULES после строки

```
- Если ты уже говорила об этом экране в разговоре, не повторяйся: скажи, что изменилось, или коротко спроси, чем помочь.
```

добавить строку:

```
- Пометка ${WAKE_MARK} — ученик сам позвал тебя голосом. Здесь приветствие уместно: поздоровайся, одной фразой скажи, что на экране, и спроси, чем помочь. Без совета раздела и без метки: ученик сейчас скажет, что ему нужно.
```

В `buildTurns` заменить блок от строки `const ask = opening` до строки `const context = focus.task ? withoutAdvice(studentContext) : studentContext` включительно на:

```js
  const answerLang = `Язык ответа: ${LANG_NAMES[lang] || LANG_NAMES.ru}`
  const unchecked = focus.unchecked ? ['Задание ещё не проверено: не оценивай введённый ответ и не называй правильный — только подсказка.'] : []
  // Позывной: ученик сам позвал — Луна здоровается и спрашивает, чем помочь (opening.js).
  // Указание — рядом с пометкой, по той же причине, что у открытия окна: правила первой
  // реплики из RULES Haiku 5.5 пропускала (замер 15.10.2026). Совета раздела нет:
  // ученик сейчас скажет, что ему нужно, — поэтому и «Совет сайта» из профиля убран.
  const wake = isWakeTurn(last.content)
  const ask = wake
    ? [
        WAKE_MARK,
        answerLang,
        'Ученик сам позвал тебя голосом («Привет, Луна»). Поздоровайся коротко — по имени, если оно есть, и на «вы»; одной фразой скажи, что видишь на экране; спроси, чем помочь. Раздел не советуй и метку не ставь.',
        ...(focus.unchecked ? ['Задание ещё не проверено: не оценивай введённый ответ и не называй правильный.'] : []),
        'Не больше 3 коротких предложений.',
      ].join('\n')
    : opening
      ? [
          OPENING_MARK,
          answerLang,
          ...(focus.task ? ['На экране задание: говори только о нём — без советов про другие разделы, без прошлых советов и без метки. Ошибку из разговоров со Speaking Buddy на то же правило назвать можно.'] : []),
          ...unchecked,
          'Не больше 4 коротких предложений.',
        ].join('\n')
      : `Вопрос ученика: ${last.content}`
  const context = focus.task || wake ? withoutAdvice(studentContext) : studentContext
```

(Строки для `OPENING_MARK` — те же, что были; меняется только обёртка. Существующие тесты `prompt.test.js` про первую реплику обязаны остаться зелёными — они сверяют этот текст дословно.)

- [ ] **Step 5: route.js**

Импорт из `@/lib/assistant/prompt.js` дополнить `isWakeTurn`. После строки `const opening = isOpeningTurn(…)`:

```js
  // Позывной (opening.js): Луна здоровается и спрашивает, чем помочь, — без кнопки
  // раздела и без заметки трекера, даже если модель всё же поставила метку.
  const wake = isWakeTurn(parsed.messages[parsed.messages.length - 1].content)
```

В `finalAction` первую строку заменить на:

```js
    if (focusTask || wake) return null
```

- [ ] **Step 6: Тесты проходят**

Run: `npx vitest run src/lib/assistant src/app/api/assistant`
Expected: PASS — новые тесты и все прежние (`prompt.test.js` про `OPENING_MARK` дословно).

- [ ] **Step 7: Commit**

```bash
git add src/lib/assistant/opening.js src/lib/assistant/opening.test.js src/lib/assistant/prompt.js src/lib/assistant/prompt.test.js src/app/api/assistant/chat/route.js src/app/api/assistant/chat/route.test.js
git commit -m "feat(помощник): пометка «ученик позвал голосом» — Луна здоровается и спрашивает, чем помочь

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Замер первой реплики на Haiku 5.5

Правка промпта — только с замером (память: «Правки промпта — только по замеру»). Зонд не коммитится (`.claude/` в `.gitignore`).

**Files:**
- Create: `.claude/probes/wake-opening.mjs` (в worktree)

- [ ] **Step 1: Зонд**

`.claude/probes/wake-opening.mjs`:

```js
// Зонд ответа на позывной: buildSystemPrompt/buildTurns → настоящая Haiku 5.5 через тот же
// chatStreamRich, что у роута (thinking выключен, effort low — как в проде).
// Запуск из корня worktree: node --env-file=.env.local .claude/probes/wake-opening.mjs
import { WAKE_MARK, buildSystemPrompt, buildTurns, parseChatRequest } from '../../src/lib/assistant/prompt.js'
import { chatStreamRich } from '../../src/lib/anthropic.js'

const SCREENS = {
  home: { id: 'home', text: 'Главная ВАШ УРОВЕНЬ A2 Домашняя работа: Unit 4, срок 2026-10-18 [кнопка «Продолжить»]' },
  task: { id: 'kingdom-interior', text: 'Урок 5. He ___ (play) football every day. [поле: ученик ввёл «play»] [кнопка «Проверить»]' },
  practice: { id: 'practice', text: 'Практика Говорение Чтение Аудирование [кнопка «Слова в картинках»] [кнопка «Аркада»]' },
}
const USER = { name: 'Айгерім', languageLevel: 'A2' }
const RUNS = 4
const rows = []

for (const lang of ['ru', 'kk']) {
  for (const [key, screen] of Object.entries(SCREENS)) {
    for (let i = 0; i < RUNS; i++) {
      const parsed = parseChatRequest({ messages: [{ role: 'user', content: WAKE_MARK }], screen, lang, voice: true })
      let text = ''
      for await (const ev of chatStreamRich({
        systemPrompt: buildSystemPrompt(),
        messages: buildTurns({ ...parsed, user: USER, studentContext: null, today: '2026-10-16' }),
        model: 'claude-haiku-5-5',
        maxOutputTokens: 800,
        task: 'probe_wake',
      })) {
        if (ev.type === 'text') text += ev.text
      }
      const sentences = text.split(/[.!?]+(\s|$)/).filter((s) => s && s.trim()).length
      const checks = {
        greets: /здравствуйте|добрый|привет|сәлем|сәлеметсіз|қайырлы/i.test(text),
        asks: /\?\s*$/.test(text.trim()),
        noLabel: !/\[\[/.test(text),
        short: sentences <= 3,
        noAnswer: key !== 'task' || !/\bplays\b/i.test(text),
      }
      const ok = Object.values(checks).every(Boolean)
      rows.push({ lang, key, ok })
      console.log(`${lang} ${key} #${i + 1} ${ok ? 'OK ' : 'BAD'} ${JSON.stringify(checks)}\n  ${text.replace(/\n/g, ' ')}`)
    }
  }
}
const ok = rows.filter((r) => r.ok).length
console.log(`\nИтого: ${ok}/${rows.length} (цель ≥ 22/24). Казахские ответы — проверить глазами.`)
```

- [ ] **Step 2: Прогон**

Run: `node --env-file=.env.local .claude/probes/wake-opening.mjs`
Expected: `Итого: ≥22/24`. Казахские ответы прочитать глазами (автопроверку языка обманывает «і» в имени). Если ниже цели — править ТОЛЬКО строку указания рядом с пометкой в `buildTurns` (Task 9, Step 4), прогонять снова, обновить ожидание в `prompt.test.js`, если поменялся текст.

- [ ] **Step 3: Записать итог**

Цифры (`N/24`, типичная реплика ru и kk) — в описание PR части 2 и в абзац CLAUDE.md (Task 14).

---

### Task 11: Настройка устройства и хук `useWakeWord`

**Files:**
- Create: `src/lib/assistant/wake/wakeSetting.js`
- Create: `src/lib/assistant/wake/useWakeWord.js`, `src/lib/assistant/wake/useWakeWord.test.jsx`

**Interfaces:**
- Consumes: `createWakeEar` (Task 5), `installMicArbiter` (Task 4), `WAKE_MODEL_URL` (Task 2), `isTtsActive`, `unlockSpeech` из `src/lib/speech.js`.
- Produces: `WAKE_KEY`, `readWakeOn() → boolean`, `writeWakeOn(on: boolean)`, `useWakeOn() → boolean`; `WAKE_COOLDOWN_MS = 5000`; `useWakeWord({ token, enabled, open, onWake }) → { supported: boolean, on: boolean, state: 'off'|'loading'|'listening'|'paused', error: null|'model'|'denied'|'mic', enable(): void, disable(): void }`. Тестовый крючок (не прод): `window.__jtsFakeWakeEar = true` до загрузки → «ухо»-заглушка, `window.__jtsWake()` — позывной.

- [ ] **Step 1: Падающий тест**

`src/lib/assistant/wake/useWakeWord.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// «Ухо» подменено: здесь проверяется, КОГДА хук слушает и отдаёт микрофон.
const ears = []
vi.mock('./wakeEar.js', () => ({
  createWakeEar: (opts) => {
    const ear = {
      opts,
      state: 'idle',
      start: vi.fn(async () => {
        ear.state = 'listening'
        opts.onState('listening')
      }),
      stop: vi.fn(() => {
        if (ear.state === 'error' || ear.state === 'idle') return
        ear.state = 'idle'
        opts.onState('idle')
      }),
      prepare: vi.fn(async () => {
        ear.state = 'idle'
        opts.onState('idle')
      }),
      resume: vi.fn(),
      dispose: vi.fn(),
      fail(err) {
        ear.state = 'error'
        opts.onState('error', err)
      },
    }
    ears.push(ear)
    return ear
  },
}))
vi.mock('../../speech.js', () => ({ isTtsActive: vi.fn(() => false), unlockSpeech: vi.fn() }))

const { useWakeWord, WAKE_COOLDOWN_MS } = await import('./useWakeWord.js')
const { readWakeOn, writeWakeOn } = await import('./wakeSetting.js')
const { isTtsActive } = await import('../../speech.js')

beforeEach(() => {
  vi.useFakeTimers()
  ears.length = 0
  globalThis.AudioContext = class {}
  // Дорожка — одна на вызов: арбитр запоминает её, а тест потом её же «гасит».
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        const track = { readyState: 'live' }
        return { getAudioTracks: () => [track] }
      }),
    },
  })
  writeWakeOn(true)
  isTtsActive.mockReturnValue(false)
})
afterEach(() => {
  writeWakeOn(false)
  vi.useRealTimers()
})

const props = (extra = {}) => ({ token: 't', enabled: true, open: false, onWake: vi.fn(), ...extra })
const mount = (extra) => renderHook((p) => useWakeWord(p), { initialProps: props(extra) })
const wait = (ms = 500) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

describe('useWakeWord', () => {
  it('окно закрыто — слушает; открыли — отдаёт микрофон', async () => {
    const { result, rerender } = mount()
    await wait()
    expect(ears[0].start).toHaveBeenCalled()
    expect(result.current.state).toBe('listening')
    rerender(props({ open: true }))
    await wait()
    expect(ears[0].stop).toHaveBeenCalled()
    expect(result.current.state).toBe('paused')
  })

  it('раздел взял микрофон — «ухо» отдаёт его сразу и ждёт, пока раздел закончит', async () => {
    const { result } = mount()
    await wait()
    let stream
    await act(async () => {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    })
    expect(ears[0].stop).toHaveBeenCalled()
    await wait()
    expect(result.current.state).toBe('paused')
    stream.getAudioTracks()[0].readyState = 'ended'
    await wait(1500)
    expect(result.current.state).toBe('listening')
  })

  it('звучит речь (Луна, «послушать») — не слушает', async () => {
    isTtsActive.mockReturnValue(true)
    const { result } = mount()
    await wait()
    expect(ears[0].start).not.toHaveBeenCalled()
    expect(result.current.state).toBe('paused')
  })

  it('позывной: onWake, «ухо» молчит 5 с, потом снова слушает', async () => {
    const onWake = vi.fn()
    mount({ onWake })
    await wait()
    act(() => ears[0].opts.onWake())
    expect(onWake).toHaveBeenCalledTimes(1)
    expect(ears[0].stop).toHaveBeenCalled()
    ears[0].start.mockClear()
    await wait(WAKE_COOLDOWN_MS - 600)
    expect(ears[0].start).not.toHaveBeenCalled()
    await wait(1000)
    expect(ears[0].start).toHaveBeenCalled()
  })

  it('отказ в микрофоне — позывной выключается, причина остаётся', async () => {
    const { result } = mount()
    await wait()
    act(() => ears[0].fail('denied'))
    expect(readWakeOn()).toBe(false)
    expect(result.current.state).toBe('off')
    expect(result.current.error).toBe('denied')
  })

  it('enable — в жесте: будит контекст и готовит модель с разрешением', () => {
    writeWakeOn(false)
    const { result } = mount({ open: true })
    act(() => result.current.enable())
    expect(readWakeOn()).toBe(true)
    expect(ears[0].resume).toHaveBeenCalled()
    expect(ears[0].prepare).toHaveBeenCalled()
  })

  it('без входа или на экране без Луны — выключен и ничего не создаёт', async () => {
    const { result } = mount({ token: null })
    await wait()
    expect(ears).toHaveLength(0)
    expect(result.current.state).toBe('off')
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/lib/assistant/wake/useWakeWord.test.jsx`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Настройка устройства**

`src/lib/assistant/wake/wakeSetting.js`:

```js
// Включён ли позывной Луны — настройка УСТРОЙСТВА, а не профиля: модель (45 МБ в
// IndexedDB) и разрешение на микрофон — тоже вещи устройства. useSyncExternalStore:
// на сервере и при гидратации позывной выключен, расхождения разметки нет.
import { useSyncExternalStore } from 'react'

export const WAKE_KEY = 'jts_luna_wake'
const listeners = new Set()
// Приватный режим не даёт писать в localStorage — выбор живёт в памяти до перезагрузки.
let override = null

export function readWakeOn() {
  if (override !== null) return override
  try {
    return localStorage.getItem(WAKE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeWakeOn(on) {
  override = Boolean(on)
  try {
    if (on) localStorage.setItem(WAKE_KEY, '1')
    else localStorage.removeItem(WAKE_KEY)
  } catch {
    /* приватный режим — см. override */
  }
  for (const fn of listeners) fn()
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Включён ли позывной на этом устройстве. */
export const useWakeOn = () => useSyncExternalStore(subscribe, readWakeOn, () => false)
```

- [ ] **Step 4: Хук**

`src/lib/assistant/wake/useWakeWord.js`:

```js
'use client'

// Позывной Луны в окне помощника: когда «ухо» слушать, когда отдавать микрофон
// (спека docs/superpowers/specs/2026-10-16-luna-wake-word-design.md).
//
// Слушает, только если разом: ученик включил позывной на этом устройстве, вошёл,
// Луна есть на этом экране (enabled), её окно закрыто (в открытом есть кнопка
// микрофона), микрофон не занят разделом (micArbiter.js), ничего не звучит
// (isTtsActive — иначе Луна будила бы сама себя), вкладка видна, и прошло 5 с с
// прошлого вызова или закрытия окна: ложное срабатывание → ученик закрыл окно →
// оно не должно тут же открыться снова. Условия проверяются каждые полсекунды:
// половина из них — не состояние React (арбитр, звук, видимость, часы).
//
// Любая ошибка «уха» (нет разрешения, модель не скачалась) выключает позывной:
// повтор — включить снова, в жесте, где и разрешение спросят, и контекст разбудят,
// а не тихий цикл попыток каждые полсекунды.
//
// AudioContext «уха» и звук Луны браузер будит только жестом. После перезагрузки
// жеста нет, поэтому каждое касание страницы будит и то, и другое (unlockSpeech,
// resume — дешёвые, если уже не спят); до первого касания «ухо» спит (paused).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { isTtsActive, unlockSpeech } from '../../speech.js'
import { installMicArbiter } from './micArbiter.js'
import { WAKE_MODEL_URL } from './model.js'
import { createWakeEar } from './wakeEar.js'
import { useWakeOn, writeWakeOn } from './wakeSetting.js'

export const WAKE_COOLDOWN_MS = 5000
const TICK_MS = 500

const noop = () => () => {}
function isSupported() {
  return (
    typeof WebAssembly === 'object' &&
    Boolean(globalThis.AudioContext || globalThis.webkitAudioContext) &&
    Boolean(globalThis.navigator?.mediaDevices?.getUserMedia)
  )
}
const useSupported = () => useSyncExternalStore(noop, isSupported, () => false)

// e2e: настоящий Vosk в headless не гоняем (45 МБ модели и WASM на процессоре; его
// проверяет tests/wake-lab.spec.js). Тест ставит window.__jtsFakeWakeEar до загрузки —
// «ухо» становится заглушкой, а window.__jtsWake() изображает позывной. В прод-сборке
// этой ветки нет.
function createFakeEar({ onWake, onState }) {
  const ear = {
    state: 'idle',
    async start() {
      set('listening')
    },
    async prepare() {
      set('idle')
    },
    stop() {
      if (ear.state !== 'idle') set('idle')
    },
    resume() {},
    dispose() {
      delete window.__jtsWake
    },
  }
  function set(s) {
    ear.state = s
    onState(s)
  }
  window.__jtsWake = () => {
    if (ear.state === 'listening') onWake()
  }
  return ear
}

function earFactory() {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.__jtsFakeWakeEar) return createFakeEar
  return createWakeEar
}

/**
 * @returns {{ supported: boolean, on: boolean, state: 'off'|'loading'|'listening'|'paused',
 *   error: null|'model'|'denied'|'mic', enable: () => void, disable: () => void }}
 */
export function useWakeWord({ token, enabled, open, onWake }) {
  const supported = useSupported()
  const on = useWakeOn()
  const [ear, setEar] = useState({ state: 'idle', error: null })
  const [blocked, setBlocked] = useState(false)
  const earRef = useRef(null)
  const arbiterRef = useRef(null)
  const cooldownRef = useRef(0)
  const onWakeRef = useRef(onWake)
  useLayoutEffect(() => {
    onWakeRef.current = onWake
  })

  const getEar = useCallback(() => {
    earRef.current ??= earFactory()({
      modelUrl: WAKE_MODEL_URL,
      onWake: () => {
        cooldownRef.current = Date.now() + WAKE_COOLDOWN_MS
        earRef.current?.stop()
        onWakeRef.current?.()
      },
      onState: (state, error) => {
        setEar({ state, error: error || null })
        if (state === 'error') writeWakeOn(false)
      },
    })
    return earRef.current
  }, [])

  const live = Boolean(supported && on && token && enabled)

  useEffect(
    () => () => {
      earRef.current?.dispose()
      earRef.current = null
    },
    [],
  )

  // Окно закрыли — 5 с позывной глух (см. шапку).
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) cooldownRef.current = Date.now() + WAKE_COOLDOWN_MS
    wasOpen.current = open
  }, [open])

  // Арбитр — на всё время, пока позывной возможен: переставлять его на каждое
  // открытие окна нельзя, он потерял бы чужие дорожки, которые уже держит.
  useEffect(() => {
    if (!live) return undefined
    const arbiter = installMicArbiter({ onClaim: () => earRef.current?.stop() })
    arbiterRef.current = arbiter
    const onGesture = () => {
      unlockSpeech()
      earRef.current?.resume()
    }
    window.addEventListener('pointerdown', onGesture, true)
    return () => {
      window.removeEventListener('pointerdown', onGesture, true)
      arbiter.uninstall()
      arbiterRef.current = null
      earRef.current?.stop()
    }
  }, [live])

  useEffect(() => {
    if (!live) return undefined
    const tick = () => {
      const busy = Boolean(arbiterRef.current?.isBusy()) || isTtsActive()
      setBlocked(busy)
      const e = getEar()
      const want = !open && !busy && document.visibilityState === 'visible' && Date.now() >= cooldownRef.current
      if (want) {
        if (e.state === 'idle') e.start()
      } else if (e.state === 'listening' || e.state === 'asleep') {
        e.stop()
      }
    }
    tick()
    const id = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [live, open, getEar])

  // В жесте (клик по переключателю): будим звук и контекст, качаем модель и спрашиваем
  // разрешение сейчас — рядом с переключателем, а не посреди урока.
  const enable = useCallback(() => {
    unlockSpeech()
    writeWakeOn(true)
    const e = getEar()
    e.resume()
    e.prepare()
  }, [getEar])

  const disable = useCallback(() => {
    writeWakeOn(false)
    earRef.current?.stop()
  }, [])

  let state = 'off'
  if (live) {
    if (ear.state === 'loading') state = 'loading'
    else if (ear.state === 'listening' && !blocked && !open) state = 'listening'
    else state = 'paused'
  }
  return { supported, on, state, error: ear.error, enable, disable }
}
```

- [ ] **Step 5: Тест проходит**

Run: `npx vitest run src/lib/assistant/wake`
Expected: PASS — `useWakeWord` 7 тестов и всё из Task 3–5.

- [ ] **Step 6: Commit**

```bash
git add src/lib/assistant/wake/wakeSetting.js src/lib/assistant/wake/useWakeWord.js src/lib/assistant/wake/useWakeWord.test.jsx
git commit -m "feat(помощник): useWakeWord — когда «ухо» слушает и когда отдаёт микрофон

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Окно Луны — переключатель, значок, приветствие и ответ

**Files:**
- Modify: `src/components/AssistantWidget.jsx`
- Modify: `src/i18n.jsx` (три блока: ru, en, kk)
- Modify: `src/assistant.css`

**Interfaces:**
- Consumes: `useWakeWord` (Task 11), `WAKE_MARK` (Task 9).
- Produces: в разметке — чекбокс с подписью «Звать Луну голосом» в окне; `.asst__launcher [data-wake="loading|listening|paused"]` на кнопке Луны (для e2e).

- [ ] **Step 1: Импорты и шапка**

В `AssistantWidget.jsx`:

```js
import { OPENING_MARK, WAKE_MARK, screenStateKey } from '../lib/assistant/opening.js'
```

и после строки `import { createVoiceQueue } from '../lib/assistant/voiceQueue.js'`:

```js
import { useWakeWord } from '../lib/assistant/wake/useWakeWord.js'
```

В шапку, после абзаца, который кончается строкой `// Сейчас скажу…» (StatusBubble), а переход и тур — когда она договорила.`, добавить:

```js
//
// Позывной (16.10.2026): ученик говорит «Привет, Луна» / «Сәлем, Луна» — окно
// открывается, Луна здоровается, говорит, что видит, спрашивает, чем помочь, и,
// договорив, сама слушает ОДИН ответ, как по кнопке микрофона. Дальше — кнопкой:
// разговор без кнопок владелец отменил 15.10. Распознаёт позывной само устройство
// (lib/assistant/wake/), включает его ученик переключателем в окне.
```

- [ ] **Step 2: Ошибки позывного и состояние окна в stateRef**

После блока `const VOICE_ERRORS = {…}`:

```js
const WAKE_ERRORS = {
  denied: 'assistant.wake.denied',
  model: 'assistant.wake.modelFailed',
  mic: 'assistant.wake.micFailed',
}
```

Строку

```js
    stateRef.current = { messages, screen, token, lang, enabled, muted, t, greetOnOpen }
```

заменить на:

```js
    stateRef.current = { messages, screen, token, lang, enabled, muted, t, greetOnOpen, open }
```

- [ ] **Step 3: `send` умеет «после ответа»**

Сигнатуру

```js
  const send = useCallback(async (raw, { voice = false, opening = false } = {}) => {
```

заменить на:

```js
  // afterReply — когда ответ кончился: договорён голосом или, без голоса, дописан.
  // На позывной по нему Луна сама начинает слушать ответ ученика.
  const send = useCallback(async (raw, { voice = false, opening = false, afterReply = null } = {}) => {
```

В `onFinish` очереди озвучки строки

```js
          // «Открываю…» договорено — теперь сам переход (или тур).
          runDeferred(speaker)
          if (played) return
```

заменить на:

```js
          // «Открываю…» договорено — теперь сам переход (или тур).
          runDeferred(speaker)
          afterReply?.()
          if (played) return
```

И перед `} catch (err) {` этого `try` (сразу после блока `if (reply.reported) {…}`):

```js
      // Без голоса ответ кончился, когда дописан.
      if (!speaker) afterReply?.()
```

- [ ] **Step 4: Позывной в компоненте**

Сразу после блока

```js
  const cancelRecordingRef = useRef(cancelRecording)
  useLayoutEffect(() => {
    cancelRecordingRef.current = cancelRecording
  })
```

добавить:

```js
  // Позывной (см. шапку). Луна отвечает всегда — позвали, значит нужна, правило «один
  // раз на экран» не для неё; но экран запоминается, чтобы открытие кнопкой следом
  // не повторило первую реплику.
  const voiceQRef = useRef(voiceQ)
  useLayoutEffect(() => {
    voiceQRef.current = voiceQ
  })
  const listenAnswer = useCallback(() => {
    const q = voiceQRef.current
    const cur = stateRef.current
    // Окно закрыли, пока она говорила, или ученик уже сам жмёт микрофон — не слушаем.
    if (!mountedRef.current || !cur?.enabled || !cur.open || !q || q.state !== 'idle') return
    q.clearError()
    q.toggle()
  }, [])
  const onWake = useCallback(() => {
    const cur = stateRef.current
    if (!mountedRef.current || !cur?.enabled || !cur.token) return
    setOpen(true)
    stateRef.current = { ...cur, open: true }
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    greetedRef.current = screenStateKey(cur.screen, snapshotScreen(root))
    send(WAKE_MARK, { voice: !cur.muted, opening: true, afterReply: listenAnswer })
  }, [send, listenAnswer])
  const wake = useWakeWord({ token, enabled, open, onWake })
```

- [ ] **Step 5: Переключатель в окне**

Перед строкой `<p className="asst__privacy">{t('assistant.privacy')}</p>`:

```jsx
          {wake.supported && Boolean(token) && (
            <div className="asst__wake">
              <label className="asst__wake-row">
                <input
                  type="checkbox"
                  checked={wake.on}
                  onChange={(e) => (e.target.checked ? wake.enable() : wake.disable())}
                />
                <span>{t('assistant.wake.toggle')}</span>
              </label>
              {(wake.on || wake.error) && (
                <p className="asst__wake-hint" role={wake.error ? 'alert' : undefined}>
                  {wake.error
                    ? t(WAKE_ERRORS[wake.error])
                    : wake.state === 'loading'
                      ? t('assistant.wake.loading')
                      : t('assistant.wake.hint')}
                </p>
              )}
            </div>
          )}
```

- [ ] **Step 6: Значок на кнопке Луны**

В кнопке `asst__launcher` заменить содержимое

```jsx
        {open ? <span className="asst__launcher-x">×</span> : <img src={AVATAR} alt="" width="40" height="40" />}
```

на:

```jsx
        {open ? <span className="asst__launcher-x">×</span> : <img src={AVATAR} alt="" width="40" height="40" />}
        {!open && wake.state !== 'off' && (
          <span
            className={`asst__wake-dot is-${wake.state}`}
            data-wake={wake.state}
            title={t(`assistant.wake.badge.${wake.state}`)}
            aria-hidden="true"
          />
        )}
```

- [ ] **Step 7: Строки**

В `src/i18n.jsx`, блок `ru`, после строки `    'assistant.sound.mute': 'Выключить озвучку ответов',`:

```js
    'assistant.wake.toggle': 'Звать Луну голосом',
    'assistant.wake.hint': 'Скажите «Привет, Луна» или «Сәлем, Луна» — окно откроется само. Слушает только это устройство, звук никуда не уходит.',
    'assistant.wake.loading': 'Загружаю распознавание (45 МБ, один раз)…',
    'assistant.wake.denied': 'Нет доступа к микрофону — разрешите его в настройках браузера и включите снова.',
    'assistant.wake.modelFailed': 'Не удалось загрузить распознавание. Включите ещё раз.',
    'assistant.wake.micFailed': 'Микрофон не включился. Проверьте, что он подключён, и включите ещё раз.',
    'assistant.wake.badge.listening': 'Луна слушает «Привет, Луна»',
    'assistant.wake.badge.paused': 'Луна сейчас не слушает: микрофон занят или нужно коснуться страницы',
    'assistant.wake.badge.loading': 'Загружаю распознавание…',
```

Блок `en`, после `    'assistant.sound.mute': 'Turn off spoken answers',`:

```js
    'assistant.wake.toggle': 'Call Luna by voice',
    'assistant.wake.hint': 'Say “Привет, Луна” or “Сәлем, Луна” and the window opens. Only this device listens; no audio leaves it.',
    'assistant.wake.loading': 'Loading speech recognition (45 MB, once)…',
    'assistant.wake.denied': 'No microphone access — allow it in the browser settings and turn this on again.',
    'assistant.wake.modelFailed': 'Could not load speech recognition. Turn this on again.',
    'assistant.wake.micFailed': 'The microphone did not start. Check that it is connected and turn this on again.',
    'assistant.wake.badge.listening': 'Luna is listening for “Привет, Луна”',
    'assistant.wake.badge.paused': 'Luna is not listening right now: the microphone is busy or the page needs a tap',
    'assistant.wake.badge.loading': 'Loading speech recognition…',
```

Блок `kk`, после `    'assistant.sound.mute': 'Жауаптарды дыбыстауды өшіру',`:

```js
    'assistant.wake.toggle': 'Лунаны дауыспен шақыру',
    'assistant.wake.hint': '«Сәлем, Луна» немесе «Привет, Луна» деңіз — терезе өзі ашылады. Тек осы құрылғы тыңдайды, дыбыс ешқайда жіберілмейді.',
    'assistant.wake.loading': 'Тану жүктелуде (45 МБ, бір рет)…',
    'assistant.wake.denied': 'Микрофонға рұқсат жоқ — браузер баптауларында рұқсат беріп, қайта қосыңыз.',
    'assistant.wake.modelFailed': 'Тану жүктелмеді. Қайта қосыңыз.',
    'assistant.wake.micFailed': 'Микрофон қосылмады. Қосулы екенін тексеріп, қайта қосыңыз.',
    'assistant.wake.badge.listening': 'Луна «Сәлем, Луна» дегенді тыңдап тұр',
    'assistant.wake.badge.paused': 'Луна қазір тыңдамай тұр: микрофон бос емес немесе бетті басу керек',
    'assistant.wake.badge.loading': 'Тану жүктелуде…',
```

Казахские строки — показать носителю языка до мержа (в описании PR — пункт «kk на вычитку»).

- [ ] **Step 8: Стили**

В `src/assistant.css` после строки `.asst__privacy { … }`:

```css
/* Позывной «Привет, Луна»: переключатель в окне и точка на кнопке Луны —
   слушает (зелёная), не слушает (серая: микрофон занят, окно открыто, ждёт касания),
   грузит модель (пульс). Точка внутри круга: у кнопки overflow: hidden, и на углу
   квадрата её бы срезало — 9px от края держат её в круге и на 60px, и на 52px. */
.asst__wake { padding: 0 14px 8px; }
.asst__wake-row { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.asst__wake-row input { width: 16px; height: 16px; margin: 0; accent-color: var(--asst-accent); }
.asst__wake-hint { margin: 4px 0 0 24px; font-size: 12px; line-height: 1.35; color: var(--asst-muted); }
.asst__wake-dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #9aa0ab;
}
.asst__wake-dot.is-listening { background: #2fbf71; }
.asst__wake-dot.is-loading { background: #f5a524; animation: asst-wake-pulse 1.2s ease-in-out infinite; }
@keyframes asst-wake-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) {
  .asst__wake-dot.is-loading { animation: none; }
}
```

- [ ] **Step 9: Прежние тесты виджета и i18n не сломаны**

Run: `npx vitest run src/components src/lib/assistant src/i18n`
Expected: PASS. Если тест i18n сверяет наборы ключей между языками — ключи добавлены во все три блока одинаково.

- [ ] **Step 10: Commit**

```bash
git add src/components/AssistantWidget.jsx src/i18n.jsx src/assistant.css
git commit -m "feat(помощник): позывной в окне Луны — переключатель, значок, приветствие и ответ голосом

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: E2E окна

**Files:**
- Create: `tests/assistant-wake.spec.js`

- [ ] **Step 1: Тест**

`tests/assistant-wake.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Позывной Луны в окне помощника: «Привет, Луна» → окно → приветствие → запись ОДНОГО
// ответа. «Ухо» подменено (window.__jtsFakeWakeEar, useWakeWord.js): настоящий Vosk
// проверяет tests/wake-lab.spec.js, здесь — цепочка окна. Модель, синтез и
// распознавание тоже подменены.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const WAKE = '[ученик позвал голосом]'
const HELLO = 'Здравствуйте, Айгерім! Вы на Главной. Чем помочь?'

// 0.3 с тишины WAV 8 кГц — валидная запись для <audio>.
function silentWav() {
  const n = 2400
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24)
  b.writeUInt32LE(16000, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(n * 2, 40)
  return b
}

async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
    window.__jtsFakeWakeEar = true
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  const calls = { chat: [], stt: 0 }
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    const last = body.messages.at(-1).content
    // Первая реплика по кнопке — свой тест (assistant-opening.spec.js); здесь она «не удалась».
    if (last === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {})
    calls.chat.push(body)
    await r.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: last === WAKE ? HELLO : 'Домашка — в разделе «Домашняя работа».',
    })
  })
  await page.route('**/api/assistant/speak', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
  await page.route('**/api/assistant/transcribe', async (r) => {
    calls.stt += 1
    await r.fulfill(json({ text: 'Где домашка?' }))
  })
  return calls
}

const dot = (page) => page.locator('.asst__launcher [data-wake]')

// Включить позывной в окне и закрыть окно. После закрытия 5 с позывной глух
// (ложное срабатывание → ученик закрыл окно), поэтому ждём «слушает» с запасом.
async function enableWake(page) {
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await dialog.getByRole('checkbox', { name: 'Звать Луну голосом' }).check()
  await expect(dialog.getByText('Скажите «Привет, Луна»')).toBeVisible()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 10_000 })
}

test('«Привет, Луна» — окно, приветствие голосом, потом Луна сама слушает один ответ', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)

  await page.evaluate(() => window.__jtsWake())
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText(HELLO)).toBeVisible()
  expect(calls.chat[0].messages).toEqual([{ role: 'user', content: WAKE }])
  expect(calls.chat[0].voice).toBe(true)
  await expect(dialog).not.toContainText(WAKE)

  // Договорила — запись ответа пошла сама, без кнопки.
  const stop = page.getByRole('button', { name: 'Закончить вопрос' })
  await expect(stop).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1200)
  // Фальшивый микрофон пищит с паузами — запись могла кончиться сама на тишине.
  if (await stop.isVisible()) await stop.click()
  await expect(page.locator('.asst__msg--me')).toContainText('Где домашка?')
  expect(calls.stt).toBe(1)
  expect(calls.chat[1].messages.at(-1)).toEqual({ role: 'user', content: 'Где домашка?' })

  // Один ответ, не разговор: после ответа Луны запись сама не начинается.
  await expect(page.locator('.asst__msg--bot').last()).toContainText('Домашняя работа')
  await page.waitForTimeout(1500)
  await expect(stop).toBeHidden()
})

test('раздел взял микрофон — «ухо» молчит, отпустил — снова слушает', async ({ page }) => {
  await setup(page)
  await enableWake(page)
  await page.evaluate(async () => {
    window.__sectionMic = await navigator.mediaDevices.getUserMedia({ audio: true })
  })
  await expect(dot(page)).toHaveAttribute('data-wake', 'paused')
  // Пока микрофон у раздела, позывной окно не открывает.
  await page.evaluate(() => window.__jtsWake())
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeHidden()
  await page.evaluate(() => window.__sectionMic.getTracks().forEach((t) => t.stop()))
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 5_000 })
})

test('закрыл окно после позывного — 5 с позывной его не открывает', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)
  await page.evaluate(() => window.__jtsWake())
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText(HELLO)).toBeVisible()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await page.evaluate(() => window.__jtsWake())
  await expect(dialog).toBeHidden()
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 10_000 })
  await page.evaluate(() => window.__jtsWake())
  await expect(dialog).toBeVisible()
  expect(calls.chat.filter((c) => c.messages.at(-1).content === WAKE)).toHaveLength(2)
})
```

- [ ] **Step 2: Прогон**

Run: `E2E_PORT=3257 npx playwright test tests/assistant-wake.spec.js tests/assistant-opening.spec.js tests/assistant-voice.spec.js --project=desktop --workers=1`
Expected: PASS — 3 новых теста и прежние тесты окна (позывной не сломал открытие кнопкой и голосовой вопрос). Перед прогоном убедиться, что на 3257 не висит dev-сервер другого worktree (ловушка `reuseExistingServer`).

- [ ] **Step 3: Посмотреть глазами**

`preview_start` `web-luna-wake`, `/?screen=home` с входом: включить переключатель, закрыть окно, сказать «Привет, Луна» в микрофон ноутбука (настоящий Vosk). Expected: точка зелёная → окно открылось → приветствие голосом → «Слушаю…». Скриншоты окна с переключателем и кнопки с точкой — desktop и мобильная ширина (`resize_window` `mobile`, затем вернуть `desktop`).

- [ ] **Step 4: Commit**

```bash
git add tests/assistant-wake.spec.js
git commit -m "test(помощник): e2e позывного Луны — окно, один ответ, микрофон раздела, пауза

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Документация, проверка, PR, живой прогон

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Абзац в CLAUDE.md**

Найти абзацы про Луну (`grep -n "\*\*Луна" CLAUDE.md`) и после последнего из них добавить (цифры замера подставить из Task 8 и Task 10):

```markdown
**Позывной Луны — «Привет, Луна» / «Сәлем, Луна», распознаёт само устройство.**
Ученик включает его переключателем в окне Луны (настройка устройства, ключ
`jts_luna_wake`); скажет фразу на любом экране, где есть Луна, — окно открывается,
уходит пометка `[ученик позвал голосом]` (`lib/assistant/opening.js`), Луна
здоровается, одной фразой говорит, что на экране, спрашивает, чем помочь, и,
договорив, сама слушает ОДИН ответ (`afterReply` в `send`). Дальше — кнопкой:
разговор без кнопок владелец отменил 15.10.2026.

Распознаёт Vosk в браузере (`lib/assistant/wake/wakeEar.js`, `vosk-browser` 0.0.8
динамическим импортом) с грамматикой `привет луна` / `салем луна` / `[unk]` — слова
сверены со словарём модели (Gr.fst): «сәлем» и «hey» в нём нет. Модель
`vosk-model-small-ru-0.22` (45 МБ) в git не лежит: её качает и сверяет по sha256
`scripts/fetch-wake-model.js` (Dockerfile, `--soft`), vosk-browser кэширует её в
IndexedDB по адресу — новая версия модели = новый адрес. Замер на устройствах
(DD.MM): <цифры из спеки>.

Микрофон «ухо» отдаёт любому разделу сразу: `micArbiter.js` оборачивает
`getUserMedia` и `SpeechRecognition.start` и считает занятым, пока жива чужая
дорожка (опросом `readyState` — после `stop()` события `ended` нет). Новый раздел с
микрофоном ничего делать не должен. «Ухо» молчит и при открытом окне, когда что-то
звучит (`isTtsActive`), на скрытой вкладке и 5 с после позывного или закрытия окна.
Без жеста браузер держит AudioContext спящим: после перезагрузки «ухо» спит до
первого касания страницы (точка серая). Любая ошибка (нет разрешения, модель не
скачалась) выключает позывной. Лаборатория замеров — `/wake-lab` (только локалка и
dev-стенд); в e2e «ухо» подменяется `window.__jtsFakeWakeEar` (не в проде).
```

- [ ] **Step 2: Полная проверка**

```bash
npm run build
npm run lint
npx vitest run scripts/lib scripts/fetch-wake-model.test.js src/lib/assistant src/components src/app/api/assistant src/i18n
E2E_PORT=3257 npx playwright test tests/assistant-wake.spec.js tests/assistant-opening.spec.js tests/assistant-voice.spec.js tests/assistant-navigate.spec.js tests/wake-lab.spec.js --project=desktop --workers=1
```

Expected: всё зелёное. Известные красные на develop (память `develop-red-tests-baseline`) — сверить, что они красные и без этих правок, и не чинить здесь.

- [ ] **Step 3: Commit, push, PR**

```bash
git add CLAUDE.md
git commit -m "docs(помощник): позывной Луны в CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin HEAD
gh pr create --base develop --title "feat(помощник): позывной «Привет, Луна» в окне Луны" --body "$(cat <<'EOF'
Часть 2 плана `docs/superpowers/plans/2026-10-16-luna-wake-word.md`: позывной в окне Луны.

- Переключатель «Звать Луну голосом» в окне, точка состояния на кнопке Луны.
- «Привет, Луна» / «Сәлем, Луна» → окно, приветствие + «чем помочь?», запись ОДНОГО ответа.
- «Ухо» молчит, пока микрофон занят разделом, окно открыто, что-то звучит, вкладка скрыта; 5 с после позывного/закрытия.
- Сервер: пометка `[ученик позвал голосом]`, указание рядом с ней, без кнопки раздела и заметки трекера.

Замер на устройствах: <цифры из спеки>. Зонд Haiku 5.5: N/24.
kk-строки — на вычитку носителю.

Проверено: vitest, `npm run build`, e2e окна (assistant-wake/-opening/-voice/-navigate) и лаборатории.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Живой прогон на dev-стенде после мержа**

На `https://dev-tutor.justtostudy.kz` с настоящим входом, ноутбук и телефон: включить позывной, уйти на «Практику», сказать «Привет, Луна» и «Сәлем, Луна». Expected: окно, приветствие голосом Луны, запись ответа, ответ по делу. Открыть Ситуации и начать запись — точка серая, позывной не срабатывает; закончить — снова зелёная. Итог (что сработало, что нет) — пользователю, с тем, что не проверено.

- [ ] **Step 5: Убрать worktree, когда всё смержено**

```bash
cmd //c rmdir "C:\\Users\\nural\\Desktop\\jts-web-app\\.claude\\worktrees\\luna-wake\\node_modules"
git worktree remove .claude/worktrees/luna-wake
```

Junction снимается ПЕРВЫМ. Из `.claude/launch.json` убрать `web-luna-wake`.
