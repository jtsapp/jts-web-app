# Брифинг сцены, часы сцены и звонок в 911 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать сцене вводные, которых нет в разговоре (плашка «Ситуация»), и собственный бюджет времени с обрывом связи; на этих двух механиках выпустить сцену звонка в 911.

**Architecture:** Три пласта. (1) Брифинг — текст в словаре, разбор в чистой функции, один компонент, показанный дважды: гейтом до звонка и шпаргалкой поверх него. (2) Часы — общий модуль констант `scenarioClock.js`, который читают и токен-роут (урезает ttl), и клиент (рисует обрыв), и агент (закрывает комнату по своему таймеру). (3) Сцена `911-call` — markdown-промпт плюс записи в реестре и словарях.

**Tech Stack:** Next.js 15 (App Router как оболочка, навигация — state-машина в `App.jsx`), React 19, чистый JavaScript, vitest + @testing-library/react для юнитов, Playwright для e2e, LiveKit (`@livekit/components-react`), Python-агент LiveKit в `agent/`.

## Global Constraints

- **JavaScript, не TypeScript.** Только `.js`/`.jsx`. TS-файлы не добавлять.
- **Комментарии на русском и объясняют «почему», не «что».**
- **i18n:** все строки UI тьютора — через `t(key, vars)` и `src/i18n/dict.js`. Ключ обязан появиться во ВСЕХ трёх словарях (ru ≈ строка 216, kz ≈ 440, en ≈ 661). `t()` на неизвестном ключе возвращает сам ключ — это и есть признак «нет текста».
- **Стили:** только `src/tutor.css`, классами в существующем стиле (`t-<блок>__<элемент>`). Никаких CSS-модулей.
- **Файл сцены лежит в ДВУХ папках:** `data/scenarios/<id>.md` и `agent/scenarios/<id>.md`, побайтово одинаковые. Docker-контекст агента — `agent/`.
- **Правка `agent/agent.py` не доезжает до прода мержем.** Нужен отдельный `lk agent deploy --yes` из `agent/`.
- **Команды проверки:** `npm test` (vitest), `npm run build`, `npm run lint`. Тесты компонентов требуют докблока `// @vitest-environment jsdom` первой строкой файла.
- Тьютор берёт переводы из `src/i18n/LanguageContext.jsx` (`useT`, `useLang`, провайдер `LanguageProvider`) — НЕ из `src/i18n.jsx`, это другой словарь для раздела «Обучение».

---

### Task 1: Часы сцены — общий модуль констант и доступ к реестру

**Files:**
- Create: `src/tutor/scenarioClock.js`
- Create: `src/tutor/scenarioClock.test.js`
- Create: `src/tutor/scenarios.test.js`
- Modify: `src/tutor/scenarios.js` (в конец файла)

**Interfaces:**
- Consumes: `SCENARIOS` из `src/tutor/scenarios.js`.
- Produces:
  - `getScenario(id: string): object | null`
  - `CLOCK_GRACE_SEC: number` (30)
  - `CLOCK_CUT_LEAD_SEC: number` (10)
  - `clampTtlForScenario(ttl: number, limitSec: number): number`
  - `cutAtSec(limitSec: number): number | null`

- [ ] **Step 1: Написать падающие тесты часов**

Создать `src/tutor/scenarioClock.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  CLOCK_GRACE_SEC,
  CLOCK_CUT_LEAD_SEC,
  clampTtlForScenario,
  cutAtSec,
} from './scenarioClock.js'

describe('clampTtlForScenario', () => {
  it('режет ttl до бюджета сцены плюс запас', () => {
    expect(clampTtlForScenario(1200, 300)).toBe(300 + CLOCK_GRACE_SEC)
  })
  it('не поднимает ttl, если дневного лимита осталось меньше бюджета', () => {
    expect(clampTtlForScenario(120, 300)).toBe(120)
  })
  it('без бюджета сцены отдаёт ttl как есть', () => {
    expect(clampTtlForScenario(1200, 0)).toBe(1200)
    expect(clampTtlForScenario(1200, undefined)).toBe(1200)
  })
})

describe('cutAtSec', () => {
  it('рвёт связь за CLOCK_CUT_LEAD_SEC до конца бюджета', () => {
    expect(cutAtSec(300)).toBe(300 - CLOCK_CUT_LEAD_SEC)
  })
  it('не уходит в минус на коротком бюджете', () => {
    expect(cutAtSec(5)).toBe(0)
  })
  it('без бюджета сцены обрыва нет', () => {
    expect(cutAtSec(0)).toBeNull()
    expect(cutAtSec(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Прогнать — тесты должны упасть**

Run: `npm test -- src/tutor/scenarioClock.test.js`
Expected: FAIL, `Failed to resolve import "./scenarioClock.js"`.

- [ ] **Step 3: Написать модуль**

Создать `src/tutor/scenarioClock.js`:

```js
// Часы сцены: у сцены может быть собственный бюджет времени, не связанный с
// дневным лимитом тьютора (у звонка в 911 — пять минут). Модуль общий для
// клиента и токен-роута намеренно: таймер на экране, обрыв связи и ttl токена
// обязаны считаться из одних и тех же констант. Разъедутся — связь оборвётся
// не там, где показывают часы, и ученик решит, что это баг.

// Токен переживает сцену на полминуты. Обрыв должен делать таймер сцены, а не
// протухший токен: истёкший токен рвёт комнату молча, и вердикт до ученика уже
// не доедет.
export const CLOCK_GRACE_SEC = 30

// За сколько секунд до конца бюджета рвём связь. Это «не успел», а не «время
// вышло ровно»: остаток нужен, чтобы ученик увидел надпись про потерю связи и
// экран результата внутри сцены, а не после неё.
export const CLOCK_CUT_LEAD_SEC = 10

// ttl токена под сцену с бюджетом. Дневной остаток меньше бюджета — он и
// побеждает: сцена не может выдать минут больше, чем у ученика есть.
export function clampTtlForScenario(ttl, limitSec) {
  if (!Number.isFinite(limitSec) || limitSec <= 0) return ttl
  return Math.min(ttl, limitSec + CLOCK_GRACE_SEC)
}

// Секунда сцены, на которой рвём связь. null — у сцены нет своих часов.
export function cutAtSec(limitSec) {
  if (!Number.isFinite(limitSec) || limitSec <= 0) return null
  return Math.max(0, limitSec - CLOCK_CUT_LEAD_SEC)
}
```

- [ ] **Step 4: Прогнать — тесты часов должны пройти**

Run: `npm test -- src/tutor/scenarioClock.test.js`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Написать падающий тест реестра**

Создать `src/tutor/scenarios.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { SCENARIOS, getScenario } from './scenarios.js'

describe('getScenario', () => {
  it('находит сцену по слагу', () => {
    expect(getScenario('hotel-check-in')).toBe(
      SCENARIOS.find((s) => s.id === 'hotel-check-in'),
    )
  })
  it('на неизвестный слаг отдаёт null, а не падает', () => {
    expect(getScenario('nope')).toBeNull()
  })
  it('на пустой вход отдаёт null', () => {
    expect(getScenario('')).toBeNull()
    expect(getScenario(null)).toBeNull()
  })
})
```

- [ ] **Step 6: Прогнать — тест должен упасть**

Run: `npm test -- src/tutor/scenarios.test.js`
Expected: FAIL, `getScenario is not a function`.

- [ ] **Step 7: Добавить `getScenario` в реестр**

В конец `src/tutor/scenarios.js`:

```js
// Доступ по слагу. Нужен и клиенту (есть ли у сцены брифинг и свои часы), и
// токен-роуту (сколько секунд выдавать) — поэтому живёт рядом с самим списком,
// а не дублируется поиском по массиву в каждом месте.
export function getScenario(id) {
  if (typeof id !== 'string' || !id) return null
  return SCENARIOS.find((s) => s.id === id) || null
}
```

- [ ] **Step 8: Прогнать оба файла**

Run: `npm test -- src/tutor/scenarioClock.test.js src/tutor/scenarios.test.js`
Expected: PASS, 9 тестов.

- [ ] **Step 9: Коммит**

```bash
git add src/tutor/scenarioClock.js src/tutor/scenarioClock.test.js src/tutor/scenarios.js src/tutor/scenarios.test.js
git commit -m "feat(tutor): scene clock constants and registry lookup"
```

---

### Task 2: Брифинг — разбор текста, компонент, стили, строки

**Files:**
- Create: `src/tutor/scenarioBrief.js`
- Create: `src/tutor/scenarioBrief.test.js`
- Create: `src/tutor/ScenarioBrief.jsx`
- Create: `src/tutor/ScenarioBrief.test.jsx`
- Modify: `src/i18n/dict.js` (три словаря)
- Modify: `src/tutor.css` (в конец файла)

**Interfaces:**
- Consumes: `getScenario` (Task 1), `useT` из `src/i18n/LanguageContext.jsx`.
- Produces:
  - `briefLines(t: Function, scenarioId: string): string[]`
  - `hasBrief(scenarioId: string): boolean`
  - `<ScenarioBrief scenarioId={string} action={ReactNode|null} />` — рендерит `null`, если текста нет.
  - Ключи словаря: `scen.briefTitle`, `scen.briefReady`, `scen.briefPeek`, `scen.briefClose`.

- [ ] **Step 1: Написать падающий тест разбора**

Создать `src/tutor/scenarioBrief.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { briefLines, hasBrief } from './scenarioBrief.js'

// t() из словаря: на известный ключ отдаёт строку, на неизвестный — сам ключ.
function fakeT(table) {
  return (key) => (key in table ? table[key] : key)
}

describe('briefLines', () => {
  it('режет строку словаря по переводам строки', () => {
    const t = fakeT({ 'scen.brief.x': 'Первое\nВторое\nТретье' })
    expect(briefLines(t, 'x')).toEqual(['Первое', 'Второе', 'Третье'])
  })
  it('выкидывает пустые строки и пробелы по краям', () => {
    const t = fakeT({ 'scen.brief.x': '  Первое  \n\n  Второе\n' })
    expect(briefLines(t, 'x')).toEqual(['Первое', 'Второе'])
  })
  it('нет ключа — нет брифинга (t вернул сам ключ)', () => {
    expect(briefLines(fakeT({}), 'x')).toEqual([])
  })
  it('пустой вход не роняет', () => {
    expect(briefLines(fakeT({}), '')).toEqual([])
    expect(briefLines(null, 'x')).toEqual([])
  })
})

describe('hasBrief', () => {
  it('у сцены без флага брифинга нет', () => {
    expect(hasBrief('hotel-check-in')).toBe(false)
  })
  it('на неизвестный слаг отдаёт false', () => {
    expect(hasBrief('nope')).toBe(false)
  })
})
```

- [ ] **Step 2: Прогнать — тест должен упасть**

Run: `npm test -- src/tutor/scenarioBrief.test.js`
Expected: FAIL, `Failed to resolve import "./scenarioBrief.js"`.

- [ ] **Step 3: Написать модуль разбора**

Создать `src/tutor/scenarioBrief.js`:

```js
import { getScenario } from './scenarios.js'

// Брифинг — вводные, которых в самом разговоре нет и быть не может: диспетчер
// 911 не может рассказать ученику, что тот видит из окна, это ученик должен
// рассказать диспетчеру. Поэтому текст отдаётся ученику до звонка и на родном
// языке: понять ситуацию он должен мгновенно, а языковая работа начинается там,
// где он пересказывает её вслух по-английски.
//
// Хранится одной строкой словаря с \n между пунктами — тот же приём, что у
// scen.heading. Отдельной структуры в словаре ради этого не заводим.
export function briefLines(t, scenarioId) {
  if (typeof t !== 'function' || !scenarioId) return []
  const key = `scen.brief.${scenarioId}`
  const raw = t(key)
  // t() на неизвестном ключе возвращает сам ключ, так что «ключа нет» и
  // «текст пустой» — это одно и то же состояние.
  if (!raw || raw === key) return []
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Есть ли у сцены брифинг. Флаг в реестре, а не наличие ключа: гейт перед
// звонком решается до того, как отрисован хоть один текст.
export function hasBrief(scenarioId) {
  return Boolean(getScenario(scenarioId)?.brief)
}
```

- [ ] **Step 4: Прогнать — тесты разбора должны пройти**

Run: `npm test -- src/tutor/scenarioBrief.test.js`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Добавить строки в три словаря**

В `src/i18n/dict.js`, в русский словарь — сразу после `'scen.start': 'Начать разговор',`:

```js
    'scen.briefTitle': 'Ситуация',
    'scen.briefReady': 'Я готов, звоню',
    'scen.briefPeek': 'Ситуация',
    'scen.briefClose': 'Закрыть',
```

В казахский словарь, после его `'scen.start': 'Әңгімені бастау',`:

```js
    'scen.briefTitle': 'Жағдай',
    'scen.briefReady': 'Дайынмын, қоңырау шаламын',
    'scen.briefPeek': 'Жағдай',
    'scen.briefClose': 'Жабу',
```

В английский словарь, после его `'scen.start': 'Start conversation',`:

```js
    'scen.briefTitle': 'The situation',
    'scen.briefReady': "I'm ready — call",
    'scen.briefPeek': 'Situation',
    'scen.briefClose': 'Close',
```

- [ ] **Step 6: Написать падающий тест компонента**

Создать `src/tutor/ScenarioBrief.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import ScenarioBrief from './ScenarioBrief.jsx'

function renderBrief(props) {
  return render(
    <LanguageProvider>
      <ScenarioBrief {...props} />
    </LanguageProvider>,
  )
}

describe('ScenarioBrief', () => {
  it('у сцены без текста ничего не рисует', () => {
    const { container } = renderBrief({ scenarioId: 'hotel-check-in' })
    expect(container).toBeEmptyDOMElement()
  })
  it('без текста не рисует и переданное действие', () => {
    // Плашка либо целая, либо её нет вовсе: голая кнопка без ситуации —
    // это половина интерфейса.
    renderBrief({
      scenarioId: 'hotel-check-in',
      action: <button type="button">Поехали</button>,
    })
    expect(screen.queryByText('Поехали')).toBeNull()
  })
})

// Тест на положительный случай (плашка с текстом и действием) появится в
// Task 7 вместе с первой сценой, у которой брифинг есть: раньше в словаре
// просто нет ни одного ключа scen.brief.*.
```

- [ ] **Step 7: Прогнать — тест должен упасть**

Run: `npm test -- src/tutor/ScenarioBrief.test.jsx`
Expected: FAIL, `Failed to resolve import "./ScenarioBrief.jsx"`.

- [ ] **Step 8: Написать компонент**

Создать `src/tutor/ScenarioBrief.jsx`:

```jsx
import { useT } from '../i18n/LanguageContext.jsx'
import { briefLines } from './scenarioBrief.js'

// Плашка «Ситуация». Один компонент на два места: гейт перед звонком и
// шпаргалка поверх разговора. Разница только в кнопке снизу, поэтому она
// приходит пропом `action`, а не разводится двумя почти одинаковыми файлами.
export default function ScenarioBrief({ scenarioId, action = null }) {
  const t = useT()
  const lines = briefLines(t, scenarioId)
  // Нет текста — нет и рамки с заголовком: пустая плашка выглядит как поломка.
  if (!lines.length) return null
  return (
    <div className="t-brief" role="note" aria-label={t('scen.briefTitle')}>
      <span className="t-brief__eyebrow">{t('scen.briefTitle')}</span>
      <ul className="t-brief__list">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {action}
    </div>
  )
}
```

- [ ] **Step 9: Прогнать тест компонента**

Run: `npm test -- src/tutor/ScenarioBrief.test.jsx`
Expected: PASS, 2 теста.

- [ ] **Step 10: Добавить стили**

В конец `src/tutor.css`:

```css
/* Плашка «Ситуация»: вводные, которые ученик держит перед глазами и
   пересказывает вслух. Читаемость важнее компактности — это рабочий текст,
   а не подпись. */
.t-brief {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 22px 24px;
  border-radius: 24px;
  background: #f7f5fd;
  border: 1px solid #e7e1f7;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.t-brief__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9047ff;
}
.t-brief__list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 15px;
  line-height: 1.45;
  color: #2b2440;
}
/* Кнопка-шпаргалка поверх звонка: рядом с таймером, но слева, чтобы не
   перекрывать отсчёт. */
.t-voice__peek {
  position: absolute;
  top: 20px;
  left: 24px;
  font-size: 13px;
  font-weight: 600;
  color: #9047ff;
  background: #f4f1fb;
  border: none;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
}
/* Развёрнутая шпаргалка перекрывает лицо — во время звонка это осознанный
   размен: ученику нужен текст, а не мимика. */
.t-voice__peekpanel {
  position: absolute;
  inset: 56px 16px auto 16px;
  z-index: 3;
}
@media (max-width: 560px) {
  .t-brief {
    padding: 18px;
    border-radius: 20px;
  }
  .t-brief__list {
    font-size: 14px;
  }
}
```

- [ ] **Step 11: Прогнать весь vitest и линт**

Run: `npm test`
Expected: PASS; новых падений относительно базы нет.

Run: `npm run lint`
Expected: без новых ошибок (в `practice`/`vocab` есть 6 предсуществующих — они не наши).

- [ ] **Step 12: Коммит**

```bash
git add src/tutor/scenarioBrief.js src/tutor/scenarioBrief.test.js src/tutor/ScenarioBrief.jsx src/tutor/ScenarioBrief.test.jsx src/i18n/dict.js src/tutor.css
git commit -m "feat(tutor): scenario briefing card"
```

---

### Task 3: Гейт перед звонком и шпаргалка во время звонка

**Files:**
- Modify: `src/screens/TutorVoiceChatPage.jsx`

**Interfaces:**
- Consumes: `ScenarioBrief`, `hasBrief` (Task 2).
- Produces: у `CallStage` появляется проп `briefId: string` (пустая строка — шпаргалки нет).

- [ ] **Step 1: Добавить импорты**

В `src/screens/TutorVoiceChatPage.jsx`, после строки `import { moodToEmotion } from '../tutor/avatarEmotions.js'`:

```jsx
import ScenarioBrief from '../tutor/ScenarioBrief.jsx'
import { hasBrief } from '../tutor/scenarioBrief.js'
```

- [ ] **Step 2: Завести состояние гейта**

Рядом с `const [perm, setPerm] = useState('prompt')` добавить:

```jsx
  // Сцены с брифингом не стартуют сами: сначала ученик читает ситуацию и
  // нажимает «я готов». Влетать в звонок в 911, не зная, что ты видишь из
  // окна, — это провал не по английскому.
  const briefId = hasBrief(scenarioId) ? scenarioId : ''
  const [briefAck, setBriefAck] = useState(false)
```

- [ ] **Step 3: Не стартовать микрофон до подтверждения**

В эффекте, который дёргает `requestMic()` по уже выданному разрешению, первой строкой тела эффекта добавить:

```jsx
    // Разрешение уже есть, но сцена с брифингом ждёт кнопку — иначе гейт
    // мелькнёт и пропадёт.
    if (briefId && !briefAck) return
```

и добавить `briefAck` в массив зависимостей эффекта (строка с `// eslint-disable-next-line react-hooks/exhaustive-deps` остаётся — она про `requestMic`).

- [ ] **Step 4: Отрисовать гейт**

Внутри `<div className="t-voice">` есть тернарная цепочка `{error ? (…) : connected ? (…) : (…)}`. Заменить её ЦЕЛИКОМ на цепочку с новой первой веткой — открывающая строка была `{error ? (`, закрывающая `)}` остаётся последней:

```jsx
        {briefId && !briefAck ? (
          <ScenarioBrief
            scenarioId={briefId}
            action={
              <button
                className="t-pill t-pill--primary"
                type="button"
                onClick={() => {
                  setBriefAck(true)
                  // Разрешение мог уже дать браузер — тогда эффект выше его не
                  // трогал, и запрос надо сделать здесь.
                  if (perm !== 'granted') return
                  void requestMic()
                }}
              >
                {t('scen.briefReady')}
              </button>
            }
          />
        ) : error ? (
          <div className="t-voice__card">
            <TutorFace emotion="idle" />
            <div className="t-voice__text">{errorText}</div>
          </div>
        ) : connected ? (
          <LiveKitRoom
            token={tokenData.token}
            serverUrl={tokenData.url}
            connect
            audio
            video={false}
            onDisconnected={() => onFinish?.()}
            className="t-voice__room"
          >
            {/* Аудио-элементы вне визуального потока — иначе они расширяют
                обёртку и карточка съезжает влево. */}
            <div className="t-voice__audio">
              <RoomAudioRenderer />
            </div>
            <CallStage onFinish={onFinish} t={t} ttl={tokenData.ttl} briefId={briefId} />
          </LiveKitRoom>
        ) : (
          <div className="t-voice__card">
            <TutorFace emotion="idle" />
            <div className="t-voice__text">
              {perm === 'granted' ? t('voice.connecting') : t('voice.permHint')}
            </div>
          </div>
        )}
```

Проп `briefId` у `CallStage` здесь уже проставлен — Step 5 ниже его только сверяет.

- [ ] **Step 5: Сверить проп у CallStage**

Убедиться, что вызов выглядит так (Step 4 его уже переписал):

```jsx
            <CallStage onFinish={onFinish} t={t} ttl={tokenData.ttl} briefId={briefId} />
```

- [ ] **Step 6: Добавить шпаргалку в CallStage**

Сигнатуру заменить на `function CallStage({ onFinish, t, ttl, briefId = '' })`.

Рядом с `const [verdict, setVerdict] = useState(null)` добавить:

```jsx
  // Шпаргалка со ситуацией. Свёрнута по умолчанию: развёрнутая перекрывает лицо.
  const [peek, setPeek] = useState(false)
```

В `return (...)` живого экрана, сразу после блока таймера, вставить:

```jsx
      {briefId && (
        <button className="t-voice__peek" type="button" onClick={() => setPeek((v) => !v)}>
          {t('scen.briefPeek')}
        </button>
      )}
      {briefId && peek && (
        <div className="t-voice__peekpanel">
          <ScenarioBrief
            scenarioId={briefId}
            action={
              <button className="t-pill" type="button" onClick={() => setPeek(false)}>
                {t('scen.briefClose')}
              </button>
            }
          />
        </div>
      )}
```

- [ ] **Step 7: Проверить сборкой и линтом**

Run: `npm run build`
Expected: `Compiled successfully`.

Run: `npm run lint`
Expected: без новых ошибок.

- [ ] **Step 8: Коммит**

```bash
git add src/screens/TutorVoiceChatPage.jsx
git commit -m "feat(tutor): brief gate before the call and a peek button during it"
```

---

### Task 4: Токен-роут — бюджет сцены в ttl и в metadata

**Files:**
- Modify: `src/app/api/livekit/token/route.js`

**Interfaces:**
- Consumes: `getScenario` (Task 1), `clampTtlForScenario` (Task 1).
- Produces: поле `scenarioLimitSec` в metadata комнаты и в JSON-ответе роута.

- [ ] **Step 1: Импорт**

Строку `import { SCENARIOS } from '@/tutor/scenarios.js'` заменить на:

```js
import { SCENARIOS, getScenario } from '@/tutor/scenarios.js'
import { clampTtlForScenario } from '@/tutor/scenarioClock.js'
```

- [ ] **Step 2: Принять бюджет в metadata**

В `buildMetadata`, в блоке про `scenarioId`, внутрь `if (sid) { ... }` после `meta.mode = 'scenario'` добавить:

```js
      // Бюджет времени сцены берём из реестра на сервере, а не из тела запроса:
      // клиент мог бы прислать себе час на пятиминутную сцену.
      const limit = getScenario(sid)?.timeLimitSec
      if (Number.isFinite(limit) && limit > 0) meta.scenarioLimitSec = limit
```

- [ ] **Step 3: Урезать ttl и вернуть бюджет клиенту**

В `issue()`, сразу перед строкой `const metadata = buildMetadata(...)` добавить:

```js
  // Сцена со своими часами не должна занимать весь дневной лимит: и токен, и
  // отсчёт на экране живут по её бюджету. Запас поверх бюджета нужен, чтобы
  // связь рвал таймер сцены, а не истёкший токен.
  const scenarioLimitSec = getScenario(p.scenarioId)?.timeLimitSec || 0
  ttl = clampTtlForScenario(ttl, scenarioLimitSec)
```

Строку ответа заменить на:

```js
  return Response.json({
    configured: true,
    token,
    url: wsUrl,
    room,
    identity,
    ttl,
    scenarioLimitSec,
  })
```

- [ ] **Step 4: Проверить сборкой**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 5: Коммит**

```bash
git add src/app/api/livekit/token/route.js
git commit -m "feat(tutor): scene time budget in token ttl and room metadata"
```

---

### Task 5: Клиент — обрыв связи и результат, который не зависит от агента

**Files:**
- Modify: `src/screens/TutorVoiceChatPage.jsx`
- Modify: `src/i18n/dict.js` (три словаря)

**Interfaces:**
- Consumes: `cutAtSec` (Task 1), поле `scenarioLimitSec` из ответа роута (Task 4).
- Produces: у `CallStage` появляются пропы `limitSec: number` и `holdRef: React.MutableRefObject<boolean>`.

- [ ] **Step 1: Добавить строки в три словаря**

ru — после `'scen.briefClose': 'Закрыть',`:

```js
    'scen.lineDead': 'Связь пропала',
    'scen.lineDeadHint': 'Помощь вызвать не успели',
```

kz:

```js
    'scen.lineDead': 'Байланыс үзілді',
    'scen.lineDeadHint': 'Көмекті шақырып үлгермедіңіз',
```

en:

```js
    'scen.lineDead': 'The line went dead',
    'scen.lineDeadHint': 'Help was never dispatched',
```

- [ ] **Step 2: Импорт часов**

К импортам `TutorVoiceChatPage.jsx` добавить:

```jsx
import { cutAtSec } from '../tutor/scenarioClock.js'
```

- [ ] **Step 3: Не выходить с экрана, когда комната закрылась сама**

В теле `TutorVoiceChatPage`, рядом с `const [briefAck, setBriefAck] = useState(false)`:

```jsx
  // Комнату по концу сцены удаляет агент, и это прилетает как обычный разрыв.
  // Без флага onDisconnected увёл бы ученика с экрана раньше, чем он увидел
  // «связь пропала» и результат. Снимает флаг только кнопка «Готово».
  const holdRef = useRef(false)
```

`LiveKitRoom` — заменить обработчик:

```jsx
            onDisconnected={() => {
              if (holdRef.current) return
              onFinish?.()
            }}
```

и прокинуть в `CallStage`:

```jsx
            <CallStage
              onFinish={onFinish}
              t={t}
              ttl={tokenData.ttl}
              briefId={briefId}
              limitSec={tokenData.scenarioLimitSec || 0}
              holdRef={holdRef}
            />
```

- [ ] **Step 4: Считать часы сцены, а не остаток дня**

Сигнатуру заменить на `function CallStage({ onFinish, t, ttl, briefId = '', limitSec = 0, holdRef })`.

Строку `const left = useCountdown(ttl)` заменить на:

```jsx
  // У сцены со своими часами на экране идёт её бюджет, а не остаток дневного
  // лимита: ученику обещали пять минут — он и должен видеть пять минут.
  const left = useCountdown(limitSec > 0 ? limitSec : ttl)
```

- [ ] **Step 5: Оборвать связь и показать надпись**

После блока `useDataChannel('lesson', ...)` добавить:

```jsx
  // Обрыв на исходе бюджета. Клиент авторитетен по картинке: агент в этот же
  // момент шлёт вердикт и удаляет комнату, но экран результата не должен
  // зависеть от того, успел ли он.
  const [lineDead, setLineDead] = useState(false)
  // Секунда сцены, на которой рвём связь (для пяти минут — 290-я).
  const cutAt = cutAtSec(limitSec)
  useEffect(() => {
    if (cutAt === null || left === null || verdict) return
    const elapsed = limitSec - left
    if (elapsed < cutAt) return
    if (holdRef) holdRef.current = true
    setLineDead(true)
  }, [left, cutAt, limitSec, verdict, holdRef])

  // Вердикт от агента ждём три секунды после обрыва, дальше рисуем свой: «не
  // успел» — это тоже результат, и ученик обязан его увидеть.
  useEffect(() => {
    if (!lineDead || verdict) return
    const id = setTimeout(() => {
      setVerdict({ passed: false, summary: t('scen.lineDeadHint'), tips: [] })
    }, 3000)
    return () => clearTimeout(id)
  }, [lineDead, verdict, t])
```

- [ ] **Step 6: Отрисовать экран обрыва**

Прямо перед `if (verdict) {` вставить:

```jsx
  if (lineDead && !verdict) {
    return (
      <div className="t-voice__card t-linedead" role="status" aria-live="polite">
        <h2 className="t-linedead__title">{t('scen.lineDead')}</h2>
      </div>
    )
  }
```

В блоке вердикта у кнопки «Готово» заменить обработчик, чтобы снимался флаг:

```jsx
        <button
          className="t-pill t-pill--primary t-verdict__done"
          type="button"
          onClick={() => {
            if (holdRef) holdRef.current = false
            onFinish?.()
          }}
        >
```

- [ ] **Step 7: Стили экрана обрыва**

В конец `src/tutor.css`:

```css
/* Обрыв связи: экран намеренно почти пустой — это удар, а не сообщение. */
.t-linedead {
  align-items: center;
  justify-content: center;
  min-height: 320px;
}
.t-linedead__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #6b6480;
  letter-spacing: 0.01em;
}
```

- [ ] **Step 8: Сборка и линт**

Run: `npm run build`
Expected: `Compiled successfully`.

Run: `npm run lint`
Expected: без новых ошибок.

- [ ] **Step 9: Коммит**

```bash
git add src/screens/TutorVoiceChatPage.jsx src/i18n/dict.js src/tutor.css
git commit -m "feat(tutor): dead line screen and a verdict that survives the cut"
```

---

### Task 6: Агент — свой сторож на часы сцены

**Files:**
- Modify: `agent/agent.py`

**Interfaces:**
- Consumes: `scenarioLimitSec` из metadata (Task 4).
- Produces: поле `LearnerProfile.scenario_limit_sec: int`.

- [ ] **Step 1: Поле профиля**

В `LearnerProfile`, сразу после `session_ttl_sec: int = 0`:

```python
    # Бюджет времени СЦЕНЫ (не дневного лимита) в секундах. Приходит из реестра
    # сценариев через /api/livekit/token. 0 → у сцены своих часов нет.
    scenario_limit_sec: int = 0
```

- [ ] **Step 2: Разбор metadata**

В конструкторе профиля, после блока `session_ttl_sec=(...)`:

```python
        scenario_limit_sec=(
            int(data["scenarioLimitSec"])
            if isinstance(data.get("scenarioLimitSec"), (int, float))
            else 0
        ),
```

- [ ] **Step 3: Сказать сцене про её часы**

В `build_scenario_instructions`, в возвращаемую строку перед блоком `"GRADING — two DIFFERENT questions..."` добавить:

```python
        + (
            f"HARD TIME LIMIT: this scene lasts about {p.scenario_limit_sec // 60} "
            "minutes and the learner can see the clock. Keep the pace up, do not "
            "let the scene idle, and never mention the timer out loud.\n"
            if p.scenario_limit_sec
            else ""
        )
```

- [ ] **Step 4: Второй сторож**

После блока `_budget_task = asyncio.create_task(_end_session_on_budget(ttl_sec))` добавить:

```python
    # ── Часы сцены ────────────────────────────────────────────────────────────
    # Отдельный от дневного лимита бюджет: у звонка в 911 пять минут. Считает
    # его сторож, а не модель: модель секунды не считает, а списание минут
    # завязано на удаление комнаты (webhook room_finished), как и у бюджета выше.
    scene_limit = profile.scenario_limit_sec
    if scene_limit and scene_limit > 0:
        scene_room = ctx.room.name
        # Те же десять секунд, что и у клиента (CLOCK_CUT_LEAD_SEC в
        # src/tutor/scenarioClock.js). Разъедутся — надпись «связь пропала»
        # появится не тогда, когда связь реально оборвалась.
        cut_at = max(0, scene_limit - 10)

        async def _end_scene_on_clock(limit: int) -> None:
            try:
                await asyncio.sleep(limit)
            except asyncio.CancelledError:
                return
            logger.info("Scene clock %ds reached — cutting room %s.", limit, scene_room)
            try:
                session.generate_reply(
                    instructions=(
                        "The line is breaking up and the call is about to drop. "
                        "Call report_task_complete NOW with passed=false, a one-line "
                        "summary of what was missing, and up to 3 tips. Say nothing else."
                    )
                )
                await asyncio.sleep(2.5)
            except Exception:
                logger.exception("[scene-clock] final verdict failed")
            try:
                from livekit import api as lk_api

                lkapi = lk_api.LiveKitAPI()
                try:
                    await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=scene_room))
                finally:
                    await lkapi.aclose()
            except Exception:
                logger.exception("[scene-clock] delete_room failed; disconnecting agent")
                try:
                    await ctx.room.disconnect()
                except Exception:
                    logger.exception("[scene-clock] room disconnect failed")

        _scene_task = asyncio.create_task(_end_scene_on_clock(cut_at))
```

- [ ] **Step 5: Проверить синтаксис**

Run: `python -m py_compile agent/agent.py`
Expected: без вывода (успех). Если `python` не найден — `py -m py_compile agent/agent.py`.

- [ ] **Step 6: Коммит**

```bash
git add agent/agent.py
git commit -m "feat(agent): scene clock watchdog with a forced verdict before the cut"
```

---

### Task 7: Сцена 911-call

**Files:**
- Create: `data/scenarios/911-call.md`
- Create: `agent/scenarios/911-call.md` (побайтовая копия)
- Modify: `src/tutor/scenarios.js`
- Modify: `src/i18n/dict.js` (три словаря)

**Interfaces:**
- Consumes: `brief`/`timeLimitSec` из реестра (Task 1), гейт и шпаргалку (Task 3), часы (Tasks 4–6).
- Produces: слаг `911-call`.

- [ ] **Step 1: Написать промпт**

Создать `data/scenarios/911-call.md`:

```markdown
---
id: 911-call
mode: scenario
voice: true
title: Emergency Call
maxQuestions: 5
completion: after the dispatcher says out loud where units are being sent, or the line drops
---

You are an expert AI English Tutor acting as a 911 EMERGENCY DISPATCHER. Your goal is to run a realistic, tense emergency call in which the caller must make you understand WHERE THEY ARE — they do not know the address.

Stay fully in character: calm, fast, in control. You cut through panic with short questions. You are never cruel and you never describe violence — the tension comes from the clock and from the caller's own situation, not from anything you narrate.

WHAT THE LEARNER CAN SEE (this is the only truth of this scene):
Second floor of an abandoned paper mill on the edge of town. No street address known. Phone battery almost dead. Three men downstairs, searching for them. From the window: a river, a red brick chimney, a rusted sign reading MILLER & SONS PAPER MILL, a yellow bridge in the distance. The nearest door is marked GATE 4.
Any detail that is NOT in this list does not exist. If the caller mentions one, do not accept it — ask a short checking question instead ("A church? Are you sure — what does the sign say?").

Onboarding:
Open the call with ONLY:
"911, what's your emergency?"
(Wait for their answer. Do NOT ask the caller their English level — you already know it and adjust your speaking style silently.)

The Call (about 5 exchanges):
Ask ONLY ONE question at a time. Keep every turn to one or two spoken sentences.
1. What is happening.
2. Where they are. They will not know the address — push for landmarks: "What can you see from where you are? Any signs, any buildings?"
3. Check their description back against the list above with one narrowing question: "Is that sign on the building itself or on the fence?"
4. How many men, where they are, whether the caller can hide.
5. Say the location out loud and send units.

The Whisper Twist — MANDATORY, raise it on your third or fourth turn:
"I need you to whisper now — can you still hear me?"
From then on the caller is whispering, so ask them to repeat more often, in character.
Adaptive: if they describe the place confidently, converge on the location faster and add one question about what the men look like. If they flounder, narrow to yes/no questions ("Is the water on your left or your right?") — the scene still reaches its end, but they produced less.

Target language (weave in, never announce):
- there's a… / there are… / I can see…
- prepositions of place: across from, next to, behind, on the other side of
- present continuous for what is happening now: they're coming up the stairs
- numbers and short urgent requests: three men, please hurry, send someone

How to correct — this is the ONLY method, no lectures:
Recast. When they slip, answer using the correct form as if that is what they said. "I see bridge yellow" becomes "A yellow bridge — good. On which side of the river?" Never say they are wrong, never read out a rule, never speak grammar labels out loud.
If a mistake blocks the meaning, ask a gentle in-character question instead.
If they freeze, offer a line to copy in the dispatcher's own voice: "Take a breath. You can just tell me — 'I can see a river and a red chimney.'"

The Ending (this is what completes the scene):
The moment you can place them, say it out loud: "Units are on the way to the old Miller and Sons mill by the river — stay quiet and stay on the line." Then give a short SPOKEN wrap-up, like a dispatcher talking it through after the fact, never a written report: whether the description was clear enough to act on, one phrase to fix, and one phrase that would have got help there faster.

Passed = the dispatcher located the caller and said out loud where units are being sent. Being polite is not the point here; being understood is. If the line drops before you can place them, that is a fail — nothing else here is a fail.

Score = how much of the target language THEY produced: landmarks in their own sentences rather than yes/no answers to your prompts, at least two prepositions of place, what is happening in present continuous, the number of men, and a clear request for help.
```

- [ ] **Step 2: Скопировать в папку агента**

```bash
cp data/scenarios/911-call.md agent/scenarios/911-call.md
diff data/scenarios/911-call.md agent/scenarios/911-call.md && echo IDENTICAL
```

Expected: `IDENTICAL`.

- [ ] **Step 3: Запись в реестре**

В `src/tutor/scenarios.js`, в конец массива `SCENARIOS` (после `doctors-office`):

```js
  {
    id: '911-call',
    label: 'Emergency Call',
    img: '/tutor/911-call.jpg',
    badge: '🚨',
    // Сцена вне сюжета «Newcomer in the USA»: requires ей не нужен.
    // Брифинг обязателен — ученик описывает то, чего разговор ему не сообщает.
    brief: true,
    // Пять минут. Дальше связь рвётся: успеть вызвать помощь — это и есть
    // задача, а не украшение.
    timeLimitSec: 300,
  },
```

- [ ] **Step 4: Описание и брифинг в трёх словарях**

ru — рядом с остальными `scen.desc.*`:

```js
    'scen.desc.911-call':
      'звонок в 911: объяснить диспетчеру, где ты, не зная адреса — пять минут',
    'scen.brief.911-call':
      'Ты на втором этаже заброшенной бумажной фабрики на окраине города.\nАдреса ты не знаешь. Телефон почти разряжен.\nВнизу трое мужчин — они ищут тебя. Слышны шаги на лестнице.\nИз окна видно: река, красная кирпичная труба, ржавая вывеска MILLER & SONS PAPER MILL, вдалеке жёлтый мост. На двери рядом — номер GATE 4.\nЗадача: за 5 минут добиться, чтобы полиция выехала. Говори тихо.',
```

kz:

```js
    'scen.desc.911-call':
      '911-ге қоңырау: мекенжайды білмей тұрып, диспетчерге қайдасың екенін түсіндір — бес минут',
    'scen.brief.911-call':
      'Сен қала шетіндегі тасталған қағаз фабрикасының екінші қабатындасың.\nМекенжайды білмейсің. Телефон отыруға жақын.\nТөменде үш еркек — олар сені іздеп жүр. Баспалдақтан қадам дыбысы естіледі.\nТерезеден көрінеді: өзен, қызыл кірпіш мұржа, тот басқан MILLER & SONS PAPER MILL жазуы, алыста сары көпір. Қасындағы есікте — GATE 4 нөмірі.\nМіндет: 5 минут ішінде полицияны шақыру. Ақырын сөйле.',
```

en:

```js
    'scen.desc.911-call':
      'a 911 call: make the dispatcher understand where you are without an address — five minutes',
    'scen.brief.911-call':
      "You're on the second floor of an abandoned paper mill on the edge of town.\nYou don't know the address. Your phone is almost dead.\nThree men are downstairs, looking for you. You can hear steps on the stairs.\nFrom the window: a river, a red brick chimney, a rusted sign reading MILLER & SONS PAPER MILL, a yellow bridge in the distance. The nearest door is marked GATE 4.\nYour task: get the police on the way within 5 minutes. Keep your voice down.",
```

- [ ] **Step 5: Картинка карточки**

Положить `public/tutor/911-call.jpg`. Своей ещё нет — временно скопировать существующую, чтобы сетка карточек не рвалась пустой плиткой:

```bash
cp public/tutor/visa-interview.jpg public/tutor/911-call.jpg
```

Заменить на собственную до мержа.

- [ ] **Step 6: Проверить, что брифинг подхватился**

Дописать в `src/tutor/scenarioBrief.test.js`:

```js
import { SCENARIOS } from './scenarios.js'

describe('911-call', () => {
  it('помечен как сцена с брифингом и своими часами', () => {
    const s = SCENARIOS.find((x) => x.id === '911-call')
    expect(s.brief).toBe(true)
    expect(s.timeLimitSec).toBe(300)
  })
})
```

Run: `npm test -- src/tutor/scenarioBrief.test.js`
Expected: PASS.

Дописать в `src/tutor/ScenarioBrief.test.jsx` положительный случай — теперь в словаре есть первый ключ `scen.brief.*`:

```jsx
  it('рисует пункты ситуации и переданное действие', () => {
    renderBrief({
      scenarioId: '911-call',
      action: <button type="button">Поехали</button>,
    })
    expect(screen.getByRole('note')).toBeTruthy()
    // Пять строк брифинга — по строке на пункт.
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Поехали')).toBeTruthy()
  })
```

Run: `npm test -- src/tutor/ScenarioBrief.test.jsx`
Expected: PASS, 3 теста.

- [ ] **Step 7: Сборка, линт, полный vitest**

Run: `npm run build`
Expected: `Compiled successfully`.

Run: `npm run lint`
Expected: без новых ошибок.

Run: `npm test`
Expected: без новых падений.

- [ ] **Step 8: Коммит**

```bash
git add data/scenarios/911-call.md agent/scenarios/911-call.md src/tutor/scenarios.js src/tutor/scenarioBrief.test.js src/i18n/dict.js public/tutor/911-call.jpg
git commit -m "feat(tutor): the 911 call scenario"
```

---

### Task 8: Прогон вживую и PR

**Files:**
- Modify: ничего (только проверка и, если найдутся, точечные правки)

**Interfaces:**
- Consumes: всё выше.

- [ ] **Step 1: Убедиться, что папки сцен не разъехались**

```bash
diff -r data/scenarios agent/scenarios && echo IDENTICAL
```

Expected: `IDENTICAL`.

- [ ] **Step 2: Поднять дев-сервер и открыть сцену**

Открыть `http://localhost:3000/?screen=tutor-scenarios`, кликнуть карточку Emergency Call.

Ожидаемо: сначала плашка «Ситуация» с пятью строками и кнопкой «Я готов, звоню»; звонок НЕ стартует, пока кнопка не нажата.

- [ ] **Step 3: Проверить часы и шпаргалку**

Ожидаемо: таймер стартует с `05:00`, а не с дневного лимита; кнопка «Ситуация» слева сверху разворачивает плашку поверх лица и сворачивает обратно.

- [ ] **Step 4: Проверить успешный исход**

Описать диспетчеру реку, красную трубу и вывеску. Ожидаемо: он произносит вслух, куда высылает наряд, и приходит экран результата с `passed`.

- [ ] **Step 5: Проверить обрыв**

Начать сцену и молчать (или отвечать «I don't know»). Ожидаемо: на `00:10` экран сменяется надписью «Связь пропала», следом — результат с `passed=false`. Экран НЕ должен закрыться сам: выход только кнопкой «Готово».

- [ ] **Step 6: Проверить, что не сломан обычный тьютор**

Открыть обычный разговор без сценария. Ожидаемо: гейта нет, кнопки «Ситуация» нет, таймер идёт от дневного лимита.

- [ ] **Step 7: Задеплоить агента**

```bash
cd agent && lk agent deploy --yes
```

Без этого прод не узнает ни про часы сцены, ни про файл `911-call.md`: сцена молча свалится в обычного тьютора, а обрыва не будет вовсе.

- [ ] **Step 8: PR в develop**

```bash
git push -u origin feat/tutor-scenario-brief-911
gh pr create --base develop --title "feat(tutor): брифинг сцены, часы сцены и звонок в 911" --body "См. docs/superpowers/specs/2026-08-06-scenario-brief-and-911-design.md"
```

---

## Замечания к исполнению

- **Три места синхронизации** у сцены с брифингом: `scen.brief.<id>` в трёх словарях и блок `WHAT THE LEARNER CAN SEE` в `.md` (в двух папках). Правишь одно — правь все: разойдутся, и диспетчер начнёт принимать выдуманные детали, а вместе с ними обесценится вся проверка «поняли тебя или нет».
- **Десять секунд обрыва** заданы дважды: `CLOCK_CUT_LEAD_SEC` в `src/tutor/scenarioClock.js` и `cut_at` в `agent/agent.py`. Питон не импортирует JS, поэтому дублирование неизбежно — но менять их можно только парой.
- **`passed` и `score` не сливать.** Сцену можно дотащить одними «yes» на наводящие вопросы диспетчера: тогда `passed=true` при низком `score`, и это правильный результат, а не баг.
