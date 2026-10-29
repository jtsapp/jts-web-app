import { useI18n } from '../../i18n.jsx'
import { buildMonthMatrix, dayKey, dateFromKey, lessonStateKey } from './lessonFormat.js'

const MAX_DOTS = 3
// 2024-01-01 is a Monday — a fixed anchor for Monday-first weekday labels.
const MONDAY_ANCHOR = new Date(2024, 0, 1)

/**
 * `week` — телефонный вид (дизайн приложения, кадр «Онлайн-уроки» 6425:6395):
 * одна неделя выбранного дня вместо месяца, стрелки листают неделями
 * (их подставляет LessonSchedule). Заголовок — месяц выбранного дня: неделя на
 * стыке месяцев иначе подписывалась бы месяцем, которого на ней почти нет.
 */
export default function MonthCalendar({
  year, month, selectedDayKey, occByDay,
  onSelectDay, onPrevMonth, onNextMonth, week = false,
}) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'
  const sel = week ? dateFromKey(selectedDayKey) : null
  const shownYear = sel ? sel.getFullYear() : year
  const shownMonth = sel ? sel.getMonth() : month
  const weeks = sel
    ? buildMonthMatrix(shownYear, shownMonth).filter((row) => row.some(({ date }) => dayKey(date) === selectedDayKey))
    : buildMonthMatrix(shownYear, shownMonth)
  // Месяц и год складываем сами: локаль отдаёт «август 2026 г.», а CSS-овский
  // capitalize делает из хвоста «Г.» — заголовок с бессмысленной буквой.
  const monthName = new Date(shownYear, shownMonth, 1).toLocaleDateString(locale, { month: 'long' })
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${shownYear}`
  const todayKey = dayKey(new Date())
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(MONDAY_ANCHOR.getFullYear(), 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
  )

  return (
    <div className={week ? 'cal cal--week' : 'cal'}>
      <div className="cal__head">
        <div className="cal__title">{monthLabel}</div>
        <div className="cal__navs">
          <button className="cal__nav" type="button" aria-label={t(week ? 'schedule.prevWeek' : 'schedule.prevMonth')} onClick={onPrevMonth}>‹</button>
          <button className="cal__nav" type="button" aria-label={t(week ? 'schedule.nextWeek' : 'schedule.nextMonth')} onClick={onNextMonth}>›</button>
        </div>
      </div>
      <div className="cal__grid cal__grid--head">
        {weekdayNames.map((w, i) => <div key={i} className="cal__wd">{w}</div>)}
      </div>
      <div className="cal__grid">
        {weeks.flat().map(({ date, inMonth }) => {
          const k = dayKey(date)
          const items = occByDay.get(k) || []
          const cls = [
            'cal__day',
            inMonth || week ? '' : 'cal__day--out',
            k === todayKey ? 'cal__day--today' : '',
            k === selectedDayKey ? 'cal__day--sel' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={k}
              type="button"
              className={cls}
              aria-pressed={k === selectedDayKey}
              aria-label={date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              onClick={() => onSelectDay(k)}
            >
              <span className="cal__num">{date.getDate()}</span>
              {items.length > 0 && (
                <span className="cal__dots">
                  {items.slice(0, MAX_DOTS).map((o, i) => (
                    <span key={o.participantId ?? o.lessonId ?? i} className={`cal__dot cal__dot--${lessonStateKey(o)}`} />
                  ))}
                  {items.length > MAX_DOTS && <span className="cal__more">+{items.length - MAX_DOTS}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
