import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import LessonSchedule from './schedule/LessonSchedule.jsx'
import SelfStudy from './lessons/SelfStudy.jsx'
import TeacherHomeworkBoard from './homework/TeacherHomeworkBoard.jsx'
import OnboardingTour, { useScreenTour } from '../tutor/OnboardingTour.jsx'
import { isTeacher } from '../lib/jwt.js'

// Спикинг-клабы скрыты: офлайн-группы в админке так и не завели, и вкладка
// открывала заглушку «Страница в разработке» — на живом сайте это читается как
// поломка. Ключ 'lessons.tabClubs' и картинка заглушки на месте: вернуть вкладку
// — это снова добавить сюда строку и ветку рендера, когда клубы появятся.
const TABS = [
  { key: 'online', label: 'lessons.tabOnline' },
  // Самостоятельное обучение: материалы каталога, которые ученик проходит сам.
  // Не «каталог для ученика» — его срез до своего уровня, см. SelfStudy.
  { key: 'self', label: 'lessons.tabSelf' },
]
// Проверка домашних работ — вкладка преподавателя: ученик сдаёт работу в своём
// разделе «Домашняя работа», а принимает её тот, кто ведёт занятия, и логично
// делать это там же, где он смотрит расписание.
const TEACHER_TAB = { key: 'homework', label: 'lessons.tabHomework' }

/**
 * `initialTab` — с какой вкладки открыть экран.
 *
 * Нужен ради возврата из урока: ученик уходил в материал из «Самостоятельно», а
 * кнопка «К урокам» приводила его на расписание, и вкладку приходилось искать
 * заново каждый раз. Значение только начальное — дальше вкладку выбирает сам
 * ученик, и перерисовка родителя его выбор не сбрасывает.
 */
export default function LessonsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onOpenLesson, onOpenCatalog, onOpenSelfStudy, initialTab, tourKey }) {
  const { t } = useI18n()
  // Каталог уровней — инструмент преподавателя: он выбирает из него, что вести
  // на уроке. Ученику он показывал бы всё содержимое курса в обход программы,
  // поэтому вход в него только по роли.
  const teacher = isTeacher(token)
  const tabs = teacher ? [...TABS, TEACHER_TAB] : TABS
  const [tab, setTab] = useState(() => (tabs.some((x) => x.key === initialTab) ? initialTab : 'online'))

  // Тур — ученический: он рассказывает, как заходить на свой урок и сдавать
  // работы. Преподаватель этот экран использует как рабочее место (каталог,
  // проверка ДЗ), и объяснять ему «твоё ближайшее занятие» нечего.
  const tour = useScreenTour(teacher ? null : tourKey)
  // Расписание — вкладка по умолчанию, поэтому шаги про ближайший урок и
  // календарь ищут элементы именно там; на других вкладках их нет, и тур их
  // пропустит сам. «?» возвращает на «Онлайн», чтобы этого не случилось.
  const tourSteps = [
    { selector: '.ls__tabs', title: t('tour.lessons.tabs.title'), text: t('tour.lessons.tabs.text') },
    { selector: '.sch__top', title: t('tour.lessons.next.title'), text: t('tour.lessons.next.text') },
    { selector: '.cal-layout', title: t('tour.lessons.calendar.title'), text: t('tour.lessons.calendar.text') },
  ]
  const startTour = () => {
    setTab('online')
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
              onClick={() => setTab(key)}
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
            <SelfStudy token={token} userLevel={userLevel} onOpenLesson={onOpenSelfStudy} />
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

        {tour.open && (
          <OnboardingTour steps={tourSteps} storageKey={tourKey} onFinish={tour.finish} />
        )}
      </div>
    </LearningLayout>
  )
}
