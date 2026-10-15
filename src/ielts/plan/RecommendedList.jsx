import { ArrowForwardIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'
import { recommendTask } from './planModel.js'

// «Что сделать дальше», когда задач плана не осталось (или плана ещё нет): mock, полные тесты, эссе, Speaking. Советы
// приходят с бэкенда (`recommended` у /plan и блока программы «Сегодня»), экран пустым не бывает.
export default function RecommendedList({ items, noPlan = false, onStart }) {
  const { t } = useI18n()
  if (!items?.length) return null
  return (
    <section className="ih-rec" aria-labelledby="ih-rec-title">
      <h3 id="ih-rec-title" className="ih-rec__title">{t(noPlan ? 'ieltsPlan.rec.titleNoPlan' : 'ieltsPlan.rec.title')}</h3>
      <ul className="ih-tt__list">
        {items.map((r) => (
          <li key={r.key} className="ih-rec__row">
            <span>
              <b>{t(`ieltsPlan.rec.${r.key}`)}</b>
            </span>
            <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onStart?.(recommendTask(r))}>
              {t('ieltsPlan.rec.start')} <ArrowForwardIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
