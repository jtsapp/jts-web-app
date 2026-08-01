# Рейтинг навыков в профиле — дизайн

Дата: 2026-08-01
Репозиторий: `jts-web-app` (Next.js + React), ветка `feat/profile-skill-ratings` от `develop`.
Мобилку (Flutter) и Java-бэкенд `/mobile/*` не трогаем. IELTS не трогаем.

## Цель

В профиле показать оценку по шести навыкам — **Listening, Speaking, Reading,
Writing, Grammar, Vocabulary**. Оценка строится из двух счётчиков на каждый
навык: **всего сделано заданий** и **сколько из них верно с первой попытки**.
Отображение — шкала из полосок: максимум 10, минимум 2.

## Область

- Инструментировать разделы **Практика** и **Обучение**, чтобы они писали
  per-skill статистику в бэкенд.
- Хранение — в собственной Postgres приложения Next.js (там же, где уже живёт
  `practice_state`), новая таблица `skill_stat`, новый роут `/api/skills`.
- Новый виджет в `ProfilePage.jsx`.

Вне области: IELTS-экраны, Java-бэкенд `/mobile/*`, Flutter-приложение,
обогащение экстрактора уроков нормализованным полем `skill` (возможный
follow-up; сейчас навык распознаётся регуляркой по метке `sec`).

## Модель данных (backend)

Новая таблица в `src/lib/schema.sql`:

```sql
create table if not exists skill_stat (
  profile_id text not null,
  skill      text not null, -- grammar|vocab|listening|speaking|reading|writing
  tasks_done        integer not null default 0,
  first_try_correct integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, skill)
);
```

`profile_id` — из `resolveProfileId` (как у `practice_state`): `user-<id>` для
залогиненных, иначе device id.

Слой БД `src/lib/db/skillStats.js`:

- `loadSkillStats(profileId)` → `{ grammar:{done,firstTry}, ... }` для всех
  шести навыков (отсутствующие → нули).
- `applySkillDeltas(profileId, deltas)` — атомарный инкремент:
  `insert ... on conflict (profile_id, skill) do update set
   tasks_done = skill_stat.tasks_done + excluded.tasks_done,
   first_try_correct = skill_stat.first_try_correct + excluded.first_try_correct,
   updated_at = now()`.

Роут `src/app/api/skills/route.js`:

- **GET** → `loadSkillStats` для текущего профиля.
- **POST** `{ deltas: { grammar:{done:n, correct:k}, ... } }` → валидировать
  (только известные навыки, целые ≥0, `correct <= done`), затем
  `applySkillDeltas`, вернуть новые абсолютные тоталы.

Инкременты (дельты), а не абсолютные значения, — чтобы счётчики корректно
суммировались между устройствами и не терялись при гонках.

## Клиентский сбор статистики

Модуль `src/practice/skillStats.js` (по образцу `practiceSync.js`):

- Локальный мираж в localStorage (ключ `jts_skill_stats`) — работает и для
  гостей.
- `recordSkill(skill, firstTryCorrect)` — инкремент локального миража + буфера
  дельт (`jts_skill_stats_pending`).
- `flushSkillStats(token)` — debounce (~800 мс). Если есть токен и непустой
  буфер: POST дельт на `/api/skills`; при 200 очищаем буфер и принимаем
  вернувшиеся абсолютные тоталы как новый мираж. Без токена — no-op (как
  `pushModule`).
- `loadSkillStats(token)` — GET на `/api/skills` (для профиля).

Инструментирование источников (каждый вызывает `recordSkill`):

| Навык | Файл(ы) | «Сделано» | «Верно с 1-й попытки» |
|---|---|---|---|
| Grammar | `practice/grammar/ActivityPlayer.jsx`; `learning/LessonPlayer.jsx` (sec≈Grammar) | каждое graded-задание | единственный ответ (`onResult(ok)`) |
| Vocabulary | `practice/vocab/*`; `learning/LessonPlayer.jsx` (sec≈Vocabulary) | первое предъявление слова | верно до пере-опроса |
| Listening | `screens/ListeningPage.jsx`; `learning/LessonPlayer.jsx` (type=listen) | задание | `ok && !current._retry` |
| Writing | gap-задания (ввод текста) в `learning/LessonPlayer.jsx` и Практике | gap-задание | верный ввод с первой попытки |
| Speaking | `screens/ShadowingPage.jsx` / `practice/shadowing/*` | сегмент записан | первый дубль score ≥ 80 |
| Reading | `screens/BookDetail.jsx` (книги), сказки | открыл книгу/сказку | дочитал до конца |

Классификация задач Обучения по навыку: регулярка по `sec.label`
(`/grammar/i`, `/vocab/i`, `/listen|numbers/i`), плюс `type==='listen'` →
Listening, `type==='gap'` → дополнительно Writing. Незачётные типы
(`info/watch/check`) не считаются.

Замечание про Writing: задание типа `gap` (ввод текста) засчитывается и в свой
предметный навык (grammar/vocab по `sec`), и в Writing (продукция текста).
Метрики навыков независимы — двойной зачёт по разным навыкам допустим и
намеренен.

## Формула полосок

```
если done == 0          → bars = 2            (пустое состояние)
accuracy   = firstTryCorrect / done
confidence = min(1, done / CONF_FULL)         // CONF_FULL = 25
score      = accuracy * confidence            // ∈ [0..1]
bars       = clamp(2 + round(8 * score), 2, 10)
```

Свойства: пусто → 2; малый объём при высокой точности не даёт максимума
(3 задания на 100% → ~3 полоски); 25+ заданий на 100% → 10; 25 на 60% → 7.
Реализация — чистая функция `skillBars({done, firstTry})` в
`src/practice/skillStats.js` (тестируется изолированно).

## UI

Новая карточка `SkillRatings` (в `ProfilePage.jsx` или отдельный компонент
`src/components/SkillRatings.jsx`), размещается под блоком `.pf-stats` и перед
секцией «Персонализация» (ProfilePage.jsx:330), под своим `.pf-label`.

Структура: заголовок-лейбл + 6 строк. Каждая строка:
`[иконка навыка] [название]  [мета: «42 задания · 76% с первой»]  [шкала 10
сегментов]`. Заполнено = `bars`, цвет `#9047ff`, трек `#f0ebff`.

Дизайн-токены (из блока `.pf*`, styles.css): карточка радиус 18px, бордер
`1px solid #efeef4`, тень `0 3px 10px rgba(0,0,0,0.04)`, отступ `margin-top:
12px`; текст `--ink`/`--muted`; лейбл секции как `.pf-label`.

Состояния:
- **Пусто** (done=0): 2 сегмента приглушённым цветом + подпись «нет данных».
- **Загрузка**: скелет 6 строк.
- **Тёмная тема**: следовать существующим правилам темы в styles.css.
- **prefers-reduced-motion**: без анимации заполнения полосок.

Данные: `ProfilePage` дополнительно вызывает `loadSkillStats(token)` (Next.js
`/api/skills`) в существующем серверном `useEffect` (ProfilePage.jsx:115-139).

i18n: строки навыков и меты — через `useI18n`/`i18n.jsx` (ключи
`profile.skills.*`, `nav`-стиль), для всех поддерживаемых языков.

## Тесты

- Юнит `skillBars`: границы (done=0 → 2; done=1,correct=1; done=25,100% → 10;
  done=25,60% → 7; clamp сверху/снизу).
- Юнит слоя БД / роута: инкрементальный merge (две дельты складываются),
  валидация (неизвестный навык, `correct > done`).
- Юнит инструментирования: listening `ok && !_retry`; grammar `onResult(ok)`;
  gap → writing.
- Виджет-тест `SkillRatings`: пусто, частично, максимум; корректное число
  заполненных сегментов; состояние загрузки.

Прогон перед PR: `npm test` (или существующий тест-раннер репо), проверка
изменённого флоу вручную (Практика/Обучение → профиль).

## Развёртывание

Новая таблица `skill_stat` — добавить в `schema.sql` и в существующий механизм
миграций/инициализации схемы (как остальные таблицы). Проверить, как
`schema.sql` применяется в dev/prod, и завести миграцию тем же способом.
