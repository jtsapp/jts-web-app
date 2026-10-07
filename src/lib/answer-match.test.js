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

// Жалоба «правильный ответ засчитывают за неправильный» (ревью 08.10.2026):
// апостроф стирался ДО таблицы стяжений, а в таблице не было 'll/'d/'s, поэтому
// «I'll» превращалось в «ill», «It's» — в «its», и с полной формой они не
// совпадали никогда. Ключи — настоящие задания грамматики (a2 u118, a2 u30, …).
describe('answerMatches — стяжения will / would / had / is / has / are', () => {
  it("'ll = will", () => {
    expect(answerMatches('I will', ["I'll"])).toBe(true)
    expect(answerMatches("I'll", ['I will'])).toBe(true)
    expect(answerMatches('you will miss the bus unless you hurry', ["you'll miss the bus unless you hurry"])).toBe(true)
  })

  it("'s после местоимения = is и has", () => {
    expect(answerMatches('It is', ["It's"])).toBe(true)
    expect(answerMatches('it is half past nine', ["it's half past nine"])).toBe(true)
    expect(answerMatches("It's expected", ['It is expected'])).toBe(true)
    expect(answerMatches('it has been raining', ["it's been raining"])).toBe(true)
  })

  it("'d = would и had", () => {
    expect(answerMatches("he said he'd help me", ['he said he would help me'])).toBe(true)
    expect(answerMatches('she had been running', ["she'd been running"])).toBe(true)
  })

  it("'re, needn't", () => {
    expect(answerMatches('we are late', ["we're late"])).toBe(true)
    expect(answerMatches('you need not come', ["you needn't come"])).toBe(true)
  })

  // У «'s» и «'d» раскрытие двузначно, но «is got» и «had like» не бывает.
  it('невозможное раскрытие не засчитывается', () => {
    expect(answerMatches('He has got a laptop.', ["He's got a laptop."])).toBe(true)
    expect(answerMatches('He is got a laptop.', ["He's got a laptop."])).toBe(false)
    expect(answerMatches('I would like a tea', ["I'd like a tea"])).toBe(true)
    expect(answerMatches('I had like a tea', ["I'd like a tea"])).toBe(false)
  })

  it('неверное слово неверным и остаётся', () => {
    expect(answerMatches('I would', ["I'll"])).toBe(false)
    expect(answerMatches('it was', ["It's"])).toBe(false)
  })
})

// Упражнения ровно на апостроф (a2 u30 «it's or its?», a2 u56 «the boys'
// toys», a2 u73 «Tom___ bag»): когда апостроф стирался всегда, its = it's,
// were = we're, boys = boy's = boys' — засчитывались ошибки.
describe('answerMatches — короткий ответ, где апостроф меняет слово', () => {
  it("its ≠ it's, were ≠ we're", () => {
    expect(answerMatches('its', ["It's"])).toBe(false)
    expect(answerMatches("it's", ['its'])).toBe(false)
    expect(answerMatches('were', ["we're"])).toBe(false)
  })

  // «Ill call you» — пропущенный апостроф, а не «больной»: такое путают только
  // клавиатурой, и браковать его — наказывать за телефон.
  it('ill / well без апострофа — те же I\'ll / we\'ll', () => {
    expect(answerMatches('ill', ["I'll"])).toBe(true)
    expect(answerMatches('well see', ["we'll see"])).toBe(true)
  })

  it("окончание стяжения без апострофа: «m not» = «'m not»", () => {
    expect(answerMatches('m not', ["'m not"])).toBe(true)
    expect(answerMatches('s got', ["'s got"])).toBe(true)
    expect(answerMatches('ll tell', ["'ll tell"])).toBe(true)
  })

  it('притяжательный: boys ≠ boy\'s ≠ boys\'', () => {
    expect(answerMatches('boys', ["boys'"])).toBe(false)
    expect(answerMatches("boy's", ["boys'"])).toBe(false)
    expect(answerMatches('boys’', ["boys'"])).toBe(true)
    expect(answerMatches("sisters'", ["sister's"])).toBe(false)
    expect(answerMatches('childrens', ["children's"])).toBe(false)
  })

  it("ответ-окончание 's", () => {
    expect(answerMatches('s', ["'s"])).toBe(false)
    expect(answerMatches('’s', ["'s"])).toBe(true)
  })
})

describe('answerMatches — длинный ответ: апостроф по-прежнему не обязателен', () => {
  it('без апострофа во фразе из трёх слов и больше', () => {
    expect(answerMatches('the managers office', ["the manager's office"])).toBe(true)
    expect(answerMatches('Ill call you tomorrow', ["I'll call you tomorrow"])).toBe(true)
  })
})

describe('answerMatches — числа и время', () => {
  it('разделитель тысяч', () => {
    expect(answerMatches("He's saved £2,000.", ['he has saved £2000'])).toBe(true)
  })

  it('8pm = 8 pm = 8 p.m.', () => {
    expect(answerMatches("I'll see you on Monday at 8 pm", ["i'll see you on monday at 8pm"])).toBe(true)
    expect(answerMatches("I'll see you on Monday at 8 p.m.", ["i'll see you on monday at 8pm"])).toBe(true)
  })
})

describe("normAnswer — it's и its различаются", () => {
  it('разные строки', () => {
    expect(normAnswer("it's")).not.toBe(normAnswer('its'))
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
