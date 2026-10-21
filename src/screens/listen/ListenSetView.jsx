'use client'

// Набор (уровень или направление): тест на 20, юниты с «Повторить юнит» (15) и
// уроками; урок длиннее 12 слов — кнопки «Часть 1», «Часть 2»… Прогоны строит
// buildRuns — те же ключи, что у лучших результатов.

import { useMemo } from 'react'
import { enMain } from '../../practice/listen/compare.js'
import { buildRuns } from '../../practice/listen/runs.js'
import Icon from './ListenIcons.jsx'

function Best({ b, t }) {
  if (!b) return null
  return (
    <span className="jl-best">
      <span className="jl-coin">J</span>
      {t('listen.best', { coins: b.coins, ok: b.ok, n: b.n })}
    </span>
  )
}

function LessonRow({ lesson: l, best, t, onStart }) {
  if (l.review) {
    const r = l.runs[0]
    return (
      <div className="jl-topic jl-topic--rev">
        <div>
          <span className="jl-lnum">{t('listen.lessonReview', { l: l.l })}</span>
          <h3>{l.t}</h3>
          <div className="jl-words">{t('listen.reviewDesc', { from: l.fromL, to: l.toL })}</div>
          <Best b={best[r.key]} t={t} />
        </div>
        <button type="button" className="jl-btn jl-btn--ghost" onClick={() => onStart(r)}>
          {t('listen.start')}
        </button>
      </div>
    )
  }
  const preview = l.words.slice(0, 8).map((w) => enMain(w[0])).join(', ') + (l.words.length > 8 ? ' …' : '')
  return (
    <div className="jl-topic">
      <div>
        <span className="jl-lnum">
          {t('listen.lesson', { l: l.l })}
          {l.g ? ` · ${l.g}` : ''}
        </span>
        <h3>{l.t}</h3>
        <div className="jl-words">{t('listen.words', { n: l.words.length, list: preview })}</div>
        {l.runs.map((r) => (
          <Best key={r.key} b={best[r.key]} t={t} />
        ))}
      </div>
      <div className="jl-row jl-pbtns">
        {l.runs.map((r, i) => (
          <button key={r.key} type="button" className={`jl-btn${i ? ' jl-btn--ghost' : ''}`} onClick={() => onStart(r)}>
            {l.runs.length > 1 ? t('listen.part', { n: i + 1 }) : t('listen.start')}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ListenSetView({ set, best, t, onBack, onStart }) {
  const field = set.kind === 'field'
  const { test, units } = useMemo(() => buildRuns(set), [set])
  const lessons = units.reduce((a, u) => a + u.lessons.length, 0)
  const unitTitle = (u) =>
    field ? u.title || t('listen.unit', { u: u.u }) : `${t('listen.unit', { u: u.u })}${u.title ? ` · ${u.title}` : ''}`
  return (
    <>
      <button type="button" className="jl-back" onClick={onBack}>
        <Icon name="back" /> {field ? t('listen.back.fields') : t('listen.back.levels')}
      </button>
      <section className="jl-card jl-setHead">
        <div className="jl-lvhead">
          <span className={`jl-code${field ? ' jl-code--field' : ''}`}>{field ? set.icon : set.id}</span>
          <div>
            <h1>{set.name}</h1>
            <p>
              {t(field ? 'listen.set.fieldMeta' : 'listen.set.levelMeta', {
                units: units.length,
                lessons,
                words: test.words.length,
              })}
            </p>
          </div>
        </div>
        <div className="jl-topic">
          <div>
            <h3>{t(field ? 'listen.test.field' : 'listen.test.level')}</h3>
            <div className="jl-words">{t(field ? 'listen.test.fieldDesc' : 'listen.test.levelDesc')}</div>
            <Best b={best[test.key]} t={t} />
          </div>
          <button type="button" className="jl-btn" onClick={() => onStart(test)}>
            {t('listen.start')}
          </button>
        </div>
      </section>
      {units.map((u) => (
        <section className="jl-card" key={u.u}>
          <div className="jl-unit__h">
            <h2>{unitTitle(u)}</h2>
            {u.review && (
              <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={() => onStart(u.review)}>
                {t('listen.unitReview')}
              </button>
            )}
          </div>
          <div className="jl-topics">
            {u.lessons.map((l) => (
              <LessonRow key={l.l} lesson={l} best={best} t={t} onStart={onStart} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
