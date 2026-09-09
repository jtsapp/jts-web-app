import { Fragment, useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import DemoBanner from '../components/DemoBanner.jsx'
import AssetImage from '../components/AssetImage.jsx'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { levelSummary, nextLevel, touchWeeklySnapshot } from '../lib/levelProgress.js'
import { loadSkillStatsRemote, readLocalSkillStats } from '../practice/skillStats.js'
import { getTrialRequestState, requestTrialLesson, getMyLessonOccurrences } from '../api.js'
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
  // Уровня в профиле нет — тест ещё не пройден (тот же признак, по которому
  // App ведёт на 'test-intro' после входа). Показывать вместо него карточку с
  // 'A1' нельзя: человек читал бы её как свой определённый уровень.
  levelUnknown = false,
  onNav,
  onProfile,
  onOpenPricing,
  onOpenTrial,
  onOpenLesson,
  onStartLevelTest,
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

  // Ступени дорожки — ближайший уровень и следующий за ним. Дальше рисовать
  // нечего: «Финиш» и есть конец пути, а обещать конкретную ступень через две
  // от текущей значило бы показывать план, которого у курса нет.
  const stops = useMemo(() => [summary.next, nextLevel(summary.next)].filter(Boolean), [summary.next])

  // Пробный урок — три состояния, и все три уже есть в данных: назначенное
  // занятие (расписание), оставленная заявка (/mobile/trial-request) и ничего.
  // Спрашиваем оба источника: заявка живёт отдельно от урока — менеджер может
  // поставить занятие, так и не отметив заявку, и наоборот.
  const [trial, setTrial] = useState(null)
  const [nextLesson, setNextLesson] = useState(null)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    let alive = true
    // Ни один из запросов не критичен: не ответил — соответствующая карточка
    // показывает «пусто», а экран остаётся целым. Это честнее пустого места.
    getTrialRequestState(token).then((s) => { if (alive) setTrial(s) }).catch(() => {})
    getMyLessonOccurrences(token)
      .then((occ) => {
        if (!alive) return
        // Из всего расписания экрану нужно одно занятие — ближайшее: оно и
        // решает, что написано в карточке пробного урока.
        setNextLesson(pickFeaturedOccurrence(Array.isArray(occ) ? occ : []))
      })
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

        {/* Уровня нет — тест не пройден. Вместо карточки с чужими цифрами
            зовём пройти тест: это единственный способ её наполнить. */}
        {levelUnknown ? (
          <section className="hm-card hm-placement">
            <h1 className="hm-placement__title">{t('home.level.unknown.title')}</h1>
            <p className="hm-placement__sub">{t('home.level.unknown.sub')}</p>
            <button type="button" className="hm-placement__cta" onClick={() => onStartLevelTest?.()}>
              {t('test.start')}
            </button>
          </section>
        ) : (
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

            {/* Дорожка «Старт → следующие ступени → Финиш». Одинокая полоса
                показывала только «сколько до соседнего уровня» — по ней не было
                видно, куда путь ведёт дальше. Заполнен только первый отрезок:
                процент считается до ближайшей ступени, дальние знать неоткуда. */}
            <div className="hm-level__track">
              <span className="hm-level__stop hm-level__stop--now">{t('home.level.start')}</span>
              {stops.map((code, i) => (
                <Fragment key={code}>
                  <span className="hm-level__seg">
                    {i === 0 && <i className="hm-level__fill" style={{ width: `${summary.percent}%` }} />}
                  </span>
                  <span className="hm-level__stop">{t('home.level.stop', { level: code })}</span>
                </Fragment>
              ))}
              <span className="hm-level__seg" />
              <span className="hm-level__stop hm-level__stop--finish">{t('home.level.finish')}</span>
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
        )}

        <div className="hm-row">
          <div className="hm-col">
          {/* Сильные и слабые стороны. Без пройденного теста профиль навыков
              не показываем: считать его не от чего, и на макете его там нет. */}
          {!levelUnknown && (
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
          )}
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
