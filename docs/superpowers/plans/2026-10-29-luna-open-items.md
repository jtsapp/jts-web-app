# Луна открывает конкретное — план реализации (часть А)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «Луна, открой урок 5 / тему Present Perfect / текст про щекотку» — Луна открывает конкретную вещь, закрытый урок курса не открывает.

**Architecture:** стабильный адрес вещи `вид.уровень.id`; сервер по просьбе ученика прикладывает к контексту каталог нужных видов и сверяет метку модели с ним (или собирает каталог по адресу на «да»); клиент строит переход по адресу общим модулем и проверяет квоту ситуаций; тропа курса получает цель «открыть урок» и сама проверяет замок общим правилом.

**Tech Stack:** Next.js 16 (JS), vitest, Playwright (системный Chrome), Anthropic SDK (зонд).

## Global Constraints

- Адрес: `^(course|grammar|ggame|reading|situation|shadowing|words|workbook|homework|live)\.[A-Za-z0-9_.-]{1,48}$`.
- Закрытый урок курса действием не становится; правило замка — одно (`src/learning/courseLock.js`).
- Квотные разделы не обходятся: ситуации нового уровня — через карточку Практики.
- Каталог в контексте — только при просьбе открыть (`itemIntent`), длинные списки ≤ 160 строк.
- Правка промпта — с зондом Haiku 5.5 на параметрах роута.
- Комментарии по-русски, «почему»; JS без TS.

---

### Task 1: Адрес и переход (`items/refs.js`)

**Files:** Create `src/lib/assistant/items/refs.js`, test `src/lib/assistant/items/refs.test.js`.

**Produces:** `ITEM_REF_RE`, `isItemRef(s)`, `parseItemRef(ref) → {kind, level|null, id} | null`, `itemNav(ref, {situationsOpened: string[]}) → {nav, payload} | null`.

- [ ] Тесты: разбор всех десяти видов; `course.B1.L5` → `course {level:'B1', lesson:'L5'}`; `grammar.b1.7` → `practice {level:'b1', unitId:7}`; `situation.a2.1` при открытом a2 → `situations {level:'a2', id:1}`, иначе `practice {area:'situations', level:'a2'}`; `shadowing.v2` → `shadowing 'v2'`; мусор (`course.Z9.L5`, `grammar.b1.x`, `foo.1`) → null.
- [ ] Реализация, прогон, коммит.

### Task 2: Правило замка курса (`learning/courseLock.js`)

**Files:** Create `src/learning/courseLock.js` + test; Modify `src/screens/KingdomInteriorPage.jsx` (`isUnlocked` зовёт `lessonUnlocked`).

**Produces:** `lessonUnlocked(i, {trail, done:Set, moduleLocked, moduleQuota, unlockAll}) → boolean`.

- [ ] Тесты: первый открыт; следующий — только после пройденного предыдущего; модуль закрыт — всё закрыто; квота закрывает новые, но не пройденные; unlockAll снимает последовательность, не квоту.
- [ ] Реализация (перенос условий страницы как есть), страница на общем правиле, прогон тестов тропы, коммит.

### Task 3: Просьба открыть (`items/intent.js`)

**Files:** Create `src/lib/assistant/items/intent.js` + test.

**Produces:** `itemIntent(text, {userLevel}) → {kinds: string[], level: string|null} | null`.

- [ ] Тесты: «открой урок 5» → course; «урок про траты» → course; «следующий урок» → course; «тема Present Perfect» → grammar (+ggame); «открой текст про космос B1» → reading, level B1; «ситуация в ресторане» → situation; «шэдоуинг с Обамой» → shadowing; «слова в картинках ферма» → words; «открой воркбук» → workbook; «покажи мою домашку» → homework; «мой урок с преподавателем» → live (не course); kk «5-сабақты аш» → course; en «open lesson 3» → course; «почему мой ответ в этом уроке неверный?» → null; уровень кириллицей «В1» → B1.
- [ ] Реализация, прогон, коммит.

### Task 4: Каталог на сервере (`items/catalog.js`)

**Files:** Create `src/lib/assistant/items/catalog.js` + test (fs и fetch подменены).

**Consumes:** `courseTrail` (`learning/courseData.js`), `pickLevelModule` (`learning/lessonModule.js`), `lessonUnlocked`, `ITEM_REF_RE`/`parseItemRef`.

**Produces:** `buildItemCatalog({kinds, level, token}) → {text: string|null, items: Map<ref, {ref, kind, title, locked, next}>}`; `resolveItem(ref, {token}) → item|null`.

- [ ] Тесты: курс — строки с «пройден / следующий / закрыт» по прогрессу бэкенда; бэкенд не ответил — замков нет (тропа проверит сама); грамматика — `grammar.b1.<id>` с названием; чтение — бэкенд, иначе диск; ситуации, слова, шэдоуинг, воркбук, домашка (открытые), живые уроки (будущие); `resolveItem('course.B1.L5')` собирает только свой вид.
- [ ] Реализация (таймаут бэкенда 4 с, статика кэшируется в памяти), прогон, коммит.

### Task 5: Метка, роут, промпт

**Files:** Modify `src/lib/assistant/actions.js` (адрес в метке и хвосте), `src/app/api/assistant/chat/route.js` (intent → каталог → `buildTurns`, сверка, `resolveItem` на «да», без заметки трекера), `src/lib/assistant/prompt.js` (RULES + блок «Что можно открыть» + указание рядом с вопросом), тесты всех трёх.

- [ ] Тесты: `[[OPEN_NOW course.B1.L5]]` с каталогом → действие с подписью; закрытый → нет действия; адрес не из каталога и не нашёлся → нет; «да» по адресу из истории → `resolveItem`; хвост `[[ASST_ACTION open course.B1.L5 now «Урок 5 …»]]` разбирается клиентом.
- [ ] Реализация, прогон, коммит.

### Task 6: Переход в окне и тропе

**Files:** Modify `src/App.jsx` (`onAssistantNavigate` для адреса → `itemNav` + `readSituationsDone`; `handleNav('course', {level, lesson})` → цель тропе), `src/screens/KingdomInteriorPage.jsx` (проп `lessonTarget`: открыть урок, закрыт — подсказка «урок закрыт»), `src/components/AssistantWidget.jsx` (кнопка «Открыть: <подпись>», `perform` для адреса).

- [ ] e2e `tests/assistant-items.spec.js`: «открой урок 1» (мок ответа с хвостом) → тропа A1 открывает урок; «урок 5» → урок не открылся, тропа на месте.
- [ ] Прогон, коммит.

### Task 7: Зонд, CLAUDE.md, проверка, PR

- [ ] Зонд Haiku 5.5 (scratchpad): 10 сценариев × 3 — адрес из списка, закрытый не открыт, «следующий» верный, kk.
- [ ] CLAUDE.md — абзац о командах «открой конкретное».
- [ ] vitest целиком, `npm run build`, e2e помощника, PR в develop.
