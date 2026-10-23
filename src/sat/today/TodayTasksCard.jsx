import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatTodayTasks } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { AssignmentIcon, CalendarIcon, FlagIcon, NotesIcon, TargetIcon, TickIcon } from '../icons.jsx'
import { domainName, skillName } from '../names.js'
import { moduleSize } from '../model/practice.js'
import { satLessonTime } from './lessonTime.js'
import { DONE, buildBlocks, currentLesson, firstOpen, readWords, writeWords } from './todayTasks.js'

const ICON = { words: NotesIcon, practice: TargetIcon, mock: AssignmentIcon, errors: FlagIcon, weak: TargetIcon }

/**
 * «Задания на сегодня» (ТЗ SAT 21.10, задача 11) — бывшая «Следующее занятие». Три задания самостоятельной работы,
 * каждое ведёт в свой раздел, а не выполняется в карточке. Занятие с преподавателем — 90 минут в группе — сюда не
 * входит: оно отдельной строкой из расписания группы. Домашней работы нет — в платформе нет такой сущности.
 */
export default function TodayTasksCard({ schedule, roadmap, todayIso, onWords, onPractice, onMocks, onErrors }) {
  const { t, lang } = useI18n()
  const lesson = currentLesson(schedule, todayIso)
  const section = lesson?.section === 'MATH' ? 'math' : 'rw'
  const skills = lesson?.skillIds || []
  const [today, setToday] = useState(null)
  const [words, setWords] = useState(() => readWords(todayIso))

  useEffect(() => {
    let alive = true
    getSatTodayTasks(loadToken(), skills, section).then((x) => alive && setToday(x)).catch(() => alive && setToday(null))
    return () => {
      alive = false
    }
    // навыки сравниваем строкой: новый массив с теми же навыками не должен перезапрашивать
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills.join(','), section])

  const size = moduleSize(section)
  const blocks = buildBlocks({ lesson, today, wordsState: words, practiceSize: size, todayIso })
  const next = firstOpen(blocks)
  const phase = roadmap?.phases?.find((p) => p.n === roadmap.active)

  const go = (b) => {
    if (b.key === 'words') {
      if (words !== DONE) {
        writeWords(todayIso, 'partial')
        setWords('partial')
      }
      onWords?.()
    } else if (b.key === 'practice') onPractice?.(skills)
    else if (b.key === 'mock') onMocks?.()
    else if (b.key === 'errors') onErrors?.()
    else if (b.key === 'weak' && b.skillId) onPractice?.([b.skillId])
  }

  const markWords = () => {
    writeWords(todayIso, DONE)
    setWords(DONE)
  }

  return (
    <article className="st-card st-next st-tasks">
      <div className="st-next__head">
        <span className="st-muted">{t('sat.tasks.title')}</span>
        <span className="st-spacer" />
        {phase && <span className="st-next__chip is-violet">{t('sat.today.phaseChip', { n: String(roadmap.activeIndex), phase: t(`sat.phase.${phase.key}`) })}</span>}
        {lesson && <span className="st-next__chip"><CalendarIcon size={14} />{satLessonTime(lesson.startsAt, lang)}</span>}
      </div>
      {lesson ? (
        <div className="st-tasks__topic">
          <h2>{lesson.topic}</h2>
          <span className="st-muted">{[lesson.domainId ? domainName(lesson.domainId, lang) : null, section === 'math' ? 'Math' : 'Reading and Writing'].filter(Boolean).join(' · ')}</span>
          {lesson.goals?.length > 0 && (
            <ul className="st-tasks__goals">{lesson.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          )}
          {/* урок с преподавателем — отдельно: это 90 минут в группе, а не часть самостоятельной работы */}
          <p className="st-muted">{t('sat.tasks.lesson', { time: satLessonTime(lesson.startsAt, lang), n: String(lesson.number) })}</p>
        </div>
      ) : (
        <p className="st-muted">{t('sat.road.noGroup')}</p>
      )}

      <ol className="st-tasks__list">
        {blocks.map((b, i) => {
          const Icon = ICON[b.key]
          return (
            <li key={b.key} className={`st-tasks__item is-${b.state}`}>
              <span className="st-tasks__icon">{b.state === DONE ? <TickIcon size={18} /> : <Icon size={18} />}</span>
              <div>
                <b>{i + 1}. {t(`sat.tasks.${b.key}`, { skill: b.skillId ? skillName(b.skillId, lang) : '', n: String(b.open ?? '') })}</b>
                <small className="st-muted">
                  {b.key === 'practice' ? t('sat.tasks.practiceN', { d: String(b.done), n: String(b.size) }) : t(`sat.tasks.state.${b.state}`)}
                  {b.noErrors && ` · ${t('sat.tasks.noErrors')}`}
                  {' · '}{b.minutes >= 60 ? t('sat.tasks.hm', { h: String(Math.floor(b.minutes / 60)), m: String(b.minutes % 60) }) : t('sat.time.min', { n: String(b.minutes) })}
                </small>
              </div>
              <span className="st-spacer" />
              {b.key === 'words' && b.state !== DONE && b.state !== 'none' && (
                <button type="button" className="st-link" onClick={markWords}>{t('sat.tasks.wordsDone')}</button>
              )}
              <button type="button" className="ih-btn ih-btn--outline" disabled={b.key === 'practice' && !skills.length} onClick={() => go(b)}>{t('sat.tasks.open')}</button>
            </li>
          )
        })}
      </ol>

      {next && (
        <div className="st-next__foot">
          <button type="button" className="ih-cta" onClick={() => go(next)}>{t('sat.tasks.start')}<ArrowForwardIcon size={20} /></button>
        </div>
      )}
    </article>
  )
}
