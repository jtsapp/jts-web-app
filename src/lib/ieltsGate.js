// IELTS в проде скрыт, на деве и локально виден.
//
// Развилка по адресу, а не по ветке и не по переменной сборки: сборка и образ у дева и прода одни (NODE_ENV там
// и там production, TUTOR_ONLY одинаков в develop и main), поэтому единственное, что их различает на лету, —
// домен. Список прод-доменов короткий и явный: незнакомый адрес (дев, localhost, превью) раздел видит.
// Принудительно показать на проде можно переменной сборки NEXT_PUBLIC_ENABLE_IELTS=1.
export const PROD_HOSTS = ['ai-tutor.justtostudy.kz']

const clean = (v) => String(v ?? '').trim().toLowerCase().replace(/:\d+$/, '')

export function ieltsHiddenFor(hostname, forced = process.env.NEXT_PUBLIC_ENABLE_IELTS) {
  if (String(forced ?? '').trim() === '1') return false
  return PROD_HOSTS.includes(clean(hostname))
}

/** Скрыт ли IELTS у этого посетителя (по адресу страницы; на сервере и без window — не скрыт). */
export function ieltsHidden() {
  if (typeof window === 'undefined') return false
  return ieltsHiddenFor(window.location.hostname)
}

/** Экран IELTS: сам раздел и его внутренние страницы (ielts-mock, ielts-route…). */
export const isIeltsScreen = (key) => typeof key === 'string' && key.startsWith('ielts')
