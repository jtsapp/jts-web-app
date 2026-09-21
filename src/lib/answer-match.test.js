// Регрессия на жалобу из урока A0 «Coffee — yes. Mondays — no.»: верные ответы
// шли в «Неверный ответ». Два источника — сверка текста (стяжения и апострофы)
// и склейка ответа задания «собери предложение».
import { describe, it, expect } from 'vitest'
import { normAnswer, answerMatches } from './answer-match.js'
import { tasksToSteps } from '../learning/nativeSteps.js'

describe('normAnswer', () => {
  it('снимает регистр, знаки и лишние пробелы', () => {
    expect(normAnswer('  Yes,  he  is! ')).toBe('yes he is')
  })

  it('уравнивает апострофы — ASCII и типографский', () => {
    expect(normAnswer("don't")).toBe(normAnswer('don’t'))
  })

  it('уравнивает стяжение и полную форму', () => {
    expect(normAnswer("I don't like Mondays.")).toBe(normAnswer('I do not like Mondays'))
    expect(normAnswer("I'm Anna")).toBe(normAnswer('I am Anna'))
    expect(normAnswer("he isn't from China")).toBe(normAnswer('he is not from China'))
  })

  it('не трогает were: без апострофа «we’re» и прошедшее неотличимы', () => {
    expect(normAnswer('we were late')).toBe('we were late')
    expect(normAnswer('we were going')).toBe('we were going')
  })

  it('дефис считает пробелом', () => {
    expect(normAnswer('well-known')).toBe(normAnswer('well known'))
  })
})

describe('answerMatches', () => {
  it('принимает оба написания отрицания', () => {
    expect(answerMatches('do not', ["don't"])).toBe(true)
    expect(answerMatches("don't", ['do not'])).toBe(true)
    expect(answerMatches('does', ["don't"])).toBe(false)
  })

  it('принимает ответ с типографским апострофом в данных', () => {
    expect(answerMatches("I don't like Mondays.", ['I don’t like Mondays.'])).toBe(true)
  })

  // Апостроф на телефоне — лишний тап и часто другой символ, поэтому ответ без
  // него обязан проходить: «I dont like» — то же самое, что «I don’t like».
  it('апостроф не обязателен', () => {
    expect(answerMatches('I dont like Mondays.', ['I don’t like Mondays.'])).toBe(true)
    expect(answerMatches('dont', ["don't"])).toBe(true)
    expect(answerMatches('I dont like rain', ['I don’t like rain.'])).toBe(true)
    expect(answerMatches('Im Anna', ["I'm Anna"])).toBe(true)
    expect(answerMatches('Whats your phone number?', ["What's your phone number?"])).toBe(true)
    expect(answerMatches('No, Im not.', ["No, I'm not."])).toBe(true)
  })

  it('пустой ответ не засчитывается', () => {
    expect(answerMatches('   ', ['do not'])).toBe(false)
  })

  it('альтернативы через | и списком', () => {
    expect(answerMatches('but', ['but|and'])).toBe(true)
    expect(answerMatches('and', ['but', 'and'])).toBe(true)
  })

  it('«перепиши предложение»: целая фраза проходит, выдуманный хвост нет', () => {
    const cue = 'I ___ like Mondays.'
    expect(answerMatches("don't like Mondays", ["don't"], cue)).toBe(true)
    expect(answerMatches("don't like coffee", ["don't"], cue)).toBe(false)
  })

  // Задание на артикль: верный вариант — прочерк, банк «— / a / the».
  // Нормализация оставляет от него пустую строку, и без отдельной ветки такой
  // пропуск не проходился ни одним ответом.
  it('прочерк как «нулевой артикль» засчитывается', () => {
    expect(answerMatches('—', ['—'])).toBe(true)
    expect(answerMatches('a', ['—'])).toBe(false)
    expect(answerMatches('', ['—'])).toBe(false)
    // На обычные ответы ветка не влияет.
    expect(answerMatches('the', ['the', '—'])).toBe(true)
  })
})

describe('tasksToSteps — собери предложение', () => {
  const lesson = {
    tasks: [{ sec: '4. Practice', type: 'order', words: ['coffee', 'I', 'like'], answer: ['I', 'like', 'coffee'] }],
  }

  it('склеивает ответ-список в фразу', () => {
    const [step] = tasksToSteps(lesson, 'ru')
    expect(step.type).toBe('order')
    expect(step.answer).toBe('I like coffee')
    // Как сравнивает плеер: собранная фраза против эталона.
    expect(normAnswer('I like coffee')).toBe(normAnswer(step.answer))
  })
})

describe('нераскрытая сущность апострофа в эталоне', () => {
  // Курс пишет апостроф как `&#x27;`, конвертер эту форму не раскрывал, и в
  // эталон попадал текст «don&#x27;t». Знаки препинания резали его на
  // «don x27t» — совпасть с ним было нельзя ничем, и 62 задания одного только
  // A0 стали непроходимыми. Ловили это на живых уроках: «0 из 3 правильно» при
  // верных ответах.
  it('ответ с апострофом засчитывается', () => {
    expect(answerMatches("I don't like rain", ['I don&#x27;t like rain.'])).toBe(true)
    expect(answerMatches('I dont like rain', ['I don&#x27;t like rain.'])).toBe(true)
    expect(answerMatches("don't", ['don&#x27;t'])).toBe(true)
  })

  it('десятичная и именованная формы тоже', () => {
    expect(answerMatches("I'm Anna", ['I&#39;m Anna'])).toBe(true)
    expect(answerMatches("I'm Anna", ['I&apos;m Anna'])).toBe(true)
  })

  it('неверный ответ остаётся неверным', () => {
    // Снятие сущности не должно превращать проверку в «принимаем всё».
    expect(answerMatches('I like rain', ['I don&#x27;t like rain.'])).toBe(false)
  })
})

// Тире в данных и на клавиатуре разные: курс пишет прочерк «—», а ученик
// набирает дефис — «Проверить» браковала верный ответ.
describe('answerMatches — разновидности тире в ответе-прочерке', () => {
  it('дефис, короткое и длинное тире — один прочерк', () => {
    expect(answerMatches('-', ['—'])).toBe(true)
    expect(answerMatches('–', ['-'])).toBe(true)
    expect(answerMatches('—', ['-'])).toBe(true)
  })

  it('другие знаки прочерком не становятся', () => {
    expect(answerMatches('?', ['—'])).toBe(false)
    expect(answerMatches('.', ['-'])).toBe(false)
  })
})

// Задание A1 «Add '» (That's the students_ classroom): эталон — один прямой
// апостроф. Клавиатура iOS по умолчанию ставит типографский — ответ верный.
describe('answerMatches — ответ-апостроф', () => {
  it('типографские апострофы засчитываются за прямой', () => {
    for (const v of ["'", '’', '‘', 'ʼ', '`']) expect(answerMatches(v, ["'"])).toBe(true)
  })

  it('прочерк и другие знаки за апостроф не идут', () => {
    for (const v of ['-', '—', '.', '?', ',']) expect(answerMatches(v, ["'"])).toBe(false)
  })
})
