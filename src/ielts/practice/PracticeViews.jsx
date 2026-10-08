import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import { SecPlate } from '../today/TodayCards.jsx'
import {
  ArrowForwardIcon, CheckCircleIcon, ChevronRightIcon, InfoIcon, MenuBookIcon, PlayIcon, TimerIcon, TrendingUpIcon,
} from '../icons.jsx'
import { SKILLS, SKILL_TABS, listRows, listTitle, searchRows, shortRows, skillCount, skillRows } from './practiceModel.js'
import { groupByLevel, recommendedRange } from '../model/levels.js'

// Экраны «Практики IELTS» по дизайну «IELTS new» (Figma, раздел 3): каталог (поиск, четыре навыка, короткие
// тренировки, словарь) и страница навыка (хлебные крошки, поиск в навыке, вкладки, строки со статусом).

const SKILL_NAME = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' }

function SearchIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  )
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className={`ih-search${value ? ' is-active' : ''}`}>
      <SearchIcon />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  )
}

function StatusChip({ status }) {
  const { t } = useI18n()
  if (status === 'done') return <span className="ih-stchip is-done"><CheckCircleIcon size={12} /> {t('ieltsPractice.st.done')}</span>
  if (status === 'started') return <span className="ih-stchip is-started"><PlayIcon size={10} /> {t('ieltsPractice.st.started')}</span>
  if (status === 'soon') return <span className="ih-stchip is-soon">{t('ieltsPractice.st.soon')}</span>
  return <span className="ih-stchip">{t('ieltsPractice.st.new')}</span>
}

const isOpenable = (row) => row.status !== 'soon' && !!row.open

const fmtBand = (b) => (Number.isInteger(b) ? `${b}.0` : String(b))

/**
 * Рекомендуемый уровень над списком заданий (только в списках — на главной «Практики» его нет, правка владельца):
 * «Рекомендуемый уровень заданий: 6.5–7.5 · ваш уровень Reading 6.5». Без оценки навыка — честно, что её нет.
 */
function LevelBar({ skill, levelInfo }) {
  const { t } = useI18n()
  if (!levelInfo) return null
  const band = levelInfo.band?.[skill]
  return (
    <p className="ih-levelbar">
      <TrendingUpIcon size={18} />
      {band != null ? (
        <span>
          <b>{t('ieltsLevel.recommendedRange', { range: recommendedRange(band) })}</b>
          {' · '}
          {t('ieltsLevel.your', { skill: SKILL_NAME[skill], band: fmtBand(band) })}
        </span>
      ) : <span>{t('ieltsLevel.none')}</span>}
    </p>
  )
}

/**
 * Список заданий по уровню: «Рекомендуемые», «Сложнее — на вырост», внизу — «Неподходящие для вашего уровня» (слишком
 * простые), приглушённо. Задание ниже уровня не прячется: повторить базу перед экзаменом — право ученика.
 */
function LevelGroups({ rows, onOpen }) {
  const { t } = useI18n()
  // заголовки групп — всегда, во всех навыках: раньше «Рекомендуемые» пряталось, если других групп не было, и деление
  // по уровню было видно только там, где попадались задания сложнее
  const g = groupByLevel(rows)
  return (
    <div className="ih-lvgroups">
      {g.recommended.length > 0 && (
        <section className="ih-lvgroup">
          <h3 className="ih-lvgroup__title is-fit">{t('ieltsLevel.recommended')} · {g.recommended.length}</h3>
          <ul className="ih-prows">{g.recommended.map((r) => <PracticeRow key={r.id} row={r} onOpen={onOpen} />)}</ul>
        </section>
      )}
      {g.harder.length > 0 && (
        <section className="ih-lvgroup">
          <h3 className="ih-lvgroup__title is-above">{t('ieltsLevel.harder')} · {g.harder.length}</h3>
          <ul className="ih-prows">{g.harder.map((r) => <PracticeRow key={r.id} row={r} onOpen={onOpen} />)}</ul>
        </section>
      )}
      {g.unsuitable.length > 0 && (
        <section className="ih-lvgroup is-unsuitable">
          <h3 className="ih-lvgroup__title is-below">{t('ieltsLevel.unsuitable')} · {g.unsuitable.length}</h3>
          <p className="ih-lvgroup__hint">{t('ieltsLevel.unsuitableHint')}</p>
          <ul className="ih-prows">{g.unsuitable.map((r) => <PracticeRow key={r.id} row={r} onOpen={onOpen} />)}</ul>
        </section>
      )}
    </div>
  )
}

/**
 * Выбор заданий одного набора (дрилл, тип вопроса, диктовка, Task 1, Part 1, shadowing): открывается по строке набора
 * вместо первого задания — ученик сам выбирает задание, а список разделён по уровню (правка владельца в Figma).
 */
export function TaskListPage({ listKey, lists, track, onOpen, onBack, onSkill, levelInfo }) {
  const { t } = useI18n()
  const skill = String(listKey || '').split(':')[0]
  const rows = listRows(listKey, lists, track)
  const title = listTitle(listKey, t)
  return (
    <div className="ih-practice">
      <nav className="ih-crumbs" aria-label={t('ieltsPractice.crumbs')}>
        <button type="button" className="ih-link" onClick={onBack}>{t('ieltsHub.tab.learn')}</button>
        <ChevronRightIcon size={16} />
        <button type="button" className="ih-link" onClick={() => onSkill?.(skill)}>{SKILL_NAME[skill]}</button>
        <ChevronRightIcon size={16} />
        <span>{title}</span>
      </nav>
      <PageHeader title={title} sub={SKILL_NAME[skill]} />
      <LevelBar skill={skill} levelInfo={levelInfo} />
      {rows.length ? <LevelGroups rows={rows} onOpen={onOpen} /> : <EmptyBox icon={<TimerIcon size={26} />} tone="orange" title={t('ieltsLevel.empty')} />}
    </div>
  )
}

/** Строка задания: плашка навыка, название, «N мин · режим», статус и действие. «Скоро» — без кнопки. */
export function PracticeRow({ row, onOpen, compact = false }) {
  const { t } = useI18n()
  const title = row.title || t(row.titleKey)
  const soon = row.status === 'soon' || !row.open
  const meta = `${t('ieltsHub.minutes', { n: String(row.minutes) })} · ${t(`ieltsPractice.mode.${row.mode}`)}`
  if (compact) {
    return (
      <li>
        <button type="button" className={`ih-prow is-compact${soon ? ' is-soon' : ''}`} disabled={soon} onClick={() => onOpen(row.open)}>
          <SecPlate sec={row.skill} size={36} />
          <span className="ih-prow__body">
            <b>{title}</b>
            <span className="ih-prow__meta">{t('ieltsHub.minutes', { n: String(row.minutes) })} · <StatusChip status={row.status} /></span>
          </span>
          <ChevronRightIcon size={18} />
        </button>
      </li>
    )
  }
  return (
    <li className={`ih-prow${soon ? ' is-soon' : ''}`}>
      <SecPlate sec={row.skill} size={48} />
      <span className="ih-prow__body">
        <b>{title}</b>
        <span className="ih-prow__meta">{meta}</span>
      </span>
      {(row.band || row.level) && <span className={`ih-bandchip is-${row.level || 'any'}`} title={row.level === 'above' ? t('ieltsLevel.stretch') : undefined}>{row.band || t('ieltsLevel.anyLevel')}</span>}
      <StatusChip status={row.status} />
      {!soon && (
        <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onOpen(row.open)}>
          {row.status === 'started' ? t('ieltsPlan.continue') : t('ieltsPlanV.open')}
        </button>
      )}
    </li>
  )
}

function EmptyBox({ icon, tone = 'violet', title, text, children }) {
  return (
    <div className="ih-emptybox">
      <span className={`ih-emptybox__ic is-${tone}`} aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children && <div className="ih-emptybox__actions">{children}</div>}
    </div>
  )
}

function Seg({ items, value, onChange, label }) {
  // на телефоне ряд прокручивается вбок: выбранная вкладка должна быть видна, а не обрезана краем экрана.
  // Прокручиваем только сам ряд (scrollLeft), не страницу — scrollIntoView дёргал бы экран вверх-вниз
  const ref = useRef(null)
  useEffect(() => {
    const box = ref.current
    const on = box?.querySelector('[aria-selected="true"]')
    if (!box || !on || box.scrollWidth <= box.clientWidth) return
    // offsetLeft считается от offsetParent, а ряд им не является — берём разницу рамок
    const left = on.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft
    if (left < box.scrollLeft || left + on.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = left - 8
  }, [value])
  return (
    <div ref={ref} className="ih-seg2 ih-seg2--sm" role="tablist" aria-label={label}>
      {items.map((x) => (
        <button key={x.key} type="button" role="tab" aria-selected={value === x.key} className={value === x.key ? 'is-on' : ''} onClick={() => onChange(x.key)}>
          {x.label}
        </button>
      ))}
    </div>
  )
}

/** Каталог «Практики IELTS». */
export function PracticeCatalog({ lists, track, onOpen, onOpenSkill, onOpenVocab }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [shortSkill, setShortSkill] = useState('reading')
  const found = useMemo(() => searchRows(q, lists, track, t).filter(isOpenable), [q, lists, track, t])
  const shortRowsList = shortRows(shortSkill, lists, track).filter(isOpenable)
  return (
    <div className="ih-practice">
      <PageHeader title={t('ieltsHub.tab.learn')} sub={t('ieltsPractice.sub')} />
      <SearchBox value={q} onChange={setQ} placeholder={t('ieltsPractice.search')} />
      {q.trim() ? (
        found.length ? (
          <section className="ih-psec">
            <h2 className="ih-psec__title">{t('ieltsPractice.found', { n: String(found.length) })}</h2>
            <ul className="ih-prows">{found.map((r) => <PracticeRow key={r.id} row={r} onOpen={onOpen} />)}</ul>
          </section>
        ) : (
          <EmptyBox icon={<SearchIcon size={26} />} title={t('ieltsPractice.noneTitle')} text={t('ieltsPractice.noneText', { q: q.trim() })}>
            <button type="button" className="ih-btn2 ih-btn2--primary" onClick={() => setQ('')}>{t('ieltsPractice.resetFilters')}</button>
            <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => setQ('')}>{t('ieltsPractice.clearSearch')}</button>
          </EmptyBox>
        )
      ) : (
        <>
          <section className="ih-psec">
            <header className="ih-psec__head">
              <div>
                <h2 className="ih-psec__title">{t('ieltsPractice.catalog')}</h2>
                <span className="ih-psec__sub">{t('ieltsPractice.catalogSub')}</span>
              </div>
            </header>
            {/* фильтра «Показать: Все / навык» здесь нет намеренно (правка по макету): четыре карточки и так видны разом */}
            <div className="ih-skillgrid">
              {SKILLS.map((s) => {
                const n = skillCount(s, lists, track)
                return (
                  <button key={s} type="button" className="ih-skillcard" onClick={() => onOpenSkill(s)}>
                    <SecPlate sec={s} size={56} />
                    <b>{SKILL_NAME[s]}</b>
                    <span>{t(`ieltsPractice.skillSub.${s}`)}</span>
                    <span className="ih-link">{n ? t('ieltsPlanV.open') : t('ieltsPractice.st.soon')} <ArrowForwardIcon size={16} /></span>
                  </button>
                )
              })}
            </div>
          </section>
          <section className="ih-psec">
            <header className="ih-psec__head">
              <div>
                <h2 className="ih-psec__title">{t('ieltsPractice.short')}</h2>
                <span className="ih-psec__sub">{t('ieltsPractice.shortSub', { track: track === 'general' ? 'General Training' : 'Academic' })}</span>
              </div>
              <span className="ih-psec__filter">{t('ieltsPractice.skill')} <Seg items={['reading', 'listening', 'writing', 'speaking'].map((s) => ({ key: s, label: SKILL_NAME[s] }))} value={shortSkill} onChange={setShortSkill} label={t('ieltsPractice.skill')} /></span>
            </header>
            {shortRowsList.length ? (
              <ul className="ih-shortgrid">{shortRowsList.map((r) => <PracticeRow key={r.id} row={r} onOpen={onOpen} compact />)}</ul>
            ) : (
              <EmptyBox icon={<TimerIcon size={26} />} tone="orange" title={t('ieltsPractice.emptySkill', { skill: SKILL_NAME[shortSkill] })} text={t('ieltsPractice.emptySkillText')} />
            )}
          </section>
          <div className="ih-extragrid">
            <button type="button" className="ih-extra" onClick={onOpenVocab}>
              <span className="ih-plate ih-plate--writing" style={{ width: 52, height: 52 }} aria-hidden="true"><MenuBookIcon size={26} /></span>
              <span>
                <b>IELTS Vocabulary</b>
                <small>{t('ieltsPractice.vocabSub')}</small>
                <span className="ih-link">{t('ieltsPractice.vocabOpen')} <ArrowForwardIcon size={16} /></span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Страница навыка: вкладки частей/типов, поиск внутри, строки со статусом. */
export function SkillPage({ skill, tab, lists, track, onOpen, onTab, onBack, onOtherSkill, levelInfo }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const tabs = SKILL_TABS[skill]
  const cur = tabs.find((x) => x.key === tab) || tabs[0]
  // неопубликованное («Скоро · материал не опубликован») ученику не показываем вовсе — правка по макету: строка без
  // кнопки только занимала место
  const rows = skillRows(skill, cur.key, lists, track).filter(isOpenable)
  const needle = q.trim().toLowerCase()
  const shown = needle ? rows.filter((r) => (r.title || t(r.titleKey)).toLowerCase().includes(needle)) : rows
  const total = skillCount(skill, lists, track)
  return (
    <div className="ih-practice">
      <nav className="ih-crumbs" aria-label={t('ieltsPractice.crumbs')}>
        <button type="button" className="ih-link" onClick={onBack}>{t('ieltsHub.tab.learn')}</button>
        <ChevronRightIcon size={16} />
        <span>{SKILL_NAME[skill]}</span>
      </nav>
      <PageHeader title={SKILL_NAME[skill]} sub={`${t(`ieltsPractice.skillPageSub.${skill}`)}${skill === 'reading' || skill === 'writing' ? ` · ${track === 'general' ? 'General Training' : 'Academic'}` : ''}`} />
      <LevelBar skill={skill} levelInfo={levelInfo} />
      {!total ? (
        <EmptyBox icon={<TrendingUpIcon size={26} />} tone="orange" title={t('ieltsPractice.emptySkill', { skill: SKILL_NAME[skill] })} text={t('ieltsPractice.emptySkillText')}>
          <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onOtherSkill('reading')}>{t('ieltsPractice.toReading')}</button>
        </EmptyBox>
      ) : (
        <>
          <SearchBox value={q} onChange={setQ} placeholder={t('ieltsPractice.searchIn', { skill: SKILL_NAME[skill] })} />
          <Seg items={tabs.map((x) => ({ key: x.key, label: t(`ieltsPractice.tab.${skill}.${x.key}`) }))} value={cur.key} onChange={onTab} label={SKILL_NAME[skill]} />
          {shown.length ? (
            <LevelGroups rows={shown} onOpen={onOpen} />
          ) : needle ? (
            <EmptyBox icon={<SearchIcon size={26} />} title={t('ieltsPractice.noneTitle')} text={t('ieltsPractice.noneTextIn', { q: q.trim(), skill: SKILL_NAME[skill] })}>
              <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => setQ('')}>{t('ieltsPractice.clearSearch')}</button>
            </EmptyBox>
          ) : (
            <EmptyBox icon={<TimerIcon size={26} />} tone="orange" title={t('ieltsPractice.emptyTab')} text={t('ieltsPractice.emptySkillText')} />
          )}
          {(skill === 'reading' || skill === 'writing') && (
            <p className="ih-pnote"><InfoIcon size={18} /> {t(track === 'general' ? 'ieltsPractice.trackNoteGt' : 'ieltsPractice.trackNoteAc')}</p>
          )}
        </>
      )}
    </div>
  )
}
