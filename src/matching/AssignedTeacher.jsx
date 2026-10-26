import TeacherPhoto from './TeacherPhoto.jsx'
import { useTeacher } from './useTeacher.js'
import { interestLabel } from './interests.js'
import { formatDateTime, schoolTimeToDate, slotLabel, sortSlots } from './slots.js'
import { zoneTitle } from './TimezoneModal.jsx'
import { useMatchingT } from './texts.js'

// «Мой учитель» с назначенным учителем (ТЗ §2.9): карточка без «Написать в чат», расписание в поясе ученика,
// формат с «Сменить формат» (у гарантии — пометка и текст без кнопки) и «Что-то не так? → Сменить учителя».
export default function AssignedTeacher({ token, view, tz, onProfile, onChangeFormat, onChangeTeacher }) {
  const { t, lang } = useMatchingT()
  const a = view.assignment
  const teacher = useTeacher(token, a?.teacherId)
  if (!a) return null
  const c = teacher?.card
  const lockedUntil = schoolTimeToDate(view.limits.formatChangeAvailableAt)
  const meta = [(c?.specializations || []).join(', '), c?.yearsExperience ? t('assigned.years', { n: c.yearsExperience }) : null].filter(Boolean)
  return (
    <div className="mt-grid2">
      <div className="mt-card mt-stack">
        <div className="mt-row">
          <TeacherPhoto token={token} teacherId={a.teacherId} name={a.teacherName} hasPhoto={c?.hasPhoto ?? true} className="mt-ava mt-ava--lg" />
          <div>
            <h2 className="mt-h2">{a.teacherName}</h2>
            {meta.length > 0 && <p className="mt-small mt-muted">{meta.join(' · ')}</p>}
          </div>
        </div>
        {c?.about && <p className="mt-small">{c.about}</p>}
        {(c?.interests || []).length > 0 && (
          <div className="mt-tags">
            {c.interests.map((h) => (
              <span key={h} className={`mt-tag ${view.interests.some((x) => x.toLowerCase() === h.toLowerCase()) ? 'mt-tag--hit' : ''}`}>{interestLabel(lang, h)}</span>
            ))}
          </div>
        )}
        <div className="mt-row">
          <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" onClick={() => onProfile(a.teacherId)}>{t('btn.teacherProfile')}</button>
        </div>
      </div>
      <div className="mt-stack">
        <div className="mt-card mt-stack">
          <h3 className="mt-h3">{t('assigned.lessons')}</h3>
          {sortSlots(a.slots, tz).map((s) => (
            <div key={s.weekday + s.start} className="mt-row mt-between">
              <b>{slotLabel(s, tz, lang)}</b>
              <span className="mt-tiny">{t('assigned.min', { n: a.duration })}</span>
            </div>
          ))}
          <p className="mt-tiny">{zoneTitle(tz)}</p>
        </div>
        <div className="mt-card mt-stack">
          <div className="mt-row mt-between">
            <h3 className="mt-h3">{t('assigned.format')}</h3>
            {view.tariff.guarantee && <span className="mt-pill mt-pill--gray">{t('assigned.guaranteeChip')}</span>}
          </div>
          <p><b>{t('format.' + (a.format || 'platform'))}</b></p>
          {view.tariff.guarantee ? (
            <p className="mt-small mt-muted">{t('assigned.guaranteeText')}</p>
          ) : (
            <>
              <button type="button" className="mt-btn mt-btn--line mt-btn--sm" style={{ alignSelf: 'flex-start' }} disabled={!!lockedUntil} onClick={onChangeFormat}>
                {t('assigned.changeFormat')}
              </button>
              {lockedUntil && <p className="mt-tiny">{t('assigned.formatLocked', { date: formatDateTime(lockedUntil, tz, lang, { withTime: false }) })}</p>}
            </>
          )}
        </div>
        <div className="mt-card mt-stack">
          <h3 className="mt-h3">{t('assigned.wrong')}</h3>
          <p className="mt-small mt-muted">{t('assigned.wrongText')}</p>
          <button type="button" className="mt-btn mt-btn--bad mt-btn--sm" style={{ alignSelf: 'flex-start' }} disabled={view.status === 'change_pending'} onClick={onChangeTeacher}>
            {t('assigned.changeTeacher')}
          </button>
        </div>
      </div>
    </div>
  )
}
