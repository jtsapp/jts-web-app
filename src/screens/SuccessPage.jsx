import { useEffect } from 'react'
import Shell from '../components/Shell.jsx'
import Multiline from '../components/Multiline.jsx'
import { useI18n } from '../i18n.jsx'

export default function SuccessPage({ onDone }) {
  const { t } = useI18n()
  // Короткая пауза и переход к предложению пройти тест уровня
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <Shell>
      <div className="form-inner">
      <div className="form-card success-center">
        <div className="success-badge success-badge--sm" aria-hidden="true">
          {/* Галочка — контур check-fill из кадра 1434:6694 */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M10.0007 15.1709L19.1931 5.97852L20.6073 7.39273L10.0007 17.9993L3.63672 11.6354L5.05094 10.2212L10.0007 15.1709Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2 className="form-title">
          <Multiline text={t('success.title')} />
        </h2>
      </div>
      </div>
    </Shell>
  )
}
