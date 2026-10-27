import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { reconfirmMatchingSchedule } from '../api.js'
import { useMatching, applyMatchingCard, takeMatchingFlash } from '../matching/matchingStore.js'
import { matchingView } from '../matching/matchingState.js'
import { studentTimezone } from '../matching/slots.js'
import { useMatchingT } from '../matching/texts.js'
import { errorText, useBusy, useToast } from '../matching/ui.jsx'
import { useTeacher } from '../matching/useTeacher.js'
import ConfirmCard from '../matching/ConfirmCard.jsx'
import AssignedTeacher from '../matching/AssignedTeacher.jsx'
import TeacherProfileModal from '../matching/TeacherProfileModal.jsx'
import ManagerPickModal, { managerButtonLabel } from '../matching/ManagerPickModal.jsx'
import TimezoneBanner from '../matching/TimezoneBanner.jsx'
import { ChangeFormatModal, ChangeTeacherModal, VacationModal, shortDate } from '../matching/ChangeModals.jsx'
import { CelebrateModal, InfoHero, ManagerPicking, NoTeacherHero, RequestsStatus } from '../matching/StatusViews.jsx'

// «Мой учитель» (ТЗ 08 §2.9): один экран на все статусы подбора — какой показать, решает matchingView по карточке
// бэкенда. Кнопки «Написать в чат» нет ни в одном состоянии (ТЗ).
export default function MyTeacherPage({ token, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useMatchingT()
  const snap = useMatching(token)
  const view = matchingView(snap)
  const tz = studentTimezone(snap.card)
  const [toastNode, toast] = useToast()
  const [modal, setModal] = useState(null)
  const [done, setDone] = useState(null)
  const [busy, run] = useBusy()
  const assignedTeacher = useTeacher(token, view.assignment?.teacherId)

  useEffect(() => {
    const flash = takeMatchingFlash()
    if (flash) toast(flash)
  }, [toast])

  const managerOpen = view.status === 'manager_picking'
  const managerLabel = managerButtonLabel(view, t, tz, lang)
  const openManager = () => !managerOpen && setModal({ kind: 'manager' })

  const reconfirm = () =>
    run(async () => {
      try {
        applyMatchingCard(await reconfirmMatchingSchedule(token))
      } catch (e) {
        toast(errorText(e, t))
      }
    })

  let body
  switch (view.status) {
    case 'idle':
    case 'loading':
      body = <p className="mt-muted">{t('loading')}</p>
      break
    case 'unavailable':
      body = <InfoHero title={t('unavailable.title')} text={t('unavailable.text')} />
      break
    case 'no_subscription':
      body = (
        <InfoHero title={t('noSub.title')} text={t('noSub.text')}>
          <button type="button" className="mt-btn" onClick={() => onNav('pricing')}>{t('btn.contactManager')}</button>
        </InfoHero>
      )
      break
    case 'tariff_pending':
      body = (
        <InfoHero pill={t('tariff.pendingChip')} title={t('tariffPending.title')} text={t('tariffPending.text')}>
          <button type="button" className="mt-btn mt-btn--line" onClick={openManager}>{managerLabel}</button>
        </InfoHero>
      )
      break
    case 'none':
      body = (
        <NoTeacherHero
          view={view}
          managerLabel={managerLabel}
          onStart={() => onNav('teacher-wizard', view.allDeclined ? { step: 'teacher' } : undefined)}
          onManager={openManager}
        />
      )
      break
    case 'matching':
      body = <RequestsStatus token={token} view={view} managerLabel={managerLabel} onManager={openManager} />
      break
    case 'manager_picking':
      body = <ManagerPicking token={token} view={view} tz={tz} toast={toast} />
      break
    case 'schedule_proposed':
    case 'change_requested':
      body = (
        <ConfirmCard
          token={token}
          view={view}
          tz={tz}
          toast={toast}
          onDone={setDone}
          onProfile={(id) => setModal({ kind: 'profile', id })}
          onAddTime={() => onNav('teacher-wizard', { step: 'time' })}
          onManager={openManager}
        />
      )
      break
    case 'confirm_expired':
      body = (
        <InfoHero
          pill={t('expired.title')}
          title={t('expired.title')}
          text={t('expired.text', { name: view.proposal?.teacherName || '' })}
        >
          <button type="button" className="mt-btn" disabled={busy} onClick={reconfirm}>{t('expired.again')}</button>
          <button type="button" className="mt-btn mt-btn--line" onClick={() => onNav('teacher-wizard', { step: 'time' })}>{t('expired.other')}</button>
        </InfoHero>
      )
      break
    default:
      body = (
        <>
          {view.status === 'change_pending' && <div className="mt-banner mt-banner--warn"><p>{t('changePending')}</p></div>}
          <VacationBanners view={view} tz={tz} onChoose={() => setModal({ kind: 'vacation' })} />
          <AssignedTeacher
            token={token}
            view={view}
            tz={tz}
            onProfile={(id) => setModal({ kind: 'profile', id })}
            onChangeFormat={() => setModal({ kind: 'format' })}
            onChangeTeacher={() => setModal({ kind: 'teacher' })}
          />
        </>
      )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="my-teacher" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="mt">
        <div className="mt-wrap">
          <h1 className="mt-h1">{t('title')}</h1>
          {view.status !== 'unavailable' && <TimezoneBanner token={token} saved={snap.card?.timezone} toast={toast} />}
          {body}
        </div>
      </div>
      {modal?.kind === 'manager' && (
        <ManagerPickModal
          token={token}
          view={view}
          slots={view.availableSlots}
          interests={view.interests}
          format={view.format}
          tz={tz}
          onClose={() => setModal(null)}
          onSent={(text) => {
            setModal(null)
            toast(text)
          }}
        />
      )}
      {modal?.kind === 'profile' && (
        <TeacherProfileModal token={token} teacherId={modal.id} tz={tz} myInterests={view.interests} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'format' && (
        <ChangeFormatModal
          token={token}
          current={view.assignment?.format || null}
          teacherFormats={assignedTeacher?.card?.formats || null}
          onClose={() => setModal(null)}
          onDone={(text) => {
            setModal(null)
            toast(text)
          }}
          onNeedTeacherChange={() => setModal({ kind: 'teacher', reason: 'format' })}
        />
      )}
      {modal?.kind === 'teacher' && (
        <ChangeTeacherModal
          token={token}
          limits={view.limits}
          initialReason={modal.reason}
          onClose={() => setModal(null)}
          onSent={(text) => {
            setModal(null)
            toast(text)
          }}
          onContact={() => onNav('pricing')}
        />
      )}
      {modal?.kind === 'vacation' && view.vacation && (
        <VacationModal
          token={token}
          vacation={view.vacation}
          tz={tz}
          onClose={() => setModal(null)}
          onDone={(text) => {
            setModal(null)
            toast(text)
          }}
        />
      )}
      {done && <CelebrateModal done={done} tz={tz} onClose={() => setDone(null)} />}
      {toastNode}
    </LearningLayout>
  )
}

// Отпуск учителя: выбор ещё не сделан — баннер с кнопкой; сделан — что будет на эти даты (ТЗ §2.9).
function VacationBanners({ view, tz, onChoose }) {
  const { t, lang } = useMatchingT()
  if (view.vacation) {
    const v = view.vacation
    const n = lessonsInPeriod(view.assignment?.slots || [], v.from, v.to)
    return (
      <div className="mt-banner mt-banner--warn">
        <p>
          <b>{t('vac.banner', { name: v.teacherName || view.assignment?.teacherName || '', from: shortDate(v.from, tz, lang), to: shortDate(v.to, tz, lang) })}</b>{' '}
          {n > 0 && t('vac.lessons', { n })}
        </p>
        <button type="button" className="mt-btn mt-btn--sm" onClick={onChoose}>{t('vac.btn')}</button>
      </div>
    )
  }
  if (view.temporary) {
    const back = new Date(new Date(view.temporary.to + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10)
    return (
      <div className="mt-banner mt-banner--brand">
        <p>{t('vac.tempBanner', { from: shortDate(view.temporary.from, tz, lang), to: shortDate(view.temporary.to, tz, lang), name: view.temporary.teacherName || '', back: shortDate(back, tz, lang) })}</p>
      </div>
    )
  }
  if (view.paused) {
    return (
      <div className="mt-banner mt-banner--brand">
        <p>{t('vac.pauseBanner', { from: shortDate(view.paused.from, tz, lang), to: shortDate(view.paused.to, tz, lang) })}</p>
      </div>
    )
  }
  return null
}

// Сколько уроков ученика попадает на отпуск: по дням недели его постоянных слотов (UTC-день) в границах периода.
export function lessonsInPeriod(slots, from, to) {
  if (!slots.length || !from || !to) return 0
  const start = new Date(from + 'T00:00:00Z').getTime()
  const end = new Date(to + 'T00:00:00Z').getTime()
  let n = 0
  for (let d = start; d <= end; d += 86400000) {
    const wd = new Date(d).getUTCDay() || 7
    n += slots.filter((s) => s.weekday === wd).length
  }
  return n
}
