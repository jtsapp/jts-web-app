import { isProdHost } from './lib/ieltsGate.js'

// Флаги сборки, различающиеся между ветками.
//
// TUTOR_ONLY — режим «только тьютор» для прода (ветка main): в интерфейсе
// остаются тьютор, вход и профиль; остальные разделы (Обучение,
// Уроки, IELTS) не видны обычным пользователям — код и экраны
// сохраняются и открываются диплинком ?screen=… для отладки.
// В develop флаг false (полная версия), в main — true. Это единственное
// намеренное расхождение веток; при мерже develop → main конфликт на этой
// строке разрешать в пользу true, при мерже main → develop — в пользу false.
//
// ВНИМАНИЕ (инцидент мержа main → develop 30.07.2026): git на этой строке
// конфликт НЕ показывает. develop строку не трогал со времён merge-base, а main
// переписал файл целиком (добавил TUTOR_ONLY_SECTIONS ниже) — поэтому мерж тихо
// берёт версию main вместе с true, и develop превращается в тьютор-онли без
// единого маркера конфликта. После каждого мержа main → develop проверяй эту
// строку глазами, на автомерж не надейся.
export const TUTOR_ONLY = false

// Разделы, открытые в тьютор-онли режиме: сайдбар (Sidebar.jsx) показывает
// только их, навигация (App.jsx handleNav/handleTutorNav) пропускает только их.
// 'listening', 'shadowing' и 'writing' — не пункты сайдбара, а внутренние
// экраны Практики (баннер «Аудирование» → onNav('listening'), карточки
// Shadowing → onNav('shadowing'), баннер «Письмо» → onNav('writing')),
// поэтому тоже в списке: handleNav гейтится этим же списком, и без записи
// здесь раздел мёртв на проде.
// При TUTOR_ONLY = false список не используется.
export const TUTOR_ONLY_SECTIONS = ['tutor', 'practice', 'vocab', 'listening', 'shadowing', 'writing', 'home', 'pricing', 'minutes']

// JARVIS_ENABLED — четвёртый тьютор «Джарвис» на экране выбора. Только для
// разработки и dev-стенда, в прод не идёт.
//
// Почему переменная сборки, а не NODE_ENV: dev-стенд (dev-tutor.justtostudy.kz)
// собирается тем же `next build` в том же образе, что и прод, — там
// NODE_ENV === 'production', и проверка «не прод» спрятала бы Джарвиса именно
// на стенде, ради которого он и делается.
//
// Почему НЕ ветка (как TUTOR_ONLY): флаг одинаков в develop и main, поэтому
// мерж между ними его не переписывает и очередного тихого расхождения веток
// не создаёт (см. инцидент выше). Включается только окружением сборки:
// локально — строкой в .env.local, на стенде — переменной GitLab CI со scope
// dev (плюс ARG в Dockerfile и build.args в compose-app.yaml — NEXT_PUBLIC_*
// вшивается в бандл на этапе сборки). В прод-окружении переменной нет → false,
// и карточка не попадает даже в бандл.
export const JARVIS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_JARVIS === '1'

// Гейта AIZERE_ENABLED больше нет: 03.10.2026 Айзере выкатили в прод, и она
// видна всем (src/tutor/tutors.js). Агент общий для дева и прода, поэтому
// голос и характер у неё там с первого дня те же, что на dev-стенде.

// Rewards are visible only on the development domain, regardless of build mode.
// Unknown hosts (including SSR without a browser) keep the feature hidden.
export function areRewardsEnabled(hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return typeof hostname === 'string' && hostname.toLowerCase() === 'dev-tutor.justtostudy.kz'
}
export const isRewardsScreen = (screen) => screen === 'tokens' || screen === 'prizes'

// Временно скрыты у ученика на проде до проверки кабинетов всеми тремя сторонами.
// Общий список нужен меню, прямым ссылкам и блокам на других экранах.
const STUDENT_HIDDEN_ON_PROD = new Set([
  'tokens', 'prizes', 'feedback', 'notifications', 'contracts',
  'my-teacher', 'teacher-wizard', 'teacher-pick',
])
export function isStudentSectionHidden(screen, hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return isProdHost(hostname) && STUDENT_HIDDEN_ON_PROD.has(screen)
}
