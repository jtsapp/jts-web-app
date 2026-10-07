-- Решённые задания «Практики» по суткам (UTC) — для календаря активности
-- ученика в карточке преподавателя (web-admin, «Мои студенты»).
--
-- skill_stat хранит только итоговые счётчики на навык, и «в какие дни ученик
-- занимался» по нему не восстановить. Строка — профиль × сутки: календарю нужны
-- только дневные суммы, посекундный журнал рос бы без пользы. day ставит сервер
-- БД в UTC — так же, как у остальных дневных таблиц (activity_time, *_assess).
--
-- Пишется в той же транзакции, что и skill_stat (lib/db/skillStats.js,
-- applySkillDeltas), поэтому две таблицы не расходятся. Истории до этой
-- миграции нет: практика появится в календаре с даты выката.
create table if not exists skill_day (
  profile_id text    not null,
  day        date    not null,
  tasks      integer not null default 0,
  first_try  integer not null default 0,
  primary key (profile_id, day)
);

comment on table skill_day is 'Решённые задания по суткам UTC. См. lib/db/skillStats.js';
