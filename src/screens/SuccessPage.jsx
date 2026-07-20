import { useEffect, useState } from 'react'
import Shell from '../components/Shell.jsx'
import Multiline from '../components/Multiline.jsx'
import LangSheet from '../components/LangSheet.jsx'
import { useI18n } from '../i18n.jsx'

export default function SuccessPage({ onDone }) {
  const { t } = useI18n()
  const [sheet, setSheet] = useState(false)
  // На мобиле показываем bottom-sheet выбора языка (Figma 9) и переходим по
  // выбору. На десктопе поведение прежнее — короткая пауза и авто-переход.
  // matchMedia читаем в effect (только клиент) — гидратация не ломается.
  useEffect(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 560px)').matches
    if (isMobile) {
      const s = setTimeout(() => setSheet(true), 900)
      return () => clearTimeout(s)
    }
    const d = setTimeout(() => onDone?.(), 1800)
    return () => clearTimeout(d)
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
      {sheet && <LangSheet onPick={() => onDone?.()} />}
    </Shell>
  )
}
