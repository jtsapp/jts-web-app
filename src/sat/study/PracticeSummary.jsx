import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { TrophyIcon } from '../icons.jsx'
import { skillName, skillSection } from '../names.js'
import { practiceSummary } from '../model/stats.js'
import { shortClock } from '../model/mock.js'

/**
 * Итог набора «Практики» (B2, прототип practice-stats.js resultScreen): кольцо точности, верно, время, на вопрос,
 * темы слабые первыми, освоенные сейчас навыки. Только у наборов из «Практики» (source = practice) — у занятия плана,
 * юнита, недельного теста и пробника свои итоги. Нет в Figma: карточка прототипа.
 */
export default function PracticeSummary({ summary, busy, onAgain, onWeak, onDashboard, onErrors }) {
  const { t, lang } = useI18n()
  const s = practiceSummary(summary)
  if (!s) return null
  const weak = s.skills.filter((x) => x.pct < 80 && x.skillId !== 'rw' && x.skillId !== 'math').slice(0, 3).map((x) => x.skillId)
  return (
    <main className="st-sum st-psum">
      <section className="st-card st-psum__card" id="sat-practice-result">
        <span className="st-head__eyebrow">{t('sat.psum.eyebrow')}</span>
        <h1>{t('sat.psum.title')}</h1>
        <div className="st-psum__hero">
          <div className="st-psum__ring" style={{ '--p': s.pct }} role="img" aria-label={`${s.pct}%`}><b>{s.pct}%</b></div>
          <div className="st-psum__kpis">
            <div><span>{t('sat.psum.correct')}</span><b>{s.correct} / {s.total}</b></div>
            <div><span>{t('sat.psum.time')}</span><b>{shortClock(s.durationSeconds)}</b></div>
            <div><span>{t('sat.psum.perQ')}</span><b>{s.perQ == null ? '—' : shortClock(s.perQ)}</b></div>
          </div>
        </div>
        {s.skills.length > 0 && (
          <div className="st-psum__skills">
            <span className="st-head__eyebrow">{t('sat.psum.bySkill')}</span>
            {s.skills.map((x) => (
              <div key={x.skillId} className={`st-acc__row is-${skillSection(x.skillId) === 'math' ? 'math' : 'rw'}`}>
                <b>{skillName(x.skillId, lang)}</b>
                <span className="st-muted">{x.correct}/{x.total}</span>
                <strong>{x.pct}%</strong>
                <span className="st-rep__bar"><i style={{ width: `${x.pct}%` }} /></span>
              </div>
            ))}
          </div>
        )}
        {s.masteredNow.length > 0 && (
          <p className="st-psum__mastered"><TrophyIcon size={18} />{t('sat.psum.mastered', { skills: s.masteredNow.map((id) => skillName(id, lang)).join(', ') })}</p>
        )}
        <div className="st-psum__acts">
          <button type="button" className="ih-cta" onClick={onAgain}>{t('sat.psum.again')}<ArrowForwardIcon size={18} /></button>
          {weak.length > 0 && <button type="button" className="ih-btn ih-btn--outline" disabled={busy} onClick={() => onWeak(weak)}>{t('sat.psum.weak')}</button>}
          {onErrors && <button type="button" className="ih-btn ih-btn--outline" onClick={onErrors}>{t('sat.psum.errors')}</button>}
          <button type="button" className="ih-btn ih-btn--outline" onClick={onDashboard}>{t('sat.psum.dashboard')}</button>
        </div>
      </section>
    </main>
  )
}
