// @vitest-environment jsdom
// «Послушайте. Выберите картинку.» (A0, уроки 1 и 2): варианты — иконки курса.
// Раньше вместо них стояли имена иконок текстом («door / sun / clock» под
// записью «Good morning.»), и задание теряло смысл.
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'

const ICON = { door: '<path d="M1 1"/>', sun: '<circle cx="12" cy="12" r="4"/>', clock: '<path d="M2 2"/>' }

const PIC = {
  stage: 'Аудирование',
  type: 'choice',
  title: 'Послушайте. Выберите картинку.',
  say: 'Good morning.',
  sayTrack: '/course/a0/audio/f5ae86c75cb6.mp3',
  options: ['door', 'sun', 'clock'],
  optionIcons: [ICON.door, ICON.sun, ICON.clock],
  answer: 'sun',
}

function play(step) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Two hellos" level="A0" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
}

afterEach(() => stopStageAudio())

describe('CourseStepPlayer — выбор картинки', () => {
  it('рисует иконки без подписи', () => {
    play(PIC)
    const tiles = [...document.querySelectorAll('.cp-choice--pic')]
    expect(tiles).toHaveLength(3)
    for (const t of tiles) expect(t.textContent).toBe('')
  })

  // Плеер перемешивает варианты, а иконки лежат в шаге по исходному порядку:
  // связь по индексу дала бы «sun» картинку двери.
  it('у каждого варианта — его иконка, в каком бы порядке они ни встали', () => {
    play(PIC)
    // Разметку сравниваем после того же парсера: «<path/>» он пишет как «<path></path>».
    const parsed = (markup) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.innerHTML = markup
      return svg.innerHTML
    }
    for (const t of document.querySelectorAll('.cp-choice--pic')) {
      expect(t.querySelector('svg').innerHTML).toBe(parsed(ICON[t.getAttribute('aria-label')]))
    }
  })

  it('верная картинка засчитывается', () => {
    play(PIC)
    const sun = document.querySelector('.cp-choice--pic[aria-label="sun"]')
    fireEvent.click(sun)
    fireEvent.click([...document.querySelectorAll('button')].find((b) => /проверить/i.test(b.textContent)))
    expect(sun.className).toMatch(/is-right/)
  })

  // Старый шаг без optionIcons (и любой обычный выбор) — прежние пилюли.
  it('без иконок — обычные варианты текстом', () => {
    const { optionIcons: _drop, ...plain } = PIC
    play(plain)
    expect(document.querySelector('.cp-choice--pic')).toBeNull()
    expect([...document.querySelectorAll('.cp-choice')].map((b) => b.textContent).sort()).toEqual(['clock', 'door', 'sun'])
  })
})
