import { useI18n } from '../../i18n.jsx'
import { formatDate } from '../../ielts/format.js'
import {
  CheckCircleIcon, EditIcon, MenuBookIcon, MicIcon, SchoolIcon, TaskAltIcon, TranslateIcon, VideoIcon, VolumeIcon,
} from '../../ielts/icons.jsx'
import { minutesLabel, plateOf, taskTitle } from './planModel.js'

// Строка задачи плана — общая для «Сегодня» на «Главной» и панели дня экрана «План»: значок раздела, название, минуты
// (у начатой практики — «6 / 15 мин»), срок ДЗ или время занятия, «Начать» или «Выполнено».

const ICON = {
  course: SchoolIcon,
  live: VideoIcon,
  homework: TaskAltIcon,
  ai_tutor: MicIcon,
  workbooks: EditIcon,
  shadowing: VolumeIcon,
  media_practice: MenuBookIcon,
  vocabulary_sr: TranslateIcon,
}

export function GePlate({ task, size = 44 }) {
  const key = plateOf(task)
  const Ic = ICON[key] || MenuBookIcon
  return (
    <span className={`ge-plate ge-plate--${key}`} style={{ width: size, height: size }} aria-hidden="true">
      <Ic size={Math.round(size / 2)} />
    </span>
  )
}

const hhmm = (iso) => (typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '')

/** Вторая строка: минуты, время занятия с преподавателем, срок ДЗ, день (для задач «дальше по плану»). */
export function taskMeta(t, lang, task, { showDate = false } = {}) {
  const parts = []
  if (showDate) parts.push(formatDate(`${task.date}T00:00:00`, lang, true))
  if (task.kind === 'live') {
    const at = hhmm(task.extra?.scheduledAt)
    if (at) parts.push(at)
    if (task.extra?.teacherName) parts.push(task.extra.teacherName)
  } else if (task.kind === 'homework') {
    if (task.extra?.dueDate) parts.push(t('gePlan.due', { date: formatDate(`${task.extra.dueDate}T00:00:00`, lang, true) }))
  } else {
    const m = minutesLabel(t, task)
    if (m) parts.push(m)
  }
  return parts.join(' · ')
}

export default function GeTaskRow({ task, title, primary = false, showDate = false, onStart }) {
  const { t, lang } = useI18n()
  const done = task.status === 'completed'
  return (
    <li className={`ge-task is-${task.kind}${primary ? ' is-primary' : ''}${done ? ' is-done' : ''}`}>
      <GePlate task={task} />
      <div className="ge-task__body">
        <b>{taskTitle(t, task, title)}</b>
        <span className="ge-task__meta">
          {taskMeta(t, lang, task, { showDate })}
          {task.overdue && !done && <span className="ge-task__chip is-late">{t('gePlan.overdue')}</span>}
        </span>
      </div>
      {done ? (
        <span className="ge-task__done">
          <CheckCircleIcon size={18} /> {t('gePlan.done')}
        </span>
      ) : (
        <button type="button" className={`ih-btn2 ${primary ? 'ih-btn2--primary' : 'ih-btn2--outline'}`} onClick={() => onStart?.(task)}>
          {task.status === 'in_progress' ? t('gePlan.continue') : task.kind === 'live' || task.kind === 'homework' ? t('gePlan.open') : t('gePlan.start')}
        </button>
      )}
    </li>
  )
}
