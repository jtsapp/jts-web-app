import { useEffect, useMemo, useState } from 'react'
import { getGeProfile, getLevelProgress, saveGeProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { Calendar, ImageCard, Option, Radio } from '../components/onboarding/OnboardingParts.jsx'
import {
  ChevronLeftIcon, CheckCircleIcon, CloseIcon, EventIcon, HelpIcon, InfoIcon, MenuBookIcon, QuizIcon, ScheduleIcon, TaskAltIcon,
} from '../ielts/icons.jsx'
import {
  DAILY, DAILY_DEFAULT, PURPOSES, START_MODES, WINDOWS, formFromProfile, nextAfterSave, onboardingBody, recommendedTarget, stepReady, stepsFor,
  targetTiles,
} from '../ge/onboarding.js'
import { fitsDeadline, formatTerm, remainingLessons, termFor, termUnits, windowDate } from '../ge/route.js'

const START_ICON = { zero: MenuBookIcon, some: QuizIcon, known: TaskAltIcon }

/**
 * Анкета General English (спека 2026-10-12, секция 1): зачем, цель-уровень, срок, минут в день и — без уровня —
 * «знаете свой уровень?». Вид — онбординг IELTS (общие кирпичи OnboardingParts). Ответы ложатся в профиль бэкенда;
 * куда дальше (маршрут или тест) решает App по `next` из onSaved. Правка (`edit`) — только цель, срок и время.
 */
export default function GeOnboardingPage({ token, level = null, edit = false, onExit, onSaved }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const levelKnown = !!level
  const steps = useMemo(() => stepsFor({ levelKnown, edit }), [levelKnown, edit])
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ daily: DAILY_DEFAULT })
  // «Пока не знаю» — цель та же рекомендованная, но отмечена должна быть карточка, а не плитка
  const [targetUnknown, setTargetUnknown] = useState(false)
  const [percent, setPercent] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Повторный заход и правка — ответы прошлого раза подставлены
  useEffect(() => {
    let alive = true
    getGeProfile(authToken).then((p) => {
      if (alive && p?.onboarded) setF(formFromProfile(p, level))
    })
    return () => {
      alive = false
    }
  }, [authToken, level])

  // Срок на шаге «сколько времени» считается от пройденной доли текущего уровня — её знает только сервер
  useEffect(() => {
    if (!levelKnown || !authToken) return undefined
    let alive = true
    getLevelProgress(authToken)
      .then((p) => {
        if (alive && typeof p?.percent === 'number') setPercent(p.percent)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [authToken, levelKnown])

  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const key = steps[step]
  const ready = stepReady(key, f)
  const recommend = recommendedTarget(f.purpose, level)
  const dateLabel = (v) =>
    new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(`${v}T00:00:00`))
      .replace(/\s?г\.$/, '')

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      const saved = await saveGeProfile(authToken, onboardingBody(f))
      onSaved?.(saved, nextAfterSave({ edit, levelKnown, start: f.start }))
    } catch (e) {
      setError(e?.serverMessage || t('geOb.saveError'))
      setBusy(false)
    }
  }
  const next = () => (step + 1 < steps.length ? setStep(step + 1) : finish())
  const back = () => (step > 0 ? setStep(step - 1) : onExit?.())

  let options = null
  if (key === 'purpose') {
    options = (
      <div className="ih-obcards">
        {PURPOSES.map((p) => (
          <ImageCard key={p.id} on={f.purpose === p.id} img={p.img} title={t(`geOb.purpose.${p.id}`)} hint={t(`geOb.purposeHint.${p.id}`)} onClick={() => set({ purpose: p.id })} />
        ))}
      </div>
    )
  } else if (key === 'target') {
    options = (
      <>
        <div className="ih-obgrid">
          {targetTiles(level).map((x) => {
            const on = f.target === x.code && !targetUnknown
            return (
              <button
                key={x.code}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!x.enabled}
                className={`ih-obband ge-obtile ${on ? 'is-on' : ''}`}
                onClick={() => {
                  set({ target: x.code })
                  setTargetUnknown(false)
                }}
              >
                <span className="ih-obband__top">
                  <b>{x.code}</b>
                  <Radio on={on} />
                </span>
                <span>{x.mark ? t(`geOb.tile.${x.mark}`) : t(`geOb.levelHint.${x.code}`)}</span>
                {recommend === x.code && x.enabled && <span className="ih-obcard__chip">{t('geOb.recommended')}</span>}
              </button>
            )
          })}
        </div>
        {recommend && (
          <Option
            on={targetUnknown}
            icon={<HelpIcon size={22} />}
            title={t('geOb.targetUnknownTitle')}
            hint={t('geOb.targetUnknownHint', { level: recommend })}
            onClick={() => {
              set({ target: recommend })
              setTargetUnknown(true)
            }}
          />
        )}
      </>
    )
  } else if (key === 'deadline') {
    options = (
      <>
        {/* Календарь внутри карточки, как у IELTS: кнопки дней внутри кнопки — невалидный HTML, поэтому карточка —
            блок, а выбирает её шапка */}
        <div className={`ih-obopt ih-obopt--date ${f.window === 'date' ? 'is-on' : ''}`}>
          <button type="button" role="radio" aria-checked={f.window === 'date'} className="ih-obopt__head" onClick={() => set({ window: 'date' })}>
            <span className="ih-obopt__cal-icon">
              <EventIcon size={22} />
            </span>
            <span className="ih-obopt__body">
              <b>{t('geOb.dateKnown')}</b>
              <span>{f.window === 'date' && f.date ? dateLabel(f.date) : t('geOb.dateKnownHint')}</span>
            </span>
            <Radio on={f.window === 'date'} />
          </button>
          {f.window === 'date' && <Calendar value={f.date} onChange={(v) => set({ date: v, window: 'date' })} lang={lang} />}
        </div>
        {WINDOWS.map((w) => (
          <Option key={w} on={f.window === w} title={t(`geOb.window.${w}`)} hint={t(`geOb.windowHint.${w}`)} onClick={() => set({ window: w, date: null })} />
        ))}
      </>
    )
  } else if (key === 'daily') {
    // Без уровня срок не выдумываем: у IELTS подстановка разрыва давала три разных срока на трёх экранах
    const lessons = levelKnown ? remainingLessons(level, f.target, percent) : 0
    const deadlineIso = f.window === 'date' ? f.date : windowDate(f.window)
    const fit = levelKnown && deadlineIso ? fitsDeadline(termFor('self_study', lessons, f.daily), deadlineIso) : null
    options = (
      <>
        <div className="ih-obdaily">
          {DAILY.map((m) => {
            const on = f.daily === m
            return (
              <button key={m} type="button" role="radio" aria-checked={on} className={`ih-obday ${on ? 'is-on' : ''}`} onClick={() => set({ daily: m })}>
                <span className="ih-obday__top">
                  <span className="ih-obday__icon">
                    <ScheduleIcon size={22} />
                  </span>
                  <b>{t(`geOb.daily.${m}`)}</b>
                  <Radio on={on} />
                </span>
                <span className="ih-obday__pace">
                  {t(`geOb.pace.${m}`)}
                  {m === DAILY_DEFAULT && <span className="ih-obcard__chip">{t('geOb.recommended')}</span>}
                </span>
                <span className="ih-obday__term">
                  {levelKnown ? t('geOb.termToGoal', { term: formatTerm(termUnits(termFor('self_study', lessons, m)), t, lang) }) : t('geOb.termAfterTest')}
                </span>
              </button>
            )
          })}
        </div>
        {fit && (
          <p className={`ih-ob__note ${fit === 'late' ? 'is-warn' : 'is-ok'}`}>
            {fit === 'late' ? <InfoIcon size={20} /> : <CheckCircleIcon size={20} />}
            <span>{t(fit === 'late' ? 'geOb.notFits' : 'geOb.fits', { date: dateLabel(deadlineIso) })}</span>
          </p>
        )}
        <p className="ih-muted">{t('geOb.estimateNote')}</p>
      </>
    )
  } else if (key === 'start') {
    options = (
      <>
        {START_MODES.map((m) => {
          const Ico = START_ICON[m]
          return <Option key={m} on={f.start === m} icon={<Ico size={24} />} title={t(`geOb.start.${m}`)} hint={t(`geOb.startHint.${m}`)} onClick={() => set({ start: m })} />
        })}
        <section className="ih-ob__summary">
          <b>{t('geOb.yourAnswers')}</b>
          <div>
            {f.purpose && <span className="ih-ob__chip">{t(`geOb.purpose.${f.purpose}`)}</span>}
            {f.target && <span className="ih-ob__chip">{t('geOb.goalChip', { level: f.target })}</span>}
            {f.window && <span className="ih-ob__chip">{f.window === 'date' && f.date ? dateLabel(f.date) : t(`geOb.window.${f.window}`)}</span>}
            <span className="ih-ob__chip">{t(`geOb.daily.${f.daily}`)}</span>
          </div>
        </section>
      </>
    )
  }

  const last = step + 1 === steps.length
  const cta = key === 'start' && f.start ? t(`geOb.cta.${f.start}`) : last ? t('geOb.finish') : t('geOb.continue')

  return (
    <div className="ih-ob ge-ob">
      <header className="ih-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('geOb.back')}>
          <ChevronLeftIcon size={20} />
        </button>
        <b className="ih-ob__logo">just to study</b>
        <span className="ih-run__spacer" />
        <button type="button" className="ih-ob__exit" onClick={() => onExit?.()}>
          {t('geOb.exit')}
          <CloseIcon size={16} />
        </button>
      </header>
      {/* шаг появляется заново — та же анимация, что у IELTS */}
      <main key={step} className={`ih-ob__main ${step > 0 ? 'ih-enter' : ''}`}>
        <div className="ih-ob__progress" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((s, i) => (
            <span key={s} className={i <= step ? 'is-on' : ''} />
          ))}
        </div>
        <p className="ih-ob__step">{t('geOb.step', { n: String(step + 1), total: String(steps.length) })}</p>
        <h1>{t(`geOb.title.${key}`)}</h1>
        <p className="ih-ob__sub">{t(`geOb.sub.${key}`)}</p>
        <div className="ih-ob__options" role="radiogroup">
          {options}
        </div>
        {error && (
          <p className="ih-run__error" role="alert">
            {error}
          </p>
        )}
        <div className="ih-ob__actions">
          <button type="button" className="ih-cta ih-ob__cta" disabled={!ready || busy} onClick={next}>
            {cta}
          </button>
        </div>
      </main>
    </div>
  )
}
