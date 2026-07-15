-- Voice-tutor usage tables (Neon / DATABASE_URL). Apply once:
--   psql "$DATABASE_URL" -f api/_lib/schema.sql
-- Safe to re-run (IF NOT EXISTS).

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
-- IELTS mock-exam layer (ported from felix lib/db/schema.sql).
-- The app writes ielts_attempt + ielts_score per submission.
-- ===========================================================================

create extension if not exists "uuid-ossp";

-- Identity row the IELTS tables hang off. Trimmed to what this app needs:
-- felix's learner table also carries onboarding/profile columns which live in
-- the backend here, so only the key + timestamps are ported.
create table if not exists learner (
  device_id    text        primary key,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

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
