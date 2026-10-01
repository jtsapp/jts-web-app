import Chip from './ui/Chip.jsx'
import { BoltIcon, StarIcon } from './icons.jsx'
import { groupNumber, xpLevel } from './model/dashboard.js'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'

// Шапка раздела: «IELTS» и справа серия дней и XP. Пока счётчика нет (null —
// бэкенд не ответил), чип не рисуется вовсе: «0 XP» читалось бы как «ничего не
// сделал», а это неправда. Серия 0 — правда («сегодня и вчера занятий не было»),
// её показываем, как прототип: это повод начать.
export default function IeltsHeader({ streakDays, streakBest, xp, level }) {
  const { t, lang } = useI18n()
  return (
    <header className="ih-header">
      <h1 className="ih-header__title">IELTS</h1>
      <div className="ih-header__stats">
        {streakDays != null && (
          <span title={streakBest != null ? t('ieltsHub.streakBest', { n: String(streakBest) }) : undefined}>
            <Chip tone="orange" icon={<BoltIcon size={18} />}>
              {plural(t, lang, 'ieltsHub.streak', streakDays)}
            </Chip>
          </span>
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
