import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { SectionTile } from '../sections.jsx'
import { CATEGORY_LABEL } from './meta.js'
import { drills, singleTexts, typeTrainers } from './catalog.js'
import { MenuBookIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Переключатель трека: тесты Academic и General Training разные (тексты GT — объявления и правила).
export function TrackSwitch({ track, onChange }) {
  const { t } = useI18n()
  return (
    <div className="ih-seg" role="radiogroup" aria-label={t('ieltsReading.track')}>
      {['academic', 'general'].map((v) => (
        <button key={v} type="button" role="radio" aria-checked={track === v} className={track === v ? 'is-on' : ''} onClick={() => onChange(v)}>
          {v === 'academic' ? 'Academic' : 'General Training'}
        </button>
      ))}
    </div>
  )
}

// Кнопка одного теста в списке: подпись и результат последней попытки («3/5»).
function TestPill({ test, label, onOpen }) {
  const last = test.lastAttempt
  return (
    <button type="button" className={`ih-testpill ${last ? 'is-done' : ''}`} onClick={() => onOpen(test.id)} title={test.title}>
      <span>{label}</span>
      {last && <b>{last.rawScore}/{last.maxScore}</b>}
    </button>
  )
}

function TypeCard({ trainer, onOpen }) {
  const { t } = useI18n()
  return (
    <article className="ih-rcard">
      <header>
        <h3>{CATEGORY_LABEL[trainer.id]}</h3>
        <span className="ih-rcard__meta">{t('ieltsReading.doneOf', { n: String(trainer.done), total: String(trainer.tests.length) })}</span>
      </header>
      <div className="ih-rcard__tests">
        {trainer.demo && <TestPill test={trainer.demo} label={t('ieltsReading.role.demo')} onOpen={onOpen} />}
        {trainer.practice.map((x, i) => (
          <TestPill key={x.id} test={x} label={t('ieltsReading.role.practiceN', { n: String(i + 1) })} onOpen={onOpen} />
        ))}
        {trainer.mini && <TestPill test={trainer.mini} label={t('ieltsReading.role.mini')} onOpen={onOpen} />}
      </div>
    </article>
  )
}

function DrillCard({ drill, onOpen }) {
  const { t } = useI18n()
  return (
    <article className="ih-rcard">
      <header>
        <div>
          <h3>{t(`ieltsReading.drill.${drill.id}.name`)}</h3>
          <span className="ih-rcard__text">{t(`ieltsReading.drill.${drill.id}.text`)}</span>
        </div>
        <span className="ih-rcard__meta">{t('ieltsReading.doneOf', { n: String(drill.done), total: String(drill.tests.length) })}</span>
      </header>
      <div className="ih-rcard__tests">
        {drill.tests.map((x, i) => (
          <TestPill key={x.id} test={x} label={String(i + 1)} onOpen={onOpen} />
        ))}
      </div>
    </article>
  )
}

function TextRow({ test, onOpen }) {
  const { t } = useI18n()
  const last = test.lastAttempt
  return (
    <button type="button" className="ih-trow" onClick={() => onOpen(test.id)}>
      <SectionTile section="reading" />
      <span className="ih-trow__body">
        <b>{test.title}</b>
        <span>
          {test.kind === 'section' ? 'General Training' : 'Academic'} · {t('ieltsReading.questions', { n: String(test.maxScore || test.questionCount) })}
          {test.words ? ` · ${t('ieltsReading.words', { n: String(test.words) })}` : ''}
        </span>
      </span>
      <span className="ih-trow__last">{last ? `${last.rawScore} / ${last.maxScore}` : t('ieltsReading.notYet')}</span>
    </button>
  )
}

export default function ReadingListView({ list, catalog, track, onTrack, onOpenTest, onBack }) {
  const { t } = useI18n()
  const title = t(`ieltsLearn.reading.${list}`)
  let body
  if (catalog.status === 'loading') body = <p className="ih-muted">{t('ieltsReading.loading')}</p>
  else if (catalog.status === 'guest') body = <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />
  else if (catalog.status === 'error')
    body = (
      <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')}
        action={<PillButton variant="primary" onClick={catalog.reload}>{t('ieltsReading.retry')}</PillButton>} />
    )
  else if (list === 'types') body = typeTrainers(catalog.items, track).map((x) => <TypeCard key={x.id} trainer={x} onOpen={onOpenTest} />)
  else if (list === 'drills') body = drills(catalog.items, track).map((x) => <DrillCard key={x.id} drill={x} onOpen={onOpenTest} />)
  else body = singleTexts(catalog.items, track).map((x) => <TextRow key={x.id} test={x} onOpen={onOpenTest} />)
  const empty = catalog.status === 'ready' && Array.isArray(body) && body.length === 0

  return (
    <div className="ih-rlist">
      <Breadcrumbs items={[{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Reading', onClick: onBack }, { label: title }]} />
      <div className="ih-rlist__head">
        <div>
          <h2>{title}</h2>
          <p>{t(`ieltsReading.listText.${list}`)}</p>
        </div>
        <TrackSwitch track={track} onChange={onTrack} />
      </div>
      <div className={list === 'texts' ? 'ih-rlist__rows' : 'ih-rlist__grid'}>{empty ? <p className="ih-muted">{t('ieltsReading.emptyList')}</p> : body}</div>
    </div>
  )
}
