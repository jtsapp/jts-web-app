-- Модель ученика Луны (ТЗ v2.0 «Луна-трекер», 8.1 и 8.3; спека
-- docs/superpowers/specs/2026-11-08-luna-student-model-methodology-design.md).
--
-- skill_stat и skill_level_stat знают только «сколько верных по навыку». Для методики нужны сами ответы: какая тема,
-- когда, с какой паузой, на чём ошибка, — отсюда журнал ошибок, темп (80 %, «3 ошибки подряд»), поведение
-- (когда и сколько подряд занимается) и интервальное повторение. Пишет их POST /api/study/answers
-- (lib/db/studentModel.js), читает профиль Луны (lib/assistant/studentContext.js) и «Словарь» (блок «Повторить по
-- расписанию»).
--
-- study_answer — журнал ответов, 30 дней (как заметки и память Луны, 0018 и 0022); старое удаляет следующая запись
-- ученика, крона нет. Пример — только у ошибки, до 200 символов: «вопрос → верный ответ». Время ставит сервер базы.
create table if not exists study_answer (
  id         bigserial   primary key,
  profile_id text        not null,               -- `user-<id>`; гостю модель не пишется
  at         timestamptz not null default now(),
  source     text        not null,               -- ggame | vocab | lesson
  item       text        not null,               -- ggame:L2-03 | word:<ключ словаря> | lesson:b1:5
  level      text,                               -- CEFR задания, если раздел его знает
  ok         boolean     not null,
  gap_ms     integer,                            -- пауза с прошлого ответа на вкладке (темп); null — не мерили
  title      text,                               -- тема, слово или урок — для журнала без похода в каталоги
  example    text                                -- только у ошибки
);

create index if not exists study_answer_profile on study_answer (profile_id, at desc);

comment on table study_answer is 'Ответы заданий для модели ученика Луны, 30 дней. См. lib/db/studentModel.js';

-- study_item — карта тем и слов: строка на вещь повторения (тема «Грамматики · игр» или слово «Словаря»), без срока
-- хранения. Коробка и срок — по правилу lib/studentModel/sr.js (1, 3, 7, 14 дней, потом раз в 30). day/day_seen/
-- day_wrong — итог текущих суток UTC: провальный день откатывает вещь в коробку 0. extra — у слов перевод и пример:
-- по ним «Словарь» собирает тренировку повторения без каталога.
create table if not exists study_item (
  profile_id text        not null,
  item       text        not null,
  kind       text        not null,               -- grammar | word
  title      text,
  extra      jsonb,
  seen       integer     not null default 0,
  correct    integer     not null default 0,
  box        integer     not null default 0,
  due_at     timestamptz not null,
  lapses     integer     not null default 0,
  day        date,
  day_seen   integer     not null default 0,
  day_wrong  integer     not null default 0,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  primary key (profile_id, item)
);

create index if not exists study_item_due on study_item (profile_id, due_at);

comment on table study_item is 'Темы и слова ученика: интервальное повторение (1, 3, 7, 14 дней). См. lib/db/studentModel.js';
