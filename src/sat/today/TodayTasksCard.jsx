import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { getSatTodayTasks } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { ArrowForwardIcon, CheckCircleIcon, CheckIcon, EventIcon, MenuBookIcon, OpenInNewIcon, QuizIcon, ScheduleIcon, TargetIcon } from '../../ielts/icons.jsx'
import { HistoryIcon, NorthEastIcon, SigmaIcon } from '../icons.jsx'
import { domainName, skillName } from '../names.js'
import { TODAY_SIZE } from '../model/practice.js'
import { fmtDate } from '../model/dates.js'
import { fmtMinutes, lessonDay, lessonWeekday } from './lessonTime.js'
import { DONE, PARTIAL, buildBlocks, ctaOf, currentLesson, priorityRank, readWords, thirdVariant, writeWords } from './todayTasks.js'

// подпись кнопки «Продолжить: …» — что за блок, со строчной буквы
const CTA_NAME = { words: 'sat.tasks.cta.words', practice: 'sat.tasks.cta.practice', mock: 'sat.tasks.cta.mock', errors: 'sat.tasks.cta.errors', weak: 'sat.tasks.cta.weak' }

/**
 * «Задания на сегодня» (ТЗ SAT 21.10, задача 11; Figma «NEW 2», 17:6366, состояния 17:6008). Два коротких задания
 * строками, третье — отдельным блоком «Не каждый день»: оно разной длины (15 минут разбора или 2 ч 15 мин симуляции),
 * и у симуляции тёмная рамка с предупреждением, чтобы её не открыли «между делом». Каждое задание ведёт в свой раздел,
 * а не выполняется в карточке. Занятие с преподавателем сюда не входит — это отдельный тёмный блок над карточкой.
 * Домашней работы нет — в платформе нет такой сущности.
 */
export default function TodayTasksCard({ schedule, roadmap, bluebook, todayIso, onWords, onPractice, onMocks, onErrors }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
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

  const size = TODAY_SIZE
  const blocks = buildBlocks({ lesson, today, wordsState: words, practiceSize: size, todayIso })
  const cta = ctaOf(blocks)
  const phase = roadmap?.phases?.find((p) => p.n === roadmap.active)
  const rank = priorityRank(lesson?.domainId, bluebook?.currentFocus)

  const go = (b) => {
    if (b.key === 'words') {
      if (words !== DONE) {
        writeWords(todayIso, PARTIAL)
        setWords(PARTIAL)
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

  // «Сегодня · 30 сен»: день — по Алматы, как время занятия
  let dateChip = null
  if (lesson) {
    const d = lessonDay(lesson.startsAt, todayIso)
    const date = fmtDate(loc, new Date(`${String(lesson.startsAt).slice(0, 10)}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' })
    dateChip = `${d === 'today' ? t('sat.teach.today') : d === 'tomorrow' ? t('sat.teach.tomorrow') : lessonWeekday(lesson.startsAt, lang)} · ${date}`
  }

  const [words1, practice2, third] = blocks
  const ctaLabel = cta.kind === 'done'
    ? t('sat.tasks.cta.done')
    : t(cta.kind === 'start' ? 'sat.tasks.cta.start' : 'sat.tasks.cta.continue', { what: t(CTA_NAME[cta.block.key]) })

  return (
    <article className="st-card st-tasks">
      <div className="st-tasks__head">
        <h2>{t('sat.tasks.title')}</h2>
        <span className="st-spacer" />
        {phase && <span className="st-tasks__chip is-violet">{t('sat.today.phaseChip', { n: String(roadmap.activeIndex), phase: t(`sat.phase.${phase.key}`) })}</span>}
        {dateChip && <span className="st-tasks__chip"><EventIcon size={18} />{dateChip}</span>}
      </div>

      {lesson ? (
        <>
          <div className="st-tasks__topic">
            <span className={`st-tasks__topicIcon ${section === 'math' ? 'is-math' : ''}`}>{section === 'math' ? <SigmaIcon size={24} /> : <MenuBookIcon size={24} />}</span>
            <div>
              <h3>{lesson.topic}</h3>
              <span>{[
                lesson.domainId ? domainName(lesson.domainId, lang) : null,
                section === 'math' ? 'Math' : 'Reading and Writing',
                rank ? t('sat.today.priority', { n: String(rank) }) : null,
              ].filter(Boolean).join(' · ')}</span>
            </div>
          </div>
          {lesson.goals?.length > 0 && (
            <p className="st-tasks__goal"><TargetIcon size={18} />{t('sat.today.goal', { goal: lesson.goals.join('; ') })}</p>
          )}
        </>
      ) : (
        <p className="st-muted">{t(schedule?.inGroup ? 'sat.tasks.noLesson' : 'sat.road.noGroup')}</p>
      )}

      <ol className="st-tasks__list">
        {[words1, practice2].map((b, i) => (
          <li key={b.key} className={`st-task is-${b.state}`}>
            <span className="st-task__n">{b.state === DONE ? <CheckIcon size={20} /> : i + 1}</span>
            <div className="st-task__text">
              <b>{t(`sat.tasks.${b.key}`)}</b>
              <small><OpenInNewIcon size={14} />{t(`sat.tasks.opens.${b.key}`)}</small>
              {b.key === 'practice' && b.state === PARTIAL && (
                <span className="st-task__bar">
                  <i><em style={{ width: `${Math.round((b.done * 100) / b.size)}%` }} /></i>
                  {t('sat.tasks.ofN', { d: String(b.done), n: String(b.size) })}
                </span>
              )}
            </div>
            {/* слова учатся вне SAT, и сделанное там сюда не приходит — отметить их можно только руками */}
            {b.key === 'words' && b.state !== DONE && b.state !== 'none' && (
              <button type="button" className="st-link st-task__mark" onClick={markWords}>{t('sat.tasks.wordsDone')}</button>
            )}
            <span className="st-task__time"><ScheduleIcon size={18} />~{fmtMinutes(t, b.minutes)}</span>
            <button type="button" className="st-task__go" aria-label={t('sat.tasks.open')} disabled={b.key === 'practice' && !skills.length} onClick={() => go(b)}>
              <NorthEastIcon size={18} />
            </button>
          </li>
        ))}
      </ol>

      <ThirdBlock block={third} lang={lang} t={t} onGo={() => go(third)} />

      <div className="st-tasks__foot">
        <button type="button" className="st-tasks__cta" disabled={!cta.block || (cta.block.key === 'practice' && !skills.length)} onClick={() => cta.block && go(cta.block)}>
          {ctaLabel}<ArrowForwardIcon size={20} />
        </button>
      </div>
    </article>
  )
}

/** Третий блок «Не каждый день»: симуляция в её день, иначе работа над ошибками, без ошибок — «все разобраны». */
function ThirdBlock({ block, lang, t, onGo }) {
  const v = thirdVariant(block)
  const time = fmtMinutes(t, block.minutes)
  let icon = <HistoryIcon size={24} />
  let title = t('sat.tasks.errorsTitle')
  let sub = <><OpenInNewIcon size={14} />{t('sat.tasks.errorsSub', { what: plural(t, lang, 'sat.tasks.errorsN', block.open || 0) })}</>
  if (v === 'mock') {
    icon = <QuizIcon size={28} />
    title = t('sat.tasks.mock')
    sub = <><OpenInNewIcon size={14} />{t('sat.tasks.mockSub', { time })}</>
  } else if (v === 'clear') {
    icon = <CheckCircleIcon size={24} />
    title = t('sat.tasks.clearTitle')
    sub = block.skillId ? t('sat.tasks.clearSub', { skill: skillName(block.skillId, lang) }) : null
  }
  const canGo = v !== 'clear' || !!block.skillId
  return (
    <section className={`st-third is-${v} is-${block.state}`}>
      <div className="st-third__head">
        <span className="st-third__n">3</span>
        <span className="st-third__eyebrow">{t(`sat.tasks.eyebrow.${v}`)}</span>
        <span className="st-spacer" />
        <span className="st-third__rare">{t('sat.tasks.rare')}</span>
      </div>
      <div className="st-third__row">
        <span className="st-third__icon">{icon}</span>
        <div className="st-third__text">
          <b>{title}</b>
          {sub && <small>{sub}</small>}
        </div>
        <span className="st-task__time"><ScheduleIcon size={18} />{v === 'mock' ? time : `~${time}`}</span>
        {canGo && (
          <button type="button" className="st-task__go" aria-label={t('sat.tasks.open')} onClick={onGo}>
            {v === 'clear' ? <ArrowForwardIcon size={18} /> : <NorthEastIcon size={18} />}
          </button>
        )}
      </div>
      {v === 'mock' && <p className="st-third__note"><ScheduleIcon size={20} />{t('sat.tasks.mockNote', { time })}</p>}
    </section>
  )
}
