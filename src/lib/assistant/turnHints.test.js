import { describe, it, expect } from 'vitest'
import { addressHint, formatOfContext, questionHints } from './turnHints.js'

const hintsFor = (question, extra = {}) => questionHints({ question, ...extra }).join('\n')

describe('указания рядом с вопросом (turnHints.js)', () => {
  it('обращение: «ты» без рода; по-казахски «сен»; по-английски не нужно', () => {
    expect(addressHint('ru')).toMatch(/на «ты». О прошлом и состоянии ученика пиши через «у тебя»/)
    // Второй круг (08.11.2026): слов «без рода», «пол не указан» в указании нет — модель цитировала их ученику.
    expect(addressHint('ru')).not.toMatch(/без рода|пол ученика/)
    expect(addressHint('kk')).toMatch(/на «сен»/)
    expect(addressHint('en')).toBe('')
  })

  // Решение владельца 07.11.2026: род — по полу из Профиля, не по имени; не указан — без рода.
  it('обращение: пол из Профиля задаёт род; казахскому и английскому он не нужен', () => {
    expect(addressHint('ru', 'FEMALE')).toMatch(/женский пол.*«ты выбрала»/)
    expect(addressHint('ru', 'MALE')).toMatch(/мужской пол.*«ты выбрал»/)
    expect(addressHint('ru', null)).toMatch(/«у тебя сделано»/)
    expect(addressHint('kk', 'FEMALE')).toMatch(/на «сен»/)
    expect(addressHint('en', 'MALE')).toBe('')
  })

  it('шаблоны учителя: правило, перевод, проверка текста', () => {
    expect(hintsFor('Present Perfect и Past Simple — в чём разница?')).toMatch(/частая ошибка .*проверочный вопрос/)
    expect(hintsFor('Переведи: Мне нужно перенести урок на завтра')).toMatch(/1–2 альтернативы/)
    expect(hintsFor('Проверь: Yesterday I have went to the cinema')).toMatch(/было → стало → почему/)
  })

  // «Проверь» на непроверенном задании — нажать «Проверить», а не разбирать текст (prompt.js, RULES).
  it('«проверь» на непроверенном задании — не разбор текста', () => {
    expect(hintsFor('проверь', { unchecked: true })).toBe('')
    expect(hintsFor('Проверь: I has a cat and two dog', { unchecked: true })).not.toMatch(/было → стало/)
  })

  it('жалоба — Feedback с меткой; токены — только по базе; план на сегодня', () => {
    expect(hintsFor('Хочу пожаловаться на менеджера')).toContain('[[OPEN feedback]]')
    expect(hintsFor('Где мои токены и призы?')).toMatch(/Токены и призы/)
    expect(hintsFor('Что мне делать сегодня?')).toMatch(/2–3 шага/)
    expect(hintsFor('Маған бүгін не істеу керек?')).toMatch(/2–3 шага/)
    expect(hintsFor('Как поменять язык?')).toBe('')
  })

  // Этап 1: жалоба с подробностями — черновик в Feedback, путь назван словами; проценты двух экранов — считаются одинаково.
  it('жалоба: путь словами и метка черновика; проценты на Главной и в Профиле — без выдуманной разницы', () => {
    const complaint = hintsFor('Хочу пожаловаться на менеджера')
    expect(complaint).toMatch(/«Жалоба на менеджера»/)
    expect(complaint).toContain('[[FEEDBACK категория | черновик]]')
    expect(hintsFor('Почему на Главной чтение 32%, а в Профиле 73%?')).toMatch(/считают одинаково/)
    expect(hintsFor('Профильде пайыз басқа, басты бетте басқа')).toMatch(/считают одинаково/)
    expect(hintsFor('Сколько процентов скидка?')).not.toMatch(/считают одинаково/)
  })

  it('Self Study и демо: уроков с преподавателем нет — правил переноса не расписывать', () => {
    const self = 'Формат обучения: Self Study — самостоятельно, без уроков с преподавателем и без домашки от него.'
    const demo = 'Формат обучения: демо-доступ — пробный доступ к платформе, абонемента ещё нет.'
    const teacher = 'Формат обучения: с преподавателем (индивидуально) — есть уроки по расписанию и домашка от преподавателя.'
    expect(formatOfContext(self)).toBe('self_study')
    expect(formatOfContext(`Уровень: A2\n${demo}`)).toBe('demo')
    expect(formatOfContext(teacher)).toBe('with_teacher')
    expect(formatOfContext(null)).toBeNull()
    expect(hintsFor('Как перенести урок?', { studentContext: self })).toMatch(/Self Study/)
    expect(hintsFor('Как перенести урок?', { studentContext: demo })).toMatch(/пробный урок/)
    expect(hintsFor('Как перенести урок?', { studentContext: teacher })).toBe('')
  })
})

// ТЗ v2.0, 5.2 и событие short_on_time: «мало времени» — пересчёт плана меткой, если план по дням есть.
describe('мало времени', () => {
  const withPlan = 'План на сегодня (тот же, что блок «Сегодня» на Главной; …): воркбук — 15 мин, не начато.'
  const hint = (question, studentContext = withPlan, previous = '') =>
    questionHints({ question, studentContext, previous }).find((h) => /мало времени|обычный план/.test(h)) || null

  it('минуты названы или нет — указание с меткой пересчёта; без плана — короткий шаг без метки', () => {
    for (const q of ['у меня 15 минут', 'есть всего 10 минут', 'спешу, что успею?', 'мало времени сегодня', 'уақытым аз', "I'm short on time"]) {
      expect(hint(q)).toMatch(/\[\[REPLAN_NOW N\]\]/)
    }
    expect(hint('у меня 15 минут', 'Формат обучения: Self Study.')).toMatch(/плана по дням у него нет/)
    // прежний бэкенд без ручки пересчёта — как без плана
    expect(hint('у меня 15 минут', `${withPlan}\nПересчитать день под «мало времени» сейчас нельзя.`)).toMatch(/плана по дням у него нет/)
    expect(hint('сколько минут длится урок с преподавателем?')).toBe(null)
  })

  it('число в ответ на её «сколько минут?» — то же указание; без её вопроса — нет', () => {
    expect(hint('20', withPlan, 'Сколько у тебя есть: 10, 20 или 30 минут?')).toMatch(/REPLAN_NOW N/)
    expect(hint('минут 15', withPlan, 'Сколько минут есть сегодня?')).toMatch(/REPLAN_NOW N/)
    expect(hint('20', withPlan, 'Отлично, ответ верный!')).toBe(null)
  })

  // Зонд 07.11.2026: русское указание у казахского вопроса тянуло ответ на русский (17 из 20) — язык и образец явно.
  it('казахский ответ — с казахским образцом фразы', () => {
    const kk = questionHints({ question: 'Бүгін уақытым аз, 10 минут қана бар', studentContext: withPlan, answerLang: 'kk' })
    expect(kk.some((h) => /REPLAN_NOW N/.test(h) && /по-казахски.*қайта құрамын/.test(h))).toBe(true)
    expect(hint('у меня 15 минут')).not.toMatch(/по-казахски/)
  })

  it('«верни обычный план» — метка с нулём', () => {
    expect(hint('верни обычный план')).toMatch(/\[\[REPLAN_NOW 0\]\]/)
    expect(hint('верни обычный план', 'Формат обучения: Self Study.')).toBe(null)
  })
})

// ТЗ v2.0, 7.2 и 7.4: перерыв и «На сегодня всё» — указанием у вопроса, как «мало времени».
describe('перерыв и «На сегодня всё»', () => {
  const PLAN = 'План на сегодня (тот же, что блок «Сегодня» на Главной…): урок курса — 30 мин, не начато.'
  it('устал / перерыв — [[BREAK 10]], просит прямо — _NOW', () => {
    const h = hintsFor('я устала, хочу перерыв', { studentContext: PLAN })
    expect(h).toMatch(/\[\[BREAK 10\]\]/)
    expect(h).toMatch(/\[\[BREAK_NOW N\]\]/)
    expect(h).toMatch(/пока сайт открыт/)
  })

  it('«на сегодня всё» — [[STOP_DAY_NOW]], если план есть и бэкенд умеет; иначе — без метки', () => {
    expect(hintsFor('на сегодня всё', { studentContext: PLAN })).toMatch(/\[\[STOP_DAY_NOW\]\]/)
    expect(hintsFor('на сегодня всё', { studentContext: PLAN + '\nЗакончить день кнопкой «На сегодня всё» сейчас нельзя.' })).toMatch(/метку \[\[STOP_DAY…\]\] не ставь/)
    expect(hintsFor('бүгінге жетеді', { studentContext: PLAN, answerLang: 'kk' })).toMatch(/по-казахски/)
    // «мало времени» тогда не подмешивается
    expect(hintsFor('на сегодня всё, нет времени', { studentContext: PLAN })).not.toMatch(/REPLAN/)
  })

  it('«да» на её «Перерыв?» — та же метка с _NOW', () => {
    expect(hintsFor('да', { studentContext: PLAN, previous: 'Сделаем паузу?\n[[BREAK 10]]' })).toMatch(/\[\[BREAK_NOW N\]\] с теми же минутами/)
    expect(hintsFor('давай', { studentContext: PLAN, previous: 'Закончим?\n[[STOP_DAY]]' })).toMatch(/\[\[STOP_DAY_NOW\]\]/)
    expect(hintsFor('да', { studentContext: PLAN, previous: 'Открыть?\n[[OPEN vocab]]' })).not.toMatch(/BREAK|STOP_DAY/)
  })
})
