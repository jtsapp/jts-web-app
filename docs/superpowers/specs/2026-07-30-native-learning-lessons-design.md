# Нативные уроки раздела «Обучение» (Kingdom lessons)

**Дата:** 2026-07-30
**Ветка (web):** `feat/native-learning-lessons` (от `origin/develop`)
**Репозитории:** `jts-web-app` (основное) + `backend` (эндпоинт прогресса)

## Проблема

Раздел «Обучение» (`LearningPage` → выбор королевства → `KingdomInteriorPage`)
открывает уроки как **hosted Speakout-HTML в `<iframe>`** через прокси-роут
`/api/hl/[...path]`. Чтобы HTML «выглядел нативно», навёрнут стек костылей:

- `transform: scale(.82)` + клип шапки (`CLIP = 205`, `overflow:hidden`);
- `ResizeObserver` + `fitFrame()` — ручная подгонка высоты iframe под контент;
- `postMessage`-мост (`window.parent.postMessage({jts:'lesson',…})`) для экрана
  завершения;
- `LESSON_BRIDGE` в `/api/hl` — инъекция JS в чужой HTML: перекраска XP→монеты,
  вызовы `/mobile/coins/grant` и `/mobile/lives/spend`, чтение `window.__JTS_TOKEN__`;
- прогресс уроков живёт **только** в `localStorage['jts-<level>-done']`, который
  пишет сам hosted-урок.

Хрупко, не адаптивно (реальный Safari ломает подгонку iframe — см. память
`jts-web-app-gotchas`), контент не под контролем приложения.

## Цель

Заменить iframe нативным React-плеером урока, рендерящим задания напрямую из
структурированного JSON. Паттерн — **1:1 как раздел «Грамматика» Практики**
(`GrammarLesson.jsx` + `ActivityPlayer.jsx`, данные из `extract-grammar.js` →
`public/practice/grammar/*.json` → `grammarData.js`).

## Объём (решения владельца)

- **Все 5 уровней** сразу: a1, a2, b1, b2, c1 — 214 уроков.
- **speak-задания** (386 шт) — **не эмитим** в первой версии (пропускаем при
  извлечении; порядок остальных заданий сохраняется).
- **Прогресс — на бэкенде** (синхрон между устройствами и с мобилкой): новый
  эндпоинт + таблица.
- Практику (grammar/vocab/listening/shadowing/reels) **не трогаем**.
- Изменения — ветками + PR в develop, без прямого пуша.

## Источник данных

Hosted-курсы на `files-api.iqra.space/development/speakout/<level>/`:
`index.html` (тропа) + `lessons/L01.html … L46.html`. Локальная идентичная копия —
`~/Desktop/jts-lessons/<level>/`.

Каждый урок инлайнит данные как `window.TASKS = [ {…}, … ]` и медиа как DOM-узлы:
`<audio id="au1" src="data:audio/mpeg;base64,…">`, `<video id="vid1" src="data:video/mp4;base64,…">`.

### Таксономия заданий (из всех уроков)

| type | кол-во | поля | нативный компонент |
|------|-------:|------|--------------------|
| choice | 1146 | `word`, `visual?`(emoji), `options[]`, `answer` | `TaskChoice` (одиночный выбор) |
| gap | 945 | `gapBefore`, `gapAfter`, `answer` (альтернативы через `\|`) | `TaskGap` (ввод текста) |
| chips | 307 | `gapBefore`, `gapAfter`, `answer`, `bank[]` | `TaskChips` (выбор слова из банка) |
| check | 164 | `items[]` | `TaskCheck` (чек-лист, не оценивается) |
| listen | 152 | `tracks: [[id,label],…]` → `<audio id="au{id}">` | `TaskListen` (плеер + продолжить) |
| info/read | 439 | `html` (rich) | `TaskInfo` (рендер rich-блока) |
| watch/video | 62 | `vid` → `<video id="vid{n}">`, `vtitle` | `TaskWatch` (видео + продолжить) |
| ~~speak~~ | 386 | — | **пропускается** |

Общие поля любого задания: `sec` (секция-кикер), `title`, `sub`.

## Архитектура (web)

### 1. Экстрактор — `scripts/extract-kingdom-lessons.js`

По образцу `extract-grammar.js` (Playwright/chromium, читает уже вычисленный JS,
без ручного парсинга строк):

- Для каждого уровня грузит `lessons/L*.html`, читает `window.TASKS`.
- Для `listen`/`watch` резолвит src соответствующего `<audio>/<video>`,
  декодирует base64, пишет файл в `public/learning/media/<level>/<lessonCode>-<id>.<ext>`,
  заменяет ссылку в JSON на путь.
- Пропускает `type:'speak'`.
- Грузит `index.html` уровня, читает тропу (`window.ALL` — порядок кодов уроков,
  метаданные узлов) → список уроков уровня.
- Пишет:
  - `public/learning/index.json` — `{ levels:[{code,label,lessonCount}], <level>:{ lessons:[{code,title,order}] } }`
  - `public/learning/<level>.json` — `{ lessons:{ "<code>":{ title, sec-группировка, tasks:[…нормализованные…] } } }`
- Запуск: `node scripts/extract-kingdom-lessons.js [--src <base>]` (default —
  локальная копия `~/Desktop/jts-lessons`, `--src https://files-api…` для upstream).
- Идемпотентен: чистит `public/learning/` перед записью.

### 2. Слой данных — `src/learning/lessonData.js`

По образцу `grammarData.js`: ленивая загрузка `<level>.json` c кэшем в модуле;
`loadLearningLevel(level)`, `getLessonCatalog()`.

### 3. Плеер — `src/learning/LessonPlayer.jsx` + `src/learning/tasks/*`

- `LessonPlayer` — очередь заданий, HUD (прогресс + сердца), футер
  («Проверить»/«Продолжить» + фидбэк верно/неверно), gating кнопки.
  Логику сердец/монет/фидбэка переиспользуем из `ActivityPlayer.jsx` (общий
  хук/компонент, вынести переиспользуемое).
- Компоненты заданий (`tasks/TaskChoice.jsx`, `TaskGap.jsx`, `TaskChips.jsx`,
  `TaskCheck.jsx`, `TaskListen.jsx`, `TaskInfo.jsx`, `TaskWatch.jsx`).
- `check`/`info`/`listen`/`watch` — не оцениваются (кнопка «Продолжить»);
  `choice`/`gap`/`chips` — оцениваются (сердца/монеты как в мосте:
  верно → `/mobile/coins/grant?amount=10`, неверно → `/mobile/lives/spend`).
- Сердца — локальные для урока (3 при входе, как в текущем поведении).
- **Рандомизация** порядка `options`/`bank` на клиенте (в hosted-версии это
  делал `_kShuffleAnswersJs`) — иначе правильный вариант часто первый.

### 4. Экран трейла (тропа уровня)

`KingdomInteriorPage` вместо iframe рендерит нативную тропу уроков уровня из
`index.json` (список узлов с состоянием пройден/текущий/заблокирован),
арт-шапку королевства (уже нативная), кольцо прогресса. Тап по узлу → открыть
`LessonPlayer`. Экраны финиша (success/fail/exit) — **уже нативные** в этом
файле, переиспользуем как есть.

### 5. Чистка

Когда iframe уходит и ни один экран не грузит hosted-HTML:
- удалить `src/app/api/hl/[...path]/route.js` (прокси + `LESSON_BRIDGE`);
- убрать из `KingdomInteriorPage` весь iframe-стек (`fitFrame`, `ResizeObserver`,
  `postMessage`-listener, `scale/clip` CSS, `getPracticeToken`→`window.__JTS_TOKEN__`).

## Архитектура (backend) — прогресс уроков

Сейчас на бэкенде только `POST /mobile/lesson-modules/complete?xp=` (начисляет
монеты/стрик, но **не** помнит, какой урок пройден). Нужен per-lesson прогресс.

- **Миграция:** таблица `lesson_module_progress` (`user_id`, `module_id`,
  `lesson_code`, `completed_at`), уникальность `(user_id, module_id, lesson_code)`.
- **Эндпоинты** (в `LessonModuleController`, `/mobile/lesson-modules`):
  - `POST /{moduleId}/lessons/{code}/complete` → отметить пройденным
    (идемпотентно), опц. начислить монеты/стрик как сейчас.
  - `GET /{moduleId}/progress` → `{ done:[<code>,…], total }`.
- Web: `src/api.js` — `getLessonProgress(token, moduleId)`,
  `completeLesson(token, moduleId, code, xp)`. `LessonPlayer` вызывает complete
  на финише; `KingdomInteriorPage`/`LearningPage` читают прогресс из API вместо
  `localStorage`. `countProgress`/кольцо — на данных API.
- **Совместимость:** одноразовая миграция локального `localStorage['jts-<level>-done']`
  в бэкенд при первом заходе (best-effort), чтобы не потерять прогресс ранних юзеров.

## Тестирование

- **Экстрактор:** unit-тест на нормализацию одного реального `TASKS`-объекта каждого
  типа → ожидаемый JSON (фикстуры из a1/L01); проверка пропуска `speak`; проверка
  резолва медиа-id. Прогон по всем 214 → assert: 0 упавших уроков, счётчики типов
  совпадают с исходными (минус speak).
- **Плеер:** тесты каждого `Task*` компонента (рендер, выбор, верно/неверно,
  gating кнопки), тест `LessonPlayer` (очередь, сердца до 0 → fail, финиш → complete).
- **Прогресс:** backend — тест идемпотентности complete + GET; web — мок API,
  кольцо/тропа отражают `done`.
- Реальный Safari-прогон тропы и урока (`open -a Safari` на стенде) — вёрстка
  адаптивна без iframe-костылей (см. память `jts-web-app-gotchas`).
- `npm run build` зелёный.

## Порядок (для плана)

1. Экстрактор + данные всех 5 уровней + тесты нормализации.
2. Плеер + Task-компоненты + тесты (на извлечённых данных).
3. Нативная тропа в `KingdomInteriorPage`, подключение плеера (iframe пока рядом
   под флагом — для сверки).
4. Backend: миграция + эндпоинты прогресса + тесты (PR в backend/develop).
5. Web: подключить прогресс к API, убрать localStorage-зависимость.
6. Удалить iframe/`/api/hl`/мост, финальная чистка, Safari-проверка, PR в develop.

## Открытые допущения

- `index.html` тропы каждого уровня отдаёт `window.ALL`/узлы в парсимом виде для
  всех 5 уровней (проверить на a2–c1 в шаге 1; если формат разнится — обработать).
- `gap.answer` с `|` — принимаем любую из альтернатив (регистронезависимо, trim).
- Монеты/стрик на per-lesson complete — сохраняем текущее поведение
  (`/mobile/coins/grant`), не меняем экономику.
