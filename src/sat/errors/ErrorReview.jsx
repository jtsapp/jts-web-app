import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { checkSatAnswer, getSatErrorReview, patchSatError } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { CloseIcon } from '../../ielts/icons.jsx'
import { NoCircleIcon, OkCircleIcon, ReplayIcon } from '../icons.jsx'
import AnswerChoices from '../question/AnswerChoices.jsx'
import HtmlBlock from '../question/HtmlBlock.jsx'
import { steps } from '../study/ExplanationPanel.jsx'
import { KEYS } from '../question/session.js'
import { pick } from '../model/profile.js'
import { parse } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'
import { skillName } from '../names.js'
import { DiffChip, ReasonChip, SourceChip, StatusChip } from './chips.jsx'
import { reasonOf } from './errorLog.js'

/** Текст варианта по букве: для карточек «Ваш ответ · B» / «Верный ответ · C». */
function optionHtml(q, key) {
  const i = KEYS.indexOf(key)
  return i >= 0 ? (q.options || [])[i] : null
}

/**
 * Разбор ошибки — панель справа поверх журнала («NEW 2», 17:9308): чипы, вопрос, что выбрал студент и что было
 * верно, отмеченная причина, разбор. «Решить заново» — тот же вопрос без показа ответа, проверка сервером (верно
 * после срока закрывает ошибку, как в повторении, а история остаётся); с 30.10.2026 сервер принимает и вопросы Past
 * paper из своего журнала. Отметка «разобрана» — та же, что ставит верный ответ. Ссылки на Desmos здесь нет (макет).
 */
export default function ErrorReview({ item: listItem, explainLang, onChanged, onPractice, onClose }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const closeRef = useRef(null)
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(false)
  const [pick_, setPick] = useState(null)
  const [spr, setSpr] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const id = listItem.id

  useEffect(() => {
    let alive = true
    setData(null)
    setFailed(false)
    setRetry(false)
    setResult(null)
    getSatErrorReview(token, id).then((d) => alive && setData(d)).catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [token, id])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // строка журнала есть сразу — чипы и мета видны, пока грузится сам вопрос
  const item = { ...listItem, ...(data?.item || {}) }
  const q = data?.question || {}
  const mcq = q.type !== 'spr'
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const meta = [item.section === 'math' ? 'Math' : 'R&W', skillName(item.skillId, lang),
    item.createdAt ? fmtDate(loc, parse(String(item.createdAt).slice(0, 10)), { day: 'numeric', month: 'short' }) : null].filter(Boolean).join(' · ')
  const reason = reasonOf(item)

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
      setData({ ...data, item: { ...(data?.item || {}), reviewed: !item.reviewed } })
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  // why — почему выбранный вариант неверен (distractors банка): в макете его нет, но без него разбор ошибки теряет
  // главное — чем именно этот вариант ловит, — поэтому он идёт строкой под текстом варианта
  const answerCard = (ok, key, html, why) => (
    <div className={`st-elr__ans ${ok ? 'is-ok' : 'is-bad'}`}>
      {ok ? <OkCircleIcon size={20} /> : <NoCircleIcon size={20} />}
      <div>
        <small>{key == null ? t('sat.el.noAnswer') : t(ok ? 'sat.el.rightAnswer' : 'sat.el.yourAnswer', { a: key })}</small>
        {html && <HtmlBlock html={html} />}
        {why && <p className="st-elr__why" dangerouslySetInnerHTML={{ __html: why }} />}
      </div>
    </div>
  )
  const answer = data ? (Array.isArray(data.answer) ? data.answer.join(' · ') : String(data.answer ?? '')) : ''
  const given = data?.given == null || data?.given === '' ? null : String(data.given)
  const xpText = data ? pick(data.explanation, explainLang || 'ru') : ''
  const xpSteps = q.section === 'math' ? steps(xpText) : null
  const startRetry = () => {
    setRetry(true)
    setPick(null)
    setSpr('')
    setResult(null)
  }

  return (
    <div className="st-drawer" role="presentation" onClick={onClose}>
      <aside className="st-drawer__panel st-elr" role="dialog" aria-modal="true" aria-label={t('sat.el.reviewTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="st-elr__top">
          <StatusChip reviewed={item.reviewed} />
          <DiffChip d={item.difficulty} />
          <SourceChip source={item.source} />
          <span className="st-spacer" />
          <button ref={closeRef} type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <p className="st-muted st-elr__meta">{meta}</p>

        {failed && <p className="st-muted">{t('sat.el.loadError')}</p>}
        {!failed && !data && <p className="st-muted">{t('sat.study.loading')}</p>}
        {data && (
          <>
            {/* текст R&W остаётся: без него вопрос «какой вариант лучше» не решить — в макете лишь короткий пример */}
            {q.passage && <HtmlBlock className="st-elr__passage" html={q.passage} />}
            <HtmlBlock as="h2" className="st-elr__stem" html={q.stem || item.preview || ''} />

            {!retry ? (
              <>
                {answerCard(false, given, mcq && given ? optionHtml(q, given) : null,
                  mcq && given ? pick(data.distractors?.[given], explainLang || 'ru') : null)}
                {answerCard(true, answer, mcq ? optionHtml(q, answer) : null)}
                {reason !== 'unanswered' && (
                  <div className="st-elr__reason">
                    <ReasonChip item={item} />
                    <span>{reason === 'none' ? t('sat.el.reason.none') : t('sat.el.markedReason', { r: t(`sat.etype.${reason}`) })}</span>
                  </div>
                )}
                {xpText && (
                  <div className="st-elr__xp">
                    <span className="st-muted">{t('sat.el.explain')}</span>
                    {/* у Math разбор — абзац алгебры: по шагам, как в учебном режиме */}
                    {xpSteps ? <ol className="st-xp__steps">{xpSteps.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</ol>
                      : <div dangerouslySetInnerHTML={{ __html: xpText }} />}
                  </div>
                )}
              </>
            ) : (
              <div className="st-elr__retry">
                {mcq ? (
                  <AnswerChoices options={q.options || []} value={pick_} onSelect={setPick}
                    verdict={result && !result.error ? { answer: data.answer, chosen: pick_ } : undefined} />
                ) : (
                  <input className="st-elr__spr" value={spr} onChange={(e) => setSpr(e.target.value)} inputMode="decimal" aria-label={t('sat.el.retry')} />
                )}
                {result && <p className={result.correct ? 'st-elr__ok' : 'st-elr__bad'}>{result.error ? t('sat.el.loadError') : result.correct ? t('sat.el.retryOk') : t('sat.el.retryBad')}</p>}
              </div>
            )}
          </>
        )}

        <div className="st-elr__acts">
          {!retry && <button type="button" className="ih-cta st-elr__main" disabled={!data} onClick={startRetry}><ReplayIcon size={20} />{t('sat.el.retry')}</button>}
          {retry && !result && (
            <button type="button" className="ih-cta st-elr__main" disabled={busy || (mcq ? !pick_ : !spr.trim())} onClick={() => check(mcq ? pick_ : spr.trim())}>
              {t('sat.el.check')}
            </button>
          )}
          {retry && result && <button type="button" className="ih-cta st-elr__main" onClick={() => setRetry(false)}>{t('sat.el.showReview')}</button>}
          <div className="st-elr__row">
            <button type="button" className="ih-btn ih-btn--outline" onClick={() => onPractice?.([item.skillId])}>{t('sat.el.train')}</button>
            {retry && !result
              ? <button type="button" className="st-link" onClick={() => setRetry(false)}>{t('sat.el.showReview')}</button>
              : (
                <button type="button" className="st-link st-elr__mark" disabled={busy || !data} onClick={markReviewed}>
                  <OkCircleIcon size={18} />{item.reviewed ? t('sat.el.unmark') : t('sat.el.markReviewed')}
                </button>
              )}
          </div>
        </div>
      </aside>
    </div>
  )
}
