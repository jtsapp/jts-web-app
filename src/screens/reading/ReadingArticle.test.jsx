// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const saveReadingKeyword = vi.fn()
vi.mock('../../practice/reading/saveKeyword.js', () => ({
  saveReadingKeyword: (...args) => saveReadingKeyword(...args),
}))
vi.mock('../../practice/workbook/voice.js', () => ({
  speak: vi.fn(),
}))

const { default: ReadingArticle } = await import('./ReadingArticle.jsx')

const TEXT = {
  title: 'The Pill',
  text: ['Take the pill.'],
  words: [{ en: 'Take', tr: '/teɪk/', ru: 'брать', kz: 'алу', ex: 'Take the pill.' }],
}

function mount() {
  return render(
    <I18nProvider>
      <ReadingArticle text={TEXT} dict={null} ensureDict={() => Promise.resolve(null)} token="tok" />
    </I18nProvider>,
  )
}

beforeEach(() => {
  saveReadingKeyword.mockReset()
  saveReadingKeyword.mockResolvedValue(true)
})
afterEach(cleanup)

describe('ReadingArticle — попап перевода', () => {
  it('на карточке слова есть кнопка «Добавить в словарь»', async () => {
    const { getByText, findByRole } = mount()
    fireEvent.click(getByText('Take'))
    expect(await findByRole('button', { name: 'Добавить в словарь' })).toBeTruthy()
  })

  // Ревью 08.10.2026: карточка всегда вставала под словом и у нижнего края
  // уходила за экран. Прототип в этом случае ставил её над словом (:684).
  describe('место карточки', () => {
    const rects = { word: null }
    let origRect
    let origHeight
    beforeEach(() => {
      origRect = Element.prototype.getBoundingClientRect
      origHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
      Element.prototype.getBoundingClientRect = function () {
        if (this.classList.contains('rd-w')) return rects.word
        return { top: 0, bottom: 2000, left: 0, right: 600, width: 600, height: 2000 }
      }
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get() {
          return this.classList.contains('rd-pop') ? 150 : 0
        },
      })
      window.innerHeight = 800
    })
    afterEach(() => {
      Element.prototype.getBoundingClientRect = origRect
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origHeight)
    })
    const word = (top) => ({ top, bottom: top + 20, left: 40, right: 90, width: 50, height: 20 })

    it('у нижнего края экрана — над словом', () => {
      rects.word = word(760)
      const { getByText, container } = mount()
      fireEvent.click(getByText('Take'))
      // 760 − 150 (карточка) − 8 (зазор)
      expect(container.querySelector('.rd-pop').style.top).toBe('602px')
    })

    it('места хватает — под словом, как раньше', () => {
      rects.word = word(100)
      const { getByText, container } = mount()
      fireEvent.click(getByText('Take'))
      expect(container.querySelector('.rd-pop').style.top).toBe('128px')
    })

    it('не залезает под липкую панель: над словом места мало — прижимается под неё', () => {
      // Низкий экран (телефон боком): под словом не влезает, а над словом
      // карточка ушла бы под панель читалки (у неё z-index ниже карточки).
      const bar = document.createElement('div')
      bar.className = 'rd-toolbar'
      document.body.prepend(bar)
      const rect = Element.prototype.getBoundingClientRect
      Element.prototype.getBoundingClientRect = function () {
        if (this.classList.contains('rd-toolbar')) return { top: 0, bottom: 100, left: 0, right: 600, width: 600, height: 100 }
        return rect.call(this)
      }
      window.innerHeight = 400
      rects.word = word(240)
      try {
        const { getByText, container } = mount()
        fireEvent.click(getByText('Take'))
        // 100 (низ панели) + 12 (зазор); над словом было бы 240 − 158 = 82
        expect(container.querySelector('.rd-pop').style.top).toBe('112px')
      } finally {
        bar.remove()
      }
    })
  })

  it('сохраняет слово из попапа', async () => {
    const { getByText, findByRole } = mount()
    fireEvent.click(getByText('Take'))
    fireEvent.click(await findByRole('button', { name: 'Добавить в словарь' }))
    await waitFor(() => expect(saveReadingKeyword).toHaveBeenCalled())
    expect(saveReadingKeyword).toHaveBeenCalledWith(
      'tok',
      { en: 'Take', ru: 'брать', kz: 'алу' },
      'The Pill',
    )
    expect(await findByRole('button', { name: 'Уже в словаре' })).toBeTruthy()
  })
})

describe('ReadingArticle — подпись гостю', () => {
  it('гость: банк принял — в попапе «Сохранено»', async () => {
    saveReadingKeyword.mockResolvedValue('bank')
    const { getByText, findByRole, queryByRole } = mount()
    fireEvent.click(getByText('Take'))
    fireEvent.click(await findByRole('button', { name: 'Добавить в словарь' }))
    expect(await findByRole('button', { name: 'Сохранено' })).toBeTruthy()
    expect(queryByRole('button', { name: 'Уже в словаре' })).toBeNull()
  })
})
