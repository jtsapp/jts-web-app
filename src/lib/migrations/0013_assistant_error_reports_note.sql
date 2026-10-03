-- Примечание сотрудника к поломке из чата помощника («Ошибки сайта» в админке).
--
-- Одно перезаписываемое примечание на запись: что выяснили, кому передали,
-- почему закрыли. Кто и когда написал — чтобы коллега видел, чьё это слово.
-- Правка текста «Что передал помощник» отдельных колонок не требует:
-- меняется assistant_summary, а edited_at показывает, что текст правили руками.

alter table assistant_error_reports add column if not exists note              text;
alter table assistant_error_reports add column if not exists note_author_name  text;
alter table assistant_error_reports add column if not exists note_updated_at   timestamptz;
alter table assistant_error_reports add column if not exists edited_at         timestamptz;
