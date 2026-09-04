import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import DemoBanner from '../components/DemoBanner.jsx'
import AssetImage from '../components/AssetImage.jsx'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { levelSummary, touchWeeklySnapshot } from '../lib/levelProgress.js'
import { loadSkillStatsRemote, readLocalSkillStats } from '../practice/skillStats.js'
import { getTrialRequestState, requestTrialLesson, getMyLessonOccurrences, getMyHomework } from '../api.js'
import { pickFeaturedOccurrence } from './schedule/liveNow.js'
import { parseLessonDate, lessonTimeRange } from './schedule/lessonFormat.js'

// «Главная» демо-аккаунта (макет демо-доступа, экран 1): срок демо, свой
// уровень с прогрессом до следующего, сильные и слабые стороны, вход на
// пробный урок.
//
// Экран сводит уже существующие данные, а не заводит новые: уровень — тот же,
// что в сайдбаре и на карте королевств, проценты навыков — тот же рейтинг, что
// в профиле (см. lib/levelProgress.js, там объяснено почему шкала общая).
// Придумать «свои» цифры для витрины было бы проще, но ученик видел бы два
// разных прогресса об одном себе.
export default function HomePage({
  userLevel = 'A1',
  userName,
  token,
  isDemoAccount = false,
  demoExpiresAt = null,
  onNav,
  onProfile,
  onOpenPricing,
  onOpenTrial,
  onOpenLesson,
}) {
  const { t, lang } = useI18n()
  const [stats, setStats] = useState(null)

  // Локальное зеркало сразу, сервер — следом: иначе карточка навыков секунду
  // висит пустой у человека, который вчера прошёл десяток заданий.
  useEffect(() => {
    setStats(readLocalSkillStats())
    if (!token) return
    let alive = true
    loadSkillStatsRemote(token).then((remote) => {
      if (alive && remote) setStats(remote)
    })
    return () => {
      alive = false
    }
  }, [token])

  const summary = useMemo(() => levelSummary(userLevel, stats), [userLevel, stats])

  // Пробный урок — три состояния, и все три уже есть в данных: назначенное
  // занятие (расписание), оставленная заявка (/mobile/trial-request) и ничего.
  // Спрашиваем оба источника: заявка живёт отдельно от урока — менеджер может
  // поставить занятие, так и не отметив заявку, и наоборот.
  const [trial, setTrial] = useState(null)
  const [nextLesson, setNextLesson] = useState(null)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  const [occurrences, setOccurrences] = useState([])
  const [homework, setHomework] = useState([])

  useEffect(() => {
    if (!token) return
    let alive = true
    // Ни один из запросов не критичен: не ответил — соответствующая карточка
    // показывает «пусто», а экран остаётся целым. Это честнее пустого места.
    getTrialRequestState(token).then((s) => { if (alive) setTrial(s) }).catch(() => {})
    getMyLessonOccurrences(token)
      .then((occ) => {
        if (!alive) return
        const list = Array.isArray(occ) ? occ : []
        setOccurrences(list)
        setNextLesson(pickFeaturedOccurrence(list))
      })
      .catch(() => {})
    getMyHomework(token)
      .then((hw) => { if (alive) setHomework(Array.isArray(hw) ? hw : []) })
      .catch(() => {})
    return () => { alive = false }
  }, [token])

  const book = async () => {
    if (sending) return
    setSending(true)
    setFailed(false)
    // Разговор с менеджером открываем сразу и не ждём сети: сам сговор о
    // времени идёт там, слотов в приложении нет. Заявка его не заменяет — она
    // помечает человека в очереди менеджера, чтобы про него не забыли, даже
    // если до чата он не дошёл.
    onOpenTrial?.()
    try {
      // Тот же вызов, что в расписании. Ответ — уже свежее состояние,
      // перечитывать GET не нужно.
      setTrial(await requestTrialLesson(token))
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  // Прирост за неделю — от снимка в localStorage (истории на бэкенде нет,
  // см. levelProgress.js). Считаем в эффекте: снимок трогает localStorage, а
  // рендер обязан быть одинаковым на сервере и клиенте.
  const [week, setWeek] = useState(null)
  useEffect(() => {
    if (stats === null) return
    setWeek(touchWeeklySnapshot(summary.percent))
  }, [stats, summary.percent])

  const hasData = summary.ranked.some((r) => r.percent > 0)
  const levelName = t(`cefr.${summary.level}`)

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="home"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
    >
      <div className="hm">
        {isDemoAccount && <DemoBanner expiresAt={demoExpiresAt} onOpenAccess={onOpenPricing} />}

        {/* Карточка уровня */}
        <section className="hm-level">
          <div className="hm-level__body">
            <span className="hm-level__label">{t('home.level.label')}</span>
            <div className="hm-level__head">
              <h1 className="hm-level__name">
                {summary.level} · {levelName}
              </h1>
              {week > 0 && (
                <span className="hm-level__week">
                  <TrendIcon up />
                  {t('home.level.week', { n: String(week) })}
                </span>
              )}
            </div>

            <div className="hm-level__barrow">
              <div className="hm-level__bar">
                <i className="hm-level__fill" style={{ width: `${summary.percent}%` }} />
              </div>
              {summary.next && (
                <span className="hm-level__toNext">
                  {t('home.level.toNext', { n: String(summary.percent), level: summary.next })}
                </span>
              )}
            </div>

            <p className="hm-level__plan">
              {summary.next
                ? t('home.level.plan', {
                    lessons: plural(t, lang, 'pricing.lessons', summary.lessonsLeft),
                    practice: plural(t, lang, 'home.practice', summary.practiceLeft),
                    level: summary.next,
                  })
                : t('home.level.max')}
            </p>
          </div>

          {summary.next && (
            <div className="hm-level__goal">
              <AssetImage className="hm-level__medal" src="/assets/coin-star.png" alt="" />
              <span>{t('home.level.goal', { level: summary.next })}</span>
            </div>
          )}
        </section>

        <div className="hm-row">
          <div className="hm-col">
          {/* Сильные и слабые стороны */}
          <section className="hm-card hm-skills">
            <h2 className="hm-card__title">{t('home.skills.title')}</h2>
            {hasData ? (
              <>
                <div className="hm-skills__list">
                  {summary.ranked.map(({ skill, percent }) => (
                    <div className="hm-skill" key={skill}>
                      <span className="hm-skill__name">{t(`profile.skills.${skill}`)}</span>
                      <div className="hm-skill__bar">
                        <i
                          className={`hm-skill__fill hm-skill__fill--${band(percent)}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="hm-skill__pct">{percent}%</span>
                      <span className="hm-skill__trend" aria-hidden="true">
                        <TrendIcon up={percent >= 60} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hm-skills__tags">
                  {summary.strongest && (
                    <span className="hm-tag hm-tag--up">
                      <TrendIcon up />
                      {t('home.skills.best', { skill: t(`profile.skills.${summary.strongest.skill}`) })}
                    </span>
                  )}
                  {summary.weakest && (
                    <span className="hm-tag hm-tag--down">
                      <TrendIcon />
                      {t('home.skills.worst', { skill: t(`profile.skills.${summary.weakest.skill}`) })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="hm-skills__empty">{t('home.skills.empty')}</p>
            )}
          </section>

          <PracticeToday t={t} onNav={onNav} />
          </div>

          <div className="hm-col">
          {/* Пробный урок: назначенное занятие → заявка → приглашение.
              Платящему он не нужен — у него уже есть и преподаватель, и уроки,
              а «Записаться на пробный» рядом с расписанием читается как ошибка. */}
          {isDemoAccount && (
          <section className="hm-card hm-trial">
            <div className="hm-trial__art">
              <AssetImage src={`/assets/world/hero/${summary.level.toLowerCase()}.webp`} alt="" />
            </div>
            {/* Состояние меняется под курсором после нажатия — озвучиваем смену
                тем, кто кнопку не видит. */}
            <div className="hm-trial__body" aria-live="polite">
              <b className="hm-trial__title">
                {nextLesson
                  ? t('home.trial.scheduled')
                  : trial?.requested
                    ? t('trial.doneTitle')
                    : t('home.trial.title')}
              </b>
              <span className="hm-trial__sub">
                {nextLesson
                  ? lessonWhen(nextLesson, lang, t)
                  : trial?.requested
                    ? t(trial.managerAssigned ? 'trial.doneManager' : 'trial.doneText')
                    : t('home.trial.sub')}
              </span>
            </div>
            {nextLesson ? (
              <button
                type="button"
                className="hm-trial__cta"
                onClick={() => onOpenLesson?.(nextLesson.lessonId)}
              >
                {t('home.trial.open')}
                <Arrow />
              </button>
            ) : trial?.requested ? null : (
              <button type="button" className="hm-trial__cta" disabled={sending} onClick={book}>
                {t(sending ? 'trial.sending' : 'home.trial.cta')}
                <Arrow />
              </button>
            )}
            {/* role="alert" на самом абзаце: живая область объявляет изменения
                внутри себя, а этот абзац появляется её соседом. */}
            {failed && <p className="hm-trial__error" role="alert">{t('trial.failed')}</p>}
          </section>
          )}

          <ScheduleCard t={t} lang={lang} occurrences={occurrences} onOpenLesson={onOpenLesson} onNav={onNav} />
          <HomeworkCard t={t} lang={lang} items={homework} onNav={onNav} />
          </div>
        </div>
      </div>
    </LearningLayout>
  )
}

// Цвет полосы навыка: зелёный — уверенно, фиолетовый — рабочий уровень,
// оранжевый — то, что стоит подтянуть. Границы те же, что у стрелки тренда.
function band(percent) {
  if (percent >= 70) return 'high'
  if (percent >= 60) return 'mid'
  return 'low'
}

function TrendIcon({ up = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={up ? 'M4 17 10 11l4 4 6-6' : 'M4 7 10 13l4-4 6 6'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={up ? 'M15 5h5v5' : 'M15 19h5v-5'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** «Завтра, 14:00 — 14:50 · Айгерим» — когда и с кем. */
function lessonWhen(occ, lang, t) {
  const date = parseLessonDate(occ.scheduledAt)
  const locale = lang === 'kk' ? 'kk' : 'ru'
  const day = date
    ? date.toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long' })
    : ''
  const time = lessonTimeRange(occ, locale)
  const who = occ.teacherName ? ` · ${occ.teacherName}` : ''
  return [day, time].filter(Boolean).join(', ') + who || t('home.trial.sub')
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Расписание на ближайшие дни.
 *
 * Не календарь: экран «Уроки» уже показывает месяц целиком, и повторять его
 * здесь незачем. Здесь — семь дней подряд, включая пустые: «нет уроков» в
 * субботу это тоже ответ на вопрос «что у меня на неделе», а список из двух
 * строк с пропусками между ними на него не отвечает.
 */
function ScheduleCard({ t, lang, occurrences, onOpenLesson, onNav }) {
  const locale = lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  const days = useMemo(() => {
    const byDay = new Map()
    for (const o of occurrences || []) {
      const d = parseLessonDate(o.scheduledAt)
      if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(o)
    }
    const out = []
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const items = (byDay.get(key) || []).sort(
        (a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt),
      )
      out.push({ date: d, items })
    }
    return out
  }, [occurrences])

  return (
    <section className="hm-card hm-sched">
      <h2 className="hm-card__title">{t('home.schedule.title')}</h2>
      <ul className="hm-sched__list">
        {days.map(({ date, items }) => (
          <li className="hm-sched__day" key={date.toISOString()}>
            <span className={`hm-sched__date${items.length ? ' is-busy' : ''}`}>
              <b>{date.getDate()}</b>
              <i>{date.toLocaleDateString(locale, { weekday: 'short' })}</i>
            </span>
            {items.length === 0 ? (
              <span className="hm-sched__empty">{t('home.schedule.free')}</span>
            ) : (
              <span className="hm-sched__items">
                {items.map((o) => (
                  <button
                    type="button"
                    className="hm-sched__item"
                    key={o.lessonId}
                    onClick={() => onOpenLesson?.(o.lessonId)}
                  >
                    <b>{o.teacherName || t('home.schedule.lesson')}</b>
                    <i>{lessonTimeRange(o, lang === 'kk' ? 'kk' : 'ru')}</i>
                  </button>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="hm-card__more" onClick={() => onNav?.('lessons')}>
        {t('home.schedule.all')}
      </button>
    </section>
  )
}

/** Незакрытые домашние задания: сначала те, у которых срок ближе. */
function HomeworkCard({ t, lang, items, onNav }) {
  const locale = lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  const open = useMemo(() => {
    // Проверенные и сданные сюда не идут: «Главная» — про то, что ещё нужно
    // сделать, а история заданий живёт в своём разделе.
    const done = new Set(['SUBMITTED', 'CHECKED', 'COMPLETED', 'GRADED'])
    return (items || [])
      .filter((h) => !done.has(String(h.status || '').toUpperCase()))
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
      .slice(0, 3)
  }, [items])

  return (
    <section className="hm-card hm-hw">
      <h2 className="hm-card__title">{t('home.homework.title')}</h2>
      {open.length === 0 ? (
        <p className="hm-hw__empty">{t('home.homework.empty')}</p>
      ) : (
        <ul className="hm-hw__list">
          {open.map((h) => {
            const count = h.exerciseCount ?? h.exercises?.length ?? null
            return (
              <li key={h.id}>
                <button type="button" className="hm-hw__item" onClick={() => onNav?.('homework')}>
                  <b>{h.title}</b>
                  <span>
                    {h.dueDate && (
                      <i>{t('home.homework.due', {
                        date: new Date(h.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
                      })}</i>
                    )}
                    {count != null && <i>{t('home.homework.tasks', { n: String(count) })}</i>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Практика на сегодня — четыре входа в разделы, а не подобранные задания.
 *
 * Подборки на бэкенде нет: ни ручки, ни признака «что человеку сегодня
 * полезнее». Изобретать её на клиенте значило бы выдавать случайный выбор за
 * рекомендацию. Пока это ярлыки в разделы Практики — они экономят два клика и
 * не обещают того, чего система не знает.
 */
function PracticeToday({ t, onNav }) {
  const tiles = [
    { key: 'books', emoji: '📚', to: 'practice' },
    { key: 'tutor', emoji: '🖥️', to: 'tutor' },
    { key: 'listening', emoji: '🎧', to: 'practice' },
    { key: 'vocab', emoji: '📖', to: 'vocab' },
  ]
  return (
    <section className="hm-card hm-prac">
      <h2 className="hm-card__title">{t('home.practice.title')}</h2>
      <div className="hm-prac__grid">
        {tiles.map((tile) => (
          <button
            type="button"
            className="hm-prac__tile"
            key={tile.key}
            onClick={() => onNav?.(tile.to)}
          >
            <span className="hm-prac__text">
              <b>{t(`home.practice.${tile.key}.title`)}</b>
              <i>{t(`home.practice.${tile.key}.sub`)}</i>
            </span>
            <span className="hm-prac__emoji" aria-hidden="true">{tile.emoji}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
