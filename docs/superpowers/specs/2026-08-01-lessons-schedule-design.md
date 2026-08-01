# Дизайн: «График в Уроках» (под-проект №1)

Дата: 2026-08-01
Репозиторий: `jts-web-app` (ветка `feat/lessons-schedule` от `develop`)
Статус: утверждён к реализации

## Контекст

Живой урок «учитель ↔ ученик» полностью реализован в `web-admin` (Angular): расписание
(`/admin/lessons`), рабочее пространство урока (`/system/schedule/:lessonId/workspace`)
с доской (Fabric), STOMP-сокетами (доска, курсоры, presence, презентация,
board-settings), зеркалированием экрана, разделами/материалами, чатом и заметками.

Цель большого проекта — перенести этот живой урок **нативно в React (`jts-web-app`)**
для **обеих ролей** (ученик и учитель), при этом сохранив весь функционал. Учитель
и ученик подключаются к **одному бэкенду** (`dev-server.justtostudy.kz`) и одним и тем
же STOMP-топикам; вход в оба приложения по OTP даёт **тот же JWT** (одна личность).

Работа декомпозирована на под-проекты (каждый — свой цикл спека→план→реализация):

1. **График в «Уроках»** ← этот документ.
2. Live-каркас + realtime-фундамент (роут, STOMP, presence, статус урока).
3. Доска (Fabric) + realtime-синк.
4. Разделы и материалы (present/focus, iframe материала).
5. Зеркало экрана (material-session).
6. Чат, заметки, посещаемость, видео-заглушка.

Известное следствие пути: после порта живой урок существует в двух реализациях
(Angular web-admin + React jts-web-app) на одном бэкенде — двойная поддержка, принято
осознанно; web-admin-workspace позже можно вывести из эксплуатации.

## Цель под-проекта №1

В разделе **«Уроки» → вкладка «Онлайн»**, **над** существующей сеткой модулей,
показать блок **«Мой график»**: полный журнал занятий вошедшего пользователя (свои
уроки; работает и для ученика, и для учителя) — прошедшие и будущие, сгруппированные
по датам, со статусами и сводкой. Клик по идущему занятию ведёт на live-роут
(в №1 — экран-заглушка; реальный workspace появится в №2–6).

## Scope

**В scope:**
- Блок графика в online-вкладке `LessonsPage`, над `ls__grid`.
- Полный журнал (прошедшие + будущие), группировка по датам, сводка-плитки.
- Гейт входа: «Войти в класс» активна только при статусе `IN_PROGRESS`/`PAUSED`
  (зеркалим web-admin), иначе информативно.
- Клик по идущему уроку → навигация на новый экран `live-lesson` (заглушка).
- i18n (RU/KZ/EN), состояния loading/error/empty, mobile-first.

**Вне scope (последующие под-проекты):**
- Реальный live-workspace (доска, сокеты, презентация, зеркало, чат) — №2–6.
- Изменения бэкенда — не требуются (эндпоинты и скоуп уже есть).
- Вкладка «Клубы» и сетка модулей — не трогаем.

## Данные / API

Источник — существующие, уже скоупленные под пользователя эндпоинты (проверено под
токеном ученика: возвращают только свои уроки, чужие → 400):

- `GET /admin/lessons/occurrences` → плоский журнал: массив
  `{ lessonId, lessonType, scheduledAt, durationMinutes, teacherId, teacherName,
  studentId, studentName, studentLevel, format, lessonStatus, participantStatus }`.
- `GET /admin/lessons/summary` → `{ conducted, remaining, cancelled, rescheduled }`.

Добавляем в `src/api.js`:
- `getMyLessonOccurrences(token)` → GET `/admin/lessons/occurrences`.
- `getLessonsSummary(token)` → GET `/admin/lessons/summary`.

Реализация — как у соседних вызовов (`fetch` + `Authorization: Bearer`), лёгкий
кэш по образцу существующих. Бэкенд не меняем.

`scheduledAt` — «naive» LocalDateTime без зоны (`2026-08-10T11:30:00`); в JS
`new Date('...')` без `Z` парсится как локальное время — отображаем как есть,
без UTC-сдвига (осознанно избегаем off-by-one).

## Компоненты (изоляция)

- `src/screens/schedule/LessonSchedule.jsx` — самодостаточный блок.
  - Props: `{ token, onOpenLesson }`.
  - Сам грузит occurrences + summary (параллельно), держит состояние loading/error/data.
  - Рендерит сводку и журнал; ничего не знает про модули/вкладки.
- `src/screens/schedule/ScheduleSummary.jsx` — 4 плитки (Проведено/Осталось/Отменено/
  Перенесено) из summary.
- `src/screens/schedule/LessonRow.jsx` — одна запись: дата/время, преподаватель, тип,
  бейдж статуса, формат; кнопка/действие «Войти в класс» по гейту.
- `src/screens/schedule/lessonFormat.js` — **чистые функции** (без сети, юнит-тестируемые):
  - `parseLessonDate(scheduledAt)` — локальный `Date` из naive-строки.
  - `groupByDay(occurrences)` — группировка по дню (сегодня/завтра/дата), сортировка.
  - `splitPastUpcoming(occurrences, now)` — разбивка прошлое/предстоящее.
  - `statusLabelKey(lessonStatus)` / `statusColor(lessonStatus)` — маппинг (зеркалим
    `LessonStatus` из web-admin: SCHEDULED/IN_PROGRESS/PAUSED/COMPLETED/CANCELLED,
    плюс «Просрочен» для прошедших SCHEDULED — как в web-admin overdue).
  - `canJoin(lessonStatus)` = `IN_PROGRESS | PAUSED`.
- `src/screens/LessonsPage.jsx` — минимальная правка: в online-вкладке над `ls__grid`
  рендерим `<LessonSchedule token={token} onOpenLesson={onOpenLesson} />`; проп
  `onOpenLesson` приходит из `App`. Гость/без токена → блок не рендерим.
- Стили `.sch*` в `src/styles.css`, mobile-first; вкладка «Клубы» и модули не тронуты.

## Навигация

- `src/App.jsx`:
  - Новый экран `case 'live-lesson'` → в №1 экран-заглушка
    `src/screens/LiveLessonPage.jsx` («Живой урок #{id} — раздел в разработке» + кнопка
    «Назад»), хранит выбранный `liveLessonId` в состоянии.
  - `LessonsPage` получает `onOpenLesson(lessonId)` → `setLiveLessonId(id)` +
    `setScreen('live-lesson')`.
  - Клик по `LessonRow` вызывает `onOpenLesson` только при `canJoin`; иначе кнопка
    неактивна с подсказкой «Преподаватель ещё не начал урок».
- Это подключает клик end-to-end уже в №1; в №2 заглушку заменит реальный live-каркас.

## Состояния и i18n

- Состояния блока: `loading` (скелетон/спиннер), `error` (сообщение + «Повторить»),
  `empty` (нет занятий → «Пока нет занятий» либо скрыть блок). Сетка модулей рендерится
  ниже независимо от состояния графика.
- i18n в `src/i18n.jsx` (RU/KZ/EN), ключи под `schedule.*`:
  `schedule.title`, `schedule.summary.conducted/remaining/cancelled/rescheduled`,
  `schedule.status.scheduled/inProgress/paused/completed/cancelled/overdue`,
  `schedule.join`, `schedule.notStarted`, `schedule.empty`, `schedule.loading`,
  `schedule.error`, `schedule.retry`, `schedule.today`, `schedule.tomorrow`.

## Тесты

- **Юнит** (детерминированные, без сети) на `lessonFormat.js`: `groupByDay`,
  `splitPastUpcoming`, `parseLessonDate` (нет UTC-сдвига), `statusLabelKey`/`statusColor`
  (в т.ч. «Просрочен» для прошедшего SCHEDULED), `canJoin`. Подключить к тест-раннеру
  репозитория; если раннера нет — добавить минимальный (vitest).
- **E2E** (Playwright, webapp-testing): под реальным токеном ученика на dev график
  рендерится (уроки 13/14), сводка отображается, клик по идущему (14) уводит на
  live-заглушку; клик по запланированному (13) не пускает (подсказка).

## Затрагиваемые файлы

Новые:
- `src/screens/schedule/LessonSchedule.jsx`
- `src/screens/schedule/ScheduleSummary.jsx`
- `src/screens/schedule/LessonRow.jsx`
- `src/screens/schedule/lessonFormat.js`
- `src/screens/schedule/lessonFormat.test.js` (или размещение по конвенции раннера)
- `src/screens/LiveLessonPage.jsx` (заглушка)

Изменяемые:
- `src/api.js` (+ `getMyLessonOccurrences`, `getLessonsSummary`)
- `src/screens/LessonsPage.jsx` (рендер блока + проп `onOpenLesson`)
- `src/App.jsx` (экран `live-lesson`, `liveLessonId`, проброс `onOpenLesson`)
- `src/i18n.jsx` (ключи `schedule.*`, RU/KZ/EN)
- `src/styles.css` (стили `.sch*`)

## Риски / примечания

- Эндпоинты называются `/admin/lessons*`, но бэкенд скоупит их под личность токена —
  для ученика/учителя это «свои уроки» (проверено). Опираемся на серверный скоуп.
- `LessonSchedule` полагается на наличие `token`; для гостя блок скрыт.
- Порядок сборки следующих под-проектов сохраняется; экран `live-lesson` в №1 —
  временная заглушка, заменяется в №2.
