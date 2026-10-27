import { useEffect, useState } from 'react'
import { getMatchingTeacher } from '../api.js'
import TeacherPhoto from './TeacherPhoto.jsx'
import TeacherResumeSheet from './TeacherResumeSheet.jsx'
import { MtModal, CloseButton } from './ui.jsx'
import { interestLabel } from './interests.js'
import { slotLabel, sortSlots } from './slots.js'
import { useMatchingT } from './texts.js'
import { LEVELS, levelsRange, years } from './teacherFormat.js'

// Профиль учителя глазами ученика (ТЗ §2.5): вкладки «Профиль» / «Резюме (PDF)». Ни телефона, ни почты, ни «Написать
// в чат» — их нет и в ответе бэкенда. Блоков видео, «результатов студентов» и «как проходят уроки» нет: данных у
// бэкенда пока нет, а ТЗ показывает их только при наличии. «Почему вам подходит» — только в мастере.
export default function TeacherProfileModal({ token, teacherId, mode = 'view', tz, myInterests = [], format, priority = -1, canPick, onPick, onUnpick, onClose }) {
  const { t, lang } = useMatchingT()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState('profile')

  useEffect(() => {
    let alive = true
    getMatchingTeacher(token, teacherId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [token, teacherId])

  const head = (
    <div className="mt-row mt-between">
      <div className="mt-ptabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>
          {t('pf.tabProfile')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'resume'} onClick={() => setTab('resume')}>
          {t('pf.tabResume')}
        </button>
      </div>
      <CloseButton onClick={onClose} />
    </div>
  )

  if (error || !data) {
    return (
      <MtModal full onClose={onClose} label={t('btn.teacherProfile')}>
        {head}
        <p className={error ? '' : 'mt-muted'}>{error ? t('pf.loadError') : t('loading')}</p>
      </MtModal>
    )
  }

  const c = data.card
  const mine = myInterests.map((x) => x.toLowerCase())
  const common = (c.interests || []).filter((h) => mine.includes(h.toLowerCase()))
  const free = sortSlots(c.slots || [], tz)
  const wizard = mode === 'wizard'
  const chosen = priority >= 0

  return (
    <MtModal full onClose={onClose} label={c.name}>
      {head}
      {tab === 'resume' ? (
        <TeacherResumeSheet token={token} data={data} />
      ) : (
        <div className="mt-pf">
          <section className="mt-pf-head">
            <div className="mt-cover" />
            <div className="mt-pf-body">
              <TeacherPhoto token={token} teacherId={c.id} name={c.name} hasPhoto={c.hasPhoto} className="mt-pf-ava" />
              <div className="mt-pf-name">{c.name}</div>
              <div className="mt-row" style={{ justifyContent: 'center' }}>
                {wizard && c.matchPercent > 0 && <span className="mt-pill mt-pill--ok">{t('teachers.match', { n: c.matchPercent })}</span>}
                {c.isNew && <span className="mt-pill">{t('teachers.new')}</span>}
              </div>
              <p className="mt-muted">{[t('pf.role'), ...(c.specializations || [])].join(' · ')}</p>
              <div className="mt-facts">
                {c.yearsExperience > 0 && <span className="mt-fact">🎓 {t('teachers.years', { n: c.yearsExperience })}</span>}
                {c.ageGroup && <span className="mt-fact">👤 {c.ageGroup}</span>}
                {(c.studentAgeGroups || []).length > 0 && (
                  <span className="mt-fact">{t('teachers.studentAge')}: {c.studentAgeGroups.map((a) => t('studentAge.' + a)).join(', ')}</span>
                )}
                {(c.languages || []).length > 0 && <span className="mt-fact">🗣 {c.languages.join(', ')}</span>}
                {(c.formats || []).length > 0 && <span className="mt-fact">📚 {c.formats.map((f) => t('format.' + f)).join(' · ')}</span>}
              </div>
              <div className="mt-tiles">
                {c.sinceYear && <div className="mt-tile"><b>{c.sinceYear}</b><span>{t('pf.since')}</span></div>}
                {levelsRange(c.levels) && <div className="mt-tile"><b>{levelsRange(c.levels)}</b><span>{t('pf.levels')}</span></div>}
              </div>
            </div>
          </section>

          {wizard && (free.length > 0 || common.length > 0 || format) && (
            <section className="mt-sec mt-sec--why">
              <h3 className="mt-h3">{t('pf.why')}</h3>
              {free.length > 0 && (
                <>
                  <p className="mt-small"><b>{t('pf.whyFree')}</b></p>
                  <div className="mt-slots-mini">{free.map((s) => <span key={s.weekday + s.start}>✓ {slotLabel(s, tz, lang)}</span>)}</div>
                </>
              )}
              {common.length > 0 && <p className="mt-small"><b>{t('pf.whyInterests')}</b> {common.map((h) => interestLabel(lang, h)).join(', ')}</p>}
              {format && (c.formats || []).includes(format) && <p className="mt-small"><b>{t('pf.whyFormat')}</b> {t('format.' + format)} ✓</p>}
            </section>
          )}

          {c.about && (
            <section className="mt-sec">
              <h3 className="mt-h3">{t('pf.about')}</h3>
              <p>{c.about}</p>
            </section>
          )}

          {(c.interests || []).length > 0 && (
            <section className="mt-sec">
              <h3 className="mt-h3">{t('pf.interests')}</h3>
              <div className="mt-tags">
                {c.interests.map((h) => (
                  <span key={h} className={`mt-tag ${mine.includes(h.toLowerCase()) ? 'mt-tag--hit' : ''}`} style={{ fontSize: 13, padding: '4px 10px' }}>
                    {interestLabel(lang, h)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {(data.certificates || []).length > 0 && (
            <section className="mt-sec">
              <h3 className="mt-h3">{t('pf.certs')}</h3>
              <div className="mt-row">
                {data.certificates.map((x, i) => (
                  <div key={i} className="mt-cert">
                    <span>🏅 <b>{x.name}</b></span>
                    {(x.issuedBy || x.year) && <span className="mt-tiny">{[x.issuedBy, x.year].filter(Boolean).join(' · ')}</span>}
                    <span className="mt-verified">{t('pf.verified')}</span>
                  </div>
                ))}
              </div>
              <p className="mt-tiny">{t('pf.certsNote')}</p>
            </section>
          )}

          {(data.experience || []).length > 0 && (
            <section className="mt-sec">
              <h3 className="mt-h3">{t('pf.exp')}</h3>
              <div className="mt-tl">
                {data.experience.map((e, i) => (
                  <div key={i} className="mt-tl__it">
                    <div className="mt-row mt-between"><b>{e.title}</b><span className="mt-tiny">{years(e.from, e.to, e.present, t)}</span></div>
                    {e.company && <p className="mt-small" style={{ color: 'var(--mt-brand)', fontWeight: 700 }}>{e.company}</p>}
                    {e.text && <p className="mt-small mt-muted">{e.text}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(data.education || (data.languages || []).length > 0) && (
            <div className="mt-grid2">
              {data.education && (
                <section className="mt-sec">
                  <h3 className="mt-h3">{t('pf.edu')}</h3>
                  <div className="mt-lst">
                    <div className="mt-li">
                      <span className="mt-li__ic">🎓</span>
                      <div className="mt-li__grow">
                        <b>{data.education.degree}</b>
                        <p className="mt-small mt-muted">{[data.education.university, years(data.education.from, data.education.to, false, t)].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {(data.languages || []).length > 0 && (
                <section className="mt-sec">
                  <h3 className="mt-h3">{t('pf.langs')}</h3>
                  <div className="mt-lst">
                    {data.languages.map((l, i) => (
                      <div key={i} className="mt-li">
                        <span className="mt-li__ic">{String(l.lang || '').slice(0, 2)}</span>
                        <div className="mt-li__grow"><b>{l.lang}</b></div>
                        {l.level && <span className="mt-pill mt-pill--gray">{l.level}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {((c.levels || []).length > 0 || (data.focus || []).length > 0 || (data.methods || []).length > 0) && (
            <section className="mt-sec">
              <h3 className="mt-h3">{t('pf.how')}</h3>
              <div className="mt-lst">
                {(c.levels || []).length > 0 && (
                  <div className="mt-li">
                    <span className="mt-li__ic">◎</span>
                    <div className="mt-li__grow"><b>{t('pf.howLevels')}</b></div>
                    <div className="mt-lvl">{LEVELS.map((l) => <span key={l} className={c.levels.includes(l) ? 'is-on' : ''}>{l}</span>)}</div>
                  </div>
                )}
                {(data.focus || []).length > 0 && (
                  <div className="mt-li"><span className="mt-li__ic">✦</span><div className="mt-li__grow"><b>{t('pf.howFocus')}</b></div><span className="mt-small">{data.focus.join(', ')}</span></div>
                )}
                {(data.methods || []).length > 0 && (
                  <div className="mt-li"><span className="mt-li__ic">⚙</span><div className="mt-li__grow"><b>{t('pf.howMethods')}</b></div><span className="mt-small">{data.methods.join(', ')}</span></div>
                )}
              </div>
            </section>
          )}

          {wizard && (
            <div className="mt-cta">
              <div className="mt-row">
                <TeacherPhoto token={token} teacherId={c.id} name={c.name} hasPhoto={c.hasPhoto} />
                <div>
                  <b>{c.name}</b>
                  <div className="mt-tiny">{chosen ? t('pf.inList', { n: priority + 1 }) : t('pf.canPick')}</div>
                </div>
              </div>
              {chosen ? (
                <button type="button" className="mt-btn mt-btn--line" onClick={() => onUnpick?.(c.id)}>{t('pf.unpick')}</button>
              ) : (
                <button type="button" className="mt-btn" aria-disabled={!canPick} onClick={() => onPick?.(c.id)}>{t('pf.pick')}</button>
              )}
            </div>
          )}
        </div>
      )}
    </MtModal>
  )
}
