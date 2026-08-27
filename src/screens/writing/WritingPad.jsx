import { useI18n } from '../../i18n.jsx'

// ЗАГЛУШКА (заменяется в волне 2 реализации): Блокнот (Writing Pad).
// Контракт: { genre|null, meta, level|null, seedText|null, withTimer,
//             token, onResult(assessment, text), onBack() }
export default function WritingPad({ genre }) {
  const { t } = useI18n()
  return (
    <div className="wr-card">
      <h2 className="wr-sec-title">{genre ? genre.title : t('writing.pad.free')}</h2>
      <p className="wr-sec-sub">{t('writing.loading')}</p>
    </div>
  )
}
