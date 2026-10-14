import { useI18n } from '../../i18n.jsx'
import { plural, pluralForm } from '../../lib/plural.js'
import { ArrowForwardIcon, CheckCircleIcon } from '../../ielts/icons.jsx'
import { BulbIcon, ReplayIcon } from '../icons.jsx'
import { parse } from '../model/plan.js'
import { skillName } from '../names.js'
import { fmtDate } from '../model/dates.js'

const R = 38
const C = 2 * Math.PI * R

function Ring({ correct, total, tone }) {
  const share = total ? correct / total : 0
  return (
    <span className="st-sum__ring">
      <svg viewBox="0 0 90 90" aria-hidden="true">
        <circle cx="45" cy="45" r={R} fill="none" stroke="#ededf2" strokeWidth="9" />
        {/* ноль — без дуги: круглый конец нулевой дуги рисовал точку */}
        {share > 0 && (
          <circle cx="45" cy="45" r={R} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${C * share} ${C}`} transform="rotate(-90 45 45)" />
        )}
      </svg>
      <b>{correct}/{total}</b>
    </span>
  )
}

/** Метка плитки вопроса (Figma 28): тип ошибки, иначе помощь; верно без помощи — без подписи. */
function tileLabel(it, t) {
  if (it.correct == null) return t('sat.sum.skippedQ')
  if (!it.correct && it.errorType) return t(`sat.etype.short.${it.errorType}`)
  if (it.help && it.help !== 'none') return t(`sat.sum.help.${it.help}`)
  return ''
}

/**
 * «Занятие выполнено» (Figma SAT 28): самостоятельные ответы отдельно от взятых с помощью (только первые идут в
 * mastery), навык занятия — статус до и после, плитки вопросов с типом ошибки или помощи, когда вернутся ошибки,
 * следующее занятие плана.
 */
export default function StudySummary({ summary, skillIds, onPlan, planLabel, onErrors }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (iso, o) => fmtDate(loc, parse(iso.slice(0, 10)), o)
  const time = summary.timeSec || 0
  const names = skillIds.map((s) => skillName(s, lang)).join(' · ')
  const skill = summary.skills?.[0]
  const next = summary.nextLesson

  return (
    <main className="st-sum">
      <span className="st-sum__icon"><CheckCircleIcon size={28} /></span>
      <h1>{t('sat.sum.title')}</h1>
      <p className="st-sum__sub">
        {names} · {plural(t, lang, 'sat.q', summary.total)} · {time < 60 ? t('sat.sum.timeSec', { s: String(time) }) : t('sat.sum.time', { m: String(Math.floor(time / 60)), s: String(time % 60) })}
      </p>
      <div className="st-sum__cards">
        <div className="st-card st-sum__card">
          <Ring correct={summary.independent.correct} total={summary.independent.total} tone="var(--ih-green)" />
          <div><b>{t('sat.sum.indep')}</b><small>{t('sat.sum.indepSub', { n: String(summary.independent.total) })}</small></div>
        </div>
        <div className="st-card st-sum__card">
          <Ring correct={summary.helped.correct} total={summary.helped.total} tone="#c98512" />
          <div><b>{t('sat.sum.helped')}</b><small>{t('sat.sum.helpedSub')}</small></div>
        </div>
        {skill && (
          <div className="st-card st-sum__skill">
            <small>{t('sat.sum.skill')}</small>
            <b>{skillName(skill.skillId, lang)}</b>
            <span className="st-sum__mastery">
              <span className={`st-mchip is-${skill.before}`}><i />{t(`sat.mastery.${skill.before}`)}</span>
              {skill.after !== skill.before && <><ArrowForwardIcon size={16} /><span className={`st-mchip is-${skill.after}`}><i />{t(`sat.mastery.${skill.after}`)}</span></>}
            </span>
            <small>{skill.after === 'no-data' ? t('sat.sum.needMore', { n: String(Math.max(0, 6 - (skill.independent || 0))) }) : t('sat.sum.masteryRule')}</small>
          </div>
        )}
      </div>
      <div className="st-card st-sum__qs">
        <div className="st-sum__qhead">
          <h2>{t('sat.sum.questions')}</h2>
          {summary.errorsDue > 0 && summary.errorsDueAt && (
            <span className="st-sum__due"><ReplayIcon size={14} />{t(`sat.sum.errorsDue.${pluralForm(summary.errorsDue, lang)}`, { n: String(summary.errorsDue), date: fmt(summary.errorsDueAt, { day: 'numeric', month: 'long' }) })}</span>
          )}
        </div>
        <div className="st-sum__tiles">
          {summary.items.map((it) => {
            const state = it.correct == null ? 'is-empty' : !it.correct ? 'is-wrong' : it.help && it.help !== 'none' ? 'is-help' : 'is-right'
            return (
              <span key={it.questionId} className={`st-sum__tile ${state}`} title={it.similar ? t('sat.sum.similarTile') : undefined}>
                <b>{it.n}{it.similar ? '*' : ''}</b>
                {state === 'is-right' && <CheckCircleIcon size={16} />}
                {state === 'is-help' && <BulbIcon size={16} />}
                {state === 'is-wrong' && <span className="st-sum__x" aria-hidden="true">✕</span>}
                <small>{tileLabel(it, t)}</small>
              </span>
            )
          })}
        </div>
      </div>
      <div className="st-sum__foot">
        {summary.errorsDue > 0 && (
          // разбор ошибок — журнал «Ошибки» (фаза 6); пока ведёт на вкладку
          <button type="button" className="ih-btn ih-btn--outline st-rep__btn" onClick={onErrors}><ReplayIcon size={20} />{t('sat.sum.reviewErrors')}</button>
        )}
        <span className="st-spacer" />
        {next && (
          <span className="st-muted">{t('sat.sum.next', { when: fmt(next.date, { weekday: 'short', day: 'numeric', month: 'short' }), skills: next.skillIds.map((s) => skillName(s, lang)).join(' · ') })}</span>
        )}
        <button type="button" className="ih-cta st-rep__cta" onClick={onPlan}>{planLabel || t('sat.sum.toPlan')}<ArrowForwardIcon size={20} /></button>
      </div>
    </main>
  )
}
