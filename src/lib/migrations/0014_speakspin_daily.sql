-- Дневной лимит ИИ-разборов «SpeakSpin» (Практика → Говорение).
--
-- Один разбор = STT (Azure) + оценка произношения (Azure) + грейдер (Sonnet
-- 5.5) на ответе до минуты ≈ $0.02, как у «Ситуаций». Потолки (20 в сутки,
-- демо-аккаунту 5) не здесь, а константами в lib/db/speakspinBudget.js:
-- таблица лишь считает потраченное, поэтому поменять лимит можно без миграции.
--
-- Своя таблица, а не situations_assess: лимиты разделов независимы — двадцать
-- разборов «Ситуаций» не должны съедать попытки в «SpeakSpin».
--
-- Ключ суток — дата UTC ('2026-10-02'), как у situations_assess.
create table if not exists speakspin_daily (
  profile_id text        not null,
  day_key    text        not null,   -- сутки UTC, '2026-10-02'
  used       integer     not null default 0,   -- потрачено разборов
  updated_at timestamptz not null default now(),
  primary key (profile_id, day_key)
);

comment on table speakspin_daily is 'Дневной лимит ИИ-разборов «SpeakSpin». См. lib/db/speakspinBudget.js';
