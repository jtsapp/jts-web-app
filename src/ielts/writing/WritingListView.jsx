import { useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import Chip from '../ui/Chip.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { SectionTile } from '../sections.jsx'
import { EditIcon } from '../icons.jsx'
import { writingTasks } from './writing.js'
import { useI18n } from '../../i18n.jsx'

// Подпись вида задания: тип графика у Task 1 AC, регистр письма у GT, тип эссе у Task 2 — ключи прототипа wr.*
export function categoryLabel(t, kind, category) {
  if (!category) return null
  const group = kind === 'task2' ? 'essay' : ['formal', 'semi_formal', 'informal'].includes(category) ? 'register' : 'visual'
  return t(`ieltsWriting.p.${group}.${category}`)
}

/**
 * Список заданий Task 1 или Task 2 (вкладка «Обучение» → Writing). Task 1 — своего трека (Academic: графики, General:
 * письма), Task 2 общий. Фильтр — по виду задания, как в прототипе.
 */
export default function WritingListView({ kind, catalog, track, onTrack, onOpenTest, onBack }) {
  const { t } = useI18n()
  const [cat, setCat] = useState(null)
  const all = writingTasks(catalog.items, kind, track)
  const cats = [...new Set(all.map((x) => x.category).filter(Boolean))]
  const rows = cat ? all.filter((x) => x.category === cat) : all
  const title = t(`ieltsLearn.writing.${kind === 'task2' ? 'task2' : 'task1'}`)

  let body
  if (catalog.status === 'loading') body = <p className="ih-muted">{t('ieltsReading.loading')}</p>
  else if (catalog.status === 'guest') body = <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />
  else if (catalog.status === 'error')
    body = (
      <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')}
        action={<PillButton variant="primary" onClick={catalog.reload}>{t('ieltsReading.retry')}</PillButton>} />
    )
  else if (!rows.length) body = <p className="ih-muted">{t('ieltsListening.emptyList')}</p>
  else
    body = rows.map((x) => {
      const last = x.lastAttempt
      return (
        <button key={x.id} type="button" className="ih-trow ih-trow--writing" onClick={() => onOpenTest(x)}>
          <SectionTile section="writing" />
          <span className="ih-trow__body">
            <b>{x.title}</b>
            <span>{[categoryLabel(t, kind, x.category), t('ieltsWriting.minutes', { n: String(Math.round((x.timeLimitSec || 1200) / 60)) })].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="ih-trow__last">{last?.band != null ? `band ${last.band.toFixed(1)}` : last ? t('ieltsWriting.status.pending') : t('ieltsReading.notYet')}</span>
        </button>
      )
    })

  return (
    <div className="ih-rlist">
      <Breadcrumbs items={[{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Writing', onClick: onBack }, { label: title }]} />
      <div className="ih-rlist__head">
        <div>
          <h2>{title}</h2>
          <p>{t(`ieltsWriting.listText.${kind === 'task2' ? 'task2' : track === 'general' ? 'task1gt' : 'task1ac'}`)}</p>
        </div>
        {kind === 'task1' && (
          <div className="ih-seg" role="radiogroup" aria-label={t('ieltsReading.track')}>
            {['academic', 'general'].map((tr) => (
              <button key={tr} type="button" role="radio" aria-checked={track === tr} className={track === tr ? 'is-on' : ''} onClick={() => onTrack(tr)}>
                {tr === 'academic' ? 'Academic' : 'General Training'}
              </button>
            ))}
          </div>
        )}
      </div>
      {cats.length > 1 && (
        <div className="ih-wfilters">
          <Chip tone={cat ? 'neutral' : 'violet'} onClick={() => setCat(null)}>{t('ieltsWriting.all')}</Chip>
          {cats.map((c) => (
            <Chip key={c} tone={cat === c ? 'violet' : 'neutral'} onClick={() => setCat(c)}>{categoryLabel(t, kind, c)}</Chip>
          ))}
        </div>
      )}
      <div className="ih-rlist__rows">{body}</div>
    </div>
  )
}
