import BandScoreCard from '../today/BandScoreCard.jsx'
import PillButton from '../ui/PillButton.jsx'
import { useI18n } from '../../i18n.jsx'

// Вкладка «Прогресс». В прототипе (60-progress.html) — кольца, динамика,
// тепловая карта типов и история; пока они не перенесены, здесь текущий балл
// и вход в уже работающий экран истории попыток (?screen=ielts-progress).
export default function ProgressTab({ data, onGo }) {
  const { t } = useI18n()
  return (
    <div className="ih-progress">
      <BandScoreCard overall={data.overall} bands={data.bands} targetBand={data.targetBand} forecast={data.forecast} />
      <div className="ih-progress__more">
        <p>{t('ieltsHub.progress.text')}</p>
        <PillButton variant="primary" onClick={() => onGo?.('ielts-progress')}>
          {t('ieltsHub.progress.open')}
        </PillButton>
      </div>
    </div>
  )
}
