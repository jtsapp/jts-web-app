import { useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { SectionTile } from '../sections.jsx'
import { getIeltsSpeakingWorks, getIeltsWritingWorks } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { formatDate } from '../format.js'
import { EditIcon } from '../icons.jsx'
import { categoryLabel } from './WritingListView.jsx'
import { useI18n } from '../../i18n.jsx'

// «Мои работы» Writing и Speaking: все сданные работы навыка, новые сверху, со статусом ИИ-проверки и band.
export default function WritingWorksView({ token, onOpenWork, onBack, skill = 'writing' }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ status: 'loading', rows: [] })

  useEffect(() => {
    let alive = true
    const authToken = token || loadToken()
    ;(authToken ? (skill === 'speaking' ? getIeltsSpeakingWorks : getIeltsWritingWorks)(authToken) : Promise.reject(Object.assign(new Error('guest'), { guest: true })))
      .then((rows) => alive && setState({ status: 'ready', rows: Array.isArray(rows) ? rows : [] }))
      .catch((e) => alive && setState({ status: e?.guest || e?.status === 401 ? 'guest' : 'error', rows: [] }))
    return () => {
      alive = false
    }
  }, [token, skill])

  const worksTitle = t(skill === 'speaking' ? 'ieltsSpeaking.works' : 'ieltsLearn.writing.works')
  let body
  if (state.status === 'loading') body = <p className="ih-muted">{t('ieltsReading.loading')}</p>
  else if (state.status === 'guest') body = <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />
  else if (state.status === 'error') body = <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
  else if (!state.rows.length) body = <EmptyState icon={<EditIcon size={28} />} title={t('ieltsWriting.noWorksTitle')} text={t('ieltsWriting.noWorksText')} />
  else
    body = state.rows.map((w) => (
      <button key={w.attemptId} type="button" className="ih-trow ih-trow--writing" onClick={() => onOpenWork(w.attemptId)}>
        <SectionTile section={skill} />
        <span className="ih-trow__body">
          <b>{w.title}</b>
          <span>
            {(skill === 'speaking' ? [`Part ${w.kind.slice(4)}`, formatDate(w.finishedAt, lang)] : [w.kind === 'task2' ? 'Task 2' : 'Task 1', categoryLabel(t, w.kind, w.category), t('ieltsWriting.wordsN', { n: String(w.words ?? 0) }), formatDate(w.finishedAt, lang)])
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span className={`ih-trow__last ${w.status === 'done' ? '' : 'is-pending'}`}>
          {w.status === 'done' && w.band != null ? `band ${w.band.toFixed(1)}` : t(`ieltsWriting.status.${w.status === 'grading' || w.status === 'failed' ? w.status : 'pending'}`)}
        </span>
      </button>
    ))

  return (
    <div className="ih-rlist">
      <Breadcrumbs items={[{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: skill === 'speaking' ? 'Speaking' : 'Writing', onClick: onBack }, { label: worksTitle }]} />
      <div className="ih-rlist__head">
        <div>
          <h2>{worksTitle}</h2>
          <p>{t('ieltsWriting.worksText')}</p>
        </div>
      </div>
      <div className="ih-rlist__rows">{body}</div>
    </div>
  )
}
