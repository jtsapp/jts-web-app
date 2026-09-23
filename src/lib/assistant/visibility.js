// Где показывать помощника. Правило одно: помощник есть там, где он помогает,
// и его нет там, где он мешал бы или подсказывал бы нечестно.

// Экраны, где помощника нет:
//  - тесты и экзамены — там он был бы шпаргалкой (уровень, IELTS-секции);
//  - живой урок и голосовой звонок — там уже есть преподаватель или тьютор,
//    а плавающая кнопка закрывает их собственные элементы;
//  - вход, регистрация и онбординг — ученика ещё нет, спрашивать не от чьего имени.
const HIDDEN_SCREENS = new Set([
  'test-intro',
  'test',
  'speaking-test',
  'ielts-listening',
  'ielts-reading',
  'ielts-writing',
  'ielts-speaking',
  'live-lesson',
  'tutor-voice-chat',
  'tutor-voice-intro',
  'tutor-loading',
  'booth',
  'welcome',
  'chat',
  'phone',
  'reg-phone',
  'reg-email',
  'reg-birth',
  'otp',
  'login-password',
  'complete-registration',
  'set-password',
  'success',
])

// Онбординг тьютора — цепочка экранов до первого звонка; помощник там только
// отвлекал бы от выбора. Дашборд и всё после него — обычные экраны.
const ONBOARDING_TUTOR = new Set([
  'tutor-welcome',
  'tutor-lang',
  'tutor-choose',
  'tutor-level-offer',
  'tutor-level-result',
  'tutor-interests',
  'tutor-profession',
  'tutor-analysis',
])

/**
 * @param {string|null} screen  текущий экран App
 * @param {{ token: string|null, boothAccount?: boolean, teacher?: boolean }} who
 */
export function assistantAllowedOn(screen, { token, boothAccount = false, teacher = false } = {}) {
  if (!token || boothAccount || teacher) return false
  if (!screen || HIDDEN_SCREENS.has(screen) || ONBOARDING_TUTOR.has(screen)) return false
  return true
}
