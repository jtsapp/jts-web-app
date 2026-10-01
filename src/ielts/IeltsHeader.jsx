import Chip from './ui/Chip.jsx'
import { BoltIcon, StarIcon } from './icons.jsx'
import { groupNumber, xpLevel } from './model/dashboard.js'
import { useI18n } from '../i18n.jsx'

// Шапка раздела: «IELTS» и справа серия дней и XP. Пока счётчика нет (null —
// XP бэкенд ещё не считает), чип не рисуется вовсе: «0 XP» читалось бы как
// «ничего не сделал», а это неправда.
export default function IeltsHeader({ streakDays, xp, level }) {
  const { t } = useI18n()
  return (
    <header className="ih-header">
      <h1 className="ih-header__title">IELTS</h1>
      <div className="ih-header__stats">
        {streakDays > 0 && (
          <Chip tone="orange" icon={<BoltIcon size={18} />}>
            {t('ieltsHub.streak', { n: String(streakDays) })}
          </Chip>
        )}
        {xp != null && (
          <Chip tone="violet" icon={<StarIcon size={18} />}>
            {t('ieltsHub.xp', { xp: groupNumber(xp), level: String(xpLevel(xp, level)) })}
          </Chip>
        )}
      </div>
    </header>
  )
}
