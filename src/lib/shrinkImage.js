// Уменьшение картинки перед тем, как положить её в localStorage.
//
// Фото с телефона — 4000×3000 и 4–8 МБ. Аватар профиля раньше сохранялся
// data-URL'ом как есть: в квоту сайта (≈5 МБ) такое не влезало, фото пропадало
// после перезагрузки без единого слова, а влезшее забивало место прогрессу
// практики и словаря. Кружок аватара меньше 100px — 256 по длинной стороне
// хватает и на ретине, а весит такое десятки килобайт.

/** Размер, вписанный в квадрат max по длинной стороне; маленькое не растягиваем. */
export function fitSize(width, height, max) {
  if (!(width > 0) || !(height > 0)) return null
  const k = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * k), height: Math.round(height * k) }
}

// createImageBitmap есть не везде (старый Safari) — там декодируем через <img>.
async function decode(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Файл картинки → уменьшенный data-URL (WebP, где браузер умеет, иначе JPEG).
 * Бросает, если файл не картинка или браузер не смог её прочитать.
 */
export async function shrinkImage(file, { max = 256, quality = 0.85 } = {}) {
  const src = await decode(file)
  const size = fitSize(src.width, src.height, max)
  if (!size) throw new Error('image has no size')
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.drawImage(src, 0, 0, size.width, size.height)
  src.close?.()
  // Safari старше 14 молча отдаёт PNG вместо WebP — тогда берём JPEG: PNG
  // фотографии весил бы в разы больше.
  const webp = canvas.toDataURL('image/webp', quality)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality)
}
