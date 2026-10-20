# Отчёты о прогрессе (сторона ученика) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ученик и родитель видят одобренный отчёт о прогрессе — по ссылке `/report/<token>` без входа и во вкладке «Уроки → Отчёты»; новый отчёт приходит в колокольчик и карточкой на «Главную».

**Architecture:** чистые модули `src/feedback/` (подписи на языке отчёта, разбор ответа API, образец), один компонент вида `ReportView` на обе точки входа, тонкие обёртки ручек в `src/api.js`. Публичная страница — отдельный маршрут Next, как `trial/[token]`. Бэкенда пока нет: 404 читается как «отчётов нет», образец — `?reportSample=1` и `/report/sample` только на локалке/дев-стендах.

**Tech Stack:** Next.js App Router (оболочка) + React SPA, JavaScript (без TS), vitest + @testing-library/react (jsdom), playwright.

**Спека:** `docs/superpowers/specs/2026-10-20-feedback-reports-student-design.md`.

## Global Constraints

- JavaScript, не TypeScript; файлы `.js`/`.jsx`.
- Комментарии на русском и объясняют «почему».
- Подписи отчёта — на языке отчёта (`lang`: ru/kk/en), неизвестный → ru; свободный текст преподавателя не переводится.
- UI вкладки и публичной страницы (ошибки, пустые состояния) — через `useI18n()` из `src/i18n.jsx`, ключи в ru/en/kk.
- Стили — глобальный `src/feedback.css`, подключён в `src/app/layout.jsx`; после подключения перегенерировать `src/theme-dark.generated.css` (`node scripts/gen-dark-theme.js`).
- Цвета прототипа: фиолетовый `#9047ff`, тинт `#f2ecff`, текст `#17161f`, приглушённый `#8b8a99`, линия `#ecebf2`, фон `#f6f6fa`, зелёный `#1a9e6a`, оранжевый `#ff7300`, красный `#c92a2d`. Шрифт не задавать — наследуется от приложения.
- Ручки: `GET /mobile/feedback-reports`, `GET /mobile/feedback-reports/{id}`, `POST /mobile/feedback-reports/{id}/seen`, `GET /feedback-reports/link/{token}`, `POST /feedback-reports/link/{token}/opened`.
- Образец — только если `hostname` начинается с `localhost`, `127.0.0.1` или `dev-`.
- Вкладка «Отчёты» — только у ученика; у преподавателя её нет.
- Тесты гонять точечно (`npx vitest run <пути>`): `npm test` из основного дерева сканирует чужие worktree.

---

### Task 1: Подписи отчёта на трёх языках

**Files:**
- Create: `src/feedback/labels.js`
- Test: `src/feedback/labels.test.js`

**Interfaces:**
- Produces: `REPORT_LANGS: string[]`, `reportLang(lang) → 'ru'|'kk'|'en'`, `reportLabels(lang) → {title, attendance, homework, covered, strengths, improvements, plan, skills, teacher, pastGoals, nextGoals, footer}`, `skillName(key, lang) → string`, `goalResultLabel(result, lang) → string`, `periodLabel(periodNo, lang) → string`, `badgeView({type, n}, lang) → {icon, text} | null`, `formatLabel(format, groupName) → string`.

- [ ] **Step 1: Тест**

```js
import { describe, it, expect } from 'vitest'
import {
  REPORT_LANGS, reportLang, reportLabels, skillName, goalResultLabel, periodLabel, badgeView, formatLabel,
} from './labels.js'

const SKILLS = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary']

describe('reportLang', () => {
  it('приводит код к ru / kk / en, остальное — ru', () => {
    expect(reportLang('KK')).toBe('kk')
    expect(reportLang('kz')).toBe('kk')
    expect(reportLang('en')).toBe('en')
    expect(reportLang('de')).toBe('ru')
    expect(reportLang(undefined)).toBe('ru')
  })
})

describe('подписи на трёх языках', () => {
  it('у каждого языка есть все подписи блоков, навыков и статусов целей', () => {
    const keys = Object.keys(reportLabels('ru'))
    for (const l of REPORT_LANGS) {
      for (const k of keys) expect(reportLabels(l)[k], `${l}.${k}`).toBeTruthy()
      for (const s of SKILLS) expect(skillName(s, l), `${l}.${s}`).not.toBe(s)
      for (const r of ['achieved', 'partly', 'not']) expect(goalResultLabel(r, l), `${l}.${r}`).toBeTruthy()
    }
  })

  it('навыки и статусы — по прототипу', () => {
    expect(skillName('speaking', 'kk')).toBe('Сөйлеу')
    expect(skillName('vocabulary', 'ru')).toBe('Лексика')
    expect(skillName('unknown', 'ru')).toBe('unknown')
    expect(goalResultLabel('partly', 'en')).toBe('Partly')
    expect(goalResultLabel(null, 'ru')).toBe('')
  })
})

describe('periodLabel', () => {
  it('месяц и дни периода — 30-дневный ритм', () => {
    expect(periodLabel(2, 'ru')).toBe('2-й месяц (дни 31–60)')
    expect(periodLabel(2, 'kk')).toBe('2-ай (31–60 күн)')
    expect(periodLabel(2, 'en')).toBe('Month 2 (days 31–60)')
    expect(periodLabel(1, 'ru')).toBe('1-й месяц (дни 1–30)')
  })

  it('без номера периода — пусто, а не «NaN-й месяц»', () => {
    expect(periodLabel(null, 'ru')).toBe('')
    expect(periodLabel(0, 'ru')).toBe('')
  })
})

describe('badgeView', () => {
  it('подписывает бейдж на языке отчёта', () => {
    expect(badgeView({ type: 'skills_growth', n: 3 }, 'ru')).toEqual({ icon: '📈', text: 'Рост в 3 навыках' })
    expect(badgeView({ type: 'months_with_jts', n: 2 }, 'kk')).toEqual({ icon: '🏅', text: 'JTS-пен 2 ай' })
    expect(badgeView({ type: 'homework_hero' }, 'en')).toEqual({ icon: '📚', text: 'Homework hero' })
  })

  it('незнакомый бейдж и бейдж без числа пропускаются', () => {
    expect(badgeView({ type: 'mystery' }, 'ru')).toBeNull()
    expect(badgeView({ type: 'goals_achieved' }, 'ru')).toBeNull()
    expect(badgeView(null, 'ru')).toBeNull()
  })
})

describe('formatLabel', () => {
  it('формат занятий как в прототипе', () => {
    expect(formatLabel('individual')).toBe('1 to 1')
    expect(formatLabel('group', 'Elementary 211 (kaz)')).toBe('Group · Elementary 211 (kaz)')
    expect(formatLabel('group', null)).toBe('Group')
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/feedback/labels.test.js`
Expected: FAIL — `Failed to resolve import "./labels.js"`.

- [ ] **Step 3: Реализация**

```js
// Подписи отчёта о прогрессе — на ЯЗЫКЕ ОТЧЁТА, а не интерфейса: отчёт пишется
// родителю на его языке (поле lang), и по ссылке из мессенджера он открывает
// его без аккаунта, то есть без выбранного языка интерфейса. Тексты сняты с
// прототипа data/jts-progress-report.html (T, GT, GSTL, SNAME, badges()) —
// превью у преподавателя и вид у родителя должны совпадать слово в слово.

export const REPORT_LANGS = ['ru', 'kk', 'en']

export function reportLang(lang) {
  const l = String(lang || '').toLowerCase()
  // 'kz' — код казахского в словаре тьютора и местами на бэкенде.
  if (l === 'kz') return 'kk'
  return REPORT_LANGS.includes(l) ? l : 'ru'
}

const BLOCKS = {
  ru: {
    title: 'Отчёт о прогрессе', attendance: 'Посещаемость', homework: 'Домашние задания', covered: 'Пройдено',
    strengths: 'Сильные стороны', improvements: 'Над чем работаем', plan: 'План', skills: 'Навыки',
    teacher: 'Преподаватель', pastGoals: 'Цели прошлого отчёта', nextGoals: 'Цели на следующие 30 дней',
    footer: 'Отчёт подготовлен в школе Just to Study',
  },
  kk: {
    title: 'Прогресс есебі', attendance: 'Қатысу', homework: 'Үй тапсырмасы', covered: 'Өтілді',
    strengths: 'Күшті жақтары', improvements: 'Жұмыс істейтін тұстар', plan: 'Жоспар', skills: 'Дағдылар',
    teacher: 'Мұғалім', pastGoals: 'Өткен кезеңнің мақсаттары', nextGoals: 'Келесі 30 күнге мақсаттар',
    footer: 'Есепті Just to Study мектебі дайындады',
  },
  en: {
    title: 'Progress report', attendance: 'Attendance', homework: 'Homework', covered: 'Covered',
    strengths: 'Strengths', improvements: 'Areas to improve', plan: 'Next steps', skills: 'Skills',
    teacher: 'Teacher', pastGoals: 'Last report goals', nextGoals: 'Goals for the next 30 days',
    footer: 'Prepared by Just to Study',
  },
}

export function reportLabels(lang) {
  return BLOCKS[reportLang(lang)]
}

const SKILLS = {
  ru: { speaking: 'Говорение', listening: 'Аудирование', reading: 'Чтение', writing: 'Письмо', grammar: 'Грамматика', vocabulary: 'Лексика' },
  kk: { speaking: 'Сөйлеу', listening: 'Тыңдау', reading: 'Оқу', writing: 'Жазу', grammar: 'Грамматика', vocabulary: 'Лексика' },
  en: { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing', grammar: 'Grammar', vocabulary: 'Vocabulary' },
}

export function skillName(key, lang) {
  return SKILLS[reportLang(lang)][key] ?? key
}

const GOALS = {
  ru: { achieved: 'Достигнута', partly: 'Частично', not: 'Не достигнута' },
  kk: { achieved: 'Орындалды', partly: 'Ішінара', not: 'Орындалмады' },
  en: { achieved: 'Achieved', partly: 'Partly', not: 'Not yet' },
}

export function goalResultLabel(result, lang) {
  return GOALS[reportLang(lang)][result] ?? ''
}

// Период — «N-й месяц (дни …)», а не «Уроки 8–14» из ТЗ: та формулировка
// осталась от правила «отчёт каждые 7 уроков», которое руководство заменило
// на 30 дней (20.10.2026).
export function periodLabel(periodNo, lang) {
  const n = Number(periodNo)
  if (!Number.isInteger(n) || n < 1) return ''
  const from = (n - 1) * 30 + 1
  const to = n * 30
  const l = reportLang(lang)
  if (l === 'en') return `Month ${n} (days ${from}–${to})`
  if (l === 'kk') return `${n}-ай (${from}–${to} күн)`
  return `${n}-й месяц (дни ${from}–${to})`
}

// Бейджи СЧИТАЕТ бэкенд (спека §3.4): они видны ещё в превью web-admin и в
// тексте WhatsApp, и правило в трёх местах разъехалось бы. Здесь — только
// подпись. Незнакомый тип молча пропускаем: бэкенд может добавить бейдж
// раньше, чем выйдет веб.
const BADGES = {
  perfect_attendance: { icon: '🔥', ru: () => 'Ни одного пропуска', kk: () => 'Бірде-бір сабақ жібермеді', en: () => 'Perfect attendance' },
  homework_hero: { icon: '📚', ru: () => 'Герой домашки', kk: () => 'Үй тапсырмасының чемпионы', en: () => 'Homework hero' },
  skills_growth: { icon: '📈', withN: true, ru: (n) => `Рост в ${n} навыках`, kk: (n) => `${n} дағдыда өсті`, en: (n) => `Grew in ${n} skills` },
  goals_achieved: { icon: '🎯', withN: true, ru: (n) => `${n} цели достигнуто`, kk: (n) => `${n} мақсат орындалды`, en: (n) => `${n} goals achieved` },
  months_with_jts: { icon: '🏅', withN: true, ru: (n) => `${n} мес. с JTS`, kk: (n) => `JTS-пен ${n} ай`, en: (n) => `${n} months with JTS` },
}

export function badgeView(badge, lang) {
  const b = BADGES[badge?.type]
  if (!b) return null
  // Бейдж с числом без числа — «Рост в undefined навыках»; лучше не показать.
  if (b.withN && !(Number.isInteger(badge.n) && badge.n > 0)) return null
  return { icon: b.icon, text: b[reportLang(lang)](badge.n) }
}

// Формат занятий прототип пишет по-английски на всех языках («1 to 1»,
// «Group») — так их называют в школе.
export function formatLabel(format, groupName) {
  if (format === 'group') return groupName ? `Group · ${groupName}` : 'Group'
  return '1 to 1'
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npx vitest run src/feedback/labels.test.js`
Expected: PASS (8 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/feedback/labels.js src/feedback/labels.test.js
git commit -m "feat(feedback): подписи отчёта о прогрессе на языке отчёта (ru/kk/en)"
```

---

### Task 2: Разбор ответа API и образец отчёта

**Files:**
- Create: `src/feedback/reportShape.js`, `src/feedback/sample.js`
- Test: `src/feedback/reportShape.test.js`

**Interfaces:**
- Consumes: `reportLang` (Task 1).
- Produces: `SKILL_KEYS`, `normalizeReport(raw) → Report | null`, `normalizeReportList(raw) → ListItem[]`; `SAMPLE_TOKEN = 'sample'`, `SAMPLE_REPORT`, `SAMPLE_REPORTS: {1, 2}`, `SAMPLE_LIST`, `sampleAllowed(hostname) → boolean`, `wantsReportSample() → boolean`.
- `Report`: `{ id, periodNo, periodStart, periodEnd, lang, studentName, teacherName, level, format: 'individual'|'group', groupName, unitsText, attendance: {done, planned}|null, homeworkPct: number|null, skills: [{key, score, prev}]×6, strengths: string[], improvements: string[], motivation, badges: [{type, n}], pastGoals: [{text, result}], nextGoals: string[], plan, publishedAt, seenAt }`.
- `ListItem`: `{ id, periodNo, periodStart, periodEnd, level, teacherName, publishedAt, seenAt }`.

- [ ] **Step 1: Тест**

```js
import { describe, it, expect } from 'vitest'
import { SKILL_KEYS, normalizeReport, normalizeReportList } from './reportShape.js'
import { SAMPLE_REPORT, SAMPLE_REPORTS, SAMPLE_LIST, sampleAllowed } from './sample.js'

describe('normalizeReport', () => {
  it('образец разбирается целиком', () => {
    const r = normalizeReport(SAMPLE_REPORT)
    expect(r.lang).toBe('ru')
    expect(r.periodNo).toBe(2)
    expect(r.attendance).toEqual({ done: 8, planned: 9 })
    expect(r.homeworkPct).toBe(85)
    expect(r.skills.map((s) => s.key)).toEqual(SKILL_KEYS)
    expect(r.skills[0]).toEqual({ key: 'speaking', score: 4, prev: 3 })
    expect(r.badges).toEqual([
      { type: 'skills_growth', n: 4 },
      { type: 'goals_achieved', n: 2 },
      { type: 'months_with_jts', n: 2 },
    ])
    expect(r.pastGoals).toHaveLength(3)
    expect(r.seenAt).toBeNull()
  })

  it('навыки всегда шесть и в порядке прототипа; оценка вне 1–5 — без полосы', () => {
    const r = normalizeReport({ skills: [{ key: 'Vocabulary', score: 4 }, { key: 'speaking', score: 9, prev: 0 }] })
    expect(r.skills.map((s) => s.key)).toEqual(SKILL_KEYS)
    expect(r.skills.find((s) => s.key === 'vocabulary')).toEqual({ key: 'vocabulary', score: 4, prev: null })
    expect(r.skills.find((s) => s.key === 'speaking')).toEqual({ key: 'speaking', score: null, prev: null })
  })

  it('пустой ответ — отчёт с пустыми блоками, а не падение', () => {
    const r = normalizeReport({})
    expect(r).toMatchObject({
      lang: 'ru', studentName: '', format: 'individual', attendance: null, homeworkPct: null,
      strengths: [], improvements: [], badges: [], pastGoals: [], nextGoals: [], motivation: null, plan: null,
    })
  })

  it('null — это «нет числа», а не ноль', () => {
    const r = normalizeReport({ homeworkPct: null, attendance: { done: null, planned: 9 }, badges: [{ type: 'homework_hero' }] })
    expect(r.homeworkPct).toBeNull()
    expect(r.attendance).toBeNull()
    expect(r.badges).toEqual([{ type: 'homework_hero', n: null }])
  })

  it('цель без текста выбрасывается, незнакомый статус — без статуса', () => {
    const r = normalizeReport({ pastGoals: [{ text: '  ' }, { text: 'Пройти Unit 3', result: 'maybe' }] })
    expect(r.pastGoals).toEqual([{ text: 'Пройти Unit 3', result: null }])
  })

  it('не объект — null', () => {
    expect(normalizeReport(null)).toBeNull()
    expect(normalizeReport('x')).toBeNull()
  })
})

describe('normalizeReportList', () => {
  it('свежие сверху, записи без id отброшены', () => {
    const list = normalizeReportList([
      { id: 1, periodNo: 1, publishedAt: '2026-09-02T09:40:00+05:00' },
      { periodNo: 9 },
      { id: 2, periodNo: 2, publishedAt: '2026-10-02T10:15:00+05:00' },
    ])
    expect(list.map((x) => x.id)).toEqual([2, 1])
  })

  it('принимает и обёртку { items }', () => {
    expect(normalizeReportList({ items: [{ id: 5 }] }).map((x) => x.id)).toEqual([5])
    expect(normalizeReportList(null)).toEqual([])
  })

  it('образец списка согласован с образцами отчётов', () => {
    const list = normalizeReportList(SAMPLE_LIST)
    expect(list.map((x) => x.id)).toEqual([2, 1])
    for (const item of list) expect(SAMPLE_REPORTS[item.id].periodNo).toBe(item.periodNo)
  })
})

describe('sampleAllowed', () => {
  it('образец только на локалке и дев-стендах', () => {
    expect(sampleAllowed('localhost')).toBe(true)
    expect(sampleAllowed('127.0.0.1')).toBe(true)
    expect(sampleAllowed('dev-tutor.justtostudy.kz')).toBe(true)
    expect(sampleAllowed('ai-tutor.justtostudy.kz')).toBe(false)
    expect(sampleAllowed('')).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/feedback/reportShape.test.js`
Expected: FAIL — `Failed to resolve import "./reportShape.js"`.

- [ ] **Step 3: Реализация `src/feedback/reportShape.js`**

```js
import { reportLang } from './labels.js'

// Разбор ответа ручек отчёта (контракт — спека 2026-10-20, §3). Терпим к
// пропускам, как comicsShape.js: веб вышел раньше бэкенда, и первая версия
// ручек почти наверняка разойдётся с контрактом в мелочах — отчёт должен
// показаться с тем, что пришло, а не упасть белым листом.

export const SKILL_KEYS = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary']
const GOAL_RESULTS = ['achieved', 'partly', 'not']

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
// null и '' — «числа нет»: Number(null) дал бы 0, то есть «0% домашек».
const int = (v) => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])
const score = (v) => {
  const n = int(v)
  return n != null && n >= 1 && n <= 5 ? n : null
}

// Шесть навыков всегда и в порядке прототипа: полосы стоят друг под другом, и
// пропавший или переставленный навык читался бы как другой.
function skills(raw) {
  const byKey = new Map()
  if (Array.isArray(raw)) {
    for (const s of raw) if (s && typeof s.key === 'string') byKey.set(s.key.toLowerCase(), s)
  }
  return SKILL_KEYS.map((key) => {
    const s = byKey.get(key) || {}
    return { key, score: score(s.score), prev: score(s.prev) }
  })
}

function attendance(raw) {
  const done = int(raw?.done)
  const planned = int(raw?.planned)
  return done != null && planned != null && planned > 0 ? { done, planned } : null
}

function percent(v) {
  const n = int(v)
  return n != null && n >= 0 && n <= 100 ? n : null
}

export function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id ?? null,
    periodNo: int(raw.periodNo),
    periodStart: str(raw.periodStart),
    periodEnd: str(raw.periodEnd),
    lang: reportLang(raw.lang),
    studentName: str(raw.studentName) || '',
    teacherName: str(raw.teacherName),
    level: str(raw.level),
    format: raw.format === 'group' ? 'group' : 'individual',
    groupName: str(raw.groupName),
    unitsText: str(raw.unitsText),
    attendance: attendance(raw.attendance),
    homeworkPct: percent(raw.homeworkPct),
    skills: skills(raw.skills),
    strengths: strList(raw.strengths),
    improvements: strList(raw.improvements),
    motivation: str(raw.motivation),
    badges: Array.isArray(raw.badges)
      ? raw.badges.filter((b) => b && typeof b.type === 'string').map((b) => ({ type: b.type, n: int(b.n) }))
      : [],
    pastGoals: Array.isArray(raw.pastGoals)
      ? raw.pastGoals
        .map((g) => ({ text: str(g?.text), result: GOAL_RESULTS.includes(g?.result) ? g.result : null }))
        .filter((g) => g.text)
      : [],
    nextGoals: strList(raw.nextGoals),
    plan: str(raw.plan),
    publishedAt: str(raw.publishedAt),
    seenAt: str(raw.seenAt),
  }
}

const time = (iso) => (iso ? Date.parse(iso) || 0 : 0)

export function normalizeReportList(raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return arr
    .filter((r) => r && r.id != null)
    .map((r) => ({
      id: r.id,
      periodNo: int(r.periodNo),
      periodStart: str(r.periodStart),
      periodEnd: str(r.periodEnd),
      level: str(r.level),
      teacherName: str(r.teacherName),
      publishedAt: str(r.publishedAt),
      seenAt: str(r.seenAt),
    }))
    .sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
}
```

- [ ] **Step 4: Реализация `src/feedback/sample.js`**

```js
// Образец отчётов — данные прототипа (data/jts-progress-report.html) в форме
// ответа API (спека §3.2). Нужен, пока бэкенда нет: посмотреть вид по
// ?screen=lessons&tab=reports&reportSample=1 и /report/sample. Имена
// выдуманные: в очереди прототипа — настоящие ученики.
//
// Только на локалке и дев-стендах — тот же признак адреса, что у ?ieltsSample=1:
// на проде ученик, дописав параметр, увидел бы чужой выдуманный отчёт как свой.

export const SAMPLE_TOKEN = 'sample'

const STUDENT = 'Айша Тестова'
const TEACHER = 'Test Teacher'

const FIRST = {
  id: 1,
  periodNo: 1,
  periodStart: '2026-08-02',
  periodEnd: '2026-08-31',
  lang: 'ru',
  studentName: STUDENT,
  teacherName: TEACHER,
  level: 'A1',
  format: 'individual',
  groupName: null,
  unitsText: 'Unit 1 — Lessons 1–5',
  attendance: { done: 8, planned: 8 },
  homeworkPct: 92,
  skills: [
    { key: 'speaking', score: 3, prev: null },
    { key: 'listening', score: 3, prev: null },
    { key: 'reading', score: 3, prev: null },
    { key: 'writing', score: 2, prev: null },
    { key: 'grammar', score: 3, prev: null },
    { key: 'vocabulary', score: 3, prev: null },
  ],
  strengths: ['Не боится говорить'],
  improvements: ['Артикли'],
  motivation: 'Маленькие шаги каждый день = большой результат.',
  badges: [{ type: 'perfect_attendance' }, { type: 'homework_hero' }],
  pastGoals: [],
  nextGoals: ['Выучить числа до 100', 'Рассказать о себе 5 предложениями', 'Домашка каждый урок'],
  plan: 'Unit 2: Present Simple, лексика «Family».',
  publishedAt: '2026-09-02T09:40:00+05:00',
  seenAt: '2026-09-02T19:05:00+05:00',
}

export const SAMPLE_REPORT = {
  id: 2,
  periodNo: 2,
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  lang: 'ru',
  studentName: STUDENT,
  teacherName: TEACHER,
  level: 'A1',
  format: 'individual',
  groupName: null,
  unitsText: 'Unit 2 — Lessons 1–6',
  attendance: { done: 8, planned: 9 },
  homeworkPct: 85,
  skills: [
    { key: 'speaking', score: 4, prev: 3 },
    { key: 'listening', score: 3, prev: 3 },
    { key: 'reading', score: 4, prev: 3 },
    { key: 'writing', score: 3, prev: 2 },
    { key: 'grammar', score: 3, prev: 3 },
    { key: 'vocabulary', score: 4, prev: 3 },
  ],
  strengths: ['Активен на уроке', 'Быстро учит слова', 'Хорошо запоминает новые слова и уверенно использует их в диалогах.'],
  improvements: ['Времена глаголов', 'Окончание -s в Present Simple (he works, she likes).'],
  motivation: 'Ты делаешь огромные шаги — так держать!',
  // Посчитано правилами спеки §3.4: выросли 4 навыка, 2 цели достигнуты,
  // 2-й месяц; посещаемость 8/9 и домашки 85% бейджей не дают.
  badges: [{ type: 'skills_growth', n: 4 }, { type: 'goals_achieved', n: 2 }, { type: 'months_with_jts', n: 2 }],
  pastGoals: [
    { text: 'Выучить числа до 100', result: 'achieved' },
    { text: 'Рассказать о себе 5 предложениями', result: 'achieved' },
    { text: 'Домашка каждый урок', result: 'partly' },
  ],
  nextGoals: ['Без ошибок в -s (he works)', 'Выучить 30 новых слов'],
  plan: 'Unit 3: Present Simple — вопросы и отрицания, лексика «Daily routine». 10 минут в день на приложение Vocabulary.',
  publishedAt: '2026-10-02T10:15:00+05:00',
  seenAt: null,
}

export const SAMPLE_REPORTS = { 1: FIRST, 2: SAMPLE_REPORT }

export const SAMPLE_LIST = [SAMPLE_REPORT, FIRST].map((r) => ({
  id: r.id,
  periodNo: r.periodNo,
  periodStart: r.periodStart,
  periodEnd: r.periodEnd,
  level: r.level,
  teacherName: r.teacherName,
  publishedAt: r.publishedAt,
  seenAt: r.seenAt,
}))

export function sampleAllowed(hostname) {
  return /^(localhost|127\.0\.0\.1|dev-)/.test(hostname || '')
}

// Читать в эффекте или обработчике, а не при рендере: на сервере window нет,
// и SSR разошёлся бы с клиентом.
export function wantsReportSample() {
  try {
    if (!sampleAllowed(window.location.hostname)) return false
    return new URLSearchParams(window.location.search).get('reportSample') === '1'
  } catch {
    return false
  }
}
```

- [ ] **Step 5: Запустить — проходит**

Run: `npx vitest run src/feedback/reportShape.test.js`
Expected: PASS (10 тестов).

- [ ] **Step 6: Коммит**

```bash
git add src/feedback/reportShape.js src/feedback/sample.js src/feedback/reportShape.test.js
git commit -m "feat(feedback): разбор ответа API отчёта и образец из прототипа"
```

---

### Task 3: Ручки отчётов в `api.js`

**Files:**
- Modify: `src/api.js` (новый блок в конце файла)
- Test: `src/api.feedback.test.js`

**Interfaces:**
- Produces: `getFeedbackReports(token) → Promise<raw[]>` (404 помнится 10 минут на токен), `getFeedbackReport(token, id) → Promise<raw>`, `markFeedbackReportSeen(token, id) → Promise`, `getFeedbackReportByToken(linkToken) → Promise<raw>` (ошибка несёт `status`; сеть — `status: 0`), `markFeedbackReportOpened(linkToken) → Promise`.

- [ ] **Step 1: Тест**

```js
// @vitest-environment jsdom
// Ручки отчётов о прогрессе. Веб выходит раньше бэкенда: пока ручки нет,
// карточка «Главной» спрашивала бы её на каждом заходе — 404 поэтому помнится.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import {
  getFeedbackReports, getFeedbackReport, markFeedbackReportSeen,
  getFeedbackReportByToken, markFeedbackReportOpened,
} from './api.js'

function answerWith(status, body = {}) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => '',
  }))
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('кабинет ученика', () => {
  it('список — Bearer в /mobile/feedback-reports', async () => {
    answerWith(200, [{ id: 1 }])
    await expect(getFeedbackReports('t-ok')).resolves.toEqual([{ id: 1 }])
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/mobile\/feedback-reports$/)
    expect(opts.headers.Authorization).toBe('Bearer t-ok')
  })

  it('404 помнится 10 минут — «Главная» не дёргает бэкенд на каждом заходе', async () => {
    answerWith(404)
    await expect(getFeedbackReports('t-404')).rejects.toMatchObject({ status: 404 })
    await expect(getFeedbackReports('t-404')).rejects.toMatchObject({ status: 404 })
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1)
    answerWith(200, [])
    await expect(getFeedbackReports('t-404')).resolves.toEqual([])
  })

  it('5xx не запоминается: следующий заход спросит снова', async () => {
    answerWith(500)
    await expect(getFeedbackReports('t-500')).rejects.toMatchObject({ status: 500 })
    answerWith(200, [{ id: 3 }])
    await expect(getFeedbackReports('t-500')).resolves.toEqual([{ id: 3 }])
  })

  it('отчёт и отметка «просмотрен»', async () => {
    answerWith(200, { id: 7 })
    await getFeedbackReport('t', 7)
    expect(fetch.mock.calls[0][0]).toMatch(/\/mobile\/feedback-reports\/7$/)
    answerWith(204)
    await markFeedbackReportSeen('t', 7)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/mobile\/feedback-reports\/7\/seen$/)
    expect(opts.method).toBe('POST')
  })
})

describe('ссылка из мессенджера', () => {
  it('GET без авторизации, токен в пути экранирован', async () => {
    answerWith(200, { id: 1 })
    await getFeedbackReportByToken('a/b')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/feedback-reports\/link\/a%2Fb$/)
    expect(opts?.headers?.Authorization).toBeUndefined()
  })

  it('404 — ошибка со статусом, сеть — status 0', async () => {
    answerWith(404)
    await expect(getFeedbackReportByToken('x')).rejects.toMatchObject({ status: 404 })
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await expect(getFeedbackReportByToken('x')).rejects.toMatchObject({ status: 0 })
  })

  it('«открыт» — отдельный POST', async () => {
    answerWith(204)
    await markFeedbackReportOpened('tok')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/feedback-reports\/link\/tok\/opened$/)
    expect(opts.method).toBe('POST')
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/api.feedback.test.js`
Expected: FAIL — `getFeedbackReports is not a function` (или аналогичная ошибка импорта).

- [ ] **Step 3: Реализация — дописать в конец `src/api.js`**

```js
// ── Отчёты о прогрессе (Feedback) ───────────────────────────────────────────
// Контракт: docs/superpowers/specs/2026-10-20-feedback-reports-student-design.md, §3.
// Кабинет ученика — Bearer; ссылка из мессенджера — без входа: секрет ссылки и
// есть доступ, как у пробного урока (/trial/link/{token}).

// Веб вышел раньше бэкенда, а список спрашивает карточка «Главной» на каждом
// заходе: 404 (ручки ещё нет на этом стенде) помним на токен, как у
// getIeltsMe, иначе каждый заход ученика стоил бы бэкенду ошибки со стеком в
// логе. Остальные ошибки не помним — следующий заход спросит снова.
const _feedbackMissing = new Map()
const FEEDBACK_MISSING_RETRY_MS = 10 * 60 * 1000

export async function getFeedbackReports(token) {
  const until = _feedbackMissing.get(token)
  if (until && Date.now() < until) {
    const err = new Error('Ошибка сервера (404)')
    err.status = 404
    throw err
  }
  try {
    return await authGet('/mobile/feedback-reports', token)
  } catch (e) {
    if (e?.status === 404) _feedbackMissing.set(token, Date.now() + FEEDBACK_MISSING_RETRY_MS)
    throw e
  }
}

export function getFeedbackReport(token, id) {
  return authGet(`/mobile/feedback-reports/${encodeURIComponent(id)}`, token)
}

/** Ученик открыл отчёт в кабинете — снимает метку «Новый». */
export function markFeedbackReportSeen(token, id) {
  return authPost(`/mobile/feedback-reports/${encodeURIComponent(id)}/seen`, token, {})
}

/** Отчёт по ссылке из мессенджера. Ошибка несёт status: 404 — ссылки нет
 *  (или отчёт отозван), 0 — нет связи; экран различает «недействительна» и
 *  «попробуйте ещё раз» именно по нему. */
export async function getFeedbackReportByToken(linkToken) {
  let res
  try {
    res = await fetch(`${BASE}/feedback-reports/link/${encodeURIComponent(linkToken)}`, { cache: 'no-store' })
  } catch {
    const err = new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
    err.status = 0
    throw err
  }
  if (!res.ok) {
    const err = new Error(`Ошибка сервера (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

/** «Отчёт открыт» — отдельным POST после показа, а не побочным эффектом GET:
 *  мессенджеры сами ходят по ссылкам (предпросмотр), и GET ставил бы «открыт»
 *  без родителя. */
export async function markFeedbackReportOpened(linkToken) {
  const res = await fetch(`${BASE}/feedback-reports/link/${encodeURIComponent(linkToken)}/opened`, { method: 'POST' })
  if (!res.ok) {
    const err = new Error(`Ошибка сервера (${res.status})`)
    err.status = res.status
    throw err
  }
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npx vitest run src/api.feedback.test.js`
Expected: PASS (7 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/api.js src/api.feedback.test.js
git commit -m "feat(feedback): ручки отчётов в api.js — кабинет и ссылка без входа"
```

---

### Task 4: Вид отчёта `ReportView` и стили раздела

**Files:**
- Create: `src/feedback/ReportView.jsx`, `src/feedback.css`
- Modify: `src/app/layout.jsx` (импорт `../feedback.css` после `../trial.css`), `src/theme-dark.generated.css` (перегенерация)
- Test: `src/feedback/ReportView.test.jsx`

**Interfaces:**
- Consumes: `reportLabels`, `skillName`, `goalResultLabel`, `periodLabel`, `badgeView`, `formatLabel` (Task 1); `Report` (Task 2).
- Produces: `<ReportView report={Report} />` (default export); CSS-классы `.fbr*` (вид), `.fbl*` (вкладка), `.fbp*` (публичная страница), `.hm-report*` (карточка «Главной»).

- [ ] **Step 1: Тест**

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReportView from './ReportView.jsx'
import { normalizeReport } from './reportShape.js'
import { SAMPLE_REPORT, SAMPLE_REPORTS } from './sample.js'

const view = (raw) => render(<ReportView report={normalizeReport(raw)} />)

describe('ReportView', () => {
  it('шапка, цифры, бейджи и подпись — как в превью прототипа', () => {
    view(SAMPLE_REPORT)
    expect(screen.getByText('Отчёт о прогрессе · 2-й месяц (дни 31–60)')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Айша Тестова' })).toBeTruthy()
    expect(screen.getByText('1 to 1 · Пройдено: Unit 2 — Lessons 1–6')).toBeTruthy()
    expect(screen.getByText('8/9')).toBeTruthy()
    expect(screen.getByText('Посещаемость · 89%')).toBeTruthy()
    expect(screen.getByText('85%')).toBeTruthy()
    expect(screen.getByText('Рост в 4 навыках')).toBeTruthy()
    expect(screen.getByText('2 мес. с JTS')).toBeTruthy()
    expect(screen.getByText('Преподаватель: Test Teacher')).toBeTruthy()
  })

  it('динамика навыков — стрелкой к прошлому отчёту', () => {
    view(SAMPLE_REPORT)
    expect(screen.getAllByText('↑1')).toHaveLength(4)
    expect(screen.queryByText(/↓/)).toBeNull()
  })

  it('первый отчёт — без прошлых целей и без стрелок', () => {
    view(SAMPLE_REPORTS[1])
    expect(screen.queryByText('Цели прошлого отчёта')).toBeNull()
    expect(screen.queryByText(/↑|↓/)).toBeNull()
    expect(screen.getByText('🎯 Цели на следующие 30 дней')).toBeTruthy()
  })

  it('подписи — на языке отчёта, а не интерфейса', () => {
    view({ ...SAMPLE_REPORT, lang: 'kk' })
    expect(screen.getByText('Прогресс есебі · 2-ай (31–60 күн)')).toBeTruthy()
    expect(screen.getByText('Сөйлеу')).toBeTruthy()
    expect(screen.getByText('JTS-пен 2 ай')).toBeTruthy()
  })

  it('без фразы и без бейджей плашки мотивации нет', () => {
    const { container } = view({ ...SAMPLE_REPORT, motivation: null, badges: [{ type: 'mystery' }] })
    expect(container.querySelector('.fbr__mot')).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/feedback/ReportView.test.jsx`
Expected: FAIL — `Failed to resolve import "./ReportView.jsx"`.

- [ ] **Step 3: Реализация `src/feedback/ReportView.jsx`**

```jsx
import { reportLabels, skillName, goalResultLabel, periodLabel, badgeView, formatLabel } from './labels.js'

// Вид отчёта о прогрессе — правая колонка прототипа («живое превью»,
// data/jts-progress-report.html, render()). Один на ссылку из мессенджера и
// на кабинет: родитель и ученик видят ровно то, что преподаватель видел в
// превью перед отправкой. Подписи — на языке ОТЧЁТА (см. labels.js).
export default function ReportView({ report }) {
  const L = report.lang
  const t = reportLabels(L)
  const period = periodLabel(report.periodNo, L)
  const badges = report.badges.map((b) => badgeView(b, L)).filter(Boolean)
  const att = report.attendance
  const attPct = att ? Math.round((att.done / att.planned) * 100) : null

  return (
    <article className="fbr" lang={L}>
      <header className="fbr__head">
        <div className="fbr__who">
          <div className="fbr__kicker">{t.title}{period && ` · ${period}`}</div>
          <h2 className="fbr__name">{report.studentName}</h2>
          <div className="fbr__meta">
            {formatLabel(report.format, report.groupName)}
            {report.unitsText && ` · ${t.covered}: ${report.unitsText}`}
          </div>
        </div>
        {report.level && <span className="fbr__level">{report.level}</span>}
      </header>

      {(report.motivation || badges.length > 0) && (
        <section className="fbr__mot">
          {report.motivation && <p className="fbr__mot-text">{report.motivation}</p>}
          {badges.length > 0 && (
            <ul className="fbr__badges">
              {badges.map((b) => (
                <li key={b.text}><span aria-hidden="true">{b.icon}</span>{b.text}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(att || report.homeworkPct != null) && (
        <div className="fbr__stats">
          {att && (
            <div className="fbr__stat">
              <strong>{att.done}/{att.planned}</strong>
              <small>{t.attendance} · {attPct}%</small>
            </div>
          )}
          {report.homeworkPct != null && (
            <div className="fbr__stat">
              <strong>{report.homeworkPct}%</strong>
              <small>{t.homework}</small>
            </div>
          )}
        </div>
      )}

      <section className="fbr__blk">
        <h3>{t.skills}</h3>
        <ul className="fbr__bars">
          {report.skills.map((s) => (
            <li key={s.key} className="fbr__bar">
              <span>{skillName(s.key, L)}</span>
              <span className="fbr__track" aria-hidden="true">
                <span style={{ width: `${(s.score ?? 0) * 20}%` }} />
              </span>
              <b>{s.score != null ? `${s.score}/5` : '—'}<Delta score={s.score} prev={s.prev} /></b>
            </li>
          ))}
        </ul>
      </section>

      <List title={t.strengths} items={report.strengths} />
      <List title={t.improvements} items={report.improvements} />

      {report.pastGoals.length > 0 && (
        <section className="fbr__blk">
          <h3>{t.pastGoals}</h3>
          <ul className="fbr__goals">
            {report.pastGoals.map((g) => (
              <li key={g.text}>
                <span className={`fbr__dot fbr__dot--${g.result || 'none'}`} aria-hidden="true" />
                {g.text}
                {g.result && <em>{goalResultLabel(g.result, L)}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <List title={`🎯 ${t.nextGoals}`} items={report.nextGoals} />

      {report.plan && (
        <section className="fbr__blk">
          <h3>{t.plan}</h3>
          <p>{report.plan}</p>
        </section>
      )}

      {report.teacherName && <footer className="fbr__sign">{t.teacher}: {report.teacherName}</footer>}
    </article>
  )
}

function List({ title, items }) {
  if (!items.length) return null
  return (
    <section className="fbr__blk">
      <h3>{title}</h3>
      <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  )
}

// Стрелка — только когда есть с чем сравнить и есть разница: в первом отчёте
// прошлых оценок нет, и «↑0» читалось бы как замечание.
function Delta({ score, prev }) {
  if (score == null || prev == null || score === prev) return null
  const up = score > prev
  return <i className={`fbr__delta fbr__delta--${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'}{Math.abs(score - prev)}</i>
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npx vitest run src/feedback/ReportView.test.jsx`
Expected: PASS (5 тестов).

- [ ] **Step 5: Стили `src/feedback.css`**

```css
/* Отчёт о прогрессе (раздел Feedback): вид отчёта, вкладка «Отчёты» в «Уроках»,
   страница по ссылке /report/<token>, карточка на «Главной».
   Цвета и раскладка вида — из прототипа data/jts-progress-report.html
   (правая колонка, «живое превью»). Шрифт не задаём: наследуется от приложения
   (Manrope на десктопе, PT Root UI в мобильном слое). Мобильные правила — здесь
   же: своего кадра в Figma «Web Адаптивка» у раздела нет. */

/* ── Вид отчёта ── */
.fbr {
  background: #fff;
  color: #17161f;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.fbr__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.fbr__who { min-width: 0; }
.fbr__kicker { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #8b8a99; }
.fbr__name { margin: 4px 0 0; font-size: 20px; font-weight: 800; overflow-wrap: anywhere; }
.fbr__meta { margin-top: 3px; font-size: 12.5px; color: #8b8a99; }
.fbr__level {
  flex: none;
  background: #f2ecff;
  color: #9047ff;
  border-radius: 999px;
  padding: 4px 12px;
  font-weight: 800;
  font-size: 13px;
  white-space: nowrap;
}
.fbr__mot {
  background: linear-gradient(135deg, #9047ff, #b07bff);
  color: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fbr__mot-text { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.4; }
.fbr__badges { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.fbr__badges li {
  background: rgba(255, 255, 255, .2);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  gap: 5px;
}
.fbr__stats { display: flex; gap: 10px; }
.fbr__stat { flex: 1; background: #f6f6fa; border-radius: 14px; padding: 12px; }
.fbr__stat strong { display: block; font-size: 22px; font-variant-numeric: tabular-nums; }
.fbr__stat small { color: #8b8a99; font-size: 12px; }
.fbr__blk h3 { margin: 0 0 6px; font-size: 13px; color: #8b8a99; text-transform: uppercase; letter-spacing: .05em; }
.fbr__blk p, .fbr__blk ul { margin: 0; font-size: 14px; line-height: 1.55; }
.fbr__blk p { white-space: pre-line; overflow-wrap: anywhere; }
.fbr__blk ul { padding-left: 18px; }
.fbr__bars { list-style: none; padding: 0 !important; display: flex; flex-direction: column; gap: 10px; }
.fbr__bar { display: grid; grid-template-columns: 96px 1fr 58px; gap: 10px; align-items: center; font-size: 13px; }
.fbr__track { height: 8px; border-radius: 999px; background: #f2ecff; overflow: hidden; }
.fbr__track span { display: block; height: 100%; background: #9047ff; border-radius: inherit; }
.fbr__bar b { text-align: right; font-variant-numeric: tabular-nums; }
.fbr__delta { font-style: normal; font-size: 11px; margin-left: 4px; }
.fbr__delta--up { color: #1a9e6a; }
.fbr__delta--down { color: #c92a2d; }
.fbr__goals { list-style: none; padding: 0 !important; }
.fbr__goals li { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.fbr__goals em { font-style: normal; font-size: 12px; color: #8b8a99; }
.fbr__dot { width: 9px; height: 9px; border-radius: 50%; flex: none; transform: translateY(-1px); background: #ecebf2; }
.fbr__dot--achieved { background: #1a9e6a; }
.fbr__dot--partly { background: #ff7300; }
.fbr__dot--not { background: #c92a2d; }
.fbr__sign { font-size: 12.5px; color: #8b8a99; }

/* ── Вкладка «Отчёты» в «Уроках»: список → отчёт на месте списка ── */
.fbl { max-width: 640px; display: flex; flex-direction: column; gap: 12px; }
.fbl__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.fbl__item {
  width: 100%;
  text-align: left;
  font: inherit;
  border: 1px solid #ecebf2;
  background: #fff;
  color: #17161f;
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}
.fbl__item:hover { border-color: #9047ff; }
.fbl__item--new { border-color: #9047ff; background: #f2ecff; }
.fbl__title { font-weight: 800; font-size: 15px; display: flex; gap: 8px; align-items: center; }
.fbl__new { font-size: 10px; font-weight: 800; background: #9047ff; color: #fff; border-radius: 999px; padding: 2px 7px; }
.fbl__meta { font-size: 12.5px; color: #8b8a99; }
.fbl__empty { background: #fff; border-radius: 20px; padding: 24px; color: #8b8a99; font-size: 14px; line-height: 1.5; }
.fbl__empty b { display: block; color: #17161f; font-size: 16px; margin-bottom: 6px; }
.fbl__empty p { margin: 0 0 12px; }
.fbl__loading { color: #8b8a99; font-size: 14px; padding: 12px 0; }
.fbl__back {
  align-self: flex-start;
  border: 0;
  background: #f2ecff;
  color: #9047ff;
  border-radius: 12px;
  padding: 9px 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.fbl__retry, .fbp__btn {
  border: 0;
  border-radius: 12px;
  padding: 11px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  background: #9047ff;
  color: #fff;
}

/* ── Страница по ссылке /report/<token> ── */
.fbp { min-height: 100vh; background: #f6f6fa; padding: 24px 16px 40px; box-sizing: border-box; }
.fbp__inner { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.fbp__brand { color: #9047ff; font-weight: 800; font-size: 20px; }
.fbp__msg { background: #fff; border-radius: 20px; padding: 24px; text-align: center; color: #17161f; }
.fbp__msg p { margin: 0 0 12px; }
.fbp__msg p:last-child { margin-bottom: 0; }
.fbp__foot { margin: 0; font-size: 12px; color: #8b8a99; text-align: center; }

/* ── Карточка «Новый отчёт» на «Главной» ── */
.hm-report {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  font: inherit;
  border: 0;
  cursor: pointer;
  background: linear-gradient(135deg, #9047ff, #b07bff);
  color: #fff;
  border-radius: 24px;
  padding: 16px 20px;
}
.hm-report__icon { font-size: 28px; flex: none; }
.hm-report__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.hm-report__text b { font-size: 16px; }
.hm-report__text span { font-size: 13px; opacity: .9; }
.hm-report__go { font-weight: 800; white-space: nowrap; }

@media (max-width: 560px) {
  .fbr { padding: 18px; border-radius: 16px; }
  .fbr__bar { grid-template-columns: 88px 1fr 52px; }
  .fbr__stat strong { font-size: 20px; }
  .fbp { padding: 16px 12px 32px; }
  .hm-report { border-radius: 20px; padding: 14px 16px; }
}
```

- [ ] **Step 6: Подключить стили и перегенерировать тёмную тему**

В `src/app/layout.jsx` после строки `import '../trial.css'` добавить:

```js
import '../feedback.css'
```

Run: `node scripts/gen-dark-theme.js`
Expected: файл `src/theme-dark.generated.css` перезаписан; `git diff --stat src/theme-dark.generated.css` показывает добавленный блок `/*  feedback.css  */` (проверить `grep -n "feedback.css" src/theme-dark.generated.css`).

- [ ] **Step 7: Коммит**

```bash
git add src/feedback/ReportView.jsx src/feedback/ReportView.test.jsx src/feedback.css src/app/layout.jsx src/theme-dark.generated.css
git commit -m "feat(feedback): вид отчёта о прогрессе по превью прототипа"
```

---

### Task 5: Страница по ссылке `/report/<token>`

**Files:**
- Create: `src/app/report/[token]/page.jsx`, `src/app/report/[token]/ReportLinkClient.jsx`
- Modify: `src/i18n.jsx` (ключи `reports.*` в ru/en/kk — общие с Task 6, добавить все сразу)

**Interfaces:**
- Consumes: `getFeedbackReportByToken`, `markFeedbackReportOpened` (Task 3); `normalizeReport` (Task 2); `SAMPLE_TOKEN`, `SAMPLE_REPORT`, `sampleAllowed` (Task 2); `ReportView` (Task 4); `reportLabels(lang).footer` (Task 1).
- Produces: маршрут `/report/<token>`; ключи i18n `reports.title`, `reports.loading`, `reports.emptyTitle`, `reports.emptyText`, `reports.loadError`, `reports.retry`, `reports.new`, `reports.month`, `reports.back`, `reports.reportError`, `reports.linkInvalid`, `reports.linkError`, `lessons.tabReports`, `home.report.title`, `home.report.text`, `home.report.open`.

- [ ] **Step 1: Ключи словаря.** В `src/i18n.jsx` рядом с `'lessons.tabSelf'` каждого языка добавить:

ru (после `'lessons.tabSelf': 'Самостоятельно',`):
```js
    'lessons.tabReports': 'Отчёты',
    'reports.title': 'Отчёт о прогрессе',
    'reports.loading': 'Загружаем…',
    'reports.emptyTitle': 'Отчётов пока нет',
    'reports.emptyText': 'Преподаватель присылает отчёт о прогрессе раз в месяц — он появится здесь.',
    'reports.loadError': 'Не удалось загрузить отчёты',
    'reports.retry': 'Повторить',
    'reports.new': 'Новый',
    'reports.month': '{n}-й месяц',
    'reports.back': '← Все отчёты',
    'reports.reportError': 'Не удалось открыть отчёт',
    'reports.linkInvalid': 'Ссылка недействительна. Попросите школу прислать отчёт ещё раз.',
    'reports.linkError': 'Не удалось загрузить отчёт. Проверьте интернет и попробуйте ещё раз.',
    'home.report.title': 'Новый отчёт о прогрессе',
    'home.report.text': 'Отчёт за {n}-й месяц занятий',
    'home.report.open': 'Открыть',
```

en (после `'lessons.tabSelf': 'Self-study',`):
```js
    'lessons.tabReports': 'Reports',
    'reports.title': 'Progress report',
    'reports.loading': 'Loading…',
    'reports.emptyTitle': 'No reports yet',
    'reports.emptyText': 'Your teacher sends a progress report once a month — it will appear here.',
    'reports.loadError': 'Could not load reports',
    'reports.retry': 'Try again',
    'reports.new': 'New',
    'reports.month': 'Month {n}',
    'reports.back': '← All reports',
    'reports.reportError': 'Could not open the report',
    'reports.linkInvalid': 'This link is not valid. Ask the school to send the report again.',
    'reports.linkError': 'Could not load the report. Check your connection and try again.',
    'home.report.title': 'New progress report',
    'home.report.text': 'Report for month {n} of lessons',
    'home.report.open': 'Open',
```

kk (после `'lessons.tabSelf': 'Өз бетімше',`):
```js
    'lessons.tabReports': 'Есептер',
    'reports.title': 'Прогресс есебі',
    'reports.loading': 'Жүктелуде…',
    'reports.emptyTitle': 'Әзірге есеп жоқ',
    'reports.emptyText': 'Мұғалім прогресс есебін айына бір рет жібереді — ол осында пайда болады.',
    'reports.loadError': 'Есептерді жүктеу мүмкін болмады',
    'reports.retry': 'Қайталау',
    'reports.new': 'Жаңа',
    'reports.month': '{n}-ай',
    'reports.back': '← Барлық есептер',
    'reports.reportError': 'Есепті ашу мүмкін болмады',
    'reports.linkInvalid': 'Сілтеме жарамсыз. Мектептен есепті қайта жіберуді сұраңыз.',
    'reports.linkError': 'Есепті жүктеу мүмкін болмады. Интернетті тексеріп, қайталап көріңіз.',
    'home.report.title': 'Жаңа прогресс есебі',
    'home.report.text': 'Сабақтың {n}-айы бойынша есеп',
    'home.report.open': 'Ашу',
```

- [ ] **Step 2: Маршрут `src/app/report/[token]/page.jsx`**

```jsx
import ReportLinkClient from './ReportLinkClient.jsx'

// Отчёт о прогрессе по ссылке из WhatsApp/Telegram — отдельным маршрутом, а не
// экраном SPA: открывает родитель без аккаунта, и ему нужен один отчёт без
// сайдбара, входа и остального приложения (как /trial/<token>).
// noindex и no-referrer: в адресе секрет, и он не должен попасть ни в
// поисковик, ни в заголовок Referer чужого сайта.
export const metadata = {
  title: 'Just to Study — отчёт о прогрессе',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function ReportLinkRoute({ params }) {
  const { token } = await params
  return <ReportLinkClient token={token} />
}
```

- [ ] **Step 3: Клиент `src/app/report/[token]/ReportLinkClient.jsx`**

```jsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { getFeedbackReportByToken, markFeedbackReportOpened } from '../../../api.js'
import { normalizeReport } from '../../../feedback/reportShape.js'
import { SAMPLE_TOKEN, SAMPLE_REPORT, sampleAllowed } from '../../../feedback/sample.js'
import { reportLabels } from '../../../feedback/labels.js'
import ReportView from '../../../feedback/ReportView.jsx'

// Ошибки ссылки — на языке интерфейса (у родителя без аккаунта это ru по
// умолчанию): язык отчёта до загрузки отчёта неизвестен.
export default function ReportLinkClient({ token }) {
  const { t } = useI18n()
  const [state, setState] = useState({ status: 'loading', report: null, sample: false })
  const [attempt, setAttempt] = useState(0)
  const openedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', report: null, sample: false })
    ;(async () => {
      try {
        const sample = token === SAMPLE_TOKEN && sampleAllowed(window.location.hostname)
        const report = normalizeReport(sample ? SAMPLE_REPORT : await getFeedbackReportByToken(token))
        if (cancelled) return
        setState(report ? { status: 'ok', report, sample } : { status: 'invalid', report: null, sample: false })
      } catch (e) {
        if (cancelled) return
        // 404/403/410 — ссылки нет, отозвана или протухла: одним сообщением,
        // чтобы подбор токенов не отличался по ответу от опечатки.
        const invalid = e?.status === 404 || e?.status === 403 || e?.status === 410
        setState({ status: invalid ? 'invalid' : 'error', report: null, sample: false })
      }
    })()
    return () => { cancelled = true }
  }, [token, attempt])

  // «Открыт» — после того как отчёт на экране, и один раз за визит: отметку
  // видит координатор как «родитель прочитал». Ошибку не показываем.
  useEffect(() => {
    if (state.status !== 'ok' || state.sample || openedRef.current) return
    openedRef.current = true
    markFeedbackReportOpened(token).catch(() => {})
  }, [state, token])

  return (
    <main className="fbp">
      <div className="fbp__inner">
        <div className="fbp__brand">Just to Study</div>
        {state.status === 'loading' && (
          <div className="fbp__msg" aria-busy="true"><p>{t('reports.loading')}</p></div>
        )}
        {state.status === 'invalid' && (
          <div className="fbp__msg"><p>{t('reports.linkInvalid')}</p></div>
        )}
        {state.status === 'error' && (
          <div className="fbp__msg">
            <p>{t('reports.linkError')}</p>
            <button type="button" className="fbp__btn" onClick={() => setAttempt((n) => n + 1)}>{t('reports.retry')}</button>
          </div>
        )}
        {state.status === 'ok' && (
          <>
            <ReportView report={state.report} />
            <p className="fbp__foot">{reportLabels(state.report.lang).footer}</p>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Проверка вручную** (e2e — в Task 9)

Run: dev-сервер (`preview_start` из `.claude/launch.json` или `npx next dev -p <порт>`), открыть `/report/sample`.
Expected: отчёт «Айша Тестова», шапка «Отчёт о прогрессе · 2-й месяц (дни 31–60)», внизу «Отчёт подготовлен в школе Just to Study». `/report/nope` → «Ссылка недействительна…» (бэкенд dev ответит 404).

- [ ] **Step 5: Коммит**

```bash
git add "src/app/report/[token]/page.jsx" "src/app/report/[token]/ReportLinkClient.jsx" src/i18n.jsx
git commit -m "feat(feedback): страница отчёта по ссылке из мессенджера без входа"
```

---

### Task 6: Вкладка «Отчёты» в «Уроках»

**Files:**
- Create: `src/feedback/ReportsTab.jsx`
- Modify: `src/screens/LessonsPage.jsx`, `src/screens/LessonsPage.test.jsx`

**Interfaces:**
- Consumes: `getFeedbackReports`, `getFeedbackReport`, `markFeedbackReportSeen` (Task 3); `normalizeReport`, `normalizeReportList` (Task 2); `wantsReportSample`, `SAMPLE_LIST`, `SAMPLE_REPORTS` (Task 2); `ReportView` (Task 4); ключи i18n (Task 5).
- Produces: `<ReportsTab token initialReportId />`; проп `LessonsPage({ …, initialReportId })`; вкладка `reports` только у ученика.

- [ ] **Step 1: Тест — дописать в `src/screens/LessonsPage.test.jsx`**

В фабрику `vi.mock('../api.js', …)` добавить:
```js
  // Вкладка «Отчёты» (отчёты о прогрессе от преподавателя).
  getFeedbackReports: vi.fn(async () => []),
  getFeedbackReport: vi.fn(async () => ({})),
  markFeedbackReportSeen: vi.fn(async () => null),
```
После `import LessonsPage from './LessonsPage.jsx'` добавить:
```js
import { getFeedbackReports, getFeedbackReport, markFeedbackReportSeen } from '../api.js'
import { SAMPLE_LIST, SAMPLE_REPORT } from '../feedback/sample.js'
```
В конец файла:
```js
describe('вкладка «Отчёты»', () => {
  const tabTexts = (container) => [...container.querySelectorAll('.ls-tab')].map((b) => b.textContent)

  it('ученик открывает отчёт из списка, и он отмечается просмотренным', async () => {
    getFeedbackReports.mockResolvedValueOnce(SAMPLE_LIST)
    getFeedbackReport.mockResolvedValueOnce(SAMPLE_REPORT)
    renderPage(tokenWithRole('STUDENT'), { initialTab: 'reports' })

    fireEvent.click(await screen.findByText('2-й месяц'))
    expect(await screen.findByText('Отчёт о прогрессе · 2-й месяц (дни 31–60)')).toBeTruthy()
    await waitFor(() => expect(markFeedbackReportSeen).toHaveBeenCalledWith(expect.any(String), 2))

    fireEvent.click(screen.getByText('← Все отчёты'))
    expect(await screen.findByText('1-й месяц')).toBeTruthy()
  })

  it('из уведомления отчёт открывается сразу', async () => {
    getFeedbackReport.mockResolvedValueOnce(SAMPLE_REPORT)
    renderPage(tokenWithRole('STUDENT'), { initialTab: 'reports', initialReportId: '2' })
    expect(await screen.findByText('Отчёт о прогрессе · 2-й месяц (дни 31–60)')).toBeTruthy()
    expect(getFeedbackReport).toHaveBeenLastCalledWith(expect.any(String), '2')
  })

  it('ручки ещё нет (404) — «Отчётов пока нет», а не ошибка', async () => {
    getFeedbackReports.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 404 }))
    renderPage(tokenWithRole('STUDENT'), { initialTab: 'reports' })
    expect(await screen.findByText('Отчётов пока нет')).toBeTruthy()
  })

  it('сбой сервера — с кнопкой «Повторить»', async () => {
    getFeedbackReports.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 500 }))
    renderPage(tokenWithRole('STUDENT'), { initialTab: 'reports' })
    fireEvent.click(await screen.findByText('Повторить'))
    expect(await screen.findByText('Отчётов пока нет')).toBeTruthy()
  })

  it('у ученика вкладка есть, у преподавателя — нет', async () => {
    const student = renderPage(tokenWithRole('STUDENT'))
    await waitFor(() => expect(tabTexts(student.container)).toContain('Отчёты'))
    student.unmount()
    const teacher = renderPage(tokenWithRole('TEACHER'))
    await waitFor(() => expect(tabTexts(teacher.container)).not.toContain('Отчёты'))
  })
})
```
(Роль преподавателя — та же строка, что в уже существующих тестах файла; если там другая, взять её.)

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/screens/LessonsPage.test.jsx`
Expected: FAIL — новых тестов: вкладки «Отчёты» нет (`Unable to find an element with the text: 2-й месяц`).

- [ ] **Step 3: Реализация `src/feedback/ReportsTab.jsx`**

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getFeedbackReports, getFeedbackReport, markFeedbackReportSeen } from '../api.js'
import { normalizeReport, normalizeReportList } from './reportShape.js'
import { wantsReportSample, SAMPLE_LIST, SAMPLE_REPORTS } from './sample.js'
import ReportView from './ReportView.jsx'

// Вкладка «Отчёты» в «Уроках»: отчёты о прогрессе, которые преподаватель
// пишет раз в 30 дней, а координатор одобряет. Отчёт — про живые уроки с
// преподавателем, поэтому он рядом с расписанием, а не отдельным пунктом
// меню (решение 20.10.2026). Раскладка одна на все ширины: список, по клику —
// отчёт на его месте с кнопкой «Все отчёты».
const LOCALES = { ru: 'ru-RU', en: 'en-GB', kk: 'kk-KZ' }

function formatDay(iso, lang) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(LOCALES[lang] || 'ru-RU', { day: 'numeric', month: 'long' })
}

export default function ReportsTab({ token, initialReportId = null }) {
  const { t, lang } = useI18n()
  const [list, setList] = useState(null) // null — грузим
  const [listError, setListError] = useState(false)
  const [openId, setOpenId] = useState(initialReportId)
  const [report, setReport] = useState(null)
  const [reportError, setReportError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const seenRef = useRef(new Set())

  const loadList = useCallback(async () => {
    setListError(false)
    setList(null)
    if (wantsReportSample()) {
      setList(normalizeReportList(SAMPLE_LIST))
      return
    }
    try {
      setList(normalizeReportList(await getFeedbackReports(token)))
    } catch (e) {
      // 404 — ручки на бэкенде ещё нет (веб вышел раньше): для ученика это
      // то же, что «отчётов нет», а не поломка.
      if (e?.status === 404) setList([])
      else setListError(true)
    }
  }, [token])

  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    if (openId == null) {
      setReport(null)
      return undefined
    }
    let cancelled = false
    setReport(null)
    setReportError(false)
    ;(async () => {
      try {
        const raw = wantsReportSample() ? SAMPLE_REPORTS[openId] : await getFeedbackReport(token, openId)
        const r = normalizeReport(raw)
        if (cancelled) return
        if (r) setReport(r)
        else setReportError(true)
      } catch {
        if (!cancelled) setReportError(true)
      }
    })()
    return () => { cancelled = true }
  }, [openId, token, attempt])

  // «Просмотрен» — после показа, один раз за визит вкладки: снимает метку
  // «Новый» и карточку на «Главной». Ошибку не показываем — уйдёт при
  // следующем открытии.
  useEffect(() => {
    if (!report || report.id == null || seenRef.current.has(String(report.id))) return
    seenRef.current.add(String(report.id))
    setList((prev) => prev && prev.map((x) => (String(x.id) === String(report.id) && !x.seenAt ? { ...x, seenAt: new Date().toISOString() } : x)))
    if (wantsReportSample()) return
    markFeedbackReportSeen(token, report.id).catch(() => {})
  }, [report, token])

  if (openId != null) {
    return (
      <div className="fbl">
        <button type="button" className="fbl__back" onClick={() => setOpenId(null)}>{t('reports.back')}</button>
        {reportError ? (
          <div className="fbl__empty">
            <p>{t('reports.reportError')}</p>
            <button type="button" className="fbl__retry" onClick={() => setAttempt((n) => n + 1)}>{t('reports.retry')}</button>
          </div>
        ) : report ? (
          <ReportView report={report} />
        ) : (
          <div className="fbl__loading" aria-busy="true">{t('reports.loading')}</div>
        )}
      </div>
    )
  }

  if (listError) {
    return (
      <div className="fbl">
        <div className="fbl__empty">
          <b>{t('reports.loadError')}</b>
          <button type="button" className="fbl__retry" onClick={loadList}>{t('reports.retry')}</button>
        </div>
      </div>
    )
  }

  if (list == null) {
    return <div className="fbl"><div className="fbl__loading" aria-busy="true">{t('reports.loading')}</div></div>
  }

  if (list.length === 0) {
    return (
      <div className="fbl">
        <div className="fbl__empty">
          <b>{t('reports.emptyTitle')}</b>
          <p>{t('reports.emptyText')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fbl">
      <ul className="fbl__list">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" className={`fbl__item ${r.seenAt ? '' : 'fbl__item--new'}`} onClick={() => setOpenId(r.id)}>
              <span className="fbl__title">
                {r.periodNo ? t('reports.month', { n: r.periodNo }) : t('reports.title')}
                {!r.seenAt && <span className="fbl__new">{t('reports.new')}</span>}
              </span>
              <span className="fbl__meta">
                {[r.teacherName, r.level, formatDay(r.publishedAt, lang)].filter(Boolean).join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Вкладка в `src/screens/LessonsPage.jsx`**

Импорт рядом с остальными:
```js
import ReportsTab from '../feedback/ReportsTab.jsx'
```
После `const TEACHER_TAB = …` добавить:
```js
// Отчёты о прогрессе — ученические: их пишет преподаватель про своего ученика,
// и у самого преподавателя этой вкладки нет.
const STUDENT_TAB = { key: 'reports', label: 'lessons.tabReports' }
```
Сигнатура — добавить проп `initialReportId`:
```js
export default function LessonsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onOpenLesson, onOpenCatalog, onOpenSelfStudy, onOpenPricing, initialTab, initialReportId = null, tourKey }) {
```
Строку `const tabs = teacher ? [...TABS, TEACHER_TAB] : TABS` заменить на:
```js
  const tabs = teacher ? [...TABS, TEACHER_TAB] : [...TABS, STUDENT_TAB]
```
В комментарий над функцией (после абзаца про `initialTab`) добавить:
```js
 * `initialReportId` — отчёт о прогрессе, открытый сразу (уведомление «Новый
 * отчёт» и карточка «Главной» ведут прямо в него, а не в список).
```
После блока `{tab === 'homework' && teacher && (…)}` добавить:
```jsx
        {tab === 'reports' && !teacher && (
          <div className="ls__body ls__body--wide">
            <ReportsTab token={token} initialReportId={initialReportId} />
          </div>
        )}
```

- [ ] **Step 5: Запустить — проходит**

Run: `npx vitest run src/screens/LessonsPage.test.jsx src/feedback`
Expected: PASS (все, включая прежние тесты LessonsPage).

- [ ] **Step 6: Коммит**

```bash
git add src/feedback/ReportsTab.jsx src/screens/LessonsPage.jsx src/screens/LessonsPage.test.jsx
git commit -m "feat(feedback): вкладка «Отчёты» в «Уроках» ученика"
```

---

### Task 7: Переходы — колокольчик, диплинк, App

**Files:**
- Modify: `src/lib/studentDeepLink.js`, `src/lib/studentDeepLink.test.js`, `src/App.jsx`

**Interfaces:**
- Consumes: `LessonsPage({ initialTab, initialReportId })` (Task 6).
- Produces: `notificationTarget('feedback-reports/<id>') → { screen: 'lessons', payload: { tab: 'reports', reportId } }`; `handleNav('lessons', { tab, reportId })` открывает вкладку; диплинк `?screen=lessons&tab=reports[&report=<id>]`.

- [ ] **Step 1: Тест — в `describe('notificationTarget')` файла `src/lib/studentDeepLink.test.js`**

```js
  it('отчёт о прогрессе открывается во вкладке «Отчёты», сразу в нём', () => {
    const report = { screen: 'lessons', payload: { tab: 'reports', reportId: '123' } }
    expect(notificationTarget('feedback-reports/123')).toEqual(report)
    expect(notificationTarget('/feedback-reports/123')).toEqual(report)
    expect(notificationTarget('feedback-reports')).toEqual({ screen: 'lessons', payload: { tab: 'reports', reportId: null } })
  })
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/lib/studentDeepLink.test.js`
Expected: FAIL — `expected { screen: null, payload: null } to deeply equal { screen: 'lessons', … }`.

- [ ] **Step 3: Реализация в `src/lib/studentDeepLink.js`** — сразу после `const trimmed = deepLink.trim()`:

```js
  // Отчёт о прогрессе (уведомление FEEDBACK_REPORT, спека 2026-10-20 §3.5) —
  // во вкладку «Отчёты» «Уроков», сразу в сам отчёт. Стоит выше общих веток:
  // те ловят адрес по словам (lesson, homework), и любое совпадение увело бы
  // в расписание.
  const report = trimmed.match(/^\/?feedback-reports(?:\/([^/?#\s]+))?\/?$/)
  if (report) return { screen: 'lessons', payload: { tab: 'reports', reportId: report[1] ?? null } }
```

- [ ] **Step 4: Запустить — проходит**

Run: `npx vitest run src/lib/studentDeepLink.test.js`
Expected: PASS.

- [ ] **Step 5: App — цель для «Уроков»**

Рядом с `const [homeworkTarget, setHomeworkTarget] = useState(null)`:
```js
  // Вкладка и отчёт «Уроков» — из уведомления «Новый отчёт», карточки
  // «Главной» и диплинка ?screen=lessons&tab=reports. at — метка перехода:
  // по ней экран пересоздаётся, иначе повторный переход, пока «Уроки» уже
  // открыты, не сменил бы вкладку (initialTab читается только при монтировании).
  const [lessonsTarget, setLessonsTarget] = useState(null)
```
В `handleNav` ветку `else if (key === 'lessons') {…}` заменить на:
```js
    else if (key === 'lessons') {
      if (payload && payload.lessonId) {
        setLiveLessonId(payload.lessonId)
        setScreen('live-lesson')
      } else {
        // Цель СБРАСЫВАЕТСЯ переходом без payload — иначе вкладка «Отчёты»
        // открывалась бы при каждом заходе из меню.
        setLessonsTarget(payload?.tab ? { tab: payload.tab, reportId: payload.reportId ?? null, at: Date.now() } : null)
        setScreen('lessons')
      }
    }
```
В блоке разбора диплинка, рядом с `if (deepLink === 'arcade') {…}`:
```js
    // ?screen=lessons&tab=reports&report=<id> — вкладка «Уроков» и отчёт в ней
    // (ссылка из уведомления в браузере и проверка вида по адресу).
    if (deepLink === 'lessons') {
      const tab = searchParams.get('tab')
      if (tab) setLessonsTarget({ tab, reportId: searchParams.get('report'), at: Date.now() })
    }
```
В рендере `LessonsPage` заменить `initialTab={resumeOf('lessons')?.tab}` на:
```jsx
key={lessonsTarget?.at ?? 'lessons'} initialTab={lessonsTarget?.tab ?? resumeOf('lessons')?.tab} initialReportId={lessonsTarget?.reportId ?? null}
```

- [ ] **Step 6: Проверка сборки и линта по затронутым файлам**

Run: `npx eslint src/App.jsx src/lib/studentDeepLink.js src/screens/LessonsPage.jsx src/feedback`
Expected: без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add src/lib/studentDeepLink.js src/lib/studentDeepLink.test.js src/App.jsx
git commit -m "feat(feedback): уведомление и диплинк ведут прямо в отчёт"
```

---

### Task 8: Карточка «Новый отчёт» на «Главной»

**Files:**
- Create: `src/feedback/NewReportCard.jsx`
- Modify: `src/screens/HomePage.jsx`, `src/screens/HomePage.test.jsx`, `src/screens/HomePage.ge.test.jsx`, `src/screens/HomePage.goal.test.jsx`
- Test: `src/feedback/NewReportCard.test.jsx`

**Interfaces:**
- Consumes: `getFeedbackReports` (Task 3), `normalizeReportList` (Task 2), `wantsReportSample`, `SAMPLE_LIST` (Task 2), `isTeacher` (`src/lib/jwt.js`), ключи `home.report.*` (Task 5).
- Produces: `<NewReportCard token onNav />` — `onNav('lessons', { tab: 'reports', reportId })`.

- [ ] **Step 1: Тест `src/feedback/NewReportCard.test.jsx`**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({ getFeedbackReports: vi.fn(async () => []) }))

import { getFeedbackReports } from '../api.js'
import NewReportCard from './NewReportCard.jsx'
import { SAMPLE_LIST } from './sample.js'

function tokenWithRole(role) {
  const payload = Buffer.from(JSON.stringify({ role, userId: 1 })).toString('base64url')
  return `header.${payload}.signature`
}
const renderCard = (token, onNav = () => {}) => render(<I18nProvider><NewReportCard token={token} onNav={onNav} /></I18nProvider>)

beforeEach(() => getFeedbackReports.mockClear())

describe('NewReportCard', () => {
  it('есть непросмотренный отчёт — карточка ведёт прямо в него', async () => {
    getFeedbackReports.mockResolvedValueOnce(SAMPLE_LIST)
    const onNav = vi.fn()
    renderCard(tokenWithRole('STUDENT'), onNav)
    fireEvent.click(await screen.findByText('Новый отчёт о прогрессе'))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'reports', reportId: 2 })
  })

  it('все просмотрены — карточки нет', async () => {
    getFeedbackReports.mockResolvedValueOnce(SAMPLE_LIST.map((x) => ({ ...x, seenAt: '2026-10-03T10:00:00+05:00' })))
    const { container } = renderCard(tokenWithRole('STUDENT'))
    await waitFor(() => expect(getFeedbackReports).toHaveBeenCalled())
    expect(container.querySelector('.hm-report')).toBeNull()
  })

  it('ручки нет (404) — карточки нет, ошибки тоже', async () => {
    getFeedbackReports.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 404 }))
    const { container } = renderCard(tokenWithRole('STUDENT'))
    await waitFor(() => expect(getFeedbackReports).toHaveBeenCalled())
    expect(container.querySelector('.hm-report')).toBeNull()
  })

  it('преподавателя и гостя не спрашивает', async () => {
    renderCard(tokenWithRole('TEACHER'))
    renderCard(null)
    await new Promise((r) => setTimeout(r, 0))
    expect(getFeedbackReports).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/feedback/NewReportCard.test.jsx`
Expected: FAIL — `Failed to resolve import "./NewReportCard.jsx"`.

- [ ] **Step 3: Реализация `src/feedback/NewReportCard.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getFeedbackReports } from '../api.js'
import { isTeacher } from '../lib/jwt.js'
import { normalizeReportList } from './reportShape.js'
import { wantsReportSample, SAMPLE_LIST } from './sample.js'

// Карточка «Новый отчёт о прогрессе» на «Главной»: видна, пока у ученика есть
// одобренный отчёт, который он ещё не открыл. Ничего не рисует, если ручки
// нет (404), сеть упала, отчётов нет или все просмотрены — «Главная» не
// ждёт её ответа и не показывает её ошибок.
export default function NewReportCard({ token, onNav }) {
  const { t } = useI18n()
  const [item, setItem] = useState(null)

  useEffect(() => {
    // Отчёты пишут про ученика: у преподавателя и гостя их нет.
    if (!token || isTeacher(token)) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const raw = wantsReportSample() ? SAMPLE_LIST : await getFeedbackReports(token)
        const fresh = normalizeReportList(raw).find((r) => !r.seenAt)
        if (!cancelled) setItem(fresh || null)
      } catch {
        // нет ручки или сети — карточки просто нет
      }
    })()
    return () => { cancelled = true }
  }, [token])

  if (!item) return null
  return (
    <button type="button" className="hm-report" onClick={() => onNav?.('lessons', { tab: 'reports', reportId: item.id })}>
      <span className="hm-report__icon" aria-hidden="true">📊</span>
      <span className="hm-report__text">
        <b>{t('home.report.title')}</b>
        {item.periodNo != null && <span>{t('home.report.text', { n: item.periodNo })}</span>}
      </span>
      <span className="hm-report__go">{t('home.report.open')} →</span>
    </button>
  )
}
```

- [ ] **Step 4: Встроить в `src/screens/HomePage.jsx`**

Импорт рядом с `import GeTodayCard from './home/GeTodayCard.jsx'`:
```js
import NewReportCard from '../feedback/NewReportCard.jsx'
```
Сразу после строки `{isDemoAccount && <DemoBanner expiresAt={demoExpiresAt} onOpenAccess={onOpenPricing} />}`:
```jsx
        {/* Новый отчёт о прогрессе от преподавателя — выше всего остального:
            приходит раз в месяц и сам исчезает, как только ученик его открыл. */}
        <NewReportCard token={token} onNav={onNav} />
```

- [ ] **Step 5: Заглушки в тестах «Главной».** В фабрику `vi.mock('../api.js', …)` каждого из `HomePage.test.jsx`, `HomePage.ge.test.jsx`, `HomePage.goal.test.jsx` добавить строку:
```js
  getFeedbackReports: vi.fn(async () => []),
```

- [ ] **Step 6: Запустить — проходит**

Run: `npx vitest run src/feedback src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx src/screens/HomePage.goal.test.jsx`
Expected: PASS.

- [ ] **Step 7: Коммит**

```bash
git add src/feedback/NewReportCard.jsx src/feedback/NewReportCard.test.jsx src/screens/HomePage.jsx src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx src/screens/HomePage.goal.test.jsx
git commit -m "feat(feedback): карточка «Новый отчёт» на «Главной»"
```

---

### Task 9: E2E, проверка целиком, документация

**Files:**
- Create: `tests/feedback-report.spec.js`
- Modify: `CLAUDE.md` (раздел про отчёты), `docs/superpowers/specs/2026-10-20-feedback-reports-student-design.md` (статус)

- [ ] **Step 1: E2E `tests/feedback-report.spec.js`**

```js
import { test, expect } from '@playwright/test'

// Отчёты о прогрессе: ссылка из мессенджера без входа и вкладка «Отчёты» в
// «Уроках». Бэкенда ручек ещё нет — отвечаем за него через page.route.
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const REPORT = {
  id: 2, periodNo: 2, lang: 'ru', studentName: 'Айша Тестова', teacherName: 'Test Teacher', level: 'A1',
  format: 'individual', unitsText: 'Unit 2 — Lessons 1–6', attendance: { done: 8, planned: 9 }, homeworkPct: 85,
  skills: [
    { key: 'speaking', score: 4, prev: 3 }, { key: 'listening', score: 3, prev: 3 }, { key: 'reading', score: 4, prev: 3 },
    { key: 'writing', score: 3, prev: 2 }, { key: 'grammar', score: 3, prev: 3 }, { key: 'vocabulary', score: 4, prev: 3 },
  ],
  strengths: ['Активен на уроке'], improvements: ['Времена глаголов'], motivation: 'Так держать!',
  badges: [{ type: 'skills_growth', n: 4 }], pastGoals: [{ text: 'Выучить числа до 100', result: 'achieved' }],
  nextGoals: ['Выучить 30 новых слов'], plan: 'Unit 3.', publishedAt: '2026-10-02T10:15:00+05:00',
}

test('ссылка из мессенджера открывает отчёт без входа и отмечает «открыт» один раз', async ({ page }) => {
  let opened = 0
  await page.route('**/feedback-reports/link/tok-123', (r) => r.fulfill(json(REPORT)))
  await page.route('**/feedback-reports/link/tok-123/opened', (r) => { opened += 1; return r.fulfill({ status: 204 }) })

  await page.goto('/report/tok-123')
  await expect(page.getByRole('heading', { name: 'Айша Тестова' })).toBeVisible()
  await expect(page.getByText('Отчёт о прогрессе · 2-й месяц (дни 31–60)')).toBeVisible()
  await expect(page.getByText('Рост в 4 навыках')).toBeVisible()
  await expect.poll(() => opened).toBe(1)
  // Без горизонтальной прокрутки и на телефоне.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('неизвестная ссылка — «недействительна»', async ({ page }) => {
  await page.route('**/feedback-reports/link/nope', (r) => r.fulfill(json({ messages: ['not found'] }, 404)))
  await page.goto('/report/nope')
  await expect(page.getByText('Ссылка недействительна. Попросите школу прислать отчёт ещё раз.')).toBeVisible()
})

test('образец /report/sample рисуется без бэкенда', async ({ page }) => {
  let calls = 0
  await page.route('**/feedback-reports/**', (r) => { calls += 1; return r.abort() })
  await page.goto('/report/sample')
  await expect(page.getByRole('heading', { name: 'Айша Тестова' })).toBeVisible()
  expect(calls).toBe(0)
})

test('вкладка «Отчёты»: список → отчёт → «просмотрен»', async ({ page }) => {
  let seen = 0
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Айша', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })))
  await page.route('**/mobile/feedback-reports', (r) => r.fulfill(json([
    { id: 2, periodNo: 2, level: 'A1', teacherName: 'Test Teacher', publishedAt: '2026-10-02T10:15:00+05:00', seenAt: null },
  ])))
  await page.route('**/mobile/feedback-reports/2', (r) => r.fulfill(json(REPORT)))
  await page.route('**/mobile/feedback-reports/2/seen', (r) => { seen += 1; return r.fulfill({ status: 204 }) })

  await page.goto('/?screen=lessons&tab=reports')
  // По классам, а не по тексту: заголовок карточки вместе с меткой — «2-й
  // месяцНовый», а слово «Новый» может встретиться где угодно на экране.
  const item = page.locator('.fbl__item', { hasText: '2-й месяц' })
  await expect(item.locator('.fbl__new')).toBeVisible()
  await item.click()
  await expect(page.getByRole('heading', { name: 'Айша Тестова' })).toBeVisible()
  await expect.poll(() => seen).toBe(1)
  await page.getByText('← Все отчёты').click()
  await expect(item).toBeVisible()
  await expect(page.locator('.fbl__new')).toHaveCount(0)
})
```

- [ ] **Step 2: Прогнать e2e** (один воркер, свой порт — чужой dev на 3100 подменил бы код)

Run: `E2E_PORT=3217 npx playwright test tests/feedback-report.spec.js --workers=1`
Expected: 8 passed (4 теста × проекты mobile и desktop).

- [ ] **Step 3: Полная проверка**

Run: `npx vitest run src/feedback src/api.feedback.test.js src/screens/LessonsPage.test.jsx src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx src/screens/HomePage.goal.test.jsx src/lib/studentDeepLink.test.js src/components/NotificationBell.test.jsx`
Expected: PASS.

Run: `npm run lint`
Expected: без новых ошибок.

Run: `npm run build`
Expected: сборка проходит, в списке маршрутов есть `/report/[token]`.

- [ ] **Step 4: CLAUDE.md** — после раздела «Шэдоуинг в «Практике»…» добавить абзац:

```markdown
**Отчёты о прогрессе (раздел Feedback) — сторона ученика.** Раз в 30 дней от
первого урока преподаватель пишет каждому ученику личный отчёт, координатор
одобряет, после этого отчёт уходит родителю в WhatsApp/Telegram и в кабинет
(решение руководства 20.10.2026: 30 дней вместо «каждые 7 уроков»). Форма
преподавателя и проверка — web-admin, рассылка и задачи — бэкенд; здесь только
то, что видят ученик и родитель. Контракт ручек —
`docs/superpowers/specs/2026-10-20-feedback-reports-student-design.md`.
Ссылка из мессенджера — маршрут `/report/<token>` без входа (как `trial/[token]`;
noindex, no-referrer), в кабинете — вкладка «Отчёты» в «Уроках»
(`src/feedback/ReportsTab.jsx`), новый отчёт — уведомление `FEEDBACK_REPORT`
(`deepLink: feedback-reports/<id>`) и карточка «Главной». Вид один
(`src/feedback/ReportView.jsx`) и снят с превью прототипа
`data/jts-progress-report.html`. Подписи — на языке ОТЧЁТА (`lang`), а не
интерфейса (`labels.js`); бейджи считает бэкенд, веб их только подписывает.
«Открыт»/«просмотрен» — отдельные POST после показа: мессенджеры сами ходят по
ссылкам. Пока ручек нет, 404 читается как «отчётов нет» и помнится 10 минут;
вид смотрится на образце — `?screen=lessons&tab=reports&reportSample=1` и
`/report/sample`, только на локалке и дев-стендах.
```

В спеке строку статуса заменить на: `**Статус на 20.10.2026: веб сделан (ветка feat/feedback-reports-student), бэкенда нет.**`

- [ ] **Step 5: Коммит**

```bash
git add tests/feedback-report.spec.js CLAUDE.md docs/superpowers/specs/2026-10-20-feedback-reports-student-design.md
git commit -m "test(feedback): e2e отчёта по ссылке и вкладки «Отчёты»; документация"
```
