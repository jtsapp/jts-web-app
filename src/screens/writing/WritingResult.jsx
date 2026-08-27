import { useI18n } from '../../i18n.jsx'

// ЗАГЛУШКА (заменяется в волне 2 реализации): экран разбора проверенного текста.
// Контракт: { assessment, text, genre|null, onBackToPad(), onBackToTrainer() }
export default function WritingResult({ onBackToPad }) {
  const { t } = useI18n()
  return (
    <div className="wr-card">
      <h2 className="wr-sec-title">{t('writing.result.crumb')}</h2>
      <button type="button" className="wr-ghost" onClick={onBackToPad}>
        ← {t('writing.back')}
      </button>
    </div>
  )
}
