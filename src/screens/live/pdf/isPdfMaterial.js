// PDF ли материал урока. Тип ставит преподаватель при загрузке («PDF» в форме
// материала), но ссылкой (LINK) или «Документом» тоже нередко приходит PDF —
// поэтому смотрим и на сам адрес: путь кончается на .pdf. Запрос и якорь
// (`?v=2`, `#page=3`) в путь не входят.
export function isPdfMaterial(material) {
  if (!material) return false
  if (material.materialType === 'PDF') return true
  return isPdfUrl(material.fileUrl)
}

export function isPdfUrl(url) {
  if (typeof url !== 'string' || !url) return false
  const path = url.split(/[?#]/, 1)[0]
  return /\.pdf$/i.test(path)
}
