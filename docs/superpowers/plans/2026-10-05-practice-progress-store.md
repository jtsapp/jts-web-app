# Общее хранилище прогресса «Практики» — план

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 10 разделов «Практики» читают прогресс из памяти, загруженной с сервера, и отправляют его из памяти — забитый localStorage больше не прячет и не стирает прогресс.

**Architecture:** `src/practice/progressStore.js` (память по владельцу, черновик, push, сведение со снимком `hydratePractice`); модули `*Progress.js` переходят на него без смены публичного API.

**Tech Stack:** JS, React 19, vitest + jsdom.

Спека: `docs/superpowers/specs/2026-10-05-practice-progress-store-design.md`.

## Global Constraints

- Публичные функции `*Progress.js` не меняются.
- Серверная семантика прежняя (union / replace), сервер не трогаем.
- Тесты модулей прогресса мокают `practiceSync` одной `pushModule` — хранилище
  импортирует из `practiceSync` только её.
- `read()` вызывают из рендера: событие при первом чтении не шлём.

---

### Task 1: `progressStore.js` + тесты
- [ ] `src/practice/progressStore.test.js` — сценарии из спеки → FAIL.
- [ ] `src/practice/progressStore.js`: `createProgressStore`, `doneListOptions`
      (`normalize` = `normalizeDone(Array.isArray(raw) ? raw : raw?.done)`,
      `merge` = объединение), `adoptHydratedState(state, owner)`,
      `resetPracticeStores()`, `ownerOf(token)`, регистрация сброса в
      `globalThis.__jtsPracticeStores`.
- [ ] `vitest.setup.js`: глобальный `beforeEach` зовёт сбросы из реестра.
- [ ] PASS, commit.

### Task 2: `practiceSync` — снимок и уборка
- [ ] Тест в `practiceSync.test.js`: hydrate отдаёт модуль хранилищу (память
      видит серверное при забитом localStorage), черновик модуля с хранилищем
      пишет хранилище; `clearLocalPractice` сбрасывает память → FAIL.
- [ ] `hydratePractice`: `adoptHydratedState(data.state, ownerOf(token))` →
      `applyHydratedState` только по необработанным модулям;
      `clearLocalPractice` → `resetPracticeStores()`.
- [ ] PASS, commit.

### Task 3: разделы-«галочки»
- [ ] grammar, listening, shadowing, situations, workbooks → `createProgressStore({...doneListOptions})`; `read()` → `new Set(store.read())`; отметка → `store.write([...list, id])`; своё событие и `pushModule` убрать.
- [ ] Тест квоты на раздел (общий `src/practice/progressQuota.test.js`).
- [ ] Старые тесты модулей зелёные, commit.

### Task 4: разделы-«объекты»
- [ ] workbook, writing, words, verbs, listenchoose → хранилище с их `normalize`; писатели копируют состояние, а не мутируют; «зеркала» verbs/listenchoose удалить; `writeSeen(..., {sync})` → `store.write(next, {sync})`.
- [ ] Тест квоты на раздел (тот же файл).
- [ ] Старые тесты модулей зелёные, commit.

### Task 5: проверка и PR
- [ ] Полный vitest, `npm run build`, eslint по изменённым.
- [ ] Живой прогон: гость с забитым localStorage — грамматика/аудирование/«Слова в картинках» не теряют отметку.
- [ ] Ревью субагентом, PR в develop, затем прод-черри-пик.
