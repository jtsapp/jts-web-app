import { useEffect, useState } from 'react'
import { getSatProfile, saveSatProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { AboutChapter, CHAPTERS, DatePicker, GoalPicker, SectionChapter, StructureChapter, chapterData } from '../sat/onboarding/chapters.jsx'
import { pick, roundSection } from '../sat/model/profile.js'
import { ArrowForwardIcon, ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'

// Цель по умолчанию — как на макете (Figma 3): 650 + 700 = 1350, середина типичных целей
const DEFAULT_TARGET = { rw: 650, math: 700 }
// Широкие главы — цель и дата: у них две колонки / сетка листков (Figma 3–6); остальные — узкая колонка
const WIDE = new Set(['examday', 'verbal', 'math'])

/**
 * Онбординг SAT (Figma SAT 1–6): шесть глав, по одной на экран, учит раньше, чем спрашивает. Пропустить нельзя —
 * так решил JTS (README прототипа). Цель и дата сохраняются в профиль на своих главах, последняя кнопка отмечает
 * главы пройденными и ведёт в диагностику — она обязательна для всех и строит план (экран диагностики — фаза 4).
 * Ничто не блокирует молча: без даты «Дальше» говорит почему.
 */
export default function SatOnboardingPage({ token, onExit, onDiagnostic }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const [date, setDate] = useState({ examDate: null, dateUndecided: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // повторный заход — сохранённые цель и дата уже стоят
  useEffect(() => {
    let alive = true
    getSatProfile(authToken)
      .then((p) => {
        if (!alive || !p?.exists) return
        if (p.targetRw && p.targetMath) setTarget({ rw: p.targetRw, math: p.targetMath })
        setDate({ examDate: p.examDate, dateUndecided: !!p.dateUndecided })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [authToken])

  const id = CHAPTERS[step]
  const last = step === CHAPTERS.length - 1

  const save = async (body) => {
    setBusy(true)
    setError(null)
    try {
      await saveSatProfile(authToken, body)
      return true
    } catch {
      setError(t('sat.saveError'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    if (id === 'goal') {
      const rw = roundSection(target.rw)
      const math = roundSection(target.math)
      setTarget({ rw, math })
      if (!(await save({ targetRw: rw, targetMath: math }))) return
    }
    if (id === 'examday') {
      if (!date.examDate && !date.dateUndecided) {
        setError(t('sat.date.pickFirst'))
        return
      }
      if (!(await save(date.dateUndecided ? { dateUndecided: true } : { examDate: date.examDate }))) return
    }
    if (last) {
      if (await save({ onboardingStepsDone: true, explainLang: lang })) onDiagnostic?.()
      return
    }
    setError(null)
    setStep(step + 1)
    // новая глава начинается со своего верха, а не с середины (README прототипа)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const back = () => {
    setError(null)
    if (step === 0) onExit?.()
    else setStep(step - 1)
  }

  const ch = chapterData(id)
  const lead = id === 'goal' || id === 'examday' ? t(`sat.ob.lead.${id}`) : pick(ch.lead, lang)
  let body
  if (id === 'about') body = <AboutChapter />
  else if (id === 'structure') body = <StructureChapter />
  else if (id === 'goal') body = <GoalPicker rw={target.rw} math={target.math} onChange={setTarget} />
  else if (id === 'examday') body = <DatePicker value={date.examDate} undecided={date.dateUndecided} onChange={(v) => { setDate(v); setError(null) }} />
  else body = <SectionChapter id={id} />
  const note = { about: 'sat.ob.note.about', goal: 'sat.ob.note.goal', examday: 'sat.ob.note.examday' }[id]

  return (
    <div className="ih st st-ob">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <b className="st-ob__logo">just to study</b>
        <span className="ih-chip ih-chip--violet ih-chip--sm"><span>SAT</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={() => onExit?.()}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <main key={id} className={`st-ob__main ${id === 'goal' ? 'is-xwide' : WIDE.has(id) ? 'is-wide' : ''} ${step > 0 ? 'ih-enter' : ''}`}>
        <div className="st-ob__progress" aria-hidden="true">{CHAPTERS.map((c, i) => <span key={c} className={i <= step ? 'is-on' : ''} />)}</div>
        <p className="st-ob__step">{t('sat.ob.step', { n: String(step + 1), total: String(CHAPTERS.length) })}</p>
        <span className={`st-ob__chip st-ob__chip--${ch.section || 'violet'}`}>{t(`sat.ob.chip.${id}`)}</span>
        <h1>{t(`sat.ob.title.${id}`)}</h1>
        <p className="st-ob__lead">{lead}</p>
        {body}
        {error && <p className="st-error" role="alert">{error}</p>}
        <div className="st-ob__actions">
          {step > 0 && <button type="button" className="ih-btn ih-btn--outline st-ob__back" onClick={back}><ChevronLeftIcon size={18} />{t('sat.ob.back')}</button>}
          <span className="st-spacer" />
          {note && <span className="st-muted">{t(note)}</span>}
          <button type="button" className="ih-cta st-ob__next" onClick={next} disabled={busy}>
            {t(`sat.ob.next.${id}`)}<ArrowForwardIcon size={20} />
          </button>
        </div>
      </main>
    </div>
  )
}
