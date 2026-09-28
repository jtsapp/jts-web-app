# Финальный экзамен уровня — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Исполнение — инлайн одним потоком (решение владельца, память `subagents-vs-inline`): код пишется сразу в файлы, план держит порядок, интерфейсы и проверки. Субагент — один раз, на финальное ревью ветки. Коммит и PR — по просьбе владельца.

**Goal:** узел «Финальный экзамен» в конце тропы уровня (A0, A1, A2, B2) — порт `data/jtsexam-<level>.html`: 50 авто-вопросов, итоги с разбивкой по навыкам, разбор ответов.

**Architecture:** офлайн-экстрактор исполняет прототип в `node:vm` и пишет `public/exam/<level>/exam.json` плюс оракул-фикстуры (прототипный `showResults` на наборах ответов); чистый модуль `levelExam.js` считает балл и сверяется с оракулом; экран `LevelExam.jsx` рисуется на месте плеера урока внутри `KingdomInteriorPage`; прогресс — тот же `markDone` с кодом `EXAM`.

**Tech Stack:** Next.js (JS, не TS), React, vitest + testing-library, Playwright, node:vm, Soniox TTS.

Спека: `docs/superpowers/specs/2026-09-28-level-exam-design.md` — при расхождении права спека.

## Global Constraints

- JavaScript, не TypeScript. Комментарии на русском, объясняют «почему».
- Стили — `src/course.css` (там же плеер урока), префикс `.ex-`; корень экрана `cp ex` — наследует полосу `.cp-bar` и правила `.learn__main:has(.cp)` (колокольчик скрыт, высота `.km-lesson` авто).
- Никакого `overflow-wrap: anywhere` / `word-break: break-word` (сторож `src/textCollapse.test.js`); у каждой кнопки с `disabled` — правило `.класс:disabled` (сторож `scripts/lib/disabled-controls.test.js`).
- i18n: `useI18n()` + `src/i18n.jsx`, ключи `exam.*` в ru / en / kk. Вопросы, варианты, реплики и вступления к диалогам — английские (язык экзамена), как в исходнике.
- Код узла `EXAM`, юнит `0` (готовое правило `isReviewUnitUnlocked(…, 0)` и подпись `lesson.examUnit`).
- Порог — из прототипа (`totalCorrect >= 35`), навык «проседает» ниже 70 %; ответ хранится ИСХОДНЫМ индексом варианта.
- Варианты перемешаны детерминированно (FNV-1a от `<level>:<id>` → LCG на `Math.imul`), True/False — нет.
- Записи — только файлы `public/exam/<level>/audio/<sha1 стенограммы>.mp3`, синтеза на экране нет.
- Черновик: `localStorage['jts_level_exam'][userId][level] = { v, answers, at }`, 14 дней, сброс при смене `version`.
- Работа только в worktree `.claude/worktrees/level-exam`. Vitest — из worktree. E2E — обёртка с `channel: 'chrome'` в scratchpad + `E2E_PORT`.

## Карта файлов

| Файл | Ответственность |
|---|---|
| `data/jtsexam-{a0,a1,a2,b2}.html` | исходники методиста, источник правды |
| `scripts/extract-level-exams.js` (+`.test.js`) | прототип → `exam.json`, оракул-фикстуры |
| `scripts/level-exam-i18n-source.json` | советы по навыкам: en из прототипа + ru/kk |
| `scripts/voice-level-exams.js` (+`.test.js`) | Soniox по ролям → `audio/<хэш>.mp3`, паузы тихими кадрами |
| `src/learning/levelExam.js` (+`.test.js`) | загрузка, вопросы по порядку, счёт, порядок вариантов |
| `src/learning/levelExamDraft.js` (+`.test.js`) | черновик ответов на устройстве |
| `src/learning/LevelExam.jsx` (+`.test.jsx`) | экран: лист вопросов, итоги, разбор, плеер записи |
| `src/learning/__fixtures__/level-exam-oracle-<level>.json` | снимок прототипного `showResults` |
| `public/exam/<level>/exam.json`, `audio/` | выгрузка |
| `src/screens/KingdomInteriorPage.jsx` (+`.test.jsx`) | узел на тропе, открытие, зачёт |
| `src/course.css`, `src/i18n.jsx` | стили `.ex-*`, строки `exam.*` |
| `tests/level-exam.spec.js` | e2e: узел → 50 ответов → итоги → разбор |
| `CLAUDE.md` | абзац про экзамен |

## Интерфейсы

```js
// scripts/extract-level-exams.js (CJS)
runPrototype(html) -> { ctx, byId }                 // весь <script> под заглушкой DOM
buildExam(level, html, proto, i18n) -> exam          // бросает на нарушенных инвариантах
answerSets(exam) -> [[name, answers]]                // детерминированные наборы для оракула
oracleCase(proto, answers) -> { correct, pct, passed, skills: {key: [c, t]}, weak: [key] }
listeningAudioFile(lines) -> '<sha1-12>.mp3'
sourceFiles() -> [{ level, file }]

// src/learning/levelExam.js (ESM)
EXAM_CODE = 'EXAM'; SKILLS; WEAK_BELOW = 70
loadLevelExam(level) -> Promise<exam|null>
sectionQuestions(section) -> [q]                     // пропуски диалога, вопросы, вопросы текстов
examQuestions(exam) -> [{ ...q, section, num }]      // сквозная нумерация 1..total
answeredCount(exam, answers) -> number
scoreExam(exam, answers) -> { correct, total, pct, passed, skills: [{ key, correct, total, pct, weak }] }
optionOrder(level, q) -> [исходные индексы в порядке показа]

// src/learning/levelExamDraft.js
readExamDraft(token, level, version, now?) -> answers|null
saveExamDraft(token, level, version, answers, now?)
clearExamDraft(token, level)

// src/learning/LevelExam.jsx
<LevelExam exam level token restricted onExit={(finished) => …} onPassed={(points) => …} />
```

Формат `exam.json`: `{ level, version, total, pass, sections: [{ key, dialogue?: { intro, lines: [{ sp, parts: [string | { gap }] }], gaps: [q] }, questions?: [q], passages?: [{ id, title?, text?, audio?, lines?, questions: [q] }] }], tips: { <key>: { en, ru, kk } } }`, где `q = { id, prompt?, options, answer, tf? }`.

## Задачи

- [x] **1. Экстрактор.** `extract-level-exams.js`: `runPrototype` (заглушка DOM: элементы по id, `innerHTML` с детьми, `querySelectorAll → []`), банк и `SKILLS` читаются из контекста, порог — регэкспом `totalCorrect >= N`. Инварианты: 20/10/10/10, id уникальны, ответ в диапазоне, пропуски пронумерованы 1…n по порядку, у каждого совета есть ru/kk. Пишет `exam.json` и фикстуру оракула (5 крайних наборов + 20 случайных). Тест: инварианты на всех исходниках, выгрузка на диске = свежей, оракул на месте. `node scripts/extract-level-exams.js` → четыре уровня.
- [x] **2. Счёт.** `levelExam.js` + тест: `scoreExam` совпадает с оракулом на всех наборах всех уровней; `examQuestions` нумерует 1…50 в порядке прототипа; `optionOrder` — перестановка, стабильна, TF не трогает, ни в одном разделе с ≥ 6 вопросами ответ не стоит в одной позиции у > 70 %; у каждой записи аудирования есть файл.
- [x] **3. Озвучка.** `voice-level-exams.js`: `CAST[level][passage][speaker]`, `SPEED`, пауза 500 мс кадрами тишины в формате самой записи, `--level/--dry/--force/--prune`. Тест: голос есть у каждой роли каждого уровня и он из `TTS_VOICES`; кадр тишины повторяет заголовок. Прогон с ключом из `.env.local` основного дерева → 16 mp3.
- [x] **4. Черновик.** `levelExamDraft.js` + тест: свой/чужой userId, смена `version`, срок 14 дней, мусор в хранилище не роняет.
- [x] **5. Строки.** `exam.*` в трёх словарях `src/i18n.jsx`.
- [x] **6. Экран.** `LevelExam.jsx` + `.ex-*` в `course.css` + тест (синтетический экзамен на 5 вопросов): «Завершить» ждёт все ответы; сдача зовёт `onPassed(10 × верных)`; провал — советы по проседающим навыкам, `onPassed` не зван; разбор красит верное/неверное и показывает стенограмму; черновик переживает перемонтирование, «Пройти снова» его чистит; выход с листа — `onExit(false)`, с итогов — `onExit(true)`.
- [x] **7. Тропа.** `KingdomInteriorPage`: `loadLevelExam` в загрузке, узел `EXAM` юнитом 0 в конец, `openLesson('EXAM')` → экран, `saveDone(code, points)` вынесен из `onDone`, подтверждение выхода с `exam.exitSub`/`exam.exitLeave`, подпись замка `exam.locked`. Тест: узел есть/нет, замок по каталогу, сдача → `markDone(…, 'EXAM', 420)` и узел пройден.
- [x] **8. e2e.** `tests/level-exam.spec.js`: `?screen=kingdom-interior&level=A1&unlock=1`, записи — тишина через `page.route`, ответы из `exam.json` по `data-qid`/`data-opt`, итоги «сдан», разбор; второй тест — провал на всех неверных.
- [x] **9. Сдача.** Абзац в `CLAUDE.md`; `npm run build`, `npm run lint`, vitest по своим и соседним файлам, e2e; скриншоты листа, итогов и разбора на 1440 и 390; финальное ревью субагентом.
