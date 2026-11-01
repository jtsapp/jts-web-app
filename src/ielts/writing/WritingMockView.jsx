import { useI18n } from '../../i18n.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import Chip from '../ui/Chip.jsx'
import { ArrowForwardIcon, ChevronRightIcon, EditIcon, TimerIcon } from '../icons.jsx'
import { mockLimits, mockTasks, mockTypeName, parseMockKey, pickMockTask } from './mockByType.js'

/**
 * Описание mock Writing по типу (вид хаба writing-mock, ?ieltsList=task2:opinion): условия экзамена и «Начать».
 * Задание выбирает pickMockTask при старте и заранее не показывается — как на экзамене. Типа без заданий (или чужого
 * трека) — пустое состояние, а не пустой редактор. catalog — каталог Writing ({ status, items, reload }).
 */
export default function WritingMockView({ listKey, catalog, drafts, track, onStart, onBack, onSkill }) {
  const { t } = useI18n()
  const type = parseMockKey(listKey, track)
  const tasks = mockTasks(catalog?.items, listKey, track)
  const pick = pickMockTask(tasks, drafts)
  const limits = mockLimits(type?.kind)
  const title = type ? `Mock · ${mockTypeName(listKey)}` : 'Mock · Writing'

  let body
  if (catalog?.status === 'loading') body = <p className="ih-muted">{t('ieltsReading.loading')}</p>
  else if (catalog?.status === 'guest') body = <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />
  else if (catalog?.status === 'error')
    body = (
      <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')}
        action={<PillButton variant="primary" onClick={catalog.reload}>{t('ieltsReading.retry')}</PillButton>} />
    )
  else if (!pick)
    body = (
      <EmptyState icon={<TimerIcon size={28} />} title={t('ieltsWMock.emptyTitle')} text={t('ieltsWMock.emptyText')}
        action={<PillButton variant="outline" onClick={onSkill}>{t('ieltsWMock.otherTypes')}</PillButton>} />
    )
  else
    body = (
      <section className="ih-card ih-wmock">
        <div className="ih-rtask__chips">
          <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsWriting.minutes', { n: String(limits.minutes) })}</Chip>
          <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsWriting.minWords', { n: String(limits.words) })}</Chip>
          <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsWMock.noHints')}</Chip>
        </div>
        <ul className="ih-wmock__rules">
          <li>{t('ieltsWMock.rule.time', { n: String(limits.minutes) })}</li>
          <li>{t('ieltsWMock.rule.words', { n: String(limits.words) })}</li>
          <li>{t('ieltsWMock.rule.hints')}</li>
          <li>{t('ieltsWMock.rule.saved')}</li>
        </ul>
        <p className="ih-muted">{t(`ieltsWMock.pick.${pick.reason}`, { n: String(tasks.length) })}</p>
        <button type="button" className="ih-cta" onClick={() => onStart(pick.task.id, type.kind, listKey)}>
          {pick.reason === 'resume' ? t('ieltsReading.continue') : t('ieltsWMock.start')}
          <ArrowForwardIcon size={20} />
        </button>
      </section>
    )

  return (
    <div className="ih-practice">
      <nav className="ih-crumbs" aria-label={t('ieltsPractice.crumbs')}>
        <button type="button" className="ih-link" onClick={onBack}>{t('ieltsHub.tab.learn')}</button>
        <ChevronRightIcon size={16} />
        <button type="button" className="ih-link" onClick={onSkill}>Writing</button>
        <ChevronRightIcon size={16} />
        <span>{title}</span>
      </nav>
      <PageHeader title={title} sub={`${t('ieltsWMock.sub')} · ${track === 'general' ? 'General Training' : 'Academic'}`} />
      {body}
    </div>
  )
}
