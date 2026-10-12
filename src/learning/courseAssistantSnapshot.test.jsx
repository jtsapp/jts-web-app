// @vitest-environment jsdom
// Что про неверный ответ узнаёт помощник (снимок экрана) на настоящих шагах плеера. Жалоба из урока A0 «Coffee — yes.
// Mondays — no.»: помощник путал выбор ученицы с текстом объяснения и переворачивал like / don't like. Кнопки-варианты
// починили 11.10 (is-wrong на кнопке), а «впиши пропуск» оставался с переворотом: после неверного ответа плеер
// подставляет в поле ВЕРНОЕ слово, и снимок читал его как ввод ученицы.
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { expectedAnswer, stopStageAudio } from './CourseStepPlayer.jsx'
import { snapshotScreen } from '../lib/assistant/screenSnapshot.js'

const GAP = {
  stage: 'Слова',
  type: 'gap',
  title: 'Дополните предложение.',
  before: "I don't",
  after: '.',
  answers: ['understand'],
  bank: ['understand', 'answer', 'repeat'],
  why: 'Скажите это, когда слово вам незнакомо.',
}

const GROUP = {
  stage: 'Практика',
  type: 'group',
  title: 'Дополните предложения.',
  items: [
    { before: 'I', after: 'coffee.', answers: ['like'] },
    { before: 'I', after: 'rain.', answers: ["don't like"] },
  ],
}

const CHOICE = {
  stage: 'Слова',
  type: 'choice',
  title: 'Выберите правильное слово.',
  prompt: 'I ___ rain.',
  options: ['favourite', 'like', "don't like"],
  answer: "don't like",
  why: 'Rain в этом уроке — пример для don’t like (не нравится).',
}

function play(step, extra = {}) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Coffee — yes. Mondays — no." level="A0" onExit={() => {}} onDone={() => {}} {...extra} />
    </I18nProvider>,
  )
}
const byText = (selector, text) => [...document.querySelectorAll(selector)].find((b) => b.textContent === text)
const check = () => fireEvent.click([...document.querySelectorAll('button')].find((b) => /проверить/i.test(b.textContent)))

afterEach(() => stopStageAudio())

describe('снимок для помощника на шагах курса после неверного ответа', () => {
  it('«впиши пропуск»: ученица выбрала «answer» — снимок говорит это, а «understand» называет верным', () => {
    const { container } = play(GAP)
    fireEvent.click(byText('.cp-gap__bank .cp-chip', 'answer'))
    check()

    const snap = snapshotScreen(container)
    expect(snap).toContain('ученик ввёл «answer» (отмечено как неверное)')
    expect(snap).toContain('в поле сайт показал верный ответ «understand»')
    expect(snap).not.toContain('ученик ввёл «understand»')
    expect(snap).toContain('[кнопка «answer» неактивна (выбрано)]')
    expect(snap).toContain('Неверный ответ')
  })

  it('«впиши пропуск», верный ответ: поле не подменяется, пояснения нет', () => {
    const { container } = play(GAP)
    fireEvent.click(byText('.cp-gap__bank .cp-chip', 'understand'))
    check()

    const snap = snapshotScreen(container)
    expect(snap).toContain('ученик ввёл «understand» (отмечено как верное)')
    expect(snap).not.toContain('сайт показал')
  })

  it('несколько пропусков на экране: неверная строка несёт ввод ученицы, верная — обычный ввод', () => {
    const { container } = play(GROUP)
    const [first, second] = [...document.querySelectorAll('.cp-group__in')]
    fireEvent.change(first, { target: { value: 'like' } }) // верно
    fireEvent.change(second, { target: { value: 'like' } }) // неверно: ждали «don't like»
    check()

    const snap = snapshotScreen(container)
    expect(snap).toContain('ученик ввёл «like» (отмечено как верное)')
    expect(snap).toContain("ученик ввёл «like» (отмечено как неверное); в поле сайт показал верный ответ «don't like»")
  })

  it('«выберите слово»: выбранная красная кнопка названа, соседние — нет (вчерашняя правка не потерялась)', () => {
    const { container } = play(CHOICE)
    fireEvent.click(byText('.cp-choice', 'like'))
    check()

    const snap = snapshotScreen(container)
    expect(snap).toContain('[кнопка «like» неактивна (отмечено как неверное)]')
    expect(snap).toContain('[кнопка «favourite» неактивна]')
    expect(snap).toContain('[кнопка «don\'t like» неактивна]')
    expect(snap).toContain('пример для don’t like')
  })
})

// Из чата учителей: «Разложите слова по колонкам — здесь что надо было делать?» В данных курса сказано только «put the
// words in the correct column», а что слово сначала нажимают, потом нажимают колонку, не сказано нигде.
describe('шаг «колонки»', () => {
  const COLS = {
    stage: 'Практика',
    type: 'cols',
    title: 'Распределите слова по колонкам.',
    columns: ['Вы делаете', 'Вы говорите'],
    items: [
      { text: 'listen', col: 0 },
      { text: 'Sorry.', col: 1 },
    ],
  }

  it('под заголовком — как действовать: нажать слово, затем колонку', () => {
    play(COLS)
    const hint = document.querySelector('.cp-step__sub')
    expect(hint).not.toBeNull()
    expect(hint.textContent).toMatch(/Нажмите на слово, затем на колонку/)
    // Заголовок остался прежним: подсказка отдельной строкой, а не длинным фиолетовым текстом.
    expect(document.querySelector('.cp-step__prompt').textContent).toBe('Разложите слова по колонкам')
  })

  it('подсказки нет у других шагов', () => {
    play(GAP)
    expect(document.querySelector('.cp-step__sub')).toBeNull()
  })
})

describe('эталон задания для помощника', () => {
  it('«выберите слово»: после неверного ответа в снимке — верный вариант, даже если разбора нет', () => {
    const { container } = play({ ...CHOICE, why: '' })
    fireEvent.click(byText('.cp-choice', 'like'))
    check()

    const snap = snapshotScreen(container)
    expect(snap).toContain("[верный ответ по заданию: «don't like»]")
    expect(snap).toContain('[кнопка «like» неактивна (отмечено как неверное)]')
  })

  it('верный ответ — эталона в снимке нет: показывать нечего', () => {
    const { container } = play(CHOICE)
    fireEvent.click(byText('.cp-choice', "don't like"))
    check()

    expect(snapshotScreen(container)).not.toContain('верный ответ по заданию')
  })

  it('тест юнита (passRatio): ответ помощнику не отдаётся, на тестах ответы не подсказывают', () => {
    const { container } = play(CHOICE, { passRatio: 0.8 })
    fireEvent.click(byText('.cp-choice', 'like'))
    check()

    const snap = snapshotScreen(container)
    expect(snap).toContain('Неверный ответ')
    expect(snap).not.toContain('верный ответ по заданию')
  })

  it('«впиши пропуск»: эталон — слово из данных', () => {
    const { container } = play({ ...GAP, why: '' })
    fireEvent.click(byText('.cp-gap__bank .cp-chip', 'repeat'))
    check()

    expect(snapshotScreen(container)).toContain('[верный ответ по заданию: «understand»]')
  })
})

describe('expectedAnswer — что считает верным каждый тип шага', () => {
  it('выбор и «послушайте»: поле answer', () => {
    expect(expectedAnswer({ type: 'choice', answer: "don't like" })).toBe("don't like")
    expect(expectedAnswer({ type: 'listen', answer: 'Slowly, please.' })).toBe('Slowly, please.')
  })

  it('пропуск: допустимые формы (не больше трёх), в строке', () => {
    expect(expectedAnswer({ type: 'gap', answers: ['like'] })).toBe('like')
    expect(expectedAnswer({ type: 'gap', answers: ["don't", 'do not', 'dont', 'x'] })).toBe("don't / do not / dont")
  })

  it('несколько пропусков и текст с пропусками: по строке на пропуск', () => {
    expect(expectedAnswer(GROUP)).toBe("I ___ coffee. → like; I ___ rain. → don't like")
    expect(expectedAnswer({ type: 'cloze', answers: [['was'], ['were', 'was']] })).toBe('1) was; 2) were')
  })

  it('True / False: утверждение → ответ', () => {
    expect(expectedAnswer({ type: 'rows', items: [{ q: 'Dana likes coffee.', answer: 'True' }, { q: 'Dana likes Mondays.', answer: 'False' }] }))
      .toBe('Dana likes coffee. → True; Dana likes Mondays. → False')
  })

  it('порядок слов: строка и список слов', () => {
    expect(expectedAnswer({ type: 'order', answer: 'I like music.' })).toBe('I like music.')
    expect(expectedAnswer({ type: 'order', answer: ['I', 'like', 'music.'] })).toBe('I like music.')
  })

  it('соединение, колонки, «найди ошибку», «отметьте все верные»', () => {
    expect(expectedAnswer({ type: 'match', pairs: [{ left: 'listen', right: 'ухо' }, { left: 'look', right: 'глаз' }] })).toBe('listen → ухо; look → глаз')
    expect(expectedAnswer({ type: 'cols', columns: ['Вы делаете', 'Вы говорите'], items: [{ text: 'listen', col: 0 }, { text: 'Sorry.', col: 1 }] }))
      .toBe('listen → Вы делаете; Sorry. → Вы говорите')
    expect(expectedAnswer({ type: 'mistake', tokens: ['I', 'no', 'like', 'Mondays.'], bad: 1 })).toBe('no')
    expect(expectedAnswer({ type: 'mistake', tokens: ['a', 'b', 'c'], bad: [0, 2] })).toBe('a, c')
    expect(expectedAnswer({ type: 'multi', answers: ['one', 'two'] })).toBe('one, two')
  })

  it('шаг без ответа и пустые данные — пустая строка, а не «undefined»', () => {
    expect(expectedAnswer({ type: 'note' })).toBe('')
    expect(expectedAnswer({ type: 'gap' })).toBe('')
    expect(expectedAnswer({ type: 'choice', answer: ['a', 'b'] })).toBe('')
    expect(expectedAnswer(null)).toBe('')
  })
})
