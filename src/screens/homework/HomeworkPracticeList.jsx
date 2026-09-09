import { useI18n } from '../../i18n.jsx'
import { practiceExercises } from './homeworkExercises.js'
import { practiceNavTarget } from '../../lib/practiceTarget.js'

/**
 * Задания из раздела «Практика», выданные преподавателем.
 *
 * Отдельным списком, а не среди заданий с урока: у них нет снимка вопроса —
 * материал живёт в самом кабинете, и домашняя работа несёт только адрес юнита.
 * Поэтому здесь не поле для ответа, а переход в раздел: решает ученик там же,
 * где и обычно, и прогресс считает та же «Практика».
 *
 * Разделов семь, и живут они на разных экранах: грамматика — в «Практике»,
 * текст — в «Чтении», урок шэдоуинга — на своём экране. Куда вести, решает
 * practiceNavTarget; если он говорит «некуда» (раздела нет, урок не найден,
 * уровня в разделе не существует), кнопки не будет вовсе — открыть чужое
 * задание хуже, чем не открыть никакого.
 */
export default function HomeworkPracticeList({ hw, onOpen }) {
  const { t } = useI18n()
  const items = practiceExercises(hw)
  if (!items.length) return null

  const areaLabel = (area) => {
    const label = t(`homework.practice.area.${area}`)
    // Незнакомый раздел (каталог уехал вперёд кабинета) не должен показывать
    // ключ перевода — тогда в подписи просто не будет раздела.
    return label.startsWith('homework.practice.area.') ? '' : label
  }

  return (
    <section className="hw-practice">
      <h3 className="hw-practice__title">{t('homework.practice.title')}</h3>
      <p className="hw-practice__hint">{t('homework.practice.hint')}</p>

      <ul className="hw-practice__list">
        {items.map((item) => {
          const target = practiceNavTarget(item)
          return (
            <li className="hw-practice__row" key={item.id}>
              <div className="hw-practice__main">
                <span className="hw-practice__name">{item.title || t('homework.practice.unit')}</span>
                <span className="hw-practice__meta">
                  {[
                    areaLabel(item.practiceArea),
                    item.instruction,
                    // Служебный уровень шэдоуинга не показываем: уровней у
                    // раздела нет, и «ALL» читалось бы как настоящий.
                    String(item.practiceLevel || '').toLowerCase() === 'all'
                      ? '' : String(item.practiceLevel || '').toUpperCase(),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {target ? (
                <button
                  type="button"
                  className="hw-practice__open"
                  onClick={() => onOpen?.(target)}
                >
                  {t('homework.practice.open')}
                </button>
              ) : (
                <span className="hw-practice__gone">{t('homework.practice.unreachable')}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
