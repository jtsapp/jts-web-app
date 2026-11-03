// Какой пункт меню горит, пока грузится чанк экрана. Те же значения, что `active` у оболочки самого экрана: заглушка
// рисует ту же оболочку с сайдбаром, иначе на каждом первом заходе в раздел меню пропадало бы до конца загрузки.
//
// Экрана здесь нет — заглушка без сайдбара, просто кружок: так у экранов во всё окно (прохождения тестов, живой урок,
// звонок), где сайдбар на миг появился бы и исчез. Поэтому список не обязан быть полным: забытый экран только теряет
// сайдбар на время загрузки.
const PRACTICE = [
  'practice', 'listening', 'shadowing', 'writing', 'workbook', 'words', 'listen', 'numbers', 'prepositions',
  'pronunciation', 'grammar-games', 'speed-reading', 'cartoons', 'wordhunt', 'speakspin', 'verbs', 'situations',
  'listenchoose', 'arcade', 'reading',
]
const TUTOR = [
  'tutor-welcome', 'tutor-choose', 'tutor-dashboard', 'tutor-scenarios', 'tutor-manage', 'tutor-chat-history',
  'tutor-lesson-plan', 'tutor-error-analytics', 'tutor-call-report', 'tutor-practice-result',
]
const IELTS = ['ielts', 'ielts-diagnostic', 'ielts-diagnostic-result', 'ielts-route']

const NAV_OF = {
  ...Object.fromEntries(PRACTICE.map((s) => [s, 'practice'])),
  ...Object.fromEntries(TUTOR.map((s) => [s, 'tutor'])),
  ...Object.fromEntries(IELTS.map((s) => [s, 'ielts'])),
  home: 'home',
  'ge-plan': 'home',
  'ge-route': 'home',
  services: 'services',
  profile: '',
  kingdom: 'learning',
  'kingdom-interior': 'learning',
  lessons: 'lessons',
  'course-catalog': 'lessons',
  homework: 'homework',
  vocab: 'vocab',
  sat: 'sat',
  tokens: 'tokens',
  prizes: 'prizes',
  notifications: 'notifications',
  contracts: 'contracts',
  group: 'group',
  'my-teacher': 'my-teacher',
  'teacher-wizard': 'my-teacher',
}

/** Пункт меню экрана с оболочкой кабинета или undefined, если заглушке оболочка не нужна. */
export function shellNavOf(screen) {
  return NAV_OF[screen]
}
