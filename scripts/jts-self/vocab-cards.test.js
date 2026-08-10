import { describe, it, expect } from 'vitest'
import { vocabCardsTask, imageSlug } from './vocab-cards.js'

const lesson = {
  no: 1,
  vocab: [
    ['like', '', 'нравится', 'ұнайды', 'to feel that something is good'],
    ["don't like", '', 'не нравится', 'ұнамайды', 'the opposite'],
  ],
}

describe('imageSlug', () => {
  it('приводит слово к безопасному имени файла', () => {
    expect(imageSlug('don’t like')).toBe('don-t-like')
    expect(imageSlug('Look at')).toBe('look-at')
  })
})

describe('vocabCardsTask', () => {
  it('собирает info-задание с карточкой на каждое слово', () => {
    const task = vocabCardsTask(lesson, () => 'https://cdn/img.jpg')
    expect(task.type).toBe('info')
    expect(task.html).toContain('like')
    expect(task.html).toContain('нравится')
    expect(task.html.match(/kl-vocab__card/g)).toHaveLength(2)
    expect(task.html).toContain('src="https://cdn/img.jpg"')
  })

  it('без картинки карточка остаётся текстовой', () => {
    const task = vocabCardsTask(lesson, () => null)
    expect(task.html).not.toContain('<img')
    expect(task.html).toContain('нравится')
  })

  it('урок без словаря не даёт задания', () => {
    expect(vocabCardsTask({ no: 1, vocab: [] }, () => null)).toBeNull()
  })

  // Находка ревью: пока картинки не залиты в бакет, ссылка 404-ится, а img
  // без обработчика ошибки держит место под себя (aspect-ratio в CSS) и
  // рисует иконку "битого" изображения — почти все карточки A0 выглядели бы
  // сломанными. onerror убирает <img> из DOM, карточка остаётся текстовой.
  it('на битую картинку у img есть обработчик, убирающий её из разметки', () => {
    const task = vocabCardsTask(lesson, () => 'https://cdn/img.jpg')
    expect(task.html).toContain('onerror="this.remove()"')
  })

  // Находка ревью: alt был всегда пустым, хотя картинка иллюстрирует
  // значение слова, а не украшает страницу — скринридер должен получить имя.
  it('alt картинки называет слово, а не пустой', () => {
    const task = vocabCardsTask(lesson, () => 'https://cdn/img.jpg')
    expect(task.html).toContain('alt="like"')
    expect(task.html).not.toContain('alt=""')
  })

  // Пробел, который раньше ни один тест не закрывал: слово/перевод/
  // определение попадают в HTML-атрибуты и текстовые узлы без экранирования
  // спецсимволов — проверяем & < > " во всех трёх полях карточки.
  it('экранирует & < > " в слове, переводе и определении', () => {
    const dangerous = {
      no: 1,
      vocab: [['A & B <x>', '', 'п"р < >', 'kk', 'def & "quoted" <b>']],
    }
    const task = vocabCardsTask(dangerous, () => 'https://cdn/a&b.jpg')
    expect(task.html).not.toContain('<x>')
    expect(task.html).not.toContain('<b>def')
    expect(task.html).toContain('A &amp; B &lt;x&gt;')
    expect(task.html).toContain('п&quot;р &lt; &gt;')
    expect(task.html).toContain('def &amp; &quot;quoted&quot; &lt;b&gt;')
    expect(task.html).toContain('alt="A &amp; B &lt;x&gt;"')
    expect(task.html).toContain('src="https://cdn/a&amp;b.jpg"')
  })
})
