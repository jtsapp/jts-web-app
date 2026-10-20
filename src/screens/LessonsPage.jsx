import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import LessonSchedule from './schedule/LessonSchedule.jsx'
import SelfStudy from './lessons/SelfStudy.jsx'
import TeacherHomeworkBoard from './homework/TeacherHomeworkBoard.jsx'
import ReportsTab from '../feedback/ReportsTab.jsx'
import OnboardingTour, { useScreenTour } from '../tutor/OnboardingTour.jsx'
import { isTeacher } from '../lib/jwt.js'
import { rememberPlace } from '../lib/navStack.js'
import { getSelfStudyAccess } from '../api.js'

// Спикинг-клабы скрыты: офлайн-группы в админке так и не завели, и вкладка
// открывала заглушку «Страница в разработке» — на живом сайте это читается как
// поломка. Ключ 'lessons.tabClubs' и картинка заглушки на месте: вернуть вкладку
// — это снова добавить сюда строку и ветку рендера, когда клубы появятся.
const TABS = [
  { key: 'online', label: 'lessons.tabOnline' },
  // Самостоятельное обучение: материалы каталога, которые ученик проходит сам.
  // Ученику вкладка видна только с тарифом Self Study — подписка или абонемент.
  // Преподавателю она остаётся: это его рабочее место, не тариф.
  { key: 'self', label: 'lessons.tabSelf' },
]
// Проверка домашних работ — вкладка преподавателя: ученик сдаёт работу в своём
// разделе «Домашняя работа», а принимает её тот, кто ведёт занятия, и логично
// делать это там же, где он смотрит расписание.
const TEACHER_TAB = { key: 'homework', label: 'lessons.tabHomework' }
// Отчёты о прогрессе — ученические: их пишет преподаватель про своего ученика,
// и у самого преподавателя этой вкладки нет.
const STUDENT_TAB = { key: 'reports', label: 'lessons.tabReports' }

/**
 * `initialTab` — с какой вкладки открыть экран.
 *
 * Нужен ради возврата из урока: ученик уходил в материал из «Самостоятельно», а
 * кнопка «К урокам» приводила его на расписание, и вкладку приходилось искать
 * заново каждый раз. Значение только начальное — дальше вкладку выбирает сам
 * ученик, и перерисовка родителя его выбор не сбрасывает.
 *
 * Приходит из места, которое экран оставил при уходе (lib/navStack.js), — то
 * есть только при «назад». Раньше App выводил вкладку из источника последнего
 * открытого урока и не сбрасывал его: после одного урока «Самостоятельно» эта
 * вкладка открывалась при каждом заходе, в том числе из живого урока.
 *
 * `initialReportId` — отчёт о прогрессе, открытый сразу: уведомление «Новый
 * отчёт» и карточка «Главной» ведут прямо в него, а не в список.
 */
export default function LessonsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onOpenLesson, onOpenCatalog, onOpenSelfStudy, onOpenPricing, initialTab, initialReportId = null, tourKey }) {
  const { t } = useI18n()
  // Каталог уровней — инструмент преподавателя: он выбирает из него, что вести
  // на уроке. Ученику он показывал бы всё содержимое курса в обход программы,
  // поэтому вход в него только по роли.
  const teacher = isTeacher(token)
  // pending — сервер ещё не ответил. Показать вкладку заранее нельзя: она
  // мигнёт у того, кому тариф не положен. Решить, что её нет, тоже нельзя:
  // возврат из урока «Самостоятельно» тогда откроет расписание.
  const [selfStudy, setSelfStudy] = useState(teacher ? 'yes' : 'pending')
  const showSelf = selfStudy === 'yes'
  const tabs = teacher
    ? [...TABS, TEACHER_TAB]
    : [...TABS.filter((item) => item.key !== 'self' || showSelf), STUDENT_TAB]
  const [tab, setTab] = useState(() => {
    if (initialTab === 'reports' && !teacher) return 'reports'
    if (initialTab === 'homework' && teacher) return 'homework'
    if (initialTab === 'self' && teacher) return 'self'
    return 'online'
  })
  const userPicked = useRef(false)

  useEffect(() => {
    if (teacher) {
      setSelfStudy('yes')
      return undefined
    }
    let cancelled = false
    setSelfStudy('pending')
    getSelfStudyAccess(token).then((ok) => {
      if (!cancelled) setSelfStudy(ok ? 'yes' : 'no')
    })
    return () => {
      cancelled = true
    }
  }, [teacher, token])

  useEffect(() => {
    if (userPicked.current) return
    if (initialTab === 'self') {
      if (!teacher && selfStudy === 'pending') return
      if (showSelf) setTab('self')
      return
    }
    if (initialTab === 'homework' && teacher) setTab('homework')
    else if (initialTab === 'reports' && !teacher) setTab('reports')
  }, [selfStudy, showSelf, teacher, initialTab])

  useEffect(() => {
    if (tab === 'self' && !showSelf && selfStudy !== 'pending') setTab('online')
  }, [tab, showSelf, selfStudy])

  useEffect(() => {
    rememberPlace('lessons', { tab })
  }, [tab])
  // Отчёт из уведомления открывается ОДИН раз: вкладка «Отчёты» при уходе на
  // соседнюю размонтируется, и без этого на возврате она снова открыла бы его
  // вместо списка.
  const [pendingReportId, setPendingReportId] = useState(initialReportId)
  const selectTab = (key) => {
    userPicked.current = true
    setTab(key)
    setPendingReportId(null)
  }

  // Тур — ученический: он рассказывает, как заходить на свой урок и сдавать
  // работы. Преподаватель этот экран использует как рабочее место (каталог,
  // проверка ДЗ), и объяснять ему «твоё ближайшее занятие» нечего.
  const tour = useScreenTour(teacher ? null : tourKey)
  // Расписание — вкладка по умолчанию, поэтому шаги про ближайший урок и
  // календарь ищут элементы именно там; на других вкладках их нет, и тур их
  // пропустит сам. «?» возвращает на «Онлайн», чтобы этого не случилось.
  const tourSteps = [
    // Одна вкладка — рассказывать про «две» не о чем: Self Study ученику не открыт.
    ...(showSelf
      ? [{ selector: '.ls__tabs', title: t('tour.lessons.tabs.title'), text: t('tour.lessons.tabs.text') }]
      : []),
    { selector: '.sch__top', title: t('tour.lessons.next.title'), text: t('tour.lessons.next.text') },
    { selector: '.cal-layout', title: t('tour.lessons.calendar.title'), text: t('tour.lessons.calendar.text') },
  ]
  const startTour = () => {
    selectTab('online')
    tour.start()
  }

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="lessons"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
      onHelp={teacher ? undefined : startTour}
    >
      <div className="ls">
        <header className="ls__head">
          <h1 className="ls__title">{t('nav.lessons')}</h1>
          {teacher && onOpenCatalog && (
            <button type="button" className="cc-entry" onClick={onOpenCatalog}>
              🗂️ {t('catalog.title')}
            </button>
          )}
        </header>

        <div className="ls__tabs">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`ls-tab ${tab === key ? 'ls-tab--active' : ''}`}
              onClick={() => selectTab(key)}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {tab === 'online' && (
          // Расписание — широкая раскладка: календарь и карточка урока занимают
          // всю страницу, в отличие от узкой заглушки «клубов» по центру.
          <div className="ls__body ls__body--wide">
            <LessonSchedule token={token} onOpenLesson={onOpenLesson} />
          </div>
        )}

        {tab === 'self' && (
          <div className="ls__body ls__body--wide">
            <SelfStudy token={token} userLevel={userLevel} onOpenLesson={onOpenSelfStudy} onOpenPricing={onOpenPricing} />
          </div>
        )}

        {tab === 'homework' && teacher && (
          <div className="ls__body ls__body--wide">
            <section className="hw">
              <h2 className="hw__section-title">{t('homework.reviewTitle')}</h2>
              <TeacherHomeworkBoard token={token} />
            </section>
          </div>
        )}

        {tab === 'reports' && !teacher && (
          <div className="ls__body ls__body--wide">
            <ReportsTab token={token} initialReportId={pendingReportId} />
          </div>
        )}

        {tour.open && (
          <OnboardingTour steps={tourSteps} storageKey={tourKey} onFinish={tour.finish} />
        )}
      </div>
    </LearningLayout>
  )
}
