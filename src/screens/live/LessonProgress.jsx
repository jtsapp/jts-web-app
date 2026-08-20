import { useI18n } from '../../i18n.jsx'

/**
 * Полоса прохождения урока: сколько шагов позади из скольких.
 *
 * Считаем по шагам, а не по заданиям: шаг — то, чем урок листается, и именно
 * его номер ученик видит в маршруте. Полоса объявляется ассистивным
 * технологиям числом, иначе прогресс существует только визуально.
 */
export default function LessonProgress({ done = 0, total = 0 }) {
  const { t } = useI18n()
  const safeTotal = Math.max(0, total)
  const safeDone = Math.min(Math.max(0, done), safeTotal)
  const percent = safeTotal ? (safeDone / safeTotal) * 100 : 0

  return (
    <div className="llp">
      <div
        className="llp__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeDone}
        aria-label={t('live.progress', { done: safeDone, total: safeTotal })}
      >
        <span className="llp__bar" style={{ width: `${percent}%` }} />
      </div>
      <span className="llp__count">{t('live.progressShort', { done: safeDone, total: safeTotal })}</span>
    </div>
  )
}
