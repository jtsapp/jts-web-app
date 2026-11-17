import { useI18n } from '../i18n.jsx'

const COPY = {
  ru: {
    sub: 'Новости, объявления и обновления для студентов. Непрочитанные отмечены точкой.',
    all: 'Все', empty: 'Сейчас нет объявлений для вас.', loading: 'Загрузка…', retry: 'Повторить',
    error: 'Не удалось загрузить объявления.', actionError: 'Не удалось сохранить действие. Попробуйте ещё раз.',
    close: 'Закрыть', next: 'Далее', allNews: 'Все объявления', of: 'из',
    ack: 'Ознакомлен(а)', acked: 'Ознакомление подтверждено', pinned: 'Закреплено', calendar: 'Добавить в календарь',
    votes: 'Голосов', options: 'Варианты ответа', lastDay: 'Последний день', remaining: 'Осталось', days: 'дн.',
    types: ['Важно', 'Обновление платформы', 'Событие', 'Акция / конкурс', 'Поздравление', 'Опрос', 'Новый материал', 'Напоминание о сроке', 'Вакансия', 'Герой месяца'],
  },
  kk: {
    sub: 'Студенттерге арналған жаңалықтар, хабарландырулар және жаңартулар. Оқылмағандары нүктемен белгіленген.',
    all: 'Барлығы', empty: 'Қазір сізге арналған хабарландырулар жоқ.', loading: 'Жүктелуде…', retry: 'Қайталау',
    error: 'Хабарландыруларды жүктеу мүмкін болмады.', actionError: 'Әрекетті сақтау мүмкін болмады. Қайталап көріңіз.',
    close: 'Жабу', next: 'Келесі', allNews: 'Барлық хабарландырулар', of: '/',
    ack: 'Таныстым', acked: 'Танысу расталды', pinned: 'Бекітілген', calendar: 'Күнтізбеге қосу',
    votes: 'Дауыс саны', options: 'Жауап нұсқалары', lastDay: 'Соңғы күн', remaining: 'Қалды', days: 'күн',
    types: ['Маңызды', 'Платформа жаңартуы', 'Іс-шара', 'Акция / байқау', 'Құттықтау', 'Сауалнама', 'Жаңа материал', 'Мерзім туралы еске салу', 'Бос жұмыс орны', 'Ай қаһарманы'],
  },
  en: {
    sub: 'News, announcements and updates for students. Unread items are marked with a dot.',
    all: 'All', empty: 'There are no announcements for you right now.', loading: 'Loading…', retry: 'Retry',
    error: 'Could not load announcements.', actionError: 'Could not save this action. Please try again.',
    close: 'Close', next: 'Next', allNews: 'All announcements', of: 'of',
    ack: 'I have read this', acked: 'Acknowledged', pinned: 'Pinned', calendar: 'Add to calendar',
    votes: 'Votes', options: 'Answer options', lastDay: 'Last day', remaining: 'Remaining', days: 'days',
    types: ['Important', 'Platform update', 'Event', 'Promotion / contest', 'Congratulations', 'Poll', 'New material', 'Deadline reminder', 'Vacancy', 'Student of the month'],
  },
}

export function useNewsCopy() {
  const { lang, setLang } = useI18n()
  const language = lang === 'kk' || lang === 'kz' ? 'kk' : lang === 'en' ? 'en' : 'ru'
  return { copy: COPY[language], language, setLanguage: setLang }
}

export function localized(post, field, language) {
  const value = language === 'kk' ? post[field + 'Kk'] : language === 'en' ? post[field + 'En'] : null
  return value?.trim() ? value : post[field] || ''
}

// Do not show a teacher post even if an old server returns an unscoped feed.
export const studentPosts = (rows) => Array.isArray(rows) ? rows.filter((post) => post.targetRole === 'STUDENT') : []
