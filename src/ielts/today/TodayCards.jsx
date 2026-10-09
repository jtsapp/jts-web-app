import { useI18n } from '../../i18n.jsx'
import { formatDate } from '../format.js'
import { originLabel, taskLabel, taskOrigin } from '../plan/planModel.js'
import {
  ArrowForwardIcon, CheckCircleIcon, EditIcon, FlagIcon, HeadphonesIcon, MenuBookIcon, MicIcon, ScheduleIcon,
  TargetIcon, TranslateIcon, VideoIcon,
} from '../icons.jsx'

// Карточки «Сегодня» по дизайну «IELTS new»: задачи программы (TodayTasks), «Зона роста» (GrowthRecommendation) и
// полоса контроля недели (WeeklyCheckpoint). Данные — блок `programme` и `growthZone` из /mobile/ielts/dashboard.

const SEC_ICON = { writing: EditIcon, reading: MenuBookIcon, listening: HeadphonesIcon, speaking: MicIcon, vocab: TranslateIcon, control: FlagIcon }
// производящие задания проверяет ИИ; остальное — тренировка, гид — теория
const AI_KINDS = new Set(['t1', 't2', 'pair', 'p1', 'p2', 'run'])

export function SecPlate({ sec, size = 48 }) {
  const Ic = SEC_ICON[sec] || MenuBookIcon
  return (
    <span className={`ih-plate ih-plate--${sec}`} style={{ width: size, height: size }} aria-hidden="true">
      <Ic size={Math.round(size / 2)} />
    </span>
  )
}

function taskMeta(t, task) {
  const what = AI_KINDS.has(task.kind) ? t('ieltsToday.ai') : ['guide', 'sg', 'ideas'].includes(task.kind) ? t('ieltsToday.theory') : t('ieltsToday.practice')
  return `${t('ieltsHub.minutes', { n: String(task.minutes) })} · ${what}`
}

/**
 * Метка задачи преподавателя: «Домашнее задание · 12 окт» (оранжевая) или «Добавлено преподавателем» (синяя). У задач
 * программы метки нет. Одна и та же — на «Сегодня», в панели дня, неделе и месяце.
 */
export function OriginChip({ task, short = false }) {
  const { t, lang } = useI18n()
  const o = taskOrigin(task)
  if (!o) return null
  const label = originLabel(t, task, (d) => formatDate(`${d}T00:00:00`, lang, true))
  return (
    <span className={`ih-origin is-${o}`} title={task.extra?.createdByName ? t('ieltsPlan.origin.by', { name: task.extra.createdByName }) : undefined}>
      {short ? t(`ieltsPlan.origin.${o}Short`) : label}
    </span>
  )
}

/** Комментарий преподавателя к задаче — под названием, как в тетради. */
export function TeacherNote({ task }) {
  if (task?.origin !== 'teacher' || !task.extra?.note) return null
  return <span className="ih-tnote">{task.extra.note}</span>
}

export function TaskRow({ task, primary, onStart, onMark }) {
  const { t } = useI18n()
  const done = task.status === 'completed'
  const self = task.completionRule === 'self_report'
  return (
    <li className={`ih-tt__task${primary ? ' is-primary' : ''}${done ? ' is-done' : ''}${taskOrigin(task) ? ` is-${taskOrigin(task)}` : ''}`}>
      <SecPlate sec={task.sec} />
      <div className="ih-tt__body">
        <b>{taskLabel(t, task)}</b>
        <TeacherNote task={task} />
        <span className="ih-tt__meta">
          {taskMeta(t, task)}
          {taskOrigin(task) ? <OriginChip task={task} /> : <span className="ih-tt__chip">{t(`ieltsToday.mode.${task.mode || 'self_study'}`)}</span>}
          {task.overdue && !done && <span className="ih-tt__chip is-late">{t('ieltsPlan.status.overdue')}</span>}
        </span>
      </div>
      {done ? (
        <span className="ih-tt__done"><CheckCircleIcon size={18} /> {t('ieltsPlan.status.completed')}</span>
      ) : (
        <div className="ih-tt__actions">
          {self && <button type="button" className="ih-link" onClick={() => onMark?.(task, true)}>{t('ieltsPlan.markDone')}</button>}
          <button type="button" className={`ih-btn2 ${primary ? 'ih-btn2--primary' : 'ih-btn2--outline'}`} onClick={() => onStart?.(task)}>
            {task.status === 'in_progress' || primary ? t('ieltsPlan.continue') : t('ieltsPlan.start')}
          </button>
        </div>
      )}
    </li>
  )
}

// Ближайший живой урок — из расписания JTS (уроки IELTS не копируются). Нет — честное «не назначено», а не фиктивный урок.
function LessonRow({ lesson, onOpenLessons }) {
  const { t, lang } = useI18n()
  if (!lesson) {
    return (
      <li className="ih-tt__lesson is-empty">
        <span className="ih-plate ih-plate--lesson" aria-hidden="true"><VideoIcon size={22} /></span>
        <div className="ih-tt__body">
          <b>{t('ieltsToday.lesson.none')}</b>
          <span className="ih-tt__meta">{t('ieltsToday.lesson.noneText')}</span>
        </div>
      </li>
    )
  }
  const at = new Date(lesson.scheduledAt)
  const when = `${new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }).format(at)}, ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  return (
    <li className="ih-tt__lesson">
      <span className="ih-plate ih-plate--lesson" aria-hidden="true"><VideoIcon size={22} /></span>
      <div className="ih-tt__body">
        <b>{t('ieltsToday.lesson.next', { when })}</b>
        <span className="ih-tt__meta">
          {t('ieltsToday.lesson.tz')}{lesson.durationMinutes ? ` · ${t('ieltsHub.minutes', { n: String(lesson.durationMinutes) })}` : ''}
          {lesson.teacherName ? ` · ${lesson.teacherName}` : ''}
        </span>
      </div>
      <button type="button" className="ih-btn2 ih-btn2--primary" onClick={onOpenLessons}>{t('ieltsToday.lesson.join')}</button>
    </li>
  )
}

export function TodayTasksCard({ programme, live, lesson, onStartTask, onMark, onOpenPlan, onOpenLessons }) {
  const { t } = useI18n()
  const tasks = programme?.tasks || []
  const minutes = tasks.reduce((s, x) => s + (x.status === 'completed' ? 0 : x.minutes || 0), 0)
  const firstOpen = tasks.findIndex((x) => x.status !== 'completed')
  // нет ответа бэкенда или программы — честное «программы ещё нет», а не «на сегодня всё сделано»
  const pending = !programme?.enrollment || programme.enrollment.status === 'programme_pending'
  return (
    <section className="ih-tt" aria-labelledby="ih-tt-title">
      <header className="ih-tt__head">
        <div>
          <h2 id="ih-tt-title">{t('ieltsToday.title')}</h2>
          {!pending && (
            <span className="ih-tt__sub">
              {t('ieltsToday.summary', { week: String(programme?.currentWeek ?? 1), n: String(tasks.length), min: String(Math.round(minutes / 5) * 5) })}
            </span>
          )}
        </div>
        {!pending && <button type="button" className="ih-link" onClick={onOpenPlan}>{t('ieltsToday.allPlan')} <ArrowForwardIcon size={18} /></button>}
      </header>
      {pending ? (
        <p className="ih-tt__empty">{t(`ieltsPlan.pending.${programme?.enrollment?.pendingReason || 'no_diagnostic'}`)}</p>
      ) : (
        <ul className="ih-tt__list">
          {live && <LessonRow lesson={lesson} onOpenLessons={onOpenLessons} />}
          {tasks.map((task, i) => <TaskRow key={task.id} task={task} primary={!live && i === firstOpen} onStart={onStartTask} onMark={onMark} />)}
          {!tasks.length && <li className="ih-tt__empty">{t('ieltsPlan.allDone')}</li>}
        </ul>
      )}
      <p className="ih-tt__hint"><ScheduleIcon size={18} /> {t(live ? 'ieltsToday.hintLive' : 'ieltsToday.hintSelf')}</p>
    </section>
  )
}

// «Зона роста»: одно действие и основание. Без данных — приглашение продолжать программу, а не выдуманная слабость.
export function GrowthCard({ growth, onTrain }) {
  const { t } = useI18n()
  const title = !growth ? t('ieltsToday.growth.noneTitle')
    : growth.kind === 'criterion' ? (t(`ieltsToday.crit.${growth.key}`) === `ieltsToday.crit.${growth.key}` ? growth.key : t(`ieltsToday.crit.${growth.key}`))
    : String(growth.key).replace(/_/g, ' ')
  const text = !growth ? t('ieltsToday.growth.noneText')
    : growth.kind === 'criterion' ? t('ieltsToday.growth.criterion', { skill: growth.skill === 'writing' ? 'Writing' : 'Speaking' })
    : t('ieltsToday.growth.type', { skill: growth.skill === 'reading' ? 'Reading' : 'Listening', correct: String(growth.correct), total: String(growth.total) })
  return (
    <section className="ih-gz" aria-labelledby="ih-gz-title">
      <header className="ih-gz__head">
        <span className="ih-plate ih-plate--writing ih-plate--sm" aria-hidden="true"><TargetIcon size={20} /></span>
        <h2 id="ih-gz-title">{t('ieltsToday.growth.title')}</h2>
      </header>
      <div className="ih-gz__card">
        <span className="ih-gz__icon" aria-hidden="true"><SecIcon sec={growth?.skill || 'writing'} /></span>
        <div>
          <b>{title}</b>
          <p>{text}</p>
        </div>
      </div>
      <button type="button" className="ih-btn2 ih-btn2--outline ih-gz__btn" onClick={() => onTrain?.(growth)}>
        {t('ieltsToday.growth.train')} <ArrowForwardIcon size={18} />
      </button>
    </section>
  )
}

function SecIcon({ sec }) {
  const Ic = SEC_ICON[sec] || EditIcon
  return <Ic size={26} />
}

// Контроль недели — та же задача, что в плане (один id): статус, действие и куда придёт результат.
export function WeeklyControlStrip({ control, onStart }) {
  const { t, lang } = useI18n()
  if (!control) return null
  const tone = control.status === 'completed' ? 'done' : control.status === 'available' || control.status === 'in_progress' ? 'open' : control.status === 'missed' ? 'late' : 'wait'
  return (
    <section className="ih-wc" aria-label={t('ieltsToday.control.aria')}>
      <span className="ih-plate ih-plate--control ih-wc__plate" aria-hidden="true"><FlagIcon size={30} /></span>
      <div className="ih-wc__body">
        <h2>{t(`ieltsToday.control.${control.control || 'weekly'}`, { n: String(control.calendarWeek) })}</h2>
        <span className="ih-wc__row">
          <span className={`ih-wc__chip is-${tone}`}>
            {tone === 'done' || tone === 'open' ? <CheckCircleIcon size={14} /> : null}
            {t(`ieltsPlan.status.${control.status}`)}
          </span>
          {tone === 'wait' ? t('ieltsToday.control.opens', { date: formatDate(`${control.date}T00:00:00`, lang) }) : t('ieltsToday.control.text')}
        </span>
      </div>
      {control.status !== 'completed' && (
        <button type="button" className="ih-btn2 ih-btn2--outline ih-wc__btn" disabled={tone === 'wait'} onClick={() => onStart?.(control)}>
          {control.status === 'in_progress' ? t('ieltsPlan.continue') : t('ieltsToday.control.start')}
        </button>
      )}
      <span className="ih-wc__sep" aria-hidden="true" />
      <p className="ih-wc__note">{t('ieltsToday.control.note')}</p>
    </section>
  )
}
