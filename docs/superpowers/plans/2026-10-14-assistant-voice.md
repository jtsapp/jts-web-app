# Голос у помощника по сайту — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ученик говорит вопрос в окне помощника — помощник (Луна) отвечает текстом и сразу голосом; русский и казахский распознаются надёжно.

**Architecture:** цепочка в браузере. Запись WAV (`useRecorder`) с остановкой на тишине → `POST /api/assistant/transcribe` (Soniox с языками и контекстом сайта, запасной Azure) → прежний `/api/assistant/chat` с флагом `voice` → поток текста режется на фразы → `POST /api/assistant/speak` (Gemini «Aoede», казахский и сбой — Soniox «Grace») → общий `<audio>` из `speech.js`.

**Tech Stack:** Next.js (App Router, роуты `runtime = 'nodejs'`), React 19, vitest + jsdom + Testing Library, Playwright.

Спека: `docs/superpowers/specs/2026-10-14-assistant-voice-design.md`.

## Global Constraints

- Только JavaScript (`.js`/`.jsx`), TS-файлы не добавлять.
- Комментарии на русском и объясняют «почему».
- Строки UI помощника — через `useI18n()` / `src/i18n.jsx`, три языка ru/kk/en, ключи одинаковые.
- Стили — классами в `src/assistant.css`, без CSS-модулей.
- Новые роуты: проверка ученика `verifyTokenStatus` (как `/api/assistant/chat`), лимит — `createRateLimiter` из `src/lib/assistant/rateLimit.js`, ключ `user-<id>`.
- Запись голоса нигде не сохраняется и не пишется в лог.
- Распознавание: потолок записи 30 с, тело ≤ 1 200 000 байт.
- Озвучка: фраза ≤ 600 символов; голос Луны — `gemini` + `Aoede`; казахский и любой сбой Gemini — `soniox` + `Grace`.
- `/api/tutor-tts` после выноса синтеза ведёт себя как раньше.
- Тесты гонять только по своему дереву: `npx vitest run --dir src <пути> --exclude ".claude/**"` (vitest иначе подхватывает соседние worktree).

---

### Task 1: Распознавание на нескольких языках — Soniox и Azure

**Files:**
- Modify: `src/lib/soniox-stt.js` (функция `transcribeWavSoniox`, отправка конфига в `ws.onopen`)
- Modify: `src/lib/ielts/azure-pronunciation.js` (`transcribeWav` — параметр `locale`)
- Test: `src/lib/soniox-stt.test.js` (новый)

**Interfaces:**
- Produces: `sonioxConfig({ key, lang, context }) → object` — конфиг первого сообщения сокета;
  `transcribeWavSoniox(wav, { lang?: string|string[], context?: object, timeoutMs? })`;
  `transcribeWav(wav, { locale?: string })` (по умолчанию `'en-US'`).

- [ ] **Step 1: тест на конфиг**

```js
// src/lib/soniox-stt.test.js
import { describe, it, expect } from 'vitest'
import { sonioxConfig } from './soniox-stt.js'

describe('sonioxConfig', () => {
  it('одиночный язык — как раньше, без контекста', () => {
    const c = sonioxConfig({ key: 'k', lang: 'en' })
    expect(c.language_hints).toEqual(['en'])
    expect(c).not.toHaveProperty('context')
    expect(c.api_key).toBe('k')
    expect(c.audio_format).toBe('auto')
  })
  it('список языков и контекст уходят как есть', () => {
    const context = { general: [{ key: 'domain', value: 'site help' }], terms: ['Тәжірибе'] }
    const c = sonioxConfig({ key: 'k', lang: ['kk', 'ru', 'en'], context })
    expect(c.language_hints).toEqual(['kk', 'ru', 'en'])
    expect(c.context).toEqual(context)
  })
})
```

- [ ] **Step 2: тест падает** — `npx vitest run --dir src src/lib/soniox-stt.test.js --exclude ".claude/**"` → FAIL «sonioxConfig is not a function».

- [ ] **Step 3: реализация.** В `soniox-stt.js` добавить экспорт и использовать его в `ws.onopen`:

```js
/**
 * Первое сообщение сокета. lang — один код или список: помощнику по сайту
 * нужны сразу казахский, русский и английский (ученик говорит по-русски и
 * вставляет английское слово из задания). context — подсказка Soniox
 * (general/terms), без неё казахские формы распознаются заметно хуже (#499).
 */
export function sonioxConfig({ key, lang = 'en', context } = {}) {
  return {
    api_key: key,
    model: MODEL,
    audio_format: 'auto', // WAV с заголовком — Soniox определит формат сам
    language_hints: Array.isArray(lang) ? lang : [lang],
    ...(context ? { context } : {}),
  }
}
```

Сигнатура: `export async function transcribeWavSoniox(wav, { lang = 'en', context, timeoutMs } = {})`, в `ws.onopen`:
`ws.send(JSON.stringify(sonioxConfig({ key, lang, context })))`.

В `azure-pronunciation.js`: `export async function transcribeWav(wav, { locale = 'en-US' } = {})` и
`speechConfig.speechRecognitionLanguage = locale` в этой функции (остальные три места с `'en-US'` — оценка произношения, не трогать).

- [ ] **Step 4: тесты зелёные** — тот же запуск плюс `src/lib/ielts` → PASS.

- [ ] **Step 5: коммит** `feat(stt): Soniox принимает список языков и контекст, Azure — локаль`.

---

### Task 2: Роут распознавания вопроса помощнику

**Files:**
- Create: `src/lib/assistant/sttContext.js`, `src/lib/assistant/sttContext.test.js`
- Create: `src/app/api/assistant/transcribe/route.js`, `src/app/api/assistant/transcribe/route.test.js`

**Interfaces:**
- Consumes: `transcribeWavSoniox`, `transcribeWav(wav, { locale })`, `transcribeWavFast(wav, { locale, timeoutMs })`, `isSonioxConfigured()`, `SCREEN_NAMES` из `prompt.js`.
- Produces: `sttLanguages(lang) → string[]`; `azureLocale(lang) → string`; `sttContext({ screenId }) → { general, terms }`;
  `POST /api/assistant/transcribe` multipart `audio` + `lang` + `screen` → `200 { text }` | `401` | `400` | `413` | `429 { error: 'rate_limited', retryAfterSec }` | `503 { error: 'stt_unavailable' }`.

- [ ] **Step 1: тесты контекста**

```js
// src/lib/assistant/sttContext.test.js
import { describe, it, expect } from 'vitest'
import { STT_CONTEXT_MAX_CHARS, azureLocale, sttContext, sttLanguages } from './sttContext.js'

describe('языки распознавания', () => {
  it('первым — язык интерфейса, английский последним у ru/kk', () => {
    expect(sttLanguages('kk')).toEqual(['kk', 'ru', 'en'])
    expect(sttLanguages('ru')).toEqual(['ru', 'kk', 'en'])
    expect(sttLanguages('en')).toEqual(['en', 'ru', 'kk'])
    expect(sttLanguages('xx')).toEqual(['ru', 'kk', 'en'])
  })
  it('локаль Azure по интерфейсу', () => {
    expect(azureLocale('kk')).toBe('kk-KZ')
    expect(azureLocale('ru')).toBe('ru-RU')
    expect(azureLocale('en')).toBe('en-US')
  })
})

describe('контекст Soniox', () => {
  it('разделы сайта на русском и казахском, без дублей, в пределах лимита', () => {
    const c = sttContext({ screenId: 'homework' })
    expect(c.terms).toContain('Домашняя работа')
    expect(c.terms).toContain('Үй жұмысы')
    expect(c.terms).toContain('Тәжірибе')
    expect(new Set(c.terms).size).toBe(c.terms.length)
    expect(c.terms.join('').length).toBeLessThanOrEqual(STT_CONTEXT_MAX_CHARS)
    expect(c.general.find((g) => g.key === 'current_screen')?.value).toBe('Домашняя работа')
  })
  it('без экрана — без current_screen', () => {
    expect(sttContext({}).general.some((g) => g.key === 'current_screen')).toBe(false)
  })
})
```

- [ ] **Step 2: реализация `sttContext.js`**

```js
// Подсказка распознаванию для вопросов помощнику. Помощник — технический: его
// спрашивают про сайт по-русски и по-казахски, и чаще всего — названиями
// разделов и кнопок. Soniox с подсказкой терминов распознаёт казахские формы
// заметно лучше (замер #499: 78 → 93 %), а слова сайта вроде «Шэдоуинг» или
// «Speaking Buddy» без неё он угадывает как попало.
import { SCREEN_NAMES } from './prompt.js'

export const STT_CONTEXT_MAX_CHARS = 3000

const LANGS = { kk: ['kk', 'ru', 'en'], ru: ['ru', 'kk', 'en'], en: ['en', 'ru', 'kk'] }
const LOCALES = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' }

export const sttLanguages = (lang) => LANGS[lang] || LANGS.ru
export const azureLocale = (lang) => LOCALES[lang] || LOCALES.ru

// Как разделы названы в казахском интерфейсе (i18n.jsx, kk: nav.*, nav.back.*).
const KK_TERMS = [
  'Басты бет', 'Тәжірибе', 'Сабақтар', 'Сөздік', 'Үй жұмысы', 'Қайталау', 'Оқу',
  'Жұмыс дәптері', 'Тыңдалым', 'Жазылым', 'Суреттегі сөздер', 'Тарифтер', 'Профиль',
  'Тапсырма', 'Жауап', 'Тексеру', 'Қате', 'Көмекші', 'Хабарламалар', 'Тьютор',
]
// То, чего нет в именах экранов, но что ученик говорит вслух.
const RU_TERMS = [
  'Проверить', 'Неверный ответ', 'Подсказка', 'Монеты', 'Серия', 'Уведомления',
  'Менеджер', 'Преподаватель', 'Луна', 'Декстер', 'Спарк', 'Айзере', 'Воркбук',
]

function screenTerms() {
  return Object.values(SCREEN_NAMES)
    .flatMap((name) => name.split('→'))
    .map((s) => s.replace(/[«»()]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function sttContext({ screenId } = {}) {
  const terms = []
  let size = 0
  for (const t of [...screenTerms(), ...RU_TERMS, ...KK_TERMS]) {
    if (terms.includes(t) || size + t.length > STT_CONTEXT_MAX_CHARS) continue
    terms.push(t)
    size += t.length
  }
  const general = [
    { key: 'domain', value: 'Технический помощник сайта онлайн-школы английского языка JTS' },
    { key: 'topic', value: 'Ученик спрашивает про разделы сайта, задания, оценки, оплату и поломки' },
  ]
  const screen = typeof screenId === 'string' ? SCREEN_NAMES[screenId] : null
  if (screen) general.push({ key: 'current_screen', value: screen })
  return { general, terms }
}
```

- [ ] **Step 3: тесты роута**

```js
// src/app/api/assistant/transcribe/route.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const soniox = { configured: true, text: 'где моя домашка' }
vi.mock('@/lib/soniox-stt.js', () => ({
  isSonioxConfigured: () => soniox.configured,
  transcribeWavSoniox: vi.fn(async () => soniox.text),
}))
const azure = { fast: null, slow: 'үй жұмысы қайда' }
vi.mock('@/lib/ielts/azure-pronunciation.js', () => ({
  transcribeWavFast: vi.fn(async () => azure.fast),
  transcribeWav: vi.fn(async () => azure.slow),
}))
const { transcribeWavSoniox } = await import('@/lib/soniox-stt.js')
const { transcribeWavFast, transcribeWav } = await import('@/lib/ielts/azure-pronunciation.js')
const { POST } = await import('./route.js')

const wav = (bytes = 3200) => new File([new Uint8Array(bytes)], 'q.wav', { type: 'audio/wav' })
function post({ file = wav(), lang = 'ru', screen = 'homework', token = 'tok' } = {}) {
  const fd = new FormData()
  if (file) fd.append('audio', file)
  fd.append('lang', lang)
  fd.append('screen', screen)
  return POST(new Request('http://localhost/api/assistant/transcribe', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: fd,
  }))
}

let uid = 100
describe('POST /api/assistant/transcribe', () => {
  beforeEach(() => {
    authResult = { status: 'ok', user: { userId: ++uid } }
    soniox.configured = true
    soniox.text = 'где моя домашка'
    azure.fast = null
    azure.slow = 'үй жұмысы қайда'
    process.env.AZURE_SPEECH_KEY = 'a'
    process.env.AZURE_SPEECH_REGION = 'eastus'
    vi.clearAllMocks()
  })

  it('без входа — 401', async () => {
    authResult = { status: 'invalid' }
    expect((await post({ token: null })).status).toBe(401)
  })

  it('Soniox с языками интерфейса и контекстом сайта', async () => {
    const res = await post({ lang: 'kk', screen: 'homework' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'где моя домашка' })
    const [, opts] = transcribeWavSoniox.mock.calls[0]
    expect(opts.lang).toEqual(['kk', 'ru', 'en'])
    expect(opts.context.terms).toContain('Үй жұмысы')
    expect(transcribeWavFast).not.toHaveBeenCalled()
  })

  it('Soniox пусто → Azure с локалью интерфейса, fast → потоковый', async () => {
    soniox.text = ''
    const res = await post({ lang: 'kk' })
    expect(await res.json()).toEqual({ text: 'үй жұмысы қайда' })
    expect(transcribeWavFast.mock.calls[0][1].locale).toBe('kk-KZ')
    expect(transcribeWav.mock.calls[0][1]).toEqual({ locale: 'kk-KZ' })
  })

  it('ничего не распознано — пустой текст, а не ошибка', async () => {
    soniox.text = ''
    azure.slow = ''
    expect(await (await post()).json()).toEqual({ text: '' })
  })

  it('нет ни Soniox, ни Azure — 503', async () => {
    soniox.configured = false
    delete process.env.AZURE_SPEECH_KEY
    expect((await post()).status).toBe(503)
  })

  it('без файла — 400, большой — 413', async () => {
    expect((await post({ file: null })).status).toBe(400)
    expect((await post({ file: wav(1_300_000) })).status).toBe(413)
  })

  it('лимит — 429 с retryAfterSec', async () => {
    for (let i = 0; i < 20; i++) expect((await post()).status).toBe(200)
    const res = await post()
    expect(res.status).toBe(429)
    expect((await res.json()).retryAfterSec).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 4: реализация роута**

```js
// Распознавание голосового вопроса помощнику по сайту. Отдельно от
// /api/transcribe: тот настроен на английскую речь теста уровня и IELTS, а
// помощника спрашивают по-русски и по-казахски, вставляя английские слова из
// задания. И он только для вошедшего ученика, с лимитом: распознавание платное.
//
// Сначала Soniox — он держит смешанную речь в одной фразе и понимает казахский
// с подсказкой терминов сайта (sttContext.js). На 429 Soniox молча отдаёт '' —
// тогда Azure с локалью интерфейса. Запись нигде не сохраняется.

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { isSonioxConfigured, transcribeWavSoniox } from '@/lib/soniox-stt.js'
import { transcribeWav, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'
import { azureLocale, sttContext, sttLanguages } from '@/lib/assistant/sttContext.js'

export const runtime = 'nodejs'

// 30 с WAV 16 кГц mono ≈ 960 КБ плюс запас. Больше и не нужно, и нельзя: на
// прод-домене nginx мог остаться с лимитом тела 1 МБ (≈ 32 с речи).
export const MAX_BYTES = 1_200_000
const STT_TIMEOUT_MS = 20_000

const takeQuota = createRateLimiter()
const json = (status, body, headers = {}) => Response.json(body, { status, headers })
const azureConfigured = () => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)

export async function POST(request) {
  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })
  if (!isSonioxConfigured() && !azureConfigured()) return json(503, { error: 'stt_unavailable' })

  let form
  try {
    form = await request.formData()
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const file = form.get('audio')
  if (!(file instanceof File) || file.size === 0) return json(400, { error: 'bad_request' })
  if (file.size > MAX_BYTES) return json(413, { error: 'too_large' })

  const key = `user-${auth.user.userId}`
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const lang = ['ru', 'kk', 'en'].includes(form.get('lang')) ? form.get('lang') : 'ru'
  const screenId = typeof form.get('screen') === 'string' ? form.get('screen').slice(0, 64) : null
  const wav = Buffer.from(await file.arrayBuffer())

  let text = ''
  let engine = 'none'
  if (isSonioxConfigured()) {
    engine = 'soniox'
    text = await transcribeWavSoniox(wav, {
      lang: sttLanguages(lang),
      context: sttContext({ screenId }),
      timeoutMs: STT_TIMEOUT_MS,
    }).catch(() => '')
  }
  if (!text.trim() && azureConfigured()) {
    engine = 'azure'
    const locale = azureLocale(lang)
    const fast = await transcribeWavFast(wav, { locale, timeoutMs: STT_TIMEOUT_MS }).catch(() => null)
    text = fast ?? (await transcribeWav(wav, { locale }).catch(() => ''))
  }
  // В лог — чем и сколько, но не что сказал ученик.
  console.info('[assistant-stt]', JSON.stringify({ engine, lang, bytes: file.size, chars: text.length }))
  return json(200, { text: String(text || '').trim() })
}
```

- [ ] **Step 5: тесты зелёные** — `npx vitest run --dir src src/lib/assistant/sttContext.test.js src/app/api/assistant/transcribe --exclude ".claude/**"` → PASS.

- [ ] **Step 6: коммит** `feat(помощник): распознавание голосового вопроса на ru/kk/en`.

---

### Task 3: Голос Луны — общий синтез и роут озвучки

**Files:**
- Create: `src/lib/tutorVoice.js` (перенос всего синтеза из `src/app/api/tutor-tts/route.js`)
- Modify: `src/app/api/tutor-tts/route.js` (остаются POST/GET поверх `tutorVoice.js`)
- Create: `src/lib/tutorVoice.test.js`
- Create: `src/app/api/assistant/speak/route.js`, `src/app/api/assistant/speak/route.test.js`

**Interfaces:**
- Produces: `synth(provider, text, tutor, lang) → Promise<{audio, contentType} | {status: 503}>` (бросает на сбой провайдера);
  `synthTutor(tutor, text, lang)` — провайдер тьютора + откат на Soniox при 503 (поведение прежнего POST);
  `providerStatus() → { gemini, soniox, eleven, fish, openai }`;
  `voiceLang(text, lang) → 'kk'|'ru'|'en'`;
  `POST /api/assistant/speak` `{ text, lang }` → аудио (`x-assistant-voice: gemini|soniox`) | 400 | 401 | 429 | 502.

- [ ] **Step 1: перенос.** Скопировать из `tutor-tts/route.js` в `src/lib/tutorVoice.js` всё от констант до `function synth` (шапку-комментарий о провайдерах тоже), поправить импорт на `import { normalizeForSpeech, openaiInstructions, openaiSpeed } from '../tutor/openaiTtsStyle.js'`, экспортировать `synth`, `TUTOR_PROVIDER`, `DEFAULT_PROVIDER`, `FALLBACK_PROVIDER` и добавить:

```js
/** Голос тьютора по его ключу; провайдер не настроен (503) — откат на Soniox, как у агента. */
export async function synthTutor(tutor, text, lang) {
  const provider = TUTOR_PROVIDER[tutor] || DEFAULT_PROVIDER
  let result = await synth(provider, text, tutor, lang)
  if (result.status === 503 && provider !== FALLBACK_PROVIDER) {
    result = await synth(FALLBACK_PROVIDER, text, tutor, lang)
  }
  return result
}

export function providerStatus() {
  return {
    gemini: Boolean(process.env.GOOGLE_CREDENTIALS_JSON),
    soniox: Boolean(process.env.SONIOX_API_KEY),
    eleven: Boolean(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY),
    fish: Boolean(process.env.FISH_AUDIO_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY || process.env.OpenAI_API_KEY),
  }
}
```

Роут `tutor-tts/route.js` сводится к шапке, разбору тела и:

```js
import { providerStatus, synthTutor } from '@/lib/tutorVoice.js'
export const runtime = 'nodejs'
const MAX_TEXT = 1200
export async function POST(request) {
  /* разбор тела — как было */
  try {
    const result = await synthTutor(tutor, text, lang)
    if (result.status === 503) return Response.json({ error: 'TTS is not configured on the server.' }, { status: 503 })
    return new Response(result.audio, { headers: { 'Content-Type': result.contentType, 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[tutor-tts] failed', e)
    return Response.json({ error: 'TTS failed.' }, { status: 502 })
  }
}
export async function GET() {
  return Response.json(providerStatus())
}
```

- [ ] **Step 2: тест общего синтеза (откат Луны без ключа Google)**

```js
// src/lib/tutorVoice.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { synthTutor } from './tutorVoice.js'

describe('synthTutor', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_CREDENTIALS_JSON
    process.env.SONIOX_API_KEY = 's'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('Луна без ключа Google — откат на Soniox голосом Grace', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await synthTutor('luna', 'Привет', 'ru')
    expect(r.contentType).toBe('audio/mpeg')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(fetchMock.mock.calls[0][0]).toBe('https://tts-rt.soniox.com/tts')
    expect(body).toMatchObject({ voice: 'Grace', language: 'ru', text: 'Привет' })
  })

  it('kz → язык Soniox kk', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await synthTutor('luna', 'Сәлем', 'kz')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe('kk')
  })
})
```

- [ ] **Step 3: тесты роута озвучки**

```js
// src/app/api/assistant/speak/route.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const impl = { gemini: null, soniox: null }
vi.mock('@/lib/tutorVoice.js', () => ({
  synth: vi.fn(async (provider) => impl[provider]()),
}))
const { synth } = await import('@/lib/tutorVoice.js')
const { POST, voiceLang } = await import('./route.js')

const audio = (type) => async () => ({ audio: Buffer.from([1, 2]), contentType: type })
const post = (body, token = 'tok') => POST(new Request('http://localhost/api/assistant/speak', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
}))

let uid = 500
describe('POST /api/assistant/speak', () => {
  beforeEach(() => {
    authResult = { status: 'ok', user: { userId: ++uid } }
    impl.gemini = audio('audio/wav')
    impl.soniox = audio('audio/mpeg')
    synth.mockClear()
  })

  it('язык фразы', () => {
    expect(voiceLang('Домашка в разделе «Үй жұмысы»', 'ru')).toBe('kk')
    expect(voiceLang('Откройте «Практику»', 'ru')).toBe('ru')
    expect(voiceLang('Open Practice', 'en')).toBe('en')
    expect(voiceLang('Ашыңыз', 'kk')).toBe('kk')
  })

  it('без входа — 401, пустой текст — 400', async () => {
    authResult = { status: 'invalid' }
    expect((await post({ text: 'Привет' }, null)).status).toBe(401)
    authResult = { status: 'ok', user: { userId: ++uid } }
    expect((await post({ text: '  ' })).status).toBe(400)
  })

  it('русский — голос Луны Gemini «Aoede»', async () => {
    const res = await post({ text: 'Откройте «Практику».', lang: 'ru' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/wav')
    expect(res.headers.get('x-assistant-voice')).toBe('gemini')
    expect(synth).toHaveBeenCalledWith('gemini', 'Откройте «Практику».', 'luna', 'ru')
  })

  it('казахский — сразу Soniox «Grace»', async () => {
    const res = await post({ text: 'Тәжірибе бөлімін ашыңыз.', lang: 'kk' })
    expect(res.headers.get('x-assistant-voice')).toBe('soniox')
    expect(synth).toHaveBeenCalledTimes(1)
    expect(synth).toHaveBeenCalledWith('soniox', 'Тәжірибе бөлімін ашыңыз.', 'luna', 'kk')
  })

  it('Gemini упал или не настроен — Soniox той же фразой', async () => {
    impl.gemini = async () => { throw new Error('quota') }
    expect((await post({ text: 'Привет', lang: 'ru' })).headers.get('x-assistant-voice')).toBe('soniox')
    impl.gemini = async () => ({ status: 503 })
    expect((await post({ text: 'Привет', lang: 'ru' })).headers.get('x-assistant-voice')).toBe('soniox')
  })

  it('оба упали — 502', async () => {
    impl.gemini = async () => { throw new Error('x') }
    impl.soniox = async () => { throw new Error('y') }
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(502)
  })

  it('длинный текст подрезается до 600 символов', async () => {
    await post({ text: 'а'.repeat(900), lang: 'ru' })
    expect(synth.mock.calls[0][1]).toHaveLength(600)
  })

  it('лимит — 429', async () => {
    for (let i = 0; i < 100; i++) await post({ text: 'Привет', lang: 'ru' })
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(429)
  })
})
```

- [ ] **Step 4: реализация роута**

```js
// Озвучка ответа помощника — голосом Луны, как в её звонке (Gemini Cloud TTS,
// «Aoede»): помощник на сайте — это Луна. Синтез общий с /api/tutor-tts
// (lib/tutorVoice.js), чтобы голос не разъехался с тьютором.
//
// Казахского у Gemini нет — казахская фраза сразу идёт в Soniox «Grace» (тот
// же откатный голос Луны, что у агента). И любой сбой Gemini — тоже в Soniox:
// квота Gemini общая со звонками Луны, и ответ помощника не должен молчать
// из-за того, что её съел звонок.
//
// Только для вошедшего ученика и с лимитом: синтез платный, а ответ на один
// вопрос — 2–4 фразы.

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { synth } from '@/lib/tutorVoice.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'

export const runtime = 'nodejs'
export const MAX_TEXT = 600

const takeQuota = createRateLimiter({ windowLimit: 100, dayLimit: 800 })
const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/
const json = (status, body, headers = {}) => Response.json(body, { status, headers })

/** Язык фразы для голоса: казахские буквы или казахский интерфейс — kk. */
export function voiceLang(text, lang) {
  if (lang === 'kk' || KK_LETTERS.test(String(text || ''))) return 'kk'
  return lang === 'en' ? 'en' : 'ru'
}

async function trySynth(provider, text, lang) {
  try {
    const r = await synth(provider, text, 'luna', lang)
    return r?.audio ? r : null
  } catch (e) {
    console.warn(`[assistant-speak] ${provider} failed:`, e?.message || e)
    return null
  }
}

export async function POST(request) {
  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })

  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''
  if (!text) return json(400, { error: 'bad_request' })

  const key = `user-${auth.user.userId}`
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const lang = voiceLang(text, body?.lang)
  let voice = 'soniox'
  let result = null
  if (lang !== 'kk') {
    result = await trySynth('gemini', text, lang)
    if (result) voice = 'gemini'
  }
  result ??= await trySynth('soniox', text, lang)
  if (!result) {
    takeQuota.refund(key)
    return json(502, { error: 'tts_failed' })
  }
  return new Response(result.audio, {
    headers: { 'content-type': result.contentType, 'cache-control': 'no-store', 'x-assistant-voice': voice },
  })
}
```

- [ ] **Step 5: тесты зелёные** — `npx vitest run --dir src src/lib/tutorVoice.test.js src/app/api/assistant/speak --exclude ".claude/**"` → PASS.

- [ ] **Step 6: коммит** `feat(помощник): озвучка ответа голосом Луны; синтез тьютора — в lib/tutorVoice`.

---

### Task 4: Ответ для голоса и имя Луны в промпте

**Files:**
- Modify: `src/lib/assistant/prompt.js` (`RULES` — первая строка, `parseChatRequest`, `buildContextBlock`, `buildTurns`)
- Modify: `src/lib/assistant/client.js` (`askAssistant` — поле `voice`)
- Test: `src/lib/assistant/prompt.test.js`

**Interfaces:**
- Produces: `VOICE_NOTE` (строка); `parseChatRequest(body).voice: boolean`; `buildContextBlock({ …, voice })`; `askAssistant({ …, voice })`.

- [ ] **Step 1: тесты**

```js
// дописать в src/lib/assistant/prompt.test.js
import { VOICE_NOTE, buildContextBlock, buildSystemPrompt, parseChatRequest } from './prompt.js'

describe('голосовой вопрос', () => {
  const base = { messages: [{ role: 'user', content: 'где домашка' }] }
  it('флаг voice разбирается и по умолчанию false', () => {
    expect(parseChatRequest(base).voice).toBe(false)
    expect(parseChatRequest({ ...base, voice: true }).voice).toBe(true)
  })
  it('строка про озвучку — только у голосового вопроса', () => {
    expect(buildContextBlock({ screen: { text: 'x' }, lang: 'ru', voice: true })).toContain(VOICE_NOTE)
    expect(buildContextBlock({ screen: { text: 'x' }, lang: 'ru' })).not.toContain(VOICE_NOTE)
  })
  it('помощника зовут Луна', () => {
    expect(buildSystemPrompt()).toMatch(/^Ты — Луна, помощник на сайте/)
  })
})
```

- [ ] **Step 2: реализация.** В `prompt.js`:

```js
// Голосовой вопрос: ответ прочитают вслух, а слушать список из семи пунктов и
// «звёздочки» невозможно. Строка едет в контексте последнего сообщения, а не в
// системном промпте — кэш правил не ломается.
export const VOICE_NOTE =
  'Ученик спросил голосом, ответ будет озвучен: 2–4 коротких предложения, без списков, без выделения и без ссылок; английские слова и примеры — в кавычках «…».'
```

- `RULES` начинается с `Ты — Луна, помощник на сайте онлайн-школы английского Just to Study (JTS). Ты встроена в сайт ученика и отвечаешь в окне чата.`
- `parseChatRequest` возвращает ещё `voice: Boolean(body.voice)`.
- `buildContextBlock({ user, screen, lang, studentContext, errors, pageUrl, voice })`: перед `return` — `if (voice) lines.push(VOICE_NOTE)`.
- `buildTurns({ messages, user, screen, lang, studentContext, errors, pageUrl, voice })` — передаёт `voice` в `buildContextBlock`.

В `client.js`: параметр `voice` в `askAssistant` и в теле `voice: Boolean(voice)`.

- [ ] **Step 3: тесты зелёные** — `npx vitest run --dir src src/lib/assistant src/app/api/assistant/chat --exclude ".claude/**"` → PASS (существующие тесты промпта, проверяющие первую строку правил, поправить на «Луна»).

- [ ] **Step 4: коммит** `feat(помощник): Луна по имени и короткий ответ на голосовой вопрос`.

---

### Task 5: Нарезка ответа на фразы

**Files:**
- Create: `src/lib/assistant/speechChunks.js`, `src/lib/assistant/speechChunks.test.js`

**Interfaces:**
- Produces: `cleanForSpeech(text) → string`; `createSpeechChunker({ firstMin?, nextMin?, max? }) → { push(chunk) → string[], flush() → string[] }`.

- [ ] **Step 1: тесты**

```js
// src/lib/assistant/speechChunks.test.js
import { describe, it, expect } from 'vitest'
import { cleanForSpeech, createSpeechChunker } from './speechChunks.js'

describe('cleanForSpeech', () => {
  it('снимает разметку и метки', () => {
    expect(cleanForSpeech('**Практика** — раздел.\n- Откройте её\n[[REPORT_BUG]]')).toBe('Практика — раздел.\nОткройте её')
  })
})

describe('createSpeechChunker', () => {
  const run = (parts, opts) => {
    const c = createSpeechChunker(opts)
    return [...parts.flatMap((p) => c.push(p)), ...c.flush()]
  }

  it('первая фраза уходит, как только кончилось предложение длиной ≥ 30', () => {
    const c = createSpeechChunker()
    expect(c.push('Домашка лежит в разделе «Домашняя работа». ')).toEqual(['Домашка лежит в разделе «Домашняя работа».'])
  })

  it('короткое первое предложение ждёт следующего', () => {
    const c = createSpeechChunker()
    expect(c.push('Конечно! ')).toEqual([])
    expect(c.push('Откройте меню слева и выберите раздел. ')).toEqual(['Конечно! Откройте меню слева и выберите раздел.'])
  })

  it('без пробела после точки фраза ждёт продолжения или конца', () => {
    const c = createSpeechChunker()
    expect(c.push('Домашка лежит в разделе «Домашняя работа».')).toEqual([])
    expect(c.flush()).toEqual(['Домашка лежит в разделе «Домашняя работа».'])
  })

  it('следующие фразы склеиваются до ≥ 120 символов', () => {
    const s = 'Это предложение ровно для проверки склейки. '
    const out = run(['Первое предложение достаточно длинное. ', s, s, s, s])
    expect(out[0]).toBe('Первое предложение достаточно длинное.')
    expect(out[1].length).toBeGreaterThanOrEqual(120)
  })

  it('потолок 400: режет по концу предложения, иначе по запятой или пробелу', () => {
    const long = `${'слово '.repeat(90)}конец.`
    const out = run([long])
    expect(out.every((p) => p.length <= 400)).toBe(true)
    expect(out.join(' ').replace(/\s+/g, ' ')).toBe(long.trim())
  })

  it('разметка не озвучивается даже на стыке кусков', () => {
    expect(run(['Откройте **Прак', 'тику** в меню слева, там всё есть. '])).toEqual(['Откройте Практику в меню слева, там всё есть.'])
  })

  it('пустые и служебные куски не дают фраз', () => {
    expect(run(['- ', '\n', '[[REPORT_BUG]]'])).toEqual([])
  })
})
```

- [ ] **Step 2: реализация**

```js
// Нарезка потока ответа помощника на фразы для озвучки. Синтез Луны (Gemini)
// не потоковый — фраза приходит целиком, — поэтому первая фраза уходит, как
// только дописано первое предложение: чем она короче, тем раньше ученик
// услышит ответ. Дальше фразы крупнее — меньше вызовов синтеза и пауз между
// ними. Разметку (**…**, «- ») и служебные метки вслух не читаем.

export const FIRST_MIN = 30
export const NEXT_MIN = 120
export const MAX_CHUNK = 400

// Конец предложения — знак и пробел/перевод строки после него: пока пробела
// нет, это может быть «3.5» или середина «…». Перевод строки — тоже конец.
const SENTENCE_END = /[.!?…]+[»"”)]*(?=\s)|\n/g

export function cleanForSpeech(text) {
  return String(text ?? '')
    .replace(/\[\[[A-Z_]+\]\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/^[ \t]*[-•][ \t]+/gm, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

function ends(buf) {
  const out = []
  SENTENCE_END.lastIndex = 0
  let m
  while ((m = SENTENCE_END.exec(buf))) out.push(m.index + m[0].length)
  return out
}

function softCut(buf, max) {
  const head = buf.slice(0, max)
  const comma = head.lastIndexOf(', ')
  if (comma > max / 2) return comma + 1
  const space = head.lastIndexOf(' ')
  return space > 0 ? space : max
}

export function createSpeechChunker({ firstMin = FIRST_MIN, nextMin = NEXT_MIN, max = MAX_CHUNK } = {}) {
  let buf = ''
  let emitted = 0

  function take(final) {
    const out = []
    const emit = (raw) => {
      const t = cleanForSpeech(raw)
      if (t) {
        out.push(t)
        emitted++
      }
    }
    for (;;) {
      const min = emitted === 0 ? firstMin : nextMin
      const all = ends(buf)
      let cut = all.find((e) => e >= min) ?? -1
      if (cut > max || (cut < 0 && buf.length > max)) {
        const fit = all.filter((e) => e <= max).pop()
        cut = fit ?? softCut(buf, max)
      }
      if (cut < 0) break
      emit(buf.slice(0, cut))
      buf = buf.slice(cut)
    }
    if (final) {
      emit(buf)
      buf = ''
    }
    return out
  }

  return {
    push(chunk) {
      buf += String(chunk ?? '')
      return take(false)
    },
    flush() {
      return take(true)
    },
  }
}
```

Замечание к тесту «разметка на стыке»: `**` снимаются в `cleanForSpeech` у готовой фразы, а режем мы буфер целиком — поэтому разорванная пара `**Прак` + `тику**` оказывается в одной фразе.

- [ ] **Step 3: тесты зелёные** — `npx vitest run --dir src src/lib/assistant/speechChunks.test.js --exclude ".claude/**"` → PASS.

- [ ] **Step 4: коммит** `feat(помощник): нарезка ответа на фразы для озвучки`.

---

### Task 6: Очередь озвучки

**Files:**
- Create: `src/lib/assistant/voiceQueue.js`, `src/lib/assistant/voiceQueue.test.js`

**Interfaces:**
- Consumes: `playUrl(src, { onStart, onEnd, onFail })`, `stopTts()` из `src/lib/speech.js`; `POST /api/assistant/speak`.
- Produces: `createVoiceQueue({ token, lang, fetchImpl?, play?, stopSound?, onFinish? }) → { say(text), end(), stop() }`; `onFinish({ played, failed })` — один раз, когда очередь доиграна после `end()`; после `stop()` не зовётся.

- [ ] **Step 1: тесты**

```js
// src/lib/assistant/voiceQueue.test.js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVoiceQueue } from './voiceQueue.js'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('очередь озвучки', () => {
  let played, fetchMock, play
  beforeEach(() => {
    played = []
    let n = 0
    URL.createObjectURL = vi.fn(() => `blob:${++n}`)
    URL.revokeObjectURL = vi.fn()
    fetchMock = vi.fn(async () => new Response(new Blob([new Uint8Array([1])]), { status: 200 }))
    // «Звук»: стартует сразу, кончается по команде теста.
    play = vi.fn((src, { onStart, onEnd }) => {
      played.push(src)
      onStart?.()
      play.finish = onEnd
      return true
    })
  })

  const queue = (extra = {}) => createVoiceQueue({ token: 't', lang: 'ru', fetchImpl: fetchMock, play, stopSound: vi.fn(), ...extra })

  it('играет фразы по порядку и запрашивает следующую, пока звучит текущая', async () => {
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая фраза.')
    q.say('Вторая фраза.')
    q.end()
    await tick(); await tick()
    expect(played).toEqual(['blob:1'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: 'Первая фраза.', lang: 'ru' })
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer t')
    play.finish(); await tick(); await tick()
    expect(played).toEqual(['blob:1', 'blob:2'])
    play.finish(); await tick()
    expect(onFinish).toHaveBeenCalledWith({ played: 2, failed: 0 })
  })

  it('казахская первая фраза — весь ответ идёт с lang kk', async () => {
    const q = queue()
    q.say('Тәжірибе бөлімін ашыңыз.')
    q.say('Потом нажмите «Проверить».')
    await tick(); await tick()
    expect(fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).lang)).toEqual(['kk', 'kk'])
  })

  it('фраза не синтезировалась — пропускается, очередь идёт дальше', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }))
    const onFinish = vi.fn()
    const q = queue({ onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    q.end()
    await tick(); await tick(); await tick()
    expect(played).toHaveLength(1)
    play.finish(); await tick()
    expect(onFinish).toHaveBeenCalledWith({ played: 1, failed: 1 })
  })

  it('stop обрывает звук и всё, что ещё не прозвучало', async () => {
    const stopSound = vi.fn()
    const onFinish = vi.fn()
    const q = queue({ stopSound, onFinish })
    q.say('Первая.')
    q.say('Вторая.')
    await tick(); await tick()
    q.stop()
    expect(stopSound).toHaveBeenCalled()
    expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(true)
    play.finish?.(); await tick()
    expect(played).toEqual(['blob:1'])
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('stop до первого звука чужую реплику не трогает', () => {
    const stopSound = vi.fn()
    queue({ stopSound }).stop()
    expect(stopSound).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: реализация**

```js
// Очередь озвучки ответа помощника: фраза → /api/assistant/speak → blob →
// общий <audio> из speech.js (разрешение iPhone живёт на нём, и его дал тап
// по микрофону). Следующая фраза запрашивается, пока звучит текущая, — между
// фразами нет паузы на синтез. Голос один на весь ответ: если первая фраза
// казахская, весь ответ идёт с lang kk (иначе Луна посреди ответа сменила бы
// тембр).

import { playUrl, stopTts } from '../speech.js'

const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/

export function createVoiceQueue({
  token,
  lang = 'ru',
  fetchImpl = (...args) => fetch(...args),
  play = playUrl,
  stopSound = stopTts,
  onFinish,
} = {}) {
  const items = [] // { text, url: Promise<string|null> | null }
  const urls = new Set()
  const ctrl = new AbortController()
  let idx = 0
  let busy = false
  let ended = false
  let stopped = false
  let sounding = false
  let finished = false
  let voiceLang = null
  let played = 0
  let failed = 0

  const revoke = (u) => {
    if (u && urls.delete(u)) URL.revokeObjectURL(u)
  }

  function load(item) {
    item.url ??= fetchImpl('/api/assistant/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: item.text, lang: voiceLang }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || stopped) return null
        const u = URL.createObjectURL(b)
        urls.add(u)
        return u
      })
      .catch(() => null)
    return item.url
  }

  function finish() {
    if (finished || stopped) return
    finished = true
    onFinish?.({ played, failed })
  }

  async function pump() {
    if (busy || stopped) return
    if (idx >= items.length) {
      if (ended) finish()
      return
    }
    busy = true
    const item = items[idx]
    if (items[idx + 1]) load(items[idx + 1])
    const url = await load(item)
    if (stopped) return
    if (url) {
      await new Promise((resolve) => {
        const ok = play(url, {
          onStart: () => {
            sounding = true
          },
          onEnd: () => {
            played++
            resolve()
          },
          onFail: () => {
            failed++
            resolve()
          },
        })
        if (ok === false) resolve()
      })
      sounding = false
      revoke(url)
    } else failed++
    if (stopped) return
    idx++
    busy = false
    pump()
  }

  return {
    say(text) {
      const t = String(text ?? '').trim()
      if (!t || stopped) return
      voiceLang ??= lang === 'kk' || KK_LETTERS.test(t) ? 'kk' : lang
      items.push({ text: t, url: null })
      if (busy && items.length - 1 === idx + 1) load(items[idx + 1])
      pump()
    },
    end() {
      ended = true
      pump()
    },
    stop() {
      if (stopped) return
      stopped = true
      ctrl.abort()
      if (sounding || busy) stopSound()
      for (const u of [...urls]) revoke(u)
    },
  }
}
```

Важно для теста «stop до первого звука»: `busy` и `sounding` ложны — `stopSound` не зовётся. В тесте «stop обрывает» `busy` истинно (идёт первая фраза).

- [ ] **Step 3: тесты зелёные** — `npx vitest run --dir src src/lib/assistant/voiceQueue.test.js --exclude ".claude/**"` → PASS.

- [ ] **Step 4: коммит** `feat(помощник): очередь озвучки ответа по фразам`.

---

### Task 7: Запись вопроса с остановкой на тишине

**Files:**
- Create: `src/lib/assistant/endpointer.js`, `src/lib/assistant/endpointer.test.js`
- Create: `src/lib/assistant/useVoiceQuestion.js`

**Interfaces:**
- Consumes: `useRecorder()` (`{ state, error, elapsed, stream, start({ maxSec, onDone }), stop(), drop(url) }`), `isMediaRecordingSupported()`, `createVoiceActivity(noiseFloor)`, `analyseFrame`, `pitched`.
- Produces: `createEndpointer({ silenceMs?, noVoiceMs? }) → (voiced, now) → 'go'|'end'|'no_voice'`;
  `useVoiceQuestion({ token, lang, screenId, onText }) → { supported, state: 'idle'|'recording'|'transcribing', elapsed, error: null|'denied'|'not_heard'|'stt_failed'|'rate'|'auth', retryAfterSec, toggle(), cancel() }`.

- [ ] **Step 1: тесты конца речи**

```js
// src/lib/assistant/endpointer.test.js
import { describe, it, expect } from 'vitest'
import { createEndpointer } from './endpointer.js'

describe('конец вопроса', () => {
  it('тишина до речи — ждём до 8 с, потом no_voice', () => {
    const e = createEndpointer()
    expect(e(false, 0)).toBe('go')
    expect(e(false, 7900)).toBe('go')
    expect(e(false, 8000)).toBe('no_voice')
  })
  it('после речи 1.5 с тишины — end', () => {
    const e = createEndpointer()
    e(false, 0)
    e(true, 1000)
    expect(e(false, 2000)).toBe('go')
    expect(e(false, 2500)).toBe('end')
  })
  it('пауза меньше порога не обрывает', () => {
    const e = createEndpointer()
    e(true, 0)
    e(false, 1400)
    expect(e(true, 1450)).toBe('go')
    expect(e(false, 2900)).toBe('go')
  })
})
```

- [ ] **Step 2: реализация `endpointer.js`**

```js
// Когда ученик договорил вопрос. Пока голоса не было — ждём (думает, ищет
// слова) до NO_VOICE_MS, потом сдаёмся: молчащая запись ушла бы в платное
// распознавание впустую. После речи конец — SILENCE_END_MS тишины: короче
// режет фразу на запинке, длиннее — ученик ждёт и не понимает, услышали ли его.
export const SILENCE_END_MS = 1500
export const NO_VOICE_MS = 8000

export function createEndpointer({ silenceMs = SILENCE_END_MS, noVoiceMs = NO_VOICE_MS } = {}) {
  let start = null
  let heard = false
  let lastVoice = 0
  return (voiced, now) => {
    start ??= now
    if (voiced) {
      heard = true
      lastVoice = now
      return 'go'
    }
    if (!heard) return now - start >= noVoiceMs ? 'no_voice' : 'go'
    return now - lastVoice >= silenceMs ? 'end' : 'go'
  }
}
```

- [ ] **Step 3: хук `useVoiceQuestion.js`** (браузерный, проверяется виджетом и e2e)

```js
'use client'

// Голосовой вопрос помощнику: нажал — говорит — запись сама кончается на
// тишине (endpointer.js) или вторым нажатием, потом распознавание
// /api/assistant/transcribe и onText(текст). Микрофон — тот же useRecorder,
// что у IELTS (WAV 16 кГц), порог голоса — тот же, что у Аркады
// (voiceActivity.js): от шума комнаты и пика гласных самого ученика, иначе
// тихий ноутбук «молчал» бы весь вопрос.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecorder } from '../../ielts/speaking/useRecorder.js'
import { isMediaRecordingSupported } from '../ielts-audio.js'
import { createVoiceActivity } from '../../practice/arcade/voiceActivity.js'
import { analyseFrame, pitched } from '../../practice/arcade/voiceFeatures.js'
import { createEndpointer } from './endpointer.js'

export const MAX_QUESTION_SEC = 30
const FRAME_MS = 100
const CALIBRATE_MS = 300

export function useVoiceQuestion({ token, lang, screenId, onText }) {
  const rec = useRecorder()
  const [supported, setSupported] = useState(false)
  const [busy, setBusy] = useState(false) // распознавание
  const [error, setError] = useState(null)
  const [retryAfterSec, setRetryAfterSec] = useState(null)
  const noVoiceRef = useRef(false)
  const cancelledRef = useRef(false)
  const ctx = useRef({})
  ctx.current = { token, lang, screenId, onText }

  // Проверка после гидратации: на сервере MediaRecorder нет, и разметка разошлась бы.
  useEffect(() => setSupported(isMediaRecordingSupported()), [])

  useEffect(() => {
    if (rec.error === 'denied') setError('denied')
    else if (rec.error === 'failed') setError('stt_failed')
  }, [rec.error])

  // Слушаем тишину, пока идёт запись.
  const recording = rec.state === 'recording'
  useEffect(() => {
    const stream = rec.stream
    if (!recording || !stream) return undefined
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!Ctx) return undefined
    const ac = new Ctx()
    const src = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const t0 = performance.now()
    let noise = Infinity
    let detect = null
    const endpoint = createEndpointer()
    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(buf)
      const now = performance.now()
      const f = analyseFrame(buf, ac.sampleRate)
      if (now - t0 < CALIBRATE_MS) {
        noise = Math.min(noise, f.volume)
        return
      }
      detect ??= createVoiceActivity(Number.isFinite(noise) ? noise : 0.002)
      const verdict = endpoint(detect(f.volume, now, pitched(f)), now)
      if (verdict === 'end') rec.stop()
      if (verdict === 'no_voice') {
        noVoiceRef.current = true
        rec.stop()
      }
    }, FRAME_MS)
    return () => {
      clearInterval(id)
      src.disconnect()
      ac.close().catch(() => {})
    }
  }, [recording, rec.stream, rec.stop])

  const transcribe = useCallback(async (out) => {
    const { token: tk, lang: lg, screenId: scr, onText: cb } = ctx.current
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('audio', new File([out.wav], 'question.wav', { type: 'audio/wav' }))
      fd.append('lang', lg || 'ru')
      if (scr) fd.append('screen', scr)
      const res = await fetch('/api/assistant/transcribe', {
        method: 'POST',
        headers: { authorization: `Bearer ${tk}` },
        body: fd,
      })
      if (res.status === 401) return setError('auth')
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setRetryAfterSec(body.retryAfterSec ?? 60)
        return setError('rate')
      }
      if (!res.ok) return setError('stt_failed')
      const { text } = await res.json()
      if (!String(text || '').trim()) return setError('not_heard')
      cb?.(String(text).trim())
    } catch {
      setError('stt_failed')
    } finally {
      rec.drop(out.url)
      setBusy(false)
    }
  }, [rec])

  const start = useCallback(async () => {
    setError(null)
    noVoiceRef.current = false
    cancelledRef.current = false
    await rec.start({
      maxSec: MAX_QUESTION_SEC,
      onDone: (out) => {
        if (!out) return
        if (cancelledRef.current) return rec.drop(out.url)
        if (noVoiceRef.current) {
          rec.drop(out.url)
          return setError('not_heard')
        }
        transcribe(out)
      },
    })
  }, [rec, transcribe])

  const toggle = useCallback(() => {
    if (busy || rec.state === 'processing') return
    if (rec.state === 'recording') rec.stop()
    else start()
  }, [busy, rec, start])

  // Окно закрыли посреди записи — запись в мусор, не в распознавание.
  const cancel = useCallback(() => {
    cancelledRef.current = true
    rec.stop()
  }, [rec])

  const state = rec.state === 'recording' ? 'recording' : busy || rec.state === 'processing' ? 'transcribing' : 'idle'
  return { supported, state, elapsed: rec.elapsed, error, retryAfterSec, toggle, cancel, clearError: () => setError(null) }
}
```

- [ ] **Step 4: тесты зелёные** — `npx vitest run --dir src src/lib/assistant/endpointer.test.js --exclude ".claude/**"` → PASS.

- [ ] **Step 5: коммит** `feat(помощник): запись голосового вопроса с остановкой на тишине`.

---

### Task 8: Окно чата — микрофон, автоозвучка, Луна

**Files:**
- Modify: `src/components/AssistantWidget.jsx`
- Modify: `src/assistant.css`
- Modify: `src/i18n.jsx` (ru/en/kk блоки `assistant.*`)
- Modify: `src/lib/assistant/knowledge.js` (статьи `about` и `problems` — помощник Луна, голосом)
- Test: `src/components/AssistantWidget.voice.test.jsx` (новый); правка `src/components/AssistantWidget.test.jsx` (имя окна «Луна»)

**Interfaces:**
- Consumes: `useVoiceQuestion` (Task 7), `createVoiceQueue` (Task 6), `createSpeechChunker` (Task 5), `askAssistant({ …, voice })` (Task 4), `unlockSpeech` из `speech.js`.

- [ ] **Step 1: строки i18n.** В каждом из трёх блоков:

ru:
```js
'assistant.title': 'Луна',
'assistant.sub': 'Помощник JTS: сайт, задания, ошибки',
'assistant.hello': 'Здравствуйте! Я Луна, помощник JTS. Я вижу ваш экран и знаю, как устроен сайт. Спросите текстом или голосом — кнопкой с микрофоном: почему ответ не засчитан, как работает раздел — или напишите, если что-то сломалось: сначала попробую помочь сама, если не выйдет — передам ошибку команде.',
'assistant.privacy': 'Луна видит текст текущего экрана, чтобы ответить по делу. Пароли, email и телефон она не видит. Голос распознаётся и не сохраняется. Сообщения про поломку сайта могут сохраниться у команды.',
'assistant.mic.start': 'Спросить голосом',
'assistant.mic.stop': 'Закончить вопрос',
'assistant.mic.listening': 'Слушаю… {sec}',
'assistant.mic.transcribing': 'Распознаю…',
'assistant.mic.denied': 'Нет доступа к микрофону. Разрешите его в настройках браузера (значок замка в адресной строке) или напишите вопрос.',
'assistant.mic.notHeard': 'Не расслышала. Попробуйте ещё раз или напишите вопрос.',
'assistant.mic.failed': 'Не получилось распознать. Попробуйте ещё раз или напишите вопрос.',
'assistant.sound.mute': 'Выключить озвучку ответов',
'assistant.sound.unmute': 'Включить озвучку ответов',
'assistant.voice.asked': 'Вопрос голосом',
'assistant.voice.failed': 'Не удалось озвучить ответ',
```

en:
```js
'assistant.title': 'Luna',
'assistant.sub': 'JTS assistant: site, exercises, errors',
'assistant.hello': "Hi! I'm Luna, the JTS assistant. I can see your screen and I know how the site works. Ask by text or by voice with the microphone button: why an answer was not accepted, how a section works — or tell me if something broke: I will try to help, and if I cannot, I will pass the error to the team.",
'assistant.privacy': 'Luna reads the text of the current screen to give a relevant answer. She does not see passwords, email or phone. Your voice is transcribed and not stored. Messages about a site bug may be stored for the team.',
'assistant.mic.start': 'Ask by voice',
'assistant.mic.stop': 'Finish the question',
'assistant.mic.listening': 'Listening… {sec}',
'assistant.mic.transcribing': 'Recognising…',
'assistant.mic.denied': 'No microphone access. Allow it in the browser settings (the lock icon in the address bar) or type your question.',
'assistant.mic.notHeard': "I didn't catch that. Try again or type your question.",
'assistant.mic.failed': 'Could not recognise the question. Try again or type it.',
'assistant.sound.mute': 'Turn off spoken answers',
'assistant.sound.unmute': 'Turn on spoken answers',
'assistant.voice.asked': 'Asked by voice',
'assistant.voice.failed': 'Could not play the answer',
```

kk:
```js
'assistant.title': 'Луна',
'assistant.sub': 'JTS көмекшісі: сайт, тапсырмалар, қателер',
'assistant.hello': 'Сәлеметсіз бе! Мен Луна, JTS көмекшісімін. Экраныңызды көремін және сайттың қалай жұмыс істейтінін білемін. Мәтінмен немесе микрофон батырмасымен дауыспен сұраңыз: жауап неге қабылданбағанын, бөлім қалай жұмыс істейтінін — немесе бірдеңе сынса, жазыңыз: алдымен өзім көмектесемін, болмаса қатені командаға жіберемін.',
'assistant.privacy': 'Луна нақты жауап беру үшін ағымдағы экрандағы мәтінді көреді. Құпиясөзді, email мен телефонды көрмейді. Дауыс мәтінге айналады және сақталмайды. Сайт сынғаны туралы хабарламалар командада сақталуы мүмкін.',
'assistant.mic.start': 'Дауыспен сұрау',
'assistant.mic.stop': 'Сұрақты аяқтау',
'assistant.mic.listening': 'Тыңдап тұрмын… {sec}',
'assistant.mic.transcribing': 'Танып жатырмын…',
'assistant.mic.denied': 'Микрофонға рұқсат жоқ. Браузер баптауларында рұқсат беріңіз (мекенжай жолындағы құлып белгісі) немесе сұрағыңызды жазыңыз.',
'assistant.mic.notHeard': 'Естімей қалдым. Қайталап көріңіз немесе сұрағыңызды жазыңыз.',
'assistant.mic.failed': 'Сұрақты тану мүмкін болмады. Қайталап көріңіз немесе жазыңыз.',
'assistant.sound.mute': 'Жауаптарды дыбыстауды өшіру',
'assistant.sound.unmute': 'Жауаптарды дыбыстауды қосу',
'assistant.voice.asked': 'Дауыспен сұрақ',
'assistant.voice.failed': 'Жауапты дыбыстау мүмкін болмады',
```

- [ ] **Step 2: тесты виджета** (`AssistantWidget.voice.test.jsx`, хук записи подменён — сам хук проверяется e2e)

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const voice = vi.hoisted(() => ({ props: null, state: 'idle', error: null, toggle: vi.fn(), cancel: vi.fn() }))
vi.mock('../lib/assistant/useVoiceQuestion.js', () => ({
  useVoiceQuestion: (props) => {
    voice.props = props
    return { supported: true, state: voice.state, elapsed: 3, error: voice.error, retryAfterSec: null,
      toggle: voice.toggle, cancel: voice.cancel, clearError: vi.fn() }
  },
}))
const queue = vi.hoisted(() => ({ said: [], ended: false, stopped: 0, opts: null }))
vi.mock('../lib/assistant/voiceQueue.js', () => ({
  createVoiceQueue: (opts) => {
    queue.opts = opts
    return { say: (t) => queue.said.push(t), end: () => { queue.ended = true }, stop: () => { queue.stopped++ } }
  },
}))
vi.mock('../lib/speech.js', () => ({ unlockSpeech: vi.fn(), stopTts: vi.fn(), playUrl: vi.fn() }))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

function streamResponse(chunks) {
  const enc = new TextEncoder()
  return new Response(new ReadableStream({ start(c) { chunks.forEach((ch) => c.enqueue(enc.encode(ch))); c.close() } }),
    { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
const WAIT = { timeout: 5000 }
const renderW = () => render(<I18nProvider><div className="scr-in"><p>Домашняя работа</p></div>
  <AssistantWidget token="tok" screen="homework" enabled /></I18nProvider>)
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))

describe('голос в помощнике', () => {
  let fetchMock
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    Object.assign(queue, { said: [], ended: false, stopped: 0, opts: null })
    Object.assign(voice, { state: 'idle', error: null })
    voice.toggle.mockClear(); voice.cancel.mockClear()
    fetchMock = vi.fn(async () => streamResponse(['Домашка лежит в разделе «Домашняя работа». ', 'Откройте её в меню слева.']))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

  it('окно — Луна, кнопка микрофона включает запись', () => {
    renderW(); open()
    expect(screen.getByRole('dialog', { name: 'Луна' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить голосом' }))
    expect(voice.toggle).toHaveBeenCalled()
  })

  it('распознанный вопрос уходит с voice: true и ответ озвучивается по фразам', async () => {
    renderW(); open()
    await act(async () => voice.props.onText('где моя домашка'))
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.voice).toBe(true)
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'где моя домашка' })
    await waitFor(() => expect(queue.ended).toBe(true), WAIT)
    expect(queue.said).toEqual(['Домашка лежит в разделе «Домашняя работа».', 'Откройте её в меню слева.'])
    expect(screen.getByLabelText('Вопрос голосом')).toBeTruthy()
  })

  it('набранный текстом вопрос — без voice и без озвучки', async () => {
    renderW(); open()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'где домашка' } })
    fireEvent.submit(input.closest('form'))
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).voice).toBe(false)
    expect(queue.opts).toBeNull()
  })

  it('«звук выкл» — ответ на голос приходит без озвучки, выбор запоминается', async () => {
    renderW(); open()
    await act(async () => voice.props.onText('где моя домашка'))
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    fireEvent.click(screen.getByRole('button', { name: 'Выключить озвучку ответов' }))
    expect(localStorage.getItem('jts_assistant_voice_muted')).toBe('1')
    queue.opts = null
    await act(async () => voice.props.onText('а где словарь'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), WAIT)
    expect(queue.opts).toBeNull()
  })

  it('печать и закрытие окна останавливают озвучку', async () => {
    renderW(); open()
    await act(async () => voice.props.onText('где моя домашка'))
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'а' } })
    expect(queue.stopped).toBeGreaterThan(0)
    const before = queue.stopped
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(queue.stopped).toBeGreaterThanOrEqual(before)
    expect(voice.cancel).toHaveBeenCalled()
  })

  it('ошибка микрофона показывается текстом', () => {
    voice.error = 'not_heard'
    renderW(); open()
    expect(screen.getByRole('alert').textContent).toContain('Не расслышала')
  })
})
```

- [ ] **Step 3: правки `AssistantWidget.jsx`**

1. Импорты:
```js
import { createSpeechChunker } from '../lib/assistant/speechChunks.js'
import { createVoiceQueue } from '../lib/assistant/voiceQueue.js'
import { useVoiceQuestion } from '../lib/assistant/useVoiceQuestion.js'
import { unlockSpeech } from '../lib/speech.js'
```
2. Константы: `const AVATAR = '/tutor/tutor-luna.png'`, `const MUTE_KEY = 'jts_assistant_voice_muted'`; чтение/запись `localStorage` — в try/catch.
3. Состояние: `const [muted, setMuted] = useState(false)` + эффект после монтирования, читающий `MUTE_KEY`; `const voiceRef = useRef(null)`; `const stopVoice = useCallback(() => { voiceRef.current?.stop(); voiceRef.current = null }, [])`.
4. `send(raw, { voice = false } = {})`: сообщение ученика `{ role: 'user', content: text, ...(voice ? { voice: true } : {}) }`; в `toSend` поле `voice` не уходит (как сейчас — только `role`/`content`); `stopVoice()` в начале; если `voice && !stateRef.current.muted` — `const q = createVoiceQueue({ token, lang, onFinish: ({ played }) => { if (!played) пометить последний ответ voiceFailed } })`, `const chunker = createSpeechChunker()`, `voiceRef.current = q`; в `onDelta` после обновления сообщений — `if (q) chunker.push(chunk).forEach(q.say)`; после `await askAssistant` — `chunker.flush().forEach(q.say); q.end()`; в `catch` — `stopVoice()`. В `askAssistant` — `voice`.
   `stateRef` дополняется `muted`.
5. `const voiceQ = useVoiceQuestion({ token, lang, screenId: screen, onText: (text) => send(text, { voice: true }) })`.
6. Остановка: `onChange` поля — `if (e.target.value) stopVoice()`; `reset` — `stopVoice()`; закрытие окна (кнопка ×, Escape, кнопка-запуск при открытом окне, `enabled` → false, смена `token`) — `stopVoice(); voiceQ.cancel()`. Для этого завести `const close = () => { stopVoice(); voiceQ.cancel(); setOpen(false) }` и звать его во всех местах закрытия; в ветке `enabled !== prevEnabled` и `token !== prevToken` — `voiceRef.current?.stop()` через эффект (`useEffect(() => { if (!enabled) { stopVoice(); voiceQ.cancel() } }, [enabled])`, `useEffect(() => stopVoice, [token])`).
7. Ошибки голоса: `const VOICE_ERR = { denied: 'assistant.mic.denied', not_heard: 'assistant.mic.notHeard', stt_failed: 'assistant.mic.failed', auth: 'assistant.err.auth' }`; рендер: `voiceQ.error === 'rate'` → `t('assistant.err.rate', { min })`, иначе `t(VOICE_ERR[voiceQ.error])` в том же блоке `.asst__err` (role="alert"), если обычной ошибки нет.
8. Разметка:
   - аватар в шапке и на кнопке-запуске — `AVATAR`;
   - кнопка звука в шапке перед «Новый чат», видна при `messages.some((m) => m.voice)`: `aria-pressed={!muted}`, `aria-label={t(muted ? 'assistant.sound.unmute' : 'assistant.sound.mute')}`, по клику — переключить, записать `MUTE_KEY` (`'1'`/удалить), при выключении — `stopVoice()`;
   - сообщение ученика с `m.voice` — значок микрофона `<span className="asst__voice-tag" role="img" aria-label={t('assistant.voice.asked')}>` с SVG;
   - под ответом с `m.voiceFailed` — `<p className="asst__voice-failed">{t('assistant.voice.failed')}</p>`;
   - в форме перед кнопкой отправки, если `voiceQ.supported`: кнопка `.asst__mic` (+ `is-rec` при записи), `aria-label={t(voiceQ.state === 'recording' ? 'assistant.mic.stop' : 'assistant.mic.start')}`, `disabled={busy || voiceQ.state === 'transcribing'}`, `onClick={() => { unlockSpeech(); stopVoice(); voiceQ.clearError(); voiceQ.toggle() }}`;
   - во время записи вместо поля ввода — строка `.asst__listening` с `t('assistant.mic.listening', { sec })` (секунды `m:ss`), во время распознавания — `t('assistant.mic.transcribing')`.

- [ ] **Step 4: стили `assistant.css`** — `.asst__mic` (круг 40px, контур акцентом), `.asst__mic.is-rec` (заливка `--asst-err`, анимация пульса `@keyframes asst-pulse` с `prefers-reduced-motion: reduce` → без анимации), `.asst__listening` (строка на месте поля), `.asst__sound` (кнопка-иконка в шапке), `.asst__voice-tag` (иконка 14px в пузыре), `.asst__voice-failed` (мелкий серый текст).

- [ ] **Step 5: база знаний.** В `knowledge.js`, статья `about` — пункт: «- Внизу справа — помощник Луна: отвечает на вопросы о сайте и заданиях. Спросить можно текстом или голосом (кнопка с микрофоном) — на голосовой вопрос она отвечает голосом; озвучку можно выключить кнопкой в шапке чата.» В статье «Частые проблемы» пункт про поломку: «напишите или скажите помощнику Луне».

- [ ] **Step 6: старый тест виджета** — `AssistantWidget.test.jsx`: имя окна `'Помощник JTS'` → `'Луна'`; проверить остальные ожидания приветствия (фраза «напишите, если что-то сломалось» в приветствии сохранена).

- [ ] **Step 7: тесты зелёные** — `npx vitest run --dir src src/components/AssistantWidget src/lib/assistant src/learning/courseAssistantSnapshot src/i18n --exclude ".claude/**"` → PASS.

- [ ] **Step 8: коммит** `feat(помощник): голосовой вопрос и автоозвучка ответа в окне Луны`.

---

### Task 9: E2E, сборка, документация

**Files:**
- Create: `tests/assistant-voice.spec.js`
- Modify: `CLAUDE.md` (абзац «Помощник по сайту»)

- [ ] **Step 1: e2e**

```js
// tests/assistant-voice.spec.js
import { test, expect } from '@playwright/test'

// Голосовой вопрос в окне помощника целиком в браузере: фальшивый микрофон
// Chrome → запись → распознавание → чат с voice: true → озвучка фразы.
// Сервисы подменены — проверяется цепочка экрана, а не Soniox/Gemini.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } })

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
// 0.2 с тишины WAV 8 кГц — валидная запись для <audio>.
function silentWav() {
  const n = 1600
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  return b
}

test('голосовой вопрос: запись → текст → ответ звучит', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })))
  let sttForm = null
  await page.route('**/api/assistant/transcribe', async (r) => {
    sttForm = r.request().postData() || ''
    await r.fulfill(json({ text: 'Үй жұмысы қайда?' }))
  })
  let chatBody = null
  await page.route('**/api/assistant/chat', async (r) => {
    chatBody = JSON.parse(r.request().postData())
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Үй жұмысы — сол жақ мәзірдегі «Үй жұмысы» бөлімінде. ' })
  })
  const spoken = []
  await page.route('**/api/assistant/speak', async (r) => {
    spoken.push(JSON.parse(r.request().postData()))
    await r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() })
  })

  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const mic = page.getByRole('button', { name: 'Спросить голосом' })
  await mic.click()
  await expect(page.getByRole('button', { name: 'Закончить вопрос' })).toBeVisible()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Закончить вопрос' }).click()

  await expect(page.locator('.asst__msg--me')).toContainText('Үй жұмысы қайда?')
  expect(sttForm).toContain('name="lang"')
  expect(chatBody.voice).toBe(true)
  await expect(page.locator('.asst__msg--bot').last()).toContainText('сол жақ мәзірдегі')
  await expect.poll(() => spoken.length).toBe(1)
  expect(spoken[0].lang).toBe('kk')
})
```

- [ ] **Step 2: прогон e2e** — один воркер, свой порт (порт 3100 мог быть занят соседним worktree): `E2E_PORT=3217 npx playwright test tests/assistant-voice.spec.js --workers=1 --project=desktop` → PASS.

- [ ] **Step 3: сборка и линт** — `npm run build` и `npm run lint` в worktree → без ошибок.

- [ ] **Step 4: CLAUDE.md** — абзац после «Экосистема минут…» или рядом с внешними сервисами:

```markdown
**Помощник по сайту — Луна, текстом и голосом.** Окно чата (`src/components/AssistantWidget.jsx`) поверх любого
экрана ученика; видит экран ТЕКСТОМ — снимок DOM `.scr-in` в момент вопроса (`lib/assistant/screenSnapshot.js`), не
картинку; слепые зоны — Shadow DOM (SpeakSpin) и окна-порталы в `body`. Голос (14.10.2026): «голос на голос» —
вопрос, сказанный в микрофон, получает ответ голосом сразу, набранный — только текстом. Запись — `useVoiceQuestion`
(WAV 16 кГц, стоп на 1.5 с тишины, потолок 30 с) → `POST /api/assistant/transcribe` (Soniox с языками интерфейса
`kk/ru/en` и контекстом терминов сайта, `sttContext.js`; запасной — Azure с локалью интерфейса) → `/api/assistant/chat`
с `voice: true` (короткий ответ без списков) → фразы (`speechChunks.js`) → `POST /api/assistant/speak` голосом Луны
(Gemini «Aoede», синтез общий с `/api/tutor-tts` в `lib/tutorVoice.js`; казахский и сбой — Soniox «Grace») →
`voiceQueue.js` на общем `<audio>`. Помощник технический, не учитель английского: распознавание русского и
казахского важнее английского. Записи голоса нигде не хранятся.
```

- [ ] **Step 5: коммит** `test(помощник): e2e голосового вопроса; docs: помощник Луна в CLAUDE.md`.

- [ ] **Step 6: полный прогон тестов помощника и PR** в `develop`.
