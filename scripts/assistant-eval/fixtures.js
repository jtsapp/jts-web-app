// Снимки экранов и профили учеников для прогона Луны (scripts/assistant-eval/run.js).
//
// Снимки — в той же разметке, что даёт screenSnapshot.js («[кнопка #N «…»]», «[поле: ученик ввёл «…»]»,
// «(отмечено как неверное)», «[верный ответ по заданию: «…»]»): по ней код решает, задание ли на экране и
// проверено ли оно (openingFocus), и рядом с вопросом встают другие указания. Профиль с преподавателем — вывод
// настоящего loadStudentContext на тестовых строках БД (зонд этапа 1, 07.11.2026); остальные — он же с правкой
// строк формата, домашки и пакета. Ученики выдуманные.

// Модель ученика (ТЗ 8.1, 8.3): строки профиля — настоящими функциями сайта, чтобы зонд мерил то, что видит модель.
import { journalLine, paceLine, reviewAdvice, reviewLine, topicsLine } from '../../src/lib/studentModel/lines.js'
import { normalizeProgram } from '../../src/lib/studentModel/program.js'
import { buildJournal } from '../../src/lib/studentModel/journal.js'

export const TODAY = '2026-11-07'

export const USER = { name: 'Айгерим', languageLevel: 'A2' }

export const SCREENS = {
  home: {
    id: 'home',
    text: `Главная
[кнопка #1 «?»]
[кнопка #2 «Уведомления»]
[кнопка #3 «RU»]
Цель B1 · срок 1 марта 2027
[кнопка #4 «Как дойти до цели»]
Сегодня
Урок курса · 30 мин
[кнопка #5 «Начать»]
Speaking Buddy · 15 мин · 6 из 15
[кнопка #6 «Продолжить»]
Словарь · 10 мин
[кнопка #7 «Начать»]
[кнопка #8 «У меня мало времени»]
Практика на сегодня
[кнопка #9 «Чтение книги»]
[кнопка #10 «Speaking Buddy»]
[кнопка #11 «Аудирование»]
[кнопка #12 «Словарь»]
Расписание
Нет уроков
Домашнее задание
Unit 4. Past Simple · просрочено
[кнопка #13 «Открыть»]
Сильные и слабые стороны
Сильнее всего: Говорение 60%
Стоит подтянуть: Письмо 40%`,
  },
  homeKk: {
    id: 'home',
    text: `Басты бет
[кнопка #1 «?»]
[кнопка #2 «Хабарламалар»]
[кнопка #3 «KZ»]
Мақсат B1 · мерзімі 2027 жылғы 1 наурыз
Бүгін
Курс сабағы · 30 мин
[кнопка #4 «Бастау»]
Бүгінгі тәжірибе
[кнопка #5 «Кітап оқу»]
[кнопка #6 «Speaking Buddy»]
[кнопка #7 «Тыңдалым»]
[кнопка #8 «Сөздік»]
Үй жұмысы
Unit 4. Past Simple · мерзімі өтті
Күшті және әлсіз жақтар
Жазылым 40%
Айтылым 60%`,
  },
  homeEn: {
    id: 'home',
    text: `Home
[кнопка #1 «?»]
[кнопка #2 «Notifications»]
[кнопка #3 «EN»]
Goal B1 · by 1 March 2027
Today
Course lesson · 30 min
[кнопка #4 «Start»]
Practice for today
[кнопка #5 «Reading a book»]
[кнопка #6 «Speaking Buddy»]
Homework
Unit 4. Past Simple · overdue
Strengths and weaknesses
Writing 40%
Speaking 60%`,
  },
  // Self Study: на Главной нет расписания и домашки преподавателя.
  homeSelf: {
    id: 'home',
    text: `Главная
[кнопка #1 «?»]
[кнопка #2 «Уведомления»]
[кнопка #3 «RU»]
Цель B1 · срок 1 марта 2027
[кнопка #4 «Как дойти до цели»]
Сегодня
Урок курса · 30 мин
[кнопка #5 «Начать»]
Speaking Buddy · 15 мин · 6 из 15
[кнопка #6 «Продолжить»]
[кнопка #7 «У меня мало времени»]
Практика на сегодня
[кнопка #8 «Чтение книги»]
[кнопка #9 «Speaking Buddy»]
Сильные и слабые стороны
Сильнее всего: Говорение 60%
Стоит подтянуть: Письмо 40%`,
  },
  homeDemo: {
    id: 'home',
    text: `Демо-доступ открыт · осталось 2 дня 5 часов
[кнопка #1 «Записаться на пробный урок»]
Главная
[кнопка #2 «?»]
Пробный урок — бесплатно
30 минут с преподавателем
[кнопка #3 «Записаться»]
Практика на сегодня
[кнопка #4 «Чтение книги»]
[кнопка #5 «Speaking Buddy»]
[кнопка #6 «Аудирование»]
[кнопка #7 «Словарь»]`,
  },
  practice: {
    id: 'practice',
    text: `Практика
[кнопка #1 «Аудирование»]
[кнопка #2 «Чтение»]
[кнопка #3 «Письмо»]
[кнопка #4 «Говорение»]
[кнопка #5 «Грамматика»]
Уровень материалов
[кнопка #6 «Все»]
[кнопка #7 «A2»]
Говорение
[кнопка #8 «Pronunciation World»]
[кнопка #9 «Ситуации»]
[кнопка #10 «SpeakSpin: одна минута английского»]
[кнопка #11 «Шэдоуинг»]`,
  },
  profile: {
    id: 'profile',
    text: `Профиль
Рыцарь · A2
Дней подряд 2
Уроков пройдено 6
Навыки
Чтение · 11 заданий · 73% с первой
Говорение · 8 заданий · 75% с первой
[кнопка #1 «Тест на уровень»]
[кнопка #2 «Редактировать профиль»]
[кнопка #3 «Служба поддержки»]`,
  },
  lessons: {
    id: 'lessons',
    text: `Уроки
[кнопка #1 «Онлайн-уроки»]
[кнопка #2 «Отчёты»]
Ближайших занятий нет
Проведено 15 · Осталось 1 · Перенесено 2
5 ноября · Не пришёл`,
  },
  // Урок курса: задание вписать форму, ещё не проверено.
  lessonUnchecked: {
    id: 'kingdom-interior',
    text: `Урок 4 · Грамматика
Впиши глагол в Past Simple.
Yesterday I ___ (go) to the park with my sister.
[поле Ответ: ученик ввёл «goed»]
[кнопка #1 «Проверить»]`,
  },
  // То же задание после второй неверной проверки: сайт показал эталон (проверка окончательная).
  lessonWrongShown: {
    id: 'kingdom-interior',
    text: `Урок 4 · Грамматика
Впиши глагол в Past Simple.
Yesterday I ___ (go) to the park with my sister.
[поле Ответ: ученик ввёл «goed» (отмечено как неверное)]
Неверный ответ
[верный ответ по заданию: «went»]
[кнопка #1 «Продолжить»]`,
  },
  // Домашка: задание с урока, ответ не проверен.
  homeworkUnchecked: {
    id: 'homework',
    text: `Домашняя работа
Unit 4. Past Simple · просрочено · 1 из 4 решено
Задание 2. Choose the correct form.
She ___ to school by bus every day.
[кнопка #1 «go»]
[кнопка #2 «goes»]
[кнопка #3 «is going»]
[кнопка #4 «Проверить»]
[кнопка #5 «Сдать работу»]`,
  },
  // Урок посреди упражнения: ученик ушёл и вернулся (событие return_after_pause, кейс 2).
  // «Грамматика · игры»: вопрос темы Past Simple, ответ ещё не выбран (кейсы методики M03, EM).
  ggameTask: {
    id: 'grammar-games',
    text: `Грамматика · игры
Past Simple (правильные и неправильные глаголы)
Игра «Выбери форму» · 6 из 10
She ___ (go) to school yesterday.
[кнопка #1 «goed»]
[кнопка #2 «went»]
[кнопка #3 «gone»]`,
  },
  // «Грамматика · игры»: игра темы только что пройдена без ошибок (кейс методики M04 — «сложнее»).
  ggameDone: {
    id: 'grammar-games',
    text: `Грамматика · игры
Present Simple vs Present Continuous (+ частотность)
Игра «Выбери форму» пройдена
10 из 10 верно · ★★★
[кнопка #1 «Ещё раз»]
[кнопка #2 «Следующая игра»]
[кнопка #3 «← Все темы»]`,
  },
  lessonEx3: {
    id: 'kingdom-interior',
    text: `Урок 4 · A week without the internet
Упражнение 3 из 8
Выбери правильный вариант.
I ___ to the cinema yesterday.
[кнопка #1 «go»]
[кнопка #2 «went»]
[кнопка #3 «gone»]
[кнопка #4 «Проверить» неактивна]`,
  },
  // Итог первого урока курса (демо, событие demo_trial, кейс 40).
  lessonDone: {
    id: 'kingdom-interior',
    text: `Урок 1 · Hello!
Урок пройден!
Верно 9 из 10
[кнопка #1 «Продолжить»]`,
  },
}

const FORMAT = {
  teacher: 'Формат обучения: с преподавателем (индивидуально) — есть уроки по расписанию и домашка от преподавателя.',
  self: 'Формат обучения: Self Study — самостоятельно, без уроков с преподавателем и без домашки от него.',
  demo: 'Формат обучения: демо-доступ — пробный доступ к платформе, абонемента ещё нет.',
}

const TEACHER = `${FORMAT.teacher}
Уровень курса: A2, следующий уровень B1, пройдено 18%.
Цель ученика (профиль General English, как на баннере Главной): B1, срок 2027-03-01.
Навыки (уровень A2, % верных с первой попытки в заданиях этого уровня, в скобках — число заданий): speaking 60% (25), listening 55% (20), grammar 48% (25), vocab 45% (20), writing 40% (10), reading — мало данных (3).
Домашка от преподавателя (все работы раздела «Домашняя работа»), открыто 3: «Unit 4. Past Simple» — просрочено, срок был 2026-10-13, заданий 4; «Lesson 12. Travel» — задано, до 2026-11-12 (через 5 дн.), заданий 2; «Reading: My city» — задано, до 2026-11-20 (через 13 дн.). Кроме того: проверено 1.
Ближайших занятий в расписании нет.
Уроки с преподавателем по пакету: проведено 15, осталось 1 (перенесено 2). Пакет заканчивается: продлить или записаться — через менеджера в общем чате WhatsApp.
План на сегодня (тот же, что блок «Сегодня» на Главной; занятия и домашка преподавателя — не в нём): урок курса — 30 мин, не начато; разговор со Speaking Buddy — 15 мин, начато, 6 из 15 мин; слова в «Словаре» — 10 мин, не начато. Сделано 6 из 55 мин.
Speaking Buddy: дневной лимит 20 мин, на этой неделе занятий 12 мин.
Последние 7 дней: дней с занятиями 2, заданий 14 (верно с первой попытки 64%), Speaking Buddy 12 мин, тренажёры 18 мин. Неделей раньше: дней с занятиями 1, заданий 6, Speaking Buddy 0 мин, тренажёры 5 мин.
Разделы Практики, где ученик уже бывал: Чтение (3 дн. назад); давно не открыты — Шэдоуинг (21 дн. назад).
Ошибки из разговоров со Speaking Buddy, ещё не пройденные: «I go to cinema yesterday → I went to the cinema yesterday»; «He don't like → He doesn't like».
Совет сайта, что сделать сейчас: Домашняя работа — срок домашки уже прошёл (метка [[OPEN homework]]).`

// Строка токенов — та, что contextLines кладёт на стенде с наградами (areRewardsEnabled).
const TOKENS_LINE = 'Токены: баланс 120; период до 2026-11-30 (осталось 23 дн.); ближайший приз «Кружка» — 300 токенов, не хватает 180; в будний день без активности ночью спишется 10.'

const withoutLines = (ctx, ...prefixes) =>
  ctx
    .split('\n')
    .filter((l) => !prefixes.some((p) => l.startsWith(p)))
    .join('\n')

const SELF = [
  FORMAT.self,
  ...withoutLines(TEACHER, 'Формат обучения', 'Домашка', 'Ближайших', 'Уроки с преподавателем', 'Совет сайта').split('\n'),
  'Совет сайта, что сделать сейчас: Практика → Письмо — самый слабый навык (метка [[OPEN practice-writing]]).',
].join('\n')

// Три дня без занятий: неделя почти пустая (ТЗ v2.0, кейс 12).
const AWAY = TEACHER.replace(
  /^Последние 7 дней:.*$/m,
  'Последние 7 дней: дней с занятиями 0, заданий 0, Speaking Buddy 0 мин, тренажёры 0 мин; последнее занятие — 2026-11-03. Неделей раньше: дней с занятиями 3, заданий 21, Speaking Buddy 14 мин, тренажёры 25 мин.',
)

// План дня из событий «Луна пишет первой»: семь задач (many_tasks, кейс 4).
const PLAN_LINE = TEACHER.split('\n').find((l) => l.startsWith('План на сегодня'))
const MANY = TEACHER.replace(
  PLAN_LINE,
  'План на сегодня (тот же, что блок «Сегодня» на Главной; занятия и домашка преподавателя — не в нём): урок курса — 30 мин, не начато; урок курса — 30 мин, не начато; разговор со Speaking Buddy — 15 мин, не начато; слова в «Словаре» — 10 мин, не начато; шэдоуинг — 10 мин, не начато; воркбук — 15 мин, не начато; книги, тексты и аудио — 15 мин, не начато. Сделано 0 из 125 мин.',
)
// Демо после первого урока (кейс 40): урок пройден, заявки на пробный урок ещё нет.
const DEMO_AFTER = [
  FORMAT.demo,
  'Уровень курса: A1, следующий уровень A2, пройдено 3%.',
  'Последние 7 дней: дней с занятиями 1, заданий 9 (верно с первой попытки 70%), Speaking Buddy 0 мин, тренажёры 0 мин.',
].join('\n')

// Модель ученика на 07.11.2026: ступень L3, тема Past Simple слабая и пора повторить, 12 слов к повторению, журнал.
const MODEL_NOW = Date.parse('2026-11-07T10:00:00Z')
const MODEL_DAY = 24 * 60 * 60 * 1000
const MODEL_PROGRAM = normalizeProgram({
  levels: [{ id: 'L3', range: 'A2 → B1' }],
  topics: [
    ['L3-01', 'Question forms (порядок слов: aux + subject + verb)'],
    ['L3-02', 'Present Simple vs Present Continuous (+ частотность)'],
    ['L3-07', 'Past Simple (правильные и неправильные глаголы)'],
    ['L3-08', 'Past Continuous + Past Simple (while / when)'],
    ['L3-10', 'Articles — a / an, the, нулевой артикль'],
    ['L3-13', 'Present Perfect vs Past Simple'],
  ].map(([id, ru]) => ({ id, lv: 'L3', title: { ru } })),
})
const MODEL_ITEMS = [
  { item: 'ggame:L3-02', kind: 'grammar', seen: 14, correct: 12, box: 2, dueAt: MODEL_NOW + 4 * MODEL_DAY, lastAt: MODEL_NOW - 3 * MODEL_DAY },
  { item: 'ggame:L3-07', kind: 'grammar', seen: 11, correct: 6, box: 1, dueAt: MODEL_NOW - 3600_000, lastAt: MODEL_NOW - 3 * MODEL_DAY },
  ...['decide', 'borrow', 'expensive', 'journey', 'weather', 'improve', 'enough', 'invite', 'forget', 'arrive', 'quiet', 'during'].map((w) => ({
    item: `word:${w}`, kind: 'word', title: w, seen: 2, correct: 1, box: 0, dueAt: MODEL_NOW - 3600_000, lastAt: MODEL_NOW - MODEL_DAY,
  })),
]
const MODEL_JOURNAL = journalLine(buildJournal([
  { source: 'ggame', item: 'ggame:L3-07', example: 'She ___ (buy) a new phone last week. → bought', at: MODEL_NOW - 3 * MODEL_DAY },
  { source: 'ggame', item: 'ggame:L3-07', example: 'We ___ (see) a film yesterday. → saw', at: MODEL_NOW - 3 * MODEL_DAY - 60_000 },
  { source: 'ggame', item: 'ggame:L3-07', at: MODEL_NOW - 4 * MODEL_DAY },
  { source: 'lesson', item: 'lesson:a2:12', title: 'A2 · A day out', example: "They ___ (not / like) the museum. → didn't like", at: MODEL_NOW - 2 * MODEL_DAY },
  { source: 'vocab', item: 'word:borrow', title: 'borrow', at: MODEL_NOW - MODEL_DAY },
], { titleOf: (item) => MODEL_PROGRAM.topics.find((t) => `ggame:${t.id}` === item)?.title || null }))
const MODEL_LINES = [
  topicsLine({ items: MODEL_ITEMS, program: MODEL_PROGRAM, level: 'A2', now: MODEL_NOW }),
  reviewLine({ items: MODEL_ITEMS, program: MODEL_PROGRAM, now: MODEL_NOW }),
  MODEL_JOURNAL,
]
// Строки модели — после «Навыков», как их кладёт studentContext.js; журнал — после ошибок Speaking Buddy.
function withModel(ctx, pace = null) {
  const lines = ctx.split('\n')
  const at = lines.findIndex((l) => l.startsWith('Навыки'))
  lines.splice(at + 1, 0, MODEL_LINES[0], MODEL_LINES[1])
  const sb = lines.findIndex((l) => l.startsWith('Ошибки из разговоров'))
  lines.splice(sb + 1, 0, MODEL_LINES[2])
  if (pace) lines.push(paceLine({ pace, program: MODEL_PROGRAM, items: MODEL_ITEMS, now: MODEL_NOW }))
  return lines.join('\n')
}
const MODEL_ADVICE = reviewAdvice({ items: MODEL_ITEMS, program: MODEL_PROGRAM, now: MODEL_NOW })
const PACE_STREAK = { verdict: 'easier', why: 'streak', item: 'ggame:L3-07', n: 9, accuracy: 0.44, streak: 3 }
const PACE_LOW = { verdict: 'easier', why: 'low', item: 'ggame:L3-07', n: 14, accuracy: 0.57 }
const PACE_HIGH = { verdict: 'harder', why: 'fast', item: 'ggame:L3-02', n: 10, accuracy: 1, streak: 10 }
// Self Study без домашки и без шага плана на сегодня: «Совет сайта» — повторение по расписанию (adviceLine).
const SELF_DONE = withModel(SELF)
  .replace(/^План на сегодня.*$/m, 'План на сегодня (тот же, что блок «Сегодня» на Главной): всё сделано — урок курса 30 мин, разговор со Speaking Buddy 15 мин, слова в «Словаре» 10 мин. Сделано 55 из 55 мин.')
  // «Совет сайта» — тем же правилом, что adviceLine в studentContext.js: шага плана нет, повторение по расписанию.
  .replace(/^Совет сайта.*$/m, `Совет сайта, что сделать сейчас: ${MODEL_ADVICE.name} — ${MODEL_ADVICE.reason} (метка [[OPEN ${MODEL_ADVICE.id}]]).`)

export const PROFILES = {
  teacher: TEACHER,
  many: MANY,
  demoAfterLesson: DEMO_AFTER,
  teacherRewards: TEACHER.replace(/^(Уроки с преподавателем по пакету:.*)$/m, `$1\n${TOKENS_LINE}`),
  self: SELF,
  demo: [FORMAT.demo, 'Уровень курса: A1, следующий уровень A2, пройдено 4%.', 'Навыки: мало данных.', 'Совет сайта, что сделать сейчас: урок курса — первый урок уровня (метка [[OPEN learning]]).'].join('\n'),
  away: AWAY,
  // Новый ученик без теста (кейс 24): уровня и плана ещё нет.
  newcomer: [FORMAT.teacher, 'Уровень курса: не определён — теста уровня ещё не было.', 'Навыки: мало данных.'].join('\n'),
  // Сразу после теста (кейс 35): уровень есть, цель и срок из анкеты, план собран.
  afterTest: TEACHER.replace('пройдено 18%', 'пройдено 0%'),
  // Модель ученика (кейсы методики M*): строки тем, повторения и журнала; темп — по кейсу.
  teacherModel: withModel(TEACHER),
  modelStreak: withModel(TEACHER, PACE_STREAK),
  modelLow: withModel(TEACHER, PACE_LOW),
  modelHigh: withModel(TEACHER, PACE_HIGH),
  selfDone: SELF_DONE,
}
