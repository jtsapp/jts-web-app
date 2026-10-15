import { useMemo, useState } from 'react'
import satInfo from '../data/satInfo.json'
import taxonomy from '../data/taxonomy.json'
import colleges from '../data/colleges.json'
import examDates from '../data/examDates.json'
import { domainShares, pick, rankColleges, roundSection, splitLead, splitTotal, TARGET_PRESETS, upcomingDates } from '../model/profile.js'
import { useI18n } from '../../i18n.jsx'
import { BarChartIcon, CafeIcon, CalculateIcon, FactCheckIcon, KanbanIcon, KeyboardIcon, LockIcon, ReplayIcon, RouteIcon, SortIcon, SpeedIcon } from '../icons.jsx'
import { plural } from '../../lib/plural.js'
import {
  CheckCircleIcon, ChevronRightIcon, CloseIcon, EventIcon, ExpandMoreIcon, InfoIcon, MenuBookIcon, OpenInNewIcon, QuizIcon,
  RadioOffIcon, ScheduleIcon, TimerIcon, TranslateIcon,
} from '../../ielts/icons.jsx'
import { fmtDate } from '../model/dates.js'

// Шесть глав об экзамене (Figma SAT 1–6). Одни и те же данные (satInfo.json — sat-info.js прототипа) рисует и
// онбординг, и вкладка «Гайд» (Figma 19): так глава не может разойтись сама с собой. Интерактивные части — цель
// (глава 3) и выбор даты (глава 4) — только в онбординге; в гайде у этих глав справочный вид.

export const CHAPTERS = ['about', 'structure', 'goal', 'examday', 'verbal', 'math']
export const chapterData = (id) => satInfo.chapters.find((c) => c.id === id)
const SECTION = { rw: { tone: '#2f7bf5', tint: '#e8f1ff' }, math: { tone: '#d6409f', tint: '#fceaf4' } }
// иконки и тона пунктов — как в макете: у главы 1 у каждого пункта свой цвет, у остальных — фиолетовый
const POINT_ICON = { about: [KanbanIcon, RouteIcon, CheckCircleIcon, ReplayIcon], structure: [SpeedIcon, LockIcon, CafeIcon], verbal: [SortIcon, FactCheckIcon, TranslateIcon], math: [CalculateIcon, MenuBookIcon, KeyboardIcon] }
const POINT_TONE = { about: ['blue', '', 'green', 'orange'] }

const html = (s) => ({ __html: s || '' })

/** Карточка пункта главы: заголовок — ведущий <b> текста, иначе подпись из макета (sat.ob.pt.<глава>.<n>). */
function PointCard({ chapter, i, point, accent }) {
  const { t, lang } = useI18n()
  const { title, body } = splitLead(pick(point, lang))
  const Icon = POINT_ICON[chapter]?.[i] || InfoIcon
  const tone = POINT_TONE[chapter]?.[i]
  return (
    <div className={`st-point ${accent ? 'st-point--accent' : ''}`}>
      <span className={`st-point__icon ${tone ? `is-${tone}` : ''}`}><Icon size={20} /></span>
      <div>
        <b>{title || t(`sat.ob.pt.${chapter}.${i}`)}</b>
        <p dangerouslySetInnerHTML={html(body)} />
      </div>
    </div>
  )
}

export function AboutChapter() {
  const { lang } = useI18n()
  const ch = chapterData('about')
  const icons = [BarChartIcon, ScheduleIcon, QuizIcon]
  return (
    <>
      <div className="st-stats">
        {ch.stats.map((s, i) => {
          const Icon = icons[i] || InfoIcon
          return (
            <div key={i} className="st-stat">
              <span className="st-point__icon"><Icon size={18} /></span>
              <b>{pick(s.value, lang)}</b>
              <span>{pick(s.label, lang)}</span>
            </div>
          )
        })}
      </div>
      <div className="st-points st-points--2">
        {ch.points.map((p, i) => <PointCard key={i} chapter="about" i={i} point={p} />)}
      </div>
    </>
  )
}

export function StructureChapter() {
  const { t, lang } = useI18n()
  const ch = chapterData('structure')
  const mod = (m, section) => (
    <div key={m.key} className="st-module" style={{ '--st-tone': SECTION[section].tone, '--st-tint': SECTION[section].tint }}>
      <b>{t('sat.module', { n: m.key.slice(-1) })}</b>
      {m.adaptive && <span className="st-module__adaptive"><RouteIcon size={12} />{t('sat.adaptive')}</span>}
      <span className="st-module__q">{plural(t, lang, 'sat.q', m.q)}</span>
      <span className="st-module__min"><TimerIcon size={16} />{t('sat.min', { n: String(m.min) })}</span>
    </div>
  )
  const rw = ch.timeline.filter((m) => m.key.startsWith('rw'))
  const math = ch.timeline.filter((m) => m.key.startsWith('m'))
  const brk = ch.timeline.find((m) => m.key === 'break')
  const head = (list, section, name) => (
    <span className="st-timeline__head" style={{ '--st-tone': SECTION[section].tone }}>
      {name} · {plural(t, lang, 'sat.q', list.reduce((a, m) => a + m.q, 0))} · {t('sat.min', { n: String(list.reduce((a, m) => a + m.min, 0)) })}
    </span>
  )
  return (
    <>
      <div className="st-card st-timeline">
        <div className="st-timeline__part">{head(rw, 'rw', 'Reading and Writing')}<div className="st-timeline__mods">{rw.map((m) => mod(m, 'rw'))}</div></div>
        <div className="st-timeline__break"><CafeIcon size={24} /><span>{t('sat.min', { n: String(brk?.min ?? 10) })}</span></div>
        <div className="st-timeline__part">{head(math, 'math', 'Math')}<div className="st-timeline__mods">{math.map((m) => mod(m, 'math'))}</div></div>
      </div>
      <div className="st-points st-points--3">
        {ch.points.map((p, i) => <PointCard key={i} chapter="structure" i={i} point={p} />)}
      </div>
    </>
  )
}

/** Глава 5 / 6: секция — её домены с долей (из таксономии, как у планировщика) и навыки, справа — три пункта. */
export function SectionChapter({ id }) {
  const { t, lang } = useI18n()
  const ch = chapterData(id)
  const section = ch.section
  const shares = domainShares(taxonomy, section)
  const q = section === 'rw' ? 54 : 44
  const min = section === 'rw' ? 64 : 70
  const per = section === 'rw' ? 71 : 95
  return (
    <>
      <div className="st-statchips">
        <span><QuizIcon size={16} />{plural(t, lang, 'sat.q', q)}</span>
        <span><TimerIcon size={16} />{t('sat.min', { n: String(min) })}</span>
        <span><SpeedIcon size={16} />{t('sat.perQ', { n: String(per) })}</span>
      </div>
      <div className="st-section" style={{ '--st-tone': SECTION[section].tone, '--st-tint': SECTION[section].tint }}>
        <div className="st-card st-domains">
          <h3>{t('sat.section.what')}</h3>
          {shares.map((d) => (
            <div key={d.id} className="st-domain">
              <div className="st-domain__head"><b>{pick({ en: d.name_en, ru: d.name_ru, kk: d.name_kk }, lang)}</b><b className="st-domain__pct">{d.percent}%</b></div>
              <i className="st-bar"><i style={{ width: `${d.percent * 2.5}%` }} /></i>
              <div className="st-chips">{d.skills.map((s) => <span key={s.id}>{pick({ en: s.name_en, ru: s.name_ru, kk: s.name_kk }, lang)}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="st-points st-points--col">
          {ch.points.map((p, i) => <PointCard key={i} chapter={id} i={i} point={p} accent={i === 0} />)}
        </div>
      </div>
    </>
  )
}

/** Глава 3 в онбординге (Figma 3): цель по секциям слева, справа — куда она попадает относительно middle-50% вузов. */
export function GoalPicker({ rw, math, onChange }) {
  const { t, lang } = useI18n()
  const [more, setMore] = useState(false)
  const total = rw + math
  const ranked = useMemo(() => rankColleges(total, colleges.rows), [total])
  const reach = ranked.filter((c) => c.band !== 'below')
  const shown = more ? ranked : reach.slice(0, Math.max(4, Math.min(reach.length, 4)))
  const hidden = ranked.length - shown.length
  const year = colleges.rows[0]?.year ?? ''
  // шкала 1000–1600: точнее различимы вузы, куда реально целятся (Figma 3)
  const x = (v) => `${Math.min(100, Math.max(0, ((v - 1000) / 600) * 100))}%`
  const stepper = (label, value, set, tone) => (
    <div className="st-step">
      <span className="st-step__label"><i style={{ background: tone }} />{label}</span>
      <div className="st-step__row">
        <button type="button" aria-label={t('sat.goal.minus')} onClick={() => set(roundSection(value - 10))}>−</button>
        <input inputMode="numeric" value={value} aria-label={label}
          // пока печатают — число как есть, округление до 10 и 200–800 при уходе с поля: «705» не отвергается
          onChange={(e) => set(Math.min(800, Number(e.target.value.replace(/\D/g, '')) || 0))}
          onBlur={(e) => set(roundSection(e.target.value))} />
        <button type="button" aria-label={t('sat.goal.plus')} onClick={() => set(roundSection(value + 10))}>+</button>
      </div>
    </div>
  )
  return (
    <div className="st-goal">
      <div className="st-card st-goal__left">
        {stepper('Reading and Writing', rw, (v) => onChange({ rw: v, math }), SECTION.rw.tone)}
        {stepper('Math', math, (v) => onChange({ rw, math: v }), SECTION.math.tone)}
        <p className="st-muted">{t('sat.goal.step')}</p>
        <div className="st-goal__total">
          <span>{t('sat.goal.total')}</span>
          <div><b>{total}</b><span>{t('sat.goal.of')}</span></div>
        </div>
        <p className="st-goal__presets-label">{t('sat.goal.presets')}</p>
        <div className="st-goal__presets">
          {TARGET_PRESETS.map((p) => (
            <button key={p} type="button" className={total === p ? 'is-on' : ''} onClick={() => onChange(splitTotal(p))}>{p}</button>
          ))}
        </div>
      </div>
      <div className="st-card st-goal__right">
        <div className="st-goal__head">
          <div><h3>{t('sat.goal.where')}</h3><span className="st-muted">{t('sat.goal.mid50')}</span></div>
          <span className="st-goal__reach"><CheckCircleIcon size={16} />{t('sat.goal.reach', { n: String(reach.length), total: String(ranked.length) })}</span>
        </div>
        {/* подписи шкалы стоят на той же оси, что и полосы вузов: та же колонка и та же функция x() */}
        <div className="st-goal__scale" aria-hidden="true">
          <span />
          <span className="st-goal__ticks">{[1000, 1200, 1400, 1600].map((v) => <i key={v} style={{ left: x(v) }}>{v}</i>)}</span>
        </div>
        <div className="st-colleges">
          {shown.map((c) => (
            <button key={c.id} type="button" className={`st-college ${c.band === 'in' && c === shown[0] ? 'is-top' : ''}`} title={t('sat.goal.pick')}
              onClick={() => onChange(splitTotal(Math.round((c.midSAT.total[0] + c.midSAT.total[1]) / 20) * 10))}>
              <span className="st-college__name">
                <b>{c.name}</b>
                <span>
                  <span className={`st-band st-band--${c.band}`}>{t(`sat.goal.band.${c.band}`)}</span>
                  {t('sat.goal.gap', { lo: String(c.midSAT.total[0]), hi: String(c.midSAT.total[1]), gap: `${c.gap >= 0 ? '+' : '−'}${Math.abs(c.gap)}` })}
                </span>
              </span>
              <span className="st-college__bar">
                <i className={`st-range st-range--${c.band}`} style={{ left: x(c.midSAT.total[0]), width: `calc(${x(c.midSAT.total[1])} - ${x(c.midSAT.total[0])})` }} />
                <i className="st-you" style={{ left: x(total) }} />
              </span>
            </button>
          ))}
        </div>
        <div className="st-goal__foot">
          {hidden > 0 ? (
            <button type="button" className="st-link" onClick={() => setMore(true)}>{plural(t, lang, 'sat.goal.more', hidden)}<ExpandMoreIcon size={16} /></button>
          ) : more ? (
            <button type="button" className="st-link" onClick={() => setMore(false)}>{t('sat.goal.less')}</button>
          ) : <span />}
          <span className="st-goal__legend"><i />{t('sat.goal.you', { n: String(total) })}</span>
        </div>
        <p className="st-note"><InfoIcon size={18} /><span>{t('sat.goal.disclaimer', { year: String(year) })}</span></p>
      </div>
    </div>
  )
}

/** Регистрация, что взять, чего нельзя, ссылки — общий блок главы 4 (в онбординге он свёрнут под выбором даты). */
export function ExamDayDetails() {
  const { t, lang } = useI18n()
  const ch = chapterData('examday')
  return (
    <div className="st-examday">
      <h3>{t('sat.examday.steps')}</h3>
      {/* текст шага — во вложенном span: у li flex (кружок номера), и иначе каждое <b> внутри стало бы колонкой */}
      <ol className="st-steps">{ch.steps.map((s, i) => <li key={i}><span dangerouslySetInnerHTML={html(pick(s, lang))} /></li>)}</ol>
      <div className="st-bring">
        <div className="st-bring__ok"><b><CheckCircleIcon size={18} />{t('sat.examday.bring')}</b><ul>{ch.bring.map((s, i) => <li key={i} dangerouslySetInnerHTML={html(pick(s, lang))} />)}</ul></div>
        <div className="st-bring__no"><b><CloseIcon size={18} />{t('sat.examday.avoid')}</b><ul>{ch.avoid.map((s, i) => <li key={i} dangerouslySetInnerHTML={html(pick(s, lang))} />)}</ul></div>
      </div>
      {ch.links?.length > 0 && (
        <div className="st-links">
          {ch.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">{pick(l.label, lang)}<OpenInNewIcon size={16} /></a>
          ))}
        </div>
      )}
    </div>
  )
}

/** Глава 4 в онбординге (Figma 4): даты отрывными листками, «Пока выбираю дату», свёрнутая регистрация. */
export function DatePicker({ value, undecided, onChange, today = new Date() }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  // год вперёд — как на макете (шесть листков); дальние «ожидаемые» даты прототипа превращали экран в календарь
  // на два года. Уже выбранная дата остаётся видна, даже если она дальше.
  const dates = upcomingDates(examDates.dates, today).filter((d) => d.weeks <= 52 || d.testDate === value)
  const fmt = (iso, o) => fmtDate(loc, new Date(`${iso}T00:00:00Z`), { timeZone: 'UTC', ...o })
  return (
    <>
      <div className="st-dates" role="radiogroup">
        {dates.map((d) => {
          const on = !undecided && value === d.testDate
          const closed = d.status === 'closed'
          return (
            <button key={d.id} type="button" role="radio" aria-checked={on} className={`st-date ${on ? 'is-on' : ''} ${closed ? 'is-closed' : ''}`} onClick={() => onChange({ examDate: d.testDate, dateUndecided: false })}>
              <span className="st-sheet">
                <span className="st-sheet__month">{fmt(d.testDate, { month: 'short' }).replace('.', '').slice(0, 3).toUpperCase()}</span>
                <b>{fmt(d.testDate, { day: 'numeric' })}</b>
                <span className="st-sheet__year">{fmt(d.testDate, { year: 'numeric' }).replace(/\D/g, '')}</span>
              </span>
              <span className="st-date__body">
                <b>{fmt(d.testDate, { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())}</b>
                <span>{plural(t, lang, 'sat.weeksLeft', d.weeks)}</span>
                <span className={`st-reg st-reg--${d.status}`}>
                  {d.status === 'open' ? plural(t, lang, 'sat.date.status.open', d.regDays) : t(`sat.date.status.${d.status}`)}
                </span>
                {d.registrationDeadline && <span className="st-muted">{t('sat.date.deadline', { date: fmt(d.registrationDeadline, { day: 'numeric', month: 'short' }).replace('.', '') })}</span>}
              </span>
              <span className="st-radio">{on ? <CheckCircleIcon size={20} /> : <RadioOffIcon size={20} />}</span>
            </button>
          )
        })}
      </div>
      <button type="button" role="radio" aria-checked={!!undecided} className={`st-undecided ${undecided ? 'is-on' : ''}`} onClick={() => onChange({ examDate: null, dateUndecided: true })}>
        <span className="st-radio">{undecided ? <CheckCircleIcon size={20} /> : <RadioOffIcon size={20} />}</span>
        <span><b>{t('sat.date.undecided')}</b><span className="st-muted">{t('sat.date.undecidedHint')}</span></span>
      </button>
      <div className={`st-card st-howto ${open ? 'is-open' : ''}`}>
        <button type="button" className="st-howto__head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="st-point__icon"><EventIcon size={18} /></span>
          <span><b>{t('sat.date.howTo')}</b><span className="st-muted">{t('sat.date.howToSub')}</span></span>
          <ExpandMoreIcon size={22} />
        </button>
        {/* построено в разметке всегда: поиск по странице и читалка экрана находят его и в свёрнутом виде (README прототипа) */}
        <div hidden={!open}><ExamDayDetails /></div>
      </div>
    </>
  )
}

/** Справочный вид глав 3 и 4 — для «Гайда» (без выбора цели и даты). */
export function GoalReference() {
  const { lang } = useI18n()
  const ch = chapterData('goal')
  return <ul className="st-list">{ch.points.map((p, i) => <li key={i} dangerouslySetInnerHTML={html(pick(p, lang))} />)}</ul>
}

export function ChevronNext() {
  return <ChevronRightIcon size={18} />
}
