'use client'

import { useI18n } from '../../i18n.jsx'
import { BOOKS_AUDIO_MODES } from '../../practice/books/audioFilter.js'

// Ключи словаря перечислены явно, а не собираются конкатенацией: собранный
// ключ не находится грепом (при чистке словаря выглядит неиспользуемым), а
// t() при промахе молча падает на ru и дальше на сам ключ — забытый перевод
// вылез бы в интерфейсе строкой «practice.books.filter.text», и ни один тест
// этого не заметил бы.
const LABEL_KEY = {
  all: 'practice.books.filter.all',
  text: 'practice.books.filter.text',
  audio: 'practice.books.filter.audio',
}

// Сегмент «Все · Текст · Аудио» в шапке раздела «Книжки».
//
// Группа кнопок с aria-pressed, а не <select> и не радиогруппа: ровно так в
// проекте уже сделаны взаимоисключающие фильтры каталога чтения
// (src/screens/reading/ReadingLibrary.jsx) и сегменты типографики
// (src/screens/reading/ReadingSettings.jsx) — свой третий паттерн заводить не
// за чем.
//
// Счётчики считает вызывающий и передаёт готовыми: они зависят только от
// каталога, а этот компонент перерисовывается на каждый символ в соседнем
// поиске по книжкам.
export default function BooksAudioFilter({ value, onChange, counts }) {
  const { t } = useI18n()

  return (
    <div className="pp-seg" role="group" aria-label={t('practice.books.filterAria')}>
      {BOOKS_AUDIO_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          className="pp-seg__btn"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          {t(LABEL_KEY[mode])}
          <span className="pp-seg__n">{counts[mode]}</span>
        </button>
      ))}
    </div>
  )
}
