// «Показать, что где» (кейсы 24 и 35 ТЗ v2.0): короткая карта разделов строкой окна Луны, без модели. Список — не свой, а
// тот, что сейчас в меню ученика (data-nav у пунктов сайдбара, как у тура «Главной», TourSections.jsx): у демо, IELTS и
// скрытых на проде разделов меню разное, и карта не должна звать туда, где ничего нет. Сайдбар на телефоне скрыт, но
// в DOM — карта работает и там. Подписи — свои, на «ты» (у тура они на «вы»); раздела без подписи в карте нет.
//
// Тур coach новому ученику не позвать: «?» на «Главной» до теста скрыт (HomePage, onHelp), поэтому карта — здесь.

export const MAP_KEYS = [
  'learning',
  'practice',
  'tutor',
  'lessons',
  'homework',
  'vocab',
  'ielts',
  'sat',
  'my-teacher',
  'group',
  'tokens',
  'prizes',
  'feedback',
]
const FALLBACK = ['learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab']

/** Пункты меню ученика по порядку сайдбара (без «Главной»); меню не нашлось — обычный набор. */
export function menuKeys(doc = globalThis.document) {
  const found = doc
    ? [...doc.querySelectorAll('.sb__nav [data-nav]')].map((el) => el.getAttribute('data-nav')).filter((k) => k && k !== 'home')
    : []
  return [...new Set(found.length ? found : FALLBACK)]
}

/** Текст карты: заголовок, строка на раздел, подсказка в конце. */
export function sectionMapText(t, doc = globalThis.document) {
  const lines = menuKeys(doc)
    .filter((k) => MAP_KEYS.includes(k))
    .map((k) => `• ${t(`assistant.map.name.${k}`)} — ${t(`assistant.map.${k}`)}`)
  return [t('assistant.map.title'), ...lines, t('assistant.map.tail')].join('\n')
}
