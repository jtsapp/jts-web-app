import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, TaskAltIcon, TrendingUpIcon } from '../../ielts/icons.jsx'
import { AssignmentIcon } from '../icons.jsx'
import MockStrip from './MockStrip.jsx'
import { clock, moduleNo } from '../model/mock.js'

const sectionName = (s) => (s === 'math' ? 'Math' : 'Reading and Writing')

/**
 * Экран между модулями (Figma SAT 31): «Модуль 1 завершён», куда направлен второй модуль и почему — адаптивность не
 * скрываем, — лента прохождения и «Начать модуль». Тот же экран встречает перед первым модулем и после перерыва,
 * досиженного с закрытой вкладкой: следующий модуль за спиной не стартует.
 */
export default function Handoff({ run, busy, onStart, onAbandon }) {
  const { t, lang } = useI18n()
  const next = run.modules[run.index]
  const prev = run.modules[run.index - 1]
  const crossed = prev && prev.section !== next.section
  const nextLabel = t('sat.mock.startModule', {
    n: String(moduleNo(next.key)),
    q: plural(t, lang, 'sat.q', next.count),
    m: t('sat.mock.min', { n: String(next.minutes) }),
  })

  let head
  if (!prev) {
    // Нет в Figma: экран перед первым модулем — макет 31 рисует только переход между модулями
    head = (
      <>
        <span className="st-mock__icon is-violet"><AssignmentIcon size={32} /></span>
        <h1>{t('sat.mock.firstTitle', { section: sectionName(next.section) })}</h1>
        <p>{t(run.timed ? 'sat.mock.firstTimed' : 'sat.mock.firstUntimed')}</p>
      </>
    )
  } else if (crossed) {
    // Нет в Figma: перерыв закончился, пока вкладка была закрыта (правило прототипа «the break is over, the next
    // module is not started behind their back»)
    head = (
      <>
        <span className="st-mock__icon"><TaskAltIcon size={32} /></span>
        <h1>{t('sat.mock.breakOver')}</h1>
        <p>{t('sat.mock.breakOverSub', { section: sectionName(prev.section) })}</p>
      </>
    )
  } else {
    head = (
      <>
        <span className="st-mock__icon"><TaskAltIcon size={32} /></span>
        <h1>{t('sat.mock.moduleDone', { n: String(moduleNo(prev.key)) })}</h1>
        <p>
          {t('sat.mock.moduleDoneSub', {
            section: sectionName(prev.section),
            a: String(prev.answered ?? 0),
            n: String(prev.count),
            time: clock(prev.timeSec),
            limit: clock(prev.minutes * 60),
          })}
          {prev.closedByTimer && <> {t('sat.mock.timeUp')}</>}
        </p>
      </>
    )
  }

  return (
    <main className="st-mock">
      <div className="st-mock__head">{head}</div>
      {next.adaptive && next.route && (
        <div className={`st-mock__route is-${next.route}`}>
          <span className="st-mock__routeIcon"><TrendingUpIcon size={28} /></span>
          <div>
            <h2>{t(`sat.mock.routed.${next.route}`, { n: String(moduleNo(next.key)) })}</h2>
            <p>{t(`sat.mock.routedWhy.${next.route}`)}</p>
          </div>
        </div>
      )}
      {!run.timed && <p className="st-mock__untimed">{t('sat.mock.untimedWarn')}</p>}
      <MockStrip modules={run.modules} index={run.index} phase={run.phase} />
      <div className="st-mock__foot">
        <button type="button" className="st-link" disabled={busy} onClick={onAbandon}>{t('sat.mock.abandon')}</button>
        <span className="st-spacer" />
        <button type="button" className="ih-cta st-mock__cta" disabled={busy} onClick={onStart}>
          {nextLabel}<ArrowForwardIcon size={20} />
        </button>
      </div>
    </main>
  )
}
