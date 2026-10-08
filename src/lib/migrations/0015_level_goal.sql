-- Цель ученика на «Главной»: до какого уровня он идёт («Цель — B2»).
--
-- Выбирается в туре главной (первый шаг) и меняется кликом по медали; дорожка
-- уровня рисует ступени от ближайшего уровня до цели.
--
-- Своя таблица, а не колонка в learner: learner общий с felix, и чужую схему
-- лишними полями не расширяем. Ключ — профиль из resolveProfileId
-- (`user-<id>`): цель есть только у залогиненного, как и сама «Главная».
--
-- from_level — с какого уровня цель ставилась. Без него нечем нарисовать
-- пройденную дорожку, когда профиль до цели дорос (кадр «Теперь ваш уровень»).
create table if not exists level_goal (
  profile_id   text        primary key,
  target_level text        not null,   -- 'B2'
  from_level   text        not null,   -- 'A0'
  updated_at   timestamptz not null default now()
);

comment on table level_goal is 'Цель уровня на «Главной». См. lib/db/levelGoal.js';
