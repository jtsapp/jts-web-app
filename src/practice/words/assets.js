'use client'

// Пути к картинкам и записям раздела. Всё своё, из public/practice/words —
// чужой CDN прототипа выгружен скриптом scripts/fetch-words-assets.js.
// Отдельный модуль, потому что на пути ссылаются и каталог, и сцена, и
// результат: разъехавшийся путь тихо превратился бы в 404 на одном из экранов.

const BASE = '/practice/words'

/** Картинка слова: WebP 640px с прозрачным фоном, лежит поверх сцены. */
export function spriteUrl(wordId) {
  return `${BASE}/sprites/${wordId}.webp`
}

/** Фон сцены — WebP 1600px. */
export function sceneBgUrl(sceneId) {
  return `${BASE}/scenes/${sceneId}/bg.webp`
}

/** Обложка сцены для каталога — WebP 800px. */
export function sceneCoverUrl(sceneId) {
  return `${BASE}/scenes/${sceneId}/cover.webp`
}

/** Запись слова. Синтеза в разделе нет: слово звучит своим голосом или молчит. */
export function audioUrl(wordId) {
  return `${BASE}/audio/${wordId}.mp3`
}
