-- Тест уровня v16 (спека 2026-10-14-placement-v16-first-login-design.md): конверт результата — уровни навыков,
-- анкета целей, рекомендации — целиком, как его отдал тест. По нему «Главная» рисует подробный отчёт.
--
-- Ключ — профиль (`user-<id>` из resolveProfileId) и id попытки теста: тест отдаёт конверт несколько раз (итог
-- показан, «продолжить», переход в задание), и каждый раз это upsert той же строки. Пересдача — новая строка;
-- «Главная» берёт последнюю.
create table if not exists placement_v16_attempt (
  profile_id    text        not null,
  attempt_id    text        not null,
  overall_level text,                    -- 'B1'; null — тест брошен раньше, чем v16 назвал уровень
  status        text,                    -- overallStatus v16: preliminary | partial | assessed
  envelope      jsonb       not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (profile_id, attempt_id)
);

create index if not exists placement_v16_attempt_latest on placement_v16_attempt (profile_id, updated_at desc);

comment on table placement_v16_attempt is 'Результаты теста уровня v16. См. lib/db/placementV16.js';
