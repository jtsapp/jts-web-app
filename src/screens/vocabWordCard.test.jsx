// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { LessonWords } from './VocabularyPage.jsx'
import { learnedCount, recordVocabLearned } from './vocab/vocabLearned.js'

// Карточка урока рисуется без сети: слова и ссылки на картинки приезжают
// вместе с каталогом (`imageUrl` проставляет VocabCatalogUploadService), а
// экран только показывает то, что пришло.
const t = (key, vars) => (vars?.n != null ? `${key}:${vars.n}` : key)

function lessonWith(cards) {
  return { no: 1, title: 'Coffee — yes. Mondays — no.', cards }
}

function draw(cards, speak = () => {}, extra = {}) {
  return render(
    <LessonWords
      t={t}
      lang="ru"
      lesson={lessonWith(cards)}
      meta={{ id: 'A0', kind: 'level' }}
      speak={speak}
      onBack={() => {}}
      onPractice={() => {}}
      {...extra}
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

  it('у слова без перевода (B2) на обороте — определение, даже при примере', () => {
    // Перевода у B2 каталога нет вовсе, а определение пряталось за примером:
    // оборот показывал только предложение, и значение слова не видел никто.
    const b2 = {
      id: 'b2c1_awkward', en: 'awkward', ru: '', kk: '',
      def: 'making you feel embarrassed or uncomfortable',
      example: 'Stand too close and you might make someone feel ___.',
    }
    const { container } = draw([b2])

    const back = container.querySelector('.vp-pcard__back')
    expect(back.querySelector('.vp-pcard__tr').textContent).toBe(b2.def)
    expect(back.querySelector('.vp-pcard__ex').textContent).toContain('Stand too close')
    // Определение одно — не дублируется вместо примера.
    expect(back.textContent.split(b2.def)).toHaveLength(2)
  })

  it('в пример подставляется слово атома, а не заголовок карточки', () => {
    // Пример карточки «Father, mother» — предложение её первого атома, и в
    // пропуск встаёт father. Раньше выходило «My Father, mother is a doctor».
    const card = {
      id: 'c5_father_mother', en: 'Father, mother', ru: 'отец, мать',
      atoms: ['a5_father', 'a5_mother'], example: 'My ___ is a doctor. He is fifty.',
    }
    const lesson = {
      no: 5, title: 'The family group chat', cards: [card],
      atoms: [
        { id: 'a5_father', en: 'father', ctx: 'My ___ is a doctor. He is fifty.' },
        { id: 'a5_mother', en: 'mother', ctx: 'My ___ is a teacher. She is forty-five.' },
      ],
    }
    const { container } = render(
      <LessonWords t={t} lang="ru" lesson={lesson} meta={{ id: 'A0', kind: 'level' }} speak={() => {}} onBack={() => {}} onPractice={() => {}} />,
    )

    expect(container.querySelector('.vp-pcard__ex').textContent).toBe('My father is a doctor. He is fifty.')
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

describe('Отметка «изучено»', () => {
  beforeEach(() => localStorage.clear())

  const withStore = { token: null, scopeId: 'A0' }

  it('нажатие помечает слово и сохраняет прогресс', () => {
    const { container } = draw([WITH_PIC], () => {}, withStore)
    const mark = container.querySelector('.vp-pcard-mark')

    expect(mark.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(mark)

    expect(mark.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.vp-pcard').className).toContain('is-learned')
    // Прогресс тот же, из которого считаются счётчики урока и уровня.
    expect(learnedCount(null, 'A0')).toBe(1)
  })

  it('повторное нажатие снимает отметку', () => {
    // Поставить и не суметь убрать — это не отметка, а ловушка.
    const { container } = draw([WITH_PIC], () => {}, withStore)
    const mark = container.querySelector('.vp-pcard-mark')

    fireEvent.click(mark)
    fireEvent.click(mark)

    expect(mark.getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('.vp-pcard').className).not.toContain('is-learned')
    expect(learnedCount(null, 'A0')).toBe(0)
  })

  it('уже изученное слово открывается помеченным', () => {
    recordVocabLearned(null, 'A0', ['c1_like'])
    const { container } = draw([WITH_PIC], () => {}, withStore)

    expect(container.querySelector('.vp-pcard-mark').getAttribute('aria-pressed')).toBe('true')
  })

  it('отметка не переворачивает карточку', () => {
    const { container } = draw([WITH_PIC], () => {}, withStore)
    fireEvent.click(container.querySelector('.vp-pcard-mark'))

    expect(container.querySelector('.vp-pcard').getAttribute('aria-pressed')).toBe('false')
  })

  it('помечается только та карточка, по которой нажали', () => {
    const { container } = draw([WITH_PIC, NO_PIC], () => {}, withStore)
    const marks = container.querySelectorAll('.vp-pcard-mark')

    fireEvent.click(marks[0])

    expect(marks[0].getAttribute('aria-pressed')).toBe('true')
    expect(marks[1].getAttribute('aria-pressed')).toBe('false')
  })
})
