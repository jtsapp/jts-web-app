// Как показать пост ученику (спека 2026-11-11 §7). Чистые функции под карточкой.

/** Бейдж своего непубличного поста. Чужое непубличное ученику и не приходит (§5.1), поэтому у чужих бейджа нет. */
export function postBadge(post) {
  if (!post?.mine) return null
  if (post.status === 'pending' || post.status === 'tomorrow') return { key: 'birge.badge.review', tone: 'pend' }
  if (post.status === 'rejected') return { key: 'birge.badge.rejected', tone: 'rej' }
  // Скрытое по переполнению сервер отдаёт автору как published (§3.3). Если всё же пришёл hidden/overflow — без бейджа:
  // автор не должен узнать о подмене.
  if (post.status === 'hidden' && post.hiddenReason !== 'overflow') return { key: 'birge.badge.hidden', tone: 'hid' }
  return null
}

/**
 * Лайк — только у опубликованного: на остальное сервер ответит отказом (§5.1). Скрытый по переполнению пост автору
 * приходит как published — у него лайк работает.
 */
export const isLive = (post) => post?.status === 'published'

/** Жалоба — не на свой пост и только пока сервер её разрешает (canReport: уже жаловался — false). */
export const canReport = (post) => Boolean(post && !post.mine && post.canReport)

export function authorInitial(author) {
  const name = (author?.name || '').trim()
  return name ? Array.from(name)[0].toUpperCase() : '?'
}

const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }
const dayOf = (date, timeZone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

/**
 * Время у карточки, как в прототипе: сегодня — «09:40», вчера — словом, раньше — «1 нояб.». Зона — браузера
 * (timeZone: undefined); в тестах её задают явно.
 */
export function postTime(iso, { lang = 'ru', now = new Date(), timeZone, yesterday = 'Вчера' } = {}) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const locale = LOCALES[lang] || LOCALES.ru
  const day = dayOf(date, timeZone)
  if (day === dayOf(now, timeZone)) {
    return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' }).format(date)
  }
  if (day === dayOf(new Date(now.getTime() - 86400000), timeZone)) return yesterday
  return new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric', month: 'short' }).format(date)
}
