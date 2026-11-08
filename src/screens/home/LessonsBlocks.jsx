import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { dayMonth, weekdayLong, weekdayShort } from '../../lib/localDate.js'
import { plural } from '../../lib/plural.js'
import { SUPPORT_WHATSAPP_URL } from '../../lib/support.js'
import { canOpenLesson, dayLabelKey, isLessonLive, lessonTimeRange, parseLessonDate } from '../schedule/lessonFormat.js'
import { nextCourseTest, nextLesson, teacherHomework, weekDays } from './homeBlocks.js'
import { useLessonTopic } from './useHomeData.js'

// Правая колонка новой «Главной» на компьютере и планшете (ТЗ v2.0, 5.4; прототип «JTS Главная с Луной»): у формата с
// преподавателем — «Уроки с преподавателем» (неделя, следующий урок, остаток, домашка), у Self Study и демо —
// «Ближайшее» (неделя и до двух событий). Телефон их не рисует: у него свои карточки расписания и домашки по макету
// приложения (HomePage, src/mobile/home.css).

/** «Сегодня · 18:00 – 19:00 · Айгерим» / «пн, 10 ноября · 18:00 – 19:00» — когда и с кем. */
function whenLine(occ, lang, t) {
  const date = parseLessonDate(occ.scheduledAt)
  if (Number.isNaN(date.getTime())) return ''
  const key = dayLabelKey(date)
  const day = key ? t(`schedule.${key}`) : `${weekdayShort(date, lang)}, ${dayMonth(date, lang)}`
  return [day, lessonTimeRange(occ, lang === 'kk' ? 'kk' : lang === 'en' ? 'en-GB' : 'ru'), occ.teacherName].filter(Boolean).join(' · ')
}

// Плашка со значком — маской из public/assets/home-v2/ico, цвет — от класса тона.
function Plate({ ico, tone = 'violet' }) {
  return <span className={`hm-blk__plate hm-blk__plate--${tone}`} style={{ '--hm-ico': `url(/assets/home-v2/ico/${ico}.svg)` }} aria-hidden="true" />
}

/**
 * Полоса недели: семь дней от сегодня, точка — в дни уроков. Дни не кнопки: на «Главной» им нечего открыть, расписание —
 * по ссылке «Расписание →». Точку читалка не видит, поэтому «есть урок» стоит словом в имени дня.
 */
export function WeekStrip({ occurrences }) {
  const { t, lang } = useI18n()
  const days = useMemo(() => weekDays(occurrences), [occurrences])
  return (
    <ol className="hm-week" aria-label={t('home.week.aria')}>
      {days.map((d) => (
        <li
          key={d.key}
          className={`hm-week__day${d.today ? ' is-today' : ''}${d.lessons.length ? ' has-lesson' : ''}`}
          aria-label={`${weekdayLong(d.date, lang)}, ${dayMonth(d.date, lang)}` + (d.lessons.length ? `, ${t('home.schedule.hasLesson')}` : '')}
        >
          <b aria-hidden="true">{d.date.getDate()}</b>
          <small aria-hidden="true">{weekdayShort(d.date, lang)}</small>
        </li>
      ))}
    </ol>
  )
}

/** Карточка следующего урока: тема, день и время, «Подключиться» — тот же вход, что на экране «Уроки» (onOpenLesson). */
function NextLessonCard({ occ, token, onOpenLesson }) {
  const { t, lang } = useI18n()
  const topic = useLessonTopic(token, occ?.lessonId ?? null)
  if (!occ) return <p className="hm-tl__none">{t('home.tl.none')}</p>
  const live = isLessonLive(occ.lessonStatus)
  return (
    <div className="hm-tl__next">
      <Plate ico="videocam" />
      <div className="hm-tl__nextText">
        <span className="hm-tl__label">
          {t('home.tl.next')}
          {live && <em className="hm-tl__live">{t('home.tl.live')}</em>}
        </span>
        <b className="hm-tl__topic">{topic || t('home.tl.lesson')}</b>
        <span className="hm-tl__when">{whenLine(occ, lang, t)}</span>
      </div>
      <button type="button" className="hm-blk__btn is-fill" disabled={!canOpenLesson(occ.lessonStatus)} onClick={() => onOpenLesson?.(occ.lessonId)}>
        {t('home.tl.join')}
      </button>
    </div>
  )
}

function homeworkMeta(h, t, lang) {
  const day = h.dueDate ? dayMonth(new Date(h.dueDate), lang) || null : null
  const parts = []
  if (h.state === 'overdue' && day) parts.push(t('home.tl.hwSince', { date: day }))
  else if (h.canOpen && day) parts.push(t('home.homework.due', { date: day }))
  // «N заданий» — как у карточки домашки: упражнения и части-материалы работы (одна домашка на занятие).
  const hasCounts = h.exercises != null || h.materialParts != null
  const count = h.exerciseCount ?? (hasCounts ? (h.exercises?.length ?? 0) + (h.materialParts?.length ?? 0) : null)
  if (h.canOpen && count) parts.push(t('home.homework.tasks', { n: String(count) }))
  if (h.state === 'submitted' && h.submittedAt) {
    const sent = dayMonth(new Date(h.submittedAt), lang)
    if (sent) parts.push(t('home.tl.hwSent', { date: sent }))
  }
  if (h.state === 'completed' && h.grade != null) parts.push(t('home.tl.hwGrade', { grade: String(h.grade) }))
  return parts
}

/**
 * «Домашка от преподавателя»: до трёх работ, статус цветом (teacherHomework), «Открыть» у ждущих ученика, «Все →» — раздел.
 * state: 'loading' | 'ready' | 'error' — сбой списка не «домашки нет»: сделано ли всё, неизвестно.
 */
function TeacherHomework({ items, state, onRetry, onNav }) {
  const { t, lang } = useI18n()
  const rows = useMemo(() => teacherHomework(items), [items])
  return (
    <div className="hm-tl__hw">
      <div className="hm-blk__head hm-blk__head--sub">
        <h3 className="hm-tl__h3">{t('home.tl.hw')}</h3>
        <button type="button" className="hm-blk__more" onClick={() => onNav?.('homework')}>
          {t('home.tl.hwAll')}
        </button>
      </div>
      {state === 'error' ? (
        <p className="hm-tl__none" role="status">
          {t('home.homework.error')}{' '}
          {onRetry && (
            <button type="button" className="hm-blk__link" onClick={onRetry}>
              {t('home.homework.retry')}
            </button>
          )}
        </p>
      ) : state === 'loading' ? (
        <p className="hm-tl__none">{t('home.homework.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="hm-tl__none">{t('home.tl.hwEmpty')}</p>
      ) : (
        <ul className="hm-blk__rows">
          {rows.map((h) => (
            <li className="hm-blk__row" key={h.id} data-state={h.state}>
              <Plate ico="assignment" tone={h.tone} />
              <span className="hm-blk__rowText">
                <b className="hm-blk__rowTitle">{h.title}</b>
                <span className="hm-blk__rowSub">
                  <em className={`hm-blk__st hm-blk__st--${h.tone}`}>{t(`homework.status.${h.state}`)}</em>
                  {homeworkMeta(h, t, lang).map((p) => (
                    <span key={p}> · {p}</span>
                  ))}
                </span>
              </span>
              {h.canOpen && (
                <button type="button" className="hm-blk__link" onClick={() => onNav?.('homework', { id: h.id })}>
                  {t('home.tl.hwOpen')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * «Уроки с преподавателем» (ТЗ 5.4): всё про уроки в одном месте. «Осталось» — та же цифра, что плитка «Осталось» на
 * экране «Уроки» (/admin/lessons/summary: занятия по расписанию). Размера пакета ученику бэкенд не отдаёт, поэтому
 * «из M» здесь нет — пока не появится ручка пакета. «Записаться» — к менеджеру в WhatsApp: запись на уроки идёт через
 * него (база знаний Луны, раздел про перенос и запись).
 */
export function TeacherLessonsCard({ token, occurrences, summary, homework, homeworkState, onRetryHomework, teacherToday = 0, onNav, onOpenLesson }) {
  const { t } = useI18n()
  const next = useMemo(() => nextLesson(occurrences), [occurrences])
  const left = summary && Number.isFinite(Number(summary.remaining)) ? Number(summary.remaining) : null
  return (
    <section className="hm-card hm-blk hm-tl" aria-labelledby="hm-tl-title">
      <div className="hm-blk__head">
        <h2 className="hm-card__title" id="hm-tl-title">
          {t('home.tl.title')}
        </h2>
        <button type="button" className="hm-blk__more" onClick={() => onNav?.('lessons')}>
          {t('home.tl.schedule')}
        </button>
      </div>
      <WeekStrip occurrences={occurrences} />
      <NextLessonCard occ={next} token={token} onOpenLesson={onOpenLesson} />
      {left != null && (
        <p className="hm-tl__pack">
          <span>{left > 0 ? t('home.tl.left', { n: String(left) }) : t('home.tl.leftNone')}</span>
          <button type="button" className="hm-blk__link" onClick={() => window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener')}>
            {t('home.tl.book')}
          </button>
        </p>
      )}
      {/* Задачи, которые преподаватель поставил в план: в «Сегодня» их нет (ТЗ 9.1), а пропадать с «Главной» им нельзя. */}
      {teacherToday > 0 && (
        <p className="hm-tl__pack">
          <span>{t('home.tl.planToday', { n: String(teacherToday) })}</span>
          <button type="button" className="hm-blk__link" onClick={() => onNav?.('ge-plan')}>
            {t('home.tl.plan')}
          </button>
        </p>
      )}
      <TeacherHomework items={homework} state={homeworkState} onRetry={onRetryHomework} onNav={onNav} />
    </section>
  )
}

/**
 * Пробный урок демо строкой «Ближайшего»: назначенное занятие → заявка → приглашение (те же три состояния и тексты, что
 * у карточки пробного урока телефона). Состояние меняется под курсором после нажатия — озвучиваем смену.
 */
function TrialRow({ trial, lesson, sending, failed, onBook, onOpenLesson }) {
  const { t, lang } = useI18n()
  return (
    <li className="hm-blk__row hm-near__trial">
      <Plate ico="videocam" />
      <span className="hm-blk__rowText" aria-live="polite">
        <b className="hm-blk__rowTitle">{lesson ? t('home.trial.scheduled') : trial?.requested ? t('trial.doneTitle') : t('home.trial.title')}</b>
        <span className="hm-blk__rowSub">
          {lesson ? whenLine(lesson, lang, t) : trial?.requested ? t(trial.managerAssigned ? 'trial.doneManager' : 'trial.doneText') : t('home.trial.sub')}
        </span>
        {failed && (
          <span className="hm-near__error" role="alert">
            {t('trial.failed')}
          </span>
        )}
      </span>
      {lesson ? (
        <button type="button" className="hm-blk__link" onClick={() => onOpenLesson?.(lesson.lessonId)}>
          {t('home.trial.open')}
        </button>
      ) : trial?.requested ? null : (
        <button type="button" className="hm-blk__link" disabled={sending} onClick={onBook}>
          {t(sending ? 'trial.sending' : 'home.trial.cta')}
        </button>
      )}
    </li>
  )
}

/**
 * «Ближайшее» (Self Study и демо, ТЗ 5.4): неделя и до двух событий из того, что есть на самом деле, — пробный урок
 * демо, занятие из расписания и ближайший тест курса уровня. «Контроля недели» у общего курса нет (он есть у IELTS) —
 * его не рисуем, пока его не заведёт бэкенд.
 */
export function NearCard({ demo = false, occurrences, course, level, trial, sending, failed, onBook, onNav, onOpenLesson }) {
  const { t, lang } = useI18n()
  const lesson = useMemo(() => nextLesson(occurrences), [occurrences])
  const test = useMemo(() => (course ? nextCourseTest(course.trail, course.done) : null), [course])
  const rows = []
  if (demo) {
    rows.push(<TrialRow key="trial" trial={trial} lesson={lesson} sending={sending} failed={failed} onBook={onBook} onOpenLesson={onOpenLesson} />)
  } else if (lesson) {
    rows.push(
      <li className="hm-blk__row" key="lesson">
        <Plate ico="videocam" />
        <span className="hm-blk__rowText">
          <b className="hm-blk__rowTitle">{t('home.tl.lesson')}</b>
          <span className="hm-blk__rowSub">{whenLine(lesson, lang, t)}</span>
        </span>
        <button type="button" className="hm-blk__link" disabled={!canOpenLesson(lesson.lessonStatus)} onClick={() => onOpenLesson?.(lesson.lessonId)}>
          {t('home.near.open')}
        </button>
      </li>,
    )
  }
  if (test) {
    const questions = test.node.items ? plural(t, lang, 'home.near.questions', test.node.items) : null
    const sub = test.ready
      ? t('home.near.testReady', { questions: questions || '' })
      : t('home.near.testAfter', { questions: questions || '', lesson: String(test.afterLesson) })
    rows.push(
      <li className="hm-blk__row" key="test">
        <Plate ico="flag" tone="orange" />
        <span className="hm-blk__rowText">
          <b className="hm-blk__rowTitle">{test.node.title}</b>
          <span className="hm-blk__rowSub">{sub.replace(/^ · /, '')}</span>
        </span>
        <button type="button" className="hm-blk__link" onClick={() => onNav?.('course', { level, ...(test.ready ? { lesson: test.node.code } : {}) })}>
          {t('home.near.open')}
        </button>
      </li>,
    )
  }
  return (
    <section className="hm-card hm-blk hm-near" aria-labelledby="hm-near-title">
      <div className="hm-blk__head">
        <h2 className="hm-card__title" id="hm-near-title">
          {t('home.near.title')}
        </h2>
        {/* У Self Study «Уроков» в меню нет — ссылка в расписание только тому, у кого занятия есть. */}
        {lesson && (
          <button type="button" className="hm-blk__more" onClick={() => onNav?.('lessons')}>
            {t('home.tl.schedule')}
          </button>
        )}
      </div>
      <WeekStrip occurrences={occurrences} />
      {rows.length ? <ul className="hm-blk__rows">{rows.slice(0, 2)}</ul> : <p className="hm-tl__none">{t('home.near.empty')}</p>}
    </section>
  )
}
