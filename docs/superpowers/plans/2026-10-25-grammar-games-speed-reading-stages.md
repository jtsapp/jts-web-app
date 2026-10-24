# «Грамматика · игры» и «Скорочтение» — план по этапам

> **Для исполнителей:** это план верхнего уровня (этапы, задачи, файлы, тесты, «готово, когда»).
> Перед началом каждого этапа под него пишется подробный план по TDD с кодом — по навыку
> superpowers:writing-plans, файлом `docs/superpowers/plans/2026-10-25-<этап>.md`. Выполнение —
> superpowers:subagent-driven-development; ревью одно, в конце этапа, на репозиторий.
> Подробные планы не пишутся заранее, потому что ответы на допущения Д1–Д17 могут поменять
> детали этапов.

**Цель:** два новых раздела «Практики» по ТЗ v1.1 от 24.10.2026: «Грамматика · игры» (125 тем,
правило + 11–13 игр) и «Скорочтение» (телесуфлёр, образец озвучки, запись, итог).

**Архитектура:** материал, прогресс и монеты — на бэкенде (модули `grammargames`,
`speedreading`), правка — в web-admin, на сайте движки прототипов почти дословно в Shadow DOM.
Спека: `docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md`.

**Стек:** Spring Boot + Flyway + MinIO (бэкенд), Angular (web-admin), Next.js SPA на JavaScript
+ vitest + Playwright (сайт), ElevenLabs `/with-timestamps` (образцы), Azure/Soniox через
`/api/transcribe` (распознавание).

## Общие ограничения

- Сайт — только JavaScript (`.js`/`.jsx`), без TypeScript и без новых зависимостей npm.
- Комментарии — по-русски и объясняют «почему».
- Старую «Грамматику» (`src/practice/grammar/`, `public/practice/grammar/`) не трогаем.
- IELTS не трогаем: `src/ielts/speaking/useRecorder.js` не правим и не переносим.
- Монеты начисляет только бэкенд; потолок одного правила монет — 10 (Д1), только прирост
  лучшего результата (Д2).
- Ошибки игр не сохраняются и никуда не отправляются (решение 25.10).
- Записи скорочтения не уходят на сервер (Д6). На сервер уходят цифры попытки, а WAV — только в
  `/api/transcribe`, который ничего не хранит.
- Строки интерфейса — ru/kk/en в `src/i18n.jsx`; новый `font-family` → строка в `src/kk-font.css`
  или `inherit` в тени (`kkFont.test.js`).
- Моки POST в e2e — глоб со `**` на конце (`'**/mobile/grammar-games/result**'`).
- e2e — одним воркером, через обёртку системного Chrome.
- Env читаются с вырезанием BOM.
- Каждый раздел — свой PR в каждом репо и свой отчёт со снимками в PR сайта.
- Номер миграции сверять с develop перед мержем.
- Порядок мержа внутри раздела: бэкенд → web-admin → сайт.

## Карта файлов

**Бэкенд** (`Desktop/backend-grammar-games`, ветка `feat/grammar-games`; затем
`Desktop/backend-speed-reading`, `feat/speed-reading`):

```
src/main/resources/db/migration/V411__Grammar_games.sql              (номер — свободный на момент мержа)
src/main/resources/db/migration/V412__Speed_reading.sql
src/main/java/kz/education/server/modules/grammargames/            (точный список — в плане этапа 1)
  model/GrammarGameTopic.java, GrammarGameMeta.java, GrammarGameProgress.java   — сущности
  repository/*Repository.java
  service/GrammarGamesHtmlParser.java    — const LEVELS/PROGRAM/TOPICS/GLOSS из html
  service/GrammarGamesZip.java           — zip формата ТЗ (L<n>/<NN>.json): чтение и запись
  service/GrammarTopicValidator.java     — правила проверки темы (спека A1, п. 2)
  service/GrammarGameStages.java         — stagesOf, coinsFor, coinsDelta
  service/GrammarGamesUploadService.java — upsert тем, meta, сброс кэша
  service/GrammarGamesCatalogService.java — список/тема/словарь ученику с кэшем в памяти
  service/GrammarGamesAdminService.java  — список, правка, видимость, выгрузка
  service/GrammarGamesProgressService.java, GrammarGamesRewards.java — прогресс, монеты, XP, стрик
src/main/java/kz/education/server/presentation/{admin,mobile}/grammargames/controller/ — ручки
src/main/java/kz/education/server/modules/practice/coins/
  PracticeCoinRule.java, PracticeCoinRuleRepository.java, PracticeCoinRulesService.java
src/main/java/kz/education/server/presentation/admin/practice/controller/AdminPracticeCoinRulesController.java
src/main/java/kz/education/server/modules/speedreading/
  SpeedReadingText.java, SpeedReadingAttempt.java, *Repository.java
  SpeedReadingTextService.java     — CRUD, импорт, хэш образца
  SpeedReadingAttemptService.java  — проверка попытки, монеты раз в день на текст
  SpeedReadingSampleService.java   — claim / приём образца, MinIO
  StudentPracticeSummaryService.java
  controller/SpeedReadingMobileController.java, SpeedReadingAdminController.java,
  SpeedReadingIntegrationController.java
docs/practice/GRAMMAR_GAMES.md, docs/practice/SPEED_READING.md
```

**web-admin** (`Desktop/web-admin-grammar-games`, затем `Desktop/web-admin-speed-reading`):

```
src/app/core/services/grammar-games.service.ts, practice-coin-rules.service.ts, speed-reading.service.ts
src/app/core/models/dtos/grammar-games.dto.ts, speed-reading.dto.ts, student-practice-summary.dto.ts
src/app/feature/system/grammar-games/        — страница: заливка, уровни, тема, монеты
src/app/feature/system/speed-reading/        — страница: тексты, форма, импорт
src/app/feature/system/my-students/student-activity/  — блок «Практика» (правка)
src/app/feature/system/practice/practice.component.ts — две карточки (правка)
src/app/feature/system/system.routes.ts       — два маршрута (правка)
```

**Сайт** (`.claude/worktrees/grammar-games`, затем `.claude/worktrees/speed-reading`):

```
data/jtsgrammar-games.html, data/jts-student-cabinet.html          — прототипы
scripts/grammar-games/extract-assets.js, extract-oracle.js, make-fixture.js
scripts/speed-reading/export-texts.js, extract-oracle.js
public/practice/grammar-games/img/*.webp, emoji/*.webp, emoji/index.json
src/practice/grammar-games/engine.js, styles.js, stages.js, emoji.js, voice.js, levelOf.js
src/practice/grammar-games/__fixtures__/prototype-mini.html, bundle.json, oracle.json
src/practice/grammar-games/*.test.js
src/screens/GrammarGamesPage.jsx, src/screens/grammar-games/useGrammarGamesData.js
src/practice/speed-reading/engine.js, styles.js, rules.js, recorder.js
src/practice/speed-reading/__fixtures__/oracle.json, *.test.js
src/lib/speedReading/sample.js (+ sample.test.js)
src/app/api/practice/speed-reading/sample/route.js (+ route.test.js)
src/screens/SpeedReadingPage.jsx, src/screens/speed-reading/useSpeedReadingData.js
правки: src/api.js, src/App.jsx, src/screens/practice/practiceTabs.js, src/screens/PracticePage.jsx,
        src/i18n.jsx, src/lib/speech.js (onTime), src/lib/assistant/destinations.js, src/kkFont.test.js,
        CLAUDE.md, .env.example
tests/grammar-games.spec.js, tests/speed-reading.spec.js
```

---

## Этап 0. Подготовка (≈ 0,5 ч)

- [ ] Worktree от свежего `origin/develop` во всех трёх репо (`feat/grammar-games`). Соседние
  репо на диске отстают на сотни коммитов. Worktree бэкенда — в `Desktop/`, не в
  `jts-web-app/.claude/worktrees` (там хук режет правки).
- [ ] Прототипы — в `data/jtsgrammar-games.html` и `data/jts-student-cabinet.html` сайта (копии
  файлов от 25.10, sha256 — в описании PR).
- [ ] Сверить последний номер миграции в develop бэкенда (на 25.10 — V410).
- [ ] Подробный план этапа 1 — `docs/superpowers/plans/2026-10-25-grammar-games-backend.md`.

**Готово, когда:** три чистые ветки, прототипы в `data/`, подробный план этапа 1 есть.

## Этап 1. «Грамматика · игры» — бэкенд (≈ 4–5 ч, PR в backend)

Зависит от: этапа 0. Можно параллельно с этапом 3 (сайт работает на фикстуре).

- [ ] **1.1 Миграция и сущности.** Таблицы `grammar_game_topics`, `grammar_game_meta`,
  `grammar_game_progress`, `practice_coin_rules` с сидом `grammar-games.<игра>` (pick 2, match 2,
  sort 2, build 2, trans 2, fix 2, place 2, type 3, dialog 3, listen 2, race 2, catch 2, boss 5).
  Тест: сущности ↔ таблицы (тот же приём, что у `listen`).
- [ ] **1.2 Разбор файла.** `GrammarGamesHtmlParser` (через `JsLiterals`, только строки `const
  X=`) и `GrammarGamesZip` (чтение и запись). Тесты: html, собранный тестом; zip; нет блока → понятная
  ошибка; потолки архива (400 файлов, 20 МБ в распакованном виде), посторонние файлы (__MACOSX, README)
  пропускаются. Подробный план этапа — `2026-10-25-grammar-games-backend.md`.
- [ ] **1.3 Проверка темы.** `GrammarTopicValidator` — каждое правило спеки (A1, п. 2): свой тест
  на «проходит» и на «падает с текстом тема · поле · что». Необязательный тест по
  `GRAMMAR_GAMES_HTML`: 125 тем настоящего прототипа без ошибок.
- [ ] **1.4 Заливка.** `GrammarGamesUploadService` + `POST /admin/grammar-games/upload` (ADMIN,
  CONTENT_MANAGER). Тесты: upsert, `hidden` не меняется, отсутствующие в файле темы остаются,
  ошибка проверки ничего не пишет, кэш сброшен, ответ со счётчиками.
- [ ] **1.5 Админка.** Список по уровню, тема, `PUT` с проверкой, `PATCH hidden`, выгрузка zip
  (обратно читается тем же `ZipReader` — тест «выгрузил → залил → ничего не поменялось»),
  `GET/PUT /admin/practice/coin-rules` (0–10, неизвестный ключ → 400).
- [ ] **1.6 Ученику — чтение.** `GET /mobile/grammar-games` (404 до заливки, скрытых нет),
  `/topics/{id}` (скрытая → 404), `/gloss`, `/progress`; кэш в памяти.
- [ ] **1.7 Результат и монеты.** `GrammarGameStages.stagesOf/coinsFor/coinsDelta` и `POST
  /mobile/grammar-games/result`. Тесты: первая игра 2★ → 2 монеты; повтор 2★ → 0; 3★ после 2★ →
  +1 (при лимите 2 — 0); бой 1★ → 5, повтор → 0; лимит из `practice_coin_rules`; чужая игра
  (`place` у темы без `place`) → 400; скрытая тема → 404; `stars` 4 → 400; описание транзакции
  «Грамматика · игры: <тема> · <игра>»; стрик отмечен.
- [ ] **1.8 Документ** `docs/practice/GRAMMAR_GAMES.md`: формат zip, правила проверки, ручки,
  правила монет.

**Готово, когда:** тесты модуля зелёные; локальная заливка `data/jtsgrammar-games.html` даёт
125 тем без ошибок; PR открыт; номер миграции сверен.

## Этап 2. «Грамматика · игры» — web-admin (≈ 2–3 ч, PR в web-admin)

Зависит от: ручек этапа 1 (контракт из спеки, можно начинать параллельно).

- [ ] **2.1 Сервисы и модели:** `grammar-games.service.ts` (upload, list, get, put, patch,
  export), `practice-coin-rules.service.ts`.
- [ ] **2.2 Страница и карточка** в «Практика и тесты», маршрут с `roleGuard(['ADMIN',
  'CONTENT_MANAGER'])`.
- [ ] **2.3 Заливка:** выбор `.html`/`.zip`, итог (счётчики, ошибки, предупреждения).
- [ ] **2.4 Уровни и темы:** вкладки L1–L5, строки тем, «скрыть / показать».
- [ ] **2.5 Тема:** JSON-редактор (`appAutoGrow`), «Проверить» и «Сохранить» с ошибками бэкенда,
  «Открыть на сайте» (адрес сайта стенда — из `environment`, рядом с адресом API).
- [ ] **2.6 Выгрузка zip и панель «Монеты за игру»** (13 полей, 0–10).
- [ ] Тесты `npx ng test` на сервисы и на сохранение темы с ошибкой.

**Готово, когда:** ng-тесты зелёные; на локальном бэкенде заливка, правка, скрытие и монеты
работают; PR открыт.

## Этап 3. «Грамматика · игры» — сайт (≈ 8–10 ч, PR в jts-web-app)

Зависит от: этапа 0. Мерж — после этапов 1 и 2.

- [ ] **3.1 Статика.** `scripts/grammar-games/extract-assets.js` → маскоты и 563 эмодзи в
  `public/practice/grammar-games/`; `emoji.js` (символ → адрес, флаг `EMOJI_IMAGES`, Д8). Тест:
  у каждого эмодзи из `index.json` есть файл, сирот нет.
- [ ] **3.2 Фикстура и оракул.** `make-fixture.js` (L1-01, L1-10, L2-22, L5-01, движок байт в
  байт) → `prototype-mini.html` и `bundle.json`; `extract-oracle.js` → `oracle.json` (`stagesOf`,
  пороги звёзд, наборы `type/listen/race/boss` при фиксированном `Math.random`, поиск перевода,
  шаги «Гонки»).
- [ ] **3.3 Движок: оболочка.** `engine.js` — `mountGrammarGames(root, cfg) → destroy`: данные
  через `cfg`, хаб с уровнями, правило (карточки, окно карточки, таблицы, ошибки), окно слова
  (перевод, озвучка, «В словарь»), звуки, тосты и конфетти внутри тени; `styles.js` с
  `inherit`; `levelOf.js` (Д11). Тесты: сторож глобалов (`location`, `document.body`),
  `styles.test.js`, `levelOf.test.js`, поиск перевода против оракула.
- [ ] **3.4 Движок: 10 базовых игр** (`pick, match, build, trans, fix, type, dialog, listen` +
  `sort`, `place` с перетаскиванием пальцем), экран результата, `cfg.onResult`,
  `cfg.onAnswer`. `stages.js` — `stagesOf` и пороги звёзд отдельным модулем. Тест против оракула.
- [ ] **3.5 Движок: анимации** — «Гонка», «Лови правильное», «Финальный бой» с Декстером и
  Спарком; таймеры через счётчик поколений, `destroy` гасит всё.
- [ ] **3.6 Проход всех тем.** Тест на `node:vm` с настоящими 125 темами из
  `data/jtsgrammar-games.html`: каждая игра каждой темы верными ответами доходит до результата
  без исключений.
- [ ] **3.7 Экран и данные.** `api.js` (5 функций), `useGrammarGamesData.js` (guest / missing /
  error / ready), `GrammarGamesPage.jsx` (`data-source`, повтор неотправленного `result`),
  `voice.js` (`/api/tts` голосом `gb`, `onFail` → голос устройства), ветка в `App.jsx`,
  `navStack`.
- [ ] **3.8 Место в «Практике».** `practiceTabs.js` (`grammarGames` после `grammar`),
  карточка в `PracticePage.jsx`, `practice.grammarGames.*` ru/kk/en, строка в
  `destinations.js` (тест `destinations.test.js`), `kkFont.test.js` (ENGINES).
- [ ] **3.9 E2E и отчёт.** `tests/grammar-games.spec.js` по спеке (путь ученика, гость, «раздел
  готовится», 360 px, консоль без ошибок); отчёт-артефакт со снимками (хаб, правило, окно
  карточки, окно слова, сетка игр, «Гонка», «Бой», результат, телефон) ссылкой в PR.
- [ ] **3.10 CLAUDE.md** — абзац о разделе.

**Готово, когда:** `npm run build`, `npm run lint`, `npm test`, e2e зелёные (кроме известных
красных на develop); отчёт в PR.

## Этап 4. «Скорочтение» — бэкенд (≈ 3–4 ч, PR в backend)

Зависит от: этапа 1 (`practice_coin_rules`) — мержится после него.

- [ ] **4.1 Миграция и сущности:** `speed_reading_texts`, `speed_reading_attempts`, строка
  `speed-reading` = 4.
- [ ] **4.2 Тексты админки:** CRUD, новый — скрытым, slug со случайным хвостом, импорт массива
  `SR_TEXTS`, `sample_hash` = sha256(`voice\nbody`), текст не длиннее 225 слов. Тесты: импорт
  создаёт и обновляет, правка текста делает образец устаревшим, 226 слов → 400.
- [ ] **4.3 Ученику:** `GET /mobile/speed-reading/texts` (образец — только актуальный),
  `POST /attempts` (проверка полей, монеты раз в сутки на текст по часовому поясу ученика),
  `GET /attempts`. Тесты: каждая проверка; вторая попытка дня → 0 монет; ★0 → 0; на следующий
  день — снова монеты.
- [ ] **4.4 Образцы:** `x-integration-key`, `sample-claim` (готов / выдан / 409 моложе 90 с),
  `PUT sample` (mp3 по сигнатуре, MinIO `practice/speed-reading/<sha24>.mp3`, отказ при
  сменившемся хэше), `SECTIONS += "speed-reading"`.
- [ ] **4.5 Сводка для преподавателя:** `GET /admin/students/{id}/practice-summary` — роли и «свой
  ученик» (чужой → 403), попытки + звёзды грамматики по уровням.
- [ ] **4.6 Документ** `docs/practice/SPEED_READING.md`.

**Готово, когда:** тесты модуля зелёные; локально импорт 8 текстов и попытка с монетами; PR
открыт.

## Этап 5. «Скорочтение» — web-admin (≈ 2 ч, PR в web-admin)

- [ ] **5.1 Страница «Скорочтение»:** список, форма (ru/kk/en, уровень, эмодзи, голос, текст со
  счётчиком слов), скрыть, порядок, «Импорт JSON», статус образца, «Открыть на сайте».
- [ ] **5.2 Карточка ученика:** блок «Практика» в `student-activity` (попытки таблицей, звёзды
  грамматики по уровням).
- [ ] Тесты `npx ng test`.

**Готово, когда:** ng-тесты зелёные; на локальном бэкенде импорт, правка и сводка ученика
видны; PR открыт.

## Этап 6. «Скорочтение» — сайт (≈ 6–8 ч, PR в jts-web-app)

Зависит от: этапа 3 (общие правки `practiceTabs`, `i18n`, `App` уже в develop).

- [ ] **6.1 Тексты и оракул.** `scripts/speed-reading/export-texts.js --html
  data/jts-student-cabinet.html` → `build/speed-reading/texts.json` (для «Импорт JSON»);
  `extract-oracle.js` → `__fixtures__/oracle.json` (`srAlign`, звёзды, темп, длительности).
- [ ] **6.2 Правила.** `rules.js` + `rules.test.js` против оракула; скорости — ровно семь.
- [ ] **6.3 Голоса.** Подобрать на слух два британских голоса ElevenLabs (женский, мужской):
  сделать образцы одного текста 3–4 голосами в `build/speed-reading/voices/` и отдать
  владельцу на выбор; выбранные — в `SPEED_READING_VOICES`. Проверить вручную ударения в
  «Charyn Canyon», «Almaty», «Astana».
- [ ] **6.4 Образец.** `src/lib/speedReading/sample.js` (`/with-timestamps`,
  `wordsFromAlignment`, `wpm`) + тест; роут `/api/practice/speed-reading/sample` (claim → синтез
  → PUT; 202 на занятый; 503 без ключа) + тест с подменённым `fetch`; `.env.example`
  (`SPEED_READING_KEY`).
- [ ] **6.5 Звук.** `speech.js`: опция `onTime(currentTime)` у `playUrl`; тест, что кадры идут
  только пока звук играет и прекращаются на `onEnd`/обрыве.
- [ ] **6.6 Запись.** `recorder.js`: MediaRecorder → `blobToWav16kMono`, потолок 3 мин, `stop`
  отпускает дорожки; тест на заглушке MediaRecorder.
- [ ] **6.7 Движок.** `engine.js` + `styles.js`: старт (тексты, скорости, подпись темпа), образец
  с подсветкой и прокруткой, отсчёт 3-2-1, телесуфлёр, живая подсветка со сторожем «молчит»,
  итог через `/api/transcribe` с откатом на живое распознавание, «Скачать», «Мои попытки»,
  экран «нет микрофона» и демо; `destroy` гасит всё.
- [ ] **6.8 Экран и место.** `api.js` (тексты, попытка, список), `useSpeedReadingData.js`,
  `SpeedReadingPage.jsx`, `App.jsx`, `practiceTabs.js` (`speedReading` после `justListen`),
  карточка с бейджем «Новое», `practice.speedReading.*`, `destinations.js`.
- [ ] **6.9 E2E и отчёт.** `tests/speed-reading.spec.js` (фальшивый микрофон, тихий mp3,
  подменённый `/api/transcribe`, отказ в микрофоне → демо); отчёт со снимками в PR.
- [ ] **6.10 CLAUDE.md** — абзац о разделе.

**Готово, когда:** build, lint, test, e2e зелёные; на локальном бэкенде образец создаётся один
раз и второй раз не синтезируется; отчёт в PR.

## Этап 7. Проверка на деве и приёмка (≈ 2–3 ч + время владельца)

- [ ] Перед заливкой проверить лимит тела nginx перед дев-бэкендом (html 3,9 МБ).
- [ ] Владелец заливает `data/jtsgrammar-games.html` и импортирует
  `build/speed-reading/texts.json` в дев-админке (пароли за владельца не вводим).
- [ ] Проверки по спеке («Выкатка», п. 5): 125 тем; игра до результата; монеты один раз; звёзды
  на втором устройстве; образец создаётся при первом открытии и не создаётся второй раз;
  попытка видна в карточке ученика.
- [ ] Устройства: iPhone Safari (образец, запись, итог через сервер), Android Chrome, ноутбук
  Chrome и Edge, ширина 360 px.
- [ ] Таблица критериев приёмки 1–14 со статусом и снимками — артефактом для владельца.
- [ ] Память проекта: раздел, PR, номера миграций, что проверено вживую.

**Готово, когда:** все 14 критериев отмечены и проверены вживую, либо по каждому непройденному
названа причина.

## Риски

| Риск | Чем грозит | Что делаем |
|---|---|---|
| Движок прототипа завязан на глобальный `document` | утечки и ошибки после ухода с экрана | сторож глобалов в тестах (этап 3.3), `destroy` по счётчику поколений |
| Номер миграции займут, пока PR висит | красный деплой | сверка перед мержем |
| Тайминги ElevenLabs на числах и сокращениях | подсветка «съезжает» | тест `wordsFromAlignment`; ручная проверка 8 текстов |
| Запись в Safari (mp4) → WAV | итог не считается | `blobToWav16kMono` уже проверен IELTS Speaking; ручная проверка на iPhone |
| Ответы на Д1–Д17 придут после начала этапа | переделки | подробный план этапа пишется прямо перед ним |
| Cloudflare на проде рвёт запрос через 100 с | образец не создастся | текст не длиннее 225 слов (проверка бэкенда, этап 4.2), синтез такого текста — секунды |

## Сводка по времени

Работа исполнителя — ориентир, не обещание: этапы 1–3 ≈ 14–18 ч, этапы 4–6 ≈ 11–14 ч, этап 7 ≈
2–3 ч плюс время владельца на заливку и проверку на телефонах. Больше всего неизвестного — в
переносе движка Грамматики (3.3–3.5) и в записи на iPhone (6.6–6.7). Этапы 1 и 3, а также 4 и 6
можно вести параллельно: сайт до мержа работает на фикстуре.
