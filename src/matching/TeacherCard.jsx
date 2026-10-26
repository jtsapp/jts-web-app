import TeacherPhoto from './TeacherPhoto.jsx'
import { interestLabel } from './interests.js'
import { slotLabel, sortSlots } from './slots.js'
import { useMatchingT } from './texts.js'

// Карточка учителя на шаге «Учителя» (ТЗ §2.4). Числа текущих учеников здесь нет намеренно — его ученику не
// показываем (и бэкенд его ученику не отдаёт). «Подходит ваше время» — совпавшие слоты из ответа сервера.
export default function TeacherCard({ token, teacher, tz, pickedTotal, priority, canPick, myInterests, onPick, onUnpick, onProfile }) {
  const { t, lang } = useMatchingT()
  const chosen = priority >= 0
  const meta = [
    teacher.yearsExperience ? t('teachers.years', { n: teacher.yearsExperience }) : null,
    (teacher.specializations || []).join(', ') || null,
    teacher.sinceYear ? t('teachers.since', { y: teacher.sinceYear }) : null,
  ].filter(Boolean)
  const fit = sortSlots(teacher.slots || [], tz)
  return (
    <article className={`mt-card mt-tcard ${chosen ? 'mt-tcard--sel' : ''}`}>
      <TeacherPhoto token={token} teacherId={teacher.id} name={teacher.name} hasPhoto={teacher.hasPhoto} className="mt-ava mt-ava--lg" />
      <div className="mt-stack" style={{ gap: 8 }}>
        <div className="mt-row">
          <h2 className="mt-h2">{teacher.name}</h2>
          <span className="mt-match">{t('teachers.match', { n: teacher.matchPercent })}</span>
          {teacher.isNew && <span className="mt-pill">{t('teachers.new')}</span>}
        </div>
        {meta.length > 0 && <p className="mt-small mt-muted">{meta.join(' · ')}</p>}
        {fit.length > 0 && (
          <p className="mt-small mt-fit">
            <b>{t('teachers.fit')}</b> {fit.map((s) => slotLabel(s, tz, lang)).join(', ')}{' '}
            <span className="mt-tiny">{t('teachers.fitOf', { k: fit.length, m: pickedTotal })}</span>
          </p>
        )}
        {teacher.about && <p className="mt-small mt-clamp2">{teacher.about}</p>}
        {(teacher.interests || []).length > 0 && (
          <div className="mt-tags">
            {teacher.interests.map((h) => (
              <span key={h} className={`mt-tag ${myInterests.some((x) => x.toLowerCase() === h.toLowerCase()) ? 'mt-tag--hit' : ''}`}>
                {interestLabel(lang, h)}
              </span>
            ))}
          </div>
        )}
        {(teacher.formats || []).length > 0 && (
          <div className="mt-tags">
            {teacher.formats.map((f) => (
              <span key={f} className="mt-tag">{t('format.' + f)}</span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-tcard__act">
        {chosen ? (
          <>
            <div className="mt-row" style={{ justifyContent: 'center' }}>
              <span className="mt-prio" aria-label={t('teachers.prio', { n: priority + 1 })}>{priority + 1}</span>
            </div>
            <button type="button" className="mt-btn mt-btn--line mt-btn--sm" onClick={() => onUnpick(teacher.id)}>
              {t('btn.unpick')}
            </button>
          </>
        ) : (
          // Не disabled, а aria-disabled: на 4-го учителя ТЗ §2.4 просит тост «Можно выбрать до 3…», а у
          // выключенной кнопки клика нет вовсе.
          <button type="button" className="mt-btn mt-btn--sm" aria-disabled={!canPick} onClick={() => onPick(teacher.id)}>
            {t('btn.pick')}
          </button>
        )}
        <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" onClick={() => onProfile(teacher.id)}>
          {t('btn.profile')}
        </button>
      </div>
    </article>
  )
}
