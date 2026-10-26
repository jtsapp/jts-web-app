import { useEffect, useState } from 'react'
import { useMatching, flashMatching } from '../matching/matchingStore.js'
import { matchingView } from '../matching/matchingState.js'
import { studentTimezone } from '../matching/slots.js'
import { useMatchingT } from '../matching/texts.js'
import { TariffLine, useToast } from '../matching/ui.jsx'
import ManagerPickModal, { managerButtonLabel } from '../matching/ManagerPickModal.jsx'

// Последний шаг онбординга (ТЗ §2.1): после итога теста, пока учителя нет. Экран во всё окно, как анкета GE —
// это продолжение первого входа, а не раздел кабинета. Показан хоть раз — App больше сюда не уводит
// (teacherPickSeen), дальше подбор живёт в «Мой учитель».
const seenKey = (id) => `jts_teacher_pick_seen:${id}`

export function teacherPickSeen(studentId) {
  try {
    return localStorage.getItem(seenKey(studentId)) === '1'
  } catch {
    return true
  }
}

export default function TeacherPickPage({ token, userLevel, onNav }) {
  const { t, lang } = useMatchingT()
  const snap = useMatching(token)
  const view = matchingView(snap)
  const tz = studentTimezone(snap.card)
  const [toastNode, toast] = useToast()
  const [manager, setManager] = useState(false)

  useEffect(() => {
    if (!view.studentId) return
    try {
      localStorage.setItem(seenKey(view.studentId), '1')
    } catch {
      /* без хранилища онбординг просто покажется ещё раз */
    }
  }, [view.studentId])

  // Учитель уже выбирается (заявки, предложение) или раздела нет — этому экрану показывать нечего.
  const off = !['idle', 'loading', 'none', 'tariff_pending', 'manager_picking'].includes(view.status)
  useEffect(() => {
    if (off) onNav(view.status === 'unavailable' || view.status === 'no_subscription' ? 'home' : 'my-teacher')
  }, [off, view.status, onNav])

  if (view.status === 'idle' || view.status === 'loading' || off) {
    return <div className="mt mt-page"><div className="mt-onb"><p className="mt-muted">{t('loading')}</p></div></div>
  }

  const pending = view.status === 'tariff_pending'
  const steps = view.needsFormatStep ? ['format', 'time', 'teacher'] : ['time', 'teacher']
  // «Сделаю позже» (ТЗ §2.1): на «Главную», но сначала ученик успевает прочитать, где потом искать учителя.
  const later = () => {
    toast(t('onb.laterToast'))
    setTimeout(() => onNav('home'), 1200)
  }

  return (
    <div className="mt mt-page">
      <div className="mt-onb">
        <div className="mt-onb__steps" aria-label={t('onb.step')}>
          {[0, 1, 2, 3, 4].map((i) => <span key={i} />)}
        </div>
        <p className="mt-tiny">{t('onb.step')}</p>
        <div className="mt-onb__card">
          <div className="mt-row">
            {userLevel && <span className="mt-pill mt-pill--ok">{t('onb.tested', { level: userLevel })}</span>}
            {pending ? <span className="mt-pill mt-pill--warn">{t('tariff.pendingChip')}</span> : <TariffLine tariff={view.tariff} />}
          </div>
          {pending && (
            <div className="mt-banner mt-banner--warn">
              <p className="mt-small"><b>{t('tariff.pendingBold')}</b> {t('tariff.pendingText')}</p>
            </div>
          )}
          <h1 className="mt-onb__title">{t('onb.title')}</h1>
          <p className="mt-muted">
            {view.needsFormatStep ? t('onb.sub') : t('onb.subNoFormat')}
            {view.tariff?.guarantee && ' ' + t('onb.subGuarantee')}
          </p>
          <div className="mt-why">
            <div>
              <b>{t(steps.length === 3 ? 'onb.fact3' : 'onb.fact2')}</b>
              <p className="mt-small mt-muted">{steps.map((s) => t('step.short.' + s)).join(' → ')}</p>
            </div>
            <div>
              <b>{t('onb.factTeachers')}</b>
              <p className="mt-small mt-muted">{t('onb.factTeachersText')}</p>
            </div>
            <div>
              <b>{t('onb.factAnswer')}</b>
              <p className="mt-small mt-muted">{t('onb.factAnswerText')}</p>
            </div>
          </div>
          <div className="mt-row">
            <button type="button" className="mt-btn mt-btn--lg" disabled={pending || view.status !== 'none'} onClick={() => onNav('teacher-wizard')}>
              {t('btn.pickTeacher')}
            </button>
            <button
              type="button"
              className="mt-btn mt-btn--ghost"
              disabled={view.status === 'manager_picking'}
              onClick={() => setManager(true)}
            >
              {managerButtonLabel(view, t, tz, lang)}
            </button>
            <button type="button" className="mt-btn mt-btn--line" onClick={later}>{t('btn.later')}</button>
          </div>
          <p className="mt-tiny">{t('onb.laterNote')}</p>
        </div>
      </div>
      {manager && (
        <ManagerPickModal
          token={token}
          view={view}
          slots={view.availableSlots}
          interests={view.interests}
          format={view.format}
          tz={tz}
          onClose={() => setManager(false)}
          onSent={(text) => {
            setManager(false)
            flashMatching(text)
            onNav('my-teacher')
          }}
        />
      )}
      {toastNode}
    </div>
  )
}
