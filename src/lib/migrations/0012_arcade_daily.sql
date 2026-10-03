-- Дневной лимит ИИ-разборов «Аркады» (Практика → Говорение → Speak or Die).
--
-- Один разбор = Sonnet на стенограмме минутного раунда (~$0.01). Потолки не
-- здесь, а константами в lib/db/arcadeBudget.js: таблица лишь считает
-- потраченное, поэтому поменять лимит или снять его вовсе можно без миграции.
--
-- Ключ суток — дата UTC ('2026-09-28'), как у situations_assess.
create table if not exists arcade_review (
  profile_id text        not null,
  day_key    text        not null,   -- сутки UTC, '2026-09-28'
  used       integer     not null default 0,   -- потрачено разборов
  updated_at timestamptz not null default now(),
  primary key (profile_id, day_key)
);

comment on table arcade_review is 'Дневной лимит ИИ-разборов «Аркады». См. lib/db/arcadeBudget.js';
