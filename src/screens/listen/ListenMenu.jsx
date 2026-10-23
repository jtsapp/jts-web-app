'use client'

// Меню раздела: шапка, уровни A0–B2 с полосой «пройдено уроков», группы
// профессиональных направлений (сейчас открыты всем — решение 21.10.2026) и
// «Свой список» для преподавателя.

import { doneLessons } from '../../practice/listen/listenProgress.js'
import Icon from './ListenIcons.jsx'
import OwnListCard from './OwnListCard.jsx'

export default function ListenMenu({ index, best, teacher, t, onOpen, onOwn }) {
  const levels = index.levels || []
  const fields = index.fields || []
  const total = levels.reduce((a, l) => a + l.words, 0)
  const groups = [...new Set(fields.map((f) => f.group))]
  return (
    <>
      <section className="jl-card jl-hero">
        <div>
          <span className="jl-eyebrow">{t('listen.eyebrow')}</span>
          <h1>{t('listen.hero.title')}</h1>
          <p>{t('listen.hero.desc')}</p>
          <div className="jl-steps">
            <span>{t('listen.hero.step1')}</span>
            <Icon name="arrow" />
            <span>{t('listen.hero.step2')}</span>
            <Icon name="arrow" />
            <span>{t('listen.hero.step3')}</span>
          </div>
          <p className="jl-muted" style={{ marginTop: 12 }}>{t('listen.hero.limits')}</p>
        </div>
        <div className="jl-demo" aria-hidden="true">
          <b>b</b>
          <b>o</b>
          <b>o</b>
          <b>k</b>
        </div>
      </section>

      <section className="jl-card">
        <h2 className="jl-ctitle">{t('listen.levels.title')}</h2>
        <div className="jl-levels">
          {levels.map((l) => {
            const done = doneLessons(best, l.id)
            return (
              <button type="button" key={l.id} className="jl-lv" onClick={() => onOpen(l.id)}>
                <span className="jl-code">{l.id}</span>
                <b>{l.name}</b>
                <small>{t('listen.levels.meta', { units: l.units, words: l.words })}</small>
                <span className="jl-bar" role="img" aria-label={t('listen.levels.done', { done, total: l.lessons })}>
                  <i style={{ width: `${l.lessons ? (done / l.lessons) * 100 : 0}%` }} />
                </span>
              </button>
            )
          })}
        </div>
        <p className="jl-muted">{t('listen.levels.total', { n: total })}</p>
      </section>

      {fields.length > 0 && (
        <section className="jl-card">
          <h2 className="jl-ctitle">{t('listen.fields.title')}</h2>
          <p className="jl-muted">
            {t('listen.fields.sub', { n: fields.length, words: fields.reduce((a, f) => a + f.words, 0) })}
          </p>
          {groups.map((g) => (
            <div key={g}>
              <h3 className="jl-fcat">{g}</h3>
              <div className="jl-fields">
                {fields
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <button type="button" key={f.id} className="jl-fld" onClick={() => onOpen(f.id)}>
                      <span className="jl-fab" aria-hidden="true">{f.icon}</span>
                      <span className="jl-fname">
                        <b>{f.name}</b>
                        <small>{f.ru} · {t('listen.fields.meta', { words: f.words })}</small>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {teacher && <OwnListCard t={t} onStart={onOwn} />}
    </>
  )
}
