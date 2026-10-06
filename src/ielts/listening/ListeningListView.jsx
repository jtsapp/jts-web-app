import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { SectionTile } from '../sections.jsx'
import { dictations, listeningDrills, listeningTasks, listeningTypes, spellings } from './catalog.js'
import { formatTime } from './listening.js'
import { HeadphonesIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

/**
 * Списки Listening во вкладке «Обучение»: задания (части с вопросами), диктовка и «Тренировка правописания».
 * Задание открывает экран задания с выбором режима; диктовка и правописание — сразу тренажёр (режим у них один).
 */
export default function ListeningListView({ list, catalog, onOpenTest, onBack }) {
  const { t } = useI18n()
  const titleKey = { tasks: 'ieltsLearn.listening.tasks', dictation: 'ieltsLearn.listening.dictation', spelling: 'ieltsLearn.listening.spelling', types: 'ieltsLearn.listening.types', drills: 'ieltsLearn.listening.drills' }[list]
  const rows = list === 'dictation' ? dictations(catalog.items) : list === 'spelling' ? spellings(catalog.items) : list === 'types' ? listeningTypes(catalog.items) : list === 'drills' ? listeningDrills(catalog.items) : listeningTasks(catalog.items)

  let body
  if (catalog.status === 'loading') body = <p className="ih-muted">{t('ieltsReading.loading')}</p>
  else if (catalog.status === 'guest') body = <EmptyState icon={<HeadphonesIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />
  else if (catalog.status === 'error')
    body = (
      <EmptyState icon={<HeadphonesIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')}
        action={<PillButton variant="primary" onClick={catalog.reload}>{t('ieltsReading.retry')}</PillButton>} />
    )
  else if (!rows.length) body = <p className="ih-muted">{t('ieltsListening.emptyList')}</p>
  else
    body = rows.map((x) => {
      const last = x.lastAttempt
      const meta =
        list === 'tasks'
          ? `${x.category ? x.category.replace(/^part(\d)$/, 'Part $1') + ' · ' : ''}${t('ieltsReading.questions', { n: String(x.maxScore || x.questionCount) })}`
          : t('ieltsListening.phrases', { n: String(x.questionCount) })
      const result = last
        ? list === 'tasks'
          ? `${last.rawScore} / ${last.maxScore}`
          : `${Math.round((last.rawScore / Math.max(1, last.maxScore)) * 100)} %`
        : t('ieltsReading.notYet')
      return (
        <button key={x.id} type="button" className="ih-trow ih-trow--listening" onClick={() => onOpenTest(x)}>
          <SectionTile section="listening" />
          <span className="ih-trow__body">
            <b>{x.title}</b>
            <span>{meta}{x.timeLimitSec ? ` · ${formatTime(x.timeLimitSec)}` : ''}</span>
          </span>
          <span className="ih-trow__last">{result}</span>
        </button>
      )
    })

  return (
    <div className="ih-rlist">
      <Breadcrumbs items={[{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Listening', onClick: onBack }, { label: t(titleKey) }]} />
      <div className="ih-rlist__head">
        <div>
          <h2>{t(titleKey)}</h2>
          <p>{t(`ieltsListening.listText.${list}`)}</p>
        </div>
      </div>
      <div className="ih-rlist__rows">{body}</div>
    </div>
  )
}
