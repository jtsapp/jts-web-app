import { useI18n } from '../../i18n.jsx'
import { CheckCircleIcon, InfoIcon, TimerIcon } from '../icons.jsx'
import { CRITERIA, countWords } from '../writing/writing.js'
import { markQuotes } from '../writing/WritingWorkView.jsx'
import { SPEAKING_CRITERIA, formatSec } from '../speaking/speaking.js'

// Разбор ИИ по Writing и Speaking диагностики — те же блоки, что у работы банка (WritingWorkView, SpeakingWorkView):
// критерии с «почему такой балл» и «что нужно для следующего», ошибки с исправлением, переписанные фразы, текст эссе с
// подсветкой мест ошибок; у Speaking — сильные стороны, что улучшить и стенограммы ответов. Своей попытки у секций
// диагностики нет — всё лежит в result.writing / result.speaking (backend IeltsDiagnosticGrading).

const SP_KEY = { fluencyCoherence: 'fc', lexicalResource: 'lr', grammaticalRange: 'gra', pronunciation: 'p' }

/** Секция ещё не оценена: ждёт ИИ, проверяется, не удалась или пропущена. */
function Pending({ sec, grading, t }) {
  const st = grading === 'run' ? 'grading' : sec?.status
  return (
    <section className={`ih-wstatus${st === 'failed' || grading === 'err' ? ' is-bad' : ''}`} role="status">
      <span className="ih-wstatus__icon"><TimerIcon size={22} /></span>
      <div>
        <b>{st === 'skipped' ? t('ieltsOb.p.diag.result.skipped') : st === 'grading' ? t('ieltsWriting.gradingTitle') : st === 'failed' || grading === 'err' ? t('ieltsOb.gradeFailed') : t('ieltsOb.waitsAiShort')}</b>
        <p>{st === 'skipped' ? t('ieltsOb.skippedText') : st === 'grading' ? t('ieltsWriting.gradingText') : st === 'failed' || grading === 'err' ? t('ieltsOb.failedText') : t('ieltsOb.pendingText')}</p>
      </div>
    </section>
  )
}

export function DiagWritingReview({ sec, text, question, grading }) {
  const { t } = useI18n()
  if (sec?.status !== 'done') return <Pending sec={sec} grading={grading} t={t} />
  const det = sec.details || null
  const paras = String(text || '').split(/\n\s*\n+/).filter((p) => p.trim())
  return (
    <div className="ih-dai">
      <section className="ih-card ih-wscore">
        <div className="ih-wscore__band">
          <span>{t('ieltsWriting.band')}</span>
          <b>{Number(sec.band).toFixed(1)}</b>
        </div>
        <div className="ih-wscore__crit">
          {CRITERIA.map((c) => (
            <div key={c}>
              <b>{sec.criteria?.[c] != null ? Number(sec.criteria[c]).toFixed(1) : '—'}</b>
              <span>{t(`ieltsWriting.crit.${c}`)}</span>
            </div>
          ))}
        </div>
        {sec.feedback && <p className="ih-wscore__fb">{sec.feedback}</p>}
      </section>

      {det?.criteriaNotes?.length > 0 && (
        <section className="ih-card ih-wdet">
          <h3>{t('ieltsWriting.d.title')}</h3>
          <div className="ih-wdet__crits">
            {det.criteriaNotes.map((c) => (
              <article key={c.criterion} className="ih-wdet__crit">
                <header>
                  <b>{t(`ieltsWriting.crit.${c.criterion}`)}</b>
                  <span className="ih-wdet__band">{sec.criteria?.[c.criterion] != null ? Number(sec.criteria[c.criterion]).toFixed(1) : '—'}</span>
                </header>
                <p><small>{t('ieltsWriting.d.why')}</small>{c.why}</p>
                {c.nextBand && <p className="ih-wdet__next"><small>{t('ieltsWriting.d.next')}</small>{c.nextBand}</p>}
              </article>
            ))}
          </div>
          {(det.strengths?.length > 0 || det.nextSteps?.length > 0) && (
            <div className="ih-wdet__two">
              {det.strengths?.length > 0 && (
                <div className="ih-wdet__list is-good">
                  <h4>{t('ieltsWriting.d.strengths')}</h4>
                  <ul>{det.strengths.map((s, i) => <li key={i}><CheckCircleIcon size={16} />{s}</li>)}</ul>
                </div>
              )}
              {det.nextSteps?.length > 0 && (
                <div className="ih-wdet__list is-next">
                  <h4>{t('ieltsWriting.d.steps')}</h4>
                  <ol>{det.nextSteps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {(sec.errors?.length > 0 || sec.rewrites?.length > 0) && (
        <section className="ih-card ih-wfix">
          <h3>{t('ieltsWriting.errorsTitle')} <span className="ih-muted">· {sec.errors?.length || 0}</span></h3>
          {(sec.errors || []).map((e, i) => (
            <div key={i} className="ih-wfix__row">
              <span className="ih-chip ih-chip--muted ih-chip--sm"><span>{t(`ieltsWriting.critShort.${e.criterion}`)}</span></span>
              <p lang="en"><s>{e.quote}</s> → <b>{e.correction}</b></p>
              <p className="ih-muted">{e.issue}</p>
            </div>
          ))}
          {(sec.rewrites || []).length > 0 && <h3>{t('ieltsWriting.rewritesTitle')}</h3>}
          {(sec.rewrites || []).map((w, i) => (
            <div key={`w${i}`} className="ih-wfix__row" lang="en">
              <p className="ih-muted">{w.original}</p>
              <p><b>{w.improved}</b></p>
            </div>
          ))}
        </section>
      )}

      {paras.length > 0 && (
        <section className="ih-card ih-wmine">
          <header>
            <h3>{t('ieltsWriting.yourText')}</h3>
            <span className="ih-muted">{t('ieltsWriting.wordsN', { n: String(sec.words ?? countWords(text)) })}</span>
          </header>
          {question && <p className="ih-dai__q" lang="en">{question}</p>}
          {paras.map((p, i) => {
            const note = det?.paragraphs?.find((x) => x.index === i + 1)
            return (
              <div key={i} className="ih-wmine__para">
                {/* места замечаний подсвечены прямо в тексте — видно, где именно ошибка */}
                <p lang="en">{markQuotes(p, sec.errors)}</p>
                {note?.comment && <p className="ih-wmine__note"><InfoIcon size={14} />{note.comment}</p>}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

export function DiagSpeakingReview({ sec, questions, grading }) {
  const { t } = useI18n()
  if (sec?.status !== 'done') return <Pending sec={sec} grading={grading} t={t} />
  const byId = Object.fromEntries((sec.items || []).map((x) => [x.itemId, x]))
  const asked = (questions || []).filter((q) => byId[q.id])
  return (
    <div className="ih-dai">
      <section className="ih-card ih-wscore">
        <div className="ih-wscore__band">
          <span>{t('ieltsWriting.band')}</span>
          <b>{Number(sec.band).toFixed(1)}</b>
        </div>
        <div className="ih-wscore__crit">
          {SPEAKING_CRITERIA.map((c) => (
            <div key={c}>
              <b>{sec.criteria?.[c] != null ? Number(sec.criteria[c]).toFixed(1) : '—'}</b>
              <span>{t(`ieltsSpeaking.p.crit.${SP_KEY[c]}`)}</span>
            </div>
          ))}
        </div>
        {sec.criteria?.pronunciation == null && <p className="ih-wscore__fb ih-muted"><InfoIcon size={14} /> {t('ieltsSpeaking.noPron')}</p>}
        {sec.feedback && <p className="ih-wscore__fb">{sec.feedback}</p>}
      </section>

      {(sec.strengths?.length > 0 || sec.improvements?.length > 0) && (
        <div className="ih-wwork__grid">
          <section className="ih-card ih-slist is-good">
            <h3>{t('ieltsSpeaking.strengths')}</h3>
            <ul>{(sec.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
          <section className="ih-card ih-slist">
            <h3>{t('ieltsSpeaking.improvements')}</h3>
            <ul>{(sec.improvements || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
        </div>
      )}

      {asked.length > 0 && (
        <section className="ih-card ih-sanswers">
          <header><h3>{t('ieltsSpeaking.yourAnswers')}</h3></header>
          {asked.map((q) => {
            const a = byId[q.id]
            return (
              <div key={q.id} className="ih-sanswer">
                <b lang="en">{q.text}</b>
                <div className="ih-wmine__chips">
                  <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{formatSec(a.durationSec)}</span></span>
                  {a.wpm != null && <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{t('ieltsSpeaking.wpm', { n: String(a.wpm) })}</span></span>}
                </div>
                <p lang="en" className="ih-sanswer__text">{a.transcript || t('ieltsSpeaking.noSpeech')}</p>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
