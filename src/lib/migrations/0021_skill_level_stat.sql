-- Навыки по уровню задания (ТЗ v2.0 «Луна-трекер», 5.5; решение школы 06.11.2026).
--
-- skill_stat копит задания всех уровней вместе, поэтому «Сильные и слабые стороны» на Главной и в Профиле считались по
-- всем уровням: лёгкие задания нижних уровней завышали процент (тестовый аккаунт — 1 243 задания по грамматике). Школа
-- решила считать только задания текущего уровня ученика. Уровня в skill_stat нет, и в ключ его не добавить: ключ
-- (profile_id, skill) держат прежние инкременты. Поэтому — своя таблица рядом с той же формой и тем же инкрементом
-- (lib/db/skillStats.js, applySkillDeltas: одна транзакция). skill_stat остаётся итогом по всем уровням.
--
-- level — CEFR задания (A0…C2), а если раздел уровня задания не знает — уровень ученика в момент ответа
-- (practice/skillStats.js). Строки до этой миграции уровня не имеют и сюда не попадают: «мало данных», пока ученик не
-- решит задания текущего уровня, честнее процента с других уровней.
create table if not exists skill_level_stat (
  profile_id        text        not null,               -- `user-<id>`, как в skill_stat
  skill             text        not null,               -- listening|speaking|reading|writing|grammar|vocab
  level             text        not null,               -- A0|A1|A2|B1|B2|C1|C2
  tasks_done        integer     not null default 0,
  first_try_correct integer     not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (profile_id, skill, level)
);

comment on table skill_level_stat is 'Счётчики навыков по уровню задания. См. lib/db/skillStats.js';
