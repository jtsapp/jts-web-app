// Подпись вида задания: тип графика у Task 1 AC, регистр письма у GT, тип эссе у Task 2 — ключи прототипа wr.*
// (прежний список заданий отсюда убран: Task 1 / Task 2 рисует страница Writing — WritingCatalog.jsx)
export function categoryLabel(t, kind, category) {
  if (!category) return null
  const group = kind === 'task2' ? 'essay' : ['formal', 'semi_formal', 'informal'].includes(category) ? 'register' : 'visual'
  return t(`ieltsWriting.p.${group}.${category}`)
}
