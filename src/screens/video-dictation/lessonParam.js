// ?lesson=<slug> в адресе, пока урок Видеодиктанта открыт: F5 и ссылка возвращают в урок (App читает параметр в
// эффекте диплинка). Общая синхронизация адреса (lib/screenUrlParams.js) знает только свои ключи, поэтому параметр
// пишет и снимает сам экран — как ?post= у Birge (birge/postParam.js). Чужие параметры не трогаем; без истории —
// молча не пишем.
export function writeLessonParam(slug) {
  try {
    const url = new URL(window.location.href)
    if (slug == null) url.searchParams.delete('lesson')
    else url.searchParams.set('lesson', String(slug))
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  } catch {
    // без window — нечего писать
  }
}
