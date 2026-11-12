import { describe, it, expect, vi } from 'vitest'
import { JPEG_QUALITY, PHOTO_ACCEPT, PHOTO_MAX_BYTES, PHOTO_MAX_SIDE, checkPhoto, fitWithin, isHeic, shrinkPhoto } from './photo.js'

const file = (over = {}) => ({ name: 'a.jpg', type: 'image/jpeg', size: 1000, ...over })
const decoded = (width, height) => ({ source: 'SRC', width, height, close: vi.fn() })

describe('отказ до сжатия', () => {
  it('больше 10 МБ — too_big, ровно 10 МБ — можно', () => {
    expect(PHOTO_MAX_BYTES).toBe(10 * 1024 * 1024)
    expect(checkPhoto(file({ size: PHOTO_MAX_BYTES + 1 }))).toBe('too_big')
    expect(checkPhoto(file({ size: PHOTO_MAX_BYTES }))).toBeNull()
  })

  it('не фото и GIF — not_image (GIF в Birge нет вовсе)', () => {
    expect(checkPhoto(file({ name: 'a.gif', type: 'image/gif' }))).toBe('not_image')
    expect(checkPhoto(file({ name: 'a.pdf', type: 'application/pdf' }))).toBe('not_image')
    expect(checkPhoto(null)).toBe('not_image')
    expect(PHOTO_ACCEPT).not.toContain('gif')
  })

  it('JPEG, PNG, WEBP и HEIC — можно; HEIC с iPhone узнаётся и без типа', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) expect(checkPhoto(file({ type }))).toBeNull()
    expect(isHeic(file({ name: 'IMG_0001.HEIC', type: '' }))).toBe(true)
    expect(checkPhoto(file({ name: 'IMG_0001.HEIC', type: '' }))).toBeNull()
  })
})

describe('размер после сжатия', () => {
  it('длинная сторона — не больше 1600, пропорции те же', () => {
    expect(PHOTO_MAX_SIDE).toBe(1600)
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1000, 3000)).toEqual({ width: 533, height: 1600 })
  })

  it('маленькое не растягиваем', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 })
  })
})

describe('пережатие', () => {
  it('JPEG нужного размера с качеством 0.85; декодированное освобождается', async () => {
    const image = decoded(4000, 3000)
    const decode = vi.fn(async () => image)
    const encode = vi.fn(async () => 'BLOB')
    await expect(shrinkPhoto(file(), { decode, encode })).resolves.toEqual({ blob: 'BLOB', width: 1600, height: 1200 })
    expect(JPEG_QUALITY).toBe(0.85)
    expect(encode).toHaveBeenCalledWith('SRC', 1600, 1200, 0.85)
    expect(image.close).toHaveBeenCalled()
  })

  it('слишком большое не декодируется вовсе', async () => {
    const decode = vi.fn()
    await expect(shrinkPhoto(file({ size: PHOTO_MAX_BYTES + 1 }), { decode })).rejects.toMatchObject({ code: 'too_big' })
    expect(decode).not.toHaveBeenCalled()
  })

  it('HEIC, который браузер не открыл, — подсказка «сохраните как JPG»; прочее — decode', async () => {
    const decode = vi.fn(async () => {
      throw new Error('no decoder')
    })
    await expect(shrinkPhoto(file({ name: 'IMG.heic', type: 'image/heic' }), { decode })).rejects.toMatchObject({ code: 'heic' })
    await expect(shrinkPhoto(file(), { decode })).rejects.toMatchObject({ code: 'decode' })
  })

  it('не вышло закодировать — decode, картинка всё равно освобождается', async () => {
    const image = decoded(100, 100)
    const encode = vi.fn(async () => {
      throw new Error('toBlob null')
    })
    await expect(shrinkPhoto(file(), { decode: async () => image, encode })).rejects.toMatchObject({ code: 'decode' })
    expect(image.close).toHaveBeenCalled()
  })
})
