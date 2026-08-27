-- Writing-практика: лимиты платных AI-вызовов + журнал проверенных работ.

-- Недельный лимит платных AI-проверок письма — копия shadowing_assess, но своя
-- таблица: бюджеты разделов не должны съедать друг друга. Одна проверка = один
-- вызов Sonnet (~$0.03: эссе ~400 слов на входе + полный rewrite на выходе).
-- Лимит 10/нед → потолок ~$0.30–0.60/нед на активный аккаунт (верхняя граница —
-- длинные C1-тексты). profile_id = 'user-<id>' из resolveProfileId (только
-- залогиненные), week_key — ISO ('2026-W35'). См. lib/db/writingBudget.js.
create table if not exists writing_assess (
  profile_id text        not null,
  week_key   text        not null,   -- ISO-неделя, '2026-W35'
  used       integer     not null default 0,   -- потрачено проверок
  updated_at timestamptz not null default now(),
  primary key (profile_id, week_key)
);

-- Дневной лимит переводов выделенного фрагмента (Haiku, ~$0.001/вызов).
-- Переводы дешёвые, но частые — лимит 100/день (~$0.10) не мешает честному
-- ученику и одновременно ставит потолок скрипту, гоняющему роут в цикле.
-- Ключ дня — 'YYYY-MM-DD' в UTC, недельная гранулярность здесь была бы слишком
-- грубой: один увлечённый день не должен отбирать переводы у всей недели.
create table if not exists writing_translate (
  profile_id text        not null,
  day_key    text        not null,   -- день UTC, '2026-08-27'
  used       integer     not null default 0,   -- потрачено переводов
  updated_at timestamptz not null default now(),
  primary key (profile_id, day_key)
);

-- Журнал проверенных работ. Не ielts_attempt намеренно: другой ключ
-- (profile_id, а не device_id) и другой формат оценки (scores 0–5 по четырём
-- осям + verbatim-corrections, а не IELTS-бэнды в ielts_score). assessment —
-- полный нормализованный ответ проверяющего: по нему рисуется история работ,
-- усечённый снимок уходит в learner.writing (см. lib/db/writingAttempts.js).
create table if not exists writing_attempt (
  id         uuid        not null default uuid_generate_v4(),
  profile_id text        not null,
  level      text,
  genre      text,
  word_count integer,
  essay      text,
  assessment jsonb       not null default '{}'::jsonb,
  mode       text,
  created_at timestamptz not null default now(),
  constraint writing_attempt_pkey primary key (id)
);
create index if not exists writing_attempt_profile_idx
  on writing_attempt (profile_id, created_at desc);
