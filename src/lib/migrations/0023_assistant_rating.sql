-- Журнал ответов Луны и их оценка учеником (ТЗ v2.0, раздел 1 и 8.5; спека
-- docs/superpowers/specs/2026-11-08-luna-answer-rating-design.md). Одна строка — один ответ модели: вопрос, видимый
-- ответ, экран, режим, модель, задержка, кнопки под ответом и какую нажали, 👍/👎 с причиной.
--
-- Это отступление от правила 15.10.2026 «переписку не храним» (0018, 0022): его требует ТЗ 8.5 — «еженедельный разбор 50
-- случайных диалогов» не из чего выбрать, если хранить лишь оценённые ответы. Поэтому строка без персональных данных:
-- снимка экрана нет (только id экрана), имя, телефон и почту ученика роут заменяет метками до записи
-- (lib/assistant/ratingShape.js, scrubPersonal). profile_id — только чтобы ученик не переписал чужую строку; наружу
-- (служебный GET) он уходит псевдонимом.
--
-- id создаёт окно (оно пишет строку, когда ответ дописан, и дописывает оценку и нажатие в ту же строку), seq — номер
-- состояния: запросы одного ответа могут прийти не по порядку, и старое состояние новое не перепишет.
--
-- Хранение: неоценённый ответ без комментария — 14 дней (разбор раз в неделю плюс запас), оценённый — 30, как заметки
-- Луны. Старое удаляет запись (lib/db/assistantRatings.js), крона нет.
create table if not exists assistant_rating (
  id         text        primary key,            -- id ответа от окна
  profile_id text        not null,               -- `user-<id>`; гостю Луна недоступна
  chat_id    text        not null,               -- разговор во вкладке: собрать диалог для разбора
  turn       smallint    not null default 0,     -- номер ответа в разговоре
  seq        integer     not null default 0,
  screen     text,
  lang       text        not null default 'ru',
  persona    text        not null default 'luna',
  channel    text        not null default 'text', -- text | voice | call
  mode       text        not null default 'site', -- teacher | site | event | hint
  opening    boolean     not null default false,  -- первая реплика окна (открыл, позвал голосом)
  event      text,                                -- тип события «Луна пишет первой»
  offtopic   boolean     not null default false,
  model      text,
  question   text        not null default '',
  answer     text        not null default '',
  first_ms   integer,                             -- от вопроса до первого куска текста (звонок — до первой фразы)
  sound_ms   integer,                             -- до первого звука голосового ответа
  actions    text,                                -- кнопки под ответом, по строке: open:practice, click:Далее…
  clicked    text,
  clicked_at timestamptz,
  rating     smallint,                            -- 1 — 👍, -1 — 👎
  reasons    text,                                -- через запятую: wrong, offtarget, unclear, lang
  comment    text,
  rated_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_rating_created on assistant_rating (created_at);
create index if not exists assistant_rating_rated on assistant_rating (rated_at) where rating is not null;

comment on table assistant_rating is 'Ответы Луны и их оценка (ТЗ 8.5), без ПД, 14/30 дней. См. lib/db/assistantRatings.js';
