import { TUTOR_ONLY, TUTOR_ONLY_SECTIONS, isRewardsScreen, isStudentSectionHidden } from '../config.js'
import { isSectionOpen } from './studentSections.js'

// Меню ученика — одно на сайдбар (компьютер и планшет), нижнюю панель телефона и экран «Сервисы». Правила
// перенесены из Sidebar.jsx без изменений (26.10.2026): панель и «Сервисы» обязаны показывать ровно те разделы, что
// сайдбар, — иначе у преподавателя или ученика IELTS телефон и компьютер разошлись бы.

// «Главная» держится отдельно от NAV не по правам, а по порядку: она всегда первая, а NAV — общий список разделов.
// Пункт есть у КАЖДОГО ученика, демо и оплаченного: экран давно перестал быть сводкой демо-доступа и показывает
// уровень, прогресс, расписание и домашку. Преподаватель — исключение: у него свой набор разделов.
//
// Значки пунктов — контурные Material Symbols из макета «Главная · редизайн» (21.10.2026), файлами в
// public/assets/home-v2/ico. Рисуются маской, поэтому цвет берут от пункта.
export const HOME_ITEM = { key: 'home', label: 'nav.home', ico: 'home' }

// «Мой учитель» (ТЗ 08 §1): сразу под «Главной», только ученику и только когда на стенде есть подбор v2 —
// без него пункт вёл бы на «раздел скоро появится». Есть ли подбор, решает хук меню (useMenuItems).
const MY_TEACHER_ITEM = { key: 'my-teacher', label: 'nav.myTeacher', ico: 'person' }

// «Выбрать группу» (ТЗ кабинетов, 14): рядом с «Моим учителем», только ученику. Видимость по тарифу и формату решает 14е —
// раздел `group` открыт только формату «в группе», а пока абонемента нет (онбординг), меню полное.
const GROUP_ITEM = { key: 'group', label: 'nav.group', ico: 'groups' }

const NAV_FULL = [
  { key: 'learning', label: 'nav.learning', ico: 'map' },
  { key: 'practice', label: 'nav.practice', ico: 'auto_stories' },
  { key: 'tutor', label: 'nav.tutor', ico: 'auto_awesome' },
  { key: 'lessons', label: 'nav.lessons', ico: 'videocam' },
  { key: 'homework', label: 'nav.homework', ico: 'assignment' },
  // IELTS вернулся в меню вместе с хабом раздела (макет Screen MS, 01.10.2026).
  // Пунктов стало восемь — на низких экранах их ужимает CSS (.sb в styles.css).
  { key: 'ielts', label: 'nav.ielts', ico: 'school' },
  { key: 'sat', label: 'nav.sat', ico: 'quiz' },
  { key: 'vocab', label: 'nav.vocab', ico: 'menu_book' },
  { key: 'tokens', label: 'nav.tokens', ico: 'insights' },
  { key: 'prizes', label: 'nav.prizes', ico: 'school' },
  // «Feedback» — отзывы и жалобы ученика (ТЗ кабинетов, раздел 5); раньше экран открывался только из профиля.
  { key: 'feedback', label: 'nav.feedback', ico: 'forum' },
  // «Уведомления» видны всем ученикам независимо от тарифа и формата (ТЗ кабинетов, 14е).
  { key: 'notifications', label: 'nav.notifications', ico: 'notifications' },
  // «Договоры» тоже видны всем (ТЗ кабинетов, 14е); значок — сколько договоров ждут подписи.
  { key: 'contracts', label: 'nav.contracts', ico: 'edit_note' },
]
// Тьютор-онли (прод, main): в меню остаются только разделы из TUTOR_ONLY_SECTIONS (Тьютор, Практика, Словарь) —
// остальные скрыты от обычных пользователей (доступны диплинком ?screen=… для отладки).
const NAV = TUTOR_ONLY ? NAV_FULL.filter((i) => TUTOR_ONLY_SECTIONS.includes(i.key)) : NAV_FULL
// Значок пункта по ключу — для списков разделов вне меню (тур «Главной»).
export const NAV_ICONS = Object.fromEntries([HOME_ITEM, MY_TEACHER_ITEM, GROUP_ITEM, ...NAV_FULL].map((i) => [i.key, i.ico]))

// Разделы преподавателя. Остальное в списке — его собственное обучение, которого у него нет: Тьютор, IELTS и
// Словарь ученические (design-spec §4.2).
//
// «Практика» — исключение, и по просьбе самих преподавателей: заданий там больше, чем в уроках, а выдать их на дом
// было неоткуда. Прогресс и лимиты у преподавателя при этом свои, пустые, — он раздел не проходит, а выдаёт из него
// задания (см. AssignPracticeBar).
const TEACHER_SECTIONS = ['lessons', 'practice']

// Аккаунт IELTS (дизайн «IELTS new», 08.10.2026): ровно эти разделы и в этом порядке, а внизу «Настройки». Игровых
// счётчиков и плашки уровня в макете нет. С 13.10.2026 то же меню у ученика с открытым доступом к IELTS или SAT — и
// в нём всегда ОБА экзамена: доступ к одному не прячет второй (решение владельца), «Повторение» (Review) остаётся в
// меню — владелец, 13.10.2026.
const IELTS_SECTIONS = ['learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'ielts', 'sat', 'tokens', 'prizes', 'feedback', 'notifications', 'contracts']

/**
 * Пункты меню по роли. Награды (tokens, prizes) — только там, где они включены (rewards); вкладки экзаменов — только
 * при своей подписке, абонементе или тарифе (exams), пока ответа нет — спрятаны. «Мой учитель» — когда на стенде
 * есть подбор учителя (myTeacher). Разделы по тарифу и формату (sections, ТЗ кабинетов 14е): закрытый раздел в меню не
 * показываем; до ответа сервера и без абонемента (null) меню полное.
 */
export function menuItems({
  teacher = false,
  ieltsAccount = false,
  exams = { ielts: false, sat: false },
  rewards = false,
  myTeacher = false,
  sections = null,
} = {}) {
  const head = teacher ? [HOME_ITEM] : myTeacher ? [HOME_ITEM, MY_TEACHER_ITEM, GROUP_ITEM] : [HOME_ITEM, GROUP_ITEM]
  const all = teacher
    ? NAV.filter((item) => TEACHER_SECTIONS.includes(item.key))
    : ieltsAccount
      // из NAV, а не NAV_FULL: в тьютор-онли аккаунт IELTS не должен видеть скрытые от всех разделы
      ? [...head, ...IELTS_SECTIONS.map((k) => NAV.find((i) => i.key === k)).filter(Boolean)]
      : [...head, ...NAV]
  return all.filter((item) => {
    if (!teacher && isStudentSectionHidden(item.key)) return false
    if (!rewards && isRewardsScreen(item.key)) return false
    if (item.key === 'ielts') return exams.ielts
    if (item.key === 'sat') return exams.sat
    return isSectionOpen(sections, item.key)
  })
}

// Нижняя панель телефона — дизайн мобильного приложения (Figma «Mobile», кадр 6419:6295): четыре раздела вкладками и
// «Сервисы», где профиль и всё остальное. Тьютор подписан как в меню — «Speaking Buddy», а не «AI-тьютор» приложения:
// одно имя раздела в туре, меню и на панели (решение владельца 27.10.2026).
const TAB_KEYS = ['home', 'practice', 'tutor', 'lessons']
const TAB_META = {
  home: { label: 'nav.home', ico: 'home' },
  practice: { label: 'nav.practice', ico: 'auto_stories' },
  tutor: { label: 'nav.tutor', ico: 'auto_awesome' },
  lessons: { label: 'nav.lessons', ico: 'videocam' },
}
export const SERVICES_TAB = { key: 'services', label: 'mtab.services', ico: 'grid_view' }

/** Вкладки — разделы из меню этого ученика; «Сервисы» есть всегда: там профиль. */
export function mobileTabs(items) {
  const have = new Set(items.map((i) => i.key))
  return [...TAB_KEYS.filter((k) => have.has(k)).map((key) => ({ key, ...TAB_META[key] })), SERVICES_TAB]
}

/** Плитки «Сервисов» — пункты меню, которые не стали вкладками, в порядке меню. */
export function serviceItems(items) {
  return items.filter((i) => !TAB_KEYS.includes(i.key))
}

// Внутренние экраны разделов: в приложении панели там нет, вместо неё своя «назад» экрана (решение владельца
// 27.10.2026). Список явный, а не «всё, кроме корней вкладок»: экран без своей «назад» (IELTS, домашка, Словарь,
// карта уровней) без панели стал бы тупиком — на телефоне нет ни бургера, ни сайдбара. Новый внутренний экран с
// «назад» — строка сюда.
const INNER_SCREENS = new Set([
  // разделы Практики — у каждого «← В Практику» или своя полоса с крестиком
  'reading', 'writing', 'workbook', 'listening', 'words', 'verbs', 'listenchoose', 'speakspin', 'numbers', 'listen',
  'prepositions', 'pronunciation', 'grammar-games', 'speed-reading', 'cartoons', 'wordhunt', 'arcade', 'situations', 'shadowing',
  // план по дням и маршрут General English, каталог курса — экраны со своей «назад»
  'ge-plan', 'ge-route', 'course-catalog',
  // мастер подбора учителя: «← Назад» в шапке шага и своя закреплённая снизу панель (.mt-bar) — наша легла бы на неё
  'teacher-wizard',
])

/** Видна ли нижняя панель на этом экране (ключ screen App): на внутренних экранах разделов — нет. */
export function showsTabBar(screen) {
  return !INNER_SCREENS.has(screen)
}

/** Какая вкладка горит на экране с этим `active` оболочки: свой раздел — своя, всё прочее (и профиль) — «Сервисы». */
export function tabFor(active) {
  return TAB_KEYS.includes(active) ? active : 'services'
}
