-- Время активной работы в тренажёрах, которые сами его не пишут: воркбук
-- (workbooks) и практика «Словаря» (vocabulary_sr). Это «actual» для недельной
-- сводки экосистемы (ТЗ «Roadmap & AI Notification Engine», п.5.5).
--
-- Тьютор и шэдоуинг сюда не попадают намеренно: их время уже лежит в
-- voice_usage и shadowing_assess, второй источник разошёлся бы с первым.
--
-- Одна строка на профиль × модуль × сутки: сводке нужны только недельные суммы,
-- а посекундный журнал сессий рос бы без пользы. day — UTC-дата, её ставит
-- сервер (клиенту в этом верить нельзя), и она совпадает с UTC-границами
-- недели в сводке.
create table if not exists activity_time (
  profile_id text        not null,
  module     text        not null,
  day        date        not null,
  seconds    integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, module, day)
);
