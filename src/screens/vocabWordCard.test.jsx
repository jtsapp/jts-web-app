// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { LessonWords } from './VocabularyPage.jsx'

// Карточка урока рисуется без сети: слова и ссылки на картинки приезжают
// вместе с каталогом (`imageUrl` проставляет VocabCatalogUploadService), а
// экран только показывает то, что пришло.
const t = (key, vars) => (vars?.n != null ? `${key}:${vars.n}` : key)

function lessonWith(cards) {
  return { no: 1, title: 'Coffee — yes. Mondays — no.', cards }
}

function draw(cards, speak = () => {}) {
  return render(
    <LessonWords
      t={t}
      lang="ru"
      lesson={lessonWith(cards)}
      meta={{ id: 'A0', kind: 'level' }}
      speak={speak}
      onBack={() => {}}
      onPractice={() => {}}
    />,
  )
}

const WITH_PIC = {
  id: 'c1_like',
  en: 'like',
  ru: 'нравится',
  ipa: 'laɪk',
  imageUrl: 'https://files.example/vocab/images/c1_like.webp',
}

const NO_PIC = { id: 'c1_please', en: 'please', ru: 'пожалуйста', ipa: 'pliːz' }

describe('Карточка слова в словаре', () => {

  it('показывает картинку, которая пришла с каталогом', () => {
    const { container } = draw([WITH_PIC])

    const img = container.querySelector('.vp-pcard__pic')
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe(WITH_PIC.imageUrl)
    // Слово подписано под картинкой, а не вместо неё.
    expect(screen.getByText('like')).toBeTruthy()
  })

  it('без картинки ставит слово в реплику, а не пустую плашку', () => {
    const { container } = draw([NO_PIC])

    expect(container.querySelector('.vp-pcard__pic')).toBeNull()
    const bubble = container.querySelector('.vp-pcard__bub')
    expect(bubble).toBeTruthy()
    expect(bubble.textContent).toBe('please')
    expect(container.querySelector('.vp-pcard.is-noimg')).toBeTruthy()
  })

  it('битая ссылка на картинку откатывает карточку к реплике', () => {
    // Ссылка в данных есть, а объекта нет: без этого лицо карточки — слово в
    // углу пустоты размером в три четверти карточки.
    const { container } = draw([WITH_PIC])

    fireEvent.error(container.querySelector('.vp-pcard__pic'))

    expect(container.querySelector('.vp-pcard__pic')).toBeNull()
    expect(container.querySelector('.vp-pcard__bub').textContent).toBe('like')
  })

  it('переворачивается по клику и возвращается обратно', () => {
    const { container } = draw([WITH_PIC])
    const card = container.querySelector('.vp-pcard')

    expect(card.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(card)
    expect(card.getAttribute('aria-pressed')).toBe('true')
    expect(card.className).toContain('is-flipped')

    fireEvent.click(card)
    expect(card.getAttribute('aria-pressed')).toBe('false')
    expect(card.className).not.toContain('is-flipped')
  })

  it('переворачивает только ту карточку, по которой нажали', () => {
    const { container } = draw([WITH_PIC, NO_PIC])
    const cards = container.querySelectorAll('.vp-pcard')

    fireEvent.click(cards[0])

    expect(cards[0].className).toContain('is-flipped')
    expect(cards[1].className).not.toContain('is-flipped')
  })

  it('перевод лежит на обороте, а не рядом со словом', () => {
    // Иначе картинка перестаёт работать: подпись отвечает на вопрос раньше,
    // чем ученик успевает вспомнить слово.
    const { container } = draw([WITH_PIC])

    const front = container.querySelector('.vp-pcard__front')
    const back = container.querySelector('.vp-pcard__back')
    expect(front.textContent).not.toContain('нравится')
    expect(back.textContent).toContain('нравится')
  })

  it('динамик не вложен в карточку — иначе переворот ломается', () => {
    // Кнопка внутри кнопки — невалидный HTML: браузер закрывает внешний тег
    // раньше, и клик по карточке перестаёт её переворачивать.
    const speak = vi.fn()
    const { container } = draw([WITH_PIC], speak)

    const card = container.querySelector('.vp-pcard')
    const spk = container.querySelector('.vp-pcard-spk')
    expect(spk).toBeTruthy()
    expect(card.contains(spk)).toBe(false)

    fireEvent.click(spk)
    expect(speak).toHaveBeenCalledWith('like')
    // Озвучка не должна заодно переворачивать карточку.
    expect(card.getAttribute('aria-pressed')).toBe('false')
  })

  it('сетка картиночная, а не общая на четыре колонки', () => {
    // Общая .vp-words держит фиксированные 4/3/2/1 колонки — на широком
    // мониторе это колонка в 400+ пикселей и карточка почти в 600.
    const { container } = draw([WITH_PIC])

    const grid = container.querySelector('.vp-words')
    expect(grid.className).toContain('vp-words--pics')
  })

  it('транскрипцию показывает без лишних косых, как её ни прислали', () => {
    const { container } = draw([{ ...WITH_PIC, ipa: '/laɪk/' }])

    expect(container.querySelector('.vp-pcard__strip i').textContent).toBe('/laɪk/')
  })
})
