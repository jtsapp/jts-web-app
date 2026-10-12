# «Числа» в Практике — Dexter's Number World (дизайн)

Дата: 2026-10-13. Ветка: `feat/numbers-practice` → `develop`.

## Что строим

Раздел «Практики» на вкладке «Аудирование»: игра методиста **Dexter's Number World** — английские числа
на слух и чтение. Декстер прыгает по островам с вариантами ответа. 17 разделов в трёх мирах (0–20 → миллиарды)
плюс Listening Lab. В каждом разделе 3–5 раундов, всего ~1000 заданий. Перед игрой показывается объяснение
с переводом на kk/ru. Боссы проходятся на 80 %, обычные раунды — на 70 %.

Источник — standalone-прототип, проверенный и исправленный 13.10.2026: вёрстка длинных вариантов, голос
браузера, логика боссов, Slow на телефоне, мёртвый код. Порт переносит исправленную версию 1:1.

## Решения владельца (13.10.2026)

- **Подход — движок в Shadow DOM, как SpeakSpin**, а не React-порт и не iframe. Код игры переносится почти
  дословно; меняется только связь с приложением.
- **Язык — как в оригинале.** Игра на английском (это язык упражнения). Перевод объяснений на kk/ru включается
  кнопкой в уроке, по умолчанию выключен.
- **Звук — на лету через `/api/tts`** голосом Soniox **Freya** (британский; игра учит британским формам:
  nought, nil, half seven). Записи в репо не кладём. Синтез браузера не используем.

## Состав

### Источник и данные
- `data/jtsnumbers.html` — прототип, источник правды для контента.
- `scripts/extract-numbers.js` — исполняет блок данных прототипа в `node:vm` (без DOM) и пишет:
  - `public/practice/numbers/data.json` — `SECTIONS`, `TOURS` (раунды уже собраны, включая боссов и Lab),
    `LESSONS`, `SOURCES`;
  - `public/practice/numbers/img/*.webp` — base64-картинки прототипа: 3 фона миров, 5 поз Декстера, остров,
    портал, кристалл, логотип;
  - `public/practice/numbers/fonts/*.woff2` — шрифты объяснений (Literata, Golos Text: латиница и кириллица).

  В бандл ~1.8 МБ base64 не попадают, всё грузится при входе в раздел.

### Движок — `src/practice/numbers/`
- `engine.js` — скрипт игры, перенесённый почти дословно, с API `mountNumbers(root, cfg) → destroy()`.
  - Поиск элементов (`$`, `$$`) и вставка модалок, конфетти, тостов — внутри `root`, не в `document`.
  - Слушатели (`keydown`, `resize`) вешаются через `AbortController`. `destroy()` снимает их, гасит звук,
    таймеры и анимации и ставит флаг «закрыто»: отложенные шаги после `await` выходят молча.
  - Своего хранилища и своего звука у движка нет: прогресс и звук приходят через `cfg`.
  - Картинки — абсолютные адреса `/practice/numbers/img/…`; данные приходят готовым объектом из `cfg.data`.
- `logic.js` — чистые функции, вынесенные из движка ради тестов: `positionPlan`, `buildRound`, `spokenOf`,
  `sayText`, `exSay`, подсчёт результата раунда.
- `styles.js`, `markup.js` — CSS и каркас прототипа для Shadow DOM. Классы прототипа (`.hero`, `.card`, `.btn`,
  `.chip`) совпадают с глобальными — без изоляции они ломаются, как у SpeakSpin.
- `voice.js` — звук игры поверх `src/lib/speech.js`.
- `numbersProgress.js` — прогресс через `createProgressStore` (модуль `numbers`).

### Экран — `src/screens/NumbersPage.jsx`
- `LearningLayout` (active `practice`), кнопка «назад» → `onNav('practice', { skill: 'listening' })` и хост
  Shadow DOM.
- Загрузка `data.json`; при ошибке — сообщение и кнопка «ещё раз» (ключи i18n приложения).
- `src/numbers.css` (импорт в `layout.jsx`): оболочка экрана и `@font-face` Literata / Golos Text на уровне
  документа. Внутри Shadow DOM `@font-face` не применяется надёжно, а шрифты документа внутрь видны.

### Подключение к приложению
- `App.jsx`: импорт, `PERSISTABLE_SCREENS` (F5 оставляет `?screen=numbers`), `handleNav('numbers')`,
  `case 'numbers'`.
- `src/screens/practice/practiceTabs.js`: вкладка `listening`, секция `{ id: 'numbers' }` после `words`
  («сказки последние» не нарушается).
- `PracticePage.jsx`: `Banner id="sec-numbers" variant="numbers"`; градиент `.pk-banner--numbers` в
  `styles.css`; тёмная тема — перегенерировать `scripts/gen-dark-theme.js`.
- `i18n.jsx` (ru/en/kk): `practice.numbers.heading/desc/cta`, `numbers.back`, `numbers.loadFailed`,
  `numbers.retry`.
- Квоты нет (как у «Слов», «Глаголов», «Слушай и выбирай»). В домашнюю работу раздел не отчитывается: area
  `numbers` бэкенду неизвестна.

## Поведение

### Прогресс
- Состояние — как у прототипа:
  `{ sections: { [id]: { rounds: [{passed, best, stars, plays}], stars, best, bestCr, done, plays } },
  bestCombo, totalCorrect, seen: { [id]: { [itemKey]: count } } }`.
- Синхронизируется с аккаунтом (replace), гость хранит прогресс на устройстве.
- `merge(local, server)`: раунд пройден, если пройден хоть где-то; `best`, `stars`, `plays`, `bestCombo`,
  `totalCorrect` — максимум; `seen` — максимум по ключу. Игра до прихода снимка с сервера не стирает
  серверный прогресс.
- Движок не держит у себя копию: перед каждым экраном и при записи итога раунда он читает свежее состояние
  из хранилища.
- Подключение модуля: `practiceKeys.js` (`NUMBERS_KEY`, `NUMBERS_PROGRESS_EVENT`, `NUMBERS_LANG_KEY`),
  `practiceContract.js` (`PRACTICE_MODULES`), `practiceSyncCore.js` (`OBJECT_MODULES` + ветка гидратации),
  `practiceSync.js` (`clearLocalPractice`: прогресс и язык перевода), `lib/db/studentActivity.js`
  (`numbers: 'numbers'`).
- Язык перевода объяснений — только на устройстве (`NUMBERS_LANG_KEY`), чистится при выходе из аккаунта.

### Звук
- `src/lib/speech.js`: в `playTts` добавляется опция `rate` (по умолчанию 1). Она ставит
  `defaultPlaybackRate` и `playbackRate` (смена `src` сбрасывает темп) и `preservesPitch`. Адрес `/api/tts`
  от `rate` не зависит.
- Игра всегда просит `speed: 1`, а темп раунда (0.85, 0.95–1.15, нарастание до 1.3, Slow 0.7) задаёт
  `rate`. Одна фраза — один синтез и один кэш.
- Следующая фраза раунда прогревается `prefetchTts`. `unlockSpeech()` вызывается в нажатии «Start round»
  (иначе iPhone молчит).
- `onFail('error' | 'timeout')` — задание на слух показывает слово без штрафа. После двух провалов подряд
  раунд сразу показывает слова с пометкой «Sound is unavailable». Первый успех снимает пометку.
  `onFail('blocked')` (нет жеста) — ничего не показываем, ученик жмёт ▶.

### Навыки
Задание на слух при правильном прыжке пишет `recordSkill('listening', с первой попытки)`. Задания на чтение
(«как сказать?») не пишут.

### Клавиатура и выход
- 1/2/3 — прыжок, пробел — повтор; не срабатывают, когда фокус в поле ввода.
- Уход с экрана в любой момент — `destroy()`, без ошибок в консоли.

## Тесты
- Vitest:
  - `scripts/extract-numbers.test.js` — `data.json` совпадает с выводом экстрактора, ассеты на месте;
  - `src/practice/numbers/data.test.js` — ответ ≠ ложным вариантам, ложные варианты различны, у каждого
    раздела есть урок и существующие источники, раунды боссов `listen`;
  - `logic.test.js` — баланс слотов и «не три подряд», босс берёт 16 заданий без повторов ответа, что
    произносится для заданий на чтение;
  - `numbersProgress.test.js` — `merge` не теряет пройденное, запись до гидратации не уходит на сервер;
  - `src/lib/speech.test.js` (существующий) — `rate` ставит `playbackRate` и не меняет адрес; без `rate` темп 1.
- Обновить: `tests/practice-contract.spec.js`, `src/lib/db/studentActivity.test.js`,
  `tests/practice-sync-core.spec.js`, `src/practice/practiceSync.test.js`, `src/practice/progressQuota.test.js`,
  `src/screens/practice/practiceTabs.test.js`, `src/screens/PracticePage.filterTarget.test.jsx` (вкладка
  «Аудирование»: 8 тренажёров).
- E2E `tests/numbers.spec.js` (`/api/tts` подменяется тихим mp3):
  - карта из 17 карточек;
  - урок → раунд до итогов → после перезагрузки раунд засчитан;
  - на 375 px длинные варианты влезают в таблички.

  Для теста у сцены есть атрибут `data-answer` (как `data-correct` у Word Rush).
- Перед PR: `npm run build`, `npm run lint`, свои vitest, e2e `--workers=1` на своём `E2E_PORT`, осмотр
  экрана на десктопе и 375 px.

## Вне рамок
- Записи фраз (пакетная озвучка Soniox) — отдельное решение. Логика «запись → иначе синтез» из прототипа
  не переносится, пока записей нет.
- Перевод интерфейса игры на ru/kk.
- Квота, домашняя работа, тёмная тема внутри игры (у игры свои светлые арты; тема документа в Shadow DOM
  не проникает).
