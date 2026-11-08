-- Память Луны (ТЗ v2.0 «Луна-трекер», 8.1; решение владельца 08.11.2026): короткие факты об ученике, которые он сам
-- рассказал и которые полезны учёбе, — «готовится к поступлению осенью», «боится говорения», «учится по вечерам».
-- Луна просит запомнить меткой [[REMEMBER …]] (lib/assistant/facts.js), роут сверяет и пишет сюда, факты едут в её
-- профиль (studentContext.js), ученик видит и удаляет их в Профиле («Память Луны»).
--
-- Переписку не храним — как и у заметок о советах (0018): только сам факт одной строкой (до 120 символов).
-- Чувствительное (здоровье, деньги, контакты, другие люди) отсекает код ещё до записи.
--
-- Своя таблица, а не learner.facts: те факты пишет голосовой тьютор без срока и без показа ученику, а у Луны — 30 дней
-- и право ученика удалить любой (ТЗ 8.1). Срок — expires_at; просроченное удаляет каждая новая запись, крона нет.
create table if not exists assistant_fact (
  id         bigserial   primary key,
  profile_id text        not null,               -- `user-<id>`; гостю Луна недоступна
  fact       text        not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists assistant_fact_profile on assistant_fact (profile_id, created_at desc);
create index if not exists assistant_fact_expires on assistant_fact (expires_at);

comment on table assistant_fact is 'Память Луны: факты ученика о себе, 30 дней. См. lib/db/assistantFacts.js';
