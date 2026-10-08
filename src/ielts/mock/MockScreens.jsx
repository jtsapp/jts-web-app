import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SecPlate } from '../today/TodayCards.jsx'
import {
  ArrowForwardIcon, CheckCircleIcon, CheckIcon, EyeOffIcon, InfoIcon, MicIcon, PauseIcon, ScheduleIcon, SparkleIcon, TargetIcon,
  TimerIcon, VolumeIcon, WarningIcon,
} from '../icons.jsx'
import { MOCK_ORDER, SECTION_MIN } from './mockSession.js'

// Экраны полного mock по дизайну «IELTS new», раздел 4 (Figma 92:3468 … 92:4094). Логики здесь нет — её держит
// IeltsMockPage; компоненты только рисуют снимок сессии.

const NAME = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' }

export function Stepper({ steps, current }) {
  return (
    <ol className="ih-mstep">
      {steps.map((s, i) => (
        <li key={s.key} className={i < current ? 'is-done' : i === current ? 'is-on' : ''}>
          <span className="ih-mstep__dot">{i < current ? <CheckIcon size={14} /> : i + 1}</span>
          <span className="ih-mstep__label">{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function MockTopBar({ chip, right }) {
  return (
    <header className="ih-mockbar">
      <b className="ih-ob__logo">just to study</b>
      {chip && <span className="ih-mockbar__chip">{chip}</span>}
      <span className="ih-run__spacer" />
      {right}
    </header>
  )
}

function introSteps(t) {
  return [
    { key: 'about', label: t('ieltsMock.step.about') },
    { key: 'check', label: t('ieltsMock.step.check') },
    { key: 'exam', label: t('ieltsMock.step.exam') },
  ]
}

/** Описание mock (Figma 92:3468): из чего состоит экзамен и правила строгого режима. */
export function MockIntro({ title, module, onNext, onBack }) {
  const { t } = useI18n()
  const rules = [
    { Icon: TimerIcon, key: 'timer' },
    { Icon: EyeOffIcon, key: 'hints' },
    { Icon: PauseIcon, key: 'pause' },
    { Icon: SparkleIcon, key: 'ai' },
  ]
  return (
    <main className="ih-mock__main ih-enter">
      <Stepper steps={introSteps(t)} current={0} />
      <h1 className="ih-mock__h1">{title}</h1>
      <p className="ih-mock__sub">{t('ieltsMock.intro.sub', { track: module === 'general' ? 'General Training' : 'Academic' })}</p>
      <div className="ih-mock__cols">
        <section className="ih-mock__card">
          <h2>{t('ieltsMock.intro.parts')}</h2>
          <ul className="ih-mock__secs">
            {MOCK_ORDER.map((s, i) => (
              <li key={s}>
                <SecPlate sec={s} size={40} />
                <span><b>{NAME[s]}</b><small>{t('ieltsMock.intro.section', { n: String(i + 1) })}</small></span>
                <strong>{s === 'listening' ? t('ieltsMock.intro.about', { n: '40' }) : s === 'speaking' ? t('ieltsMock.intro.range', { from: '11', to: '14' }) : t('ieltsMock.intro.min', { n: String(SECTION_MIN[s]) })}</strong>
              </li>
            ))}
          </ul>
          <p className="ih-mock__fine">{t('ieltsMock.intro.total')}</p>
        </section>
        <aside className="ih-mock__card">
          <h2>{t('ieltsMock.intro.rules')}</h2>
          <ul className="ih-mock__rules">
            {rules.map(({ Icon, key }) => (
              <li key={key}><span><Icon size={18} /></span>{t(`ieltsMock.rule.${key}`)}</li>
            ))}
          </ul>
          <p className="ih-mock__strict"><InfoIcon size={16} />{t('ieltsMock.intro.strict')}</p>
        </aside>
      </div>
      <div className="ih-mock__actions">
        <button type="button" className="ih-btn ih-btn--primary ih-mock__cta" onClick={onNext}>{t('ieltsMock.intro.toCheck')} <ArrowForwardIcon size={18} /></button>
        <button type="button" className="ih-btn ih-btn--outline" onClick={onBack}>{t('ieltsMock.back')}</button>
      </div>
    </main>
  )
}

// Короткий тон без сети: звук проверяем самим устройством, а не загрузкой файла
function playTone() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return Promise.reject(new Error('no_audio'))
  const ctx = new Ctx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = 660
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.85)
  // контекст закрывается в любом исходе: браузер держит их считанное число на вкладку
  return ctx.resume()
    .then(() => new Promise((res) => setTimeout(res, 900)))
    .finally(() => ctx.close().catch(() => {}))
}

function Status({ state }) {
  const { t } = useI18n()
  if (!state || state === 'idle') return null
  return <span className={`ih-mcheck__status is-${state}`}>{state === 'ok' ? <CheckCircleIcon size={14} /> : state === 'fail' ? <WarningIcon size={14} /> : null}{t(`ieltsMock.check.state.${state}`)}</span>
}

/**
 * Проверка перед стартом (Figma 92:3570): звук, микрофон (уровень сигнала), соединение и согласие с правилами.
 * Без микрофона Speaking пройти нельзя — поэтому старт ждёт именно его, а звук ученик проверяет по желанию.
 */
export function MockCheck({ onStart, onBack, starting, error }) {
  const { t } = useI18n()
  const [sound, setSound] = useState('idle')
  const [mic, setMic] = useState('idle')
  const [level, setLevel] = useState(0)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' || navigator.onLine ? 'ok' : 'fail'))
  const [agree, setAgree] = useState(false)
  const stopRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const on = () => setOnline('ok')
    const off = () => setOnline('fail')
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      mountedRef.current = false
      stopRef.current?.()
    }
  }, [])

  const testSound = () => {
    setSound('busy')
    playTone().then(() => setSound('ok'), () => setSound('fail'))
  }

  const testMic = async () => {
    stopRef.current?.()
    setMic('busy')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // экран закрыли, пока висел запрос разрешения: поток гасим сразу, иначе индикатор микрофона горел бы дальше
      if (!mountedRef.current) {
        stream.getTracks().forEach((x) => x.stop())
        return
      }
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = new Ctx()
      const an = ctx.createAnalyser()
      an.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Float32Array(an.fftSize)
      // уровень — 10 раз в секунду: глазу хватает, а кадр анимации перерисовывал бы весь экран 60 раз в секунду
      const meter = setInterval(() => {
        an.getFloatTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += v * v
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 8))
      }, 100)
      // микрофон держим только на время проверки: экзамен откроет его сам в Speaking. stop зовут и кнопка старта,
      // и уход с экрана, и таймер — второй вызов ничего не делает
      let stopped = false
      let timer = 0
      const stop = () => {
        if (stopped) return
        stopped = true
        clearInterval(meter)
        clearTimeout(timer)
        stream.getTracks().forEach((x) => x.stop())
        ctx.close().catch(() => {})
        if (mountedRef.current) setLevel(0)
      }
      stopRef.current = stop
      timer = setTimeout(stop, 6000)
      setMic('ok')
    } catch {
      setMic('fail')
    }
  }

  const ready = mic === 'ok' && agree && online === 'ok'
  return (
    <main className="ih-mock__main ih-mock__main--narrow ih-enter">
      <Stepper steps={introSteps(t)} current={1} />
      <h1 className="ih-mock__h1">{t('ieltsMock.check.title')}</h1>
      <section className="ih-mcheck">
        <div className="ih-mcheck__row">
          <span className="ih-mcheck__icon is-green"><VolumeIcon size={20} /></span>
          <span className="ih-mcheck__text"><b>{t('ieltsMock.check.sound')}</b><small>{t('ieltsMock.check.soundText')}</small></span>
          <Status state={sound} />
          <button type="button" className="ih-btn ih-btn--outline" onClick={testSound} disabled={sound === 'busy'}>{t('ieltsMock.check.test')}</button>
        </div>
      </section>
      <section className="ih-mcheck">
        <div className="ih-mcheck__row">
          <span className={`ih-mcheck__icon ${mic === 'fail' ? 'is-red' : 'is-green'}`}><MicIcon size={20} /></span>
          <span className="ih-mcheck__text"><b>{t('ieltsMock.check.mic')}</b><small>{t('ieltsMock.check.micText')}</small></span>
          <Status state={mic} />
          {mic !== 'fail' && <button type="button" className="ih-btn ih-btn--outline" onClick={testMic} disabled={mic === 'busy'}>{t('ieltsMock.check.test')}</button>}
        </div>
        {mic === 'ok' && <span className="ih-mcheck__level" aria-hidden="true"><span style={{ width: `${Math.round(level * 100)}%` }} /></span>}
        {mic === 'fail' && (
          <div className="ih-mcheck__alert" role="alert">
            <WarningIcon size={18} />
            <span><b>{t('ieltsMock.check.micDenied')}</b><small>{t('ieltsMock.check.micDeniedText')}</small></span>
            <button type="button" className="ih-btn ih-btn--outline" onClick={testMic}>{t('ieltsMock.check.retry')}</button>
          </div>
        )}
      </section>
      <section className="ih-mcheck">
        <div className="ih-mcheck__row">
          <span className={`ih-mcheck__icon ${online === 'ok' ? 'is-green' : 'is-red'}`}><InfoIcon size={20} /></span>
          <span className="ih-mcheck__text"><b>{t('ieltsMock.check.net')}</b><small>{t('ieltsMock.check.netText')}</small></span>
          <Status state={online} />
        </div>
      </section>
      <label className="ih-mcheck__agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        {t('ieltsMock.check.agree')}
      </label>
      {error && <p className="ih-run__error" role="alert">{error}</p>}
      <div className="ih-mock__actions">
        <button type="button" className="ih-btn ih-btn--primary ih-mock__cta" onClick={() => { stopRef.current?.(); onStart() }} disabled={!ready || starting}>{t('ieltsMock.check.start')}</button>
        <button type="button" className="ih-btn ih-btn--outline" onClick={onBack}>{t('ieltsMock.back')}</button>
        {!ready && <span className="ih-mock__fine">{t('ieltsMock.check.hint')}</span>}
      </div>
    </main>
  )
}

/** Между секциями (Figma 92:3845): секция сдана, следующая начнётся — и её часы пойдут — только по кнопке. */
export function MockBetween({ done, next, onStart, busy, error }) {
  const { t } = useI18n()
  const steps = MOCK_ORDER.map((s) => ({ key: s, label: NAME[s] }))
  return (
    <main className="ih-mock__main ih-mock__main--center ih-enter">
      <Stepper steps={steps} current={MOCK_ORDER.indexOf(next)} />
      <section className="ih-mock__card ih-mbetween">
        <span className="ih-mbetween__ok"><CheckCircleIcon size={30} /></span>
        <h2>{done ? t('ieltsMock.between.done', { section: NAME[done] }) : t('ieltsMock.between.resume')}</h2>
        <p>{t('ieltsMock.between.text', { next: NAME[next], min: String(SECTION_MIN[next]), done: done ? NAME[done] : '' })}</p>
        <span className="ih-mbetween__warn"><TimerIcon size={16} />{t('ieltsMock.between.timer', { next: NAME[next] })}</span>
        {error && <p className="ih-run__error" role="alert">{error}</p>}
        <button type="button" className="ih-btn ih-btn--primary ih-mock__cta" onClick={onStart} disabled={busy}>{t('ieltsMock.between.start', { next: NAME[next] })} <ArrowForwardIcon size={18} /></button>
      </section>
    </main>
  )
}

function sectionChip(t, sec, uploads) {
  if (sec.name === 'speaking' && uploads?.some((u) => u.status === 'uploading')) {
    const n = uploads.filter((u) => u.status !== 'uploading').length
    return { tone: 'violet', text: t('ieltsMock.state.uploading', { n: String(n), total: String(uploads.length) }), progress: n / uploads.length }
  }
  if (sec.name === 'speaking' && uploads?.some((u) => u.status === 'error')) return { tone: 'red', text: t('ieltsMock.state.uploadFailed') }
  const st = sec.state
  if (st === 'done') return { tone: 'green', text: t('ieltsMock.state.ready') }
  if (st === 'failed') return { tone: 'red', text: t('ieltsMock.state.failed') }
  if (st === 'missing') return { tone: 'grey', text: t('ieltsMock.state.missing') }
  if (st === 'checking') {
    const grading = sec.parts?.some((p) => p.status === 'grading')
    return { tone: 'violet', text: t(grading ? 'ieltsMock.state.grading' : 'ieltsMock.state.queued') }
  }
  return { tone: 'violet', text: t('ieltsMock.state.uploadingShort') }
}

/** «Экзамен сдан» (Figma 92:3946): секции и их проверка; закрыть страницу можно — итог появится в истории. */
export function MockSubmitted({ session, uploads, writingRetry, pollStopped, onRetryUpload, onRetryGrade, onHistory, onIelts }) {
  const { t } = useI18n()
  return (
    <main className="ih-mock__main ih-mock__main--narrow ih-enter">
      <h1 className="ih-mock__h1">{t('ieltsMock.submitted.title')}</h1>
      <p className="ih-mock__sub">{t('ieltsMock.submitted.sub')}</p>
      <section className="ih-mock__card">
        <ul className="ih-msub">
          {session.sections.map((sec) => {
            const chip = sectionChip(t, sec, sec.name === 'speaking' ? uploads : null)
            return (
              <li key={sec.name}>
                <SecPlate sec={sec.name} size={40} />
                <span className="ih-msub__name">
                  <b>{NAME[sec.name]}</b>
                  {chip.progress != null && <span className="ih-msub__bar"><span style={{ width: `${Math.round(chip.progress * 100)}%` }} /></span>}
                </span>
                <span className={`ih-mkchip is-${chip.tone}`}>{chip.text}</span>
                {sec.name === 'speaking' && uploads?.some((u) => u.status === 'error') && <button type="button" className="ih-btn ih-btn--outline" onClick={onRetryUpload}>{t('ieltsMock.check.retry')}</button>}
                {sec.name === 'writing' && (sec.state === 'failed' || (sec.state === 'checking' && writingRetry)) && <button type="button" className="ih-btn ih-btn--outline" onClick={onRetryGrade}>{t('ieltsMock.check.retry')}</button>}
              </li>
            )
          })}
        </ul>
      </section>
      {pollStopped && <p className="ih-mock__note"><ScheduleIcon size={16} />{t('ieltsMock.submitted.later')}</p>}
      <p className="ih-mock__note"><InfoIcon size={16} />{t('ieltsMock.submitted.note')}</p>
      <div className="ih-mock__actions">
        <button type="button" className="ih-btn ih-btn--primary" onClick={onHistory}>{t('ieltsMock.submitted.history')}</button>
        <button type="button" className="ih-btn ih-btn--outline" onClick={onIelts}>{t('ieltsMock.submitted.toIelts')}</button>
      </div>
    </main>
  )
}

const CRIT = {
  writing: [['taskResponse', 'TR'], ['coherenceCohesion', 'CC'], ['lexicalResource', 'LR'], ['grammaticalRange', 'GRA']],
  speaking: [['fluencyCoherence', 'Fluency'], ['lexicalResource', 'LR'], ['grammaticalRange', 'GRA'], ['pronunciation', 'Pron']],
}

/** Критерии секции одной строкой: Writing — по Task 2 (он весит вдвое), Speaking — среднее частей. */
export function criteriaLine(sec) {
  const list = CRIT[sec.name]
  if (!list) return null
  const parts = (sec.parts || []).filter((p) => p.criteria)
  if (!parts.length) return null
  const src = sec.name === 'writing' ? [parts.at(-1)] : parts
  const out = []
  for (const [key, label] of list) {
    const vals = src.map((p) => p.criteria?.[key]).filter((v) => typeof v === 'number')
    if (!vals.length) continue
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 2) / 2
    out.push(`${label} ${avg.toFixed(1)}`)
  }
  return out.join(' · ') || null
}

const fmtBand = (b) => (typeof b === 'number' ? b.toFixed(1) : '—')

/** Слабейшая секция — «приоритетная рекомендация» итога (Figma 92:4094). */
export function weakestSection(session) {
  const scored = session.sections.filter((s) => typeof s.band === 'number')
  if (scored.length < 4) return null
  return scored.reduce((a, b) => (b.band < a.band ? b : a))
}

/**
 * Итог mock — один вид по макету итогового результата (Figma 92:4094, «21»): overall слева, секции строками с баллом и
 * «Разбор». Частичный итог (прежний вид 92:4017) рисуется так же, а от него берёт поведение: у секции без балла вместо
 * «Разбор» — текст этапа или проблемы («Проверяется ИИ», «Проверка не удалась», «Нет ответа»), overall не считается из
 * неполных данных. «Разбор» и «Открыть разбор по навыкам» ведут в один разбор с переключателем секций (MockReview).
 */
export function MockResult({ session, targetBand, onReview, onTrain, onPlan, dateLabel }) {
  const { t } = useI18n()
  const weak = weakestSection(session)
  const aborted = session.status === 'aborted'
  // partial — итог ещё придёт; incomplete — не придёт (нет ответа в Speaking или проверка не удалась)
  const status = aborted ? 'aborted' : session.partial ? 'partial' : session.overall == null ? 'incomplete' : 'done'
  const full = session.overall != null
  const statusChip = (
    <span className={`ih-mkchip is-${status === 'done' ? 'green' : status === 'partial' ? 'amber' : 'grey'}`}>
      {status === 'done' ? <CheckCircleIcon size={14} /> : <ScheduleIcon size={14} />}{t(`ieltsMock.result.status.${status}`)}
    </span>
  )
  const detail = (sec) => {
    if (sec.rawScore != null) return t('ieltsMock.result.correct', { n: String(sec.rawScore), total: String(sec.maxScore) })
    return criteriaLine(sec)
  }
  const left = targetBand && full ? Math.max(0, targetBand - session.overall) : null
  const firstLR = session.sections.find((s) => s.rawScore != null)
  return (
    <main className="ih-mock__main ih-enter">
      <h1 className="ih-mock__h1">{t('ieltsMock.result.title', { name: session.title })}</h1>
      <p className="ih-mres__meta">{statusChip}<span>{dateLabel} · {t(full ? 'ieltsMock.result.internal' : 'ieltsMock.result.platform')}</span></p>
      <div className="ih-mres__full">
        <section className={`ih-mres__overall${full ? '' : ' is-empty'}`}>
          <span>Overall</span>
          <b>{fmtBand(session.overall)}</b>
          {full
            ? left != null && <small>{left > 0 ? t('ieltsMock.result.toGoal', { goal: targetBand.toFixed(1), n: left.toFixed(1) }) : t('ieltsMock.result.goalReached')}</small>
            : <small>{t(aborted ? 'ieltsMock.result.abortedText' : status === 'incomplete' ? 'ieltsMock.result.incompleteText' : 'ieltsMock.result.overallLater')}</small>}
        </section>
        <ul className="ih-mres__list">
          {session.sections.map((sec) => (
            <li key={sec.name} className="ih-mock__card">
              <SecPlate sec={sec.name} size={40} />
              <span>
                <b>{NAME[sec.name]}</b>
                {sec.band != null && detail(sec) && <small>{detail(sec)}</small>}
              </span>
              <strong className={sec.band == null ? 'is-none' : ''}>{fmtBand(sec.band)}</strong>
              {sec.band != null && sec.parts?.some((x) => x?.attemptId) ? (
                <button type="button" className="ih-link ih-mres__act" onClick={() => onReview(sec)}>{t('ieltsMock.result.review')} <ArrowForwardIcon size={16} /></button>
              ) : (
                <span className={`ih-mres__act ih-mres__stage is-${sec.state}`}>{t(`ieltsMock.result.cell.${sec.state}`)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {weak && (
        <section className="ih-mres__rec">
          <span className="ih-mres__recicon"><TargetIcon size={20} /></span>
          <span><small>{t('ieltsMock.result.recLabel')}</small><b>{t(`ieltsMock.result.rec.${weak.name}`)}</b></span>
          <button type="button" className="ih-btn ih-btn--outline" onClick={() => onTrain(weak.name)}>{t('ieltsMock.result.train')}</button>
        </section>
      )}
      <div className="ih-mock__actions">
        {full ? (
          <button type="button" className="ih-btn ih-btn--primary" onClick={() => onReview(session.sections[0])}>{t('ieltsMock.result.toSkills')} <ArrowForwardIcon size={18} /></button>
        ) : firstLR && (
          <button type="button" className="ih-btn ih-btn--primary" onClick={() => onReview(firstLR)}>{t('ieltsMock.result.reviewLR')} <ArrowForwardIcon size={18} /></button>
        )}
        <button type="button" className="ih-btn ih-btn--outline" onClick={onPlan}>{t('ieltsMock.result.toPlan')}</button>
      </div>
    </main>
  )
}
