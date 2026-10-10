import { useEffect, useMemo, useState } from 'react'
import { getIeltsProfile, saveIeltsProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import {
  DAILY, DAILY_DEFAULT, FAMILIARITY, GAP_UNMEASURED, PURPOSES, QUIZ, QUIZ_PASS, STEPS, TARGETS, TARGET_DEFAULT, TRACKS, WINDOWS,
  estimateTerm, fitsExam, onboardingBody,
} from '../ielts/onboarding/onboarding.js'
import {
  ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, CloseIcon, EventIcon, HelpIcon, InfoIcon, MenuBookIcon, QuizIcon, RadioOffIcon, ScheduleIcon, TaskAltIcon,
} from '../ielts/icons.jsx'
import { plural } from '../lib/plural.js'

// Иллюстрации карточек 1.1–1.2 — из макета Figma (слой картинок), пережаты в WebP с альфой: лежат поверх цветной карточки
const PURPOSE_IMG = { study: 'study', immigration: 'abroad', work: 'work', school: 'school' }
const FAMILIARITY_ICON = { new: MenuBookIcon, some: QuizIcon, exp: TaskAltIcon }
const Radio = ({ on }) => <span className="ih-obopt__radio">{on ? <CheckCircleIcon size={22} /> : <RadioOffIcon size={22} />}</span>

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Месяц календаря с понедельника (Figma 1.4). Прошедшие дни недоступны: дата экзамена — только будущая.
function Calendar({ value, onChange, lang }) {
  const today = new Date(new Date().toDateString())
  const [month, setMonth] = useState(() => {
    const v = value ? new Date(`${value}T00:00:00`) : today
    return new Date(v.getFullYear(), v.getMonth(), 1)
  })
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = (month.getDay() + 6) % 7
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  // «октябрь 2026 г.» из Intl → «Октябрь 2026», как в макете: месяц в именительном, без «г.»
  const monthName = new Intl.DateTimeFormat(loc, { month: 'long' }).format(month)
  const title = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${month.getFullYear()}`
  const wd = new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { weekday: 'short' })
  const monday = new Date(2024, 0, 1)
  return (
    <div className="ih-cal">
      <div className="ih-cal__head">
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="‹"><ChevronLeftIcon size={18} /></button>
        <b>{title}</b>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="›"><ChevronRightIcon size={18} /></button>
      </div>
      <div className="ih-cal__grid">
        {Array.from({ length: 7 }, (_, i) => <span key={`w${i}`} className="ih-cal__wd">{wd.format(new Date(monday.getTime() + i * 86400000))}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1)
          const v = iso(d)
          return (
            <button key={v} type="button" disabled={d < today} className={`ih-cal__day ${value === v ? 'is-on' : ''}`} onClick={() => onChange(v)}>{i + 1}</button>
          )
        })}
      </div>
    </div>
  )
}

function Option({ on, title, hint, chip, icon, onClick, children }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`ih-obopt ${on ? 'is-on' : ''}`} onClick={onClick}>
      {icon && <span className="ih-obopt__icon">{icon}</span>}
      <span className="ih-obopt__body">
        <b>{title}{chip && <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{chip}</span></span>}</b>
        {hint && <span>{hint}</span>}
        {children}
      </span>
      <Radio on={on} />
    </button>
  )
}

// Большая карточка с иллюстрацией (Figma 1.1 — картинка слева сверху, 1.2 — по центру, с чипом и плашкой «что внутри»)
function ImageCard({ on, img, title, hint, chip, note, big, onClick }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`ih-obcard ${big ? 'ih-obcard--big' : ''} ${on ? 'is-on' : ''}`} onClick={onClick}>
      <span className="ih-obcard__top">
        {!big && <img src={`/ielts/onboarding/${img}.webp`} alt="" width={96} height={96} />}
        {big && (chip ? <span className="ih-obcard__chip">{chip}</span> : <span />)}
        <Radio on={on} />
      </span>
      {big && <img className="ih-obcard__art" src={`/ielts/onboarding/${img}.webp`} alt="" width={168} height={168} />}
      <b className="ih-obcard__title">{title}</b>
      <span className="ih-obcard__hint">{hint}</span>
      {note && <span className="ih-obcard__note"><InfoIcon size={16} />{note}</span>}
    </button>
  )
}

/**
 * Онбординг IELTS (Figma 1.1–1.6): зачем, трек, целевой балл, дата экзамена, время в день, знакомство с форматом.
 * Ответы ложатся в профиль бэкенда; дальше — по знакомству: «впервые» — инструкция о формате и облегчённая
 * диагностика, «что-то знаю» — квиз из шести вопросов, «сдавал» — сразу полная диагностика.
 */
export default function IeltsOnboardingPage({ token, onExit, onDiagnostic }) {
  const { t, lang } = useI18n()
  const P = (k, v) => t(`ieltsOb.p.${k}`, v)
  const authToken = token || loadToken()
  const [step, setStep] = useState(0)
  // targetUnknown — выбрана карточка «Пока не знаю»: балл тот же 6.5, но отмечена должна быть она, а не плитка 6.5
  const [f, setF] = useState({ target: null, daily: DAILY_DEFAULT, window: null, targetUnknown: false })
  const [phase, setPhase] = useState('steps') // steps | guide | quiz | quizResult
  const [guidePage, setGuidePage] = useState(1)
  const [quiz, setQuiz] = useState({})
  const [quizIdx, setQuizIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // повторный онбординг — ответы прошлого раза подставлены
  useEffect(() => {
    let alive = true
    getIeltsProfile(authToken)
      .then((p) => {
        if (!alive || !p?.onboarded) return
        setF({
          purpose: p.purpose, track: p.track, target: p.targetBand, examDate: p.examDate,
          window: p.examWindow === 'date' ? 'date' : p.examWindow, daily: p.dailyMinutes || DAILY_DEFAULT, familiarity: p.familiarity,
        })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [authToken])

  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const key = STEPS[step]
  const recommend = PURPOSES.find((p) => p.id === f.purpose)?.recommend
  const target = f.target ?? TARGET_DEFAULT
  const ready = { purpose: !!f.purpose, track: !!f.track, target: f.target != null, date: f.window === 'date' ? !!f.examDate : !!f.window, daily: !!f.daily, familiarity: !!f.familiarity }[key]
  const daysLeft = useMemo(() => (f.examDate ? Math.round((new Date(`${f.examDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) : null), [f.examDate])
  const dateLabel = (v) => new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${v}T00:00:00`)).replace(/\s?г\.$/, '')

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveIeltsProfile(authToken, onboardingBody(f))
      const next = FAMILIARITY.find((x) => x.id === f.familiarity)?.next
      if (next === 'guide') setPhase('guide')
      else if (next === 'quiz') setPhase('quiz')
      else onDiagnostic?.()
    } catch (e) {
      setError(e?.message || t('ieltsReading.errorText'))
    }
    setBusy(false)
  }

  const next = () => (step + 1 < STEPS.length ? setStep(step + 1) : finish())
  const back = () => (phase !== 'steps' ? setPhase('steps') : step > 0 ? setStep(step - 1) : onExit?.())

  let body
  if (phase === 'guide') {
    const n = guidePage
    body = (
      <>
        <h1>{P('guide.title')}</h1>
        <p className="ih-ob__sub">{P('guide.sub')}</p>
        <section className="ih-card ih-ob__guide">
          <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{n} / 9</span></span>
          <h2>{P(`guide.s${n}.title`)}</h2>
          {[1, 2, 3, 4, 5].map((i) => {
            const text = t(`ieltsOb.p.guide.s${n}.p${i}`)
            return text && !text.startsWith('ieltsOb.') ? <p key={i}>{text}</p> : null
          })}
        </section>
        <div className="ih-ob__actions">
          {n > 1 && <button type="button" className="ih-btn ih-btn--outline" onClick={() => setGuidePage(n - 1)}>{t('ieltsReading.back')}</button>}
          <button type="button" className="ih-cta" onClick={() => (n < 9 ? setGuidePage(n + 1) : onDiagnostic?.())}>{n < 9 ? t('ieltsSpeaking.next') : P('ob.done.toDiagnostic')}</button>
        </div>
      </>
    )
  } else if (phase === 'quiz' || phase === 'quizResult') {
    const score = QUIZ.filter((c, i) => quiz[i] === c).length
    const done = phase === 'quizResult'
    // как в прототипе: вопрос на экран с прогрессом и «Назад»; в разборе — только ошибки с объяснением
    const i = quizIdx
    const last = i === QUIZ.length - 1
    const wrong = QUIZ.map((c, k) => k).filter((k) => quiz[k] !== QUIZ[k])
    body = done ? (
      <>
        <h1>{P('quiz.resultTitle')}</h1>
        <p className="ih-ob__sub">{P('quiz.score', { n: String(score), total: String(QUIZ.length) })} · {P(score >= QUIZ_PASS ? 'quiz.passA' : 'quiz.failA')}</p>
        {wrong.map((k) => (
          <section key={k} className="ih-card ih-ob__q">
            <b>{k + 1}. {P(`quiz.a${k + 1}.q`)}</b>
            <p className="ih-ob__qans">
              {quiz[k] != null && <span className="is-wrong">{P('quiz.yours')}: {P(`quiz.a${k + 1}.o${quiz[k]}`)}</span>}
              <span className="is-right">{P('quiz.right')}: {P(`quiz.a${k + 1}.o${QUIZ[k]}`)}</span>
            </p>
            <p className="ih-muted">{P(`quiz.a${k + 1}.ex`)}</p>
          </section>
        ))}
        <div className="ih-ob__actions">
          {score >= QUIZ_PASS ? (
            <button type="button" className="ih-cta" onClick={() => onDiagnostic?.()}>{P('ob.done.toDiagnostic')}</button>
          ) : (
            <>
              <button type="button" className="ih-btn ih-btn--outline" onClick={() => onDiagnostic?.()}>{P('ob.done.toDiagnostic')}</button>
              <button type="button" className="ih-cta" onClick={() => setPhase('guide')}>{P('quiz.toGuide')}</button>
            </>
          )}
        </div>
      </>
    ) : (
      <>
        <h1>{P('quiz.titleA')}</h1>
        <p className="ih-ob__sub">{P('quiz.subA')}</p>
        <div className="ih-ob__qprog">
          <span>{P('quiz.progress', { n: String(i + 1), total: String(QUIZ.length) })}</span>
          <i><i style={{ width: `${((i + 1) / QUIZ.length) * 100}%` }} /></i>
        </div>
        <section className="ih-card ih-ob__q">
          <h2>{P(`quiz.a${i + 1}.q`)}</h2>
          <div className="ih-ob__qopts" role="radiogroup">
            {[1, 2, 3, 4].map((o) => (
              <button key={o} type="button" role="radio" aria-checked={quiz[i] === o} className={`ih-qopt ${quiz[i] === o ? 'is-on' : ''}`} onClick={() => setQuiz((q) => ({ ...q, [i]: o }))}>
                <span className="ih-ob__qnum">{o}</span>
                {P(`quiz.a${i + 1}.o${o}`)}
              </button>
            ))}
          </div>
        </section>
        <div className="ih-ob__actions">
          {i > 0 && <button type="button" className="ih-btn ih-btn--outline" onClick={() => setQuizIdx(i - 1)}>{t('ieltsReading.back')}</button>}
          <button type="button" className="ih-cta" disabled={quiz[i] == null} onClick={() => (last ? setPhase('quizResult') : setQuizIdx(i + 1))}>
            {last ? t('ieltsOb.checkQuiz') : t('ieltsOb.continue')}
          </button>
        </div>
      </>
    )
  } else {
    let options = null
    if (key === 'purpose')
      options = (
        <div className="ih-obcards">
          {PURPOSES.map((p) => (
            <ImageCard key={p.id} on={f.purpose === p.id} img={PURPOSE_IMG[p.id]} title={t(`ieltsOb.purpose.${p.id}`)} hint={t(`ieltsOb.purposeHint.${p.id}`)} onClick={() => set({ purpose: p.id, track: f.track || p.recommend })} />
          ))}
        </div>
      )
    else if (key === 'track')
      options = (
        <>
          <div className="ih-obcards">
            {TRACKS.map((tr) => (
              <ImageCard key={tr} big on={f.track === tr} img={tr} title={P(`ob.goal.${tr}`)} hint={P(`ob.goal.${tr}Hint`)} chip={recommend === tr ? P('ob.goal.recommend') : null} note={t(`ieltsOb.trackMore.${tr}`)} onClick={() => set({ track: tr })} />
            ))}
          </div>
          <p className="ih-ob__hint"><InfoIcon size={16} />{P('ob.goal.canChange')}</p>
        </>
      )
    else if (key === 'target')
      options = (
        <>
          <div className="ih-obgrid">
            {TARGETS.map((b) => (
              <button key={b} type="button" role="radio" aria-checked={f.target === b && !f.targetUnknown} className={`ih-obband ${f.target === b && !f.targetUnknown ? 'is-on' : ''}`} onClick={() => set({ target: b, targetUnknown: false })}>
                <span className="ih-obband__top">
                  <b>{b === 8 ? '8.0+' : b.toFixed(1)}</b>
                  <Radio on={f.target === b && !f.targetUnknown} />
                </span>
                <span>{t(`ieltsOb.targetHint.${String(b).replace('.', '_')}`)}</span>
              </button>
            ))}
          </div>
          <Option on={!!f.targetUnknown} icon={<HelpIcon size={22} />} title={t('ieltsOb.targetUnknownTitle')} hint={t('ieltsOb.targetUnknownHint')} onClick={() => set({ target: TARGET_DEFAULT, targetUnknown: true })} />
        </>
      )
    else if (key === 'date')
      options = (
        <>
          {/* Календарь внутри карточки, как в макете. Карточка тогда не кнопка, а блок: кнопки дней внутри кнопки —
              невалидный HTML. Выбирает карточку её шапка. */}
          <div className={`ih-obopt ih-obopt--date ${f.window === 'date' ? 'is-on' : ''}`}>
            <button type="button" role="radio" aria-checked={f.window === 'date'} className="ih-obopt__head" onClick={() => set({ window: 'date' })}>
              <span className="ih-obopt__cal-icon"><EventIcon size={22} /></span>
              <span className="ih-obopt__body">
                <b>{t('ieltsOb.dateKnown')}</b>
                {f.examDate && f.window === 'date' && <span className="ih-obopt__date">{dateLabel(f.examDate)} · {plural(t, lang, 'ieltsOb.daysLeftN', daysLeft)}</span>}
              </span>
              <Radio on={f.window === 'date'} />
            </button>
            {f.window === 'date' && <Calendar value={f.examDate} onChange={(v) => set({ examDate: v, window: 'date' })} lang={lang} />}
          </div>
          {WINDOWS.map((w) => <Option key={w} on={f.window === w} title={t(`ieltsOb.window.${w}`)} hint={t(`ieltsOb.windowHint.${w}`)} onClick={() => set({ window: w, examDate: null })} />)}
        </>
      )
    else if (key === 'daily') {
      const gap = Math.max(0.5, Math.min(GAP_UNMEASURED, target - 5.5))
      options = (
        <>
          <div className="ih-obdaily">
            {DAILY.map((m) => {
              const term = estimateTerm(gap, m)
              const n = String(term.months).replace('.', lang === 'en' ? '.' : ',')
              // «3,5 месяца»: у дробного числа форма как у «нескольких», у целого — по обычным правилам
              const termText = term.long
                ? t('ieltsOb.termLong')
                : Number.isInteger(term.months)
                  ? plural(t, lang, 'ieltsOb.termToGoal', term.months)
                  : t('ieltsOb.termToGoal.few', { n })
              const on = f.daily === m
              return (
                <button key={m} type="button" role="radio" aria-checked={on} className={`ih-obday ${on ? 'is-on' : ''}`} onClick={() => set({ daily: m })}>
                  <span className="ih-obday__top">
                    <span className="ih-obday__icon"><ScheduleIcon size={22} /></span>
                    <b>{P(`ob.goal.d${m}`)}</b>
                    <Radio on={on} />
                  </span>
                  <span className="ih-obday__pace">
                    {t(`ieltsOb.pace.${m}`)}
                    {m === DAILY_DEFAULT && <span className="ih-obcard__chip">{t('ieltsOb.recommended')}</span>}
                  </span>
                  <span className="ih-obday__term">{termText}</span>
                </button>
              )
            })}
          </div>
          {f.examDate && (() => {
            const fits = fitsExam(estimateTerm(gap, f.daily), f.examDate)
            return (
              <p className={`ih-ob__note ${fits ? 'is-ok' : 'is-warn'}`}>
                {fits ? <CheckCircleIcon size={20} /> : <InfoIcon size={20} />}
                <span>{t(fits ? 'ieltsOb.fits' : 'ieltsOb.notFits', { date: dateLabel(f.examDate) })}</span>
              </p>
            )
          })()}
          <p className="ih-muted">{t('ieltsOb.estimateNote')}</p>
        </>
      )
    } else if (key === 'familiarity')
      options = (
        <>
          {FAMILIARITY.map((x) => {
            const Ico = FAMILIARITY_ICON[x.id]
            return <Option key={x.id} on={f.familiarity === x.id} icon={<Ico size={24} />} title={P(`ob.familiar.${x.id}`)} hint={P(`ob.familiar.${x.id}Hint`)} onClick={() => set({ familiarity: x.id })} />
          })}
          <section className="ih-ob__summary">
            <b>{t('ieltsOb.yourAnswers')}</b>
            <div>
              {f.purpose && <span className="ih-ob__chip">{t(`ieltsOb.purpose.${f.purpose}`)}</span>}
              {f.track && <span className="ih-ob__chip">{P(`ob.goal.${f.track}`)}</span>}
              <span className="ih-ob__chip">{t('ieltsOb.goalChip', { n: target.toFixed(1) })}</span>
              <span className="ih-ob__chip">{f.examDate ? dateLabel(f.examDate) : t(`ieltsOb.window.${f.window || 'unknown'}`)}</span>
              <span className="ih-ob__chip">{P(`ob.goal.d${f.daily}`)}</span>
            </div>
          </section>
        </>
      )
    body = (
      <>
        <div className="ih-ob__progress" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i <= step ? 'is-on' : ''} />)}</div>
        <p className="ih-ob__step">{P('ob.step', { n: String(step + 1), total: String(STEPS.length) })}</p>
        <h1>{t(`ieltsOb.title.${key}`)}</h1>
        <p className="ih-ob__sub">{t(`ieltsOb.sub.${key}`)}</p>
        <div className="ih-ob__options" role="radiogroup">{options}</div>
        {error && <p className="ih-run__error" role="alert">{error}</p>}
        <div className="ih-ob__actions">
          <button type="button" className="ih-cta ih-ob__cta" disabled={!ready || busy} onClick={next}>
            {key === 'familiarity' && f.familiarity ? t(`ieltsOb.cta.${f.familiarity}`) : t('ieltsOb.continue')}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="ih-ob">
      <header className="ih-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('ieltsReading.back')}><ChevronLeftIcon size={20} /></button>
        <b className="ih-ob__logo">just to study</b>
        <span className="ih-chip ih-chip--violet ih-chip--sm"><span>IELTS</span></span>
        <span className="ih-run__spacer" />
        <button type="button" className="ih-ob__exit" onClick={() => onExit?.()}>{t('ieltsOb.exit')}<CloseIcon size={16} /></button>
      </header>
      {/* шаг, страница инструкции и вопрос квиза — каждый появляется заново */}
      <main key={`${phase}-${step}-${guidePage}-${quizIdx}`} className={`ih-ob__main ${step > 0 || phase !== 'steps' ? 'ih-enter' : ''}`}>{body}</main>
    </div>
  )
}
