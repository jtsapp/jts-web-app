import { useI18n } from '../../i18n.jsx'
import { practiceExercises } from './homeworkExercises.js'

/**
 * Задания из раздела «Практика», выданные преподавателем.
 *
 * Отдельным списком, а не среди заданий с урока: у них нет снимка вопроса —
 * материал живёт в самом кабинете, и домашняя работа несёт только адрес юнита.
 * Поэтому здесь не поле для ответа, а переход в раздел: решает ученик там же,
 * где и обычно, и прогресс считает та же «Практика».
 */
export default function HomeworkPracticeList({ hw, onOpen }) {
  const { t } = useI18n()
  const items = practiceExercises(hw)
  if (!items.length) return null

  return (
    <section className="hw-practice">
      <h3 className="hw-practice__title">{t('homework.practice.title')}</h3>
      <p className="hw-practice__hint">{t('homework.practice.hint')}</p>

      <ul className="hw-practice__list">
        {items.map((item) => (
          <li className="hw-practice__row" key={item.id}>
            <div className="hw-practice__main">
              <span className="hw-practice__name">{item.title || t('homework.practice.unit')}</span>
              <span className="hw-practice__meta">
                {[item.instruction, String(item.practiceLevel || '').toUpperCase()]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className="hw-practice__open"
              onClick={() => onOpen?.({ level: item.practiceLevel, unitId: item.practiceUnitId })}
            >
              {t('homework.practice.open')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
