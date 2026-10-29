-- Нрав тьютора — свой у каждого тьютора (29.10.2026).
--
-- До этого нрав был один на ученика (learner.tutor_temper, миграция 0002): кнопка
-- «18+» у Декстера включила бы злого и Спарку. Теперь строка на пару «ученик ×
-- тьютор». Старая колонка остаётся: её пишут вкладки, открытые до выката, а при
-- чтении она — запасной нрав Спарка (src/lib/db/tutorTempers.js).
--
-- Своя таблица, а не колонка в learner: learner общий с felix, чужую схему не
-- расширяем (как tour_seen, level_goal).
create table if not exists learner_tutor_temper (
  profile_id text        not null,  -- learner.device_id: `user-<id>` или device-id гостя
  tutor      text        not null,  -- ключ тьютора сайта: dexter, spark
  temper     text        not null check (temper in ('calm', 'harsh')),
  updated_at timestamptz not null default now(),
  primary key (profile_id, tutor)
);

comment on table learner_tutor_temper is 'Нрав (ось 18+) по тьюторам. См. src/lib/db/tutorTempers.js';
