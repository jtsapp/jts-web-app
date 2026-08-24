-- Статус выжимки звонка. Сами колонки выжимки (recap, topics, wins, mistakes,
-- new_words, focus) есть в call_log с baseline — не хватало только признака
-- «эту строку уже обработали».
--
-- Значения: null (звонок до фичи ИЛИ процесс умер до первой записи статуса),
-- 'pending' | 'done' | 'skipped' | 'failed'.
--
-- Колонки НЕТ в insertCall намеренно: runMigrations глотает ошибки
-- (instrumentation.js), и если эта миграция не доехала на инстанс, то
-- insert into call_log (… summary_status …) упал бы с «column does not exist»
-- → 500 → потерян весь звонок вместе с транскриптом. Путь сохранения звонка не
-- должен зависеть от новой колонки; статус пишет только суммаризатор.
alter table call_log add column if not exists summary_status text;

-- Частичный индекс под попутный подбор зависших выжимок (sweepStaleSummaries):
-- строк с null/pending мало, полный индекс по колонке был бы мусором.
create index if not exists call_log_summary_pending_idx
  on call_log (created_at)
  where summary_status is null or summary_status = 'pending';
