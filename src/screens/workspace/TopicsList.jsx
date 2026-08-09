import { useI18n } from '../../i18n.jsx'

// Правая колонка — «Топики урока N/M»: N считается по индексу активного
// топика (+1), не по количеству пройденных — сам топик не несёт статуса
// прогресса в модели данных (см. design-spec §«Модель данных»), только
// подсветку активного в списке.
export default function TopicsList({ topics, activeTopicId }) {
  const { t } = useI18n()
  const list = topics || []
  const activeIndex = list.findIndex((topic) => topic.id === activeTopicId)
  const current = activeIndex >= 0 ? activeIndex + 1 : 0

  return (
    <div className="lw-card lw-topics">
      <div className="lw-topics__head">
        <h2 className="lw-topics__title">{t('lesson.ws.topics')}</h2>
        <span className="lw-topics__count">
          {current}/{list.length}
        </span>
      </div>
      <ul className="lw-topics__list">
        {list.map((topic, i) => {
          const isActive = topic.id === activeTopicId
          return (
            <li key={topic.id} className={`lw-topics__item${isActive ? ' is-active' : ''}`}>
              {/* Номер — часть строки по спеке: он же служит якорем при
                  устном «переходим к третьему». */}
              <span className="lw-topics__num" aria-hidden="true">{i + 1}</span>
              {topic.title}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
