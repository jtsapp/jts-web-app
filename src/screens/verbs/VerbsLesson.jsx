'use client'

import { Fragment, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { COMPARE, FIXES, FORM_CARDS, HERO, PATTERN_CARDS, QUIZ } from '../../practice/verbs/lesson.js'

// Часть 01 «Разберись» — урок прототипа: шесть карточек и мини-тест.
// Английские примеры — lesson.js, объяснения — ключи verbs.* (у прототипа
// урок на трёх языках, язык берём из интерфейса приложения).
export default function VerbsLesson({ onGo, onPattern }) {
  const { t } = useI18n()
  const [quiz, setQuiz] = useState({}) // номер вопроса → выбранный вариант

  return (
    <div className="vb-lesson">
      <section className="vb-hero">
        <div className="vb-hero__text">
          <span className="vb-eyebrow">{t('verbs.nextStep')}</span>
          <h2>{t('verbs.lessonIntro')}</h2>
          <p>{t('verbs.lessonLead')}</p>
          <button type="button" className="vb-btn" onClick={() => onGo('table')}>
            {t('verbs.explore')} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="vb-hero__stack" lang="en" aria-label={HERO.join(' ')}>
          {HERO.map((f, i) => (
            <div key={f}>
              <small>V{i + 1}</small>
              {f}
              <span>0{i + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <article className="vb-card">
        <h3>{t('verbs.whatTitle')}</h3>
        <p>{t('verbs.whatText')}</p>
        <div className="vb-compare">
          <div>
            <span className="vb-eyebrow">{t('verbs.regular')}</span>
            <p className="vb-chain" lang="en">
              {COMPARE.regular.map(([base, end], i) => (
                <Fragment key={base}>
                  {i > 0 && <br />}
                  {base} → {base}
                  <b>{end}</b> → {base}
                  <b>{end}</b>
                </Fragment>
              ))}
            </p>
          </div>
          <div className="vb-compare__lav">
            <span className="vb-eyebrow">{t('verbs.irregular')}</span>
            <p className="vb-chain" lang="en">
              {COMPARE.irregular.map(([a, b, c], i) => (
                <Fragment key={a}>
                  {i > 0 && <br />}
                  {a} → <b>{b}</b> → <b>{c}</b>
                </Fragment>
              ))}
            </p>
          </div>
        </div>
      </article>

      <article className="vb-card">
        <h3>{t('verbs.whyTitle')}</h3>
        <div className="vb-reasons">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <span className="vb-num">0{i + 1}</span>
              <h4>{t(`verbs.reasons.${i}.title`)}</h4>
              <p>{t(`verbs.reasons.${i}.text`)}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="vb-card">
        <h3>{t('verbs.formsTitle')}</h3>
        <div className="vb-formcards">
          {FORM_CARDS.map((c, i) => (
            <div className="vb-formcard" key={c.pill}>
              <span className="vb-pill">{c.pill}</span>
              <h4 lang="en">{c.title}</h4>
              <p>{t(`verbs.formsHelp.${i}`)}</p>
              <div className="vb-examples" lang="en">
                {c.examples.map(([pre, form, post], j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {pre}
                    <u>{form}</u>
                    {post}
                  </Fragment>
                ))}
              </div>
              <details>
                <summary>{t('verbs.more')}</summary>
                <p lang="en">
                  {c.more[0]}
                  <u>{c.more[1]}</u>
                  {c.more[2]}
                </p>
              </details>
            </div>
          ))}
        </div>
      </article>

      <article className="vb-card">
        <h3>{t('verbs.patternsTitle')}</h3>
        <div className="vb-patterns">
          {PATTERN_CARDS.map((p, i) => (
            <details className="vb-pattern" key={p.id}>
              <summary>
                <span className="vb-pill">{p.id}</span>
                <strong lang="en">{p.chain}</strong>
              </summary>
              <p>{t(`verbs.patternHelp.${i}`)}</p>
              <p lang="en">{p.example}</p>
              <button type="button" className="vb-link" onClick={() => onPattern(p.id)}>
                {t('verbs.inTable')}
              </button>
            </details>
          ))}
        </div>
        <p className="vb-muted vb-patterns__note">{t('verbs.soundHelp')}</p>
      </article>

      <article className="vb-card">
        <h3>{t('verbs.mistakesTitle')}</h3>
        {FIXES.map((f, i) => (
          <div className="vb-fix" key={f.wrong}>
            <s lang="en">× {f.wrong}</s>
            <strong lang="en">✓ {f.right}</strong>
            <p>{t(`verbs.rules.${i}`)}</p>
          </div>
        ))}
      </article>

      <article className="vb-card">
        <h3>{t('verbs.quizTitle')}</h3>
        <p>{t('verbs.quizHint')}</p>
        <div className="vb-quizgrid">
          {QUIZ.map((q, i) => {
            const chosen = quiz[i]
            const ok = chosen === q.answer
            return (
              <div className="vb-quiz" key={q.text}>
                <p lang="en">{q.text}</p>
                <div className="vb-row">
                  {q.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      lang="en"
                      className={`vb-choice${chosen === c ? (ok ? ' is-correct' : ' is-wrong') : ''}`}
                      onClick={() => setQuiz((prev) => ({ ...prev, [i]: c }))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="vb-quiz__fb" aria-live="polite">
                  {chosen ? `${t(ok ? 'verbs.correct' : 'verbs.tryAgain')}. ${t(`verbs.rules.${i}`)}` : ''}
                </p>
              </div>
            )
          })}
        </div>
        <div className="vb-next">
          <span>{t('verbs.nextStep')}</span>
          <button type="button" className="vb-btn" onClick={() => onGo('table')}>
            {t('verbs.explore')} →
          </button>
        </div>
      </article>
    </div>
  )
}
