// @vitest-environment jsdom
// «Отметьте все верные» — чтение из оригинального курса («Which four
// sentences belong in a summary?», «Click the questions about the past»).
// Засчитывается только полный набор: лишний вариант так же неверен, как
// пропущенный.
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio, stageLabel } from './CourseStepPlayer.jsx'

const MULTI = {
  stage: 'Чтение',
  type: 'multi',
  title: 'Which two sentences belong in a summary?',
  prompt: '',
  html: '<p>Buy Nothing Day started in Canada.</p>',
  options: ['It started in Canada.', 'It is about sport.', 'People spend nothing for a day.', 'It is a bank.'],
  answers: ['It started in Canada.', 'People spend nothing for a day.'],
}

function play(step) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Why we spend" level="B1" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
}
const option = (text) => [...document.querySelectorAll('.cp-choice')].find((b) => b.textContent === text)
const check = () => fireEvent.click([...document.querySelectorAll('button')].find((b) => /проверить/i.test(b.textContent)))

afterEach(() => stopStageAudio())

describe('CourseStepPlayer — несколько верных', () => {
  it('текст над вариантами', () => {
    play(MULTI)
    expect(document.querySelector('.cp-note__body').textContent).toMatch(/Canada/)
  })

  it('полный набор — верно', () => {
    play(MULTI)
    fireEvent.click(option('It started in Canada.'))
    fireEvent.click(option('People spend nothing for a day.'))
    check()
    expect(option('It started in Canada.').className).toMatch(/is-right/)
    expect(option('People spend nothing for a day.').className).toMatch(/is-right/)
    expect(document.querySelector('.is-wrong')).toBeNull()
  })

  it('неполный набор — пропущенный верный обведён', () => {
    play(MULTI)
    fireEvent.click(option('It started in Canada.'))
    check()
    expect(option('People spend nothing for a day.').className).toMatch(/is-missed/)
  })

  it('лишний вариант — неверно', () => {
    play(MULTI)
    fireEvent.click(option('It started in Canada.'))
    fireEvent.click(option('People spend nothing for a day.'))
    fireEvent.click(option('It is a bank.'))
    check()
    expect(option('It is a bank.').className).toMatch(/is-wrong/)
  })

  it('стадия «Чтение» переводится', () => {
    const t = (k) => ({ 'lesson.stage.reading': 'Оқылым' })[k] || k
    expect(stageLabel('Чтение', t)).toBe('Оқылым')
  })
})
