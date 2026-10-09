// Где ученик был на этом занятии — чтобы после перезагрузки страницы вернуться туда, а не на первый раздел.
//
// Раньше после F5 (а их жмут, когда «что-то не работает») ученик оказывался на первом разделе занятия, и это
// место тут же уходило преподавателю: тот, кто смотрит экран ученика, «выкидывался на самый верх», а рамка
// показывала первый материал без ответов ученика — «ответы пропали» (жалоба Aii, пятница 09.10.2026).
//
// sessionStorage, а не localStorage: перезагрузка той же вкладки место сохраняет, а новое открытие урока (другая
// вкладка, другой день) начинается с начала, как и должно.
const key = (lessonId) => `jts_live_pos_${lessonId}`

export function loadLivePosition(lessonId) {
  try {
    const raw = sessionStorage.getItem(key(lessonId))
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || value.sectionId == null) return null
    return { sectionId: value.sectionId, materialId: value.materialId ?? null }
  } catch {
    return null
  }
}

export function saveLivePosition(lessonId, { sectionId, materialId }) {
  if (sectionId == null) return
  try {
    sessionStorage.setItem(key(lessonId), JSON.stringify({ sectionId, materialId: materialId ?? null }))
  } catch {
    /* приватное окно и т.п. — место просто не переживёт перезагрузку */
  }
}

/**
 * Запомненное место, если оно ещё есть среди разделов занятия (раздел могли убрать, пока ученик был вне
 * урока). Материал — только если он всё ещё в этом разделе, иначе раздел откроется на первом материале.
 */
export function rememberedPlace(lessonId, sections) {
  const saved = loadLivePosition(lessonId)
  if (!saved) return null
  const section = (sections || []).find((s) => String(s.id) === String(saved.sectionId))
  if (!section) return null
  const hasMaterial = saved.materialId != null
    && (section.materials || []).some((m) => String(m.materialId) === String(saved.materialId))
  return { sectionId: section.id, materialId: hasMaterial ? saved.materialId : null }
}
