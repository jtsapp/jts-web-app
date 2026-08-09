# Клиентский workspace живого урока — дизайн (под-проект №1)

Дата: 2026-08-03
Репозиторий: `jts-web-app` (Next.js + React), ветка `feat/lesson-workspace-client` от `develop`.
**Не мержить до явного разрешения пользователя.**

## Контекст и границы

Портируем клиентскую часть живого урока по макету пользователя. Полный проект — 3 под-проекта:
1. **№1 (этот док):** клиентский экран `LessonWorkspacePage` в jts-web-app по макету, на примерном JSON-уроке. Нативные компоненты, без бэкенда/STOMP.
2. №2 (позже): web-admin раздел «Живые уроки» — заливка HTML + экстрактор HTML→JSON (по образцу «Обучения»).
3. №3 (позже): проводка контента web-admin→клиент во время живого урока.

Вне области №1: бэкенд, STOMP/presence, реальное видео (по роадмапу — внешний Meet; плитка звонка — визуальная заглушка), интеграция с существующим `LiveLessonPage` (его не трогаем), web-admin.

Формат JSON-урока в №1 проектируем так, чтобы будущий экстрактор (№2) лёг без переделки клиента.

## Дизайн-токены (из `src/styles.css`)

- Акцент `--purple: #9047ff`; ink `--ink: #171326`; muted `--muted: #8b8a97`.
- Зона-фон `#f4f5f7`; карточка `#fff`, radius 16px, тень `0 2px 8px rgba(0,0,0,0.04)`, бордер `#efeef4`.
- Семантика: верно `#34a853` (bg `#e9f6ee`), неверно `#e5675f` (bg `#fdecec`), gold `#ffad00`.
- Чип-фон `#f0ebff`; линии `#efeef4`/`#f0f0f3`.
- Шрифт Manrope. Заголовок 30/800, секция 15/700, тело 14/muted, лейбл 12–13/800.
- Тёмной темы в репозитории нет — только светлая.

## Роутинг

- Диплинк `?screen=lesson-workspace` (`src/App.jsx`: `case 'lesson-workspace'` в `switch(screen)`, `handleNav` не нужен — вход по диплинку).
- Экран НЕ использует `LearningLayout` (у него своя шапка/раскладка, без общего сайдбара).

## Структура компонентов

Новый каталог `src/screens/workspace/`:
- `LessonWorkspacePage.jsx` — корневой: грузит примерный урок, держит стейт (activeStepId, ответы практики, сообщения чата), раскладка шапка+3 колонки.
- `WorkspaceHeader.jsx` — Logo, бейдж уровня, unit-заголовок, прогресс-точки шагов, таймер, «Выйти из урока».
- `LessonRoute.jsx` — левая колонка «Маршрут урока»: список шагов со статусами (done/current/locked), клик → `onSelectStep`.
- `LessonContent.jsx` — центр: рендерит блоки активного шага через диспетчер по `block.type`.
  - `blocks/BannerBlock.jsx` — фиолетовый баннер с маскот-смайлом (рецепт `.kh-hero`).
  - `blocks/TheoryBlock.jsx` — заголовок, текст, таблица форм, плашка «Частая ошибка».
  - `blocks/PracticeBlock.jsx` — набор заданий + кнопка «Проверить» (batch-check).
    - `practice/ChoiceQuestion.jsx`, `ChipsQuestion.jsx`, `GapQuestion.jsx`.
- `LessonAside.jsx` — правая колонка:
  - `CallTile.jsx` — плитка звонка (заглушка: превью учителя, PiP ученика, кнопки мик/камера/выйти — неактивные).
  - `TopicsList.jsx` — «Топики урока N/M» с активным.
  - `TeacherChat.jsx` — пузыри + ввод + отправка (локальный стейт).

Чистая логика (тестируемая без DOM):
- `src/screens/workspace/practiceGrading.js` — `gradeQuestion(question, answer)` → `{correct}`; `stepProgress(steps)` → `{done,total}`.

Стили: новый `src/lessonWorkspace.css`, импорт в `src/app/layout.jsx` рядом с прочими CSS. Классы с префиксом `.lw-`.

Иконки: добавить в `src/components/icons.jsx` `CameraIcon`, `CheckIcon` (в наборе нет; `MicIcon`/`SendIcon`/`CloseIcon`/`PhoneChatIcon` есть).

## Модель данных (примерный JSON)

Файл `src/screens/workspace/sampleLesson.js` (позже заменяется выходом экстрактора):

```js
lesson = {
  id, unit: 'Unit 4 — Мой день', level: 'A2', durationSec: 3000,
  steps: [                       // «Маршрут урока» (слева), 9 шт.
    { id, order, title, topicId, blocks: [ Block, ... ] },
  ],
  topics: [ { id, title } ],     // «Топики урока» (справа), 5 шт.
  teacher: { name },
}
```

Блоки (`block.type`):
- `banner` — `{ type:'banner', title, mascot? }`.
- `theory` — `{ type:'theory', title, text, forms?: [{label, example}], mistake?: {text} }`.
- `practice` — `{ type:'practice', title, hint?, questions: Question[] }`.

`Question` (совместимо со словарём заданий `LessonPlayer`):
- `choice` — `{ id, type:'choice', prompt, options:[...], answer }`.
- `chips` — `{ id, type:'chips', gapBefore, gapAfter, bank:[...], answer }`.
- `gap` — `{ id, type:'gap', gapBefore, gapAfter, answers:[...] }` (ввод текста).

Статус шага вычисляется, не хранится: пройден (все practice верны с первой попытки) / текущий (activeStepId) / заблокирован (после первого непройденного). В №1 на моке допускаем свободную навигацию (клик по любому шагу), статусы — визуальные.

## Логика практики

- Ответы в стейте `LessonWorkspacePage`: `answers[questionId]`.
- «Проверить» шага: для каждого вопроса `gradeQuestion` → пометка верно/неверно, чипы красятся `#34a853`/`#e5675f`, gap-инпут — рамка/фон по результату.
- Первая попытка запоминается (для будущей интеграции со счётчиками навыков — но в №1 просто визуально).
- До проверки — нейтральный вид; после — цвета + возможность «Проверить» повторно.

## Состояния

- Шаг: активный / пройден (✓ в маршруте) / заблокирован (dimmed, курсор default).
- Практика: до проверки / после (верно/неверно) / всё верно (кнопка «Далее» вместо «Проверить» — опционально в №1, иначе просто зелёные).
- Чат: пустой (подсказка) / со списком / отправка по Enter и по кнопке.
- Длинный контент: скролл только центральной колонки; шапка и боковые липкие.
- Адаптив: ≤1100px — правая колонка уходит вниз под центр; ≤720px — маршрут сворачивается в верхнюю полоску-степпер (минимально: скрыть, оставить прогресс-точки в шапке).

## Тесты

- Юнит (`practiceGrading`): choice верно/неверно, chips, gap (нормализация регистра/пробелов, несколько допустимых `answers`), `stepProgress`.
- Playwright e2e (`tests/lesson-workspace.spec.js`): экран по `?screen=lesson-workspace` рендерит шапку, 9 шагов маршрута, центр с теорией+практикой, правую колонку (плитка/топики/чат); выбор чипа выделяет его; «Проверить» красит верно/неверно; отправка сообщения добавляет пузырь; клик по шагу меняет контент центра.

Прогон перед готовностью: `npx playwright test tests/lesson-workspace.spec.js --project=mobile` и юнит-спеки; `npx next build`.

## Не делаем в №1

Бэкенд, STOMP, реальное видео, web-admin, экстрактор, интеграцию с `LiveLessonPage`, сохранение прогресса на сервер. Всё это — под-проекты №2/№3.
