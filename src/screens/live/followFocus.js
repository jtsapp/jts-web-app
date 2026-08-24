// Чистый помощник для follow-me: понимает ли ученик, куда его зовёт учитель.
//
// Разделы ученик грузит один раз при входе в занятие. Учитель может прикрепить
// урок из каталога уже после этого — тогда в событии focus приезжают раздел и
// материал, которых в списке ученика нет, и переключаться ему не на что: экран
// остаётся на прежнем уроке, а ученик даже не знает, что материал сменился.
// Поэтому перед переключением проверяем, знаком ли адрес, и если нет —
// перечитываем разделы.

/**
 * @param {Array} sections загруженные у ученика разделы (с материалами)
 * @param {{sectionId: number|null, materialId?: number|null}} evt событие focus
 * @returns {boolean} true, если и раздел, и материал уже известны
 */
export function knowsFocusTarget(sections, evt) {
  if (!evt || evt.sectionId == null) return true

  const section = (sections || []).find((s) => String(s.id) === String(evt.sectionId))
  if (!section) return false

  // materialId может не прийти — тогда достаточно знать сам раздел.
  if (evt.materialId == null) return true

  return (section.materials || []).some((m) => String(m.materialId) === String(evt.materialId))
}
