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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
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
