import { useCallback, useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { ArrowForwardIcon, MenuBookIcon } from '../icons.jsx'
import TaskVisual from './TaskVisual.jsx'
import { categoryLabel } from './WritingListView.jsx'
import { useI18n } from '../../i18n.jsx'
import { pickLang } from './drills/drillModel.js'
import { writingDrillsForType, writingTaskList } from '../practice/practiceModel.js'

// Пропуски шаблона [в квадратных скобках] подсвечиваются — так в прототипе видно, что подставить своё.
function Pattern({ text }) {
  return (
    <span lang="en">
      {String(text || '')
        .split(/(\[[^\]]+\])/)
        .map((s, i) => (s.startsWith('[') ? <mark key={i} className="ih-wgap">{s}</mark> : s))}
    </span>
  )
}

/**
 * «Как писать» (прототип 30-writing.html, #/writing/guide): шесть частей — шаблоны Task 1 AC по видам графиков,
 * лексика, письма GT по регистрам, каркасы эссе, лексика Task 2, связки. Содержимое — документ WR-GUIDE банка
 * (правит методист импортом), подписи — словарь прототипа (ieltsWriting.p.*). Части чужого трека не показываются,
 * как и задания Task 1 (§14.1).
 */
// section — глава из задачи плана: «t1ac.line» (часть.вид или часть.вкладка); часть чужого трека — оглавление.
// Во вкладке «Как писать» страницы Writing (embedded) глава живёт в адресе: выбор зовёт onSection, и «Назад» браузера
// возвращает на прошлую главу; без onSection (план, старые места) глава — своё состояние экрана.
// На странице типа — «Задания этого типа (N) →» (catalog, onTasksOfType) и тренировки типа (drills, onStartDrill с ty).
const PART_OF = { t1ac: 'T1', t1gt: 'GT', t2: 'T2' }

export default function WritingGuideView({ token, track, section, onBack, onSection, embedded = false, catalog, drills, onTasksOfType, onStartDrill }) {
  const { t, lang } = useI18n()
  const pick = useCallback((o) => (o && typeof o === 'object' ? o[lang] || o.ru || o.en : o), [lang])
  const [state, setState] = useState({ status: 'loading' })
  const [own, setOwn] = useState(section || null)
  // глава из адреса меняется и без перемонтирования (popstate, «Теория этого типа» из того же вида)
  const [seen, setSeen] = useState(section)
  if (seen !== section) {
    setSeen(section)
    setOwn(section || null)
  }
  const cur = onSection ? section || null : own
  const partKey = String(cur || '').split('.')[0] || null
  const sub = String(cur || '').split('.')[1] || null // вид (kinds) или вкладка (blocks)
  const go = (p, k) => {
    const next = p ? (k ? `${p}.${k}` : p) : null
    if (onSection) onSection(next)
    else setOwn(next)
  }
  const setPartKey = (p) => go(p, null)
  const setSub = (k) => go(partKey, k)

  useEffect(() => {
    let alive = true
    getIeltsTest(token || loadToken(), 'WR-GUIDE')
      .then((r) => alive && setState({ status: 'ready', guide: r.document }))
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [token])

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Writing', onClick: onBack }]
  if (state.status !== 'ready')
    return (
      <div className="ih-wguide">
        {!embedded && <Breadcrumbs items={[...crumbs, { label: t('ieltsWriting.p.guide.title') }]} />}
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>
    )

  const parts = (state.guide.parts || []).filter((p) => p.module === 'both' || p.module === track)
  const part = parts.find((p) => p.key === partKey)

  if (!part)
    return (
      <div className="ih-wguide">
        {!embedded && <Breadcrumbs items={[...crumbs, { label: t('ieltsWriting.p.guide.title') }]} />}
        <div className="ih-rlist__head">
          <div>
            <h2>{t('ieltsWriting.p.guide.title')}</h2>
            <p>{t('ieltsWriting.p.guide.sub')}</p>
          </div>
        </div>
        <div className="ih-wguide__cards">
          {parts.map((p) => (
            <button key={p.key} type="button" className="ih-card ih-wguide__card" onClick={() => setPartKey(p.key)}>
              <b>{t(`ieltsWriting.p.guide.part.${p.key}.title`)}</b>
              <span>{t(`ieltsWriting.p.guide.part.${p.key}.text`)}</span>
              <span className="ih-wguide__open">{t('ieltsWriting.p.guide.open')}<ArrowForwardIcon size={16} /></span>
            </button>
          ))}
        </div>
        <p className="ih-muted">{t('ieltsWriting.p.guide.note')}</p>
      </div>
    )

  const kinds = (part.kinds || []).filter((k) => k.skeleton)
  const blocks = part.blocks || []
  const tabs = kinds.length ? kinds.map((k) => k.key) : blocks.map((b) => b.key)
  const current = tabs.includes(sub) ? sub : tabs[0]
  const kind = kinds.find((k) => k.key === current)
  const block = blocks.find((b) => b.key === current)
  // вкладки блоков у Task 2 идут после видов эссе: у части есть и то, и другое
  const extraTabs = kinds.length ? blocks.map((b) => b.key) : []
  const extraBlock = blocks.find((b) => b.key === sub && kinds.length)
  const tabLabel = (key) => (kinds.some((k) => k.key === key) ? categoryLabel(t, part.task === 2 ? 'task2' : 'task1', key) : t(`ieltsWriting.p.guide.tabShort.${key}`))

  return (
    <div className="ih-wguide">
      {embedded ? (
        <button type="button" className="ih-back" onClick={() => setPartKey(null)}>← {t('ieltsWNav.guideToc')}</button>
      ) : (
        <Breadcrumbs items={[...crumbs, { label: t('ieltsWriting.p.guide.title'), onClick: () => setPartKey(null) }, { label: t(`ieltsWriting.p.guide.part.${part.key}.title`) }]} />
      )}
      <h2>{t(`ieltsWriting.p.guide.part.${part.key}.title`)}</h2>

      {part.rules?.length > 0 && (
        <section className="ih-card ih-wguide__rules">
          <h3>{t('ieltsWriting.p.guide.block.rules')}</h3>
          <ul>{part.rules.map((r, i) => <li key={i}>{pick(r)}</li>)}</ul>
        </section>
      )}

      <div className="ih-wguide__tabs" role="tablist" aria-label={t('ieltsWriting.p.guide.tab.label')}>
        {[...tabs, ...extraTabs].map((key) => {
          const on = extraBlock ? key === sub : key === current && !extraBlock
          return (
            <button key={key} type="button" role="tab" aria-selected={on} className={on ? 'is-on' : ''} onClick={() => setSub(key)}>
              {tabLabel(key)}
            </button>
          )
        })}
      </div>

      {kind && !extraBlock && (
        <KindView kind={kind} pick={pick} t={t} lang={lang} part={PART_OF[part.key]} track={track} catalog={catalog} drills={drills}
          onTasksOfType={onTasksOfType} onStartDrill={onStartDrill} />
      )}
      {(extraBlock || block) && <BlockView block={extraBlock || block} pick={pick} t={t} />}
    </div>
  )
}

// Задания и тренировки этого типа — вверху страницы типа (ТЗ §6): из теории сразу в практику, тренировки — с ty
function TypeLinks({ kind, part, track, catalog, drills, onTasksOfType, onStartDrill, t, lang }) {
  const n = part ? writingTaskList(catalog?.items || (Array.isArray(catalog) ? catalog : []), part === 'T2' ? 'task2' : 'task1', track).filter((x) => x.category === kind.key).length : 0
  const list = part && drills ? writingDrillsForType(drills, part, kind.key) : []
  if (!onTasksOfType && !list.length) return null
  return (
    <section className="ih-card ih-wguide__links">
      {onTasksOfType && n > 0 && (
        <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onTasksOfType(part, kind.key)}>
          {t('ieltsWNav.tasksOfType', { n: String(n) })} <ArrowForwardIcon size={16} />
        </button>
      )}
      {list.length > 0 && (
        <>
          <h3>{t('ieltsWNav.drillsOfType')}</h3>
          <div className="ih-wcat__actions">
            {list.map((d) => (
              <button key={d.id} type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onStartDrill?.(d, kind.key)}>
                {pickLang(d.name, lang) || d.title}{d.minutes ? ` · ${t('ieltsHub.minutes', { n: String(d.minutes) })}` : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function KindView({ kind, pick, t, lang, part, track, catalog, drills, onTasksOfType, onStartDrill }) {
  return (
    <>
      <TypeLinks kind={kind} part={part} track={track} catalog={catalog} drills={drills} onTasksOfType={onTasksOfType} onStartDrill={onStartDrill} t={t} lang={lang} />
      {kind.sample && (
        <section className="ih-card ih-wguide__sample">
          <h3>{t('ieltsWriting.p.guide.block.sample')}</h3>
          <p lang="en" className="ih-wguide__q">{kind.sample.question}</p>
          {kind.sample.chart && <TaskVisual chart={kind.sample.chart} />}
          <h4>{t('ieltsWriting.p.guide.sampleAnswer')}</h4>
          {kind.sample.text.map((p, i) => (
            <div key={i} className="ih-wmodel__para">
              {kind.sample.roles?.[i] && <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(`ieltsWriting.p.role.${kind.sample.roles[i]}`)}</span></span>}
              <p lang="en">{p}</p>
            </div>
          ))}
        </section>
      )}
      <section className="ih-card">
        <h3>{t('ieltsWriting.p.guide.block.skeleton')}</h3>
        <ol className="ih-wguide__skeleton">
          {kind.skeleton.map((s, i) => (
            <li key={i}>
              <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(`ieltsWriting.p.role.${s.role}`)}</span></span>
              <p>{pick(s.what)}</p>
              {s.ex && <p className="ih-wguide__ex" lang="en">«{s.ex}»</p>}
            </li>
          ))}
        </ol>
      </section>
      {kind.phrases?.length > 0 && (
        <section className="ih-card">
          <h3>{t('ieltsWriting.p.guide.block.phrases')}</h3>
          <p className="ih-muted">{t('ieltsWriting.p.guide.gapHint')}</p>
          {kind.phrases.map((g, i) => (
            <div key={i} className="ih-wguide__group">
              <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(`ieltsWriting.p.role.${g.role}`)}</span></span>
              {g.rows.map((r, k) => (
                <div key={k} className="ih-wguide__row">
                  <Pattern text={r.pattern} />
                  {r.ex && <p className="ih-wguide__ex" lang="en">«{r.ex}»</p>}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
      {kind.register?.length > 0 && (
        <section className="ih-card">
          <h3>{t('ieltsWriting.p.guide.block.register', { register: t(`ieltsWriting.p.register.${kind.key}`) })}</h3>
          {kind.register.map((r, i) => (
            <div key={i} className="ih-wguide__pair">
              <p lang="en"><b>{t('ieltsWriting.p.guide.col.ok')}:</b> {r.ok}</p>
              <p lang="en"><b>{t('ieltsWriting.p.guide.col.no')}:</b> <s>{r.no}</s></p>
              <p className="ih-muted">{pick(r.why)}</p>
            </div>
          ))}
        </section>
      )}
      {kind.mistakes?.length > 0 && (
        <section className="ih-card">
          <h3>{t('ieltsWriting.p.guide.block.mistakes')}</h3>
          {kind.mistakes.map((m, i) => (
            <div key={i} className="ih-wguide__pair">
              <p lang="en"><b>{t('ieltsWriting.p.guide.col.bad')}:</b> <s>{m.bad}</s></p>
              <p lang="en"><b>{t('ieltsWriting.p.guide.col.good')}:</b> {m.good}</p>
              <p className="ih-muted">{pick(m.why)}</p>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

// Название группы блока по ключу (прототип guide2.js, GL): у групп банка своего заголовка нет; ключа нет в словаре —
// без заголовка, как раньше
function groupLabel(t, key) {
  const k = `ieltsWNav.gl.${key}`
  const v = key ? t(k) : null
  return v && v !== k ? v : null
}

// Строки блоков бывают разных видов: конструкция с примером, выражение с «когда уместно», замена «было → стало»,
// затёртая фраза и её замена. Рисуем то, что есть в строке, — подписи колонок из словаря прототипа.
function BlockView({ block, pick, t }) {
  return (
    <>
      {block.groups.map((g) => (
        <section key={g.key} className="ih-card ih-wguide__group">
          {(g.title || groupLabel(t, g.key)) && <h3>{g.title ? pick(g.title) : groupLabel(t, g.key)}</h3>}
          {g.note && <p className="ih-muted">{pick(g.note)}</p>}
          {g.rows.map((r, i) => (
            <div key={i} className="ih-wguide__row">
              {r.pattern && <Pattern text={r.pattern} />}
              {r.phrase && <b lang="en">{r.phrase}</b>}
              {r.from && <p lang="en"><span className="ih-muted">{t('ieltsWriting.p.guide.col.from')}:</span> {r.from} → <b>{r.to}</b></p>}
              {r.worn && <p lang="en"><s>{r.worn}</s> → <b>{r.alt}</b></p>}
              {r.use && <p className="ih-muted">{pick(r.use)}</p>}
              {r.where && <p className="ih-muted">{[].concat(r.where).map((w) => t(`ieltsWriting.p.guide.where.${w}`)).join(' · ')}</p>}
              {r.ex && <p className="ih-wguide__ex" lang="en">«{r.ex}»</p>}
            </div>
          ))}
        </section>
      ))}
    </>
  )
}
