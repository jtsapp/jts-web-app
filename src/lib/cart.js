// Корзина экрана «Тарифы». Чистые операции над массивом строк — экран держит
// её в useState и ничего не знает про правила сложения.
//
// Строка: { id, kind, title, subtitle, price, qty }. `price` — за одну единицу
// пакета, а не за строку: иначе изменение количества пришлось бы пересчитывать
// в двух местах и однажды они разъехались бы.

/** Добавляет пакет; повторное добавление того же — +1 к количеству. */
export function addItem(items, item) {
  const i = items.findIndex((x) => x.id === item.id)
  if (i === -1) return [...items, { ...item, qty: item.qty || 1 }]
  return items.map((x, k) => (k === i ? { ...x, qty: x.qty + (item.qty || 1) } : x))
}

/**
 * Меняет количество. Ноль и меньше — строка уходит: у «−» на единице нет
 * другого разумного исхода, а корзина со строкой «0 шт.» выглядит поломкой.
 */
export function setQty(items, id, qty) {
  if (qty <= 0) return removeItem(items, id)
  return items.map((x) => (x.id === id ? { ...x, qty } : x))
}

export function removeItem(items, id) {
  return items.filter((x) => x.id !== id)
}

export function hasItem(items, id) {
  return items.some((x) => x.id === id)
}

export function qtyOf(items, id) {
  return items.find((x) => x.id === id)?.qty || 0
}

export function cartTotal(items) {
  return items.reduce((sum, x) => sum + (x.price || 0) * (x.qty || 0), 0)
}

/** Счётчик у заголовка «Ваш заказ» — это число позиций, а не единиц товара. */
export function cartCount(items) {
  return items.length
}
