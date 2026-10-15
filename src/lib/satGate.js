// SAT в проде скрыт, на деве и локально виден — по той же развилке, что и IELTS (lib/ieltsGate.js): сборка у дева и
// прода одна, различает их только домен. Принудительно показать на проде можно переменной сборки
// NEXT_PUBLIC_ENABLE_SAT=1.
import { isProdHost } from './ieltsGate.js'

export function satHiddenFor(hostname, forced = process.env.NEXT_PUBLIC_ENABLE_SAT) {
  if (String(forced ?? '').trim() === '1') return false
  return isProdHost(hostname)
}

/** Скрыт ли SAT у этого посетителя (по адресу страницы; на сервере и без window — не скрыт). */
export function satHidden() {
  if (typeof window === 'undefined') return false
  return satHiddenFor(window.location.hostname)
}

/** Экран SAT: сам раздел и все его внутренние страницы (sat-onboarding, sat-mock, sat-pricing…). */
export const isSatScreen = (key) => typeof key === 'string' && (key === 'sat' || key.startsWith('sat-'))
