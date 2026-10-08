// Словарь тапа по слову — 216 КБ, и он общий на все уровни. Тянем его ЛЕНИВО,
// с первого тапа: большинству читателей он не нужен вовсе (перевод ключевых
// слов уже лежит рядом с текстом).
//
// Сбой отдаём как null и не запоминаем. Раньше он запоминался пустым {}: пустой
// объект — это «словарь есть», и до перезагрузки страницы тап шёл мимо
// офлайн-слоя, без казахского перевода (ревью 08.10.2026).
let dictPromise = null
export function loadDict() {
  if (!dictPromise) {
    dictPromise = fetch('/practice/reading/dict.json')
      .then((r) => {
        if (!r.ok) throw new Error('bad status ' + r.status)
        return r.json()
      })
      .catch(() => {
        dictPromise = null
        return null
      })
  }
  return dictPromise
}
