import { useEffect, useState } from 'react'
import { getSatBluebook, getSatProfile, getSatRoadmap } from '../api.js'
import { loadToken } from '../lib/session.js'
import { plural } from '../lib/plural.js'
import { useI18n } from '../i18n.jsx'
import { ArrowForwardIcon, ChevronLeftIcon, CloseIcon, EditIcon, FlagIcon, ScheduleIcon, TrendingUpIcon } from '../ielts/icons.jsx'
import { CalendarIcon, TargetIcon, TickIcon } from '../sat/icons.jsx'
import { domainName } from '../sat/names.js'
import {
  baselineSnapshot, compareChart, compareHeadline, domainRows, nextCheck, phaseAfter, phaseOfTest, scoreRows, testParam,
} from '../sat/model/compare.js'

const W = 500
const H = 200

// минус — типографский, как в макете («−10»), а не дефис
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

function readTest() {
  try {
    return testParam(new URLSearchParams(window.location.search).get('satCompare'), { compare: true })
  } catch {
    return null
  }
}

/** Назад в хаб: вкладка из адреса (откуда пришли) или заданная; фазу «План» откроет сам (satPhase). */
function toHubParams({ tab, phase }) {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('satCompare')
    if (tab) url.searchParams.set('satTab', tab)
    if (phase) url.searchParams.set('satPhase', String(phase))
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — хаб откроет «Сегодня» */
  }
}

function currentTab() {
  try {
    return new URLSearchParams(window.location.search).get('satTab')
  } catch {
    return null
  }
}

/** График «Баллы» (17:8528): цель пунктиром, ранние точки полые, последняя — сплошная; без роста линия серая. */
function ScoresChart({ chain, tests, goal, flat }) {
  const { t } = useI18n()
  const c = compareChart(chain, goal, { w: W, h: H })
  if (!c) return null
  const last = c.points.length - 1
  return (
    <svg className={`st-cmp__chart ${flat ? 'is-flat' : ''}`} viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={t('sat.cmp.scores')}>
      {c.ticks.map((k) => (
        <g key={k.v}>
          <line x1={40} x2={W - 20} y1={k.y} y2={k.y} className="st-traj__grid" />
          <text x={0} y={k.y + 4} className="st-cmp__tick">{k.v}</text>
        </g>
      ))}
      {c.goal != null && (
        <g>
          <line x1={40} x2={W - 20} y1={c.goal} y2={c.goal} className="st-cmp__goal" />
          <text x={W - 36} y={c.goal - 6} className="st-cmp__goalText">{t('sat.scores.goal', { n: String(goal) })}</text>
        </g>
      )}
      {c.points.length > 1 && <polyline className="st-cmp__line" points={c.points.map((p) => `${p.x},${p.y}`).join(' ')} />}
      {c.points.map((p, i) => (
        <g key={tests[i]}>
          <circle cx={p.x} cy={p.y} r={i === last ? 6 : 5} className={`st-cmp__dot ${i === last ? 'is-last' : ''}`} />
          <text x={p.x} y={p.y - 14} className="st-cmp__val">{p.v}</text>
          <text x={p.x} y={H + 12} className="st-cmp__x">Test {tests[i]}</text>
        </g>
      ))}
    </svg>
  )
}

/**
 * Сравнение после Bluebook Test 8 или 10 — `?screen=sat-compare&satCompare=<8|10>` (Figma «NEW 2», 17:8528, 17:8678,
 * 17:8831). Два блока нарочно раздельно: «Баллы» — три числа, которые студент ввёл из Bluebook, «Карта доменов» — то,
 * что видит платформа (снимок на Test 6 и карта сейчас): Bluebook отдаёт только три числа. Красного нет нигде: падение
 * балла — повод для плана, а не приговор (вариант «почти не изменился» с блоком «Что делаем дальше»).
 */
export default function SatComparePage({ token, onNav }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [test, setTest] = useState(null)
  const [data, setData] = useState(null)
  const [goal, setGoal] = useState(null)
  const [roadmap, setRoadmap] = useState(null)

  useEffect(() => {
    setTest(readTest())
    window.scrollTo(0, 0)
    getSatBluebook(authToken).then(setData).catch(() => setData({ tests: [] }))
    getSatProfile(authToken).then((p) => setGoal(p?.targetTotal ?? null)).catch(() => setGoal(null))
    getSatRoadmap(authToken).then((r) => setRoadmap(r?.roadmap || null)).catch(() => setRoadmap(null))
  }, [authToken])

  const leave = (tab, phase) => {
    toHubParams({ tab, phase })
    onNav?.('sat')
  }
  // выход — туда, откуда пришли: из «Плана» — на карточку этого теста, из «Пробников» — в таблицу
  const back = () => leave(null, currentTab() === 'plan' ? phaseOfTest(roadmap, test) : null)

  const head = test && data ? compareHeadline(data.tests, test) : null
  const mine = data?.tests?.find((x) => x.test === test) || null
  const next = phaseAfter(roadmap, test)
  const check = test ? nextCheck(roadmap, test) : null
  const snapshot = baselineSnapshot(data?.snapshots, test)
  const domains = domainRows(data?.currentDomains, snapshot, data?.currentFocus)
  const focus = data?.currentFocus || []
  const names = (ids) => ids.map((id) => domainName(id, lang)).join(', ')

  let body
  if (!test) body = <p className="st-error" role="alert">{t('sat.bb.noTest')}</p>
  else if (!data) body = null
  else if (!head) {
    body = (
      <div className="st-cmp__empty">
        <p className="st-muted">{t('sat.cmp.empty', { n: String(test) })}</p>
        <button type="button" className="ih-btn ih-btn--outline" onClick={back}>{t('sat.ob.back')}</button>
      </div>
    )
  } else {
    const flat = head.variant === 'flat'
    const lastTotal = head.chain[head.chain.length - 1]
    const gap = goal ? goal - lastTotal : null
    const title = flat
      ? t('sat.cmp.flat', { d: signed(head.delta) })
      : plural(t, lang, head.variant === 'three' ? 'sat.cmp.three' : 'sat.cmp.grew', head.delta)
    const lead = flat
      ? t('sat.cmp.flatLead')
      : [
          t('sat.cmp.chain', { tests: head.tests.map((n) => `Test ${n}`).join(' → '), scores: head.chain.join(' → ') }),
          gap == null ? null : gap > 0 ? t('sat.cmp.gap', { goal: String(goal), n: String(gap) }) : t('sat.cmp.reached', { goal: String(goal) }),
        ].filter(Boolean).join(' ')
    const newIds = domains.filter((d) => d.status === 'new').map((d) => d.id)
    const priorityIds = newIds.length ? newIds : focus
    const nextCards = [
      priorityIds.length > 0 && next && {
        key: 'prio', icon: <TargetIcon size={20} />, title: t('sat.cmp.nextPrio'),
        sub: t('sat.cmp.nextPrioSub', { list: names(priorityIds), n: String(next.n) }),
      },
      check && {
        key: 'check', icon: <CalendarIcon size={20} />, title: t('sat.cmp.nextCheck', { n: String(check.test) }),
        sub: [check.week != null ? t('sat.cmp.afterWeek', { n: String(check.week) }) : null, check.weeks != null ? t('sat.cmp.inWeeks', { w: plural(t, lang, 'sat.cmp.weeks', check.weeks) }) : null].filter(Boolean).join(', '),
      },
    ].filter(Boolean)

    body = (
      <div className="st-cmp">
        <span className="st-cmp__eyebrow">{t('sat.cmp.eyebrow', { n: String(test) })}</span>
        <h1 className="st-cmp__title">{title}</h1>
        <p className="st-cmp__lead">{lead}</p>

        {/* «12 ошибок из Test 8 уже в журнале» макета не рисуем: ошибки Bluebook на платформу не попадают — нечем считать */}
        {flat && nextCards.length > 0 && (
          <section className="st-cmp__next">
            <h2>{t('sat.cmp.next')}</h2>
            <div className="st-cmp__nextRow">
              {nextCards.map((c) => (
                <div key={c.key} className="st-cmp__nextCard">
                  <span className="st-cmp__nextIcon">{c.icon}</span>
                  <span><b>{c.title}</b>{c.sub && <small>{c.sub}</small>}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="st-cmp__row">
          <section className="st-card st-cmp__card">
            <h2>{t('sat.cmp.scores')}</h2>
            <span className="st-cmp__chip"><EditIcon size={14} />{t(mine?.reviewStatus === 'APPROVED' ? 'sat.cmp.srcApproved' : 'sat.cmp.srcPending')}</span>
            <ScoresChart chain={head.chain} tests={head.tests} goal={goal} flat={flat} />
            <ul className="st-cmp__rows">
              {scoreRows(data.tests, test).map((r) => (
                <li key={r.key}>
                  <span>{t(`sat.bb.${r.key}`)}</span>
                  <span className="st-spacer" />
                  <span className="st-muted">{r.from}</span>
                  <span className="st-muted" aria-hidden="true">→</span>
                  <b>{r.to}</b>
                  <span className={`st-cmp__delta ${r.up ? 'is-up' : ''}`}>{signed(r.delta)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="st-card st-cmp__card">
            <h2>{t('sat.cmp.domains')}</h2>
            <span className="st-cmp__chip is-violet"><TrendingUpIcon size={14} />{t('sat.cmp.domainsChip')}</span>
            {domains.length === 0 ? <p className="st-muted">{t('sat.cmp.noDomains')}</p> : (
              <ul className="st-cmp__domains">
                {domains.map((d) => (
                  <li key={d.id} className={`is-${d.status}`}>
                    <div>
                      <b>{domainName(d.id, lang)}</b>
                      <span className="st-cmp__bar">
                        <small className="st-muted">{d.from == null ? '—' : `${d.from}%`}</small>
                        <small className="st-muted" aria-hidden="true">→</small>
                        <i><em style={{ width: `${Math.max(2, d.now)}%` }} /></i>
                        <small><b>{d.now}%</b></small>
                      </span>
                    </div>
                    <span className={`st-cmp__status is-${d.status}`}>
                      {d.status === 'closed' ? <TickIcon size={14} /> : d.status === 'left' ? <ScheduleIcon size={14} /> : <FlagIcon size={14} />}
                      {t(`sat.cmp.status.${d.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {focus.length > 0 && (
              <>
                <h3 className="st-cmp__prioTitle">{t('sat.cmp.priorities')}</h3>
                {/* в макете у приоритета ещё и навыки — их сервер пока не отдаёт (FOCUS = два домена) */}
                <div className="st-cmp__pills">{focus.map((id) => <span key={id}>{domainName(id, lang)}</span>)}</div>
              </>
            )}
          </section>
        </div>

        <div className="st-cmp__foot">
          <p className="st-muted">{t('sat.cmp.foot')}</p>
          <span className="st-spacer" />
          <button type="button" className="ih-btn ih-btn--outline" onClick={() => leave('errors')}>{t('sat.cmp.errors')}</button>
          {next && (
            <button type="button" className="ih-cta" onClick={() => leave('plan', next.n)}>
              {t(next.kind === 'self' ? 'sat.cmp.toSelf' : 'sat.cmp.toPlan')}<ArrowForwardIcon size={20} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ih st st-ob st-full">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <b className="st-ob__logo">just to study</b>
        {test && <span className="ih-chip ih-chip--sm"><span>{t('sat.cmp.chip', { n: String(test) })}</span></span>}
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={back}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <main className="ih-enter">{body}</main>
    </div>
  )
}
