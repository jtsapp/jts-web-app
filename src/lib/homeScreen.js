import { isTeacher } from './jwt.js'
import { TUTOR_ONLY } from '../config.js'

/**
 * Домашний экран после входа — одно решение на все пути входа (восстановление
 * сессии, OTP, пароль, Google).
 *
 * Раньше это решение было выписано в App.jsx дважды и уже разошлось: у
 * восстановления сессии не было ветки «нужен тест уровня». Признак аккаунта
 * класса пришлось бы вписывать в обе копии, и он разошёлся бы третьим.
 *
 * Порядок веток — это порядок «кто главнее», и первым стоит аккаунт класса:
 * пробный урок он ведёт единственным экраном, кабинета у него нет вовсе
 * (см. screens/BoothEntryPage.jsx).
 */
export function homeScreenFor({
  token,
  boothAccount = false,
  needsLevelTest = false,
  tutorOnboarded = false,
} = {}) {
  if (boothAccount) return 'booth'
  // Преподаватель приходит работать, а не учиться: карта уровней с запертыми
  // королевствами — ученический экран, и открывать его первым ему бессмысленно.
  if (isTeacher(token)) return 'lessons'
  // Тьютор-онли (прод, main): королевств и письменного теста уровня в сборке
  // нет, свой тест уровня живёт внутри онбординга тьютора.
  if (TUTOR_ONLY) return tutorOnboarded ? 'tutor-dashboard' : 'tutor-welcome'
  return needsLevelTest ? 'test-intro' : 'kingdom'
}
