import { useState } from 'react'
import { assistantAllowedOn } from '../lib/assistant/visibility.js'
import { useMatching } from './matchingStore.js'
import { matchingView, popupFor } from './matchingState.js'
import { studentTimezone } from './slots.js'
import { MtModal, useToast } from './ui.jsx'
import ManagerPickModal from './ManagerPickModal.jsx'
import ConfirmCard from './ConfirmCard.jsx'
import { CelebrateModal } from './StatusViews.jsx'
import { shortDate } from './ChangeModals.jsx'
import { useMatchingT } from './texts.js'

// Экраны подбора и так показывают всё сами — окно поверх них было бы повтором.
const OWN_SCREENS = new Set(['my-teacher', 'teacher-wizard', 'teacher-pick'])
const seenKey = (studentId, key) => `jts_matching_popup:${studentId}:${key}`

function wasSeen(studentId, key) {
  try {
    return localStorage.getItem(seenKey(studentId, key)) === '1'
  } catch {
    return true
  }
}

function markSeen(studentId, key) {
  try {
    localStorage.setItem(seenKey(studentId, key), '1')
  } catch {
    /* без хранилища окно покажется ещё раз — лучше, чем не показаться */
  }
}

// Окна при входе (ТЗ §2.12): только события, где от ученика ждут действия, — подтвердить расписание, все отказали,
// время больше не закреплено, смена учителя одобрена, отпуск учителя. Каждое — один раз на событие и устройство;
// закрытое окно оставляет карточку в «Мой учитель» и бейдж в меню. На тестах, уроке и звонке — не мешаем (тот же
// список экранов, где спрятан помощник).
export default function MatchingPopups({ token, screen, onNav }) {
  const { t, lang } = useMatchingT()
  const snap = useMatching(token)
  const view = matchingView(snap)
  const popup = popupFor(view)
  const [closed, setClosed] = useState(null)
  const [done, setDone] = useState(null)
  const [manager, setManager] = useState(false)
  const [toastNode, toast] = useToast()
  const tz = studentTimezone(snap.card)

  if (done) return <CelebrateModal done={done} tz={tz} onClose={() => setDone(null)} />
  if (manager) {
    return (
      <>
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
            toast(text)
          }}
        />
        {toastNode}
      </>
    )
  }
  // Тост («другое время отправлено», «менеджер подберёт») переживает закрытое окно.
  if (!popup || !view.studentId || OWN_SCREENS.has(screen) || !assistantAllowedOn(screen, { token })) return toastNode
  if (closed === popup.key || wasSeen(view.studentId, popup.key)) return toastNode

  const close = () => {
    markSeen(view.studentId, popup.key)
    setClosed(popup.key)
  }
  const go = (key, payload) => {
    close()
    onNav(key, payload)
  }

  if (popup.kind === 'proposal') {
    return (
      <>
      <MtModal onClose={close} label={t('confirm.title')}>
        <div className="mt-row mt-end">
          <button type="button" className="mt-x" onClick={close} aria-label={t('btn.close')}>✕</button>
        </div>
        <ConfirmCard
          token={token}
          view={view}
          tz={tz}
          onDone={(d) => {
            close()
            setDone(d)
          }}
          onProfile={() => go('my-teacher')}
          onAddTime={() => go('teacher-wizard', { step: 'time' })}
          onManager={() => {
            close()
            setManager(true)
          }}
          // «другое время» отправлено — окно своё дело сделало: помечаем, иначе оно всплыло бы снова тем же событием
          onCountered={close}
          toast={toast}
        />
      </MtModal>
      {toastNode}
      </>
    )
  }

  const content = {
    all_declined: {
      title: t('declined.title'),
      text: [t('declined.text'), view.managerName ? t('declined.manager', { name: view.managerName }) : ''].join(' '),
      actions: [
        [t('declined.pick'), () => go('teacher-wizard', { step: 'teacher' })],
        [t('btn.managerPick'), () => {
          close()
          setManager(true)
        }],
      ],
    },
    expired: {
      title: t('expired.title'),
      text: t('expired.text', { name: view.proposal?.teacherName || '' }),
      actions: [
        [t('expired.again'), () => go('my-teacher')],
        [t('expired.other'), () => go('teacher-wizard', { step: 'time' })],
      ],
    },
    approved: {
      title: t('approved.title'),
      text: t('approved.text'),
      actions: [[t('btn.chooseTeacher'), () => go('teacher-wizard')]],
    },
    vacation: {
      title: t('vac.title', {
        name: view.vacation?.teacherName || '',
        from: shortDate(view.vacation?.from, tz, lang),
        to: shortDate(view.vacation?.to, tz, lang),
      }),
      text: `${t('vac.ask')} ${t('vac.pause')} · ${t('vac.temp')}`,
      actions: [[t('vac.btn'), () => go('my-teacher')]],
    },
  }[popup.kind]

  return (
    <MtModal title={content.title} onClose={close}>
      <p>{content.text}</p>
      <div className="mt-row mt-end">
        {content.actions.map(([label, fn], i) => (
          <button key={label} type="button" className={`mt-btn ${i ? 'mt-btn--line' : ''}`} onClick={fn}>{label}</button>
        ))}
      </div>
    </MtModal>
  )
}
