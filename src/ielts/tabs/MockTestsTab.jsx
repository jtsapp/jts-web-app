import { useEffect, useState } from 'react'
import { setIeltsParams } from '../urlParams.js'
import { getIeltsMocks } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { useI18n } from '../../i18n.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { MOCK_ORDER } from '../mock/mockSession.js'
import { ArrowForwardIcon, CheckCircleIcon, ChevronLeftIcon, QuizIcon, RadioOffIcon, ScheduleIcon, TimerIcon, CloseIcon } from '../icons.jsx'

// Вкладка «Mock-тесты» (дизайн «IELTS new», Figma 92:3267): полный экзамен, последняя попытка, доступные mock трека
// и история попыток. Mock — документы банка skill = mock (backend TEST_FORMAT.md §11), попытки — сессии с серверными
// часами; отдельные полные тесты секций живут в «Практике IELTS».

const SHORT = { listening: 'L', reading: 'R', writing: 'W', speaking: 'S' }

// partial — итог ещё будет (ИИ проверяет); сдан без overall и не partial — итога не будет (нет ответа или проверка
// не удалась), и «Проверяется» тут было бы неправдой
function attemptStatus(s) {
  if (s.status === 'aborted') return 'aborted'
  if (s.status === 'in_progress') return 'in_progress'
  if (s.partial) return 'checking'
  return s.overall == null ? 'incomplete' : 'done'
}

function StatusChip({ status }) {
  const { t } = useI18n()
  const Icon = status === 'done' ? CheckCircleIcon : status === 'aborted' ? CloseIcon : status === 'not_started' ? RadioOffIcon : ScheduleIcon
  const tone = { done: 'green', checking: 'violet', in_progress: 'amber', aborted: 'grey', not_started: 'grey', submitted: 'green', incomplete: 'grey' }[status]
  return <span className={`ih-mkchip is-${tone}`}><Icon size={13} />{t(`ieltsMt.status.${status}`)}</span>
}

// «Выбрать mock-тест» ведёт на страницу выбора (Figma «Страница mock test», 110:1310): доступные тесты и история
// карточками. Открыта ли она — в адресе (?ieltsMockList=1), чтобы F5 и «назад» из описания mock возвращали сюда же.
const listFromUrl = () => {
  try {
    return new URLSearchParams(window.location.search).get('ieltsMockList') === '1'
  } catch {
    return false
  }
}

export default function MockTestsTab({ token, track, onOpenMock, onOpenSession }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [data, setData] = useState({ status: 'loading' })
  const [list, setList] = useState(listFromUrl)
  useEffect(() => {
    setIeltsParams({ ieltsMockList: list ? '1' : null })
    return () => setIeltsParams({ ieltsMockList: null })
  }, [list])
  const trackModule = track === 'general' ? 'general' : 'academic'

  useEffect(() => {
    if (!authToken) {
      setData({ status: 'guest' })
      return undefined
    }
    let alive = true
    getIeltsMocks(authToken, trackModule)
      .then((r) => alive && setData({ status: 'ready', ...r }))
      .catch(() => alive && setData({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, trackModule])

  const trackName = trackModule === 'general' ? 'General Training' : 'Academic'
  const date = (d) => (d ? new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long' }) : '')
  const ready = data.status === 'ready'
  const mocks = ready ? data.mocks || [] : []
  const history = ready ? (data.history || []).filter((s) => s.module === trackModule) : []
  const last = history.find((s) => s.status === 'submitted')
  const open = ready ? data.open : null
  // «Выбрать mock-тест»: незаконченный — продолжить, иначе — страница выбора теста
  const pick = open ? () => onOpenSession(open.id) : mocks.length ? () => setList(true) : null
  const openMock = (m) => (m.status === 'in_progress' && m.sessionId ? onOpenSession(m.sessionId) : onOpenMock(m.id))
  const openAttempt = (s, st) => onOpenSession(s.id, st === 'in_progress' || st === 'checking' ? undefined : 'result')

  if (list && ready) {
    return (
      <div className="ih-mt">
        <button type="button" className="ih-link ih-mt__back" onClick={() => setList(false)}><ChevronLeftIcon size={18} /> {t('ieltsMt.title')}</button>
        <PageHeader title={t('ieltsMt.title')} sub={t('ieltsMt.sub', { track: trackName })} />
        <h2 className="ih-mt__h2">{t('ieltsMt.available')}</h2>
        {mocks.length === 0 ? <p className="ih-muted">{t('ieltsMt.empty')}</p> : (
          <div className="ih-mtl">
            {mocks.map((m) => (
              <article key={m.id} className="ih-mtl__card">
                <div className="ih-mtl__top">
                  <span className="ih-mtl__icon"><QuizIcon size={26} /></span>
                  <span className="ih-mtl__name"><b>{m.title}</b><StatusChip status={m.status === 'submitted' ? 'submitted' : m.status} /></span>
                  <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => openMock(m)}>
                    {m.status === 'in_progress' ? t('ieltsMt.continue') : t('ieltsMt.more')}
                  </button>
                </div>
                <div className="ih-mtl__info">
                  <span className="ih-mtl__time"><ScheduleIcon size={20} />{t('ieltsMt.hero.time')}</span>
                  <span className="ih-mtl__flow">{MOCK_ORDER.map((x, i) => <span key={x}>{i > 0 && <ArrowForwardIcon size={14} />}{x[0].toUpperCase() + x.slice(1)}</span>)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
        {history.length > 0 && (
          <>
            <h2 className="ih-mt__h2">{t('ieltsMt.history')}</h2>
            <div className="ih-mtl">
              {history.map((s) => {
                const st = attemptStatus(s)
                return (
                  <article key={s.id} className="ih-mtl__card">
                    <div className="ih-mtl__top">
                      <span className="ih-mtl__icon"><QuizIcon size={26} /></span>
                      <span className="ih-mtl__name"><b>{s.title}</b><StatusChip status={st} /></span>
                      {st !== 'aborted' && (
                        <button type="button" className="ih-link" onClick={() => openAttempt(s, st)}>
                          {st === 'done' || st === 'incomplete' ? t('ieltsMt.col.review') : st === 'in_progress' ? t('ieltsMt.continue') : t('ieltsMt.col.state')} <ArrowForwardIcon size={16} />
                        </button>
                      )}
                    </div>
                    <dl className="ih-mtl__result">
                      <div><dt>{t('ieltsMt.col.date')}</dt><dd>{date(s.finishedAt || s.startedAt)}</dd></div>
                      <div><dt>{t('ieltsMt.col.score')}</dt><dd className={s.overall == null ? 'is-none' : ''}>{s.overall != null ? s.overall.toFixed(1) : '—'}</dd></div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="ih-mt">
      <PageHeader title={t('ieltsMt.title')} sub={t('ieltsMt.sub', { track: trackName })} />

      <div className="ih-mt__top">
        <section className="ih-mt__hero" style={{ backgroundImage: 'url(/ielts/mascot/mock-hero.webp)' }}>
          <span className="ih-mt__badge">{t('ieltsMt.hero.badge')}</span>
          <h2>{t('ieltsMt.hero.title')}</h2>
          <p className="ih-mt__flow">{MOCK_ORDER.map((s, i) => <span key={s}>{i > 0 && <ArrowForwardIcon size={14} />}{s[0].toUpperCase() + s.slice(1)}</span>)}</p>
          <p className="ih-mt__time"><TimerIcon size={18} />{t('ieltsMt.hero.time')}</p>
          <p className="ih-mt__fine">{t('ieltsMt.hero.fine')}</p>
          {pick && <button type="button" className="ih-mt__cta" onClick={pick}>{open ? t('ieltsMt.hero.continue', { name: open.title }) : t('ieltsMt.hero.pick')} <ArrowForwardIcon size={18} /></button>}
        </section>

        <aside className="ih-mt__last">
          <h2>{t('ieltsMt.last.title')}</h2>
          {last ? (
            <>
              <span className="ih-mt__lastmeta">{last.title} · {date(last.finishedAt)}</span>
              <div className="ih-mt__lastband">
                <b>{last.overall != null ? last.overall.toFixed(1) : '—'}</b>
                <span>{last.overall != null ? t('ieltsMt.last.platform') : last.partial ? t('ieltsMt.last.checking') : t('ieltsMt.last.incomplete')}</span>
              </div>
              <div className="ih-mt__skills">
                {last.sections.map((s) => (
                  <span key={s.name} className={`ih-mt__skill is-${s.name}`}><small>{SHORT[s.name]}</small><b>{s.band != null ? s.band.toFixed(1) : '—'}</b></span>
                ))}
              </div>
              <button type="button" className="ih-link" onClick={() => onOpenSession(last.id, 'result')}>{t('ieltsMt.last.review')} <ArrowForwardIcon size={16} /></button>
            </>
          ) : (
            <p className="ih-muted">{t('ieltsMt.last.none')}</p>
          )}
        </aside>
      </div>

      {data.status === 'loading' && <p className="ih-muted">{t('ieltsReading.loading')}</p>}
      {data.status === 'guest' && <EmptyState icon={<QuizIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />}
      {data.status === 'error' && <EmptyState icon={<QuizIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}

      {ready && (
        <>
          <h2 className="ih-mt__h2">{t('ieltsMt.available')}</h2>
          {mocks.length === 0 ? <p className="ih-muted">{t('ieltsMt.empty')}</p> : (
            <div className="ih-mt__cards">
              {mocks.map((m) => (
                <article key={m.id} className="ih-mt__card">
                  <span className="ih-mt__icon"><QuizIcon size={22} /></span>
                  <span className="ih-mt__cardtext">
                    <b>{m.title}</b>
                    <StatusChip status={m.status === 'submitted' ? 'submitted' : m.status} />
                  </span>
                  <button type="button" className="ih-btn ih-btn--outline" onClick={() => (m.status === 'in_progress' && m.sessionId ? onOpenSession(m.sessionId) : onOpenMock(m.id))}>
                    {m.status === 'in_progress' ? t('ieltsMt.continue') : t('ieltsMt.more')}
                  </button>
                </article>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <>
              <h2 className="ih-mt__h2">{t('ieltsMt.history')}</h2>
              <section className="ih-mt__table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('ieltsMt.col.test')}</th>
                      <th>{t('ieltsMt.col.date')}</th>
                      <th>{t('ieltsMt.col.status')}</th>
                      <th>{t('ieltsMt.col.score')}</th>
                      <th>{t('ieltsMt.col.review')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((s) => {
                      const st = attemptStatus(s)
                      return (
                        <tr key={s.id}>
                          <td><b>{s.title}</b></td>
                          <td>{date(s.finishedAt || s.startedAt)}</td>
                          <td><StatusChip status={st} /></td>
                          <td><b>{s.overall != null ? s.overall.toFixed(1) : '—'}</b></td>
                          <td>
                            {st === 'aborted' ? <span className="ih-muted">—</span> : (
                              <button type="button" className="ih-link" onClick={() => onOpenSession(s.id, st === 'in_progress' || st === 'checking' ? undefined : 'result')}>
                                {st === 'done' || st === 'incomplete' ? t('ieltsMt.col.review') : st === 'in_progress' ? t('ieltsMt.continue') : t('ieltsMt.col.state')} <ArrowForwardIcon size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
