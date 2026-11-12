// ?post=<id> в адресе, пока открыта ветка: F5 возвращает в неё же (App читает параметр в эффекте диплинка). Общая
// синхронизация адреса в App (lib/screenUrlParams.js) знает только свои ключи, поэтому параметр пишет и снимает
// сам экран. Чужие параметры не трогаем; без истории (тест, превью) — молча не пишем.
export function writePostParam(id) {
  try {
    const url = new URL(window.location.href)
    if (id == null) url.searchParams.delete('post')
    else url.searchParams.set('post', String(id))
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  } catch {
    // без window — нечего писать
  }
}
