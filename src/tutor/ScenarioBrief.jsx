import { useT } from '../i18n/LanguageContext.jsx'
import { briefLines } from './scenarioBrief.js'

// Плашка «Ситуация». Один компонент на два места: гейт перед звонком и
// шпаргалка поверх разговора. Разница только в кнопке снизу, поэтому она
// приходит пропом `action`, а не разводится двумя почти одинаковыми файлами.
export default function ScenarioBrief({ scenarioId, action = null }) {
  const t = useT()
  const lines = briefLines(t, scenarioId)
  // Нет текста — нет и рамки с заголовком: пустая плашка выглядит как поломка.
  if (!lines.length) return null
  return (
    <div className="t-brief" role="note" aria-label={t('scen.briefTitle')}>
      <span className="t-brief__eyebrow">{t('scen.briefTitle')}</span>
      <ul className="t-brief__list">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {action}
    </div>
  )
}
