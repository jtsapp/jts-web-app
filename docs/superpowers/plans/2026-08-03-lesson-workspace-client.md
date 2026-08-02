# Клиентский workspace живого урока — план (под-проект №1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Visual (UI) tasks MUST also load the **frontend-design** skill. Steps use checkbox (`- [ ]`).

**Goal:** Собрать новый клиентский экран `LessonWorkspacePage` в jts-web-app по макету пользователя (шапка + 3 колонки: маршрут / контент / видео-топики-чат), нативными компонентами, на примерном JSON-уроке.

**Architecture:** Новый экран под `?screen=lesson-workspace`, вне `LearningLayout`. Данные — примерный `sampleLesson.js` в форме, совместимой с будущим экстрактором. Практика/теория — нативные компоненты, зеркалящие грейдинг `LessonPlayer`. Видео — визуальная заглушка. Без бэкенда/STOMP.

**Tech Stack:** Next.js (App Router), React (client components), Manrope, Playwright (тест-раннер — юнит-спеки импортируют модуль напрямую и используют `@playwright/test`).

## Global Constraints

- Ветка `feat/lesson-workspace-client` от `develop`. **НЕ мержить и НЕ открывать PR до явного разрешения пользователя.**
- Токены: акцент `#9047ff`, ink `#171326`, muted `#8b8a97`, зона-фон `#f4f5f7`, карточка `#fff`/radius 16px/тень `0 2px 8px rgba(0,0,0,0.04)`/бордер `#efeef4`. Верно `#34a853` (bg `#e9f6ee`), неверно `#e5675f` (bg `#fdecec`), чип-фон `#f0ebff`. Шрифт Manrope. Только светлая тема (тёмной в репозитории нет).
- Все CSS-классы экрана — префикс `.lw-`. Стили в новом `src/lessonWorkspace.css`, импорт в `src/app/layout.jsx`.
- Не трогать `LiveLessonPage`, IELTS, web-admin, бэкенд.
- Тест-раннер — Playwright. Юнит-спека: `import { test, expect } from '@playwright/test'`, импорт модуля напрямую. Запуск: `npx playwright test tests/<name>.spec.js --project=mobile`.
- i18n: ключи `lesson.ws.*` во ВСЕ три локали (`ru`/`en`/`kk`) в `src/i18n.jsx`, в конец кластера `lesson.*` (после `'lesson.loadError'`: ru ~175, en ~536, kk ~895).

## Макет (описание для реализации)

Шапка (белая полоса): слева `<Logo/>` + круглый бейдж уровня «A2» (фиолетовый) + «Unit 4 — Мой день»; по центру ряд точек-прогресса шагов (пройденные — фиолетовые); справа таймер «01:43 / 50:00» и кнопка-пилюля «Выйти из урока».

Левая колонка «Маршрут урока» (заголовок + «9 шагов»): вертикальный список, каждый пункт — мелкая подпись «ШАГ 01» + заголовок; текущий шаг с фиолетовым маркером-кружком и жирным текстом, пройденные — с галочкой, будущие — приглушённые; слева вертикальная линия-коннектор.

Центр (скроллится): карточки блоков активного шага —
- Фиолетовый баннер со смайлом-маскотом справа (в первом шаге «Место для баннера», в разделителе «Вторая часть урока»).
- Карточка «Теория» с меткой времени «7 мин»: заголовок «Present Simple: привычки и расписание», абзац, строка форм-чипов (I/you/we/they → work; he/she/it → **works**), таблица трёх форм (Утверждение/Отрицание/Вопрос с примерами, где глагол подсвечен фиолетовым), плашка-предупреждение «Частая ошибка …».
- Карточка «Практика 1» (метка «5 мин, выбор формы»): «Выбери верную форму», подпись «Один клик — сразу видно, попал или нет», 3 вопроса с рядами чипов-вариантов; после проверки верный чип зелёный, неверный выбранный — красный.
- Карточка «Практика 2» (gap-fill): предложения с инлайн-инпутами `(wake)`, `(grab)` и т.д.; кнопка «Проверить».

Правая колонка:
- Плитка видео: превью учителя (фон-картинка) + маленькое PiP-превью ученика + подпись «Дана»; ряд круглых кнопок мик/камера/выйти (заглушки, неактивные).
- Карточка «Топики урока N/5»: список Разогрев/Правило/Практика/Применение/Финал, активный подсвечен фиолетовым.
- Карточка «Чат с учителем»: пузыри (учитель — фиолетовые слева, ученик — светлые справа/наоборот по макету), поле «Сообщение…» + круглая кнопка отправки.

---

### Task 1: Данные урока + логика практики + юнит-тесты

**Files:**
- Create: `src/screens/workspace/sampleLesson.js`
- Create: `src/screens/workspace/practiceGrading.js`
- Test: `tests/lesson-workspace-grading.spec.js`

**Interfaces (Produces):**
- `SAMPLE_LESSON` — объект урока (см. ниже).
- `norm(s): string` — нормализация текстового ответа.
- `gradeQuestion(question, answer): { correct: boolean }` — для типов choice/chips/gap.
- `stepProgress(steps, answers): { done: number, total: number }` — сколько шагов с практикой пройдено верно.

- [ ] **Step 1: Написать падающий тест**

```js
// tests/lesson-workspace-grading.spec.js
import { test, expect } from '@playwright/test'
import { norm, gradeQuestion } from '../src/screens/workspace/practiceGrading.js'
import { SAMPLE_LESSON } from '../src/screens/workspace/sampleLesson.js'

test.describe('practiceGrading', () => {
  test('norm убирает регистр/пунктуацию/пробелы', () => {
    expect(norm('  Does  ')).toBe('does')
    expect(norm("don't do!")).toBe('dont do')
  })
  test('choice — верно только при точном совпадении', () => {
    const q = { id: 'q', type: 'choice', options: ['commute', 'commutes', 'is commute'], answer: 'commutes' }
    expect(gradeQuestion(q, 'commutes').correct).toBe(true)
    expect(gradeQuestion(q, 'commute').correct).toBe(false)
    expect(gradeQuestion(q, null).correct).toBe(false)
  })
  test('chips — сравнение по answer', () => {
    const q = { id: 'q', type: 'chips', bank: ['Does', 'Do', 'Is'], answer: 'Does' }
    expect(gradeQuestion(q, 'Does').correct).toBe(true)
    expect(gradeQuestion(q, 'Do').correct).toBe(false)
  })
  test('gap — нормализация + несколько допустимых', () => {
    const q = { id: 'q', type: 'gap', answers: ["doesn't drive", 'does not drive'] }
    expect(gradeQuestion(q, "Doesn't  drive").correct).toBe(true)
    expect(gradeQuestion(q, 'does not drive').correct).toBe(true)
    expect(gradeQuestion(q, 'drive').correct).toBe(false)
    expect(gradeQuestion(q, '').correct).toBe(false)
  })
  test('SAMPLE_LESSON корректной формы', () => {
    expect(SAMPLE_LESSON.steps.length).toBe(9)
    expect(SAMPLE_LESSON.topics.length).toBe(5)
    for (const s of SAMPLE_LESSON.steps) expect(typeof s.title).toBe('string')
    // хотя бы один practice-блок с вопросами
    const qs = SAMPLE_LESSON.steps.flatMap((s) => s.blocks).filter((b) => b.type === 'practice').flatMap((b) => b.questions)
    expect(qs.length).toBeGreaterThan(0)
    for (const q of qs) expect(['choice', 'chips', 'gap']).toContain(q.type)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx playwright test tests/lesson-workspace-grading.spec.js --project=mobile`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `practiceGrading.js`**

```js
// src/screens/workspace/practiceGrading.js
// Чистая логика практики workspace. Зеркалит грейдинг LessonPlayer (norm()).

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// answer: для choice/chips — выбранная строка; для gap — введённый текст.
export function gradeQuestion(question, answer) {
  if (!question || answer == null) return { correct: false }
  if (question.type === 'choice') return { correct: answer === question.answer }
  if (question.type === 'chips') return { correct: answer === question.answer }
  if (question.type === 'gap') {
    const good = (question.answers || []).map(norm)
    return { correct: norm(answer) !== '' && good.includes(norm(answer)) }
  }
  return { correct: false }
}

// Шаг «пройден», если все его practice-вопросы отвечены верно.
export function stepProgress(steps, answers = {}) {
  let done = 0
  const total = steps.length
  for (const step of steps) {
    const qs = (step.blocks || []).filter((b) => b.type === 'practice').flatMap((b) => b.questions || [])
    if (qs.length === 0) continue
    const allOk = qs.every((q) => gradeQuestion(q, answers[q.id]).correct)
    if (allOk) done++
  }
  return { done, total }
}
```

- [ ] **Step 4: Реализовать `sampleLesson.js`** (контент из макета)

```js
// src/screens/workspace/sampleLesson.js
// Примерный урок для клиентского workspace (под-проект №1). Форма совместима с
// будущим выходом экстрактора HTML→JSON (под-проект №2).

export const SAMPLE_LESSON = {
  id: 'sample-a2-u4',
  unit: 'Unit 4 — Мой день',
  level: 'A2',
  durationSec: 3000, // 50:00
  teacher: { name: 'Дана' },
  topics: [
    { id: 't1', title: 'Разогрев' },
    { id: 't2', title: 'Правило' },
    { id: 't3', title: 'Практика' },
    { id: 't4', title: 'Применение' },
    { id: 't5', title: 'Финал' },
  ],
  steps: [
    { id: 's1', order: 1, title: 'Мой день, разминка', topicId: 't1', blocks: [
      { type: 'banner', title: 'Место для\nбаннера' },
      { type: 'theory', title: 'Present Simple: привычки и расписание', minutes: 7,
        text: 'Используем, когда действие повторяется: каждый день, по средам, никогда.',
        forms: [
          { label: 'I / you / we / they', example: 'work' },
          { label: 'he / she / it', example: 'works', accent: true },
        ],
        table: [
          { kind: 'Утверждение', example: 'She gets up at seven.', accent: 'gets' },
          { kind: 'Отрицание', example: "She doesn't get up at seven.", accent: "doesn't get" },
          { kind: 'Вопрос', example: 'Does she get up at seven?', accent: 'Does get' },
        ],
        mistake: 'В отрицании и вопросе -s уходит к does, а глагол остаётся чистым: Does she gets up? → Does she get up?' },
      { type: 'practice', title: 'Выбери верную форму', minutes: 5, hint: 'Один клик — сразу видно, попал или нет', questions: [
        { id: 'p1q1', type: 'choice', prompt: 'My brother ____ to the office by bus every morning.', options: ['commute', 'commutes', 'is commute'], answer: 'commutes' },
        { id: 'p1q2', type: 'chips', gapBefore: '', gapAfter: ' she rush in the mornings?', bank: ['Does', 'Do', 'Is'], answer: 'Does' },
        { id: 'p1q3', type: 'chips', gapBefore: 'We ', gapAfter: ' chores on Sundays.', bank: ["doesn't do", 'not do', "don't do"], answer: "don't do" },
      ] },
    ] },
    { id: 's2', order: 2, title: 'Слова дня', topicId: 't1', blocks: [
      { type: 'banner', title: 'Вторая часть\nурока' },
      { type: 'practice', title: 'Выбери верную форму', minutes: 5, questions: [
        { id: 'p2q1', type: 'gap', gapBefore: 'Alina ', gapAfter: ' (wake) up at 6:30 and grabs (grab) a bite.', answers: ['wakes'] },
        { id: 'p2q2', type: 'gap', gapBefore: 'Her father ', gapAfter: ' (not / drive) to work — he walks.', answers: ["doesn't drive", 'does not drive'] },
        { id: 'p2q3', type: 'gap', gapBefore: '', gapAfter: ' (do) you often wind (wind) down after 9 pm?', answers: ['Do'] },
      ] },
    ] },
    { id: 's3', order: 3, title: 'Правило Present Simple', topicId: 't2', blocks: [
      { type: 'theory', title: 'Правило', text: 'he / she / it → глагол + -s. Вопрос и отрицание через do/does.' },
    ] },
    { id: 's4', order: 4, title: 'Выбор формы', topicId: 't3', blocks: [
      { type: 'practice', title: 'Выбери верную форму', questions: [
        { id: 's4q1', type: 'choice', prompt: 'She ____ tea every evening.', options: ['drink', 'drinks'], answer: 'drinks' },
      ] },
    ] },
    { id: 's5', order: 5, title: 'Пропуски', topicId: 't3', blocks: [
      { type: 'practice', title: 'Заполни пропуск', questions: [
        { id: 's5q1', type: 'gap', gapBefore: 'They ', gapAfter: ' (play) football on Fridays.', answers: ['play'] },
      ] },
    ] },
    { id: 's6', order: 6, title: 'Порядок слов', topicId: 't4', blocks: [
      { type: 'practice', title: 'Собери вопрос', questions: [
        { id: 's6q1', type: 'chips', gapBefore: '', gapAfter: ' he like coffee?', bank: ['Does', 'Do'], answer: 'Does' },
      ] },
    ] },
    { id: 's7', order: 7, title: 'Чтение', topicId: 't4', blocks: [
      { type: 'theory', title: 'Чтение', text: 'Прочитай текст о распорядке дня и ответь на вопросы учителя в чате.' },
    ] },
    { id: 's8', order: 8, title: 'Разговор', topicId: 't5', blocks: [
      { type: 'theory', title: 'Разговор', text: 'Расскажи о своём типичном дне, используя Present Simple.' },
    ] },
    { id: 's9', order: 9, title: 'Итог урока', topicId: 't5', blocks: [
      { type: 'theory', title: 'Итог урока', text: 'Ты научился(ась) говорить о привычках и расписании в Present Simple. Молодец!' },
    ] },
  ],
  chat: [
    { id: 'm1', from: 'teacher', text: 'Открой шаг 4, начнём с него' },
    { id: 'm2', from: 'student', text: 'ок, вижу' },
    { id: 'm3', from: 'teacher', text: 'commute = добираться на работу, не путай с come' },
  ],
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npx playwright test tests/lesson-workspace-grading.spec.js --project=mobile`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/workspace/practiceGrading.js src/screens/workspace/sampleLesson.js tests/lesson-workspace-grading.spec.js
git commit -m "feat(lesson-ws): примерный урок + логика практики + тесты"
```

---

### Task 2: Плумбинг — иконки, i18n, CSS-файл, роутинг (экран достижим со стабом)

**Files:**
- Modify: `src/components/icons.jsx` (добавить `CameraIcon`, `CheckIcon`)
- Modify: `src/i18n.jsx` (ключи `lesson.ws.*` в 3 локали)
- Create: `src/lessonWorkspace.css` (базовые токены-обёртки + классы будут дополняться в задачах 3–6)
- Modify: `src/app/layout.jsx` (импорт css)
- Modify: `src/App.jsx` (импорт + `case 'lesson-workspace'`)
- Create: `src/screens/LessonWorkspacePage.jsx` (пока стаб-заглушка, наполнится в Task 6)

**Interfaces (Produces):** `CameraIcon`, `CheckIcon`; экран открывается по `?screen=lesson-workspace` и рендерит контейнер `.lw` с `data-testid="lesson-workspace"`.

- [ ] **Step 1: Добавить иконки** в `src/components/icons.jsx` (в стиле соседних — `viewBox 0 0 24 24`, `size`):

```jsx
export function CameraIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.4l1-1.6A1 1 0 0 1 8.75 4h6.5a1 1 0 0 1 .85.4l1 1.6h1.4A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function CheckIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

- [ ] **Step 2: Добавить i18n-ключи** в конец кластера `lesson.*` во всех трёх локалях (`src/i18n.jsx`, после `'lesson.loadError'`).

ru:
```jsx
    'lesson.ws.route': 'Маршрут урока',
    'lesson.ws.steps': '{n} шагов',
    'lesson.ws.step': 'ШАГ {n}',
    'lesson.ws.exit': 'Выйти из урока',
    'lesson.ws.check': 'Проверить',
    'lesson.ws.mistake': 'Частая ошибка',
    'lesson.ws.topics': 'Топики урока',
    'lesson.ws.chat': 'Чат с учителем',
    'lesson.ws.message': 'Сообщение…',
    'lesson.ws.call': 'Позвонить учителю',
    'lesson.ws.theoryForms': 'Три формы',
    'lesson.ws.affirm': 'Утверждение',
    'lesson.ws.negate': 'Отрицание',
    'lesson.ws.question': 'Вопрос',
```
en:
```jsx
    'lesson.ws.route': 'Lesson route',
    'lesson.ws.steps': '{n} steps',
    'lesson.ws.step': 'STEP {n}',
    'lesson.ws.exit': 'Exit lesson',
    'lesson.ws.check': 'Check',
    'lesson.ws.mistake': 'Common mistake',
    'lesson.ws.topics': 'Lesson topics',
    'lesson.ws.chat': 'Chat with teacher',
    'lesson.ws.message': 'Message…',
    'lesson.ws.call': 'Call teacher',
    'lesson.ws.theoryForms': 'Three forms',
    'lesson.ws.affirm': 'Affirmative',
    'lesson.ws.negate': 'Negative',
    'lesson.ws.question': 'Question',
```
kk:
```jsx
    'lesson.ws.route': 'Сабақ бағыты',
    'lesson.ws.steps': '{n} қадам',
    'lesson.ws.step': 'ҚАДАМ {n}',
    'lesson.ws.exit': 'Сабақтан шығу',
    'lesson.ws.check': 'Тексеру',
    'lesson.ws.mistake': 'Жиі қате',
    'lesson.ws.topics': 'Сабақ тақырыптары',
    'lesson.ws.chat': 'Мұғаліммен чат',
    'lesson.ws.message': 'Хабарлама…',
    'lesson.ws.call': 'Мұғалімге қоңырау',
    'lesson.ws.theoryForms': 'Үш форма',
    'lesson.ws.affirm': 'Растау',
    'lesson.ws.negate': 'Терістеу',
    'lesson.ws.question': 'Сұрақ',
```

- [ ] **Step 3: Создать `src/lessonWorkspace.css`** с базовой раскладкой (детальные классы блоков добавят задачи 3–6):

```css
/* Клиентский workspace живого урока (.lw-*). Только светлая тема. */
.lw { min-height: 100vh; display: flex; flex-direction: column; background: #f4f5f7; color: var(--ink); }
.lw__body { flex: 1; display: flex; align-items: stretch; min-height: 0; }
.lw__main { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; padding: 24px 28px 40px; align-items: start; overflow: auto; }
.lw-card { background: #fff; border: 1px solid #efeef4; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
@media (max-width: 1100px) {
  .lw__main { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 4: Импорт css** в `src/app/layout.jsx` — добавить после `import '../shadowing.css'`:

```jsx
import '../lessonWorkspace.css'
```

- [ ] **Step 5: Стаб-экран** `src/screens/LessonWorkspacePage.jsx`:

```jsx
'use client'

import { SAMPLE_LESSON } from './workspace/sampleLesson.js'

export default function LessonWorkspacePage({ onExit }) {
  const lesson = SAMPLE_LESSON
  return (
    <div className="lw" data-testid="lesson-workspace">
      <div className="lw__body">
        <div className="lw__main">
          <div className="lw-card" style={{ padding: 20 }}>{lesson.unit}</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Роутинг** в `src/App.jsx` — (a) импорт рядом с другими экранами:

```jsx
import LessonWorkspacePage from './screens/LessonWorkspacePage.jsx'
```
(b) добавить case перед `default:` в `switch (screen)`:

```jsx
    case 'lesson-workspace':
      return <LessonWorkspacePage onExit={() => setScreen('lessons')} />
```

- [ ] **Step 7: Проверить сборку + достижимость**

Run: `npx next build 2>&1 | tail -8`
Expected: без ошибок про новые файлы.

- [ ] **Step 8: Commit**

```bash
git add src/components/icons.jsx src/i18n.jsx src/lessonWorkspace.css src/app/layout.jsx src/App.jsx src/screens/LessonWorkspacePage.jsx
git commit -m "feat(lesson-ws): плумбинг — иконки, i18n, css, роут ?screen=lesson-workspace"
```

---

### Task 3: Центр — блоки теории и практики (нативно)

**REQUIRED SUB-SKILL: frontend-design** (design engineer: токены, доступность, состояния).

**Files:**
- Create: `src/screens/workspace/LessonContent.jsx`
- Create: `src/screens/workspace/blocks/BannerBlock.jsx`
- Create: `src/screens/workspace/blocks/TheoryBlock.jsx`
- Create: `src/screens/workspace/blocks/PracticeBlock.jsx`
- Create: `src/screens/workspace/practice/ChoiceQuestion.jsx`, `ChipsQuestion.jsx`, `GapQuestion.jsx`
- Modify: `src/lessonWorkspace.css` (классы блоков/практики)

**Interfaces:**
- Consumes: `gradeQuestion` (`../practiceGrading.js`), `useI18n`, icons (`CheckIcon`), banner-рецепт `.kh-hero`.
- Produces:
  - `LessonContent({ step, answers, checked, onAnswer, onCheck })` — рендерит `step.blocks[]` диспетчером по `block.type`.
  - `PracticeBlock({ block, answers, checked, onAnswer, onCheck })` — карточка с вопросами и кнопкой «Проверить» (вызывает `onCheck(block)`).
  - `ChoiceQuestion/ChipsQuestion/GapQuestion({ question, answer, checked, onAnswer })` — контролируемые: текущий ответ `answer`, `onAnswer(question.id, value)`; после `checked` красят верно/неверно через `gradeQuestion`.

**Требования к реализации:**
- `BannerBlock`: переиспользовать рецепт `.kh-hero` (форма/тень/скругление 20px) — свой класс `.lw-banner` c инлайновым фиолетовым градиентом `linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.10)), #9047ff` и маскот-смайлом справа (эмодзи-смайл в кружке или `/assets/dexter.png`, 140–180px, свисает снизу как `.kh-hero__mascot`). `title` может содержать `\n`.
- `TheoryBlock`: карточка `.lw-card`; метка-кикер «Теория» + время `{minutes} мин` справа; заголовок; абзац (muted); ряд форм-чипов из `block.forms` (акцентный чип `accent:true` — фиолетовый фон `#f0ebff`, текст `#9047ff`); таблица `block.table` (три строки Утверждение/Отрицание/Вопрос с примерами; подсветка `accent`-подстроки фиолетовым — простое выделение по вхождению); плашка `block.mistake` — светло-жёлтый фон, иконка ⚠, текст.
- Практика — контролируемые компоненты (без внутреннего «answered»-стейта грейдинга; статус приходит через `checked` + `gradeQuestion`):
  - `ChoiceQuestion`: `prompt` + ряд кнопок-вариантов; выбранный — рамка/фон акцент; после `checked` верный `#34a853`/bg `#e9f6ee`, выбранный неверный `#e5675f`/bg `#fdecec`.
  - `ChipsQuestion`: строка `gapBefore [gap] gapAfter` + банк чипов; выбранный подставляется в gap; цвета после `checked` как выше.
  - `GapQuestion`: строка с инлайн-`<input>`; после `checked` рамка/фон по результату; нормализация — через `gradeQuestion` (не дублировать `norm`).
- `PracticeBlock`: заголовок + `hint`; список вопросов; кнопка «Проверить» (`t('lesson.ws.check')`) внизу; после проверки допускается повторное «Проверить».
- Доступность: варианты — `<button>`, инпут с `aria-label`; фокус-стили видимы; цвет не единственный признак (после проверки у верного — галочка `CheckIcon`).

- [ ] **Step 1: Реализовать компоненты** (JSX по интерфейсам выше; управляемые через props; грейдинг только через `gradeQuestion`).
- [ ] **Step 2: Стили** `.lw-banner`, `.lw-theory*`, `.lw-practice*`, `.lw-q*`, чипы/инпут/кнопка — в `src/lessonWorkspace.css`, по токенам.
- [ ] **Step 3: Сборка** `npx next build 2>&1 | tail -8` — без ошибок про новые файлы.
- [ ] **Step 4: Commit**

```bash
git add src/screens/workspace/LessonContent.jsx src/screens/workspace/blocks src/screens/workspace/practice src/lessonWorkspace.css
git commit -m "feat(lesson-ws): центр — баннер, теория, практика (choice/chips/gap)"
```

---

### Task 4: Шапка + левый «Маршрут урока»

**REQUIRED SUB-SKILL: frontend-design.**

**Files:**
- Create: `src/screens/workspace/WorkspaceHeader.jsx`
- Create: `src/screens/workspace/LessonRoute.jsx`
- Modify: `src/lessonWorkspace.css`

**Interfaces:**
- Consumes: `Logo`, `useI18n`, icons.
- Produces:
  - `WorkspaceHeader({ lesson, stepIndex, elapsedSec, onExit })` — Logo, бейдж уровня, unit, точки-прогресс по шагам (пройдено = `stepIndex`), таймер `mm:ss / mm:ss` (elapsed / durationSec), кнопка «Выйти».
  - `LessonRoute({ steps, activeStepId, statusById, onSelect })` — колонка «Маршрут урока» + «{n} шагов»; каждый шаг: «ШАГ NN» + title; статус из `statusById[id]` ∈ `done|current|locked`; клик → `onSelect(id)`. Вертикальная линия-коннектор.

**Требования:**
- Шапка — белая полоса, `justify-content: space-between`, паттерн `.reg-header` (padding ~20–24px). Бейдж уровня — круг/пилюля `#9047ff`/белый текст. Точки прогресса: маленькие капсулы, пройденные фиолетовые, текущая длиннее, будущие `#e9e6f5`. Таймер — muted, моноширинные цифры допустимы. «Выйти» — светлая пилюля с иконкой.
- Левая колонка — фиксированная ширина ~240px, sticky, `border-right: 1px solid #efeef4`, фон `#fff`. Текущий шаг — фиолетовый маркер + жирный; done — галочка `CheckIcon` в кружке `#34a853`; locked — приглушённый, `cursor: default`. Форматирование номера: `String(order).padStart(2,'0')`.
- Таймер-форматтер — маленькая чистая функция в компоненте или в `practiceGrading.js`/utils (по желанию), но без внешних зависимостей.

- [ ] **Step 1: Реализовать компоненты.**
- [ ] **Step 2: Стили** `.lw-header*`, `.lw-route*` в css.
- [ ] **Step 3: Сборка** `npx next build 2>&1 | tail -8`.
- [ ] **Step 4: Commit**

```bash
git add src/screens/workspace/WorkspaceHeader.jsx src/screens/workspace/LessonRoute.jsx src/lessonWorkspace.css
git commit -m "feat(lesson-ws): шапка + левый маршрут урока"
```

---

### Task 5: Правая колонка — видео-плитка, топики, чат

**REQUIRED SUB-SKILL: frontend-design.**

**Files:**
- Create: `src/screens/workspace/LessonAside.jsx`
- Create: `src/screens/workspace/CallTile.jsx`
- Create: `src/screens/workspace/TopicsList.jsx`
- Create: `src/screens/workspace/TeacherChat.jsx`
- Modify: `src/lessonWorkspace.css`

**Interfaces:**
- Produces:
  - `LessonAside({ lesson, activeTopicId, messages, onSend })` — компонует CallTile + TopicsList + TeacherChat.
  - `CallTile({ teacherName })` — плитка звонка (заглушка): область превью учителя (градиент/плейсхолдер), маленькое PiP ученика, подпись имени, ряд круглых кнопок Mic/Camera/Leave (`MicIcon`/`CameraIcon`/`CloseIcon`) — `disabled` или no-op, `title`/`aria-label` заданы.
  - `TopicsList({ topics, activeTopicId })` — «Топики урока N/5» (N = индекс активного+1), список; активный — фиолетовый.
  - `TeacherChat({ messages, onSend })` — список пузырей (`from: 'teacher'|'student'`), поле ввода + кнопка `SendIcon`; Enter и клик отправляют `onSend(text)`; пустой ввод игнорируется; пустой список — подсказка.

**Требования:**
- Всё в карточках `.lw-card`. Пузыри: учитель — фиолетовый/светло-фиолетовый, ученик — светло-серый, скругления, перенос длинного текста. Ввод — `input` + круглая фиолетовая кнопка отправки. Плитка звонка — соотношение ~4:3, скругление 14px, кнопки 36–40px круглые на полупрозрачной подложке. Кнопки звонка нефункциональны (заглушка) — это ок для №1.
- Автоскролл списка сообщений вниз при добавлении (useEffect + ref) — по желанию, но желательно.

- [ ] **Step 1: Реализовать компоненты.**
- [ ] **Step 2: Стили** `.lw-call*`, `.lw-topics*`, `.lw-chat*`.
- [ ] **Step 3: Сборка** `npx next build 2>&1 | tail -8`.
- [ ] **Step 4: Commit**

```bash
git add src/screens/workspace/LessonAside.jsx src/screens/workspace/CallTile.jsx src/screens/workspace/TopicsList.jsx src/screens/workspace/TeacherChat.jsx src/lessonWorkspace.css
git commit -m "feat(lesson-ws): правая колонка — видео-плитка, топики, чат"
```

---

### Task 6: Сборка экрана + стейт + e2e

**REQUIRED SUB-SKILL: frontend-design** (финальная компоновка/адаптив).

**Files:**
- Modify: `src/screens/LessonWorkspacePage.jsx` (заменить стаб на полную сборку)
- Modify: `src/lessonWorkspace.css` (адаптив, липкость колонок)
- Test: `tests/lesson-workspace.spec.js`

**Interfaces:**
- Consumes: `WorkspaceHeader`, `LessonRoute`, `LessonContent`, `LessonAside`, `SAMPLE_LESSON`, `stepProgress`, `gradeQuestion`.

**Стейт в `LessonWorkspacePage`:**
- `activeStepId` (по умолчанию `steps[0].id`).
- `answers` — `{ [questionId]: value }`.
- `checkedSteps` — `Set`/объект отмеченных «Проверить» шагов (для покраски).
- `messages` — из `lesson.chat`, `onSend` добавляет `{ id, from:'student', text }`.
- `elapsedSec` — статично (напр. 103 = 01:43) или простой `setInterval` (по желанию; для e2e хватит статики).
- `statusById` — из `activeStepId` + `stepProgress`/пройденности: текущий = active; done = все practice верны; остальные до текущего = done, после — locked (на моке допускаем клик по любому — не блокируем реально, статус визуальный).
- Хендлеры: `onSelectStep(id)`, `onAnswer(qid, value)`, `onCheck(block)` (помечает шаг checked), `onSend(text)`.

**Требования:** раскладка `.lw` (шапка сверху; ниже `.lw__body` flex: `LessonRoute` + `.lw__main` grid `minmax(0,1fr) 340px` с центром и `LessonAside`). Липкие: шапка, левый маршрут, правая колонка; скроллит центр. Адаптив: ≤1100px правая колонка уходит вниз; ≤720px маршрут скрывается (прогресс остаётся в шапке).

- [ ] **Step 1: Написать падающий e2e**

```js
// tests/lesson-workspace.spec.js
import { test, expect } from '@playwright/test'

test.describe('lesson workspace', () => {
  test('рендерит 3 колонки, маршрут, практику, чат', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    const root = page.locator('[data-testid="lesson-workspace"]')
    await expect(root).toBeVisible({ timeout: 20000 })
    // маршрут: 9 шагов
    await expect(page.locator('.lw-route__step')).toHaveCount(9)
    // центр: теория + практика присутствуют
    await expect(page.locator('.lw-theory').first()).toBeVisible()
    await expect(page.locator('.lw-practice').first()).toBeVisible()
    // правая колонка: топики + чат
    await expect(page.locator('.lw-topics')).toBeVisible()
    await expect(page.locator('.lw-chat')).toBeVisible()
    // отправка сообщения добавляет пузырь
    const before = await page.locator('.lw-chat__msg').count()
    await page.locator('.lw-chat__input').fill('привет')
    await page.locator('.lw-chat__send').click()
    await expect(page.locator('.lw-chat__msg')).toHaveCount(before + 1)
    // клик по другому шагу меняет контент
    await page.locator('.lw-route__step').nth(2).click()
    await expect(root).toBeVisible()
  })

  test('проверка практики красит ответы', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })
    // выбрать неверный вариант в первом choice и проверить
    const firstChoice = page.locator('.lw-q--choice').first()
    await firstChoice.locator('.lw-opt').first().click()
    await page.locator('.lw-practice__check').first().click()
    await expect(firstChoice.locator('.lw-opt.is-correct')).toHaveCount(1)
  })
})
```

> Селекторы (`.lw-route__step`, `.lw-theory`, `.lw-practice`, `.lw-practice__check`, `.lw-q--choice`, `.lw-opt`, `.lw-opt.is-correct`, `.lw-topics`, `.lw-chat`, `.lw-chat__msg`, `.lw-chat__input`, `.lw-chat__send`) — контракт классов; реализующие задачи 3–5 ДОЛЖНЫ использовать именно их (или обнови тест под фактические классы в этой же задаче, если ранее выбраны другие).

- [ ] **Step 2: Запустить — убедиться, что падает** (стаб не содержит колонок).

Run: `npx playwright test tests/lesson-workspace.spec.js --project=mobile`
Expected: FAIL.

- [ ] **Step 3: Реализовать полную сборку** `LessonWorkspacePage.jsx` по интерфейсам выше; добавить адаптив/липкость в css.
- [ ] **Step 4: Запустить — убедиться, что проходит.**

Run: `npx playwright test tests/lesson-workspace.spec.js --project=mobile`
Expected: PASS.

- [ ] **Step 5: Сборка** `npx next build 2>&1 | tail -8` — без ошибок.
- [ ] **Step 6: Commit**

```bash
git add src/screens/LessonWorkspacePage.jsx src/lessonWorkspace.css tests/lesson-workspace.spec.js
git commit -m "feat(lesson-ws): сборка экрана workspace + стейт + e2e"
```

---

## Self-Review

**Spec coverage:** экран/роут (Task 2,6); шапка+таймер+прогресс (Task 4); маршрут 9 шагов (Task 4); центр баннер/теория/практика native choice/chips/gap (Task 3); правая колонка плитка/топики/чат (Task 5); данные+грейдинг+совместимость с экстрактором (Task 1); состояния+адаптив (Task 6); токены/классы/i18n/иконки (Task 2,3,4,5); тесты (Task 1 юнит, Task 6 e2e). Видео — заглушка (Task 5), как в спеке.

**Placeholder scan:** код логики/данных/иконок/i18n/роутинга/тестов приведён полностью; визуальные компоненты заданы интерфейсами + требованиями + классами-контрактом + рецептами токенов (реализация — под frontend-design). Нет «TBD».

**Type consistency:** контракт практики единый — управляемые компоненты через `answer`/`onAnswer(qid,value)`/`checked`, грейдинг только `gradeQuestion`; `SAMPLE_LESSON` форма (steps/blocks/questions/topics/chat) используется одинаково во всех задачах; классы `.lw-*` из Task 6 e2e совпадают с задачами 3–5.
