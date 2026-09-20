// @vitest-environment jsdom
//
// Закрытая карточка задания выглядит закрытой.
//
// Регрессия с видео от ученика: урок на перерыве, ученик пятнадцать секунд жмёт
// True/False, и ничего не происходит — кнопки disabled, а на экране об этом не
// говорит ничего. Ученику урок с 20.09.2026 не запирается вовсе
// (spec-lesson-always-open), и readOnly остался только у преподавателя, который
// читает чужую работу, — но выключенный вид ему нужен ровно так же.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PracticeBlock from './PracticeBlock.jsx'
import InfoBlock from './InfoBlock.jsx'

const БЛОК = {
  type: 'practice',
  title: 'Listen. Tick what she likes.',
  questions: [
    { id: 'q1', type: 'choice', prompt: 'Paul is here on business.', options: ['True', 'False'], answer: 'True' },
    { id: 'q2', type: 'choice', prompt: 'Havva is here on business.', options: ['True', 'False'], answer: 'False' },
  ],
}

function renderBlock(props = {}) {
  return render(
    <I18nProvider>
      <PracticeBlock block={БЛОК} answers={{}} checked={false} onAnswer={() => {}} number={1} {...props} />
    </I18nProvider>,
  )
}

describe('PracticeBlock — открытая и закрытая карточка', () => {
  it('открытая карточка даёт «Проверить»', () => {
    const { container } = renderBlock()
    expect(container.querySelector('.lw-practice__check')).not.toBeNull()
  })

  // У преподавателя «Проверить» пропадает: карточка чужая, проверять её он
  // будет глазами, а не кнопкой за ученика.
  it('закрытая карточка «Проверить» не показывает', () => {
    const { container } = renderBlock({ readOnly: true })
    expect(container.querySelector('.lw-practice__check')).toBeNull()
  })

  // Варианты ответа должны ВЫГЛЯДЕТЬ закрытыми, а не просто не нажиматься:
  // на телефоне курсора нет, и немая пилюля неотличима от живой.
  it('закрытые варианты помечены классом, а не только disabled', () => {
    const { container } = renderBlock({ readOnly: true })
    const opts = container.querySelectorAll('.lw-opt')
    expect(opts.length).toBeGreaterThan(0)
    for (const opt of opts) {
      expect(opt.disabled).toBe(true)
      expect(opt.classList.contains('is-locked')).toBe(true)
    }
  })
})

// Банк слов приезжает разметкой курса, и на закрытом уроке bindWordBank просто
// не отвечает на нажатие. Без метки на контейнере плашки оставались белыми и
// живыми на вид — тот же немой контрол, что и варианты выбора.
describe('Банк слов курса на закрытом уроке', () => {
  const BANK_HTML = '<div class="bank"><span class="bw">communication</span><span class="bw">meet</span></div>'

  it('в карточке практики контейнер разметки помечен закрытым', () => {
    const { container } = render(
      <I18nProvider>
        <PracticeBlock
          block={{ type: 'practice', title: 'Complete', html: BANK_HTML, questions: [] }}
          answers={{}}
          checked={false}
          onAnswer={() => {}}
          readOnly
        />
      </I18nProvider>,
    )
    expect(container.querySelector('.lw-practice__html.is-locked')).not.toBeNull()
  })

  it('в info-блоке — тоже', () => {
    const { container } = render(
      <I18nProvider>
        <InfoBlock block={{ type: 'info', html: BANK_HTML }} answers={{}} onAnswer={() => {}} readOnly />
      </I18nProvider>,
    )
    expect(container.querySelector('.lw-info__body.is-locked')).not.toBeNull()
  })

  it('на живом уроке метки нет', () => {
    const { container } = render(
      <I18nProvider>
        <InfoBlock block={{ type: 'info', html: BANK_HTML }} answers={{}} onAnswer={() => {}} />
      </I18nProvider>,
    )
    expect(container.querySelector('.lw-info__body')).not.toBeNull()
    expect(container.querySelector('.is-locked')).toBeNull()
  })
})
