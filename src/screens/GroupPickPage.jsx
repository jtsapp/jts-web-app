'use client'

import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import {
  askGroupManager, cancelGroupEnrollment, enrollInGroup, joinGroupWaitlist, leaveGroupWaitlist, payForGroup, startGroupTrial,
  suggestGroups,
} from '../api.js'
import { defaultWishes } from '../groups/groupLogic.js'
import { useGroupT } from '../groups/texts.js'
import { useGroupState } from '../groups/useGroupState.js'
import WishesForm from '../groups/WishesForm.jsx'
import SuggestionList from '../groups/SuggestionList.jsx'
import EnrollmentCard from '../groups/EnrollmentCard.jsx'
import { errorText, useBusy, useToast } from '../matching/ui.jsx'

// «Выбрать группу» (ТЗ кабинетов, 14): пожелания → подходящие группы → запись → оплата или пробный урок → подтверждение
// менеджера. Одна запись на ученика (сервер держит это уникальным индексом), поэтому смена группы — отмена и новый выбор.
export default function GroupPickPage({ token, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useGroupT()
  const snap = useGroupState(token)
  const [wishes, setWishes] = useState(() => defaultWishes(userLevel, lang))
  const [suggestions, setSuggestions] = useState(null)
  const [asked, setAsked] = useState(false)
  const [payAsked, setPayAsked] = useState(false)
  const [busy, run] = useBusy()
  const [toastNode, toast] = useToast()

  // Любое действие ученика: ответ сервера — свежее состояние, поэтому второго запроса не нужно; сбой — текстом сервера.
  const act = (request, doneKey, after) =>
    run(async () => {
      try {
        const state = await request()
        snap.apply(state)
        after?.(state)
        if (doneKey) toast(t(doneKey))
      } catch (e) {
        toast(errorText(e, t))
      }
    })

  const find = () =>
    run(async () => {
      try {
        setAsked(false)
        setSuggestions(await suggestGroups(token, wishes))
      } catch (e) {
        toast(errorText(e, t))
      }
    })

  const ask = () =>
    run(async () => {
      try {
        await askGroupManager(token, wishes)
        setAsked(true)
      } catch (e) {
        toast(errorText(e, t))
      }
    })

  // «Выбрать другую группу» и «Отменить запись» для сервера одно действие: место освобождается, а новый выбор начинается заново.
  const leaveGroup = () => act(() => cancelGroupEnrollment(token), 'toast.cancelled', () => { setSuggestions(null); setPayAsked(false) })

  const enrollment = snap.state?.enrollment || null
  const waiting = snap.state?.waiting || []

  let body
  if (snap.status === 'loading') {
    body = <p className="mt-muted">{t('loading')}</p>
  } else if (snap.status === 'unavailable') {
    body = <p className="mt-muted" data-testid="group-unavailable">{t('unavailable')}</p>
  } else if (enrollment) {
    body = (
      <EnrollmentCard
        enrollment={enrollment}
        busy={busy}
        payAsked={payAsked}
        onPay={() => act(() => payForGroup(token), null, (state) => {
          const paid = state?.enrollment?.paymentStatus === 'PAID'
          setPayAsked(!paid)
          toast(t(paid ? 'toast.paid' : 'toast.payAsked'))
        })}
        onTrial={() => act(() => startGroupTrial(token), 'toast.trial')}
        onChange={leaveGroup}
        onCancel={leaveGroup}
      />
    )
  } else {
    body = (
      <>
        <WishesForm wishes={wishes} onChange={setWishes} onSubmit={find} busy={busy} />
        {suggestions && (
          <SuggestionList
            suggestions={suggestions}
            waiting={waiting}
            busy={busy}
            asked={asked}
            onEnroll={(id) => act(() => enrollInGroup(token, id), 'toast.enrolled')}
            onWaitlist={(id) => act(() => joinGroupWaitlist(token, id), 'toast.waitlist')}
            onLeave={(id) => act(() => leaveGroupWaitlist(token, id), 'toast.left')}
            onAsk={ask}
          />
        )}
      </>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="group" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="mt gp">
        <div className="mt-wrap">
          <h1 className="mt-h1">{t('title')}</h1>
          <p className="gp-lead">{t('lead')}</p>
          {body}
        </div>
      </div>
      {toastNode}
    </LearningLayout>
  )
}
