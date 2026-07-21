-- Полная схема БД тьютора для СВОЕГО Postgres (self-host, DATABASE_URL).
-- Применить один раз:
--   psql "$DATABASE_URL" -f src/lib/schema.sql
-- Безопасно повторять (IF NOT EXISTS / add column if not exists).
--
-- ВНИМАНИЕ. 7 таблиц ниже (learner-профиль + mistake_log/fact_log/topic_log/
-- resolved_log/vocab_bank/lesson_progress/call_log) РЕКОНСТРУИРОВАНЫ из запросов
-- в src/lib/db/*.js — исторически они жили в «felix-общей» БД и в этом репо DDL
-- не было. Для чистого self-host этого достаточно. Если переносишь ЖИВЫЕ данные
-- из Neon — сверь типы с авторитетным дампом и накатывай его, а не этот файл:
--   pg_dump --schema-only "$NEON_DATABASE_URL" > neon-schema.sql

create extension if not exists "uuid-ossp";

-- ===========================================================================
-- learner — корневая строка ученика. Всё остальное ссылается на device_id.
-- Ключ (device_id) исторический: `user-<id>` у залогиненного, device-id у
-- анонима (см. resolveProfileId). Переименовывать колонку нельзя.
-- Профильные колонки (level..writing) пишет upsertProfile/mergeDeviceIntoAccount.
-- ===========================================================================
create table if not exists learner (
  device_id       text        primary key,
  level           text,
  lang            text,
  style           text,
  goal            text,
  tutor           text,
  profession      text,
  interests       jsonb,
  minutes_per_day integer,
  skills          jsonb,
  writing         jsonb,
  safety_alert    boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

-- Идемпотентно доводим уже существующую (урезанную) таблицу до полной формы.
alter table learner add column if not exists level           text;
alter table learner add column if not exists lang            text;
alter table learner add column if not exists style           text;
alter table learner add column if not exists goal            text;
alter table learner add column if not exists tutor           text;
alter table learner add column if not exists profession      text;
alter table learner add column if not exists interests       jsonb;
alter table learner add column if not exists minutes_per_day integer;
alter table learner add column if not exists skills          jsonb;
alter table learner add column if not exists writing         jsonb;
alter table learner add column if not exists safety_alert    boolean not null default false;
alter table learner add column if not exists updated_at      timestamptz not null default now();

-- ===========================================================================
-- Долговременная память тьютора: журналы ошибок / тем / фактов / «пройденного»
-- и словарь. Все *_log — append-only ленты, читаются «последние N desc».
-- ===========================================================================
create table if not exists mistake_log (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  mistake    text        not null,
  created_at timestamptz not null default now()
);
create index if not exists mistake_log_device_idx
  on mistake_log (device_id, created_at desc);

create table if not exists fact_log (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  fact       text        not null,
  created_at timestamptz not null default now()
);
create index if not exists fact_log_device_idx
  on fact_log (device_id, created_at desc);

create table if not exists topic_log (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  topic      text        not null,
  created_at timestamptz not null default now()
);
create index if not exists topic_log_device_idx
  on topic_log (device_id, created_at desc);

create table if not exists resolved_log (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  resolved   text        not null,
  created_at timestamptz not null default now()
);
create index if not exists resolved_log_device_idx
  on resolved_log (device_id, created_at desc);

-- Словарь ученика. unique(device_id, word_key): одно слово на ученика.
create table if not exists vocab_bank (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  word       text        not null,
  word_key   text        not null,
  hint       text,
  added_at   timestamptz not null default now(),
  unique (device_id, word_key)
);
create index if not exists vocab_bank_device_idx
  on vocab_bank (device_id, added_at desc);

-- ===========================================================================
-- Прогресс по плану уроков. unique(device_id, lesson_key): одна строка на урок,
-- статус только повышается до 'passed', score — лучший, attempts копится.
-- score — целое 0..100 (см. api/lesson/complete).
-- ===========================================================================
create table if not exists lesson_progress (
  device_id    text        not null references learner(device_id) on delete cascade,
  lesson_key   text        not null,
  status       text        not null default 'failed',
  score        integer,
  attempts     integer     not null default 0,
  next_variant integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (device_id, lesson_key)
);

-- ===========================================================================
-- call_log — журнал голосовых звонков (felix). В ЭТОМ репо используется только
-- count(*) в isAccountEmpty + rekey в merge, поэтому колонки сверх минимума
-- неизвестны. Если в проде call_log богаче — накати дамп из Neon вместо этого.
-- ===========================================================================
create table if not exists call_log (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists call_log_device_idx
  on call_log (device_id, created_at desc);

-- ===========================================================================
-- Voice-tutor usage (учёт минут: лимит 10/день, 300/мес).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS voice_usage (
  device_id text NOT NULL,
  day       date NOT NULL,
  seconds   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, day)
);

CREATE TABLE IF NOT EXISTS voice_session (
  room       text PRIMARY KEY,
  device_id  text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);

-- Fast month rollups per device.
CREATE INDEX IF NOT EXISTS voice_usage_device_day_idx
  ON voice_usage (device_id, day);

-- ===========================================================================
-- IELTS mock-exam layer. Приложение пишет ielts_attempt + ielts_score на сабмит.
-- ===========================================================================

-- One row per learner submission of a task. Section-agnostic. `response` holds
-- what the learner produced (essay text, transcript, selected answers).
create table if not exists ielts_attempt (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  section    text        not null,
  response   jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ielts_attempt_device_idx
  on ielts_attempt (device_id, created_at desc);

-- Band scores for an attempt. `criteria` holds the per-criterion bands
-- (taskResponse/coherenceCohesion/… for writing, fluency/lexical/… for
-- speaking, {correct,total} for the answer-key sections). `overall_band` is the
-- computed 0–9 result. `assessment` stores the full AI payload (errors,
-- rewrites, feedback) for the progress screen + calibration.
create table if not exists ielts_score (
  id           uuid        primary key default uuid_generate_v4(),
  attempt_id   uuid        not null references ielts_attempt(id) on delete cascade,
  device_id    text        not null references learner(device_id) on delete cascade,
  section      text        not null,
  overall_band numeric(2,1) not null,
  criteria     jsonb       not null default '{}'::jsonb,
  assessment   jsonb       not null default '{}'::jsonb,
  provider     text,                       -- 'anthropic' | 'answer-key' | 'mock' — for calibration audits
  -- Filled when a staff teacher grades the same attempt blind (calibration).
  human_band   numeric(2,1),
  created_at   timestamptz not null default now()
);

create index if not exists ielts_score_device_idx
  on ielts_score (device_id, created_at desc);

-- ===========================================================================
-- Spaced-repetition schedule. One row per item under review. The tutor drills
-- items whose due_at has passed, then log_review moves them along a Leitner
-- ladder (box 0..4 → 1/3/7/21/60 days). kind = 'mistake' | 'vocab'.
-- ===========================================================================
create table if not exists review_item (
  id         uuid        primary key default uuid_generate_v4(),
  device_id  text        not null references learner(device_id) on delete cascade,
  kind       text        not null default 'mistake',
  item       text        not null,                    -- the text the tutor sees/quizzes
  item_key   text        not null,                    -- lower(trim(item)) for dedup/match
  box        integer     not null default 0,          -- Leitner box index 0..4
  reps       integer     not null default 0,          -- total reviews
  lapses     integer     not null default 0,          -- times reset by a wrong answer
  due_at     timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, kind, item_key)
);

-- Fast "what's due for this learner" lookup.
create index if not exists review_item_due_idx
  on review_item (device_id, kind, due_at);
