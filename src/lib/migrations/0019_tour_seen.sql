-- Отметки «тур экрана пройден» — на аккаунт, а не на браузер (28.10.2026).
--
-- До этой таблицы отметка жила только в localStorage, и ключ её строился из id профиля этой базы, а пока у ученика
-- не было строки в learner (новый ученик до теста уровня) — из device-id браузера. Строка появлялась после теста, ключ
-- менялся, и все туры выходили второй раз; другой браузер или телефон показывал их снова. Теперь ключ — аккаунт из
-- токена, а отметка лежит здесь (lib/db/tourSeen.js, клиент — lib/tourMarks.js); localStorage остался кэшем.
--
-- Своя таблица, а не колонка в learner: learner общий с felix, и чужую схему лишними полями не расширяем (как
-- level_goal). tour — имя тура без аккаунта: 'home:ge', 'practice', 'dash' (lib/tourName.js).
create table if not exists tour_seen (
  profile_id text        not null,               -- `user-<id>`; у гостя отметка остаётся в браузере
  tour       text        not null,
  seen_at    timestamptz not null default now(),
  primary key (profile_id, tour)
);

comment on table tour_seen is 'Пройденные туры экранов. См. lib/db/tourSeen.js';
