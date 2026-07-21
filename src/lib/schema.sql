-- Схема jts-web-app. Снята с живой Neon (PostgreSQL 18.4) 21.07.2026 из
-- pg_catalog — это источник истины, а не реконструкция по коду.
-- FK вынесены в конец: порядок создания таблиц тогда не важен.

create extension if not exists "uuid-ossp";

create table if not exists call_log (
  id bigserial not null,
  device_id text not null,
  tutor text,
  level text,
  lang text,
  duration_sec integer,
  recap text,
  topics jsonb default '[]'::jsonb not null,
  wins jsonb default '[]'::jsonb not null,
  mistakes jsonb default '[]'::jsonb not null,
  new_words jsonb default '[]'::jsonb not null,
  focus text,
  created_at timestamp with time zone default now() not null,
  constraint call_log_pkey PRIMARY KEY (id)
);
create index if not exists call_log_device_idx ON public.call_log USING btree (device_id, created_at DESC);

create table if not exists fact_log (
  id bigserial not null,
  device_id text not null,
  fact text not null,
  created_at timestamp with time zone default now() not null,
  constraint fact_log_pkey PRIMARY KEY (id)
);
create index if not exists fact_log_device_idx ON public.fact_log USING btree (device_id, created_at DESC);

create table if not exists ielts_attempt (
  id uuid default uuid_generate_v4() not null,
  device_id text not null,
  task_id uuid,
  section text not null,
  response jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint ielts_attempt_pkey PRIMARY KEY (id)
);
create index if not exists ielts_attempt_device_idx ON public.ielts_attempt USING btree (device_id, created_at DESC);

create table if not exists ielts_score (
  id uuid default uuid_generate_v4() not null,
  attempt_id uuid not null,
  device_id text not null,
  section text not null,
  overall_band numeric(2,1) not null,
  criteria jsonb default '{}'::jsonb not null,
  assessment jsonb default '{}'::jsonb not null,
  provider text,
  human_band numeric(2,1),
  created_at timestamp with time zone default now() not null,
  constraint ielts_score_pkey PRIMARY KEY (id)
);
create index if not exists ielts_score_device_idx ON public.ielts_score USING btree (device_id, created_at DESC);

create table if not exists ielts_task (
  id uuid default uuid_generate_v4() not null,
  section text not null,
  subtype text,
  title text not null,
  prompt text not null,
  target_band numeric(2,1),
  payload jsonb default '{}'::jsonb not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint ielts_task_pkey PRIMARY KEY (id)
);
create index if not exists ielts_task_section_idx ON public.ielts_task USING btree (section, active);

create table if not exists learner (
  device_id text not null,
  level text,
  lang text,
  style text,
  goal text,
  tutor text,
  interests jsonb default '[]'::jsonb not null,
  minutes_per_day integer,
  skills jsonb,
  writing jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone default now() not null,
  safety_alert boolean default false not null,
  profession text,
  constraint learner_pkey PRIMARY KEY (device_id)
);

create table if not exists lesson_exercise_cache (
  id bigserial not null,
  lesson_key text not null,
  level text not null,
  variant integer default 0 not null,
  exercises jsonb not null,
  provider text,
  created_at timestamp with time zone default now() not null,
  constraint lesson_exercise_cache_pkey PRIMARY KEY (id)
);
create unique index if not exists lesson_exercise_cache_key_idx ON public.lesson_exercise_cache USING btree (lesson_key, level, variant);

create table if not exists lesson_progress (
  id bigserial not null,
  device_id text not null,
  lesson_key text not null,
  status text not null,
  score integer,
  attempts integer default 1 not null,
  next_variant integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint lesson_progress_pkey PRIMARY KEY (id)
);
create unique index if not exists lesson_progress_device_lesson_idx ON public.lesson_progress USING btree (device_id, lesson_key);

create table if not exists mistake_log (
  id bigserial not null,
  device_id text not null,
  mistake text not null,
  created_at timestamp with time zone default now() not null,
  constraint mistake_log_pkey PRIMARY KEY (id)
);
create index if not exists mistake_log_device_idx ON public.mistake_log USING btree (device_id, created_at DESC);

create table if not exists resolved_log (
  id bigserial not null,
  device_id text not null,
  resolved text not null,
  created_at timestamp with time zone default now() not null,
  constraint resolved_log_pkey PRIMARY KEY (id)
);
create index if not exists resolved_log_device_idx ON public.resolved_log USING btree (device_id, created_at DESC);

create table if not exists review_item (
  id uuid default uuid_generate_v4() not null,
  device_id text not null,
  kind text default 'mistake'::text not null,
  item text not null,
  item_key text not null,
  box integer default 0 not null,
  reps integer default 0 not null,
  lapses integer default 0 not null,
  due_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint review_item_pkey PRIMARY KEY (id),
  constraint review_item_device_id_kind_item_key_key UNIQUE (device_id, kind, item_key)
);
create index if not exists review_item_due_idx ON public.review_item USING btree (device_id, kind, due_at);

create table if not exists topic_log (
  id bigserial not null,
  device_id text not null,
  topic text not null,
  created_at timestamp with time zone default now() not null,
  constraint topic_log_pkey PRIMARY KEY (id)
);
create index if not exists topic_log_device_idx ON public.topic_log USING btree (device_id, created_at DESC);

create table if not exists vocab_bank (
  id bigserial not null,
  device_id text not null,
  word text not null,
  word_key text not null,
  hint text,
  added_at timestamp with time zone default now() not null,
  constraint vocab_bank_pkey PRIMARY KEY (id)
);
create unique index if not exists vocab_bank_device_word_idx ON public.vocab_bank USING btree (device_id, word_key);

create table if not exists voice_session (
  room text not null,
  device_id text not null,
  started_at timestamp with time zone default now() not null,
  constraint voice_session_pkey PRIMARY KEY (room)
);

create table if not exists voice_usage (
  device_id text not null,
  day date not null,
  seconds integer default 0 not null,
  constraint voice_usage_pkey PRIMARY KEY (device_id, day)
);
create index if not exists voice_usage_device_day_idx ON public.voice_usage USING btree (device_id, day);

-- Внешние ключи
alter table call_log add constraint call_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table fact_log add constraint fact_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table ielts_attempt add constraint ielts_attempt_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table ielts_attempt add constraint ielts_attempt_task_id_fkey FOREIGN KEY (task_id) REFERENCES ielts_task(id) ON DELETE SET NULL;
alter table ielts_score add constraint ielts_score_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES ielts_attempt(id) ON DELETE CASCADE;
alter table ielts_score add constraint ielts_score_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table lesson_progress add constraint lesson_progress_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table mistake_log add constraint mistake_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table resolved_log add constraint resolved_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table review_item add constraint review_item_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table topic_log add constraint topic_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
alter table vocab_bank add constraint vocab_bank_device_id_fkey FOREIGN KEY (device_id) REFERENCES learner(device_id) ON DELETE CASCADE;
