import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import { ArrowForwardIcon, ChevronRightIcon, MenuBookIcon, TrendingUpIcon } from '../icons.jsx'
import { bandLabel, recommendedRange } from '../model/levels.js'
import {
  CRIT_SHORT, byWritingType, guideSection, isNewWritingTask, recommendWritingDrills, writingDrillChips, writingDrillGroups,
  writingDrillList, writingDrillsForType, writingParts, writingTabCounts, writingTaskList, writingTypeChips,
} from '../practice/practiceModel.js'
import { pickLang } from './drills/drillModel.js'
import ReviewCard from './drills/ReviewCard.jsx'
import TaskVisual from './TaskVisual.jsx'
import WritingGuideView from './WritingGuideView.jsx'
import { categoryLabel } from './WritingListView.jsx'
import { firstLine, useLatestWritingReview, useTaskDoc } from './catalogData.js'

// Страница Writing (ТЗ §3.2): вкладки Task 1 · Task 2 · Короткие тренировки · Как писать (+ Mock по типам, замечание
// владельца 10) со счётчиками; у заданий — чипы типа, карточки с превью графика и блок «Перед заданием этого типа».
// Вкладка, тип, часть тренировок и глава гида живут в адресе (IeltsPage: ieltsView / ieltsType / ieltsList /
// ieltsSection), поэтому «Назад» и F5 возвращают в тот же фильтр. Каталог тренировок — один компонент и здесь, и в
// блоке «Короткие тренировки» главной «Практики».

const PART_KIND = { T1: 'task1', GT: 'task1', T2: 'task2' }
const fmtBand = (b) => (Number.isInteger(b) ? `${b}.0` : String(b))

/** Подпись типа: график, регистр письма или жанр эссе; «Все» и «Общие» — свои строки. */
export function typeLabel(t, part, key) {
  if (key === 'all') return t('ieltsWNav.all')
  if (key === 'common') return t('ieltsWNav.common')
  return categoryLabel(t, PART_KIND[part] || 'task1', key) || key
}

const partLabel = (t, part) => (part === 'T2' ? 'Task 2' : part === 'GT' ? t('ieltsWNav.part.gt') : 'Task 1')

function Chips({ items, value, onChange, label, part }) {
  const { t } = useI18n()
  return (
    <div className="ih-wcat__chips" role="group" aria-label={label}>
      {items.map((c) => (
        <button key={c.key} type="button" className={`ih-wcat__chip${value === c.key ? ' is-on' : ''}`} aria-pressed={value === c.key} onClick={() => onChange(c.key)}>
          {typeLabel(t, part, c.key)}
          <span className="ih-wcat__count">{c.n}</span>
        </button>
      ))}
    </div>
  )
}

function Seg({ items, value, onChange, label }) {
  return (
    <div className="ih-seg2 ih-seg2--sm" role="tablist" aria-label={label}>
      {items.map((x) => (
        <button key={x.key} type="button" role="tab" aria-selected={value === x.key} className={value === x.key ? 'is-on' : ''} onClick={() => onChange(x.key)}>
          {x.label}
          {x.n != null && <span className="ih-wcat__count">{x.n}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- карточка задания

function TaskStatus({ task }) {
  const { t } = useI18n()
  const band = task.bestAttempt?.band ?? task.lastAttempt?.band
  if (band != null) return <span className="ih-wcat__status is-done">Band {Number(band).toFixed(1)}</span>
  if (task.attemptCount > 0) return <span className="ih-wcat__status is-pending">{t('ieltsWriting.status.pending')}</span>
  return <span className="ih-wcat__status">{t('ieltsWNav.notStarted')}</span>
}

/** Карточка задания: превью графика (Task 1 AC) или первая строка формулировки, тип, Band, статус, «новое · проще». */
export function TaskCard({ task, part, token, onOpen }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const entry = useTaskDoc(token, task.id, ref)
  const doc = entry?.doc
  const type = typeLabel(t, part, task.category)
  let preview
  if (part === 'T1' && doc?.chart) preview = <TaskVisual chart={doc.chart} mode="thumb" />
  else if (doc && firstLine(doc)) preview = <p className="ih-wcat__excerpt" lang="en">{firstLine(doc)}</p>
  else preview = <span className={`ih-wcat__ph${entry ? '' : ' is-loading'}`} aria-hidden="true" />
  return (
    <li ref={ref}>
      <button type="button" className="ih-wcat__card" onClick={() => onOpen(task)}>
        <span className="ih-wcat__preview">{preview}</span>
        <span className="ih-wcat__badges">
          {task.category && <span className="ih-wcat__badge is-type">{type}</span>}
          {isNewWritingTask(task.id) && <span className="ih-wcat__badge is-new">{t('ieltsWNav.newEasier')}</span>}
        </span>
        <b className="ih-wcat__title">{task.title}</b>
        <span className="ih-wcat__meta">
          {[t('ieltsHub.minutes', { n: String(Math.round((task.timeLimitSec || (part === 'T2' ? 2400 : 1200)) / 60)) }), bandLabel(task)].filter(Boolean).join(' · ')}
        </span>
        <span className="ih-wcat__foot">
          <TaskStatus task={task} />
          <span className="ih-link">{t('ieltsPlanV.open')} <ArrowForwardIcon size={16} /></span>
        </span>
      </button>
    </li>
  )
}

// ---------------------------------------------------------------- карточка тренировки

function drillStatus(t, d) {
  if (!d.attemptCount || !d.best?.total) return { text: t('ieltsWNav.notStarted'), cls: '' }
  const pct = Math.round((d.best.score / d.best.total) * 100)
  return pct >= 80 ? { text: t('ieltsWNav.drillPassed', { pct: String(pct) }), cls: 'is-done' } : { text: t('ieltsWNav.drillStarted', { pct: String(pct) }), cls: 'is-pending' }
}

/** Карточка тренировки; ty — тип, с которым она запустится (фильтр раундов §5.4), why — причина рекомендации. */
export function DrillCard({ drill, ty, why, onStart }) {
  const { t, lang } = useI18n()
  const st = drillStatus(t, drill)
  const types = Array.isArray(drill.types) ? drill.types : null
  const band = Array.isArray(drill.band) ? `Band ${drill.band[0]}–${drill.band[1]}` : bandLabel(drill)
  return (
    <li>
      <button type="button" className="ih-wcat__card is-drill" onClick={() => onStart(drill, ty)}>
        {why && <span className="ih-wcat__why">{why}</span>}
        <b className="ih-wcat__title">{pickLang(drill.name, lang) || drill.title}</b>
        <span className="ih-wcat__badges">
          {types ? types.map((k) => <span key={k} className="ih-wcat__badge is-type">{typeLabel(t, drill.part, k)}</span>)
            : <span className="ih-wcat__badge">{t('ieltsWNav.anyType', { part: partLabel(t, drill.part) })}</span>}
          {ty && <span className="ih-wcat__badge is-new">{typeLabel(t, drill.part, ty)}</span>}
        </span>
        <span className="ih-wcat__meta">{[drill.minutes ? t('ieltsHub.minutes', { n: String(drill.minutes) }) : null, band].filter(Boolean).join(' · ')}</span>
        <span className="ih-wcat__foot">
          <span className={`ih-wcat__status ${st.cls}`}>{st.text}</span>
          <span className="ih-link">{drill.attemptCount ? t('ieltsWNav.again') : t('ieltsWNav.start')} <ArrowForwardIcon size={16} /></span>
        </span>
      </button>
    </li>
  )
}

// ---------------------------------------------------------------- каталог тренировок (вкладка и главная «Практики»)

/**
 * Короткие тренировки Writing (ТЗ §3.1): «Рекомендуем по вашему разбору», «Повторить ошибки (N)», Task 1 / Task 2,
 * чипы Все · Общие · [типы] и группы «Общие — для любого типа» / «По типам заданий». part и type — из адреса (вкладка)
 * или своё состояние (главная): без onPart/onType компонент хранит их сам.
 */
export function WritingDrillsCatalog({ lists, track, token, part: partProp, type: typeProp, onPart, onType, onStart, onReview, compact = false }) {
  const { t } = useI18n()
  const parts = writingParts(track)
  const [ownPart, setOwnPart] = useState(parts[0])
  const [ownType, setOwnType] = useState('all')
  const part = parts.includes(partProp) ? partProp : parts.includes(ownPart) ? ownPart : parts[0]
  const drills = writingDrillList(lists, track)
  const chips = writingDrillChips(drills, part)
  const rawType = typeProp ?? ownType
  const type = chips.some((c) => c.key === rawType) ? rawType : 'all'
  const groups = writingDrillGroups(drills, part, type)
  const review = useLatestWritingReview(token)
  const rec = recommendWritingDrills(review && parts.includes(review.part) ? review : null, drills)
  const setPart = (p) => (onPart ? onPart(p) : (setOwnPart(p), setOwnType('all')))
  const setType = (k) => (onType ? onType(k) : setOwnType(k))
  // тренировка с типом запускается с ty, если тип — фильтр списка и он к ней относится
  const tyFor = (d) => (type !== 'all' && type !== 'common' && (Array.isArray(d.types) ? d.types.includes(type) : d.tys.includes(type)) ? type : null)
  const critName = (c) => t(`ieltsWriting.crit.${c}`)
  return (
    <div className={`ih-wcat__drills${compact ? ' is-compact' : ''}`}>
      {rec.length > 0 && (
        <section className="ih-wcat__sec">
          <h3 className="ih-wcat__h">{t('ieltsWNav.recTitle')}</h3>
          <ul className="ih-wcat__grid">
            {rec.map(({ drill, crit }) => (
              <DrillCard key={drill.id} drill={drill} ty={review.category && (Array.isArray(drill.types) ? drill.types.includes(review.category) : drill.tys.includes(review.category)) ? review.category : null}
                why={t('ieltsWNav.byReview', { title: review.title || '', crit: `${critName(crit)} (${CRIT_SHORT[crit]})` })} onStart={onStart} />
            ))}
          </ul>
        </section>
      )}
      {onReview && <ReviewCard token={token} onOpen={onReview} />}
      <Seg items={parts.map((p) => ({ key: p, label: partLabel(t, p) }))} value={part} onChange={setPart} label={t('ieltsWNav.drillsPart')} />
      {chips.length > 1 && <Chips items={chips} value={type} onChange={setType} label={t('ieltsWNav.filter')} part={part} />}
      {groups.length ? (
        groups.map((g) => (
          <section key={g.key} className="ih-wcat__sec">
            <h3 className="ih-wcat__h">
              {g.key === 'type' ? t('ieltsWNav.groupType', { type: typeLabel(t, part, g.ty) }) : t(`ieltsWNav.group.${g.key}`)}
              <span className="ih-wcat__count">{g.list.length}</span>
            </h3>
            <ul className="ih-wcat__grid">{g.list.map((d) => <DrillCard key={d.id} drill={d} ty={tyFor(d)} onStart={onStart} />)}</ul>
          </section>
        ))
      ) : (
        <p className="ih-muted">{t('ieltsWNav.noDrills')}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- вкладки Task 1 / Task 2

function LevelLine({ levelInfo }) {
  const { t } = useI18n()
  const band = levelInfo?.band?.writing
  return (
    <p className="ih-levelbar">
      <TrendingUpIcon size={18} />
      {band != null ? <span>{t('ieltsWNav.level', { band: fmtBand(band), range: recommendedRange(band) })}</span> : <span>{t('ieltsLevel.none')}</span>}
    </p>
  )
}

/** «Перед заданием этого типа» (§3.2): теория типа, 3–4 тренировки типа (с ty) и «Все тренировки по типу →». */
function BeforeType({ part, type, drills, onTheory, onStart, onAllDrills }) {
  const { t, lang } = useI18n()
  const list = writingDrillsForType(drills, part, type)
  return (
    <section className="ih-wcat__before">
      <div className="ih-wcat__beforehead">
        <span className="ih-wcat__badge is-type">{typeLabel(t, part, type)}</span>
        <h3>{t('ieltsWNav.beforeType')}</h3>
      </div>
      <div className="ih-wcat__actions">
        <button type="button" className="ih-btn2 ih-btn2--outline" onClick={onTheory}>
          <MenuBookIcon size={16} /> {t('ieltsWNav.theoryType')}
        </button>
        {list.map((d) => (
          <button key={d.id} type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onStart(d, type)}>
            {pickLang(d.name, lang) || d.title}{d.minutes ? ` · ${t('ieltsHub.minutes', { n: String(d.minutes) })}` : ''}
          </button>
        ))}
        <button type="button" className="ih-link ih-wcat__more" onClick={onAllDrills}>
          {t('ieltsWNav.allTypeDrills')} <ChevronRightIcon size={16} />
        </button>
      </div>
    </section>
  )
}

function TaskTab({ kind, part, type, lists, track, token, levelInfo, onType, onOpenTask, onTheory, onStart, onAllDrills }) {
  const { t } = useI18n()
  const all = writingTaskList(lists.writing, kind, track)
  const chips = writingTypeChips(all, part)
  const ty = chips.some((c) => c.key === type) ? type : 'all'
  const shown = byWritingType(all, ty)
  const drills = writingDrillList(lists, track)
  return (
    <>
      <LevelLine levelInfo={levelInfo} />
      {chips.length > 2 && <Chips items={chips} value={ty} onChange={onType} label={t('ieltsWNav.filter')} part={part} />}
      {ty !== 'all' && <BeforeType part={part} type={ty} drills={drills} onTheory={() => onTheory(guideSection(part, ty))} onStart={onStart} onAllDrills={() => onAllDrills(part, ty)} />}
      {shown.length ? (
        <ul className="ih-wcat__grid is-tasks">{shown.map((x) => <TaskCard key={x.id} task={x} part={part} token={token} onOpen={onOpenTask} />)}</ul>
      ) : (
        <p className="ih-muted">{t('ieltsListening.emptyList')}</p>
      )}
    </>
  )
}

// ---------------------------------------------------------------- страница Writing

export const WRITING_TAB_ORDER = ['task1', 'task2', 'drills', 'guide', 'mock']

/**
 * tab — task1 | task2 | drills | guide | mock; type — фильтр (ieltsType); list — часть тренировок (ieltsList: T1|GT|T2);
 * section — глава гида. nav(next, { scroll }) — переход хаба (pushState); onBack — «← Назад» (история хаба).
 * mockBody — содержимое вкладки mock (строки страницы навыка, их рисует IeltsPage прежним списком).
 */
export function WritingSkillPage({ tab, type, list, section, lists, track, token, levelInfo, catalog, nav, onBack, onLearn, mockBody }) {
  const { t } = useI18n()
  const counts = writingTabCounts(lists, track)
  const p1 = track === 'general' ? 'GT' : 'T1'
  const view = { task1: 'writing-task1', task2: 'writing-task2', drills: 'writing-drills', guide: 'writing-guide', mock: 'writing-mocks' }
  const tabs = WRITING_TAB_ORDER.map((key) => ({
    key,
    label: key === 'task1' ? partLabel(t, p1) : key === 'task2' ? 'Task 2' : key === 'guide' ? t('ieltsWNav.tab.guide') : t(`ieltsPractice.tab.writing.${key}`),
    n: counts[key],
  }))
  const toTab = (key) => nav({ tab: 'learn', view: view[key] })
  const startDrill = (d, ty) => nav({ tab: 'learn', view: 'writing-drills', testId: d.id, ty: ty || null })
  const openTask = (x) => nav({ tab: 'learn', view: x.kind === 'task2' ? 'writing-task2' : 'writing-task1', testId: x.id, ty: type || null })
  const theory = (sec) => nav({ tab: 'learn', view: 'writing-guide', section: sec })
  const allDrills = (part, ty) => nav({ tab: 'learn', view: 'writing-drills', list: part, ty })
  const tasksOfType = (part, ty) => nav({ tab: 'learn', view: part === 'T2' ? 'writing-task2' : 'writing-task1', ty })

  // выбранная вкладка видна в ряду на телефоне (ряд прокручивается вбок, как Seg страницы навыка)
  const rowRef = useRef(null)
  useEffect(() => {
    const on = rowRef.current?.querySelector('[aria-selected="true"]')
    if (on && rowRef.current.scrollWidth > rowRef.current.clientWidth) rowRef.current.scrollLeft = Math.max(0, on.offsetLeft - 8)
  }, [tab])

  let body
  if (tab === 'task1' || tab === 'task2') {
    const part = tab === 'task2' ? 'T2' : p1
    body = (
      <TaskTab kind={tab} part={part} type={type} lists={lists} track={track} token={token} levelInfo={levelInfo}
        onType={(k) => nav({ tab: 'learn', view: view[tab], ty: k === 'all' ? null : k }, { scroll: false })}
        onOpenTask={openTask} onTheory={theory} onStart={startDrill} onAllDrills={allDrills} />
    )
  } else if (tab === 'drills') {
    body = (
      <WritingDrillsCatalog lists={lists} track={track} token={token} part={list} type={type || 'all'}
        onPart={(p) => nav({ tab: 'learn', view: 'writing-drills', list: p }, { scroll: false })}
        onType={(k) => nav({ tab: 'learn', view: 'writing-drills', list, ty: k === 'all' ? null : k }, { scroll: false })}
        onStart={startDrill} onReview={() => nav({ tab: 'learn', view: 'writing-drills', testId: 'review' })} />
    )
  } else if (tab === 'guide') {
    body = (
      <WritingGuideView token={token} track={track} section={section} embedded catalog={catalog} drills={writingDrillList(lists, track)}
        onSection={(sec) => nav({ tab: 'learn', view: 'writing-guide', section: sec }, { scroll: false })}
        onTasksOfType={tasksOfType} onStartDrill={startDrill} onBack={onLearn} />
    )
  } else body = mockBody

  return (
    <div className="ih-practice ih-wcat">
      <nav className="ih-crumbs" aria-label={t('ieltsPractice.crumbs')}>
        <button type="button" className="ih-link" onClick={onLearn}>{t('ieltsHub.tab.learn')}</button>
        <ChevronRightIcon size={16} />
        <span>Writing</span>
      </nav>
      {onBack && <button type="button" className="ih-back" onClick={onBack}>← {t('ieltsWNav.back')}</button>}
      <PageHeader title="Writing" sub={`${t('ieltsPractice.skillPageSub.writing')} · ${track === 'general' ? 'General Training' : 'Academic'}`} />
      <div ref={rowRef} className="ih-wcat__tabs">
        <Seg items={tabs} value={tab} onChange={toTab} label="Writing" />
      </div>
      {body}
    </div>
  )
}
