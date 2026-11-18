// ?lesson=<slug> в адресе, пока урок Видеодиктанта открыт: F5 и ссылка возвращают в урок (App читает параметр в
// эффекте диплинка). Общая синхронизация адреса (lib/screenUrlParams.js) знает только свои ключи, поэтому параметр
// пишет и снимает сам экран — как ?post= у Birge (birge/postParam.js). Чужие параметры не трогаем; без истории —
// молча не пишем.
//
// ?lesson= есть и у lesson-workspace (id живого урока). Снимаем параметр, только если он всё ещё наш — то есть равен
// slug, который экран записал сам: ушёл ученик в lesson-workspace, и тот уже положил свой id — его не трогаем.
function update(change) {
  try {
    const url = new URL(window.location.href)
    if (!change(url.searchParams)) return
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  } catch {
    // без window — нечего писать
  }
}

export function writeLessonParam(slug) {
  update((params) => {
    params.set('lesson', String(slug))
    return true
  })
}

/** Снимает ?lesson=, если там всё ещё slug этого экрана. */
export function clearLessonParam(slug) {
  update((params) => {
    if (slug == null || params.get('lesson') !== String(slug)) return false
    params.delete('lesson')
    return true
  })
}
