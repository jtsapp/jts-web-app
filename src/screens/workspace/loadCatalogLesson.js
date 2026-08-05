// Loads a catalog lesson for the workspace: the catalog stores only the raw
// `L*.html` file URL, so we fetch that, extract the workspace JSON on the client
// (hidden iframe), and resolve its relative media to absolute URLs (E6).
import { getCourseCatalogLesson } from '../../api.js'
import { runAndExtract } from './extract/runAndExtract.js'
import { rewriteMediaUrls } from './extract/rewriteMediaUrls.js'

// Cache by catalog-lesson id: re-opening the same lesson in a session should not
// re-fetch and re-extract (content is stable until the level is re-registered).
const cache = new Map()

export async function loadCatalogLesson(id, token) {
  if (cache.has(id)) return cache.get(id)
  try {
    const meta = await getCourseCatalogLesson(id, token)
    const fileUrl = meta?.fileUrl
    if (!fileUrl) return null

    const res = await fetch(fileUrl)
    if (!res.ok) return null
    const html = await res.text()

    const extracted = await runAndExtract(html)
    const lesson = rewriteMediaUrls(extracted, fileUrl)
    // Carry the catalog title/type when the HTML didn't yield its own.
    if (!lesson.title && meta.title) lesson.title = meta.title

    cache.set(id, lesson)
    return lesson
  } catch {
    return null
  }
}
