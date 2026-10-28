import { useState } from 'react'
import { askMatchingManager } from '../api.js'
import { applyMatchingCard, refreshMatching } from './matchingStore.js'
import { clearDraft } from './wizardDraft.js'
import { MtModal, errorText, useBusy } from './ui.jsx'
import { interestLabel } from './interests.js'
import { formatDateTime, schoolTimeToDate, slotLabel, sortSlots } from './slots.js'
import { useMatchingT } from './texts.js'

const WISH_MAX = 500

// «Пусть менеджер подберёт» (ТЗ §2.8). Время и интересы — что ученик уже отметил (в мастере или прежде), пожелание —
// до 500 символов. Если заявки учителям уже ушли, сначала спрашиваем: менеджерский подбор их отменит.
export default function ManagerPickModal({ token, view, slots, interests, format, tz, onClose, onSent }) {
  const { t, lang } = useMatchingT()
  const [wish, setWish] = useState(view?.managerRequest?.wish || '')
  // Заявки учителям или удерживаемое учителем время пропадут — сначала спрашиваем (ТЗ §2.8).
  const holds = view?.status === 'schedule_proposed' || view?.status === 'change_requested'
  const [confirmed, setConfirmed] = useState(view?.status !== 'matching' && !holds)
  const [error, setError] = useState('')
  const [busy, run] = useBusy()
  const manager = view?.managerName || t('manager.yourManager')
  const list = sortSlots(slots || [], tz)

  const send = () =>
    run(async () => {
      setError('')
      try {
        const card = await askMatchingManager(token, { slots: slots || [], interests: interests || [], wish: wish.trim() || null, format: format || null })
        applyMatchingCard(card)
        // время и интересы ушли менеджеру — черновик мастера больше не нужен и не должен вернуться через месяц
        clearDraft(view?.studentId)
        const due = schoolTimeToDate(card?.deadline)
        onSent?.(due ? t('manager.sent', { date: formatDateTime(due, tz, lang) }) : t('manager.sentNoDate'))
      } catch (e) {
        setError(errorText(e, t))
        refreshMatching(token)
      }
    })

  if (!confirmed) {
    return (
      <MtModal title={t('manager.modalTitle')} onClose={onClose}>
        <p>{t(holds ? 'manager.cancelHold' : 'manager.cancelRequests')}</p>
        <div className="mt-row mt-end">
          <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('btn.cancel')}</button>
          <button type="button" className="mt-btn" onClick={() => setConfirmed(true)}>{t('btn.continue')}</button>
        </div>
      </MtModal>
    )
  }

  return (
    <MtModal title={t('manager.modalTitle')} onClose={onClose}>
      <p className="mt-small mt-muted">{t('manager.modalText', { name: manager })}</p>
      <div className="mt-stack mt-stack--tight">
        <span className="mt-small"><b>{t('manager.slots')}</b></span>
        {list.length ? (
          <div className="mt-tags">
            {list.map((s) => <span key={s.weekday + s.start} className="mt-tag">{slotLabel(s, tz, lang)}</span>)}
          </div>
        ) : (
          <p className="mt-small mt-muted">{t('manager.noSlots')}</p>
        )}
        <span className="mt-small"><b>{t('manager.interests')}</b></span>
        <div className="mt-tags">
          {(interests || []).length
            ? interests.map((h) => <span key={h} className="mt-tag">{interestLabel(lang, h)}</span>)
            : <span className="mt-small mt-muted">—</span>}
        </div>
      </div>
      <label className="mt-small" htmlFor="mt-wish"><b>{t('manager.wish')}</b></label>
      <textarea
        id="mt-wish"
        className="mt-input"
        maxLength={WISH_MAX}
        placeholder={t('manager.wishPh')}
        value={wish}
        onChange={(e) => setWish(e.target.value)}
      />
      <span className="mt-counter">{wish.length} / {WISH_MAX}</span>
      {error && <p className="mt-small mt-error" role="alert">{error}</p>}
      <div className="mt-row mt-end">
        <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('btn.cancel')}</button>
        <button type="button" className="mt-btn" disabled={busy} onClick={send}>{t('manager.send')}</button>
      </div>
    </MtModal>
  )
}

// Кнопка «Пусть менеджер подберёт» знает, что запрос уже открыт: тогда она — «Запрос у менеджера · до …» и не жмётся
// (ТЗ §2.8: «повторно отправить нельзя»).
export function managerButtonLabel(view, t, tz, lang) {
  if (view?.status !== 'manager_picking') return t('btn.managerPick')
  const due = schoolTimeToDate(view.managerRequest?.dueAt)
  return due ? t('manager.open', { date: formatDateTime(due, tz, lang) }) : t('manager.openNoDate')
}
