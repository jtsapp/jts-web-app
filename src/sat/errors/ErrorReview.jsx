import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { checkSatAnswer, getSatErrorReview, patchSatError } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import AnswerChoices from '../question/AnswerChoices.jsx'
import HtmlBlock from '../question/HtmlBlock.jsx'
import { DESMOS_URL } from '../question/DesmosDock.jsx'
import ExplanationPanel from '../study/ExplanationPanel.jsx'
import { skillName } from '../names.js'

/**
 * Разбор ошибки (ТЗ SAT 21.10, задача 9, блок 2): вопрос целиком, что выбрал студент и что было верно, разбор.
 * «Решить заново» — тот же вопрос без показа ответа, проверка сервером (верно после срока закрывает ошибку, как в
 * повторении, а история остаётся). Отметка «разобрана» — та же, что ставит верный ответ.
 */
export default function ErrorReview({ id, explainLang, onChanged, onPractice }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(false)
  const [pick, setPick] = useState(null)
  const [spr, setSpr] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    setRetry(false)
    setResult(null)
    getSatErrorReview(token, id).then((d) => alive && setData(d)).catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [token, id])

  if (failed) return <p className="st-muted">{t('sat.el.loadError')}</p>
  if (!data) return <p className="st-muted">{t('sat.study.loading')}</p>

  const q = data.question || {}
  const item = data.item
  const mcq = q.type !== 'spr'
  const answer = Array.isArray(data.answer) ? data.answer.join(' · ') : data.answer

  const check = async (given) => {
    setBusy(true)
    try {
      const r = await checkSatAnswer(token, item.questionId, { given, mode: 'study', helpType: 'none' })
      setResult(r)
      onChanged?.()
    } catch {
      setResult({ error: true })
    } finally {
      setBusy(false)
    }
  }

  const markReviewed = async () => {
    setBusy(true)
    try {
      await patchSatError(token, item.id, { resolved: !item.reviewed })
      setData({ ...data, item: { ...item, reviewed: !item.reviewed } })
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="st-elr">
      <p className="st-muted">
        {skillName(item.skillId, lang)} · {item.kind === 'unanswered' ? t('sat.el.kind.unanswered') : t('sat.el.kind.wrong')}
      </p>
      {q.passage && <HtmlBlock className="st-elr__passage" html={q.passage} />}
      {q.stem && <HtmlBlock className="st-elr__stem" html={q.stem} />}

      {!retry && (
        <>
          {mcq ? (
            <AnswerChoices options={q.options || []} value={data.given} verdict={{ answer: data.answer, chosen: data.given }} />
          ) : (
            <p>{t('sat.el.yours', { a: data.given == null ? '—' : String(data.given) })} · {t('sat.el.right', { a: String(answer) })}</p>
          )}
          {item.kind === 'unanswered' && <p className="st-muted">{t('sat.el.noAnswer')}</p>}
          <ExplanationPanel doc={q} data={{ answer: data.answer, explanation: data.explanation, distractors: data.distractors }}
            chosen={data.given} explainLang={explainLang} onClose={() => {}} />
        </>
      )}

      {retry && (
        <div className="st-elr__retry">
          {mcq ? (
            <AnswerChoices options={q.options || []} value={pick} onSelect={setPick}
              verdict={result && !result.error ? { answer: data.answer, chosen: pick } : undefined} />
          ) : (
            <input className="st-elr__spr" value={spr} onChange={(e) => setSpr(e.target.value)} inputMode="decimal" />
          )}
          {!result && (
            <button type="button" className="ih-cta" disabled={busy || (mcq ? !pick : !spr.trim())} onClick={() => check(mcq ? pick : spr.trim())}>
              {t('sat.el.check')}
            </button>
          )}
          {result && <p className={result.correct ? 'st-elr__ok' : 'st-elr__bad'}>{result.error ? t('sat.el.loadError') : result.correct ? t('sat.el.retryOk') : t('sat.el.retryBad')}</p>}
        </div>
      )}

      <div className="st-elr__acts">
        {/* вопрос Past paper вне пробника не выдаётся — решить его заново здесь нельзя */}
        {!retry && item.source !== 'paper' && <button type="button" className="ih-btn ih-btn--outline" onClick={() => { setRetry(true); setPick(null); setSpr(''); setResult(null) }}>{t('sat.el.retry')}</button>}
        {retry && <button type="button" className="ih-btn ih-btn--outline" onClick={() => setRetry(false)}>{t('sat.el.showReview')}</button>}
        {item.section === 'math' && <a className="ih-btn ih-btn--outline" href={DESMOS_URL} target="_blank" rel="noopener noreferrer">Desmos</a>}
        <button type="button" className="ih-btn ih-btn--outline" disabled={busy} onClick={markReviewed}>
          {item.reviewed ? t('sat.el.unmark') : t('sat.el.markReviewed')}
        </button>
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onPractice?.([item.skillId])}>{t('sat.el.train')}</button>
      </div>
    </div>
  )
}
