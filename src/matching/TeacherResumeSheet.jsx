import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TeacherPhoto from './TeacherPhoto.jsx'
import { interestLabel } from './interests.js'
import { LEVELS, years } from './teacherFormat.js'
import { useMatchingT } from './texts.js'

function Sheet({ token, data }) {
  const { t, lang } = useMatchingT()
  const c = data.card
  return (
    <article className="mt-resume" aria-label={c.name}>
      <div className="mt-r-left">
        <TeacherPhoto token={token} teacherId={c.id} name={c.name} hasPhoto={c.hasPhoto} className="mt-r-photo" />
        <div>
          <h2 className="mt-h2" style={{ fontSize: 24, color: '#fff' }}>{c.name}</h2>
          <p style={{ opacity: 0.85 }}>{t('pf.role')} · Just to Study</p>
        </div>
        <div className="mt-tags">
          {(c.specializations || []).map((s) => <span key={s} className="mt-tag">{s}</span>)}
          {c.yearsExperience > 0 && <span className="mt-tag">{t('teachers.years', { n: c.yearsExperience })}</span>}
        </div>
        {(c.formats || []).length > 0 && (
          <div>
            <h4>{t('pf.formats')}</h4>
            {c.formats.map((f) => <p key={f}>✓ {t('format.' + f)}</p>)}
          </div>
        )}
        {(c.levels || []).length > 0 && (
          <div>
            <h4>{t('pf.howLevels')}</h4>
            <div className="mt-lvl">{LEVELS.map((l) => <span key={l} className={c.levels.includes(l) ? 'is-on' : ''}>{l}</span>)}</div>
          </div>
        )}
        {(data.languages || []).length > 0 && (
          <div>
            <h4>{t('pf.langs')}</h4>
            {data.languages.map((l, i) => <p key={i}>{l.lang} {l.level && <span style={{ opacity: 0.7 }}>· {l.level}</span>}</p>)}
          </div>
        )}
        {(c.interests || []).length > 0 && (
          <div>
            <h4>{t('pf.interests')}</h4>
            <div className="mt-tags">{c.interests.map((h) => <span key={h} className="mt-tag">{interestLabel(lang, h)}</span>)}</div>
          </div>
        )}
      </div>
      <div className="mt-r-right">
        {c.about && <div><h4>{t('pf.about')}</h4><p>{c.about}</p></div>}
        {(data.experience || []).length > 0 && (
          <div>
            <h4>{t('pf.exp')}</h4>
            <div className="mt-tl">
              {data.experience.map((e, i) => (
                <div key={i} className="mt-tl__it">
                  <div className="mt-row mt-between"><b>{e.title}</b><span className="mt-tiny">{years(e.from, e.to, e.present, t)}</span></div>
                  {e.company && <p className="mt-small" style={{ color: '#9047ff', fontWeight: 700 }}>{e.company}</p>}
                  {e.text && <p className="mt-small mt-muted">{e.text}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-grid2">
          {data.education && (
            <div>
              <h4>{t('pf.edu')}</h4>
              <p><b>{data.education.degree}</b></p>
              <p className="mt-small mt-muted">{[data.education.university, years(data.education.from, data.education.to, false, t)].filter(Boolean).join(' · ')}</p>
            </div>
          )}
          {(data.certificates || []).length > 0 && (
            <div>
              <h4>{t('pf.certs')}</h4>
              {data.certificates.map((x, i) => (
                <p key={i}>🏅 <b>{x.name}</b> <span className="mt-verified">{t('pf.verified')}</span></p>
              ))}
            </div>
          )}
        </div>
        {((data.focus || []).length > 0 || (data.methods || []).length > 0) && (
          <div className="mt-grid2">
            {(data.focus || []).length > 0 && <div><h4>{t('pf.howFocus')}</h4><div className="mt-tags">{data.focus.map((x) => <span key={x} className="mt-tag">{x}</span>)}</div></div>}
            {(data.methods || []).length > 0 && <div><h4>{t('pf.howMethods')}</h4><div className="mt-tags">{data.methods.map((x) => <span key={x} className="mt-tag">{x}</span>)}</div></div>}
          </div>
        )}
        <p className="mt-tiny">{t('pf.resumeFoot')}</p>
      </div>
    </article>
  )
}

// «Резюме (PDF)»: тот же человек листом резюме. Серверный PDF резюме печатает телефон учителя (блок Contact), а
// ученику контакты не положены (ТЗ §2.5), поэтому «Скачать PDF» — печать этого листа браузером: на время печати
// лист уезжает отдельным узлом в body, а всё остальное прячет @media print (matching.css).
export default function TeacherResumeSheet({ token, data }) {
  const { t } = useMatchingT()
  const [printing, setPrinting] = useState(null)

  useEffect(() => {
    if (!printing) return undefined
    document.body.classList.add('mt-printing')
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done)
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', done)
      document.body.classList.remove('mt-printing')
    }
  }, [printing])

  const startPrint = () => {
    const node = document.createElement('div')
    node.className = 'mt mt-print-root'
    document.body.appendChild(node)
    setPrinting(node)
  }

  useEffect(() => () => printing?.remove(), [printing])

  return (
    <div className="mt-stack">
      <Sheet token={token} data={data} />
      <div className="mt-row mt-end">
        <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" onClick={startPrint}>{t('pf.download')}</button>
      </div>
      {printing && createPortal(<Sheet token={token} data={data} />, printing)}
    </div>
  )
}
