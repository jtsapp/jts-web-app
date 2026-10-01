import { useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import Chip from '../ui/Chip.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { SectionTile } from '../sections.jsx'
import { MicIcon } from '../icons.jsx'
import { speakingTasks } from './speaking.js'
import { useI18n } from '../../i18n.jsx'

const TITLE_KEY = { part1: 'ieltsLearn.speaking.p1', part2: 'ieltsLearn.speaking.p2', part3: 'ieltsLearn.speaking.p3', shadowing: 'ieltsSpeaking.shadowing' }

/**
 * Списки Speaking во вкладке «Обучение»: темы Part 1, карточки Part 2 (фильтр по виду карточки — человек, место,
 * событие…), наборы Part 3 и наборы Shadowing. Speaking общий для Academic и General Training — трека здесь нет.
 */
export default function SpeakingListView({ kind, catalog, onOpenTest, onBack }) {
  const { t } = useI18n()
  const [cat, setCat] = useState(null)
  const all = speakingTasks(catalog.items, kind)
  const cats = kind === 'part2' ? [...new Set(all.map((x) => x.category).filter(Boolean))] : []
  const rows = cat ? all.filter((x) => x.category === cat) : all
  const title = t(TITLE_KEY[kind])

  let body
  if (catalog.status === 'loading') body = <p className="ih-muted">{t('ieltsReading.loading')}</p>
  else if (catalog.status === 'guest') body = <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />
  else if (catalog.status === 'error')
    body = (
      <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')}
        action={<PillButton variant="primary" onClick={catalog.reload}>{t('ieltsReading.retry')}</PillButton>} />
    )
  else if (!rows.length) body = <p className="ih-muted">{t('ieltsListening.emptyList')}</p>
  else
    body = rows.map((x) => {
      const last = x.lastAttempt
      const meta =
        kind === 'part2'
          ? t(`ieltsSpeaking.p.cat.${x.category}`)
          : kind === 'shadowing'
            ? t('ieltsListening.phrases', { n: String(x.questionCount) })
            : t('ieltsReading.questions', { n: String(x.questionCount) })
      return (
        <button key={x.id} type="button" className="ih-trow ih-trow--speaking" onClick={() => onOpenTest(x)}>
          <SectionTile section="speaking" />
          <span className="ih-trow__body">
            <b>{x.title}</b>
            <span>{meta}</span>
          </span>
          <span className="ih-trow__last">{last?.band != null ? `band ${last.band.toFixed(1)}` : t('ieltsReading.notYet')}</span>
        </button>
      )
    })

  return (
    <div className="ih-rlist">
      <Breadcrumbs items={[{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Speaking', onClick: onBack }, { label: title }]} />
      <div className="ih-rlist__head">
        <div>
          <h2>{title}</h2>
          <p>{t(`ieltsSpeaking.listText.${kind}`)}</p>
        </div>
      </div>
      {cats.length > 1 && (
        <div className="ih-wfilters">
          <Chip tone={cat ? 'neutral' : 'violet'} onClick={() => setCat(null)}>{t('ieltsWriting.all')}</Chip>
          {cats.map((c) => (
            <Chip key={c} tone={cat === c ? 'violet' : 'neutral'} onClick={() => setCat(c)}>{t(`ieltsSpeaking.p.cat.${c}`)}</Chip>
          ))}
        </div>
      )}
      <div className="ih-rlist__rows">{body}</div>
    </div>
  )
}
