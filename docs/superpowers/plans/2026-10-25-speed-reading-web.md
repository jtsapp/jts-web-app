# «Скорочтение» — сайт (этап 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Решение владельца для этого этапа: план выполняется **инлайн одной сессией**, без субагента на задачу;
> в конце — одно ревью ветки субагентом, найденное правится сам.

**Goal:** экран `?screen=speed-reading[&text=<id>]`: экран Скорочтения прототипа кабинета почти дословно в Shadow
DOM — выбор текста и скорости, образец ElevenLabs с подсветкой слов, телесуфлёр с записью, итог по нашему
`/api/transcribe`, попытки и монеты — с бэкенда (`/mobile/speed-reading/**`), плитка во вкладке «Аудирование».

**Architecture:** экран-оболочка `SpeedReadingPage.jsx` (как `GrammarGamesPage.jsx`) берёт тексты и попытки
хуком `useSpeedReadingData`, монтирует `mountSpeedReading(root, cfg)` в открытую тень и снимает его. Движок —
функции `pSpeed`/`sr*` из `data/jts-student-cabinet.html` с заменой глобалов на `cfg`. Чистые правила
(выравнивание, звёзды, темп, длительности) — `rules.js` под оракулом, который считает сам прототип в `node:vm`.
Запись — `recorder.js` (MediaRecorder → WAV 16 кГц), живая подсветка — `live.js` (Web Speech API со сторожем
«молчит»), образец — серверный роут `/api/practice/speed-reading/sample` (claim у бэкенда → ElevenLabs
`/with-timestamps` → PUT на бэкенд), клиент его опрашивает `sampleClient.js`. Звук образца — общий `<audio>`
через `playUrl` с новой опцией `onTime`.

**Tech Stack:** Next.js 16 SPA на JavaScript, vitest 2 + jsdom 25, Playwright (системный Chrome, фальшивый
микрофон), ElevenLabs `/v1/text-to-speech/{voice}/with-timestamps`, Azure/Soniox через `/api/transcribe`.

## Global Constraints

- Спека — `docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md`, часть B (B1 — ручки, B3 —
  сайт), допущения Д5, Д6, Д7, Д9, Д12, Д15, Д16.
- Только `.js`/`.jsx`, без новых зависимостей npm (`npm install` не запускать: `node_modules` — junction).
- Комментарии по-русски и про «почему».
- Строки оболочки — ru/kk/en в `src/i18n.jsx`; строки внутри движка — его таблица `U` (ru/kk/en), как `X()`
  прототипа. В тени гарнитура только `var(--sr-font,inherit)`; ENGINES-проверка в `src/kkFont.test.js`.
- Скорости — ровно `0.5, 0.7, 1, 1.5, 2, 2.5, 3`. Звёзды: ≥85 % — 3, ≥60 % — 2, ≥30 % — 1, иначе 0.
- Голос ученика не хранится нигде (Д6): WAV уходит только в `/api/transcribe`; на бэкенд — цифры попытки
  `{textId, speed, durationSec, wordsTotal, wordsRead, percent, stars, wpm, scoredBy}` и ничего больше.
- Итог — по `/api/transcribe`; не ответил — по живому распознаванию (`browser`); нет ни того, ни другого —
  `none`, ★ 0, `percent: null` (Д7). Демо ничего не отправляет.
- Запись — MediaRecorder → WAV 16 кГц моно, потолок 3 минуты (Д15). `src/ielts/**` не трогаем.
- Монеты считает только бэкенд (раз в сутки на текст, Д16); сайт показывает число `coins` из ответа.
- Раздел только со входом (Д12): гостю — «Войдите…»; пустой список или 404 — «Раздел готовится».
- Ключи сервера — `ELEVENLABS_API_KEY`, `SPEED_READING_KEY` (по умолчанию `IELTS_GRADER_KEY`), env с вырезанием
  BOM. Без ключа ElevenLabs роут образца — `503`, запись и итог работают.
- Моки POST в e2e — глоб со `**` на конце; e2e одним воркером через обёртку системного Chrome на своём порту
  (3100 занят чужими серверами).
- Старую «Грамматику» и IELTS не трогаем. Не пушить и не открывать PR без слова владельца.

## Контракт бэкенда, на который пишется сайт

Пока `backend-speed-reading/docs/practice/SPEED_READING.md` не написан — по спеке B1, плюс поле, без которого
телесуфлёру нечего показывать (бэкенду отправлено сообщение 25.10):

```
GET  /mobile/speed-reading/texts            → [{id, level, icon, title:{ru,kk,en}, body, words, sample:{url, words:[[w,s,e]…], wpm}|null}]  ([] — «готовится»)
POST /mobile/speed-reading/attempts         {textId, speed, durationSec, wordsTotal, wordsRead, percent, stars, wpm, scoredBy}
                                            → {attempt, coins, balance}
GET  /mobile/speed-reading/attempts?limit=20 → [attempt] новые сверху; attempt = {id, textId, speed, durationSec,
                                              wordsTotal, wordsRead, percent, stars, wpm, scoredBy, coins, createdAt}
POST /integrations/web/speed-reading/{id}/sample-claim   (x-integration-key)
                                            → 200 {ready:true, sample} | 200 {ready:false, voice, body, hash} | 409 | 404
PUT  /integrations/web/speed-reading/{id}/sample  multipart audio(mp3) + words(JSON) + hash + wpm → {sample}
```

Сайт читает ответы терпимо (`normalizeText`, `normalizeAttempt` в `data.js`): разойдутся имена — правится одна
функция. В конце этапа — сверка с контроллерами бэкенда; расхождение — прав бэкенд, пишется в итог.

---

## Карта файлов

```
scripts/speed-reading/export-texts.js        — SR_TEXTS прототипа → build/speed-reading/texts.json (для «Импорт JSON»)
scripts/speed-reading/extract-oracle.js      — оракул: srAlign, звёзды, %, темп, подписи скоростей (node:vm на функциях прототипа)
scripts/speed-reading/voice-samples.js       — образцы 3–4 голосов в build/speed-reading/voices/ (этап 6.3)
src/practice/speed-reading/__fixtures__/oracle.json
src/practice/speed-reading/rules.js          — SPEEDS, BASE_WPM, srWords, srNorm, srAlign, starsOf, resultOf, speedWpm, paceSeconds, scrollMs, sampleIndexAt, todayCount
src/practice/speed-reading/data.js           — normalizeText, normalizeAttempt, attemptBody (ровно 9 полей)
src/practice/speed-reading/sampleClient.js   — requestSample(id, {token, fetchImpl, sleep}) — опрос роута образца
src/practice/speed-reading/recorder.js       — openRecorder(): MediaRecorder → WAV 16 кГц, потолок 3 мин
src/practice/speed-reading/live.js           — startLive(): Web Speech API со сторожем «молчит»
src/practice/speed-reading/icons.js          — SVG вместо Material Symbols прототипа
src/practice/speed-reading/styles.js         — CSS прототипа для тени
src/practice/speed-reading/engine.js         — mountSpeedReading(root, cfg) → api
src/practice/speed-reading/*.test.js
src/lib/speedReading/sample.js               — SPEED_READING_VOICES, wordsFromAlignment, sampleWpm, synthSample
src/lib/speedReading/sample.test.js
src/app/api/practice/speed-reading/sample/route.js (+ route.test.js)
src/screens/speed-reading/useSpeedReadingData.js
src/screens/SpeedReadingPage.jsx
tests/speed-reading.spec.js
правки: src/lib/speech.js (+speech.test.js: onTime), src/api.js, src/App.jsx, src/lib/navStack.js,
        src/screens/practice/practiceTabs.js (+test), src/screens/PracticePage.jsx, src/screens/practice/PracticeCards.jsx
        (Banner: tag), src/styles.css, src/theme-dark.generated.css (свой блок), src/i18n.jsx,
        src/lib/assistant/destinations.js (+test), src/kkFont.test.js, .env.example, CLAUDE.md
```

---

### Task 1: Тексты и оракул прототипа

**Files:**
- Create: `scripts/speed-reading/export-texts.js`, `scripts/speed-reading/extract-oracle.js`
- Create: `src/practice/speed-reading/__fixtures__/oracle.json` (вывод скрипта)

**Interfaces:**
- Consumes: `scripts/lib/js-slice.js` (`sliceFunction`, `sliceConst`).
- Produces: `oracle.json` = `{ texts: [{id, words}], align: [{text, heard, ok}], results: [{read, words, dur,
  pct, stars, wpm}], pace: [{text, mult, wpm, seconds, totalMs}] }`; `build/speed-reading/texts.json` — массив
  `{id, lv, ic, t:{ru,kk,en}, x}`.

- [ ] **Step 1: export-texts.js.** CommonJS, `--html` (по умолчанию `data/jts-student-cabinet.html`), `--out`
  (по умолчанию `build/speed-reading/texts.json`). `sliceConst(src, 'SR_TEXTS')` → `vm.runInNewContext('(' + literal + ')')`
  → проверка: 8 записей, у каждой `id, lv, ic, t.ru/kk/en, x` → `JSON.stringify(list, null, 2)`.

- [ ] **Step 2: extract-oracle.js.** Из html вырезаются `SR_TEXTS`, `const srWords`, `const srNorm`, функции
  `srAlign`, `srText`, `srSetMult`, `pSpeed`, `srResultView`, строка `const SR_BASE=150,SR_SPEEDS=[…];` (регэкспом
  до `;`) и выражение `const total=(…);` из `srRecord`. Всё исполняется в одном `vm`-контексте с заглушками:
  `G={lang:'ru'}`, `X=(ru)=>ru`, `L=o=>o.ru`, `esc` (как в прототипе), `IMG={dexter:'',cheer:'',sleep:''}`,
  `sCoin=()=>''`, `SRL=null`, `render=()=>{}`, `navigator={mediaDevices:{getUserMedia(){}}}`,
  `window={MediaRecorder:function(){}}`, `SR={step:'start',text:'flight',mult:1,wpm:150,tries:[]}`.
  - `align`: для каждого из 8 текстов наборы `heard`: всё прочитано; пропуск слов 10–20; лишние слова
    («um», «uh», «like») через каждые 7; повтор каждого 5-го слова; первые 4 буквы длинного слова совпали
    («beautiful»→«beauty»); первая половина текста; пусто; регистр и пунктуация («Hello,» → «HELLO!»);
    прыжок дальше окна 5 (слова 0–9, потом 20–конец). Запись — `{text, heard, ok}` из `srAlign()` при
    `SR.words = srWords(text.x)`, `SR.heard = heard`.
  - `results`: `SR.last = {text:'hello', mult:1, wpm:150, dur, words, read, ok:[…], url:null}`; из html
    `srResultView()` регэкспами берутся `Прочитано (\d+)%`, число `★` до `<span style="opacity:.35">`, `твой темп (\d+)`.
    Сетка: `words` ∈ {80, 117}, `read` ∈ {0, 1, 23, 24, 47, 48, 67, 68, 80}, `dur` ∈ {0, 12.4, 40, 61.7}; `read > words`
    пропускаем; плюс `read: null` (демо без распознавания) → `pct/stars/wpm = null`.
  - `pace`: для каждого текста и скорости `srSetMult(m)` → из `pSpeed()` `(\d+) сл/мин · ≈ (\d+) секунд`;
    `totalMs` — выражение `total` из `srRecord` в том же контексте (`SR.words = srWords(text.x)`).
  - Пишет `src/practice/speed-reading/__fixtures__/oracle.json`.

- [ ] **Step 3: Запуск и проверка.**

Run: `node scripts/speed-reading/export-texts.js && node scripts/speed-reading/extract-oracle.js`
Expected: `build/speed-reading/texts.json` — 8 текстов; оракул — `align` 72 записи (8 × 9), `pace` 56 (8 × 7).

- [ ] **Step 4: Commit** — `feat(speed-reading): тексты и оракул прототипа`.

### Task 2: Чистые правила против оракула

**Files:**
- Create: `src/practice/speed-reading/rules.js`, `src/practice/speed-reading/rules.test.js`

**Interfaces:**
- Produces:
  - `SPEEDS = [0.5, 0.7, 1, 1.5, 2, 2.5, 3]`, `BASE_WPM = 150`, `AUTO_STOP_MS = 2500`
  - `srWords(s) → string[]` (`s.split(/\s+/).filter(Boolean)`), `srNorm(w) → string`
  - `srAlign(words: string[], heard: string[]) → boolean[]`
  - `starsOf(pct: number|null) → 0..3|null`
  - `resultOf({read, words, dur}) → {pct, stars, wpm}` (null-поля, если `read == null`)
  - `speedWpm(base, mult) → number` (`Math.round(base * mult)`), `paceSeconds(words, wpm)`, `scrollMs(words, wpm)`
  - `sampleIndexAt(timings: [w,s,e][], t, n) → number` — индекс слова текста (из n) под временем t; при
    несовпадении длин — пропорционально
  - `todayCount(attempts: {createdAt}[], now: Date) → number`

- [ ] **Step 1: Тест против оракула.**

```js
import { describe, it, expect } from 'vitest'
import oracle from './__fixtures__/oracle.json'
import { SPEEDS, BASE_WPM, srWords, srAlign, resultOf, speedWpm, paceSeconds, scrollMs, sampleIndexAt, todayCount } from './rules.js'

describe('правила Скорочтения сверены с прототипом', () => {
  it('скорости — ровно семь, 1x = 150 сл/мин', () => {
    expect(SPEEDS).toEqual([0.5, 0.7, 1, 1.5, 2, 2.5, 3])
    expect(BASE_WPM).toBe(150)
  })
  it('srAlign на всех наборах оракула', () => {
    for (const c of oracle.align) expect(srAlign(srWords(c.text), c.heard)).toEqual(c.ok)
  })
  it('процент, звёзды и темп', () => {
    for (const r of oracle.results) expect(resultOf(r)).toEqual({ pct: r.pct, stars: r.stars, wpm: r.wpm })
  })
  it('подпись скорости и длительность прокрутки', () => {
    for (const p of oracle.pace) {
      const words = oracle.texts.find((t) => t.id === p.text).words
      const wpm = speedWpm(BASE_WPM, p.mult)
      expect(wpm).toBe(p.wpm)
      expect(paceSeconds(words, wpm)).toBe(p.seconds)
      expect(scrollMs(words, wpm)).toBeCloseTo(p.totalMs, 6)
    }
  })
})

describe('sampleIndexAt', () => {
  const t = [['Hello', 0.1, 0.4], ['everyone!', 0.5, 1.0], ['My', 1.2, 1.3]]
  it('слово, начавшееся не позже t', () => {
    expect(sampleIndexAt(t, 0, 3)).toBe(0)
    expect(sampleIndexAt(t, 0.55, 3)).toBe(1)
    expect(sampleIndexAt(t, 9, 3)).toBe(2)
  })
  it('разметка другой длины — пропорционально', () => {
    expect(sampleIndexAt(t, 1.25, 6)).toBe(4)
  })
})

describe('todayCount', () => {
  it('считает попытки с сегодняшней локальной датой', () => {
    const now = new Date(2026, 9, 25, 15)
    const list = [{ createdAt: new Date(2026, 9, 25, 9).toISOString() }, { createdAt: new Date(2026, 9, 24, 23).toISOString() }, { createdAt: null }]
    expect(todayCount(list, now)).toBe(1)
  })
})
```

- [ ] **Step 2:** `npx vitest run src/practice/speed-reading/rules.test.js` → FAIL (нет модуля).
- [ ] **Step 3: rules.js** — перенос `srWords`, `srNorm`, `srAlign` дословно (с `words/heard` аргументами
  вместо `SR`), звёзды и темп — из выражений `srResultView`, длительности — из `pSpeed`/`srRecord`.
- [ ] **Step 4:** тест зелёный.
- [ ] **Step 5: Commit** — `feat(speed-reading): правила выравнивания, звёзд и темпа`.

### Task 3: `playUrl` — опция `onTime`

**Files:**
- Modify: `src/lib/speech.js` (`playSrc`, `stopTts`)
- Test: `src/lib/speech.test.js`

**Interfaces:**
- Produces: `playUrl(src, { …, onTime?: (currentTime: number) => void })` — кадры `requestAnimationFrame`
  только пока звук идёт (между `playing` и `pause`/`ended`/обрывом/провалом).

- [ ] **Step 1: Тест.**

```js
describe('onTime', () => {
  let frames
  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (fn) => { frames.push(fn); return frames.length })
    vi.stubGlobal('cancelAnimationFrame', (id) => { frames[id - 1] = null })
  })
  const step = () => { const fns = frames.splice(0); fns.forEach((f) => f && f(0)) }

  it('кадры — только пока звук играет', () => {
    const onTime = vi.fn()
    speech.playUrl('/a.mp3', { onTime })
    step()
    expect(onTime).not.toHaveBeenCalled()
    const a = elements[0]
    a.currentTime = 1.5
    a.onplaying()
    step()
    expect(onTime).toHaveBeenLastCalledWith(1.5)
    a.onpause()
    step()
    expect(onTime).toHaveBeenCalledTimes(1)
  })

  it('прекращаются на ended и на обрыве', () => {
    const onTime = vi.fn()
    speech.playUrl('/a.mp3', { onTime })
    elements[0].onplaying()
    elements[0].onended()
    step()
    expect(onTime).toHaveBeenCalledTimes(0)
    speech.playUrl('/b.mp3', { onTime })
    elements[0].onplaying()
    speech.stopTts()
    step()
    expect(onTime).toHaveBeenCalledTimes(0)
  })

  it('чужая реплика без onTime не получает кадров прошлой', () => {
    const onTime = vi.fn()
    speech.playUrl('/a.mp3', { onTime })
    elements[0].onplaying()
    speech.playUrl('/b.mp3', {})
    elements[0].onplaying()
    step()
    expect(onTime).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/speech.test.js` → новые падают, старые зелёные.
- [ ] **Step 3: Реализация** в `speech.js`:

```js
let frame = null // { id } кадра onTime текущей реплики

function stopFrames() {
  if (frame !== null) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    frame = null
  }
}
```

  В `stopTts()` первой строкой `stopFrames()`. В `playSrc`: из `opts` берётся `onTime`; `fail` и `finish`
  зовут `stopFrames()`; `a.onplaying` после `onStart` запускает `tick`, если есть `onTime`:

```js
  const tick = () => {
    frame = null
    if (!live() || cur.settled || a.paused) return
    onTime(a.currentTime)
    frame = requestAnimationFrame(tick)
  }
  // в a.onplaying (и при первом старте, и после паузы):
  if (onTime && frame === null && typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(tick)
  a.onpause = () => { if (live()) stopFrames() }
```

  `a.onpause` ставится всегда (у реплик без `onTime` — без кадров), чтобы обработчик прошлой реплики не жил на
  общем элементе. `a.onplaying` сейчас выходит раньше, если `cur.started` — кадры после паузы перезапускаются
  до этой проверки.
- [ ] **Step 4:** весь `speech.test.js` зелёный.
- [ ] **Step 5: Commit** — `feat(speech): onTime у playUrl — кадры, пока звук идёт`.

### Task 4: Образец на сервере — синтез и разметка слов

**Files:**
- Create: `src/lib/speedReading/sample.js`, `src/lib/speedReading/sample.test.js`

**Interfaces:**
- Produces:
  - `SPEED_READING_VOICES = { 'uk-female': '<id>', 'uk-male': '<id>' }` (временные id до выбора владельца)
  - `voiceIdFor(voice) → string` (неизвестный — `uk-female`)
  - `wordsFromAlignment(text, alignment) → [word, start, end][]` — по одному на каждое `text.split(/\s+/)`
  - `sampleWpm(words) → number`
  - `synthSample({ text, voice, key, model?, fetchImpl? }) → Promise<{ audio: Buffer, words, wpm }>`
  - `elevenKey(env)`, `speedReadingKey(env)` — с вырезанием BOM

- [ ] **Step 1: Тест `wordsFromAlignment`** (посимвольная разметка строится тестом: каждый символ 0,05 с):

```js
function align(text, step = 0.05) {
  const chars = [...text]
  return { characters: chars, character_start_times_seconds: chars.map((_, i) => +(i * step).toFixed(3)), character_end_times_seconds: chars.map((_, i) => +((i + 1) * step).toFixed(3)) }
}
it('слово на каждый пробельный кусок, пунктуация к слову, время — по буквам', () => {
  const text = 'Hello, everyone! "Don\'t" go — it\'s 8 o\'clock; high-speed Wi-Fi 512.'
  const w = wordsFromAlignment(text, align(text))
  expect(w.map((x) => x[0])).toEqual(text.split(/\s+/))
  expect(w[0]).toEqual(['Hello,', 0, 0.25])          // запятая не удлиняет слово
  expect(w[2][0]).toBe('"Don\'t"')
  expect(w[2][1]).toBeCloseTo(0.9, 3)                 // кавычка не сдвигает начало
  expect(w[4]).toEqual(['—', expect.any(Number), expect.any(Number)]) // тире без букв — по своим символам
})
it('символы разметки могут расходиться с текстом (лишний пробел, \\n) — слова не съезжают', () => {
  const text = 'Good  evening\nand welcome'
  const a = align('Good evening and welcome')
  const w = wordsFromAlignment(text, a)
  expect(w.map((x) => x[0])).toEqual(['Good', 'evening', 'and', 'welcome'])
  expect(w[3][1]).toBeCloseTo(0.85, 3)
})
it('пустая разметка — время монотонно, без NaN', () => {
  const w = wordsFromAlignment('one two', { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] })
  expect(w).toEqual([['one', 0, 0], ['two', 0, 0]])
})
it('sampleWpm — слова к времени речи', () => {
  expect(sampleWpm([['a', 0.5, 1], ['b', 1, 30.5]])).toBe(4)
})
```

  `synthSample` — с подменённым `fetch`: адрес `/v1/text-to-speech/<id>/with-timestamps?output_format=mp3_44100_128`,
  заголовок `xi-api-key`, тело `{text, model_id}`; ответ `{audio_base64, alignment}` → `audio` — Buffer, `words`
  и `wpm`; не-200 → ошибка с кодом в сообщении.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реализация.** Сопоставление символов: указатель по тексту, символ разметки ищется в тексте
  начиная с указателя (пробелы и переводы строк в тексте пропускаются); у каждого символа текста — индекс в
  разметке или -1. Время слова — от первой до последней БУКВЫ/ЦИФРЫ куска (`/[\p{L}\p{N}]/u`), без них — по
  всем символам куска; без разметки — конец предыдущего слова. Время округляется до мс.
- [ ] **Step 4:** зелёный.
- [ ] **Step 5: Commit** — `feat(speed-reading): синтез образца ElevenLabs и разметка слов`.

### Task 5: Голоса на выбор (этап 6.3)

**Files:**
- Create: `scripts/speed-reading/voice-samples.js`

- [ ] **Step 1:** скрипт (ESM, ключ из `.env.local`, как `make-verbs-voice.js`): `GET /v1/voices` → британские
  (`labels.accent` ~ british), печатает список; `--voices id1,id2,…` синтезирует `synthSample` два текста
  (`weather` — Astana, Almaty; `tour` — Charyn Canyon) в `build/speed-reading/voices/<имя>-<текст>.mp3` и
  `index.json` (имя, пол, id, wpm).
- [ ] **Step 2:** запуск, 4 голоса (2 женских, 2 мужских).
- [ ] **Step 3:** страница-артефакт с плеерами (mp3 — файлами артефакта), ссылка — основной сессии
  `SendMessage` с просьбой к владельцу выбрать женский и мужской. Дальше работа не ждёт.
- [ ] **Step 4: Commit** — `chore(speed-reading): образцы голосов на выбор`.

### Task 6: Роут образца

**Files:**
- Create: `src/app/api/practice/speed-reading/sample/route.js`, `…/route.test.js`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `synthSample`, `elevenKey`, `speedReadingKey` (Task 4), `verifyTokenStatus`, `BACKEND_URL`.
- Produces: `POST /api/practice/speed-reading/sample` `{id}` + Bearer →
  `200 {sample:{url, words, wpm}}` | `202 {pending:true}` | `401` | `400` | `404` | `503 {error:'not_configured'}` | `502`.

- [ ] **Step 1: Тест** (`vi.mock('@/lib/auth-server.js')`, подменённый `fetch` по адресам):
  - без Bearer → 401, `fetch` не звали;
  - `id` вида `../x` → 400;
  - нет служебного ключа → 503;
  - claim `{ready:true, sample}` → 200 тот же `sample`, ElevenLabs не звали;
  - claim 409 → 202 `{pending:true}`;
  - claim 404 → 404;
  - claim `{ready:false, voice:'uk-male', body, hash}` + нет ключа ElevenLabs → 503;
  - claim `{ready:false…}` → синтез голосом `uk-male` → PUT multipart (`audio` mp3, `words` JSON, `hash`, `wpm`,
    заголовок `x-integration-key`) → 200 `{sample}` из ответа PUT;
  - PUT 409 (текст поправили за время синтеза) → 202 `{pending:true}`;
  - ElevenLabs 500 → 502.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реализация.** Порядок: Bearer → тело → служебный ключ → `verifyTokenStatus` (unauthorized → 401,
  unavailable → 502) → claim → ready/409/404 → ключ ElevenLabs → синтез → PUT. Все запросы к бэкенду с
  `AbortSignal.timeout(15000)`, синтез — 60 с. `.env.example` — `SPEED_READING_KEY`, `SPEED_READING_MODEL`.
- [ ] **Step 4:** зелёный.
- [ ] **Step 5: Commit** — `feat(speed-reading): роут образца — claim, синтез, приём бэкендом`.

### Task 7: Данные, опрос образца, запись, живая подсветка

**Files:**
- Create: `src/practice/speed-reading/{data,sampleClient,recorder,live}.js` + `*.test.js`
- Modify: `src/api.js`

**Interfaces:**
- `data.js`: `normalizeText(raw) → {id, level, icon, title, body, words, sample}|null` (тело — `body ?? text ?? x`;
  без тела — null), `normalizeAttempt(raw) → {id, textId, speed, durationSec, wordsTotal, wordsRead, percent,
  stars, wpm, scoredBy, coins, createdAt}`, `attemptBody(a) → ровно 9 полей` (`speed` — из `SPEEDS`,
  `durationSec` ≤ 200 целым).
- `sampleClient.js`: `requestSample(id, { token, fetchImpl = fetch, sleep, tries = 10, delayMs = 3000 }) →
  Promise<{status:'ready', sample} | {status:'unavailable'} | {status:'error'}>`; 202 — пауза и снова.
- `recorder.js`: `MAX_RECORD_MS = 180000`; `canRecord(env = globalThis) → boolean`;
  `openRecorder({ getUserMedia, MediaRecorderCtor, toWav = blobToWav16kMono, maxMs, onLimit }) →
  Promise<{ start(), stop(): Promise<Blob|null>, cancel() }>` — ошибка `getUserMedia` пробрасывается (её `name`
  движок показывает на экране «нет микрофона»).
- `live.js`: `startLive({ createRecognition, onWords(words: string[]), onDead(code), timers? }) → { stop() } | null`;
  `START_TIMEOUT` (= 2 с из `src/practice/arcade/transcript.js`), `NO_WORDS_MS = 6000`.
- `api.js`: `getSpeedReadingTexts(token)`, `getSpeedReadingAttempts(token, limit = 20)`,
  `postSpeedReadingAttempt(token, body)`.

- [ ] **Step 1: Тесты.**
  - `data.test.js`: тело из `x`; запись без тела отбрасывается; `attemptBody` выкидывает лишние поля и
    округляет `durationSec`; `normalizeAttempt` терпит `created_at`.
  - `sampleClient.test.js`: 200 → ready; 202, 202, 200 → ready на третьей (sleep звали дважды по 3000);
    202 × 10 → error; 503 → unavailable; сеть упала → error; заголовок Authorization.
  - `recorder.test.js` (заглушки `MediaRecorder`, дорожек и `toWav`): `start` → `start(250)`; `stop` склеивает
    куски, зовёт `toWav`, отпускает дорожки; потолок — `onLimit` через `maxMs`; `cancel` отпускает дорожки и не
    зовёт `toWav`; отказ `getUserMedia` — промис отклонён той же ошибкой.
  - `live.test.js` (фальшивый распознаватель): `lang = 'en-US'`, `continuous`, `interimResults`; результаты →
    `onWords` (финальные + промежуточные); нет `onstart` за 2 с → `onDead('silent')` и `abort()`; старт был, слов
    6 с нет → `onDead('silent')`; `onerror('not-allowed')` → `onDead('blocked')`; `onend` во время работы —
    перезапуск, после `stop()` — нет; нет `createRecognition()` → null.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реализация** по интерфейсам.
- [ ] **Step 4:** зелёные.
- [ ] **Step 5: Commit** — `feat(speed-reading): данные, опрос образца, запись WAV и живая подсветка`.

### Task 8: Движок в тени

**Files:**
- Create: `src/practice/speed-reading/{engine,styles,icons}.js`, `engine.test.js`, `styles.test.js`
- Modify: `src/kkFont.test.js` (ENGINES: `'speed-reading'`)

**Interfaces:**
- `mountSpeedReading(root, cfg) → { setLang(lang), setAttempts(list), destroy() }`, где `cfg`:

```
{ texts: Text[], attempts: Attempt[], lang, initialText?: id,
  img(name) → url,                              // маскоты: dexter, cheer, sleep
  playSample(url, rate, { onTime, onEnd, onFail }) → void, stopSample(),
  ensureSample(id) → Promise<{status, sample?}>,
  canRecord() → boolean, openRecorder({ onLimit }) → Promise<recorder>,
  startLive({ onWords, onDead }) → live|null,
  transcribe(wavBlob) → Promise<string|null>,
  submitAttempt(body) → Promise<{coins, attempt}>,
  scrollTop() }
```

  Отступления от прототипа (всё остальное — как есть): данные — `cfg.texts`; образец — запись + `onTime`;
  `ensureSample` при выборе текста без образца, кнопка «Готовим образец…» / «Образец недоступен»; запись —
  `cfg.openRecorder`; живая подсветка — `cfg.startLive` со сторожем; итог — шаг `scoring` («Проверяем запись…»),
  `transcribe` → `server`, иначе живое → `browser`, иначе `none`; попытка — `cfg.submitAttempt`, монеты из ответа
  тостом и строкой итога; «Мои попытки» — сервер + этот заход (плеер только у своих); «Скачать» — WAV
  `speed-<текст>-<дата>.wav`; inline `onclick` → `data-act`; Material Symbols → SVG `icons.js`; тосты — внутри
  корня; звуки `beep` — свой AudioContext, будится в клике «Начать запись», закрывается в `destroy`; экран «нет
  микрофона» — шаги под сайт (без «скачайте файл»).
- [ ] **Step 1: Тесты движка** (jsdom, тень, фейковые таймеры и rAF, заглушки cfg):
  - старт: 8 карточек текстов (название, уровень, слов), 7 скоростей, подпись `1x — темп носителя · 225 сл/мин`
    после клика 1.5x; заголовки текстов из админки экранированы (`<img>` в названии — текстом);
  - текст без образца → `ensureSample(id)` один раз, кнопка «Готовим образец…», после ответа — «Послушать образец»;
  - «Послушать образец» → `playSample(url, 1.5, …)`; `onTime(1.3)` → у слова под временем класс `on`, у
    предыдущих `done`; повторный клик → `stopSample`;
  - запись: «Начать запись» → `openRecorder` → отсчёт 3-2-1 (800 мс) → `recorder.start`, `startLive`; живые слова →
    у совпавших `said`; «Стоп» → `recorder.stop` → `transcribe(wav)` → `submitAttempt` ровно с 9 полями и
    `scoredBy:'server'` → итог `Прочитано N%`, звёзды, `+4` из ответа, `<audio>` с blob-адресом, ссылка `.wav`;
  - `transcribe` → null, живые слова были → `scoredBy:'browser'`; живого нет → `scoredBy:'none'`, `percent:null`,
    `stars:0`, на экране «Оценка недоступна»;
  - сторож: `onDead('silent')` → подсветка `said` больше не ставится;
  - отказ микрофона → экран «Нет доступа к микрофону» с именем ошибки; «Демо» → запись без `openRecorder`,
    итог демо, `submitAttempt` и `transcribe` не звали;
  - `destroy()` посреди записи → `recorder.cancel`, `live.stop`, `stopSample`, rAF снят, blob-адреса отозваны;
  - сторож глобалов: движок не трогает `document.body` и `location` (как в `grammar-games/engine.test.js`).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реализация** — функции прототипа под теми же именами внутри `mountSpeedReading`.
- [ ] **Step 4:** зелёные; `styles.test.js` — в CSS нет `font-family`, кроме `var(--sr-font,inherit)`, и нет
  `fonts.googleapis`.
- [ ] **Step 5: Commit** — `feat(speed-reading): движок прототипа в тени`.

### Task 9: Экран, данные и место в «Практике»

**Files:**
- Create: `src/screens/speed-reading/useSpeedReadingData.js`, `src/screens/SpeedReadingPage.jsx`
- Modify: `src/App.jsx`, `src/lib/navStack.js`, `src/screens/practice/practiceTabs.js` (+test),
  `src/screens/PracticePage.jsx`, `src/screens/practice/PracticeCards.jsx`, `src/styles.css`,
  `src/theme-dark.generated.css`, `src/i18n.jsx`, `src/lib/assistant/destinations.js` (+test)

- [ ] **Step 1: Тесты.** `practiceTabs.test.js`: `speedReading` сразу после `justListen`, навык `listening`.
  `destinations.test.js`: `validAction('open', 'speed-reading')`, `destinationIdForScreen('speed-reading')`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реализация.**
  - хук: статусы `guest | loading | missing | error | ready`; тексты (`normalizeText`, пустой список → `missing`,
    404 → `missing`) и попытки (сбой попыток не мешает — `[]`) параллельно, перезапрос по владельцу токена;
    `retry`; `submit(body)` → `postSpeedReadingAttempt` (сеть — до двух повторов через 2 с).
  - экран: `LearningLayout`, «← К Аудированию», состояния, хост с `data-source="api"` и `data-texts`, тень,
    `--sr-font`, `cfg` из Task 8 (`playUrl` с `rate` и `onTime`, `stopTts`, `requestSample`, `openRecorder`,
    `startLive`, `fetch('/api/transcribe')` с `FormData` `audio`, `submit`).
  - `App.jsx`: `PERSISTABLE_SCREENS`, диплинк `text`, `handleNav('speed-reading')`, ветка с
    `sectionBack('listening')`; `navStack.js` — `'speed-reading': 'nav.back.speedReading'`.
  - «Практика»: секция `{ id: 'speedReading' }` после `justListen`; `Banner` получает `tag` (бейдж «Новое»);
    `.pk-banner--speed-reading` градиент + свой блок в тёмной теме.
  - `i18n.jsx` ru/kk/en: `practice.speedReading.{heading,desc,cta,new}`, `speedReading.{toPractice,loading,
    loadFailed,retry,notUploaded,guest}`, `nav.back.speedReading`.
  - Луна: `{ id: 'speed-reading', nav: 'speed-reading', screen: 'speed-reading', name, about }`.
- [ ] **Step 4:** `npm test` зелёный (известные красные — сверить с develop).
- [ ] **Step 5: Commit** — `feat(speed-reading): экран, данные и плитка в «Аудировании»`.

### Task 10: E2E, проверка в браузере, отчёт, CLAUDE.md

**Files:**
- Create: `tests/speed-reading.spec.js`
- Modify: `CLAUDE.md`

- [ ] **Step 1: E2E.** Флаги `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
  --use-file-for-fake-audio-capture=<тон.wav>`; ручки подменены: тексты (свой короткий текст на 20 слов с
  готовым образцом и текст без образца), попытки (GET/POST, `**` на конце), роут образца, `/api/transcribe`
  (первые 15 слов текста), сам образец — тихий WAV 4 с.
  - путь: «Практика» → «Аудирование» → плитка «Скорочтение» (бейдж «Новое») → второй текст (роут образца
    позвали) → 2x → «Послушать образец» (у слова появляется `on`) → «Начать запись» → отсчёт → «Стоп» → итог
    «Прочитано 75%» → POST ушёл ровно с 9 полями, `scoredBy:'server'`, WAV ушёл в `/api/transcribe` → «Записать
    ещё раз» → «Мои попытки» с плеером у своей;
  - отказ в микрофоне (`getUserMedia` отклонён init-скриптом) → «Нет доступа к микрофону» → «Демо» → итог демо,
    POST попыток не было;
  - гость → «Войдите…»; пустой список → «Раздел готовится»;
  - 360 px без горизонтальной прокрутки; ноль ошибок консоли.
- [ ] **Step 2:** прогон одним воркером через обёртку системного Chrome на своём порту.
- [ ] **Step 3: Браузер.** `next dev` за node-прокси (отвечает на `/mobile/speed-reading/**` и
  `/integrations/web/speed-reading/**`, остальное — dev-server): образец создаётся настоящим ElevenLabs один раз,
  второй заход берёт готовый; снимки пути (десктоп и 390) — Playwright-скриптом с заглушкой входа.
- [ ] **Step 4:** отчёт-артефакт со снимками; `CLAUDE.md` — абзац о разделе.
- [ ] **Step 5:** `npm run build`, `npm run lint`, `npm test`; сверка с контроллерами бэкенда.
- [ ] **Step 6: Commit** — `test(speed-reading): e2e пути ученика; CLAUDE.md`.

### Task 11: Ревью ветки

- [ ] Одно ревью субагентом на всю ветку (`git diff origin/develop...HEAD`), найденное правится сам, повтор
  проверок, коммит `fix(speed-reading): правки по ревью ветки`.
