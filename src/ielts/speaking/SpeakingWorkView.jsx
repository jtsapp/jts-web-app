import { useCallback, useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { getIeltsAttempt, getIeltsWritingModel } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { formatDate } from '../format.js'
import { InfoIcon, MicIcon } from '../icons.jsx'
import { SPEAKING_CRITERIA, formatSec, speakingQuestions } from './speaking.js'
import { useI18n } from '../../i18n.jsx'

const CRIT_KEY = { fluencyCoherence: 'fc', lexicalResource: 'lr', grammaticalRange: 'gra', pronunciation: 'p' }

/**
 * Оценка ответов Speaking: band по четырём критериям (произношение — по звуку, Azure; если его не было — band по
 * трём и об этом сказано), что получилось и над чем работать, по каждому вопросу — стенограмма, длительность и
 * темп, рядом модельный ответ с разбором. Записей здесь нет: они не хранятся.
 */
export default function SpeakingWorkView({ token, attemptId, onBackToLearn, onWorks, onRetry }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const pick = useCallback((o) => (o && typeof o === 'object' ? o[lang] || o.ru || o.en : o), [lang])
  const [state, setState] = useState({ status: 'loading' })
  const [models, setModels] = useState(null)

  useEffect(() => {
    let alive = true
    getIeltsAttempt(authToken, attemptId)
      .then((v) => {
        if (!alive) return
        setState({ status: 'ready', view: v })
        getIeltsWritingModel(authToken, v.testId).then((m) => alive && setModels(m)).catch(() => {})
      })
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, attemptId])

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBackToLearn }, { label: 'Speaking', onClick: onBackToLearn }, { label: t('ieltsSpeaking.works'), onClick: onWorks }]
  if (state.status !== 'ready')
    return (
      <div className="ih-wwork">
        <Breadcrumbs items={crumbs} />
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>
    )

  const v = state.view
  const r = v.result || {}
  const doc = v.document
  const part2 = doc.kind === 'part2'
  const byId = Object.fromEntries((r.items || []).map((x) => [x.itemId, x]))
  const qs = speakingQuestions(doc).filter((q) => byId[q.id])

  return (
    <div className="ih-wwork">
      <Breadcrumbs items={crumbs} />
      {r.status === 'done' ? (
        <section className="ih-card ih-wscore">
          <div className="ih-wscore__band">
            <span>{t('ieltsWriting.band')}</span>
            <b>{v.attempt.band?.toFixed(1)}</b>
          </div>
          <div className="ih-wscore__crit">
            {SPEAKING_CRITERIA.map((c) => (
              <div key={c}>
                <b>{r.criteria?.[c] != null ? Number(r.criteria[c]).toFixed(1) : '—'}</b>
                <span>{t(`ieltsSpeaking.p.crit.${CRIT_KEY[c]}`)}</span>
              </div>
            ))}
          </div>
          {r.criteria?.pronunciation == null && <p className="ih-wscore__fb ih-muted"><InfoIcon size={14} /> {t('ieltsSpeaking.noPron')}</p>}
          {r.feedback && <p className="ih-wscore__fb">{r.feedback}</p>}
          <div className="ih-wscore__actions">
            <PillButton variant="primary" onClick={() => onRetry(v.testId)}>{t('ieltsSpeaking.again')}</PillButton>
          </div>
        </section>
      ) : (
        <section className="ih-wstatus is-bad" role="status">
          <span className="ih-wstatus__icon"><MicIcon size={22} /></span>
          <div>
            <b>{t(r.status === 'grading' ? 'ieltsWriting.gradingTitle' : 'ieltsSpeaking.failedTitle')}</b>
            <p>{t(r.status === 'grading' ? 'ieltsWriting.gradingText' : 'ieltsSpeaking.failedText')}</p>
          </div>
          <button type="button" className="ih-btn ih-btn--dark" onClick={() => onRetry(v.testId)}>{t('ieltsSpeaking.again')}</button>
        </section>
      )}

      {(r.strengths?.length > 0 || r.improvements?.length > 0) && (
        <div className="ih-wwork__grid">
          <section className="ih-card ih-slist is-good">
            <h3>{t('ieltsSpeaking.strengths')}</h3>
            <ul>{(r.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
          <section className="ih-card ih-slist">
            <h3>{t('ieltsSpeaking.improvements')}</h3>
            <ul>{(r.improvements || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
        </div>
      )}

      <section className="ih-card ih-sanswers">
        <header>
          <h3>{t('ieltsSpeaking.yourAnswers')}</h3>
          <span className="ih-muted">{formatDate(v.attempt.finishedAt, lang)}</span>
        </header>
        {qs.map((q) => {
          const a = byId[q.id]
          const model = part2 ? models : models?.questions?.[q.id]
          return (
            <div key={q.id} className="ih-sanswer">
              <b lang="en">{q.question}</b>
              <div className="ih-wmine__chips">
                <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{formatSec(a.durationSec)}</span></span>
                {a.wpm != null && <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{t('ieltsSpeaking.wpm', { n: String(a.wpm) })}</span></span>}
              </div>
              <p lang="en" className="ih-sanswer__text">{a.transcript || t('ieltsSpeaking.noSpeech')}</p>
              {model?.text && (
                <details className="ih-sanswer__model">
                  <summary>{t('ieltsSpeaking.modelAnswer')} · band {model.band}</summary>
                  {model.text.map((p, i) => <p key={i} lang="en">{p}</p>)}
                  {(model.analysis?.tips || []).map((tip, i) => (
                    <div key={i} className="ih-sanswer__tip">
                      <b>{pick(tip.title)}</b>
                      <p>{pick(tip)}</p>
                      {tip.example && <p className="ih-muted" lang="en">«{tip.example}»</p>}
                    </div>
                  ))}
                  {(model.analysis?.paragraphs || []).map((pp, i) => (
                    <p key={`p${i}`} className="ih-wmodel__note"><InfoIcon size={14} />{t(`ieltsSpeaking.p.role.${pp.role}`)}: {pick(pp.note)}</p>
                  ))}
                </details>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
