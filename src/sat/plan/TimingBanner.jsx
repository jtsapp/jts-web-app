import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural, pluralForm } from '../../lib/plural.js'
import { BoltIcon, CloseIcon, EventIcon, ExpandMoreIcon, InfoIcon } from '../../ielts/icons.jsx'
import { ForumIcon, TuneIcon } from '../icons.jsx'
import examDates from '../data/examDates.json'
import { fmtDate } from '../model/dates.js'
import { parse } from '../model/plan.js'
import { readTimingSeen, timingMode, timingSeenKey, writeTimingSeen } from '../today/timing.js'

/** Ближайшая официальная дата SAT, к которой программа успевает (третье решение из ТЗ — «перенести экзамен»). */
export function nearestFitDate(earliestIso, dates = examDates.dates) {
  if (!earliestIso) return null
  return dates.filter((d) => d.testDate >= earliestIso).sort((a, b) => (a.testDate < b.testDate ? -1 : 1))[0]?.testDate || null
}

/**
 * Хватает ли времени до экзамена (ТЗ 21.10, задача 4; Figma «NEW 2», 17:5933). Считает сервер (timing в
 * /mobile/sat/roadmap). Тон — «чтобы успеть, нужно вот что», без красного. «Впритык» — мягкая плашка с «Подробнее»
 * (onPlan). «Не хватает» — в первый раз карточка с тремя решениями и «Связаться с менеджером»: решения принимает
 * менеджер, поэтому кнопок «перестроить план» нет. На повторном заходе (отметка на устройстве) и после × — одна
 * строка, которая не пропадает, пока ситуация не решена. Времени хватает или даты нет — баннера нет.
 */
export default function TimingBanner({ timing, onManager, onPlan }) {
  const { t, lang } = useI18n()
  const key = timingSeenKey(timing)
  const [seen] = useState(() => readTimingSeen(key))
  // null — вид по умолчанию для режима; true / false — ученик раскрыл или свернул сам
  const [expanded, setExpanded] = useState(null)
  const mode = timingMode(timing, seen)

  // полностью показан — со следующего захода только строка
  useEffect(() => {
    if (mode === 'full') writeTimingSeen(key)
  }, [mode, key])

  if (mode === 'none') return null
  const left = String(timing.weeksLeft)
  const need = String(timing.weeksNeeded)

  if (mode === 'tight') {
    return (
      <div className="st-timing is-tight" role="status">
        <InfoIcon size={22} />
        <p>{t(`sat.timing.tightLine.${pluralForm(timing.weeksLeft, lang)}`, { left, need })}</p>
        {onPlan && <button type="button" className="st-timing__more" onClick={onPlan}>{t('sat.timing.more')}</button>}
      </div>
    )
  }

  const cut = plural(t, lang, 'sat.timing.cutN', timing.lessonsCut)
  const full = mode === 'full' ? expanded !== false : expanded === true
  if (!full) {
    return (
      <div className="st-timing is-line" role="status">
        <EventIcon size={22} />
        <p>{t(`sat.timing.line.${pluralForm(timing.weeksLeft, lang)}`, { left, need, cut })}</p>
        <button type="button" className="st-timing__what" aria-expanded="false" onClick={() => setExpanded(true)}>
          {t('sat.timing.what')}<ExpandMoreIcon size={16} />
        </button>
      </div>
    )
  }

  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const nearest = nearestFitDate(timing.earliestExam)
  const options = [
    { key: 'pace', icon: <BoltIcon size={18} />, sub: t('sat.timing.paceSub') },
    { key: 'cut', icon: <TuneIcon size={18} />, sub: t('sat.timing.cutSub') },
    // ближайшая дата, к которой программа успевает, — подсказка к решению, а не само решение: выбирает менеджер
    { key: 'move', icon: <EventIcon size={18} />, sub: nearest ? t('sat.timing.moveSubTo', { date: fmtDate(loc, parse(nearest), { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('sat.timing.moveSub') },
  ]
  return (
    <section className="st-timing is-short" role="status">
      <div className="st-timing__top">
        <span className="st-timing__icon"><EventIcon size={22} /></span>
        <div>
          <h3>{t(`sat.timing.title.${pluralForm(timing.weeksNeeded, lang)}`, { left, need })}</h3>
          <p>{t('sat.timing.sub', { cut })}</p>
        </div>
        <button type="button" className="st-timing__close" aria-label={t('sat.timing.collapse')} onClick={() => setExpanded(false)}><CloseIcon size={18} /></button>
      </div>
      <ul className="st-timing__opts">
        {options.map((o) => (
          <li key={o.key}>
            <span>{o.icon}</span>
            <div><b>{t(`sat.timing.${o.key}`)}</b><small>{o.sub}</small></div>
          </li>
        ))}
      </ul>
      {onManager && (
        <div className="st-timing__foot">
          {/* контакта менеджера на сервере пока нет — кнопка ведёт на тарифы SAT, где «уточнит менеджер» */}
          <button type="button" className="st-timing__manager" onClick={onManager}><ForumIcon size={20} />{t('sat.timing.manager')}</button>
          <small>{t('sat.timing.managerSub')}</small>
        </div>
      )}
    </section>
  )
}
