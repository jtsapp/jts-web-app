import { useI18n } from '../../i18n.jsx'

// ЗАГЛУШКА (заменяется в волне 2 реализации): тренажёр из 6 шагов.
// Контракт: { genre, meta, level, step, progressTick, onStep(step),
//             onBackToGenres(), onOpenPad({seedText?, withTimer?}) }
export default function WritingTrainer({ genre, onOpenPad }) {
  const { t } = useI18n()
  return (
    <div className="wr-card">
      <h2 className="wr-sec-title">{genre.title}</h2>
      <p className="wr-sec-sub">{genre.subtitle}</p>
      <button type="button" className="wr-primary" onClick={() => onOpenPad({})}>
        {t('writing.trainer.openPad')}
      </button>
    </div>
  )
}
