import { useI18n } from '../../i18n.jsx'
import { InfoIcon } from '../../ielts/icons.jsx'
import examDates from '../data/examDates.json'
import { fmtDate } from '../model/dates.js'
import { parse } from '../model/plan.js'

/** Ближайшая официальная дата SAT, к которой программа успевает (третье решение из ТЗ — «перенести экзамен»). */
export function nearestFitDate(earliestIso, dates = examDates.dates) {
  if (!earliestIso) return null
  return dates.filter((d) => d.testDate >= earliestIso).sort((a, b) => (a.testDate < b.testDate ? -1 : 1))[0]?.testDate || null
}

/**
 * Хватает ли времени до экзамена (ТЗ 21.10, задача 4). Считает сервер (timing в /mobile/sat/roadmap). Тон —
 * «чтобы успеть, нужно вот что», а не «вы не успеете»; решения принимает менеджер, поэтому кнопок «перестроить план»
 * нет — только «Связаться с менеджером». Времени хватает или даты нет — баннера нет.
 */
export default function TimingBanner({ timing, onManager }) {
  const { t, lang } = useI18n()
  if (!timing || (timing.status !== 'tight' && timing.status !== 'short')) return null
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const nearest = nearestFitDate(timing.earliestExam)
  const short = timing.status === 'short'

  return (
    <div className={`st-timing ${short ? 'is-short' : 'is-tight'}`} role="status">
      <InfoIcon size={20} />
      <div>
        <b>{short
          ? t('sat.timing.short', { left: String(timing.weeksLeft), need: String(timing.weeksNeeded), cut: String(timing.lessonsCut) })
          : t('sat.timing.tight', { left: String(timing.weeksLeft), need: String(timing.weeksNeeded) })}</b>
        {short && (
          <ul>
            <li>{t('sat.timing.pace')}</li>
            <li>{t('sat.timing.cut')}</li>
            <li>{nearest
              ? t('sat.timing.moveTo', { date: fmtDate(loc, parse(nearest), { day: 'numeric', month: 'long', year: 'numeric' }) })
              : t('sat.timing.move')}</li>
          </ul>
        )}
      </div>
      {short && onManager && <button type="button" className="ih-btn ih-btn--outline" onClick={onManager}>{t('sat.timing.manager')}</button>}
    </div>
  )
}
