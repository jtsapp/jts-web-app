import Card from '../ui/Card.jsx'
import Chip from '../ui/Chip.jsx'
import { SECTION_META } from '../sections.jsx'
import { TrendingUpIcon } from '../icons.jsx'
import { SECTIONS, AI_GRADED, bandGap, bandShare, formatBand, overallBand } from '../model/dashboard.js'
import { formatDate } from '../format.js'
import { useI18n } from '../../i18n.jsx'

// Строка секции: точка цвета секции, имя, полоса доли шкалы 0–9 и band.
// Writing/Speaking без балла — чип «оценит ИИ» вместо полосы (§14.3, §15.4).
export function SectionBandRow({ section, band }) {
  const { t } = useI18n()
  const m = SECTION_META[section]
  const pending = band == null
  return (
    <li className="ih-band__row" style={{ '--ih-tone': m.tone }}>
      <span className="ih-band__dot" aria-hidden="true" />
      <span className="ih-band__name">{m.name}</span>
      {pending && AI_GRADED.has(section) ? (
        <Chip tone="muted" size="sm">
          {t('ieltsHub.band.aiPending')}
        </Chip>
      ) : (
        <span className="ih-band__bar" aria-hidden="true">
          <span style={{ width: `${bandShare(band) * 100}%` }} />
        </span>
      )}
      <b className={`ih-band__val ${pending ? 'ih-band__val--none' : ''}`}>{formatBand(band)}</b>
    </li>
  )
}

// «Текущий балл» (ТЗ §11, блок 3): overall, разрыв до цели, четыре секции и
// прогноз. Прогноз всегда с оговоркой «ориентир, а не обещание».
export default function BandScoreCard({ overall, bands, targetBand, forecast }) {
  const { t, lang } = useI18n()
  const total = overallBand(overall, bands)
  const gap = bandGap(total, targetBand)
  let overallNote = t('ieltsHub.band.noOverall')
  if (total != null) overallNote = gap != null ? t('ieltsHub.band.overallGap', { gap: formatBand(gap) }) : 'Overall'
  return (
    <Card
      className="ih-band"
      title={t('ieltsHub.band.title')}
      aside={
        targetBand != null && (
          <Chip tone="violet" size="sm">
            {t('ieltsHub.band.target', { band: formatBand(targetBand) })}
          </Chip>
        )
      }
    >
      <div className="ih-band__overall">
        <b>{formatBand(total)}</b>
        <span>{overallNote}</span>
      </div>
      <ul className="ih-band__rows">
        {SECTIONS.map((s) => (
          <SectionBandRow key={s} section={s} band={bands?.[s] ?? null} />
        ))}
      </ul>
      <p className="ih-band__forecast">
        <TrendingUpIcon size={18} />
        <span>
          {forecast
            ? t('ieltsHub.band.forecast', { date: formatDate(forecast.date, lang), band: formatBand(forecast.band) })
            : t('ieltsHub.band.noForecast')}
        </span>
      </p>
    </Card>
  )
}
