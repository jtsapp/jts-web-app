-- Ошибки сайта, которые ученик отправил помощнику, а тот не смог починить.
--
-- Пишет /api/assistant/chat, когда модель ставит метку [[REPORT_BUG]]: сначала
-- помощник пытается помочь (обновить страницу, куда нажать), и только если это
-- поломка платформы — строка попадает сюда. Не баги английского и не «где кнопка».
--
-- profile_id = 'user-<id>', как у остальных таблиц ученика. Снимок экрана и
-- клиентские сбои — чтобы по записи было видно, ГДЕ сломалось, без паролей
-- (их снимок экрана и так не берёт).

create table if not exists assistant_error_reports (
  id                 bigserial    primary key,
  created_at         timestamptz  not null default now(),
  profile_id         text         not null,
  user_id            bigint,
  lang               text,
  screen_id          text,
  page_url           text,
  user_agent         text,
  user_message       text         not null,
  assistant_summary  text,
  screen_text        text,
  client_errors      jsonb        not null default '[]'::jsonb
);

create index if not exists assistant_error_reports_created_idx
  on assistant_error_reports (created_at desc);

create index if not exists assistant_error_reports_profile_idx
  on assistant_error_reports (profile_id, created_at desc);

comment on table assistant_error_reports is 'Поломки сайта из чата помощника. См. lib/db/assistantErrorReports.js';
