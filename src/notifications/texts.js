import { useCallback } from 'react'
import { useI18n } from '../i18n.jsx'

// Тексты экрана «Уведомления» ученика — свой словарь, как у «Выбрать группу» (src/groups/texts.js). Русский — по ТЗ
// кабинетов, раздел 14 («Уведомления»: лента с каналами Email и Push и настройка каналов); ключи одинаковы во всех языках
// (сторож — texts.test.js).

const ru = {
  title: 'Уведомления',
  lead: 'Все события по вашему обучению. Важные дублируются на почту и в push — каналы настраиваются ниже.',
  loading: 'Загружаем…',
  empty: 'Уведомлений пока нет.',
  'error.generic': 'Не удалось выполнить действие. Попробуйте ещё раз.',
  markAll: 'Отметить все прочитанными',
  unread: 'Новое',
  'chip.EMAIL': 'Email',
  'chip.PUSH': 'Push',
  'chip.cabinet': 'Только кабинет',
  'channels.title': 'Куда дублировать',
  'channels.note': 'Кабинет работает всегда. У каждого уведомления в ленте стоит отметка каналов, по которым оно реально ушло.',
  'channels.email': 'Email',
  'channels.email.d': 'Письмо на почту из профиля',
  'channels.push': 'Push',
  'channels.push.d': 'Мгновенное уведомление в браузере и приложении',
  'channels.saved': 'Настройки каналов сохранены',
}

const kk = {
  title: 'Хабарландырулар',
  lead: 'Оқуыңызға қатысты барлық оқиға. Маңыздылары поштаға және push арқылы қайталанады — арналарды төменнен баптауға болады.',
  loading: 'Жүктелуде…',
  empty: 'Хабарландырулар әзірге жоқ.',
  'error.generic': 'Әрекетті орындау мүмкін болмады. Қайталап көріңіз.',
  markAll: 'Барлығын оқылды деп белгілеу',
  unread: 'Жаңа',
  'chip.EMAIL': 'Email',
  'chip.PUSH': 'Push',
  'chip.cabinet': 'Тек кабинет',
  'channels.title': 'Қайда қайталау',
  'channels.note': 'Кабинет әрқашан жұмыс істейді. Лентадағы әр хабарландыруда оның шынымен қай арнамен жеткені белгіленеді.',
  'channels.email': 'Email',
  'channels.email.d': 'Профильдегі поштаға хат',
  'channels.push': 'Push',
  'channels.push.d': 'Браузерде және қосымшада лезде хабарлау',
  'channels.saved': 'Арна баптаулары сақталды',
}

const en = {
  title: 'Notifications',
  lead: 'Everything about your studies. Important events are duplicated by email and push — set the channels below.',
  loading: 'Loading…',
  empty: 'No notifications yet.',
  'error.generic': 'Could not complete the action. Please try again.',
  markAll: 'Mark all as read',
  unread: 'New',
  'chip.EMAIL': 'Email',
  'chip.PUSH': 'Push',
  'chip.cabinet': 'Cabinet only',
  'channels.title': 'Where to duplicate',
  'channels.note': 'The cabinet always works. Each notification in the feed shows the channels it was actually sent through.',
  'channels.email': 'Email',
  'channels.email.d': 'A message to the email in your profile',
  'channels.push': 'Push',
  'channels.push.d': 'An instant notification in the browser and the app',
  'channels.saved': 'Channel settings saved',
}

export const TEXTS = { ru, kk, en }

export function noticeText(lang, key, vars) {
  let s = (TEXTS[lang] && TEXTS[lang][key]) ?? TEXTS.ru[key] ?? key
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k])
  return s
}

export function useNoticeT() {
  const { lang } = useI18n()
  const t = useCallback((key, vars) => noticeText(lang, key, vars), [lang])
  return { t, lang }
}
