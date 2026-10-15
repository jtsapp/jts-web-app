import { useI18n } from '../../i18n.jsx'
import { formatDate } from '../../ielts/format.js'
import {
  CheckCircleIcon, EditIcon, FlagIcon, MenuBookIcon, MicIcon, QuizIcon, SchoolIcon, TaskAltIcon, TranslateIcon, VideoIcon, VolumeIcon,
} from '../../ielts/icons.jsx'
import { isTeacherTask, minutesLabel, plateOf, taskAction, taskTitle } from './planModel.js'

// Строка задачи плана — общая для «Сегодня» на «Главной» и панели дня экрана «План»: значок раздела, название, минуты
// (у начатой практики — «6 / 15 мин»), срок ДЗ или время занятия, «Начать» или «Выполнено». У задачи преподавателя —
// синяя метка «Добавлено преподавателем», его комментарий и, у своего задания, «Отметить выполненным».

const ICON = {
  course: SchoolIcon,
  live: VideoIcon,
  homework: TaskAltIcon,
  unit: QuizIcon,
  custom: FlagIcon,
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

/** Подпись кнопки: отметка своего задания, «Продолжить» начатого, «Открыть» занятия и ДЗ, иначе «Начать». */
export function startLabel(t, task, action) {
  if (action?.type === 'done') return t('gePlan.markDone')
  if (task.status === 'in_progress') return t('gePlan.continue')
  return task.kind === 'live' || task.kind === 'homework' ? t('gePlan.open') : t('gePlan.start')
}

export default function GeTaskRow({ task, title, primary = false, showDate = false, onStart }) {
  const { t, lang } = useI18n()
  const done = task.status === 'completed'
  const teacher = isTeacherTask(task)
  // уровень для кнопки не нужен: от него зависит только адрес перехода, а не то, есть ли переход
  const action = taskAction(task, null)
  return (
    <li className={`ge-task is-${task.kind}${teacher ? ' is-teacher' : ''}${primary ? ' is-primary' : ''}${done ? ' is-done' : ''}`}>
      <GePlate task={task} />
      <div className="ge-task__body">
        <b>{taskTitle(t, task, title)}</b>
        <span className="ge-task__meta">
          {taskMeta(t, lang, task, { showDate })}
          {teacher && (
            <span className="ge-task__chip is-teacher" title={task.extra?.createdByName || undefined}>
              {t('gePlan.origin.teacher')}
            </span>
          )}
          {task.overdue && !done && <span className="ge-task__chip is-late">{t('gePlan.overdue')}</span>}
        </span>
        {teacher && task.extra?.note && <span className="ge-task__note">{task.extra.note}</span>}
      </div>
      {done ? (
        <span className="ge-task__done">
          <CheckCircleIcon size={18} /> {t('gePlan.done')}
        </span>
      ) : action ? (
        <button type="button" className={`ih-btn2 ${primary ? 'ih-btn2--primary' : 'ih-btn2--outline'}`} onClick={() => onStart?.(task)}>
          {startLabel(t, task, action)}
        </button>
      ) : null}
    </li>
  )
}
