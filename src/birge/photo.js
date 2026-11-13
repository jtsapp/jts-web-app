// Фото на устройстве перед отправкой (спека 2026-11-11 §7): JPEG не больше 1600 px по длинной стороне, качество 0.85.
// Перерисовка через canvas заодно сбрасывает EXIF с GPS — иначе место съёмки увидели бы все в ленте. Больше 10 МБ
// до сжатия — отказ сразу: такой файл телефон и декодировать будет долго, и сервер его не примет.

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const PHOTO_MAX_SIDE = 1600
export const JPEG_QUALITY = 0.85
// accept для <input type=file>. GIF нет намеренно: GIF в Birge не делаем вовсе (решение владельца, спека §1).
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

const PHOTO_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/i

export class PhotoError extends Error {
  constructor(code) {
    super(code)
    this.name = 'PhotoError'
    // too_big | not_image | heic | decode
    this.code = code
  }
}

/** HEIC с iPhone: тип у файла бывает пустым — тогда узнаём по расширению. */
export function isHeic(file) {
  return /^image\/hei[cf]$/i.test(file?.type || '') || /\.(heic|heif)$/i.test(file?.name || '')
}

/** Отказ до сжатия: не фото — not_image, больше 10 МБ — too_big; иначе null. */
export function checkPhoto(file) {
  if (!file) return 'not_image'
  if (!PHOTO_TYPES.test(file.type || '') && !isHeic(file)) return 'not_image'
  if (file.size > PHOTO_MAX_BYTES) return 'too_big'
  return null
}

/** Размер после сжатия: длинная сторона не больше max, пропорции те же, маленькое не растягиваем. */
export function fitWithin(width, height, max = PHOTO_MAX_SIDE) {
  const long = Math.max(width, height)
  if (!long || long <= max) return { width, height }
  const k = max / long
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

function loadImage(file) {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode'))
    img.src = url
  }).finally(() => URL.revokeObjectURL(url))
}

// createImageBitmap поворачивает по EXIF-ориентации. Где он файл не открыл (HEIC в части Safari) — через <img>:
// Safari и iOS декодируют им HEIC, и ориентацию современные браузеры там тоже применяют.
async function decodeInBrowser(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() }
    } catch {
      // ниже — запасной путь через <img>
    }
  }
  const img = await loadImage(file)
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
}

async function encodeInBrowser(source, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // Белая подложка: прозрачный PNG в JPEG иначе получил бы чёрный фон.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('encode')
  return blob
}

/**
 * Фото → { blob, width, height } (JPEG). Ошибки — PhotoError: too_big и not_image — до декодирования, heic — HEIC в
 * браузере, который его не открывает (подсказка «сохраните как JPG»), decode — всё прочее.
 * decode / encode подменяются в тестах: в jsdom нет ни декодера картинок, ни canvas.
 */
export async function shrinkPhoto(file, { decode = decodeInBrowser, encode = encodeInBrowser } = {}) {
  const refused = checkPhoto(file)
  if (refused) throw new PhotoError(refused)
  let image
  try {
    image = await decode(file)
  } catch {
    throw new PhotoError(isHeic(file) ? 'heic' : 'decode')
  }
  try {
    const size = fitWithin(image.width, image.height)
    const blob = await encode(image.source, size.width, size.height, JPEG_QUALITY)
    return { blob, width: size.width, height: size.height }
  } catch {
    throw new PhotoError('decode')
  } finally {
    image.close?.()
  }
}
