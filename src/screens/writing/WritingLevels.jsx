import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { LEVEL_TITLES, LEVEL_TAG, TASKS_PER_GENRE } from '../../practice/writing/engine.js'
import { readState } from '../../practice/writing/writingProgress.js'
import { WRITING_LEVELS } from '../WritingPage.jsx'

const GENRES_PER_LEVEL = 30

// Каталог уровней. Прогресс уровня считаем без загрузки JSON уровня: id жанров
// всегда начинаются с "<level>-" (a1-form, a2p-email-news…), поэтому достаточно
// пройтись по ключам сохранённых заданий.
function levelDonePct(level, tasks) {
  const prefix = level + '-'
  let done = 0
  for (const key of Object.keys(tasks)) {
    if (key.startsWith(prefix)) done++
  }
  const total = GENRES_PER_LEVEL * TASKS_PER_GENRE
  return Math.min(100, Math.round((done / total) * 100))
}

export default function WritingLevels({ progressTick, onOpenLevel, onOpenPad }) {
  const { t } = useI18n()
  // progressTick в зависимостях — пересчёт на каждую отметку/гидратацию.
  const tasks = useMemo(() => readState().tasks || {}, [progressTick])

  return (
    <>
      <div className="wr-hero">
        <h1>{t('writing.hero.title')}</h1>
        <p>{t('writing.hero.desc')}</p>
      </div>
      <div className="wr-lvgrid">
        {WRITING_LEVELS.map((level) => {
          const pct = levelDonePct(level, tasks)
          return (
            <button key={level} type="button" className="wr-lvcard" onClick={() => onOpenLevel(level)}>
              <span className="wr-lvcard__tag">{LEVEL_TAG[level]}</span>
              <span className="wr-lvcard__title">{LEVEL_TITLES[level][0]}</span>
              <span className="wr-lvcard__sub">{LEVEL_TITLES[level][1]}</span>
              <span className="wr-lvcard__bar">
                <i style={{ width: pct + '%' }} />
              </span>
              <span className="wr-lvcard__stats">
                {pct > 0
                  ? t('writing.level.stats', { n: GENRES_PER_LEVEL, p: pct })
                  : t('writing.level.statsNew', { n: GENRES_PER_LEVEL })}
              </span>
            </button>
          )
        })}
      </div>
      <div className="wr-padpromo">
        <div className="wr-padpromo__body">
          <h3>{t('writing.padpromo.title')}</h3>
          <p>{t('writing.padpromo.desc')}</p>
        </div>
        <button type="button" className="wr-primary" onClick={onOpenPad}>
          {t('writing.padpromo.cta')}
        </button>
      </div>
    </>
  )
}
