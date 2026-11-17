import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural, pluralForm } from '../../lib/plural.js'
import GeTodayCard from './GeTodayCard.jsx'
import { todayView } from '../../ge/plan/planModel.js'
import { taskLabel, taskRoute } from '../../ielts/plan/planModel.js'
import { fmtMinutes } from '../../sat/today/lessonTime.js'
import { PARTIAL, writeWords } from '../../sat/today/todayTasks.js'
import { ROW_LIMIT, defaultOpen, ieltsSection, openCount, orderTracks, satSection, totalCount, visibleRows } from './todayTracks.js'
import { useIeltsToday, useSatToday } from './useTrackToday.js'

// Имена направлений — как у разделов в меню; не переводятся. Значки — контуры из того же набора, что у сайдбара.
const TRACKS = {
  ielts: { name: 'IELTS', ico: 'menu_book' },
  ge: { name: 'General English', ico: 'school' },
  sat: { name: 'SAT', ico: 'calculate' },
}

// Строка SAT → подпись. Задания — те же, что у вкладки «Сегодня» SAT; самоподготовка — «12 ошибок ждут разбора».
const SAT_TITLE = { words: 'sat.tasks.words', practice: 'sat.tasks.practice', mock: 'sat.tasks.mock', errors: 'sat.tasks.errorsTitle', weak: 'home.tracks.sat.weak' }
const SAT_SELF = { selfErrors: 'sat.self7.errors', selfWeak: 'sat.self7.weak', selfBank: 'sat.self7.bank', selfBluebook: 'sat.self7.bluebook' }

/**
 * «Задачи на сегодня» на «Главной» (задача 218 доски, 17.11.2026): задачи дня по направлениям, которыми ученик учится,
 * — General English, IELTS, SAT — раскрывающимися секциями со счётчиком у каждой и общим в шапке. Раньше у ученика
 * курса и IELTS на «Главной» было только «Сегодня» общего курса, а задачи IELTS и SAT жили во вкладках их разделов.
 *
 * Секция General English — то же «Сегодня» (GeTodayCard в виде embedded): минуты дня, «По навыкам», «Зачем»,
 * «Откроется», «Весь план» и «Мало времени» остаются, а «Начать» ведёт туда же. IELTS и SAT — строками с «Начать»: их
 * задачи выполняются в своих разделах, «Начать» IELTS открывает то же место, что кнопка вкладки «Сегодня» IELTS
 * (taskRoute), SAT — вкладку «Сегодня» SAT (выбор набора практики и симуляции живёт там).
 *
 * Правила (какие секции, счётчики, какая раскрыта, «+ ещё N») — todayTracks.js. Одна секция — без сворачивания: рамка
 * аккордеона ради единственного пункта только прятала бы задачи. Выбор раскрытия не запоминается: после ответа
 * направлений раскрыта первая секция, где ещё есть что делать.
 */
export default function TodayTracksCard({ tracks, ge = null, token, onNav }) {
  const { t, lang } = useI18n()
  const keys = orderTracks(tracks)
  const ieltsData = useIeltsToday(token, keys.includes('ielts'))
  const ielts = ieltsSection(ieltsData)
  // трек (Academic / General Training) решает, куда ведёт Task 1 — как у вкладки «Сегодня» IELTS
  const ieltsTrack = ieltsData?.me?.track || 'academic'
  const satData = useSatToday(token, keys.includes('sat'))
  const sat = satSection(satData)
  const gePlan = ge?.plan || null
  const geCount = useMemo(() => (gePlan ? openCount(todayView(gePlan).tasks, (x) => x.status === 'completed') : null), [gePlan])

  const sections = keys.map((key) => ({
    key,
    count: key === 'ge' ? geCount : openCount((key === 'ielts' ? ielts : sat)?.rows ?? null),
  }))
  const total = totalCount(sections.map((s) => s.count))
  // null — ученик ещё ничего не раскрывал и не сворачивал: раскрыта секция по правилу, иначе — его выбор
  const [picked, setPicked] = useState(null)
  const opened = picked || new Set([defaultOpen(sections)])
  const toggle = (key) => {
    const next = new Set(opened)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setPicked(next)
  }
  const single = keys.length === 1

  const startIelts = (row) => {
    if (row.step) return onNav?.(row.step === 'onboarding' ? 'ielts-onboarding' : 'ielts-diagnostic')
    const r = taskRoute(row.task, ieltsTrack)
    if (r.screen) onNav?.(r.screen, r.payload)
    else onNav?.('ielts', r)
  }
  const startSat = (row) => {
    // слова учатся в общем «Словаре», и SAT отмечает их начатыми на устройстве — так же, как его кнопка
    if (row.key === 'words') {
      if (!row.done && satData?.todayIso) writeWords(satData.todayIso, PARTIAL)
      return onNav?.('vocab')
    }
    onNav?.('sat')
  }

  const renderBody = (key) => {
    if (key === 'ge') return ge?.plan ? <GeTodayCard embedded {...ge} token={token} onNav={onNav} /> : <p className="hm-trk__note">{t('home.tracks.loading')}</p>
    const s = key === 'ielts' ? ielts : sat
    if (!s) return <p className="hm-trk__note">{t('home.tracks.loading')}</p>
    return (
      <RowList
        rows={s.rows}
        note={s.note ? t(s.note) : null}
        render={(row) =>
          key === 'ielts' ? (
            <IeltsRow key={row.id} row={row} track={ieltsTrack} onStart={startIelts} />
          ) : (
            <SatRow key={row.id} row={row} onStart={startSat} />
          )
        }
      />
    )
  }

  return (
    <section className={`hm-card hm-trk${single ? ' hm-trk--single' : ''}`} aria-labelledby="hm-trk-title">
      <header className="hm-trk__head">
        <h2 id="hm-trk-title" className="hm-card__title">{t('home.tracks.title')}</h2>
        {total != null && (
          <span className="hm-trk__total">{total > 0 ? plural(t, lang, 'home.tracks.tasks', total) : t('home.tracks.allDone')}</span>
        )}
      </header>
      <div className="hm-trk__list">
        {sections.map(({ key, count }) => {
          const open = single || opened.has(key)
          const meta = TRACKS[key]
          const label = count == null ? meta.name : `${meta.name}, ${count > 0 ? plural(t, lang, 'home.tracks.tasks', count) : t('home.tracks.allDone')}`
          const head = (
            <>
              <span className="hm-trk__ico" style={{ '--hm-ico': `url(/assets/home-v2/ico/${meta.ico}.svg)` }} aria-hidden="true" />
              <span className="hm-trk__name">{meta.name}</span>
              {count != null && <span className={`hm-trk__count${count === 0 ? ' is-zero' : ''}`} aria-hidden="true">{count}</span>}
            </>
          )
          return (
            <div key={key} className={`hm-trk__sec${open ? ' is-open' : ''}`} data-track={key}>
              <h3 className="hm-trk__h">
                {single ? (
                  <span className="hm-trk__toggle is-static">{head}</span>
                ) : (
                  <button
                    type="button"
                    id={`hm-trk-${key}-btn`}
                    className="hm-trk__toggle"
                    aria-expanded={open}
                    aria-controls={`hm-trk-${key}`}
                    aria-label={label}
                    onClick={() => toggle(key)}
                  >
                    {head}
                    <span className="hm-trk__chev" aria-hidden="true" />
                  </button>
                )}
              </h3>
              <div
                id={`hm-trk-${key}`}
                className="hm-trk__body"
                role={single ? undefined : 'region'}
                aria-labelledby={single ? undefined : `hm-trk-${key}-btn`}
                hidden={!open}
              >
                {open && renderBody(key)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Строки секции и «+ ещё N»: до раскрытия видно три, сначала несделанные (todayTracks.visibleRows). */
function RowList({ rows, note, render }) {
  const { t, lang } = useI18n()
  const [all, setAll] = useState(false)
  const { shown, hidden } = visibleRows(rows, { expanded: all })
  return (
    <>
      {shown.length > 0 && <ul className="hm-trk__rows">{shown.map(render)}</ul>}
      {note && <p className="hm-trk__note">{note}</p>}
      {rows.length > ROW_LIMIT && (
        <button type="button" className="hm-trk__more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? t('home.tracks.less') : `+ ${plural(t, lang, 'home.tracks.more', hidden)}`}
        </button>
      )}
    </>
  )
}

function Row({ done, started, title, meta, cta, onClick }) {
  const { t } = useI18n()
  return (
    <li className={`hm-trk__row${done ? ' is-done' : ''}${started ? ' is-started' : ''}`}>
      <span className="hm-trk__dot" aria-hidden="true" />
      <span className="hm-trk__text">
        <b>{title}</b>
        {meta && <i>{meta}</i>}
      </span>
      {done ? (
        <span className="hm-trk__done">{t('home.tracks.done')}</span>
      ) : (
        <button type="button" className="hm-trk__go" onClick={onClick}>
          {cta}
        </button>
      )}
    </li>
  )
}

function IeltsRow({ row, track, onStart }) {
  const { t } = useI18n()
  if (row.step) {
    const key = row.step === 'onboarding' ? 'Start' : 'Wait'
    return <Row title={t(`home.ielts.title${key}`)} meta={t(`home.ielts.sub${key}`)} cta={t(`home.ielts.cta${key}`)} onClick={() => onStart(row)} />
  }
  const { task } = row
  const started = task.status === 'in_progress'
  return (
    <Row
      done={row.done}
      started={started}
      title={taskLabel(t, task, track)}
      meta={task.minutes ? fmtMinutes(t, task.minutes) : null}
      cta={t(started ? 'home.tracks.continue' : 'home.tracks.start')}
      onClick={() => onStart(row)}
    />
  )
}

function SatRow({ row, onStart }) {
  const { t, lang } = useI18n()
  if (row.key === 'start') {
    return <Row title={t('home.tracks.sat.start')} meta={t('home.tracks.sat.startSub')} cta={t('home.tracks.open')} onClick={() => onStart(row)} />
  }
  if (SAT_SELF[row.key]) {
    return <Row title={`${row.n} ${t(`${SAT_SELF[row.key]}.${pluralForm(row.n, lang)}`)}`} cta={t('home.tracks.open')} onClick={() => onStart(row)} />
  }
  const meta = [
    row.key === 'errors' && row.n ? plural(t, lang, 'sat.tasks.errorsN', row.n) : null,
    row.progress ? t('sat.tasks.ofN', { d: String(row.progress.d), n: String(row.progress.n) }) : null,
    row.optional ? t('home.tracks.sat.optional') : null,
    row.minutes ? fmtMinutes(t, row.minutes) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Row
      done={row.done}
      started={row.started}
      title={t(SAT_TITLE[row.key])}
      meta={meta}
      cta={t(row.started ? 'home.tracks.continue' : row.key === 'words' ? 'home.tracks.start' : 'home.tracks.open')}
      onClick={() => onStart(row)}
    />
  )
}
