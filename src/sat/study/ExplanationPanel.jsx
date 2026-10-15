import { useI18n } from '../../i18n.jsx'
import { CheckCircleIcon, CloseIcon } from '../../ielts/icons.jsx'
import { KEYS } from '../question/session.js'
import { pick } from '../model/profile.js'

/** Решение по шагам: у Math разбор банка — абзац алгебры, по предложениям он читается как 1, 2, 3 (steps прототипа). */
function steps(html) {
  // без lookbehind `(?<=…)`: его не разбирает Safari до 16.4 (src/lib/safariSyntax.test.js)
  const parts = String(html || '').replace(/([.!?])\s+(?=[A-Z(А-Я])/g, '$1\u0000').split('\u0000')
  return parts.length > 1 ? parts : null
}

/**
 * Боковая панель учебного режима (Figma SAT 21): только «Объяснение», после проверки ответа. Из банка на языке разборов
 * ученика: верный ответ, почему он верный, почему неверны остальные (свой выбор помечен), другие способы решения.
 * Объяснения фиксированные — чата с AI здесь нет (решение по макету, 15.10.2026).
 */
export default function ExplanationPanel({ onClose, doc, data, chosen, explainLang }) {
  const { t } = useI18n()
  const lang = explainLang || 'ru'
  const isMcq = doc?.type === 'mcq'
  const answer = data ? (Array.isArray(data.answer) ? data.answer.join(' · ') : data.answer) : null
  const text = data ? pick(data.explanation, lang) : ''
  const st = doc?.section === 'math' ? steps(text) : null

  return (
    <div className="st-xp">
      <div className="st-xp__top">
        <h2 className="st-xp__title">{t('sat.study.explanation')}</h2>
        <span className="st-spacer" />
        <button type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}><CloseIcon size={18} /></button>
      </div>

      {!data ? (
        <p className="st-muted st-xp__loading">{t('sat.study.loading')}</p>
      ) : (
        <div className="st-xp__body">
          <p className="st-xp__answer"><CheckCircleIcon size={20} />{t('sat.study.rightAnswer', { a: String(answer) })}</p>
          {st ? <ol className="st-xp__steps">{st.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</ol>
            : <div className="st-xp__text" dangerouslySetInnerHTML={{ __html: text }} />}
          {isMcq && data.distractors && (
            <>
              <h3>{t('sat.study.whyWrong')}</h3>
              <ul className="st-xp__others">
                {KEYS.slice(0, (doc.options || []).length).filter((k) => k !== data.answer).map((k) => {
                  const mine = chosen === k
                  const reason = pick(data.distractors[k], lang)
                  return (
                    <li key={k} className={mine ? 'is-mine' : ''}>
                      <span className="st-xp__key">{k}</span>
                      <div>
                        {mine && <b className="st-xp__tag">{t('sat.study.yourAnswer')}</b>}
                        {reason ? <span dangerouslySetInnerHTML={{ __html: reason }} /> : <span dangerouslySetInnerHTML={{ __html: doc.options[KEYS.indexOf(k)] }} />}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {Array.isArray(data.methods) && data.methods.length > 0 && (
            <>
              <h3>{t(data.methods.length > 1 ? 'sat.study.methods' : 'sat.study.method')}</h3>
              {data.methods.map((m, i) => (
                <div key={i} className="st-xp__method">
                  {m.title && <b>{pick(m.title, lang)}</b>}
                  <div dangerouslySetInnerHTML={{ __html: pick(m.steps, lang) }} />
                </div>
              ))}
            </>
          )}
        </div>
      )}

    </div>
  )
}
