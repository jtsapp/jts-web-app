-- Заметки Луны-трекера (решение владельца 15.10.2026): один совет — одна строка: что посоветовала, когда и выполнено
-- ли. Переписку НЕ храним — разговор с Луной по-прежнему живёт только во вкладке; здесь лишь её совет одной строкой
-- (`advice`, до 240 символов) и раздел, куда она звала (`target` — id из lib/assistant/destinations.js).
--
-- done_at ставит не ученик и не модель, а сверка с данными сайта (lib/assistant/tracker.js: заход в раздел Практики,
-- звонок Speaking Buddy, сданная домашка после совета). null — ещё не выполнено или проверить нечем.
--
-- Хранение — 30 дней: старое удаляет каждая новая запись (lib/db/assistantTracker.js), отдельного крона нет.
create table if not exists assistant_note (
  id         bigserial   primary key,
  profile_id text        not null,               -- `user-<id>`; гостю Луна недоступна
  target     text        not null,
  advice     text        not null,
  created_at timestamptz not null default now(),
  done_at    timestamptz
);

create index if not exists assistant_note_profile on assistant_note (profile_id, created_at desc);
create index if not exists assistant_note_created on assistant_note (created_at);

comment on table assistant_note is 'Советы Луны одной строкой, 30 дней. См. lib/db/assistantTracker.js';
