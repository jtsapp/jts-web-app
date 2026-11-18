'use client'

// Список уроков Видеодиктанта: уровень — строкой .pk-cap, как в «Практике» (по умолчанию уровень ученика, если на нём
// есть уроки, иначе «Все»), карточка урока — превью YouTube (i.ytimg.com, как в админке Шэдоуинга), название, сериал,
// канал, «N фраз» и лучший результат «С первого раза: clean из n». Уровни раздела — A0–C1, как у уроков в админке.
// Выбранный уровень держит экран (VideoDictationPage): после урока список открывается на нём же, а не на уровне
// ученика.

import { useState } from 'react'
import { plural } from '../../lib/plural.js'
import { cefrOf } from '../../practice/practiceLevel.js'
import { bestOf } from '../../practice/video-dictation/progress.js'
import { LevelSwitch } from '../practice/PracticeCards.jsx'

export const VD_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']

/** Уровень по умолчанию: уровень ученика, если на нём есть уроки, иначе все. */
export function pickLevel(lessons, userLevel) {
  const own = cefrOf(userLevel)
  return own && lessons.some((l) => cefrOf(l.level) === own) ? own : 'all'
}

function LessonCard({ lesson, best, t, lang, onOpen }) {
  const [thumb, setThumb] = useState(true)
  const phrases = Number.isInteger(lesson.phrases) ? lesson.phrases : 0
  return (
    <button type="button" className="vd-card" data-slug={lesson.slug} onClick={() => onOpen(lesson.slug)}>
      <span className="vd-card__thumb">
        {thumb && lesson.video && (
          // eslint-disable-next-line @next/next/no-img-element -- превью YouTube с i.ytimg.com: next/image на чужой хост без настройки не пустит
          <img
            src={`https://i.ytimg.com/vi/${encodeURIComponent(lesson.video)}/mqdefault.jpg`}
            alt=""
            loading="lazy"
            onError={() => setThumb(false)}
          />
        )}
        {lesson.level && <span className="vd-card__level">{lesson.level}</span>}
      </span>
      <span className="vd-card__body">
        <span className="vd-card__title" lang="en">
          {lesson.title}
        </span>
        {lesson.series && (
          <span className="vd-card__meta" lang="en">
            {lesson.series}
          </span>
        )}
        {lesson.channel && <span className="vd-card__meta">{lesson.channel}</span>}
        <span className="vd-card__foot">
          <span>{plural(t, lang, 'videoDictation.phrases', phrases)}</span>
          {best && <span className="vd-card__best">{t('videoDictation.firstTry', { clean: best.clean, n: best.n })}</span>}
        </span>
      </span>
    </button>
  )
}

export default function LessonList({ lessons, best, level: picked, userLevel, t, lang, onLevel, onOpen }) {
  const level = picked ?? pickLevel(lessons, userLevel)
  const shown = level === 'all' ? lessons : lessons.filter((l) => cefrOf(l.level) === level)
  return (
    <>
      <div className="pk-cap">
        <p className="pk-note">{t('videoDictation.intro')}</p>
        <LevelSwitch value={level} onChange={onLevel} levels={VD_LEVELS} />
      </div>
      {shown.length ? (
        <ul className="vd-grid">
          {shown.map((l) => (
            <li key={l.slug}>
              <LessonCard lesson={l} best={bestOf(best, l.slug)} t={t} lang={lang} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="jl-notice" role="status">
          {t('videoDictation.levelEmpty', { level })}
          <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={() => onLevel('all')}>
            {t('videoDictation.allLevels')}
          </button>
        </div>
      )}
    </>
  )
}
