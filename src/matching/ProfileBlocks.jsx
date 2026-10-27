import { useState } from 'react'
import { saveMatchingInterests } from '../api.js'
import { applyMatchingCard, useMatching } from './matchingStore.js'
import { matchingView } from './matchingState.js'
import { nextOccurrence, studentTimezone } from './slots.js'
import { lessonDateLabel } from './ConfirmCard.jsx'
import TeacherPhoto from './TeacherPhoto.jsx'
import InterestsPicker from './InterestsPicker.jsx'
import TimezoneModal, { zoneTitle } from './TimezoneModal.jsx'
import { errorText, useToast } from './ui.jsx'
import { useMatchingT } from './texts.js'
import { useTeacher } from './useTeacher.js'

const HIDDEN = new Set(['idle', 'loading', 'unavailable', 'no_subscription'])

// Новые блоки профиля ученика (ТЗ §2.10): «Мой учитель», «Мои интересы», «Настройки обучения». Встают после
// плиток профиля; остальные блоки профиля не трогаются. Без подбора на стенде или без абонемента их нет.
export default function ProfileBlocks({ token, onNav, onOpenNotifications }) {
  const { t, lang } = useMatchingT()
  const snap = useMatching(token)
  const view = matchingView(snap)
  const [toastNode, toast] = useToast()
  const [tzOpen, setTzOpen] = useState(false)
  // имя — как в профиле учителя (из резюме), а не имя аккаунта из карточки подбора
  const teacher = useTeacher(token, view.assignment?.teacherId)
  if (HIDDEN.has(view.status)) return null
  const tz = studentTimezone(snap.card)
  const a = view.assignment
  const kids = view.tariff.name === 'Kids'
  const next = a ? nextOccurrence(a.slots) : null

  // Чип отмечается сразу, не дожидаясь сервера; отказ возвращает прежний список.
  const saveInterests = async (list) => {
    const before = snap.card
    applyMatchingCard({ ...before, interests: list })
    try {
      applyMatchingCard(await saveMatchingInterests(token, list))
    } catch (e) {
      applyMatchingCard(before)
      toast(errorText(e, t))
    }
  }

  return (
    <div className="mt mt-stack" style={{ gap: 16 }}>
      <section className="mt-sec">
        <div className="mt-row mt-between">
          <h3 className="mt-h3">{t('pb.teacher')}</h3>
          <span className={`mt-pill ${a ? 'mt-pill--ok' : 'mt-pill--warn'}`}>{a ? t('pb.fixed') : t('pb.notChosen')}</span>
        </div>
        {a ? (
          <div className="mt-lst">
            <div className="mt-li">
              <TeacherPhoto token={token} teacherId={a.teacherId} name={teacher?.card?.name || a.teacherName} hasPhoto={teacher?.card?.hasPhoto ?? true} />
              <div className="mt-li__grow">
                <b>{teacher?.card?.name || a.teacherName}</b>
                <p className="mt-small mt-muted">
                  {view.needsFormatStep ? (a.format ? t('format.' + a.format) : t('assigned.formatNone')) : t('format.platform')}
                  {next && ' · ' + t('pb.next', { date: lessonDateLabel(next, tz, lang) })}
                </p>
              </div>
              <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" onClick={() => onNav('my-teacher')}>{t('btn.open')}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-small mt-muted">{view.status === 'none' ? t('pb.chooseText') : t('st.' + view.status)}</p>
            <button
              type="button"
              className="mt-btn mt-btn--sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => onNav(view.status === 'none' ? 'teacher-wizard' : 'my-teacher')}
            >
              {view.status === 'none' ? t('btn.chooseTeacher') : t('btn.open')}
            </button>
          </>
        )}
      </section>

      <section className="mt-sec">
        <div className="mt-row mt-between">
          <h3 className="mt-h3">{t(kids ? 'pb.interestsKids' : 'pb.interests')}</h3>
          <span className="mt-tiny">{t('pb.interestsCount', { k: view.interests.length })}</span>
        </div>
        <InterestsPicker value={view.interests} onChange={saveInterests} onLimit={() => toast(t('interests.limit'))} hint={t('pb.noneChosen')} />
      </section>

      <section className="mt-sec">
        <h3 className="mt-h3">{t('pb.settings')}</h3>
        <div className="mt-lst">
          <button type="button" className="mt-li" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={() => setTzOpen(true)}>
            <span className="mt-li__ic">🌍</span>
            <span className="mt-li__grow"><b>{t('pb.tz')}</b><span className="mt-small mt-muted" style={{ display: 'block' }}>{t('pb.tzNote')}</span></span>
            <span className="mt-li__val">{zoneTitle(tz)}</span>
          </button>
          <div className="mt-li">
            <span className="mt-li__ic">📚</span>
            <span className="mt-li__grow"><b>{t('pb.format')}</b></span>
            <span className="mt-li__val">{view.format ? t('format.' + view.format) : t('pb.formatNone')}</span>
          </div>
          <div className="mt-li">
            <span className="mt-li__ic">↻</span>
            <span className="mt-li__grow"><b>{t('pb.perWeek')}</b></span>
            <span className="mt-li__val">{view.tariff.perWeek}</span>
          </div>
          <button type="button" className="mt-li" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={onOpenNotifications}>
            <span className="mt-li__ic">🔔</span>
            <span className="mt-li__grow"><b>{t('pb.notif')}</b><span className="mt-small mt-muted" style={{ display: 'block' }}>{t('pb.notifNote')}</span></span>
            <span className="mt-li__val">{t('pb.notifOn')}</span>
          </button>
        </div>
      </section>
      {tzOpen && <TimezoneModal token={token} current={snap.card?.timezone} onClose={() => setTzOpen(false)} onSaved={toast} />}
      {toastNode}
    </div>
  )
}

// Каналы уведомлений в окне «Уведомления» профиля (ТЗ §1, «Настройки»): WhatsApp — по номеру профиля, Telegram и
// приложение — «скоро» (привязки Telegram у ученика на бэкенде нет, приложения ещё нет).
export function NotificationChannels({ phone }) {
  const { t } = useMatchingT()
  const rows = [
    ['ch.whatsapp', phone ? t('ch.whatsappOn', { phone }) : t('ch.whatsappOff'), !!phone],
    ['ch.telegram', t('ch.soon'), false],
    ['ch.app', t('ch.soon'), false],
  ]
  return (
    <div className="mt mt-stack mt-stack--tight" style={{ marginTop: 12 }}>
      <b className="mt-small">{t('ch.title')}</b>
      {rows.map(([key, value, on]) => (
        <div key={key} className="mt-row mt-between">
          <span>{t(key)}</span>
          <span className={`mt-pill ${on ? 'mt-pill--ok' : 'mt-pill--gray'}`}>{value}</span>
        </div>
      ))}
    </div>
  )
}
