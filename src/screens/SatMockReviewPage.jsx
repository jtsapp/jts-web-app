import { useEffect, useMemo, useState } from 'react'
import { getSatMockReview, getSatProfile, startSatSession } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import HtmlBlock from '../sat/question/HtmlBlock.jsx'
import AnswerChoices from '../sat/question/AnswerChoices.jsx'
import { pick } from '../sat/model/profile.js'
import { moduleNo, reviewList, shortClock, unanswered } from '../sat/model/mock.js'
import { domainName, skillName } from '../sat/names.js'
import { ArrowBackIcon, BookmarkIcon, FlashIcon, RobotIcon } from '../sat/icons.jsx'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, MenuBookIcon } from '../ielts/icons.jsx'

const FILTERS = ['all', 'wrong', 'marked']

function readId() {
  try {
    return new URLSearchParams(window.location.search).get('satMock')
  } catch {
    return null
  }
}

function setParams(patch) {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(patch)) {
      if (v) url.searchParams.set(k, v)
      else url.searchParams.delete(k)
    }
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — параметры не пишем */
  }
}

const modLabel = (t, m) => `${m.section === 'math' ? 'Math' : 'R&W'} · ${t('sat.mock.moduleN', { n: String(moduleNo(m.key)) })}`
const answerText = (v) => (Array.isArray(v) ? v.join(' · ') : v == null ? '—' : String(v))

/**
 * Разбор пробника — `?screen=sat-mock-review&satMock=<id>` (Figma SAT 34). Объяснения и ИИ открываются только после
 * теста: слева все вопросы с фильтром «все / неверные / отмеченные», в центре вопрос с верным и выбранным вариантом,
 * справа ваш ответ рядом с правильным, время и причина. У пробника (paper) объяснений нет — он для того и пробник.
 */
export default function SatMockReviewPage({ token, onNav }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('wrong')
  const [at, setAt] = useState(0)
  const [explainLang, setExplainLang] = useState('ru')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const id = readId()
    getSatMockReview(authToken, id)
      .then((d) => {
        if (!alive) return
        setData(d)
        // все верно — фильтр «неверные» был бы пустым
        if (!d.modules.some((m) => m.items.some((x) => !x.correct))) setFilter('all')
      })
      .catch((e) => alive && setError(e?.serverMessage || t('sat.study.netError')))
    getSatProfile(authToken).then((p) => alive && p?.explainLang && setExplainLang(p.explainLang)).catch(() => {})
    window.scrollTo(0, 0)
    return () => {
      alive = false
    }
  }, [authToken, t])

  const list = useMemo(() => (data ? reviewList(data.modules, filter) : []), [data, filter])
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, data ? reviewList(data.modules, f).length : 0])), [data])

  const toHub = () => {
    setParams({ satTab: 'mocks', satMock: null })
    onNav?.('sat')
  }
  const toResult = () => onNav?.('sat-mock')
  const practice = async (skillId) => {
    setBusy(true)
    try {
      const s = await startSatSession(authToken, { mode: 'skills', skillIds: [skillId], count: 10 })
      setParams({ satSession: s.id, satLesson: null, satMock: null })
      onNav?.('sat-study')
    } catch (e) {
      setError(e?.serverMessage || t('sat.study.netError'))
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="ih st st-mrev">
        {error && <div className="ih-empty st-study__err"><h2>{t('sat.mock.cantOpen')}</h2><p>{error}</p></div>}
      </div>
    )
  }

  const paper = !!data.paperId
  const sel = list[Math.min(at, list.length - 1)]
  const item = sel?.item
  const all = data.modules.reduce((s, m) => s + m.items.length, 0)
  const right = data.modules.reduce((s, m) => s + m.items.filter((x) => x.correct).length, 0)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const date = data.finishedAt ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(new Date(data.finishedAt)) : ''
  const go = (i) => {
    setAt(Math.max(0, Math.min(list.length - 1, i)))
    document.querySelector('.st-mrev__main')?.scrollTo?.(0, 0)
  }
  const setF = (f) => {
    setFilter(f)
    setAt(0)
  }
  const blank = item ? unanswered(item) : false
  const mcq = item?.type === 'mcq'
  const chosenReason = item && mcq && !item.correct && !blank && item.distractors ? pick(item.distractors[item.given], explainLang) : ''

  return (
    <div className="ih st st-mrev">
      <header className="st-mrev__top">
        <div className="st-mrev__left">
          <button type="button" className="ih-round" aria-label={t('sat.ob.back')} onClick={toHub}><ArrowBackIcon size={20} /></button>
          <div>
            <b>{paper ? t('sat.mock.reviewPaper', { title: data.paperTitle || '' }) : t('sat.mock.reviewSim', { date })}</b>
            <span>{plural(t, lang, 'sat.q', all)} · {t('sat.mock.rightN', { n: String(right) })}</span>
          </div>
        </div>
        {sel && <span className="st-mrev__mod"><MenuBookIcon size={18} />{modLabel(t, sel.module)}</span>}
        <div className="st-mrev__right">
          <button type="button" className="ih-btn ih-btn--outline" onClick={toResult}>{t('sat.mock.toResult')}</button>
        </div>
      </header>

      <div className="st-mrev__body">
        <aside className="st-mrev__list">
          <div className="ih-seg" role="tablist">
            {FILTERS.map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : ''} onClick={() => setF(f)}>
                {t(`sat.mock.filter.${f}`)}{f === 'wrong' ? ` · ${counts.wrong}` : ''}
              </button>
            ))}
          </div>
          {list.length === 0 && <p className="st-muted">{t(`sat.mock.filterEmpty.${filter}`)}</p>}
          {data.modules.map((m) => {
            const rows = list.map((x, i) => ({ ...x, i })).filter((x) => x.module.key === m.key)
            if (!rows.length) return null
            return (
              <div key={m.key} className="st-mrev__group">
                <h3>{modLabel(t, m)}</h3>
                {rows.map(({ item: it, i }) => {
                  const none = unanswered(it)
                  return (
                    <button key={it.id} type="button" className={`st-mrev__row ${i === at ? 'is-on' : ''}`} onClick={() => go(i)}>
                      <span className={`st-mrev__n ${it.correct ? 'is-right' : none ? 'is-blank' : 'is-wrong'}`}>{it.n}</span>
                      <span className="st-mrev__skill">{skillName(it.skillId, lang)}</span>
                      {it.marked && <BookmarkIcon size={14} filled />}
                      {none && <small className="st-mrev__none">{t('sat.mock.noAnswer')}</small>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </aside>

        <main className="st-mrev__main">
          {item && (
            <div key={item.id} className="ih-enter st-mrev__q">
              {item.passage && <HtmlBlock html={item.passage} className="st-card st-mrev__passage" />}
              <div className="st-mrev__qhead">
                <span className="st-mrev__num">{item.n}</span>
                {item.marked && <span className="st-mrev__marked"><BookmarkIcon size={14} filled />{t('sat.mock.marked')}</span>}
                <span className="st-spacer" />
                <span className="st-mrev__where">{domainName(item.domain, lang)} · {skillName(item.skillId, lang)}</span>
              </div>
              <HtmlBlock html={item.stem} className="st-mrev__stem" />
              {mcq ? (
                <AnswerChoices options={item.options || []} value={item.given} verdict={{ answer: item.answer, chosen: item.given }} disabled />
              ) : (
                <div className={`st-mrev__spr ${item.correct ? 'is-right' : 'is-wrong'}`}>
                  <span>{t('sat.mock.yourAnswer')}: <b>{blank ? t('sat.mock.noAnswer') : answerText(item.given)}</b></span>
                  <span>{t('sat.mock.correctAnswer')}: <b>{answerText(item.answer)}</b></span>
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="st-mrev__side">
          {item && (
            <>
              <div className="st-mrev__tiles">
                <div className={item.correct ? 'is-right' : 'is-wrong'}>
                  <small>{t('sat.mock.yourAnswer')}</small>
                  <b>{blank ? '—' : answerText(item.given)}</b>
                </div>
                <div className="is-right">
                  <small>{t('sat.mock.correctShort')}</small>
                  <b>{answerText(item.answer)}</b>
                </div>
                <div>
                  <small>{t('sat.mock.time')}</small>
                  <b>{item.timeSec != null ? shortClock(item.timeSec) : '—'}</b>
                </div>
              </div>
              {paper ? (
                <p className="st-mrev__paperNote"><InfoIcon size={18} />{t('sat.mock.paperNoExplain')}</p>
              ) : (
                <>
                  <h2>{t('sat.study.explanation')}</h2>
                  {pick(item.explanation, explainLang)
                    ? <div className="st-mrev__xp" dangerouslySetInnerHTML={{ __html: pick(item.explanation, explainLang) }} />
                    : <p className="st-muted">{t('sat.mock.noExplain')}</p>}
                  {chosenReason && (
                    <div className="st-mrev__why">
                      <b>{item.given}</b>
                      <span dangerouslySetInnerHTML={{ __html: chosenReason }} />
                    </div>
                  )}
                  {mcq && !item.correct && blank && item.distractors && (
                    <p className="st-muted">{t('sat.mock.blankNote')}</p>
                  )}
                </>
              )}
              <span className="st-spacer" />
              {!paper && (
                // ИИ-наставник — заглушка до флага SAT_AI (решение A плана): видна, помечена «скоро», ничего не делает
                <button type="button" className="st-mrev__ai is-locked" disabled title={t('sat.ai.soon')}>
                  <RobotIcon size={20} />{t('sat.mock.askAi')}<span className="st-soon">{t('sat.ai.soonChip')}</span>
                </button>
              )}
              <button type="button" className="ih-btn ih-btn--outline st-mrev__practice" disabled={busy} onClick={() => practice(item.skillId)}>
                <FlashIcon size={18} />{t('sat.mock.practiceSkill')}
              </button>
            </>
          )}
        </aside>
      </div>

      <footer className="st-mrev__bottom">
        <b>{list.length ? t(filter === 'wrong' ? 'sat.mock.errorOf' : 'sat.mock.questionOf', { i: String(at + 1), n: String(list.length) }) : ''}</b>
        <span className="st-spacer" />
        <button type="button" className="ih-btn ih-btn--outline" disabled={at <= 0} onClick={() => go(at - 1)}><ChevronLeftIcon size={16} />{t('sat.mock.prev')}</button>
        <button type="button" className="ih-cta st-mrev__next" disabled={at >= list.length - 1} onClick={() => go(at + 1)}>
          {t(filter === 'wrong' ? 'sat.mock.nextError' : 'sat.mock.next')}<ChevronRightIcon size={16} />
        </button>
      </footer>
      {error && <p className="st-error st-run__toast" role="alert">{error}</p>}
    </div>
  )
}

