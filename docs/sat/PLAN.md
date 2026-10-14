# SAT section — implementation plan

Sources:

- **Design:** Figma «JTS clone», page **SAT**, section `1:3958` — 35 screens + «Решения» board `1:10144`.
- **Behaviour and content:** prototype `C:\GitHub\work\jts\jts-sat-platform` (plain HTML/JS, `js/core.js` +
  24 screen modules + `js/data/*`, i18n en/ru/kk 643 keys each, `admin.html`, weekly exam-dates job). Its README is
  the functional spec; acceptance criteria §14 (12 items) are listed there.

The port repeats the shape IELTS already has: content in the JTS backend as JSON documents, images in MinIO,
methodists import JSON through web-admin, answer keys never reach the browser, web-app screens in the platform style.

---

## 1. What the prototype actually contains

| Area | Prototype | Size |
|---|---|---|
| Question bank | `questions-*.js`, schema in `questions.js` (mcq / spr, passage, stem, options, answer, explanation en/ru/kk, distractors per option, stepped hints, methods, calculator, meta) | **3 123 items**: 2 611 bank, 152 past-paper, 360 lesson; R&W 2 133 / Math 990; mcq 2 882 / spr 241; all `original`, all `draft` |
| Taxonomy | `skills.js` — 8 domains, 29 skills, `examWeight` per skill | — |
| Images | `assets/sat/algebra/*.png` referenced from items, plus 134 items with base64 images inline | 12 856 refs, 57 MB PNG |
| Past papers | `papers.js`, `paper-01/02.js` — fixed 98-question forms, no teaching layer | 2 papers |
| Course «36 units» | `programme*.js` (3 months, U1–U24 + CH1–CH12, written lessons, drills), `lesson.js`, whiteboard | lesson sets for U1, U2 so far |
| Vocabulary | `vocab.js` (SM-2), `vocab-games.js` (Match, Sentence, Register) | 514 cards, 24 + 18 game items |
| Reference | `colleges.js` (16, `verified:false`), `exam-dates.js/.json` (auto-updated from College Board), `sat-info.js` (6 chapters), `desmos-guide.js` (8 sections), `glossary.js` | — |
| Engines in `core.js` | store + migrations, router, i18n, timer, Desmos panel, SPR checker, bank + validator, mastery, planner, mock estimate | 2 387 lines |
| Screens | auth, onboarding, diagnostic, today, daily check, roadmap, plan, practice (+weak), question, study-help, study-timer, errors, mock (run/result/review), progress, vocab (hub + 5 exercises), desmos-guide, guide, materials, lesson, settings, tours, whiteboard | 24 modules |

The README says «300 questions» — outdated; the data holds 3 123.

---

## 2. Open questions — what the prototype already answers

| # | Question | Answer from the prototype | Status |
|---|---|---|---|
| 1 | **Desmos** | Plain iframe of the public `https://www.desmos.com/calculator`, one iframe per app, docked/floating, state per session. No API key used. | **Works as-is.** Legal check left: Desmos terms for embedding the public calculator in a commercial product (the paid API is the alternative). |
| 2 | **Score scale** | `JTS.mock.estimate`: module-2 route sets the band — harder → 400–800, easier → 200–600 per section; raw share linear inside the band; reported range = midpoint ±40, rounded to 10; label «внутренняя оценка JTS». Routing threshold **60 %** on module 1. Structure 27/32 + 27/32 + break 10 + 22/35 + 22/35. | **Answered.** Port 1:1 to backend `SatScale`. |
| 3 | **Access / quota** | Not covered — profiles are local browser records. | **Open:** product key for SAT (like `PRACTICE_IELTS`) and who gets it. |
| 4 | **Unverified data** | Exam dates: `tools/update_exam_dates.py` + weekly GitHub Action rewrite them from College Board. Colleges: 16 rows `verified:false`, source and year printed. Questions: all `draft`. Vocab: `licenseStatus:'licensed'`, provenance unconfirmed. | **Partly.** Dates → port the job to a backend scheduled task. Owners for colleges / question review / vocab licence still **open**. |
| 5 | **Mobile** | Responsive 360–1320 px; full mock and past papers need ≥ 1024 px, phone shows a note. | **Answered.** |
| 6 | **Explanation language** | Stems and options always English; explanations, distractors, hints in en/ru/kk in the bank; `settings.explainLang` is separate from the UI language. Course lessons English only for now. | **Answered.** |

---

## 3. Decisions (agreed 04.10.2026)

| # | Topic | Decision |
|---|---|---|
| A | **AI** | Build the AI places from Figma as **inert placeholders**: hint button «AI-подсказка» (22), AI suggestion on the error-type step (23), the «AI» side-panel tab with the chat layout and the visible limit (25). They render, are clearly marked «скоро», and do nothing. Written hints from the bank work fully. Functionality later, behind a flag `SAT_AI` and server routes `src/app/api/sat/*`. |
| B | **«Добавить результат»** (35) | ~~Not built~~ **Replaced 14.10.2026 (D2, `SAT-SYNC-PLAN.md`):** manual Bluebook / official SAT scores are back — «Результаты» table in «Пробники» (phase 11). Old prototype entries are not imported. |
| C | **Navigation** | Figma's 7 tabs + **Материалы** and **Ошибки**. Roadmap = a view of «План», Desmos guide inside «Гайд». |
| D | **Screens without a Figma design** | Built in the platform style from the prototype layouts, and **marked for your design review** (see 3.1). |
| E | **Visual style** | Figma «JTS clone»: Manrope, rounded corners, violet accent, R&W blue / Math pink; SAT follows the platform theme (light by default) and keeps the platform sidebar and the hub tabs. The «TeenTech SAT» brand of 14.10.2026 (D1: forced dark theme, yellow accent, own nav, breadcrumbs, cap logo) was **removed on 15.10.2026** — SAT is back to JTS style; the new screens are reached from the hub tabs and buttons. |
| F | **Plan default view** | Month first, then Week; Roadmap as the third view. |
| G | **Accounts** | Platform accounts; no import of prototype local profiles. |

### 3.1 How «not in Figma» is marked

Each phase report in the chat lists, in a separate highlighted block, every screen or element built without a Figma
frame, with the prototype file it was adapted from. In the code the component starts with a comment
`// Нет в Figma: адаптация прототипа <file>` — only as a pointer, nothing is drawn on screen.

| Screen / element | Prototype source | Phase | Design status |
|---|---|---|---|
| Материалы — list of 36 units by month | `materials.js`, `programme*.js` | 8 | **⚠ not in Figma — needs review** |
| Lesson page (full-window unit, side panel, tools) | `lesson.js` | 8 | **⚠ not in Figma — needs review** |
| Whiteboard window | `whiteboard.js` | 8 | **⚠ not in Figma — needs review** |
| Daily check (5 questions) + Today card + nudge | `daily.js` | 6 | **⚠ not in Figma — needs review** |
| Ошибки — error log | `errors.js` | 6 | **⚠ not in Figma — needs review** |
| Past papers (list on Пробники, run, review without teaching layer) | `mock.js`, `papers.js` | 7 | **⚠ not in Figma — needs review** (run reuses screens 29–34) |
| Vocabulary hub + Match / Sentence / Register games + My words | `vocab.js`, `vocab-games.js` | 9 | **⚠ not in Figma — needs review** (cards = screen 18) |
| Practice «weak skills» view | `practice.js` (`#/practice/weak`) | 6 | **⚠ not in Figma — needs review** |
| Settings for SAT (explanation language, daily vocab goal) inside the platform profile | `settings.js` | 2 | **⚠ not in Figma — needs review** |
| First-visit tours | `tours.js` | later | not planned for v1 |

## 4. Target structure

### jts-web-app

```
src/sat/
  ui/              SectionChip (R&W/Math), MasteryBadge, DomainBar, StarRow … (generic ones reused from src/ielts/ui)
  model/           pure logic under vitest, ported from core.js: mastery (6 independent attempts), planner
                   (phases, lessons, month/week), SM-2, SPR answer format check (display only), session summary,
                   daily-check picker (date+user seed), college bands
  onboarding/      6 chapters from sat-info data (also rendered by «Гайд»)
  diagnostic/      start, runner, report (3 bands, 2 priorities), availability
  question/        shared Bluebook layout: QuestionLayout, PassagePane (whole-word highlight, reuse ielts highlights),
                   AnswerChoices, SprInput, Navigator, Timer (wall-clock), DesmosDock, help layer (study mode only)
  study/           session runner, hints, explanation panel, error type, «similar without help», summary
  practice/        session builder + weak skills
  plan/            roadmap (SVG road), month, week, lesson dialog
  mock/            simulation (4 modules, routing, break, review-before-submit), result range, review, past papers
  daily/           daily check
  errors/          error log
  course/          materials (36 units), lesson page, whiteboard
  progress/        skill heatmap, accuracy by domain, mock trend, study time, calendar, badges
  vocab/           hub, cards (SM-2), match, sentence, register, my words, «+» add-word
  guide/           exam guide + Desmos guide
  ai/              inert AI placeholders (decision A)
  tabs/            hub tabs
src/screens/       SatPage (hub, ?screen=sat&satTab=…), SatOnboardingPage, SatDiagnosticPage, SatStudyRunPage,
                   SatMockRunPage (≥1024 px), SatMockReviewPage, SatLessonPage
src/api.js         *Sat* client functions for /mobile/sat/**
src/sat.css        4th global CSS file, ielts.css conventions
```

AI (decision A): v1 has only the placeholders in `src/sat/ai/` (AiHintButton, AiErrorSuggestion, AiTutorPanel —
layout from Figma 22/23/25, inert, marked «скоро»). The working version later: flag `SAT_AI`,
`src/app/api/sat/{hint,error-type,tutor}` + `src/lib/sat/`, daily budget like `arcadeBudget`.

### backend — `modules/sat`

```
model/       SatQuestion (jsonb doc, skillId, section, kind bank|paper|lesson, status), SatPaper, SatAttempt
             (per question: answer, helpType, timeSec, errorType), SatSession, SatProfile (target, date, availability,
             explainLang, plan), SatReviewItem (errors due in 3 days), SatVocabState (SM-2), SatMockRun
grading/     SatAnswerChecker (mcq + SPR equivalence 1e-6, Digital SAT entry rules), SatScale (estimate above)
service/     SatDocument (port of JTS.bank.validateAll), SatImportService, SatLearnerService (check, sessions),
             SatDiagnostic, SatPlanner, SatMastery, SatMockService (routing 60 %, wall clock, no-repeat in run),
             SatVocabService, SatDailyService, SatExamDatesJob (weekly, port of update_exam_dates.py)
media/       reuse the IELTS MinIO/local storage pattern; images by content hash
controller/  /mobile/sat/**, /admin/sat/**
docs/sat/    TEST_FORMAT.md (the item schema above, as JSON), TAXONOMY.md
migration    V3xx__Create_sat_*.sql
```

Keys stay server-side: study mode checks one question at a time, exam/diagnostic/mock submit whole modules. Paper
items never leak into practice (`kind` filter, as `JTS.bank.query`).

### web-admin — `feature/system/sat-questions`

List with filters (skill, kind, status), JSON import of the prototype files' content (single / bundle), editor with
history (replaces `admin.html` overlay), media panel, review-status workflow (draft → reviewed). Small editors for
colleges and a read-only view of exam dates (they update themselves).

### Data migration (one-off script, like `seed-local.js` for IELTS)

`tools/export-bank.js` in the prototype repo: load `js/data/*` in `node:vm` (as done for this plan), write JSON
bundles per domain; upload the 12 856 referenced PNGs + 134 inline base64 images to MinIO by hash and rewrite `src`.
Skip unreferenced PNGs.

---

## 5. Phases

One part at a time; each ends with tests, a check against Figma (or the prototype for undesigned screens), and your review.

| Phase | Scope | Figma | Done when |
|---|---|---|---|
| **0. Formats** | TEST_FORMAT, TAXONOMY, export script; decisions A–G | — | Bank exports to JSON, validator passes |
| **1. Backend + admin** | Tables, import, validator, `/check`, sessions/attempts, media; admin list/import/edit; local seed of 3 123 items | — | Bank imports locally; mcq and SPR checked server-side |
| **2. Shell + onboarding + guide** | Sidebar item, SatPage tabs, onboarding 1–6 (colleges bands, exam-date sheets), guide | 1–6, 19 | Profile saved; frame hidden until the plan exists |
| **3. Question layout** | Bluebook layout, navigator, wall-clock timer, highlighter, SPR input, Desmos dock | 8, 26, 27 | Reused unchanged by 4, 5, 7 |
| **4. Diagnostic → plan** | Diagnostic, report, availability, planner, roadmap/month/week | 7–10, 12–14 | Plan built and rebuilt on retake |
| **5. Study mode** | Hints, explanation panel, error type, 3-day return, «similar without help», summary; AI placeholders | 21–25, 28 | Mastery moves only on independent work; AI parts visible and inert |
| **6. Daily** | Today, practice builder, daily check, error log, progress | 11, 15, 17 | Today shows one next action |
| **7. Mocks** | Simulation, routing, break, review-before-submit, result range, review, past papers (no screen 35) | 16, 29–34 | Full mock end-to-end on ≥1024 px |
| **8. Course** | Materials, lesson page, whiteboard, lesson sets | — | U1–U24 readable, U1/U2 sets work |
| **9. Vocab + Desmos guide** | SM-2 cards, three games, my words, «+», Desmos guide | 18, 20 | Games do not touch SM-2 |

---

## 6. Rules carried over

From the prototype's acceptance criteria and IELTS: no predicted SAT score anywhere (only the labelled range);
exam/diagnostic/daily/paper modes render no help elements at all; wall-clock timers stored as `endsAt`; a reload
restores answers, marks, time and position; help-assisted work counted separately; Desmos only in Math; stems
English, explanations in en/ru/kk by `explainLang`; scores always computed from sections; i18n via `t()`, comments
in Russian, no TypeScript, light motion only (`.ih-enter` approach).

## 6a. Phase 0 result (04.10.2026)

`node scripts/sat/export-sat.js` → `build/sat/` (format: `backend/docs/sat/TEST_FORMAT.md`, skills: `TAXONOMY.md`).
Of 3 123 prototype items 2 813 pass validation; 10 070 distinct images, 26 MB. Found in the prototype data:

1. **Provenance — launch blocker.** 2 770 items look taken from the College Board SAT Suite Question Bank: 2 461
   practice items with `meta.source: "SAT Question Bank PDF"` (original ids and pages) and 309 lesson items with
   College Board rationale wording — all labelled `original`. Collected with evidence in
   `jts-sat-platform/college-board-review/` (`collect.js`, `items.csv`, `by-file.md`, `images.txt`, `commits.md`).
   The export holds them back (`heldForReview`) until the owner decides: link-only, rewrite as JTS originals,
   licence, or remove. Without them the bank has **150 practice items, all Math** (PSDA, Advanced, Geometry): the
   September JTS-written R&W (110) and Algebra (40) items were replaced on 04.10 and can be restored from git
   (`9929e2c`, `fb92091`, `93f36d3`).
2. **Duplicate paper.** `paper-01.js` and `paper-02.js` both declare `jts-p2`; paper-01 holds only R&W. The later one is kept.
3. **Lesson sets U3–U24:** 255 items use another skill-id scheme (`math.alg.linear-equations`, `rw.eoi.transitions` …)
   and 7 grid-in answers are not numbers — rejected until mapped / fixed.
4. **Paper 2:** one Math question still points to the removed Absolute-value topic → the whole paper is held back.

## 6b. Phase 1 result (05.10.2026)

- backend `modules/sat`: migration V295 (`sat_questions`, `sat_papers`, `sat_attempts`), `SatDocument` (validator —
  same rules as `scripts/sat/bank-validate.js`), `SatAnswerChecker` (same examples as `src/sat/model/spr.js`),
  `SatTaxonomy` (resource `sat/taxonomy.json`), `SatAdminService` (import / edit / publish / trash, papers with the
  27/27/22/22 shape check), `SatLearnerService`.
- API: `/admin/sat/questions|papers/**` (ADMIN), `/mobile/sat/taxonomy`, `/questions/{id}` (no answer, `hintCount`),
  `/questions/{id}/hints/{n}`, `/questions/{id}/check` (study / lesson only; SPR format error → `formatError`, not
  recorded). Paper questions are never served one by one. Images: shared IELTS media storage, `sat-media:<name>` → URL.
- web-admin «Практика и тесты» → **SAT**: list (filters, pages, publish toggle, trash, papers), import (images,
  bundles, papers), editor (preview + JSON with revision check).
- `backend/scripts/sat/seed-local.js` loads `build/sat` into the local backend: 247 items, 0 errors.

## 6c. Phase 2 result (05.10.2026)

- backend: V296 `sat_profiles` + `/mobile/sat/profile` (GET; PUT saves only the fields sent), tests.
- web-app: sidebar «SAT», hub `?screen=sat` (header with goal and date, 9 tabs), onboarding `?screen=sat-onboarding`
  (Figma 1–6: chapters from `satInfo.json`, goal with middle-50% of 16 universities, exam-date sheets for the next
  12 months, R&W / Math domain shares from the taxonomy), «Гайд» (Figma 19, same chapter components).
  Reference data is static JSON in `src/sat/data/` for now; colleges and exam dates move to the backend later
  (admin-editable, weekly dates job).
- Not in Figma (reported in chat): «Сегодня» before the plan (start / next-step card), tabs «Материалы» and «Ошибки»
  as placeholders, the disabled «Гид по Desmos» switch.

## 6d. Phase 3 result (05.10.2026)

- web-app `src/sat/question/`: the shared Bluebook screen `QuestionScreen` (Figma 8, 26, 27, 29, 30) and its parts —
  `AnswerChoices` (choose / cross out, verdict colours for later phases), `SprInput` (live format check, «Система
  прочитает», entry rules), `NavRail` + `NavDialog` (all questions; `review` variant = module check before submit),
  `QuestionTimer` (soft / hard / count-up, red in the last 5 min), `DesmosDock` (one iframe per run, docked or
  expanded, survives question changes), `ReferenceSheet`, `Directions`, `Scratchpad`, `HtmlBlock` + `highlight.js`
  (whole-word highlighter stored as text offsets).
- State is pure `session.js` (answers, strikes, marks, highlights, per-question time, wall-clock `endsAt`, pause),
  saved on the device by `useSatSession` — a reload restores everything. Modes: `study` / `diagnostic` / `exam`
  decide the tools; help elements are not rendered outside study.
- Sample stand `?screen=sat-run&satSample=study|diagnostic|exam` on 8 key-free bank items (`sample.json`); nothing
  links to it. «Проверить» appears in phase 5 when `study.onCheck` is wired to `/mobile/sat/questions/{id}/check`.
- Not in Figma (reported in chat): pause screen, the Reference / Scratch paper / Directions windows, expanded
  Desmos window and its «blocked» fallback, exit confirmation, the plain «Все вопросы» variant of the Figma 30 window,
  the sample's finish screen.

## 6e. Phase 4 result (05.10.2026)

- backend: V297 `sat_diagnostics` + `sat_plans`; pure `planning/` (`SatMastery`, `SatPlanner`, `SatDiagnosticRules`,
  tests check the Figma 10–13 example), `SatDiagnosticService`, `SatPlanService`, endpoints in `TEST_FORMAT.md` §7.
- web-app: `?screen=sat-diagnostic&satDiag=intro|report|time` — start (Figma 7), 24 questions on the shared screen
  (Figma 8), report (Figma 9), study time (Figma 10); hub «План» — Роудмап / Неделя / Месяц (Figma 12–14) with the
  lesson menu (done, skipped, move, back to plan); «Сегодня» shows the next start step or the next lesson.
- Decisions taken: plan priorities are one domain per section (as Figma 9); no separate «starting phase» — the plan
  opens with its first week's phase (Figma 9 names «Основы» at 42 %, the prototype rule would say «Deep»); no lessons
  on or after the test day; a rebuild keeps the phase of the week instead of restarting at Foundations.
- Not in Figma (reported in chat): «Как это работает» content, the «last time» line on the start screen, the paper
  items note and the «plan is older» notice on the report, «Вернуть в план» in the lesson menu, colours of phases 3–6
  in the month, texts of phases 1 and 3–6, «Сегодня» cards before Figma 11.

## 6f. Phase 5 result (05.10.2026)

- backend: V298 `sat_sessions` + `sat_errors`; `SatStudyRules` (lesson length, picking, similar, help levels, suggested
  error type — tests), `SatStudyService`, check with `sessionId`; diagnostic misses enter the review queue. API —
  `TEST_FORMAT.md` §8.
- web-app: `?screen=sat-study&satLesson=…|satSession=…` — the shared question screen with the help layer: hint
  popover (Figma 22), explanation side panel with distractors and methods (24), error-type step (23), «Похожее»,
  inert AI tutor tab (25, decision A), session summary (28). «Начать занятие» / «Начать сейчас» in the plan and on
  «Сегодня» open the lesson; finishing marks it done.
- Help is decided by the server: hints and the solution taken inside a session are recorded and applied at the
  check, whatever the client sends; a question is checked once.
- Not in Figma (reported in chat): the explanation gate before answering, «Предположение» instead of «AI предлагает»
  on the error-type step (it is the prototype's timing rule, not AI), the «similar is solved without help» note, the
  screen shown when a lesson cannot start.

## 6g. Phase 6 result (05.10.2026)

- backend: V299 (daily sessions), `SatStats` (streak, median — tests), `SatInsightsService` (today, progress, error
  log), `SatDailyService`, practice modes and filters in `SatStudyService`. API — `TEST_FORMAT.md` §9.
- web-app: «Сегодня» (Figma 11), «Практика» (15), «Прогресс» (17), «Ошибки» and the daily check
  (`?screen=sat-daily`); streak chip in the hub header.
- Not in Figma (reported in chat): «Ошибки» tab, daily check screen and its Today card, the error-log manual
  «Разобрано», the difficulty filter split into 1/2/3, the vocab card text «скоро» (phase 9), phase colours.

## 6h. Phase 7 result (05.10.2026)

- backend: V300 `sat_mocks`; pure `SatMockRules` (module picking by domain weight and route, ≥ 5 Math grid-ins, the
  60 % routing, the ±40 range, «where the points went» — tests), `SatMockService` (one run at a time, server wall
  clock for modules and the break, idempotent module submit, review after the end). API — `TEST_FORMAT.md` §10.
- web-app: «Пробники» tab (Figma 16: simulation card, trajectory of ranges, results table), `?screen=sat-mock`
  (module on the shared question screen in exam mode — Figma 29, 30; between modules — 31; break — 32; result — 33),
  `?screen=sat-mock-review` (Figma 34). Modules need ≥ 1024 px; the result and the review work on a phone.
- Not in Figma (reported in chat): past papers block and the paper confirmation, the screen before module 1 and the
  «break is over» screen, the «base set» route card, the «not enough questions» and «unfinished mock» notices, the
  narrow-screen gate, phone layout of the results table. Different from Figma: no «Добавить результат» (decision B) —
  the table and trajectory hold JTS runs only; «Добавить навык в план» became «Потренировать навык» (the plan has no
  «add a skill» action); «Отметить» in the review is read-only (marks come from the run).
- Local data: the R&W bank is empty without the College Board items, so the 110 JTS-written R&W items from the
  September commits were seeded **locally only**; paper 2 is held back (one Math question), so a local test paper
  `local-test-p2` (m2 = 21 questions) was inserted straight into the local database.

## 6i. Phase 8 result (05.10.2026)

- Course data: `scripts/sat/build-course.js` turns the export's `programme.json` into `src/sat/data/course.json` (36
  units, 3 months, official Bluebook tests, homework) and `public/sat/course/<code>.json` (the 24 written lessons,
  loaded per unit). `src/sat/model/course.js` (order, months, neighbours, done/current) and the whiteboard model
  `src/sat/course/board.js` are under tests.
- backend: V301 (`kind = 'unit'`, `unit_code` on sessions), `{ unitCode }` start in `SatStudyService`,
  `SatCourseService` + `GET /course`. API — `TEST_FORMAT.md` §11.
- web-app: «Материалы» tab (months, section filter, unit states, Bluebook tests), `?screen=sat-unit&satUnit=…` (full
  window: chips, «что нужно уметь», the lesson part by part with ← →, practice set, homework after the unit,
  neighbours; side rail — whiteboard window, Desmos window on Math units, full screen). The set runs on the study
  screen and returns to its unit.
- **Lesson sets are held back:** all 360 prototype lesson questions are on the College Board review list, so no unit
  has a set yet («набор готовится»). The flow was tested on a **local-only** stand-in set for U1/U2 copied from
  JTS-original bank questions (`localtest-u1-*`, `localtest-u2-*`).
- Not in Figma (all of phase 8, reported in chat): «Материалы», the unit page, the whiteboard.

## 6j. Phase 9 result (05.10.2026)

- Data: `scripts/sat/build-reference.js` publishes the deck and games (`public/sat/vocab/`) and the Desmos guide with
  en/ru/kk titles (`src/sat/data/desmosGuide.json`).
- backend: V302 (`vocab_goal`, `sat_vocab_cards`, `sat_vocab_words`, `sat_vocab_reviews`), `SatVocabRules` (SM-2 —
  tests), `SatVocabService`. API — `TEST_FORMAT.md` §12.
- web-app: «Словарь» (Figma 18): cards with flip, four grades with «через N» previews, keys 1–4 and space, pronunciation,
  daily goal, «Мои слова» side card and full list with search and filters, «+ Слово»; «Упражнения» (Match, Cloze,
  Register — do not touch SM-2). «Гайд» → «Гид по Desmos» (Figma 20): 23 lessons, «изучено» marks, steps and
  expressions to repeat, calculator on demand, the lesson video with its author's credit. `src/sat/model/vocab.js` under
  tests.
- Not in Figma (reported in chat): «Упражнения» and the three games, the full word list, the add-word form, the empty
  «на сегодня всё» state. Different from Figma: the guide lists the prototype's 23 lessons instead of Figma's 7 groups;
  no «руками ≈10 с / с Desmos ≈35 с» comparison (no such data); «изучено» marks and game scores stay on the device.

## 6k. Phases 10–12 — sync with the prototype HEAD `b9d1797a` (14.10.2026)

Plan: `C:\GitHub\work\jts\SAT-SYNC-PLAN.md` (decisions D1–D4, sections A, B, E). API — `backend/docs/sat/TEST_FORMAT.md`
§1–5, §9–15.

- **Phase 10 — content.** `scripts/sat/export-sat.js` runs the prototype's JSON loaders in `node:vm`: 4 962 questions
  (3 867 bank, 801 lesson, 294 paper), papers `jts-1/2/3` (27/27/22/22; `jts-p2`, `local-test-p2` removed), sets U1–U24
  (15), Challenge Verbal 135, Challenge Math 110, CH11 / CH12 (98 each, `ch12f4-`). ≈3 770 College Board items are
  `licensed`, nothing held back; papers, Challenge and U-sets are still `original` (provenance to confirm). Media: only
  referenced files (29 107), SVG allowed and sanitised. New taxonomy (Advanced Math = expressions / functions /
  nonlinear) in backend and web. «Набор готовится» is gone from «Материалы». Seed: `backend/scripts/sat/seed-local.js
  --publish --overwrite --prune` (needs a backend built from this branch).
- **Phase 11 — features.** Weekly test instead of the daily check (`?screen=sat-weekly`, card on «Сегодня», V342);
  practice-set summary and «Моя статистика» on the dashboard; «Log error» (V344); «Прогресс» tab removed
  (`?satTab=progress` → «Сегодня»); «Результаты» with manual scores (V343); «Past papers» full-screen page
  (`?screen=sat-papers`, no phone tab); full-screen simulation, result 400–1600 vs goal, lost skills, hard simulations
  I/II (CH11/CH12); course road (months fold, topics → unit, diagnostic = Bluebook PT6, month-2 checkpoint = PT9); error
  log as cards, 10 per page; vocabulary «Next» (= Good) and «Words today»; Desmos guide video | calculator.
- **Phase 12 — brand, i18n, access.** ~~TeenTech SAT~~ — brand removed on 15.10.2026, SAT is back to JTS style (decision E above); new keys en/ru/kk in `src/sat/i18nSync.js`.
  Access to IELTS / SAT is opened by an admin in the user card (managers' pages removed); demo accounts get SAT/IELTS
  within demo quotas with a «демо-версия» banner and a clear message when a quota runs out (`TEST_FORMAT.md` §15).
- Not checked yet: the screens in a browser against the prototype (dark theme especially), the seed against a live DB.

## 7. Still needed from you

1. **Access:** ~~no subscription for SAT yet~~ — since 14.10.2026 SAT is open by an admin grant (user card →
   «Доступ к контенту») or within demo quotas (§6k).
2. **Content owners:** who verifies the 16 colleges, reviews the 3 123 draft questions, and confirms the vocabulary
   licence — needed before launch, not before development.
3. **Desmos:** a legal yes on embedding the public calculator in a paid product — needed before launch. The guide's
   lesson videos are a third party's YouTube series (Tutorlini Test Prep), embedded with credit — same question.

Every phase report lists the «Нет в Figma» screens it added (section 3.1).
