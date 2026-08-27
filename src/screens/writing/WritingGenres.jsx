import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { LEVEL_TITLES, TASKS_PER_GENRE } from '../../practice/writing/engine.js'
import { genreDoneCount } from '../../practice/writing/writingProgress.js'

// Жанры уровня: 30 карточек с прогрессом «N из 11 заданий». Сам жанр здесь не
// собираем (buildGenre дорогой) — карточке хватает полей seed.
export default function WritingGenres({ level, levelData, progressTick, onOpen }) {
  const { t } = useI18n()
  const seeds = levelData?.seeds || []
  // progressTick в зависимостях — пересчёт прогресса карточек после отметок:
  // genreDoneCount читает localStorage, без тика прогресс замирал бы.
  const progress = useMemo(
    () => Object.fromEntries(seeds.map((s) => [s.id, genreDoneCount(s.id)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seeds, progressTick],
  )

  if (!levelData) return <div className="wr-note">{t('writing.loading')}</div>

  return (
    <>
      <div className="wr-hero">
        <h1>{LEVEL_TITLES[level] ? LEVEL_TITLES[level][0] : level}</h1>
        <p>{LEVEL_TITLES[level] ? LEVEL_TITLES[level][1] : ''}</p>
      </div>
      <div className="wr-gngrid">
        {seeds.map((seed) => {
          const done = progress[seed.id] || 0
          const pct = Math.round((done / TASKS_PER_GENRE) * 100)
          return (
            <button
              key={seed.id}
              type="button"
              className={'wr-gncard' + (done >= TASKS_PER_GENRE ? ' wr-gncard--done' : '')}
              onClick={() => onOpen(seed.id)}
            >
              <span className="wr-gncard__title">{seed.title}</span>
              <span className="wr-gncard__sub">{seed.sub}</span>
              <span className="wr-gncard__meta">
                <span className="wr-pill">{seed.reg}</span>
                <span className="wr-pill wr-pill--score">
                  {seed.tw[0]}–{seed.tw[1]} {t('writing.words')}
                </span>
              </span>
              <span className="wr-gncard__bar">
                <i style={{ width: pct + '%' }} />
              </span>
              <span className="wr-lvcard__stats">
                {t('writing.genre.tasksDone', { done, total: TASKS_PER_GENRE })}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
