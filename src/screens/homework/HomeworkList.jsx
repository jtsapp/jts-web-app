import { useI18n } from '../../i18n.jsx'
import { homeworkStateKey } from './homeworkFormat.js'
import { isWholeLesson } from './materialAssignments.js'

/** История домашних работ: новые сверху, как их отдаёт бэкенд. */
export default function HomeworkList({ items, selectedId, onSelect }) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'

  if (!items.length) return <p className="hw__hint">{t('homework.empty')}</p>

  return (
    <ul className="hw-list">
      {items.map((hw) => {
        const stateKey = homeworkStateKey(hw)
        const due = hw.dueDate
          ? new Date(hw.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
          : null
        return (
          <li key={hw.id}>
            <button
              type="button"
              className={`hw-card ${hw.id === selectedId ? 'hw-card--sel' : ''}`}
              aria-pressed={hw.id === selectedId}
              onClick={() => onSelect(hw.id)}
            >
              <span className="hw-card__title">{hw.title}</span>
              <span className="hw-card__meta">
                <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
                {/* Задание с живого урока (назначенный материал) помечается отдельно:
                    у него другой сценарий — решать в самом материале, без файлов ответа.
                    Урок, заданный целиком, называется собой: «Задание с урока» про
                    урок на 54 вопроса не сообщает ученику ничего. */}
                {hw.kind === 'material' && (
                  <span className="hw-card__lesson">
                    {t(isWholeLesson(hw.assignment) ? 'homework.wholeLesson' : 'homework.lessonTask')}
                  </span>
                )}
                {due && <span className="hw-card__due">{t('homework.dueShort', { date: due })}</span>}
                {/* Процент автопроверки — то, ради чего ученик возвращается в
                    сданную работу до того, как преподаватель поставит балл. */}
                {hw.autoPercent != null && (
                  <span className="hw-card__percent">{t('homework.autoPercent', { percent: String(hw.autoPercent) })}</span>
                )}
                {hw.grade != null && <span className="hw-card__grade">{hw.grade}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
