'use client'

import { useI18n } from '../../i18n.jsx'
import { BOOKS_AUDIO_MODES, countByAudio } from '../../practice/books/audioFilter.js'

// Сегмент «Все · Текст · Аудио» в шапке раздела «Книжки».
//
// Группа кнопок с aria-pressed, а не <select> и не радиогруппа: ровно так в
// проекте уже сделаны взаимоисключающие фильтры каталога чтения
// (src/screens/reading/ReadingLibrary.jsx) и сегменты типографики
// (src/screens/reading/ReadingSettings.jsx) — свой третий паттерн заводить не
// за чем.
//
// Счётчик у каждого режима стоит намеренно: без него «Аудио» — это кнопка,
// после которой библиотека молча усыхает вдвое и непонятно, фильтр это или
// каталог не догрузился.
export default function BooksAudioFilter({ value, onChange, books }) {
  const { t } = useI18n()
  const counts = countByAudio(books)

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
          {t('practice.books.filter.' + mode)}
          <span className="pp-seg__n">{counts[mode]}</span>
        </button>
      ))}
    </div>
  )
}
