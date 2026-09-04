-- Серверный прогон теста на определение уровня.
--
-- Проверка ответов уехала на сервер (ключей в публичном банке больше нет), но
-- сам роут проверки отвечал на любой запрос: ключ можно было подобрать
-- перебором — четыре запроса на задание. Теперь проверка привязана к прогону:
-- задание в рамках одного прогона проверяется один раз (повтор возвращает уже
-- вынесенный вердикт), число заданий ограничено, а законченный прогон закрыт.
--
-- Побочный, но главный эффект: сервер сам помнит, что и как было отвечено, —
-- итоговый уровень считается по его записи, а не по журналу, который присылает
-- клиент (журнал можно нарисовать любой).
create table if not exists placement_session (
  token      text primary key,                        -- отдаётся клиенту, случайный
  profile_id text,                                    -- если прогон опознан (аккаунт/устройство)
  variant    text,                                    -- express | full
  answers    jsonb       not null default '[]'::jsonb, -- [{id, correct, at}] в порядке ответа
  finished   boolean     not null default false,
  level      text,                                    -- итог, когда прогон закрыт
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_placement_session_created on placement_session (created_at);
create index if not exists idx_placement_session_profile on placement_session (profile_id);
