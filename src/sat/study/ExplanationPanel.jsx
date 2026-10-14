import { useI18n } from '../../i18n.jsx'
import { CheckCircleIcon, CloseIcon, InfoIcon } from '../../ielts/icons.jsx'
import { ReplayIcon } from '../icons.jsx'
import { KEYS } from '../question/session.js'
import { pick } from '../model/profile.js'
import AiTutorPanel from '../ai/AiTutorPanel.jsx'

/** Решение по шагам: у Math разбор банка — абзац алгебры, по предложениям он читается как 1, 2, 3 (steps прототипа). */
function steps(html) {
  // без lookbehind `(?<=…)`: его не разбирает Safari до 16.4 (src/lib/safariSyntax.test.js)
  const parts = String(html || '').replace(/([.!?])\s+(?=[A-Z(А-Я])/g, '$1\u0000').split('\u0000')
  return parts.length > 1 ? parts : null
}

/**
 * Боковая панель учебного режима (Figma SAT 24–25): «Объяснение» и «AI-тьютор». Объяснение — из банка на языке
 * разборов ученика: верный ответ, почему он верный, почему неверны остальные (свой выбор помечен), другие способы
 * решения. До ответа объяснение закрыто воротами: открыть — значит увидеть ответ, и попытка станет «с объяснением».
 * Внизу — «Решить похожую без подсказки»: засчитывается только она.
 */
export default function ExplanationPanel({ tab, onTab, onClose, doc, data, chosen, checked, correct, gated, busy, explainLang, onReveal, onSimilar, canSimilar }) {
  const { t } = useI18n()
  const lang = explainLang || 'ru'
  const isMcq = doc?.type === 'mcq'
  const answer = data ? (Array.isArray(data.answer) ? data.answer.join(' · ') : data.answer) : null
  const text = data ? pick(data.explanation, lang) : ''
  const st = doc?.section === 'math' ? steps(text) : null

  return (
    <div className="st-xp">
      <div className="st-xp__top">
        <div className="ih-seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'explain'} className={tab === 'explain' ? 'is-on' : ''} onClick={() => onTab('explain')}>{t('sat.study.explanation')}</button>
          <button type="button" role="tab" aria-selected={tab === 'ai'} className={tab === 'ai' ? 'is-on' : ''} onClick={() => onTab('ai')}>{t('sat.ai.name')}</button>
        </div>
        <span className="st-spacer" />
        <button type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}><CloseIcon size={18} /></button>
      </div>

      {tab === 'ai' ? <AiTutorPanel /> : !data ? (
        // Нет в Figma: ворота объяснения до ответа — макет 24 показывает панель только после проверки
        <div className="st-xp__gate">
          <p><InfoIcon size={18} />{t(gated ? 'sat.study.gate' : 'sat.study.loading')}</p>
          {gated && <button type="button" className="ih-cta st-xp__reveal" disabled={busy} onClick={onReveal}>{t('sat.study.reveal')}</button>}
        </div>
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

      {tab === 'explain' && checked && canSimilar && (
        <div className="st-xp__similar">
          <button type="button" className="ih-cta" disabled={busy} onClick={onSimilar}><ReplayIcon size={18} />{t('sat.study.similarNoHelp')}</button>
          <small>{t(correct ? 'sat.study.similarNoteHelped' : 'sat.study.similarNote')}</small>
        </div>
      )}
    </div>
  )
}
