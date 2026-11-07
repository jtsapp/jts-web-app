import { describe, it, expect } from 'vitest'
import { addressHint, formatOfContext, questionHints } from './turnHints.js'

const hintsFor = (question, extra = {}) => questionHints({ question, ...extra }).join('\n')

describe('указания рядом с вопросом (turnHints.js)', () => {
  it('обращение: «ты» без рода; по-казахски «сен»; по-английски не нужно', () => {
    expect(addressHint('ru')).toMatch(/на «ты» и без рода/)
    expect(addressHint('kk')).toMatch(/на «сен»/)
    expect(addressHint('en')).toBe('')
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
