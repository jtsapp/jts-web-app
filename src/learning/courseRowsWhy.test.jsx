// @vitest-environment jsdom
// Ревью 08.10.2026: «True / False» курса склеены в таблицу (f3c27a48), и после
// проверки ученик видел одно красное «Неверно» на весь экран — без разбора
// утверждений и без верного ответа на ошибочной строке. Отдельным экраном у
// каждого утверждения был разбор (`why`) из самого курса.
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'

const ROWS = {
  stage: 'Чтение',
  type: 'rows',
  title: 'Read. Then choose True or False.',
  options: ['True', 'False'],
  items: [
    { q: 'The speaker did not miss social media at all.', answer: 'False', why: '“I missed social media so much at work.”' },
    { q: 'She switched her phone off.', answer: 'True', why: '“I just turned it off.”' },
  ],
}

function play(step) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Digital detox" level="A2" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
}
const rows = () => [...document.querySelectorAll('.cp-rows__row')]
const opt = (row, text) => [...row.querySelectorAll('.cp-rows__opt')].find((b) => b.textContent === text)
const check = () => fireEvent.click([...document.querySelectorAll('button')].find((b) => /проверить/i.test(b.textContent)))

afterEach(() => stopStageAudio())

describe('CourseStepPlayer — таблица «True / False»', () => {
  it('на ошибочной строке — верный вариант и разбор', () => {
    play(ROWS)
    fireEvent.click(opt(rows()[0], 'True')) // ошибка: верно False
    fireEvent.click(opt(rows()[1], 'True')) // верно
    check()
    const [wrong, right] = rows()
    expect(opt(wrong, 'True').className).toMatch(/is-wrong/)
    expect(opt(wrong, 'False').className).toMatch(/is-right/)
    expect(wrong.textContent).toContain('I missed social media so much at work.')
    // У верной строки разбор не нужен — экран не раздувается.
    expect(right.textContent).not.toContain('I just turned it off.')
  })

  it('всё верно — разборов нет, плашка «Верно»', () => {
    play(ROWS)
    fireEvent.click(opt(rows()[0], 'False'))
    fireEvent.click(opt(rows()[1], 'True'))
    check()
    expect(document.querySelector('.cp-fb').className).toMatch(/is-ok/)
    expect(document.querySelector('.cp-rows__why')).toBeNull()
  })
})
