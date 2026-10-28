# Нижняя панель, «Сервисы» и «Главная» телефона — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** до 560px заменить бургер нижней панелью из пяти вкладок и экраном «Сервисы», «Главную» телефона сделать строго по дизайну мобильного приложения, весь телефон — на Manrope.

**Architecture:** правила меню выносятся из `Sidebar.jsx` в чистый `src/lib/navSections.js` и хук `useMenuItems` — на них работают сайдбар, новая `MobileTabBar` и новый экран `ServicesPage`. Все три оболочки рисуют панель; её показ, отступы и список экранов без панели — в одном файле `src/mobile/nav.css`. «Главная» меняет разметку минимально (телефонный вариант карточки уровня, полоса дней, плашки), раскладку телефона целиком задаёт переписанный `src/mobile/home.css`.

**Tech Stack:** Next.js 16 (App Router как оболочка SPA), React, JavaScript (.js/.jsx, без TS), глобальные CSS по разделам, vitest + @testing-library/react (jsdom), Playwright (проекты `mobile` 390 и `desktop` 1440), Figma Desktop Bridge (`figma-console`), sharp для webp.

**Спека:** `docs/superpowers/specs/2026-10-26-mobile-app-nav-home-design.md`.

## Global Constraints

- Всё новое на телефоне — только внутри `@media (max-width: 560px)`. Планшет 561–760 и компьютер ≥761 не меняются.
- Шрифт мобильного слоя — Manrope; казахский — Inter (`src/kk-font.css`); новый `font-family` в CSS = строка в `kk-font.css` и в `COVERED` теста `src/kkFont.test.js`.
- Комментарии — по-русски и про «почему»; строки UI — через `t()` из `src/i18n.jsx` (ключи ru, en, kk одинаковые).
- Картинки и значки макета — только экспортом из Figma, не рисовать руками.
- Логику, запросы и данные экранов не менять. IELTS-раздел не трогать.
- Figma: файл «pitch JTS (Copy)», ключ `WCkbre7juSNnHHVm4WgUfh` (сверять `figma_list_open_files`), страница «Mobile».
- Рабочее дерево: `C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/mobile-app-nav`, ветка `design/mobile-app-nav`. Все команды — из него; в корень основного дерева не переходить.
- Временные файлы — в scratchpad сессии; в командах он `$SCRATCH`:
  `SCRATCH=/c/Users/nural/AppData/Local/Temp/claude/C--Users-nural-Desktop-jts-web-app/f448a672-f2cf-4059-8463-6a60bb2260a4/scratchpad`.
- В конце каждого коммита: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 0: Подготовка дерева

**Files:** —

- [ ] **Step 1: node_modules ссылкой из основного дерева**

```bash
cd /c/Users/nural/Desktop/jts-web-app/.claude/worktrees/mobile-app-nav
cmd //c "mklink /J node_modules C:\\Users\\nural\\Desktop\\jts-web-app\\node_modules"
```
Expected: `Junction created for node_modules`.

- [ ] **Step 2: базовая проверка тестов, которые план затронет**

```bash
npx vitest run src/components/Sidebar.test.jsx src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx src/screens/HomePage.goal.test.jsx src/kkFont.test.js
```
Expected: все PASS. Если что-то красное уже до правок — записать в отчёт как исходное состояние и не чинить.

- [ ] **Step 3: обёртка Playwright на системном Chrome** (свой Chromium Playwright на машине не ставится)

Создать `C:/Users/nural/AppData/Local/Temp/claude/C--Users-nural-Desktop-jts-web-app/f448a672-f2cf-4059-8463-6a60bb2260a4/scratchpad/pw.config.mjs`:

```js
import * as mod from 'file:///C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/mobile-app-nav/playwright.config.js'
const base = mod.default?.default ?? mod.default ?? mod
export default {
  ...base,
  testDir: 'C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/mobile-app-nav/tests',
  outputDir: 'C:/Users/nural/AppData/Local/Temp/claude/C--Users-nural-Desktop-jts-web-app/f448a672-f2cf-4059-8463-6a60bb2260a4/scratchpad/pw-results',
  projects: base.projects.map((p) => ({ ...p, use: { ...p.use, channel: 'chrome' } })),
  webServer: { ...base.webServer, cwd: 'C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/mobile-app-nav' },
}
```

Запуск e2e во всех задачах ниже: `E2E_PORT=3117 npx playwright test --config "$SCRATCH/pw.config.mjs" tests/<файл>.spec.js` (порт свой, чтобы не прогнать тесты по чужому dev-серверу). Если `file:///` не грузится — заменить на путь `C:/…` (лоадер Playwright бывает CJS).

---

### Task 1: Правила меню в `navSections.js`, хук `useMenuItems`, сайдбар на них

**Files:**
- Create: `src/lib/navSections.js`
- Create: `src/lib/navSections.test.js`
- Create: `src/lib/groupNum.js`
- Create: `src/components/useMenuItems.js`
- Modify: `src/components/Sidebar.jsx` (константы меню строки 13–61, состояние меню строки 78–133)

**Interfaces:**
- Produces: `menuItems({ teacher?, ieltsAccount?, exams?: { ielts, sat }, rewards? }) → Array<{ key, label, ico }>`; `mobileTabs(items) → Array<{ key, label, ico }>` (последняя всегда `services`); `serviceItems(items) → Array<{ key, label, ico }>`; `tabFor(active: string|undefined) → 'home'|'practice'|'tutor'|'lessons'|'services'`; `SERVICES_TAB`; `useMenuItems(token) → { items, teacher, ieltsAccount }`; `groupNum(n) → string`.

- [ ] **Step 1: Падающий тест правил**

`src/lib/navSections.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { menuItems, mobileTabs, serviceItems, tabFor } from './navSections.js'

const keys = (list) => list.map((i) => i.key)

describe('меню ученика', () => {
  it('обычный ученик: Главная и разделы курса, без экзаменов и наград', () => {
    expect(keys(menuItems())).toEqual(['home', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab'])
  })

  it('экзамен появляется только при своей подписке', () => {
    expect(keys(menuItems({ exams: { ielts: true, sat: false } }))).toEqual([
      'home', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'ielts', 'vocab',
    ])
  })

  it('награды — только там, где они включены', () => {
    expect(keys(menuItems({ rewards: true })).slice(-2)).toEqual(['tokens', 'prizes'])
  })

  it('преподаватель: только Практика и Уроки', () => {
    expect(keys(menuItems({ teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('аккаунт IELTS — свой порядок', () => {
    expect(keys(menuItems({ ieltsAccount: true, exams: { ielts: true, sat: true } }))).toEqual([
      'home', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'ielts', 'sat',
    ])
  })
})

describe('нижняя панель телефона', () => {
  it('ученик: пять вкладок как в приложении', () => {
    expect(keys(mobileTabs(menuItems()))).toEqual(['home', 'practice', 'tutor', 'lessons', 'services'])
  })

  it('вкладка тьютора подписана как в приложении, а не Speaking Buddy', () => {
    expect(mobileTabs(menuItems()).find((t) => t.key === 'tutor').label).toBe('mtab.tutor')
  })

  it('преподаватель: Практика, Уроки и Сервисы', () => {
    expect(keys(mobileTabs(menuItems({ teacher: true })))).toEqual(['practice', 'lessons', 'services'])
  })

  it('Сервисы — разделы, которые не стали вкладками, в порядке меню', () => {
    expect(keys(serviceItems(menuItems({ exams: { ielts: true, sat: true } })))).toEqual([
      'learning', 'homework', 'ielts', 'sat', 'vocab',
    ])
    expect(serviceItems(menuItems({ teacher: true }))).toEqual([])
  })

  it('выбрана своя вкладка, а всё прочее живёт в «Сервисах»', () => {
    expect(tabFor('home')).toBe('home')
    expect(tabFor('practice')).toBe('practice')
    expect(tabFor('tutor')).toBe('tutor')
    expect(tabFor('lessons')).toBe('lessons')
    for (const a of ['learning', 'homework', 'ielts', 'sat', 'vocab', 'services', '', undefined]) {
      expect(tabFor(a)).toBe('services')
    }
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/lib/navSections.test.js`
Expected: FAIL — `Failed to resolve import "./navSections.js"`.

- [ ] **Step 3: `src/lib/navSections.js`**

```js
import { TUTOR_ONLY, TUTOR_ONLY_SECTIONS, isRewardsScreen } from '../config.js'

// Меню ученика — одно на сайдбар (компьютер и планшет), нижнюю панель телефона и экран «Сервисы». Правила
// перенесены из Sidebar.jsx без изменений (26.10.2026): панель и «Сервисы» обязаны показывать ровно те разделы, что
// сайдбар, — иначе у преподавателя или ученика IELTS телефон и компьютер разошлись бы.

// «Главная» держится отдельно от NAV не по правам, а по порядку: она всегда первая, а NAV — общий список разделов.
// Пункт есть у КАЖДОГО ученика, демо и оплаченного: экран давно перестал быть сводкой демо-доступа и показывает
// уровень, прогресс, расписание и домашку. Преподаватель — исключение: у него свой набор разделов.
//
// Значки пунктов — контурные Material Symbols из макета «Главная · редизайн» (21.10.2026), файлами в
// public/assets/home-v2/ico. Рисуются маской, поэтому цвет берут от пункта.
export const HOME_ITEM = { key: 'home', label: 'nav.home', ico: 'home' }

const NAV_FULL = [
  { key: 'learning', label: 'nav.learning', ico: 'map' },
  { key: 'practice', label: 'nav.practice', ico: 'auto_stories' },
  { key: 'tutor', label: 'nav.tutor', ico: 'auto_awesome' },
  { key: 'lessons', label: 'nav.lessons', ico: 'videocam' },
  { key: 'homework', label: 'nav.homework', ico: 'assignment' },
  // IELTS вернулся в меню вместе с хабом раздела (макет Screen MS, 01.10.2026).
  // Пунктов стало восемь — на низких экранах их ужимает CSS (.sb в styles.css).
  { key: 'ielts', label: 'nav.ielts', ico: 'school' },
  { key: 'sat', label: 'nav.sat', ico: 'quiz' },
  { key: 'vocab', label: 'nav.vocab', ico: 'menu_book' },
  { key: 'tokens', label: 'nav.tokens', ico: 'insights' },
  { key: 'prizes', label: 'nav.prizes', ico: 'school' },
]
// Тьютор-онли (прод, main): в меню остаются только разделы из TUTOR_ONLY_SECTIONS (Тьютор, Практика, Словарь) —
// остальные скрыты от обычных пользователей (доступны диплинком ?screen=… для отладки).
const NAV = TUTOR_ONLY ? NAV_FULL.filter((i) => TUTOR_ONLY_SECTIONS.includes(i.key)) : NAV_FULL

// Разделы преподавателя. Остальное в списке — его собственное обучение, которого у него нет: Тьютор, IELTS и
// Словарь ученические (design-spec §4.2).
//
// «Практика» — исключение, и по просьбе самих преподавателей: заданий там больше, чем в уроках, а выдать их на дом
// было неоткуда. Прогресс и лимиты у преподавателя при этом свои, пустые, — он раздел не проходит, а выдаёт из него
// задания (см. AssignPracticeBar).
const TEACHER_SECTIONS = ['lessons', 'practice']

// Аккаунт IELTS (дизайн «IELTS new», 08.10.2026): ровно эти разделы и в этом порядке, а внизу «Настройки». Игровых
// счётчиков и плашки уровня в макете нет. С 13.10.2026 то же меню у ученика с открытым доступом к IELTS или SAT — и
// в нём всегда ОБА экзамена: доступ к одному не прячет второй (решение владельца), «Повторение» (Review) остаётся в
// меню — владелец, 13.10.2026.
const IELTS_SECTIONS = ['learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'ielts', 'sat', 'tokens', 'prizes']

/**
 * Пункты меню по роли. Награды (tokens, prizes) — только там, где они включены (rewards); вкладки экзаменов — только
 * при своей подписке, абонементе или тарифе (exams), пока ответа нет — спрятаны.
 */
export function menuItems({ teacher = false, ieltsAccount = false, exams = { ielts: false, sat: false }, rewards = false } = {}) {
  const all = teacher
    ? NAV.filter((item) => TEACHER_SECTIONS.includes(item.key))
    : ieltsAccount
      // из NAV, а не NAV_FULL: в тьютор-онли аккаунт IELTS не должен видеть скрытые от всех разделы
      ? [HOME_ITEM, ...IELTS_SECTIONS.map((k) => NAV.find((i) => i.key === k)).filter(Boolean)]
      : [HOME_ITEM, ...NAV]
  return all.filter((item) => {
    if (!rewards && isRewardsScreen(item.key)) return false
    if (item.key === 'ielts') return exams.ielts
    if (item.key === 'sat') return exams.sat
    return true
  })
}

// Нижняя панель телефона — дизайн мобильного приложения (Figma «Mobile», кадр 6419:6295): четыре раздела вкладками и
// «Сервисы», где профиль и всё остальное. Подпись тьютора своя: в приложении вкладка зовётся «AI-тьютор».
const TAB_KEYS = ['home', 'practice', 'tutor', 'lessons']
const TAB_META = {
  home: { label: 'nav.home', ico: 'home' },
  practice: { label: 'nav.practice', ico: 'auto_stories' },
  tutor: { label: 'mtab.tutor', ico: 'auto_awesome' },
  lessons: { label: 'nav.lessons', ico: 'videocam' },
}
export const SERVICES_TAB = { key: 'services', label: 'mtab.services', ico: 'grid_view' }

/** Вкладки — разделы из меню этого ученика; «Сервисы» есть всегда: там профиль. */
export function mobileTabs(items) {
  const have = new Set(items.map((i) => i.key))
  return [...TAB_KEYS.filter((k) => have.has(k)).map((key) => ({ key, ...TAB_META[key] })), SERVICES_TAB]
}

/** Плитки «Сервисов» — пункты меню, которые не стали вкладками, в порядке меню. */
export function serviceItems(items) {
  return items.filter((i) => !TAB_KEYS.includes(i.key))
}

/** Какая вкладка горит на экране с этим `active` оболочки: свой раздел — своя, всё прочее (и профиль) — «Сервисы». */
export function tabFor(active) {
  return TAB_KEYS.includes(active) ? active : 'services'
}
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/lib/navSections.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: `src/lib/groupNum.js`**

```js
// 1253 → «1 253» (как в мобильном HUD). Общий у сайдбара и «Сервисов».
export function groupNum(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
```

- [ ] **Step 6: `src/components/useMenuItems.js`**

```js
import { useEffect, useState } from 'react'
import { getIeltsMe, getSatMeCached } from '../api.js'
import { areRewardsEnabled } from '../config.js'
import { loadToken } from '../lib/session.js'
import { isTeacher } from '../lib/jwt.js'
import { menuItems } from '../lib/navSections.js'

/**
 * Меню этого ученика — одно на сайдбар, нижнюю панель телефона и «Сервисы» (lib/navSections.js). Роль читается из
 * токена; аккаунт IELTS и подписки на экзамены — у бэкенда (ответ помнится по токену в api.js, поэтому переход между
 * экранами запроса не стоит). До ответа экзаменов в меню нет: ученик General не должен видеть их даже на мгновение,
 * а у ученика IELTS меню сменится с первым ответом.
 */
export function useMenuItems(token) {
  const teacher = isTeacher(token)
  const rewards = areRewardsEnabled()
  const [ieltsAccount, setIeltsAccount] = useState(false)
  const [exams, setExams] = useState({ ielts: false, sat: false })
  useEffect(() => {
    const authToken = token || loadToken()
    if (!authToken || teacher) return
    let alive = true
    getIeltsMe(authToken).then((m) => {
      if (!alive) return
      if (m.ieltsAccount) setIeltsAccount(true)
      setExams((prev) => ({ ...prev, ielts: !!(m.purchased || m.ieltsAccount) }))
    })
    getSatMeCached(authToken).then((m) => {
      if (alive) setExams((prev) => ({ ...prev, sat: !!m?.purchased }))
    })
    return () => {
      alive = false
    }
  }, [token, teacher])
  return { items: menuItems({ teacher, ieltsAccount, exams, rewards }), teacher, ieltsAccount }
}
```

- [ ] **Step 7: Сайдбар на общих правилах**

В `src/components/Sidebar.jsx`:

Импорты (строки 1–11) заменить на:

```jsx
import { useState, useEffect } from 'react'
import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import { roleForLevel } from '../kingdoms.js'
import { getBalance, getDemoAccess } from '../api.js'
import DemoOfferCard from './DemoOfferCard.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { loadToken } from '../lib/session.js'
import { groupNum } from '../lib/groupNum.js'
import { useMenuItems } from './useMenuItems.js'
import { ChevronRightIcon, CloseIcon, UserIcon, SettingsIcon } from './icons.jsx'

// Состав меню по роли — lib/navSections.js: его же показывают нижняя панель телефона и «Сервисы».
```

Удалить блок от `// «Главная» держится отдельно от NAV…` (строка 13) до конца функции `groupNum` (строка 61) включительно.

Внутри компонента удалить строки `const teacher = isTeacher(token)` и `const rewardsEnabled = areRewardsEnabled()` вместе с комментарием над ними («Роль читается из токена прямо здесь…»), а блок от комментария `// «Главная» теперь у всех…` до `const nav = navAll.filter(…)` с его закрывающей `})` заменить одной строкой:

```jsx
  const { items: nav, teacher, ieltsAccount } = useMenuItems(token)
```

Остальное (`demo`, `balance`, разметка) не меняется.

- [ ] **Step 8: Сайдбар зелёный, правила зелёные**

Run: `npx vitest run src/components/Sidebar.test.jsx src/lib/navSections.test.js src/screens/HomePage.ge.test.jsx`
Expected: PASS. (`HomePage.ge.test.jsx` проверяет тур со списком разделов из `data-nav` сайдбара.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/navSections.js src/lib/navSections.test.js src/lib/groupNum.js src/components/useMenuItems.js src/components/Sidebar.jsx
git commit -m "refactor(nav): правила меню в lib/navSections.js — общие для сайдбара и телефона

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Ключи словаря и картинки макета

**Files:**
- Modify: `src/i18n.jsx` (после `'nav.settings'` и после `'home.schedule.all'` в каждом из трёх языков)
- Create: `public/assets/home-v2/ico/{grid_view,restart_alt,calculate,north_east,milestone,finish}.svg`
- Create: `public/assets/m/services/mascot.webp`, `public/assets/m/home/medal.webp`

**Interfaces:**
- Produces: ключи `mtab.tutor`, `mtab.services`, `mtab.label`, `services.coins`, `services.streak`, `home.schedule.freeSub`, `home.homework.all`, `home.level.goalEdit`; значки по именам выше (маски, цвет от `currentColor`); две webp.

- [ ] **Step 1: Ключи навигации.** В `src/i18n.jsx` после строки `    'nav.settings': 'Настройки',` (ru) вставить:

```js
    'mtab.tutor': 'AI-тьютор',
    'mtab.services': 'Сервисы',
    'mtab.label': 'Разделы',
    'services.coins': 'Монеты',
    'services.streak': 'Дней подряд',
```

после `    'nav.settings': 'Settings',` (en):

```js
    'mtab.tutor': 'AI tutor',
    'mtab.services': 'Services',
    'mtab.label': 'Sections',
    'services.coins': 'Coins',
    'services.streak': 'Day streak',
```

после `    'nav.settings': 'Баптаулар',` (kk):

```js
    'mtab.tutor': 'AI-тьютор',
    'mtab.services': 'Сервистер',
    'mtab.label': 'Бөлімдер',
    'services.coins': 'Тиындар',
    'services.streak': 'Қатарынан күн',
```

- [ ] **Step 2: Ключи «Главной».** После `    'home.schedule.all': 'Всё расписание',` (ru):

```js
    'home.schedule.freeSub': 'На выбранный день ничего не запланировано',
    'home.homework.all': 'Все',
    'home.level.goalEdit': 'Изменить',
```

после `    'home.schedule.all': 'Full schedule',` (en):

```js
    'home.schedule.freeSub': 'Nothing is planned for this day',
    'home.homework.all': 'All',
    'home.level.goalEdit': 'Change',
```

после `    'home.schedule.all': 'Толық кесте',` (kk):

```js
    'home.schedule.freeSub': 'Таңдалған күнге ештеңе жоспарланбаған',
    'home.homework.all': 'Барлығы',
    'home.level.goalEdit': 'Өзгерту',
```

- [ ] **Step 3: Значки экспортом.** Проверить мост: `figma_list_open_files` → активный файл «pitch JTS (Copy)». Выполнить `figma_execute` (timeout 20000):

```js
const want = { grid_view: '6419:6295', restart_alt: '6419:6295', calculate: '6419:6295', north_east: '6419:6295', milestone: '6125:6209', finish: '6125:6209' }
const out = {}
for (const [name, rootId] of Object.entries(want)) {
  const root = await figma.getNodeByIdAsync(rootId)
  const node = root.findOne((n) => n.type === 'INSTANCE' && n.name.replace(/^icon\//, '') === name)
  out[name] = node ? await node.exportAsync({ format: 'SVG_STRING' }) : null
}
return out
```

Каждую строку результата сохранить файлом `public/assets/home-v2/ico/<имя>.svg` (Write, содержимое как есть). Ни одна не должна быть `null`; если `null` — найти узел по имени в кадре (`root.findAll(n => n.name.includes('<имя>'))`) и экспортировать его.

- [ ] **Step 4: Маскот «Сервисов» и медаль экспортом.** `figma_execute` (timeout 30000). Оба узла обрезаны своими карточками, поэтому экспортируются копией на странице (иначе выйдет видимый кусок):

```js
const out = {}
for (const [name, id] of [['mascot', '6419:6383'], ['medal', '6127:5843']]) {
  const src = await figma.getNodeByIdAsync(id)
  const copy = src.clone()
  figma.currentPage.appendChild(copy)
  copy.x = -5000
  copy.y = -5000
  // у картинки бывает скрытая непрозрачная подложка — оставляем только саму картинку
  if (Array.isArray(copy.fills)) copy.fills = copy.fills.filter((f) => f.type === 'IMAGE')
  out[name] = figma.base64Encode(await copy.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } }))
  copy.remove()
}
return out
```

Большой результат инструмент кладёт файлом — путь будет в ответе. Декодировать и пережать (из корня дерева):

```bash
node -e "
const fs = require('fs'), path = require('path'), sharp = require('sharp');
const raw = fs.readFileSync(process.argv[1], 'utf8');
const j = JSON.parse(raw.slice(raw.indexOf('{')));
const res = j.result || j;
(async () => {
  for (const [k, dst] of [['mascot', 'public/assets/m/services/mascot.webp'], ['medal', 'public/assets/m/home/medal.webp']]) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    await sharp(Buffer.from(res[k], 'base64')).webp({ quality: 88 }).toFile(dst);
    console.log(dst, (await sharp(dst).metadata()).width);
  }
})();
" "<путь к файлу результата>"
```
Expected: `mascot.webp 352`, `medal.webp 248`. Открыть оба файла Read-ом и сверить глазами с кадрами.

- [ ] **Step 5: Словарь не сломан**

Run: `npx vitest run src/i18n` (если есть тесты словаря) и `npx vitest run src/screens/HomePage.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/i18n.jsx public/assets/home-v2/ico public/assets/m/services public/assets/m/home/medal.webp
git commit -m "feat(mobile): ключи словаря и картинки макета приложения для панели и «Главной»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Экран «Сервисы»

**Files:**
- Create: `src/screens/ServicesPage.jsx`
- Create: `src/screens/ServicesPage.test.jsx`
- Create: `src/services.css`
- Modify: `src/app/layout.jsx` (импорт `../services.css` после `../demo.css`)
- Modify: `src/App.jsx` (импорт, `handleNav`, ветка `case 'services'`)

**Interfaces:**
- Consumes: `useMenuItems(token)`, `serviceItems(items)`, `groupNum`, ключи `mtab.services`, `services.coins`, `services.streak`, `home.level.stop`, `kingdom.profile`; картинка `/assets/m/services/mascot.webp`; значки `restart_alt`, `assignment`, `school`, `calculate`, `menu_book`, `north_east`.
- Produces: экран `services` в App; `handleNav('services')`; классы `.svc`, `.svc-hero`, `.svc-grid`, `.svc-tile`.

- [ ] **Step 1: Падающий тест экрана**

`src/screens/ServicesPage.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import ServicesPage from './ServicesPage.jsx'

const demo = { value: false }

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 1253, streak: 4, streakActiveToday: true })),
  getDemoAccess: vi.fn(async () => ({ isDemo: demo.value, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getSatMeCached: vi.fn(async () => null),
}))

function renderServices(props = {}) {
  const onNav = vi.fn()
  const onProfile = vi.fn()
  const view = render(
    <I18nProvider>
      <ServicesPage userName="Сакен" userLevel="B2" token="T" onNav={onNav} onProfile={onProfile} {...props} />
    </I18nProvider>,
  )
  return { ...view, onNav, onProfile }
}

beforeEach(() => {
  demo.value = false
})

describe('Сервисы', () => {
  it('профиль: имя, «Профиль», уровень; плашка ведёт в профиль', () => {
    const { container, onProfile } = renderServices()
    const hero = container.querySelector('.svc-hero')
    expect(within(hero).getByText('Сакен')).toBeTruthy()
    expect(within(hero).getByText('Профиль')).toBeTruthy()
    expect(within(hero).getByText('Уровень B2')).toBeTruthy()
    fireEvent.click(hero)
    expect(onProfile).toHaveBeenCalledTimes(1)
  })

  it('плитки — разделы меню, которые не стали вкладками', () => {
    const { container, onNav } = renderServices()
    const grid = container.querySelector('.svc-grid')
    expect([...grid.querySelectorAll('.svc-tile__name')].map((n) => n.textContent)).toEqual(['Повторение', 'Домашняя работа', 'Словарь'])
    fireEvent.click(within(grid).getByText('Словарь'))
    expect(onNav).toHaveBeenCalledWith('vocab')
  })

  it('монеты и стрик — плашками рядом с уровнем', async () => {
    const { container } = renderServices()
    await waitFor(() => expect(container.querySelectorAll('.svc-chip')).toHaveLength(3))
    expect(container.querySelector('.svc-hero').textContent).toContain('1 253')
  })

  it('у демо вместо монет — плашка скидки под плитками', async () => {
    demo.value = true
    const { container } = renderServices()
    await waitFor(() => expect(container.querySelector('.svc .dm-offer')).not.toBeNull())
    expect(container.querySelectorAll('.svc-chip')).toHaveLength(1)
  })

  it('без имени — «Профиль» один раз', () => {
    const { container } = renderServices({ userName: '' })
    const name = container.querySelector('.svc-hero__name')
    expect(name.querySelector('b').textContent).toBe('Профиль')
    expect(name.querySelector('span')).toBeNull()
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/screens/ServicesPage.test.jsx`
Expected: FAIL — `Failed to resolve import "./ServicesPage.jsx"`.

- [ ] **Step 3: `src/screens/ServicesPage.jsx`**

```jsx
import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import DemoOfferCard from '../components/DemoOfferCard.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import AssetImage from '../components/AssetImage.jsx'
import { ChevronRightIcon, UserIcon } from '../components/icons.jsx'
import { useMenuItems } from '../components/useMenuItems.js'
import { serviceItems } from '../lib/navSections.js'
import { groupNum } from '../lib/groupNum.js'
import { loadToken } from '../lib/session.js'
import { getBalance, getDemoAccess } from '../api.js'
import { useI18n } from '../i18n.jsx'

// Фон плитки и значок — из кадра «Сервисы» (Figma «Mobile», 6419:6295). Раздел, которого в макете нет (награды на
// dev-стенде), берёт лавандовый фон и свой значок из меню.
const TILE = {
  learning: { bg: '#e6dcfc', ico: 'restart_alt' },
  homework: { bg: '#ffe3cf', ico: 'assignment' },
  ielts: { bg: '#d6edfb', ico: 'school' },
  sat: { bg: '#d6dcff', ico: 'calculate' },
  vocab: { bg: '#cff0e5', ico: 'menu_book' },
}

/**
 * «Сервисы» — пятая вкладка нижней панели телефона (дизайн приложения, спека 2026-10-26): профиль и разделы, которые
 * не стали вкладками. Монеты и стрик живут здесь же — на телефоне сайдбара нет, а других мест для них приложение не
 * рисует (решение владельца 26.10.2026). У преподавателя и аккаунта IELTS плашек уровня и счётчиков нет, у демо —
 * счётчиков (вместо них плашка скидки), как в их сайдбаре.
 */
export default function ServicesPage({ userName, userLevel, token, onNav, onProfile }) {
  const { t } = useI18n()
  const { items, teacher, ieltsAccount } = useMenuItems(token)
  const [demo, setDemo] = useState(false)
  const [balance, setBalance] = useState(null)
  useEffect(() => {
    const authToken = token || loadToken()
    if (!authToken) return
    let alive = true
    getDemoAccess(authToken).then((d) => {
      if (alive) setDemo(d.isDemo)
    })
    const apply = (b) => {
      if (alive && b) setBalance({ coins: b.coins ?? 0, streak: b.streak ?? 0 })
    }
    getBalance(authToken, apply).then(apply).catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  const name = (userName || '').trim()
  const student = !teacher && !ieltsAccount
  const tiles = serviceItems(items)

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="services" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="svc">
        <button type="button" className="svc-hero" onClick={onProfile}>
          <AssetImage className="svc-hero__mascot" src="/assets/m/services/mascot.webp" alt="" />
          <span className="svc-hero__who">
            <span className="svc-hero__avatar">{name ? name.charAt(0).toUpperCase() : <UserIcon size={28} />}</span>
            <span className="svc-hero__name">
              <b>{name || t('kingdom.profile')}</b>
              {/* Без имени подпись уже наверху — не повторяем «Профиль» над «Профиль», как в сайдбаре. */}
              {name && (
                <span>
                  {t('kingdom.profile')}
                  <ChevronRightIcon size={20} />
                </span>
              )}
            </span>
          </span>
          {student && (
            <span className="svc-hero__chips">
              <span className="svc-chip">
                <i className="svc-chip__ico" aria-hidden="true" />
                {t('home.level.stop', { level: (userLevel || 'A1').toUpperCase() })}
              </span>
              {!demo && balance && (
                <>
                  <span className="svc-chip" title={t('services.streak')}>
                    <img src="/assets/world/streak.svg" alt={t('services.streak')} />
                    {balance.streak}
                  </span>
                  <span className="svc-chip" title={t('services.coins')}>
                    <img src="/assets/world/coin.png" alt={t('services.coins')} />
                    {groupNum(balance.coins)}
                  </span>
                </>
              )}
            </span>
          )}
        </button>

        <div className="svc-head">
          <h1 className="svc-head__title">{t('mtab.services')}</h1>
          <ThemeToggle />
        </div>

        {tiles.length > 0 && (
          <div className="svc-grid">
            {tiles.map(({ key, label, ico }) => {
              const tile = TILE[key] || { bg: '#efe7ff', ico }
              return (
                <button
                  type="button"
                  key={key}
                  className="svc-tile"
                  style={{ '--svc-bg': tile.bg }}
                  onClick={() => onNav?.(key)}
                >
                  <span className="svc-tile__top">
                    <span className="svc-tile__plate">
                      <i style={{ '--svc-ico': `url(/assets/home-v2/ico/${tile.ico}.svg)` }} aria-hidden="true" />
                    </span>
                    <span className="svc-tile__go" aria-hidden="true" />
                  </span>
                  <span className="svc-tile__name">{t(label)}</span>
                </button>
              )
            })}
          </div>
        )}

        {demo && <DemoOfferCard onUse={() => onNav?.('pricing')} />}
      </div>
    </LearningLayout>
  )
}
```

`data-nav` у плиток не ставится: тур «Главной» и Луна берут меню ученика из `.sb__nav [data-nav]` скрытого сайдбара, второй источник того же списка им не нужен. Плитку Луна нажимает по номеру, как любую кнопку.

- [ ] **Step 4: `src/services.css`** (на всех ширинах: на компьютере экран открывается адресом и выглядит обычным экраном кабинета)

```css
/* ======================================================================
   «Сервисы» — пятая вкладка нижней панели телефона (Figma «Mobile», кадр
   6419:6295; спека docs/superpowers/specs/2026-10-26-mobile-app-nav-home-design.md).
   Размеры и цвета сняты с макета. На компьютере экран открывается тем же
   адресом и стоит колонкой 402 — пункта в сайдбаре у него нет, там разделы
   и так видны.
   ====================================================================== */

.svc {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 402px;
  padding: 16px 16px 24px;
}

/* ---------- профиль (ProfileHero 370×144, r28, p16) ---------- */
.svc-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 144px;
  padding: 16px;
  border: 0;
  border-radius: 28px;
  background: linear-gradient(106deg, #7b3fe4 0%, #b37bff 100%);
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
/* Два полупрозрачных круга макета (200 и 120) — под содержимым. */
.svc-hero::before,
.svc-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.svc-hero::before {
  top: -70px;
  left: 210px;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.12);
}
.svc-hero::after {
  top: 100px;
  left: -40px;
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.1);
}
.svc-hero__mascot {
  position: absolute;
  top: 13px;
  left: 194px;
  width: 176px;
  height: 234px;
  object-fit: contain;
  pointer-events: none;
}
.svc-hero__who,
.svc-hero__chips {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}
.svc-hero__who {
  gap: 12px;
  margin-top: 16px;
}
.svc-hero__avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #fff;
  color: #9047ff;
  font-size: 28px;
  line-height: 36px;
  font-weight: 800;
}
.svc-hero__name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.svc-hero__name b {
  font-size: 24px;
  line-height: 32px;
  font-weight: 800;
}
.svc-hero__name span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: #f0e8ff;
}
.svc-hero__chips {
  flex-wrap: wrap;
  gap: 8px;
}
.svc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  color: #fff;
}
.svc-chip img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.svc-chip__ico {
  display: block;
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: url(/assets/home-v2/ico/school.svg) center / contain no-repeat;
  mask: url(/assets/home-v2/ico/school.svg) center / contain no-repeat;
}

/* ---------- заголовок и плитки (Tile 179×128, r28, p16) ---------- */
.svc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
}
.svc-head__title {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 800;
  color: #181818;
}
.svc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}
.svc-tile {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  min-height: 128px;
  padding: 16px;
  border: 0;
  border-radius: 28px;
  background: var(--svc-bg, #efe7ff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
/* Белый круг 112 в правом верхнем углу (45%). */
.svc-tile::before {
  content: '';
  position: absolute;
  top: -36px;
  left: 91px;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}
.svc-tile__top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.svc-tile__plate {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 20px;
  background: #fff;
  color: #7b3fe4;
}
.svc-tile__plate i {
  display: block;
  width: 32px;
  height: 32px;
  background: currentColor;
  -webkit-mask: var(--svc-ico) center / contain no-repeat;
  mask: var(--svc-ico) center / contain no-repeat;
}
.svc-tile__go {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-top: 12px;
  border-radius: 999px;
  background: #181818;
}
.svc-tile__go::before {
  content: '';
  width: 16px;
  height: 16px;
  background: #fff;
  -webkit-mask: url(/assets/home-v2/ico/north_east.svg) center / contain no-repeat;
  mask: url(/assets/home-v2/ico/north_east.svg) center / contain no-repeat;
}
.svc-tile__name {
  position: relative;
  font-size: 16px;
  line-height: 24px;
  font-weight: 800;
  color: #181818;
}
```

В `src/app/layout.jsx` после строки `import '../demo.css'` добавить `import '../services.css'`.

- [ ] **Step 5: Тест проходит**

Run: `npx vitest run src/screens/ServicesPage.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Экран в App.** В `src/App.jsx`:

После `import ProfilePage from './screens/ProfilePage.jsx'` добавить `import ServicesPage from './screens/ServicesPage.jsx'`.

В `handleNav` строку `if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return` заменить на:

```js
    // «Сервисы» — вкладка телефона с профилем: нужна и в тьютор-онли, иначе из панели не попасть в профиль.
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key) && key !== 'services') return
```

и сразу после `if (key === 'home') setScreen('home')` добавить ветку:

```js
    else if (key === 'services') setScreen('services')
```

Перед `    case 'profile':` добавить:

```jsx
    case 'services':
      // Вкладка телефона «Сервисы» (дизайн приложения, спека 2026-10-26): профиль и разделы, не ставшие вкладками.
      return (
        <ServicesPage
          userName={name}
          userLevel={userLevel}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
```

Та же проверка с `TUTOR_ONLY` есть в `handleTutorNav` — заменить её так же (`&& key !== 'services'`).

- [ ] **Step 7: Проверка в браузере.** Записать сервер в `C:/Users/nural/Desktop/jts-web-app/.claude/launch.json` (файл основного дерева читает `preview_start`; если записи нет):

```json
{ "name": "mobile-app-nav", "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", ".claude/worktrees/mobile-app-nav", "run", "dev", "--", "--port", "3117"], "port": 3117 }
```

`preview_start {name: "mobile-app-nav"}` → `resize_window {width: 402, height: 874}` → открыть `/?screen=services` → скриншот рядом со скриншотом кадра `figma_take_screenshot {nodeId: "6419:6295", scale: 1}`. Сверить: отступы 16, плашка 144, плитки 179×128, значки и стрелки. Расхождения правятся в `src/services.css`. `resize_window {preset: "desktop"}` в конце.

- [ ] **Step 8: Commit**

```bash
git add src/screens/ServicesPage.jsx src/screens/ServicesPage.test.jsx src/services.css src/app/layout.jsx src/App.jsx
git commit -m "feat(mobile): экран «Сервисы» по дизайну приложения

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Нижняя панель в оболочках

**Files:**
- Create: `src/components/MobileTabBar.jsx`
- Create: `src/components/MobileTabBar.test.jsx`
- Create: `src/mobile/nav.css`
- Create: `tests/mobile-tabbar.spec.js`
- Modify: `src/components/LearningLayout.jsx`, `src/tutor/TutorShell.jsx`, `src/screens/TutorDashboardPage.jsx`, `src/app/layout.jsx`, `tests/mobile-shell.spec.js`

**Interfaces:**
- Consumes: `useMenuItems`, `mobileTabs`, `tabFor`, ключи `mtab.*`, значки `home`, `auto_stories`, `auto_awesome`, `videocam`, `grid_view`.
- Produces: `<MobileTabBar active token onNav />`, классы `.mtab`, `.mtab__item[data-tab]`, `.is-active`; CSS-переменная `--mtab-h` на `:root` (0px, когда панели нет).

- [ ] **Step 1: Падающий тест компонента**

`src/components/MobileTabBar.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import MobileTabBar from './MobileTabBar.jsx'

function renderBar(props = {}) {
  const onNav = vi.fn()
  const view = render(
    <I18nProvider>
      <MobileTabBar active="home" onNav={onNav} {...props} />
    </I18nProvider>,
  )
  return { ...view, onNav }
}

describe('нижняя панель', () => {
  it('пять вкладок с подписями приложения', () => {
    const { container } = renderBar()
    expect([...container.querySelectorAll('.mtab__label')].map((n) => n.textContent)).toEqual([
      'Главная', 'Практика', 'AI-тьютор', 'Уроки', 'Сервисы',
    ])
  })

  it('раздел из «Сервисов» подсвечивает «Сервисы»', () => {
    const { container } = renderBar({ active: 'vocab' })
    const active = container.querySelector('.mtab__item.is-active')
    expect(active.getAttribute('data-tab')).toBe('services')
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('нажатие ведёт в раздел', () => {
    const { container, onNav } = renderBar()
    fireEvent.click(container.querySelector('[data-tab="practice"]'))
    expect(onNav).toHaveBeenCalledWith('practice')
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/components/MobileTabBar.test.jsx`
Expected: FAIL — `Failed to resolve import "./MobileTabBar.jsx"`.

- [ ] **Step 3: `src/components/MobileTabBar.jsx`**

```jsx
import { useI18n } from '../i18n.jsx'
import { useMenuItems } from './useMenuItems.js'
import { mobileTabs, tabFor } from '../lib/navSections.js'

// Нижняя панель телефона (≤560px) — дизайн мобильного приложения (Figma «Mobile», узел TabBar кадра 6419:6295).
// Заменяет на телефоне бургер и выезжающее меню; планшет и компьютер её не видят (src/mobile/nav.css). Вкладки — из
// того же меню ученика, что сайдбар (lib/navSections.js), поэтому у преподавателя и в тьютор-онли их меньше.
export default function MobileTabBar({ active, token, onNav }) {
  const { t } = useI18n()
  const { items } = useMenuItems(token)
  const current = tabFor(active)
  return (
    <nav className="mtab" aria-label={t('mtab.label')}>
      {mobileTabs(items).map(({ key, label, ico }) => (
        <button
          key={key}
          type="button"
          className={`mtab__item${current === key ? ' is-active' : ''}`}
          data-tab={key}
          aria-current={current === key ? 'page' : undefined}
          onClick={() => onNav?.(key)}
        >
          <span className="mtab__pill">
            <i className="mtab__ico" style={{ '--mtab-ico': `url(/assets/home-v2/ico/${ico}.svg)` }} aria-hidden="true" />
          </span>
          <span className="mtab__label">{t(label)}</span>
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/components/MobileTabBar.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Панель в оболочках.**

`src/components/LearningLayout.jsx`: добавить импорт `import MobileTabBar from './MobileTabBar.jsx'` и между закрывающим `</div>` блока `.learn__body` и `<Footer />` вставить:

```jsx
      {/* Телефон (≤560): вместо бургера шапки — нижняя панель приложения; шапка остаётся для планшета 561–760. */}
      <MobileTabBar active={active} token={token} onNav={onNav} />
```

Обновить комментарий над компонентом: «на десктопе сайдбар слева + контент + подвал; на планшете — верхняя шапка с гамбургером, сайдбар выезжает drawer'ом; на телефоне — нижняя панель вкладок (MobileTabBar), шапки и подвала нет».

`src/tutor/TutorShell.jsx`: импорт `import MobileTabBar from '../components/MobileTabBar.jsx'`; после закрывающего `</div>` блока `.t-body`, перед `<Footer />`:

```jsx
      <MobileTabBar active={active} onNav={onNavigate} />
```

Комментарий над компонентом дополнить: «На телефоне (≤560) шапки нет: внизу панель вкладок, а «Назад» живёт в своей полосе .t-topbar».

`src/screens/TutorDashboardPage.jsx`: импорт `import MobileTabBar from '../components/MobileTabBar.jsx'`; перед `<Footer />` в конце разметки:

```jsx
      <MobileTabBar active="tutor" onNav={onNavigate} />
```

- [ ] **Step 6: `src/mobile/nav.css`**

```css
/* ======================================================================
   Навигация телефона по дизайну приложения (Figma «Mobile», кадр
   «Сервисы» 6419:6295; спека docs/superpowers/specs/2026-10-26-mobile-app-nav-home-design.md).

   До 560px вместо бургера и выезжающего меню — нижняя панель .mtab
   (MobileTabBar) и экран «Сервисы». Планшет 561–760 остаётся с бургером
   (styles.css, .mtop). Сайдбар на телефоне не рисуется, но остаётся в DOM:
   из его data-nav тур «Главной» и Луна берут меню ученика.

   Экраны, где раздел рисует свою полосу во весь экран, панели не получают —
   там и общей шапки не было: урок (.km-lesson), тропа уровня (.km-scroll),
   аудирование (.lt), урок грамматики (.gr-lesson), книжки (.bk), сценарий
   «Ситуаций» (.sit-view). Список — только здесь, в трёх правилах ниже.
   ====================================================================== */

.mtab {
  display: none;
}

@media (max-width: 560px) {
  /* Высота панели — одна переменная на всё: отступ под контентом, кнопка Луны. */
  :root:has(.mtab) {
    --mtab-h: calc(58px + env(safe-area-inset-bottom, 0px));
  }
  :root:has(.km-lesson, .km-scroll, .lt, .gr-lesson, .bk, .sit-view) {
    --mtab-h: 0px;
  }

  .mtop,
  .learn > .footer,
  .t-app > .footer,
  .learn__body > .sb,
  .t-body > .sb,
  .sb-overlay {
    display: none;
  }

  /* ---------- панель: 58 + полоска айфона, сверху линия #ececf1 ---------- */
  .mtab {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: flex;
    justify-content: space-between;
    padding: 4px 8px calc(4px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid #ececf1;
    background: #fff;
  }
  :root:has(.km-lesson, .km-scroll, .lt, .gr-lesson, .bk, .sit-view) .mtab {
    display: none;
  }
  .mtab__item {
    display: flex;
    flex: 0 0 70px;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0;
    border: 0;
    background: none;
    color: #8e8e99;
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .mtab__pill {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 30px;
    border-radius: 999px;
  }
  .mtab__ico {
    display: block;
    width: 24px;
    height: 24px;
    background: currentColor;
    -webkit-mask: var(--mtab-ico) center / contain no-repeat;
    mask: var(--mtab-ico) center / contain no-repeat;
  }
  .mtab__label {
    font-size: 10.5px;
    line-height: 14px;
    font-weight: 500;
    white-space: nowrap;
  }
  .mtab__item.is-active {
    color: #9047ff;
  }
  .mtab__item.is-active .mtab__pill {
    background: #efe7ff;
  }
  .mtab__item.is-active .mtab__label {
    font-weight: 700;
  }

  /* Контент не уходит под панель; высота экрана — без шапки и подвала, которых на телефоне нет. */
  .learn,
  .t-app {
    padding-bottom: var(--mtab-h, 0px);
  }
  .learn__main,
  .t-main {
    min-height: calc(100dvh - var(--mtab-h, 0px));
  }

  /* ---------- кнопки угла: «?», колокольчик, язык ----------
     Раньше они жили в правом слоте шапки. Теперь — ряд справа вверху экрана,
     круглые 40 белые с рамкой (IconButton макета; тот же вид, что в углу
     «Главной» на компьютере). Там, где своя полоса раздела, их нет, как не было
     и шапки. */
  .learn__bell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px 0;
  }
  :root:has(.km-lesson, .km-scroll, .lt, .gr-lesson, .bk, .sit-view) .learn__bell,
  .learn__main:has(.cp) .learn__bell {
    display: none;
  }
  .learn__bell > .tour-help {
    order: 1;
  }
  .learn__bell > .nbell {
    order: 2;
  }
  .learn__bell > :not(.tour-help):not(.nbell) {
    order: 3;
  }
  .learn__bell .tour-help,
  .learn__bell .nbell__btn {
    width: 40px;
    height: 40px;
    border: 1px solid #ececf1;
    border-radius: 50%;
    background: #fff;
    color: #181818;
  }

  /* «Назад» тьютора — его полоса: правого слота шапки больше нет. */
  .t-topbar {
    display: flex;
    height: 56px;
    padding: 0 16px;
  }

  /* Луна над панелью; там, где панели нет, — прежнее место над кнопкой шага урока (assistant.css). */
  :root:has(.mtab):not(:has(.km-lesson, .km-scroll, .lt, .gr-lesson, .bk, .sit-view)) .asst__launcher {
    bottom: calc(var(--mtab-h) + 16px);
  }
  :root:has(.mtab):not(:has(.km-lesson, .km-scroll, .lt, .gr-lesson, .bk, .sit-view)) .asst__hint {
    bottom: calc(var(--mtab-h) + 16px + 28px);
  }
  :root:has(.mtab):not(:has(.km-lesson, .km-scroll, .lt, .gr-lesson, .bk, .sit-view)) .asst__badge {
    bottom: calc(var(--mtab-h) + 16px + 56px + 20px);
  }
}
```

В `src/app/layout.jsx` после `import '../mobile/home.css'` добавить `import '../mobile/nav.css'`.

- [ ] **Step 7: e2e панели**

`tests/mobile-tabbar.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Телефон по дизайну приложения (спека 2026-10-26): до 560px вместо бургера нижняя панель из пяти вкладок и экран
// «Сервисы». Планшет 561–760 — прежний бургер (mobile-shell.spec.js), компьютер — сайдбар.
test.describe('нижняя панель — телефон', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 560, 'только телефон')

  for (const screen of ['home', 'practice', 'tutor-dashboard', 'lessons', 'vocab', 'services']) {
    test(`${screen}: панель видна, бургера и сайдбара нет`, async ({ page }) => {
      await page.goto(`/?screen=${screen}`)
      await expect(page.locator('.mtab')).toBeVisible()
      await expect(page.locator('.mtab__item')).toHaveCount(5)
      await expect(page.locator('.mtop')).toBeHidden()
      await expect(page.locator('.sb')).toBeHidden()
    })
  }

  test('горит вкладка своего раздела, Словарь — внутри «Сервисов»', async ({ page }) => {
    await page.goto('/?screen=practice')
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'practice')
    await page.goto('/?screen=vocab')
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'services')
  })

  test('вкладки ведут в разделы, «Сервисы» — к плиткам', async ({ page }) => {
    await page.goto('/?screen=home')
    await page.locator('.mtab [data-tab="practice"]').click()
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'practice')
    await page.locator('.mtab [data-tab="services"]').click()
    await expect(page.locator('.svc-grid')).toBeVisible()
    await page.locator('.svc-tile', { hasText: 'Словарь' }).click()
    await expect(page.locator('.vc')).toBeVisible({ timeout: 10_000 })
  })

  test('контент не уходит под панель', async ({ page }) => {
    await page.goto('/?screen=services')
    await expect(page.locator('.mtab')).toBeVisible()
    const pad = await page.locator('.learn').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
    expect(pad).toBeGreaterThanOrEqual(58)
  })
})

test.describe('нижняя панель — компьютер', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 560, 'только широкий экран')

  test('панели нет, сайдбар на месте', async ({ page }) => {
    await page.goto('/?screen=home')
    await expect(page.locator('.mtab')).toBeHidden()
    await expect(page.locator('.sb')).toBeInViewport()
  })
})
```

- [ ] **Step 8: Контракт бургера — на планшет.** В `tests/mobile-shell.spec.js` describe `'адаптивная оболочка — мобилка'` переименовать в `'адаптивная оболочка — планшет (561–760, бургер)'`, его строку `test.skip(…)` заменить на:

```js
  // До 560px вместо бургера нижняя панель (mobile-tabbar.spec.js); бургер и drawer остались планшету.
  test.use({ viewport: { width: 700, height: 900 } })
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'одного прогона на 700 достаточно')
  })
```

Шапку файла дополнить строкой «мобилка до 560px — см. mobile-tabbar.spec.js». В тесте клика по затемнению `position: { x: 375, y: 400 }` заменить на `{ x: 650, y: 400 }` (drawer 320px, затемнение справа). Тест «контент экрана виден и не перекрыт сайдбаром» оставить в том же describe.

- [ ] **Step 9: Прогон**

```bash
npx vitest run src/components src/lib/navSections.test.js
E2E_PORT=3117 npx playwright test --config "$SCRATCH/pw.config.mjs" tests/mobile-tabbar.spec.js tests/mobile-shell.spec.js
```
Expected: vitest PASS; e2e PASS на обоих проектах.

- [ ] **Step 10: Глазами.** Превью `mobile-app-nav`, `resize_window {width: 402, height: 874}`: `/?screen=home`, `/?screen=practice`, `/?screen=tutor-dashboard`, `/?screen=lessons` — скриншоты панели рядом с `figma_take_screenshot {nodeId: "6419:6295"}` (узел TabBar внизу кадра). Сверить плашку выбранной вкладки 52×30, подписи 10.5, линию сверху. Затем `resize_window {width: 700, height: 900}` — бургер на месте, панели нет. `resize_window {preset: "desktop"}`.

- [ ] **Step 11: Commit**

```bash
git add src/components/MobileTabBar.jsx src/components/MobileTabBar.test.jsx src/mobile/nav.css src/components/LearningLayout.jsx src/tutor/TutorShell.jsx src/screens/TutorDashboardPage.jsx src/app/layout.jsx tests/mobile-tabbar.spec.js tests/mobile-shell.spec.js
git commit -m "feat(mobile): нижняя панель приложения вместо бургера до 560px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Весь телефон на Manrope

**Files:**
- Modify: `src/mobile/base.css`, `src/mobile/home.css` (правило `.hm` и `.hm-temper`), `src/mobile/tutor.css:944`, `src/placement.css:317`, `src/kk-font.css`, `src/kkFont.test.js`
- Modify (только комментарии): `src/practice/{grammar-games,numbers,prepositions,speed-reading}/styles.js`, `src/screens/{CartoonsPage,GrammarGamesPage,PrepositionsPage,SpeedReadingPage}.jsx`, `src/feedback.css:5`

- [ ] **Step 1: Тест kk падает на новом правиле.** В `src/kkFont.test.js` в `COVERED` удалить строку `'mobile/home.css | .hm': …` и добавить:

```js
  'mobile/base.css | .screen': "html[data-ui-lang='kk'] .screen",
```

Run: `npx vitest run src/kkFont.test.js`
Expected: FAIL в «каждая явная гарнитура перекрыта в kk-font.css» с `missing: ['mobile/home.css | .hm']` — правило `.hm` ещё на месте, а из списка оно уже убрано.

- [ ] **Step 2: `src/mobile/base.css`.** Блок с комментарием «Весь мобильный макет на PT Root UI…» и правилом `body` заменить на:

```css
/* Весь телефон на Manrope — как мобильное приложение (Figma «Mobile», решение владельца 26.10.2026). До этого
   мобильный слой был на PT Root UI по макету «Web Адаптивка». Экраны .screen (приветствие, приглашение, старый
   тест) на компьютере остаются на PT Root UI (styles.css) — поэтому @font-face выше не удаляем, а здесь
   перекрываем и их: на одном устройстве шрифт между экранами не меняется. */
@media (max-width: 560px) {
  body {
    font-family: Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .screen {
    font-family: Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

Шапку файла поправить: «Мобильный слой (дизайн мобильного приложения, Figma «Mobile», кадры 402px; раньше — «Web Адаптивка», 440px)».

- [ ] **Step 3: Точечные PT Root UI.** В `src/mobile/home.css` удалить строку `font-family: Manrope, …` из правила `.hm` (тело наследует Manrope) и в `.hm-temper` заменить `'PT Root UI', Manrope, system-ui, sans-serif` на `Manrope, system-ui, sans-serif`. То же значение — в `src/mobile/tutor.css` (`.t-tour--coach`, строка ~944) и `src/placement.css` (`.pl-speak`, строка ~317). В `src/kk-font.css` удалить строки

```css
/* «Главная» на телефоне — Manrope поверх PT Root UI мобильного слоя */
html[data-ui-lang='kk'] .hm,
```

и комментарий `/* Вход и регистрация v2 — Manrope поверх PT Root UI мобильного слоя */` сменить на `/* Вход и регистрация v2 — своя гарнитура под .rg */`.

- [ ] **Step 4: Комментарии про «на телефоне PT Root UI».**

```bash
sed -i 's/Manrope, на телефоне PT Root UI, в kk — Inter/Manrope, в kk — Inter/; s/(Manrope, на телефоне PT Root UI, в казахском — Inter)/(Manrope, в казахском — Inter)/; s/Manrope, на телефоне PT Root UI,/Manrope,/' \
  src/practice/grammar-games/styles.js src/practice/grammar-games/styles.test.js src/practice/numbers/styles.js \
  src/practice/prepositions/styles.js src/practice/speed-reading/styles.js src/practice/speed-reading/styles.test.js \
  src/screens/CartoonsPage.jsx src/screens/GrammarGamesPage.jsx src/screens/PrepositionsPage.jsx src/screens/SpeedReadingPage.jsx
grep -rn "на телефоне PT Root UI" src
```
Expected: grep пуст. В `src/feedback.css:5` «(Manrope на десктопе, PT Root UI в мобильном слое)» → «(Manrope)».

- [ ] **Step 5: Тесты зелёные**

Run: `npx vitest run src/kkFont.test.js src/practice`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat(mobile): весь телефон на Manrope, как приложение

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: «Главная» — разметка телефонного варианта

**Files:**
- Modify: `src/screens/HomePage.jsx`
- Modify: `src/demo.css` (элементы только для телефона скрыты по умолчанию)
- Test: `src/screens/HomePage.test.jsx`, `src/screens/HomePage.ge.test.jsx`

**Interfaces:**
- Consumes: ключи `home.level.goalEdit`, `home.schedule.freeSub`, `home.homework.all`, `geStart.test.cta`, `schedule.today`, `schedule.tomorrow`; `dayLabelKey` из `./schedule/lessonFormat.js`; значки `videocam`, `assignment`, `event`; медаль `/assets/m/home/medal.webp`.
- Produces: классы `.hm-level--phone`, `.hm-level--unknown`, `.hm-level__medal-m`, `.hm-level__flag`, `.hm-level__edit`, `.hm-level__test`, `.hm-level__lbl[data-short]`, `.hm-plate`, `.hm-matching`, `.hm-sched__week`, `.hm-sched__wday(.is-picked,.is-busy)`, `.hm-sched__day.is-picked`, `.hm-sched__when`, `.hm-card__all`, `.hm-skills--empty`, `.hm-skill__fill.is-bad`, `.hm-skills__sum`.

- [ ] **Step 1: Падающие тесты.** В конец `src/screens/HomePage.test.jsx` добавить:

```jsx
// Телефон по дизайну приложения (спека 2026-10-26): разметка общая с компьютером, телефонные элементы скрыты CSS.
describe('«Главная» телефона', () => {
  it('без теста — карточка уровня телефона с «?» и кнопкой теста', () => {
    const onStartLevelTest = vi.fn()
    const { container } = renderHome({ levelUnknown: true, onStartLevelTest })
    const card = container.querySelector('.hm-level--phone')
    expect(card).not.toBeNull()
    expect(card.querySelector('.hm-level__name').textContent).toBe('?')
    fireEvent.click(within(card).getByRole('button', { name: 'Пройти тест уровня' }))
    expect(onStartLevelTest).toHaveBeenCalledTimes(1)
  })

  it('подписи ступеней для телефона — коды уровней', () => {
    const { container } = renderHome()
    expect([...container.querySelectorAll('.hm-level__lbl[data-short]')].map((n) => n.dataset.short)).toEqual(['B2', 'C1', 'Финиш'])
  })

  it('строка цели — с «Изменить», открывает выбор цели', () => {
    const { container } = renderHome()
    const goal = container.querySelector('.hm-level__goal')
    expect(goal.textContent).toContain('Изменить')
    fireEvent.click(goal)
    expect(screen.getByText('Ваша цель')).toBeTruthy()
  })

  it('расписание: семь дней, точка у дня с уроком, нажатие выбирает день', async () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    const pad = (n) => String(n).padStart(2, '0')
    occurrences.value = [{
      lessonId: 7, teacherName: 'Айгерим', durationMinutes: 60,
      scheduledAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00:00`,
    }]
    const { container } = renderHome({ token: 'T', isDemoAccount: false })
    await waitFor(() => expect(container.querySelectorAll('.hm-sched__wday.is-busy')).toHaveLength(1))
    const days = [...container.querySelectorAll('.hm-sched__wday')]
    expect(days).toHaveLength(7)
    expect(days[0].classList.contains('is-picked')).toBe(true)
    expect(days[1].classList.contains('is-busy')).toBe(true)
    fireEvent.click(days[1])
    const picked = container.querySelector('.hm-sched__day.is-picked')
    expect(picked.textContent).toContain('Айгерим')
    expect(picked.querySelector('.hm-sched__when').textContent).toBe('Завтра · ')
    occurrences.value = []
  })

  it('домашка: «Все» ведёт в раздел', async () => {
    homework.value = [{ id: 1, title: 'Present Perfect', status: 'ASSIGNED' }]
    const onNav = vi.fn()
    const { container } = renderHome({ token: 'T', isDemoAccount: false, onNav })
    await screen.findByText('Present Perfect')
    fireEvent.click(container.querySelector('.hm-hw .hm-card__all'))
    expect(onNav).toHaveBeenCalledWith('homework')
    homework.value = []
  })

  it('навыки: ниже 45% — красная полоса, под строками одна строка вывода', () => {
    const { container } = renderHome()
    const bad = [...container.querySelectorAll('.hm-skill__fill.is-bad')]
    expect(bad.length).toBeGreaterThan(0)
    expect(container.querySelector('.hm-skills__sum').textContent).toBe('Сильнее всего — Говорение · Стоит подтянуть — Письмо')
  })
})
```

Импорт `within` добавить в строку импорта `@testing-library/react`.

В том же файле в тесте «без пройденного теста вместо уровня — приглашение на тест» строку `expect(container.querySelector('.hm-level')).toBeNull()` заменить на:

```jsx
    // На компьютере карточки уровня нет; телефонная (скрыта на компьютере CSS) — с «?» и кнопкой теста.
    expect(container.querySelector('.hm-level:not(.hm-level--phone)')).toBeNull()
```

В `src/screens/HomePage.ge.test.jsx` обе строки `expect(document.querySelector('.hm-level')).toBe(null)` (строки ~79 и ~205) заменить на:

```jsx
      expect(document.querySelector('.hm-level:not(.hm-level--phone)')).toBe(null)
      // телефон: карточка уровня замещает скрытый там блок GE (дизайн приложения)
      expect(document.querySelector('.hm-level--phone')).toBeTruthy()
```

Run: `npx vitest run src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx`
Expected: FAIL — нет `.hm-level--phone`, `.hm-sched__wday`, `.hm-card__all`, `.hm-skills__sum`.

- [ ] **Step 2: Импорт и плашка.** В `src/screens/HomePage.jsx` строку импорта `parseLessonDate, lessonTimeRange` заменить на `import { parseLessonDate, lessonTimeRange, dayLabelKey } from './schedule/lessonFormat.js'`. После функции `ChevronIcon` добавить:

```jsx
// Плашка со значком — только телефон (дизайн приложения): строки расписания, домашки и пробного урока начинаются с
// неё. На компьютере скрыта (demo.css), значок — маской из public/assets/home-v2/ico.
function Plate({ ico }) {
  return <span className="hm-plate" style={{ '--hm-ico': `url(/assets/home-v2/ico/${ico}.svg)` }} aria-hidden="true" />
}

/** «Сегодня» / «Завтра» / «8 августа» — день урока в строке расписания телефона. */
function dayWord(date, locale, t) {
  const key = dayLabelKey(date)
  return key ? t(`schedule.${key}`) : date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}
```

- [ ] **Step 3: Тур — видимая цель на любой ширине.** В `tourSteps` селекторы `top` для GE сделать списками (тур берёт видимый элемент из списка):

```js
    const top =
      geTop === 'goal'
        ? { selector: ['.ge-goal', '.hm-level--phone'], title: t('tour.home.progress.title'), text: t('tour.home.progress.text') }
        : geTop === 'locked'
          ? { selector: ['.ge-locked', '.hm-level--phone'], title: t('tour.home.locked.title'), text: t('tour.home.locked.text') }
          : geMode
            ? { selector: ['.ge-invite', '.hm-level--phone'], title: t('tour.home.invite.title'), text: t('tour.home.invite.text') }
            : { selector: '.hm-level', title: t('tour.home.progress.title'), text: t('tour.home.progress.text') }
```

а последний шаг:

```js
      // Разделы: на компьютере и планшете — сайдбар, на телефоне — нижняя панель (кадр 6856:12612).
      { selector: ['.sb', '.mtab'], optional: true, title: t('tour.home.sections.title'), content: <TourSections />, width: 520 },
```

- [ ] **Step 4: Карточка уровня — общая функция с телефонным вариантом.** Перед `return (` компонента добавить:

```jsx
  // Карточка уровня. На компьютере — только у прежней «Главной» с известным уровнем. На телефоне (дизайн приложения,
  // кадр 6125:6209) — всегда: у ученика с анкетой GE и без теста она замещает блок цели, баннер маршрута и заглушку,
  // скрытые там (src/mobile/home.css). Такой экземпляр помечен hm-level--phone и на компьютере скрыт (demo.css).
  const openGoal = () => (geMode ? onGeEdit?.() : setGoalOpen(true))
  const renderLevel = (phoneOnly) => {
    const unknown = levelUnknown
    const stops = unknown ? [] : track.stops
    return (
      <section className={`hm-level hm-level--${unknown ? 'unknown' : track.mode}${phoneOnly ? ' hm-level--phone' : ''}`}>
        {/* Медаль телефона — справа вверху, обрезана краем карточки. На компьютере медаль внутри кнопки цели. */}
        {!reached && <AssetImage className="hm-level__medal-m" src="/assets/m/home/medal.webp" alt="" loading="lazy" />}
        <div className="hm-level__body">
          <span className="hm-level__label">{t(reached ? 'home.level.labelReached' : 'home.level.label')}</span>
          <div className="hm-level__head">
            <h1 className="hm-level__name">{unknown ? '?' : `${summary.level} · ${levelName}`}</h1>
            {!unknown && !reached && week > 0 && (
              <span className="hm-level__week">
                <TrendIcon up />
                {t('home.level.week', { n: String(week) })}
              </span>
            )}
          </div>

          {/* Дорожка «Старт → ступени → Финиш» (см. прежний комментарий). На телефоне подписи — коды уровней из
              data-short: полные «Уровень B2 · Финиш · C1» в 370 не помещаются. */}
          <div className={`hm-level__track${track.short ? ' is-short' : ''}`}>
            <span className="hm-level__stop hm-level__stop--now">
              <i className="hm-level__dot" aria-hidden="true" />
              <span className="hm-level__lbl">{t('home.level.start')}</span>
            </span>
            {[...stops, null].map((code, i) => (
              <Fragment key={code || 'finish'}>
                <span className="hm-level__seg">
                  {i === 0 && !unknown && !reached && summary.percent !== null && (
                    <i className="hm-level__fill" style={{ width: `${summary.percent}%` }} />
                  )}
                </span>
                {code ? (
                  <span className="hm-level__stop">
                    <FlagIcon />
                    <span className="hm-level__lbl" data-short={code}>
                      {track.short ? code : t('home.level.stop', { level: code })}
                    </span>
                  </span>
                ) : (
                  <span className="hm-level__stop hm-level__stop--finish">
                    <FinishIcon />
                    <span className="hm-level__lbl" data-short={t('home.level.finish')}>
                      {!unknown && track.finish ? t('home.level.finishAt', { level: track.finish }) : t('home.level.finish')}
                    </span>
                  </span>
                )}
              </Fragment>
            ))}
          </div>

          {reached && (
            <button type="button" className="hm-level__buy" onClick={() => onOpenPricing?.()}>
              {t('home.level.buy')}
              <ChevronIcon />
            </button>
          )}
          {!unknown && (reached
            ? <p className="hm-level__plan">{t('home.level.reached')}</p>
            : planLine && <p className="hm-level__plan">{planLine}</p>)}
        </div>

        {/* Без теста цели нет — вместо строки цели зовём на тест (отступление 1 спеки: на телефоне баннер маршрута
            скрыт, и начать тест иначе негде). */}
        {unknown ? (
          <button type="button" className="hm-level__test" onClick={() => (geMode ? onGeStart?.() : onStartLevelTest?.())}>
            {t('geStart.test.cta')}
          </button>
        ) : reached ? (
          <AssetImage className="hm-level__trophy" src="/assets/m/home/trophy.webp" alt="" />
        ) : track.goal && (options.length ? (
          <button type="button" className="hm-level__goal" title={t('home.goal.change')} onClick={openGoal}>
            <AssetImage className="hm-level__medal" src="/assets/medal-goal.png" alt="" />
            <i className="hm-level__flag" aria-hidden="true" />
            <span>{t('home.level.goal', { level: track.goal })}</span>
            <b className="hm-level__edit">{t('home.level.goalEdit')}</b>
          </button>
        ) : (
          <div className="hm-level__goal">
            <AssetImage className="hm-level__medal" src="/assets/medal-goal.png" alt="" />
            <i className="hm-level__flag" aria-hidden="true" />
            <span>{t('home.level.goal', { level: track.goal })}</span>
          </div>
        ))}
      </section>
    )
  }
```

Блок верхней карточки в разметке — от `{ieltsAccount ? (` до закрывающего `)}` перед `<div className="hm-grid">` — заменить на:

```jsx
        {ieltsAccount ? (
          <IeltsHomeCard token={token} onNav={onNav} />
        ) : !geLoaded ? (
          // профиль анкеты ещё в пути: заглушка вместо прежней карточки уровня, иначе она мелькала до блока цели
          <section className="hm-card ge-skel" aria-busy="true" aria-label={t('gePlan.loading')} />
        ) : (
          <>
            {geTop === 'goal' ? (
              // Под дорожкой у макета только «Как дойти до цели»: строки «ещё N материалов» и «+N% за неделю» он убрал.
              <GeGoalBanner
                profile={geProfile}
                option={geOption}
                planLine={null}
                week={0}
                onEdit={() => onGeEdit?.()}
                onOpenRoute={() => onGeRoute?.()}
                onBuy={() => onOpenPricing?.()}
              />
            ) : geMode ? (
              <GeStartHero state={geTop} onStart={onGeStart} onTest={onGeTest} onRoute={onGeRoute} />
            ) : levelUnknown ? (
              <section className="hm-card hm-placement">
                <h1 className="hm-placement__title">{t('home.level.unknown.title')}</h1>
                <p className="hm-placement__sub">{t('home.level.unknown.sub')}</p>
                <button type="button" className="hm-placement__cta" onClick={() => onStartLevelTest?.()}>
                  {t('test.start')}
                </button>
              </section>
            ) : null}
            {renderLevel(geMode || levelUnknown)}
          </>
        )}
```

Обёртку панели подбора: `<TeacherMatchingPanel token={token} compact onOpen={() => onNav?.('lessons')} />` заменить на

```jsx
        {/* Обёртка — чтобы спрятать панель на телефоне (её классы — CSS-модуль); на компьютере display: contents. */}
        <div className="hm-matching">
          <TeacherMatchingPanel token={token} compact onOpen={() => onNav?.('lessons')} />
        </div>
```

- [ ] **Step 5: Расписание — полоса дней.** В `ScheduleCard` после `const days = useMemo(…)` добавить состояние и заменить разметку:

```jsx
  // Телефон (дизайн приложения): полоса из семи дней, под ней уроки одного выбранного дня — по умолчанию сегодня.
  // На компьютере полосы нет, а список показывает все семь дней, как раньше.
  const [picked, setPicked] = useState(0)

  return (
    <section className="hm-card hm-sched">
      <h2 className="hm-card__title">{t('home.schedule.title')}</h2>
      <div className="hm-sched__week">
        {days.map(({ date, items }, i) => (
          <button
            type="button"
            key={date.toISOString()}
            className={`hm-sched__wday${i === picked ? ' is-picked' : ''}${items.length ? ' is-busy' : ''}`}
            aria-pressed={i === picked}
            onClick={() => setPicked(i)}
          >
            <b>{date.getDate()}</b>
            <i>{date.toLocaleDateString(locale, { weekday: 'short' })}</i>
          </button>
        ))}
      </div>
      <ul className="hm-sched__list">
        {days.map(({ date, items }, i) => (
          <li className={`hm-sched__day${i === picked ? ' is-picked' : ''}`} key={date.toISOString()}>
            {/* Сегодня — первая строка: на телефоне по макету её число в красной плашке, чтобы неделя читалась от «сейчас». */}
            <span className={`hm-sched__date${items.length ? ' is-busy' : ''}${i === 0 ? ' is-today' : ''}`}>
              <b>{date.getDate()}</b>
              <i>{date.toLocaleDateString(locale, { weekday: 'short' })}</i>
            </span>
            {items.length === 0 ? (
              <span className="hm-sched__empty">
                <Plate ico="event" />
                <span>{t('home.schedule.free')}</span>
                <small>{t('home.schedule.freeSub')}</small>
              </span>
            ) : (
              <span className="hm-sched__items">
                {items.map((o) => (
                  <button
                    type="button"
                    className="hm-sched__item"
                    key={o.lessonId}
                    onClick={() => onOpenLesson?.(o.lessonId)}
                  >
                    <Plate ico="videocam" />
                    <b>{o.teacherName || t('home.schedule.lesson')}</b>
                    <i>
                      <span className="hm-sched__when">{dayWord(date, locale, t)} · </span>
                      {lessonTimeRange(o, lang === 'kk' ? 'kk' : 'ru')}
                    </i>
                    <span className="hm-sched__chev" aria-hidden="true"><ChevronIcon /></span>
                  </button>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="hm-card__more" onClick={() => onNav?.('lessons')}>
        {t('home.schedule.all')}
      </button>
    </section>
  )
```

- [ ] **Step 6: Домашка, пробный урок, навыки.**

`HomeworkCard`: после `<h2 className="hm-card__title">{t('home.homework.title')}</h2>` добавить

```jsx
      {/* «Все ›» в заголовке — телефон (макет приложения); на компьютере раздел открывается из меню. */}
      <button type="button" className="hm-card__all" onClick={() => onNav?.('homework')}>
        {t('home.homework.all')}
      </button>
```

и первым ребёнком кнопки `.hm-hw__item` — `<Plate ico="assignment" />`.

`TrialCard`: первым ребёнком `<section className="hm-card hm-trial">` — `<Plate ico="videocam" />`.

`SkillsCard`: `className="hm-card hm-skills"` заменить на

```jsx
    <section className={`hm-card hm-skills${!hasData && !levelUnknown ? ' hm-skills--empty' : ''}`}>
```

класс полосы — на

```jsx
              {percent != null && (
                <i
                  // Красная ступень ниже 45% — только телефон (макет приложения); на компьютере полоса оранжевая.
                  className={`hm-skill__fill hm-skill__fill--${band(percent)}${percent < 45 ? ' is-bad' : ''}`}
                  style={{ width: `${percent}%` }}
                />
              )}
```

и сразу после закрывающего `</div>` блока `.hm-skills__tags` (внутри ветки `hasData ? (…)`) обернуть ветку во фрагмент и добавить строку вывода:

```jsx
      {hasData ? (
        <>
          <div className="hm-skills__tags">
            {/* … прежние две плашки без изменений … */}
          </div>
          {/* Телефон: одна строка вместо двух плашек (кадр 6125:6209). */}
          <p className="hm-skills__sum">
            <i className="hm-skills__sumIco" aria-hidden="true" />
            <span>
              {[
                summary.strongest && t('home.skills.best', { skill: t(`profile.skills.${summary.strongest.skill}`) }),
                summary.weakest && t('home.skills.worst', { skill: t(`profile.skills.${summary.weakest.skill}`) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </>
      ) : (
```

- [ ] **Step 7: Телефонные элементы скрыты на компьютере.** В `src/demo.css` после блока токенов `.hm--v2 { … gap: 24px; }` добавить:

```css
/* Элементы «Главной» только для телефона (дизайн приложения, src/mobile/home.css): на планшете и компьютере их нет.
   Обёртка панели подбора преподавателя растворяется — она нужна только чтобы спрятать панель на телефоне. */
.hm-level--phone,
.hm-level__medal-m,
.hm-level__flag,
.hm-level__edit,
.hm-plate,
.hm-sched__week,
.hm-sched__when,
.hm-sched__empty small,
.hm-card__all,
.hm-skills__sum {
  display: none;
}
.hm-matching {
  display: contents;
}
```

- [ ] **Step 8: Тесты проходят**

Run: `npx vitest run src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx src/screens/HomePage.goal.test.jsx`
Expected: PASS. Если `HomePage.goal.test.jsx` краснеет на `getByText` из-за второго экземпляра текста — сузить запрос `within(document.querySelector('.hm-level:not(.hm-level--phone)'))`, не меняя смысла проверки.

- [ ] **Step 9: Компьютер не изменился.** Превью 1440×900, `/?screen=home` — скриншот. Эталон — тот же адрес и размер на `https://dev-tutor.justtostudy.kz/?screen=home` (там `develop` без этих правок) в соседней вкладке. Расхождений быть не должно: новые элементы на компьютере скрыты.

- [ ] **Step 10: Commit**

```bash
git add src/screens/HomePage.jsx src/screens/HomePage.test.jsx src/screens/HomePage.ge.test.jsx src/demo.css
git commit -m "feat(home): разметка «Главной» телефона по дизайну приложения

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: «Главная» — стили телефона

**Files:**
- Modify (переписать целиком, кроме блоков `.ge-task…` и `.hm-temper` в конце): `src/mobile/home.css`

**Interfaces:**
- Consumes: классы из Task 6; значки `milestone`, `finish`, `flag`, `trending_up`, `insights`, `chevron_right`; `--mtab-h` не нужен.

- [ ] **Step 1: Новый `src/mobile/home.css`.** Заменить всё до комментария `/* «Сегодня» плана по дням (спека 2026-10-13)…` (строка ~548) на:

```css
/* ======================================================================
   «Главная» на телефоне — дизайн мобильного приложения (Figma «Mobile»,
   кадр «Главная · с данными» 6125:6209; пустые состояния 6135:11558 и
   6135:11595; пробный урок — фрейм Trial в 6856:12401). Спека —
   docs/superpowers/specs/2026-10-26-mobile-app-nav-home-design.md.

   Строго по макету (решение владельца 26.10.2026): на телефоне шесть блоков
   по порядку макета, остальное, что «Главная» показывает на компьютере,
   скрыто. Разметка общая (HomePage.jsx); элементы только для телефона по
   умолчанию скрыты в demo.css.
   ====================================================================== */

@media (max-width: 560px) {
  .learn__main:has(.hm--v2) {
    background: #f8f8f8;
  }
  .hm--v2 {
    gap: 16px;
    padding: 0 16px 24px;
  }
  /* Колонки компьютера растворяются: порядок блоков — макета, а не разметки. */
  .hm-grid,
  .hm-grid__main,
  .hm-grid__side {
    display: contents;
  }

  /* ---------- заголовок «Главная» 32 и кнопки угла справа ---------- */
  .hm-top {
    display: flex;
    order: 0;
    min-height: 52px;
    padding: 4px 160px 0 0;
  }
  .hm-top__title {
    font-size: 32px;
    line-height: 44px;
    font-weight: 800;
    color: #181818;
  }
  .learn__main:has(.hm--v2) .learn__bell {
    position: absolute;
    top: 10px;
    right: 16px;
    z-index: 5;
    padding: 0;
  }

  .ge-skel,
  .hm-level {
    order: 1;
  }
  .hm-trial {
    order: 2;
  }
  .hm-skills {
    order: 3;
  }
  .hm-prac {
    order: 4;
  }
  .hm-sched {
    order: 5;
  }
  .hm-hw {
    order: 6;
  }

  /* На телефоне только блоки макета (решение владельца 26.10.2026). */
  .hm .dm-banner,
  .hm-matching,
  .hm .hm-report,
  .hm .ge-goal,
  .hm .ge-start,
  .hm .hm-placement,
  .hm .ge-today,
  .hm .hm-start,
  .hm .hm-recommend,
  .hm .pl-report,
  .hm .pl-next {
    display: none;
  }

  /* ---------- общая карточка: белая, r24, рамка #ececf1, p16 ---------- */
  .hm-card {
    position: relative;
    padding: 16px;
    border: 1px solid #ececf1;
    border-radius: 24px;
    background: #fff;
    box-shadow: none;
  }
  .hm-card__title {
    margin: 0 0 12px;
    font-size: 17px;
    line-height: 23px;
    font-weight: 700;
    letter-spacing: 0;
    color: #181818;
  }
  .hm-card__sub {
    display: none;
  }
  /* «Всё расписание ›» и «Все ›» — справа в строке заголовка. */
  .hm-card__more,
  .hm-card__all {
    position: absolute;
    top: 19px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font-family: inherit;
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: #9047ff;
    cursor: pointer;
  }
  .hm-card__more::after,
  .hm-card__all::after {
    content: '';
    width: 16px;
    height: 16px;
    background: currentColor;
    -webkit-mask: url(/assets/home-v2/ico/chevron_right.svg) center / contain no-repeat;
    mask: url(/assets/home-v2/ico/chevron_right.svg) center / contain no-repeat;
  }

  /* ---------- плашка со значком 40 r12 ---------- */
  .hm-plate {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #efe7ff;
    color: #9047ff;
  }
  .hm-plate::before {
    content: '';
    width: 20px;
    height: 20px;
    background: currentColor;
    -webkit-mask: var(--hm-ico) center / contain no-repeat;
    mask: var(--hm-ico) center / contain no-repeat;
  }

  /* ---------- карточка уровня (Container 370×228, r28, p20/16) ---------- */
  .hm-level {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 16px;
    border-radius: 28px;
    background: linear-gradient(250deg, #6d28d9 0%, #a06bff 100%);
    color: #fff;
  }
  .hm-level__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hm-level__label {
    font-size: 11px;
    line-height: 15px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
  }
  .hm-level__head {
    margin: -12px 0 0;
  }
  .hm-level__name {
    margin: 0;
    padding-right: 100px;
    font-size: 28px;
    line-height: 38px;
    font-weight: 800;
    color: #fff;
  }
  .hm-level__week,
  .hm-level__plan,
  .hm-level__medal {
    display: none;
  }
  .hm-level__medal-m {
    display: block;
    position: absolute;
    top: -22px;
    right: -20px;
    width: 124px;
    height: 124px;
    pointer-events: none;
  }

  /* Дорожка: кружки 32 (текущий белый с точкой 10), линия 3 #ac75ff, пройденное — белым. */
  .hm-level__track {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0;
    margin: 0;
    padding: 0 0 22px;
    border-radius: 0;
    background: none;
  }
  .hm-level__seg {
    position: relative;
    overflow: hidden;
    flex: 1 1 0;
    min-width: 8px;
    height: 3px;
    margin-top: 14.5px;
    border-radius: 2px;
    background: #ac75ff;
  }
  .hm-level__fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: 2px;
    background: #fff;
  }
  .hm-level__stop {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: #ac75ff;
    color: #fff;
  }
  .hm-level__stop--now {
    background: #fff;
  }
  .hm-level__dot {
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #9047ff;
  }
  .hm-level__ico {
    display: none;
  }
  .hm-level__stop:not(.hm-level__stop--now)::before {
    content: '';
    width: 18px;
    height: 18px;
    background: currentColor;
    -webkit-mask: url(/assets/home-v2/ico/milestone.svg) center / contain no-repeat;
    mask: url(/assets/home-v2/ico/milestone.svg) center / contain no-repeat;
  }
  .hm-level__stop--finish::before {
    -webkit-mask-image: url(/assets/home-v2/ico/finish.svg);
    mask-image: url(/assets/home-v2/ico/finish.svg);
  }
  /* Подписи — коды из data-short; полный текст остаётся для читалок экрана. */
  .hm-level__lbl {
    position: absolute;
    top: 38px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0;
    line-height: 16px;
    white-space: nowrap;
  }
  .hm-level__lbl::after {
    content: attr(data-short);
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }
  .hm-level__stop--now .hm-level__lbl {
    left: 0;
    transform: none;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
  }
  .hm-level__stop--finish .hm-level__lbl {
    left: auto;
    right: 0;
    transform: none;
  }

  /* Строка цели (Goal: белая 16%, r16, p10/14): флажок, «Цель — A2», справа «Изменить». */
  .hm-level__goal {
    position: static;
    display: flex;
    flex-direction: row;
    align-items: center;
    align-self: stretch;
    justify-content: flex-start;
    gap: 8px;
    width: auto;
    height: auto;
    min-height: 0;
    margin: 0;
    padding: 10px 14px;
    border: 0;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    line-height: 19px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .hm-level__goal > span {
    flex: 1 1 auto;
    min-width: 0;
  }
  .hm-level__flag {
    display: block;
    flex: none;
    width: 18px;
    height: 18px;
    background: currentColor;
    -webkit-mask: url(/assets/home-v2/ico/flag.svg) center / contain no-repeat;
    mask: url(/assets/home-v2/ico/flag.svg) center / contain no-repeat;
  }
  .hm-level__edit {
    display: block;
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  /* Без теста: белая кнопка теста на месте строки цели. */
  .hm-level__test {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    border: 0;
    border-radius: 16px;
    background: #fff;
    color: #9047ff;
    font-family: inherit;
    font-size: 15px;
    line-height: 20px;
    font-weight: 700;
    cursor: pointer;
  }
  /* Цель достигнута — кубок срезан краем, кнопка покупки во всю ширину. */
  .hm-level__trophy {
    position: absolute;
    top: -14px;
    right: -52px;
    width: 150px;
    height: 150px;
    pointer-events: none;
  }
  .hm-level__buy {
    width: 100%;
    padding: 10px 14px;
    border-radius: 16px;
  }

  /* ---------- пробный урок (Trial 370×80, r24, тень) ---------- */
  .hm-trial {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    min-height: 80px;
    padding: 16px;
    border: 0;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  }
  .hm-trial .hm-plate::before {
    width: 24px;
    height: 24px;
  }
  .hm-trial__art,
  .hm-trial__sub {
    display: none;
  }
  .hm-trial__body {
    flex: 1 1 0;
    min-width: 0;
  }
  .hm-trial__title {
    font-size: 16px;
    line-height: 24px;
    font-weight: 800;
    color: #181818;
  }
  .hm-trial__cta {
    flex: none;
    height: 40px;
    padding: 0 16px;
    border: 0;
    border-radius: 16px;
    background: #9047ff;
    color: #fff;
    font-size: 16px;
    line-height: 24px;
    font-weight: 700;
  }
  .hm-trial__cta svg {
    display: none;
  }
  .hm-trial__error {
    width: 100%;
    margin: 0;
  }

  /* ---------- сильные и слабые стороны ---------- */
  .hm-skills__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    opacity: 1;
  }
  .hm-skill {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) auto;
    grid-template-areas: 'name bar pct';
    align-items: center;
    gap: 10px;
  }
  .hm-skill__name {
    grid-area: name;
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: #4a4a55;
  }
  .hm-skill__bar {
    grid-area: bar;
    height: 8px;
    border-radius: 4px;
    background: #eeeef4;
  }
  .hm-skill__fill {
    display: block;
    height: 100%;
    border-radius: 4px;
  }
  .hm-skill__fill--high {
    background: #31b423;
  }
  .hm-skill__fill--mid {
    background: #9047ff;
  }
  .hm-skill__fill--low {
    background: #e8a020;
  }
  .hm-skill__fill.is-bad {
    background: #ff5c5c;
  }
  .hm-skill__pct {
    grid-area: pct;
    min-width: 28px;
    text-align: right;
    font-size: 13px;
    line-height: 18px;
    font-weight: 700;
    color: #4a4a55;
  }
  .hm-skill__trend,
  .hm-skills__tags {
    display: none;
  }
  .hm-skills__sum {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 17px;
    font-weight: 500;
    color: #8a8a8a;
  }
  .hm-skills__sumIco {
    flex: none;
    width: 16px;
    height: 16px;
    background: #31b423;
    -webkit-mask: url(/assets/home-v2/ico/trending_up.svg) center / contain no-repeat;
    mask: url(/assets/home-v2/ico/trending_up.svg) center / contain no-repeat;
  }
  /* Заданий ещё нет (кадр 6135:11595): плашка 44 со значком insights и текст, без строк навыков. */
  .hm-skills--empty .hm-skills__list,
  .hm-skills--empty .hm-skills__msg b {
    display: none;
  }
  .hm-skills__msg {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    padding: 0;
    background: none;
  }
  .hm-skills__msgIco {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: #efe7ff;
  }
  .hm-skills__msgIco::before {
    content: '';
    width: 22px;
    height: 22px;
    background: #9047ff;
    -webkit-mask: url(/assets/home-v2/ico/insights.svg) center / contain no-repeat;
    mask: url(/assets/home-v2/ico/insights.svg) center / contain no-repeat;
  }
  .hm-skills__msg p {
    margin: 0;
    font-size: 13px;
    line-height: 19px;
    font-weight: 500;
    color: #8a8a8a;
  }

  /* ---------- практика на сегодня: 2×2, плитка 163×151 ---------- */
  .hm-prac__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .hm-prac__tile {
    position: static;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    height: auto;
    min-height: 149px;
    padding: 12px;
    border: 0;
    border-radius: 18px;
    background: #f8f8fb;
    text-align: left;
  }
  .hm-prac__img {
    display: block;
    position: static;
    order: -1;
    width: 68px;
    height: 68px;
    object-fit: contain;
    background: none;
  }
  .hm-prac__emoji {
    display: none;
  }
  .hm-prac__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: none;
  }
  .hm-prac__text b {
    font-size: 13px;
    line-height: 17px;
    font-weight: 700;
    color: #181818;
  }
  .hm-prac__text i {
    font-size: 11px;
    line-height: 15px;
    font-weight: 500;
    font-style: normal;
    color: #8a8a8a;
  }

  /* ---------- расписание: полоса дней и уроки выбранного дня ---------- */
  .hm-sched__week {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .hm-sched__wday {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 44px;
    height: 56px;
    padding: 8px 0;
    border: 0;
    border-radius: 14px;
    background: none;
    font-family: inherit;
    cursor: pointer;
  }
  .hm-sched__wday b {
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
    color: #181818;
  }
  .hm-sched__wday i {
    font-size: 11px;
    line-height: 15px;
    font-weight: 500;
    font-style: normal;
    color: #8a8a8a;
  }
  .hm-sched__wday.is-busy::after {
    content: '';
    position: absolute;
    bottom: 3px;
    left: 50%;
    width: 5px;
    height: 5px;
    margin-left: -2.5px;
    border-radius: 50%;
    background: #9047ff;
  }
  .hm-sched__wday.is-picked {
    background: #9047ff;
  }
  .hm-sched__wday.is-picked b,
  .hm-sched__wday.is-picked i {
    color: #fff;
  }
  .hm-sched__wday.is-picked::after {
    background: #fff;
  }
  .hm-sched__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .hm-sched__day {
    display: none;
  }
  .hm-sched__day.is-picked {
    display: block;
  }
  .hm-sched__date {
    display: none;
  }
  .hm-sched__items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  /* Урок (Lesson: #efe7ff, r16, p12/14): плашка 40 #9047ff с белой камерой, имя, «Сегодня · 18:00–19:00», шеврон. */
  .hm-sched__item {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 20px;
    grid-template-areas: 'plate name chev' 'plate when chev';
    column-gap: 12px;
    row-gap: 2px;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    border: 0;
    border-radius: 16px;
    background: #efe7ff;
    text-align: left;
  }
  .hm-sched__item .hm-plate {
    grid-area: plate;
    background: #9047ff;
    color: #fff;
  }
  .hm-sched__item b {
    grid-area: name;
    font-size: 14px;
    line-height: 19px;
    font-weight: 700;
    color: #181818;
  }
  .hm-sched__item i {
    grid-area: when;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    font-style: normal;
    color: #4a4a55;
  }
  .hm-sched__when {
    display: inline;
  }
  .hm-sched__chev {
    display: grid;
    grid-area: chev;
    color: #9047ff;
  }
  /* Нет уроков (EmptyState 6135:11558): #f6f2ff, рамка 1.5 #cdb8ff, r18, белая плашка 44 со значком event. */
  .hm-sched__empty {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    grid-template-areas: 'plate title' 'plate sub';
    column-gap: 12px;
    row-gap: 2px;
    align-items: center;
    padding: 14px;
    border: 1.5px solid #cdb8ff;
    border-radius: 18px;
    background: #f6f2ff;
  }
  .hm-sched__empty .hm-plate {
    grid-area: plate;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: #fff;
  }
  .hm-sched__empty .hm-plate::before {
    width: 22px;
    height: 22px;
  }
  .hm-sched__empty > span:not(.hm-plate) {
    grid-area: title;
    font-size: 15px;
    line-height: 20px;
    font-weight: 700;
    color: #181818;
  }
  .hm-sched__empty small {
    display: block;
    grid-area: sub;
    font-size: 12px;
    line-height: 17px;
    font-weight: 500;
    color: #4a4a55;
  }

  /* ---------- домашнее задание: строка #f8f8fb r16 p10/12 ---------- */
  .hm-hw__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .hm-hw__item {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 20px;
    grid-template-areas: 'plate title chev' 'plate meta chev';
    column-gap: 12px;
    row-gap: 2px;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 16px;
    background: #f8f8fb;
    text-align: left;
  }
  .hm-hw__item .hm-plate {
    grid-area: plate;
  }
  .hm-hw__item b {
    grid-area: title;
    font-size: 14px;
    line-height: 19px;
    font-weight: 700;
    color: #181818;
  }
  .hm-hw__item > span:not(.hm-plate) {
    grid-area: meta;
    display: flex;
    gap: 0;
  }
  .hm-hw__item i {
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    font-style: normal;
    color: #8a8a8a;
  }
  .hm-hw__item i + i::before {
    content: ' · ';
    white-space: pre;
  }
  .hm-hw__ico {
    display: none;
  }
  .hm-hw__item::after {
    content: '';
    grid-area: chev;
    width: 20px;
    height: 20px;
    background: #b5b5c4;
    -webkit-mask: url(/assets/home-v2/ico/chevron_right.svg) center / contain no-repeat;
    mask: url(/assets/home-v2/ico/chevron_right.svg) center / contain no-repeat;
  }
  .hm-hw__empty {
    margin: 0;
    font-size: 13px;
    color: #8a8a8a;
  }
}
```

Блоки ниже (`.ge-task…` и окно `.hm-temper`) оставить как есть.

- [ ] **Step 2: Сверка с макетом.** Превью 402×874: `/?screen=home` под демо-учеником и под полным доступом. Для данных — моки ручек, как в `tests/home-goal.spec.js` (тот же набор `page.route`), или вход на dev-стенде тестовым аккаунтом из `.env.example`/фикстур проекта. Скриншоты рядом с `figma_take_screenshot {nodeId: "6125:6209"}` и `{nodeId: "6856:12401"}` (демо). Сверить: заголовок 32, отступы 16, карточка уровня 228, медаль, дорожка, строка цели, плитки 2×2, полосу дней, строки домашки. Правки — в `src/mobile/home.css`.

- [ ] **Step 3: Тур на телефоне.** Очистить `jts_tours_off` и отметку тура в localStorage превью, открыть `/?screen=home`: шаг 1 подсвечивает карточку уровня, шаг 3 — нижнюю панель (как `figma_take_screenshot {nodeId: "6856:12612"}`).

- [ ] **Step 4: Ширина 360 и 375.** `resize_window {width: 360, height: 800}` и `{width: 375, height: 812}`: подписи дорожки не налезают друг на друга, полоса из 7 дней помещается (ячейки 44 × 7 = 308 ≤ 328). Если на 360 тесно — `@media (max-width: 380px) { .hm-sched__wday { width: 40px } }`.

- [ ] **Step 5: Commit**

```bash
git add src/mobile/home.css
git commit -m "feat(home): «Главная» телефона строго по дизайну приложения

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: e2e, которые ходили через бургер или проверяли блоки «Главной» на телефоне

**Files:**
- Create: `tests/helpers/nav.js`
- Modify: `tests/lessons-schedule.spec.js`, `tests/live-lesson.spec.js`, `tests/live-lesson-fullscreen.spec.js`, `tests/live-lesson-material-switch.spec.js`, `tests/profile-identity.spec.js`, `tests/tutor-onboarding.spec.js`, `tests/tutor-only-sections.spec.js`, `tests/ge-plan.spec.js`, `tests/general-english-onboarding.spec.js`, `tests/placement-v16.spec.js`

- [ ] **Step 1: Помощник перехода по разделу** — `tests/helpers/nav.js`:

```js
// Переход в раздел так, как это делает человек на этой ширине: на телефоне (≤560) — вкладкой нижней панели или
// плиткой «Сервисов», на планшете — через бургер, на компьютере — пунктом сайдбара (спека 2026-10-26).
const TABS = { Главная: 'home', Практика: 'practice', 'AI-тьютор': 'tutor', Уроки: 'lessons' }

export async function openSection(page, label) {
  const tabBar = page.locator('.mtab')
  await tabBar.or(page.locator('.mtop__menu')).or(page.locator('.sb__nav')).first().waitFor({ timeout: 10_000 })
  if (await tabBar.isVisible()) {
    if (TABS[label]) return page.locator(`.mtab [data-tab="${TABS[label]}"]`).click()
    await page.locator('.mtab [data-tab="services"]').click()
    return page.locator('.svc-tile', { hasText: label }).click()
  }
  const burger = page.locator('.mtop__menu')
  if (await burger.isVisible()) await burger.click()
  return page.locator('.sb__nav .sb__item', { hasText: label }).first().click()
}
```

- [ ] **Step 2: Тесты уроков.** В `lessons-schedule`, `live-lesson`, `live-lesson-fullscreen`, `live-lesson-material-switch` блок

```js
  const menuButton = page.locator('.mtop__menu')
  await menuButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (await menuButton.isVisible()) await menuButton.click()   // или многострочный if
  await page.getByText('Уроки', { exact: true }).first().click()
```

заменить на `await openSection(page, 'Уроки')` (комментарий над блоком — «переход через помощник: на телефоне вкладка, на компьютере сайдбар»), импорт `import { openSection } from './helpers/nav.js'`.

- [ ] **Step 3: Профиль, тьютор, тьютор-онли.**
  - `profile-identity.spec.js`: проверку `.mtop__avatar` заменить на аватар «Сервисов»: `await page.locator('.mtab [data-tab="services"]').click()`, затем `const topAvatar = page.locator('.svc-hero__avatar')` — те же две проверки (силуэт, без «П»). Строку про `.footer` оставить.
  - `tutor-onboarding.spec.js:108`: `page.locator('.mtop .t-back')` → `page.locator('.t-topbar .t-back')`.
  - `tutor-only-sections.spec.js`: `openSidebar` оставить для широкого экрана; на телефоне проверку пунктов делать по `.mtab__item` + плиткам. Функцию заменить на:

```js
async function openSidebar(page) {
  const burger = page.locator('.mtop__menu')
  if (await burger.isVisible()) await burger.click()
}
```

    и в каждом тесте этого файла первой строкой: `test.skip(({ viewport }) => (viewport?.width ?? 0) <= 560, 'на телефоне меню — нижняя панель (mobile-tabbar.spec.js)')` (файл и так про тьютор-онли, который на телефоне проверяет `navSections.test.js`).

- [ ] **Step 4: Блоки «Главной», скрытые на телефоне.** В `ge-plan.spec.js` (тесты с `.ge-today` и `.ge-goal`, строки ~95–145), `general-english-onboarding.spec.js` (тест с `.ge-goal`, строка ~67) и `placement-v16.spec.js` (тесты с `.hm-start`, `.ge-goal`, `.pl-report`, `.pl-next`, строки ~100–130 и ~250–285) первой строкой тела каждого такого теста добавить:

```js
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE и отчёт теста скрыты (спека 2026-10-26)')
```

  Если тест проверяет и то, что видно на телефоне (переход, сохранение), — вместо пропуска разделить проверки: видимость блоков GE — только `desktop`, остальное — на обоих.

- [ ] **Step 5: Весь набор e2e на обоих проектах**

```bash
E2E_PORT=3117 npx playwright test --config "$SCRATCH/pw.config.mjs" --workers=2
```
Expected: зелёный. Каждое красное — разобрать: если тест кодирует старый телефонный вид (бургер, `.mtop`, блоки «Главной» из списка скрытых) — обновить по правилам шагов 1–4; если ломается поведение — чинить код, не тест. `tests/arcade-runner.spec.js` гонять отдельно с `--workers=1` (CLAUDE.md).

- [ ] **Step 6: Commit**

```bash
git add tests
git commit -m "test(e2e): переходы по разделам через нижнюю панель на телефоне

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Обход разделов, тёмная тема, документация, проверка

**Files:**
- Modify: CSS разделов по итогам обхода (`src/mobile/*.css`), `src/theme-dark.generated.css` (только свои блоки), `CLAUDE.md`

- [ ] **Step 1: Обход телефона.** Превью, ширины 375×812 и 440×956, адреса: `?screen=practice`, `?screen=practice` вкладки «Чтение/Письмо/Говорение/Аудирование», `?screen=lessons`, `?screen=homework`, `?screen=vocab`, `?screen=profile`, `?screen=kingdom`, `?screen=tutor-dashboard`, `?screen=tutor-welcome`, `?screen=reading`, `?screen=workbook&level=a1`, `?screen=situations&level=a1`, `?screen=listen`, `?screen=welcome`. На каждом: (а) панель не перекрывает кнопки внизу экрана (иначе — экран в список «без панели» в `src/mobile/nav.css`, все три правила), (б) ряд кнопок угла не налезает на заголовок раздела, (в) после Manrope нет переносов и вылезаний за край. Правки — в файл секции `src/mobile/<секция>.css`.

- [ ] **Step 2: Тёмная тема — только свои блоки.**

```bash
cp src/theme-dark.generated.css "$SCRATCH/theme-before.css"
node scripts/gen-dark-theme.js
git diff --stat src/theme-dark.generated.css
```
Из нового файла взять блоки заголовков `services.css`, `mobile/nav.css`, `mobile/home.css`, `demo.css` (только новые правила `.hm-plate`, `.hm-level--phone` и т. п.); вернуть `theme-before.css` на место и вставить взятые блоки перед заголовком следующего по `layout.jsx` файла. В диффе — только добавления этих блоков. Проверить `?theme=dark` на `/?screen=services` и `/?screen=home` (402).

- [ ] **Step 3: CLAUDE.md.** В «Конвенциях» абзац «**Мобильный слой (≤560px)**» заменить на:

```markdown
- **Мобильный слой (≤560px)** — `src/mobile/<секция>.css`, подключены в `layout.jsx` ПОСЛЕДНИМИ и целиком внутри
  `@media (max-width: 560px)`. С 26.10.2026 источник — дизайн мобильного приложения: Figma «pitch JTS (Copy)»,
  страница «Mobile», кадры 402px (до этого — «Web Адаптивка», 440). Шрифт телефона — Manrope, как в приложении
  (`src/mobile/base.css`), казахский — Inter. Навигация телефона — нижняя панель `MobileTabBar` (Главная · Практика
  · AI-тьютор · Уроки · Сервисы) и экран `?screen=services` вместо бургера; правила меню — `src/lib/navSections.js`,
  общие с сайдбаром. Бургер и выезжающее меню остались планшету 561–760. Экраны, где раздел рисует свою полосу во
  весь экран, панели не получают — список в `src/mobile/nav.css`. «Главная» на телефоне строго по приложению: шесть
  блоков, блоки GE, отчёт теста и прочее скрыты (решение владельца 26.10.2026). Разделы переносятся на дизайн
  приложения по одному, PR на раздел. Иконки и картинки — экспортом из Figma в `public/assets/m/<секция>/`.
```

  Абзац «Шрифт десктопа — Manrope, кроме экранов под обёрткой `.screen`…» дополнить: «на телефоне `.screen` тоже на Manrope».

- [ ] **Step 4: Полная проверка**

```bash
npm run lint
npx vitest run
```
Expected: lint без ошибок; vitest — без новых падений относительно Task 0 (известные красные develop — `practice-contract:20`, флак `vocab:242`).

Сборка — во временной копии, чтобы не сломать живой dev-сервер:

```bash
git worktree add --detach "$SCRATCH/buildcheck" HEAD
cmd //c "mklink /J $(cygpath -w "$SCRATCH/buildcheck")\\node_modules C:\\Users\\nural\\Desktop\\jts-web-app\\node_modules"
(cd "$SCRATCH/buildcheck" && npx next build --webpack)
cmd //c "rmdir $(cygpath -w "$SCRATCH/buildcheck")\\node_modules"
git worktree remove --force "$SCRATCH/buildcheck"
```
Expected: `Compiled successfully`. Ссылку снимать `rmdir`, не `rm -rf` (снесёт оригинал).

- [ ] **Step 5: Commit**

```bash
git add -A src CLAUDE.md
git commit -m "docs(mobile): телефон по дизайну приложения в CLAUDE.md; правки обхода и тёмной темы

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: PR — после «да» владельца.** Показать владельцу скриншоты 402 («Главная», «Сервисы», Практика с панелью) рядом с кадрами Figma. Только по его согласию:

```bash
git push -u origin design/mobile-app-nav
gh pr create --base develop --title "feat(mobile): нижняя панель, «Сервисы» и «Главная» по дизайну приложения" --body "<сводка по спеке, список скрытого на телефоне, скриншоты, что не проверено>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
