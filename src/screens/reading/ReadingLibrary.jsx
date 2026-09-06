import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { GENRES, genreOf } from '../../practice/reading/genres.js'
import { readMin, wordCount } from '../../practice/reading/engine.js'
import { readState, progressOf } from '../../practice/reading/readingProgress.js'
import { READING_LEVELS } from '../ReadingPage.jsx'

// Библиотека: уровень + жанр фильтруют сетку карточек (viewLibrary прототипа,
// jtsreading.html:718). Уровень и жанр держит родитель — возврат из текста
// обязан вернуть в тот же срез каталога.
export default function ReadingLibrary({ level, genre, texts, progressTick, onLevel, onGenre, onOpen }) {
  const { t } = useI18n()

  // progressTick в зависимостях — пересчёт на каждую отметку и на гидратацию с
  // сервера: readState() читает localStorage, и без тика проценты замирали бы
  // до перемонтирования экрана.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const state = useMemo(() => readState(), [progressTick])

  const list = useMemo(
    () => (texts || []).filter((x) => genre === 'all' || x.genre === genre),
    [texts, genre],
  )

  return (
    <>
      <div className="rd-hero">
        <h1>{t('reading.hero.title')}</h1>
        <p>{t('reading.hero.desc')}</p>
      </div>

      <p className="rd-label" id="rd-lbl-level">{t('reading.level')}</p>
      <div className="rd-chips" role="group" aria-labelledby="rd-lbl-level">
        {READING_LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            className="rd-chip"
            aria-pressed={level === lv}
            title={t('reading.levelName.' + lv)}
            onClick={() => onLevel(lv)}
          >
            {lv.toUpperCase()}
          </button>
        ))}
      </div>

      <p className="rd-label" id="rd-lbl-genre">{t('reading.genre')}</p>
      <div className="rd-chips" role="group" aria-labelledby="rd-lbl-genre">
        <button type="button" className="rd-chip" aria-pressed={genre === 'all'} onClick={() => onGenre('all')}>
          {t('reading.all')}
        </button>
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            className="rd-chip"
            aria-pressed={genre === g.id}
            onClick={() => onGenre(g.id)}
          >
            <span aria-hidden="true">{g.emoji}</span> {t('reading.genre.' + g.id)}
          </button>
        ))}
      </div>

      {!texts ? (
        <div className="rd-note">{t('reading.loading')}</div>
      ) : list.length === 0 ? (
        <div className="rd-note">{t('reading.noTexts')}</div>
      ) : (
        <div className="rd-grid">
          {list.map((x) => (
            <Card key={x.id} text={x} state={state} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  )
}

function Card({ text, state, onOpen }) {
  const { t } = useI18n()
  const g = genreOf(text.genre)
  const sc = progressOf(text, state)
  const done = !!(state.texts[text.id] && state.texts[text.id].done)
  const label = sc.pct === 0 ? t('reading.start') : done || sc.pct === 100 ? t('reading.again') : t('reading.cont')

  return (
    <article className={`rd-card rd-g-${text.genre}`}>
      <div className="rd-card__cover">
        <span className="rd-card__lvl">{text.level}</span>
        {done && <span className="rd-card__done">✓ {t('reading.done')}</span>}
        <span className="rd-card__emoji" aria-hidden="true">{text.cover.emoji}</span>
      </div>
      <div className="rd-card__body">
        <h2 className="rd-card__title" lang="en">{text.title}</h2>
        <div className="rd-card__meta">
          <span>{g.emoji} {t('reading.genre.' + text.genre)}</span>
          <span>⏱ {readMin(text.text)} {t('reading.min')}</span>
          <span>📝 {wordCount(text.text)} {t('reading.words')}</span>
        </div>
        <div className="rd-card__bar" aria-label={`${t('reading.progress')} ${sc.pct}%`}>
          <div className="rd-bar"><i style={{ width: sc.pct + '%' }} /></div>
          <span>{sc.pct}%</span>
        </div>
        <button type="button" className="rd-btn rd-btn--primary rd-btn--block" onClick={() => onOpen(text.id)}>
          {label} →
        </button>
      </div>
    </article>
  )
}
