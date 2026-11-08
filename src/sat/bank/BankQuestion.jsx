import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { checkSatAnswer, getSatBankReview, getSatQuestion, getSatQuestionHint } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import AnswerChoices from '../question/AnswerChoices.jsx'
import HtmlBlock from '../question/HtmlBlock.jsx'
import ExplanationPanel from '../study/ExplanationPanel.jsx'
import { pick } from '../model/profile.js'

/**
 * Вопрос банка в режиме «Все вопросы» (ТЗ SAT 21.10, задача 8). Не решал — обычное решение с подсказками и разбором;
 * решал — свой ответ, верный и разбор, плюс «Решить заново». Результат сразу уходит наверх — клетка перекрашивается
 * без перезагрузки. Сессии нет: закрыть окно можно в любой момент.
 */
export default function BankQuestion({ qid, answered, explainLang, onResult }) {
  const { t } = useI18n()
  const token = loadToken()
  const [doc, setDoc] = useState(null)
  const [review, setReview] = useState(null)
  const [solving, setSolving] = useState(!answered)
  const [choice, setChoice] = useState(null)
  const [spr, setSpr] = useState('')
  const [hints, setHints] = useState([])
  const [hintTotal, setHintTotal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const lang = explainLang || 'ru'

  useEffect(() => {
    let alive = true
    const load = answered
      ? getSatBankReview(token, qid).then((r) => alive && (setReview(r), setDoc(r.question)))
      : getSatQuestion(token, qid).then((q) => alive && setDoc(q))
    load.catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [token, qid, answered])

  if (failed) return <p className="st-muted">{t('sat.el.loadError')}</p>
  if (!doc) return <p className="st-muted">{t('sat.study.loading')}</p>
  const mcq = doc.type !== 'spr'

  const moreHint = async () => {
    setBusy(true)
    try {
      const h = await getSatQuestionHint(token, qid, hints.length)
      setHints((x) => [...x, pick(h.hint, lang) || ''])
      setHintTotal(h.total)
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    setBusy(true)
    try {
      const given = mcq ? choice : spr.trim()
      const r = await checkSatAnswer(token, qid, { given, mode: 'study', helpType: hints.length ? 'hint' : 'none' })
      if (r.formatError) return
      setReview({ ...r, question: doc })
      setSolving(false)
      onResult?.(qid, !!r.correct)
    } finally {
      setBusy(false)
    }
  }

  const restart = () => {
    setSolving(true)
    setChoice(null)
    setSpr('')
    setHints([])
  }

  return (
    <div className="st-elr">
      {doc.passage && <HtmlBlock className="st-elr__passage" html={doc.passage} />}
      {doc.stem && <HtmlBlock className="st-elr__stem" html={doc.stem} />}

      {solving ? (
        <>
          {mcq
            ? <AnswerChoices options={doc.options || []} value={choice} onSelect={setChoice} />
            : <input className="st-elr__spr" value={spr} onChange={(e) => setSpr(e.target.value)} inputMode="decimal" />}
          {hints.length > 0 && <ol className="st-bankq__hints">{hints.map((h, i) => <li key={i}>{h}</li>)}</ol>}
          <div className="st-elr__acts">
            <button type="button" className="ih-cta" disabled={busy || (mcq ? !choice : !spr.trim())} onClick={check}>{t('sat.el.check')}</button>
            {(hintTotal == null || hints.length < hintTotal) && (
              <button type="button" className="ih-btn ih-btn--outline" disabled={busy} onClick={moreHint}>{t('sat.bank.hint')}</button>
            )}
          </div>
        </>
      ) : review && (
        <>
          {mcq
            ? <AnswerChoices options={doc.options || []} value={review.given} verdict={{ answer: review.answer, chosen: review.given }} />
            : <p>{t('sat.el.yours', { a: String(review.given ?? '—') })} · {t('sat.el.right', { a: String(Array.isArray(review.answer) ? review.answer.join(' · ') : review.answer) })}</p>}
          <p className={review.correct ? 'st-elr__ok' : 'st-elr__bad'}>{review.correct ? t('sat.el.retryOk') : t('sat.bank.wrong')}</p>
          <ExplanationPanel doc={doc} data={review} chosen={review.given} explainLang={lang} onClose={() => {}} />
          <div className="st-elr__acts">
            <button type="button" className="ih-btn ih-btn--outline" onClick={restart}>{t('sat.el.retry')}</button>
          </div>
        </>
      )}
    </div>
  )
}
