import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import LessonSchedule from './schedule/LessonSchedule.jsx'
import SelfStudy from './lessons/SelfStudy.jsx'
import TeacherHomeworkBoard from './homework/TeacherHomeworkBoard.jsx'
import { isTeacher } from '../lib/jwt.js'

const TABS = [
  { key: 'clubs', label: 'lessons.tabClubs' },
  { key: 'online', label: 'lessons.tabOnline' },
  // Самостоятельное обучение: материалы каталога, которые ученик проходит сам.
  // Не «каталог для ученика» — его срез до своего уровня, см. SelfStudy.
  { key: 'self', label: 'lessons.tabSelf' },
]
// Проверка домашних работ — вкладка преподавателя: ученик сдаёт работу в своём
// разделе «Домашняя работа», а принимает её тот, кто ведёт занятия, и логично
// делать это там же, где он смотрит расписание.
const TEACHER_TAB = { key: 'homework', label: 'lessons.tabHomework' }

export default function LessonsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onOpenLesson, onOpenCatalog, onOpenSelfStudy }) {
  const { t } = useI18n()
  // Каталог уровней — инструмент преподавателя: он выбирает из него, что вести
  // на уроке. Ученику он показывал бы всё содержимое курса в обход программы,
  // поэтому вход в него только по роли.
  const teacher = isTeacher(token)
  const tabs = teacher ? [...TABS, TEACHER_TAB] : TABS
  const [tab, setTab] = useState('online')

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
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

        {/* Клубы (офлайн-группы) пока не заведены в админке - только «Онлайн». */}
        {tab === 'clubs' && (
          <div className="ls__body">
            <div className="soon">
              <div className="soon__art">
                <img src="/assets/lessons/under-construction.png" alt="" />
              </div>
              <div className="soon__text">
                <b>{t('soon.title')}</b>
                <span>{t('soon.subtitle')}</span>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </LearningLayout>
  )
}
