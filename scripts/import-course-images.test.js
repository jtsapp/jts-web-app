import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { readImageMaps, imageSlug, dataImage } = require('./import-course-images.js')

describe('import-course-images', () => {
  // A0 пишет ключ в кавычках, A1–B1 — без; скобка внутри строки карту не рвёт.
  it('карты IMG уроков по порядку, в обоих написаниях', () => {
    const html = `L1 = {"VOCAB": [], "IMG": {"like": "data:image/jpeg;base64,AA=="}}
      L2 = {VOCAB:[], IMG:{"go → went": "data:image/jpeg;base64,BB==", "a {b}": "x"}}`
    expect(readImageMaps(html)).toEqual([{ like: 'data:image/jpeg;base64,AA==' }, { 'go → went': 'data:image/jpeg;base64,BB==', 'a {b}': 'x' }])
  })

  // Код движка тоже содержит «IMG:{» — это не карта урока.
  it('не-JSON после IMG пропускается', () => {
    expect(readImageMaps('if(L.IMG){ IMGX[w]=L.IMG[w] } IMG:{"a": "b"}')).toEqual([{ a: 'b' }])
  })

  it('имя файла по слову', () => {
    expect(imageSlug('go → went')).toBe('go-went')
    expect(imageSlug("What's your name?")).toBe('what-s-your-name')
    expect(imageSlug('I’m…')).toBe('i-m')
  })

  it('внешняя ссылка вместо data: — не картинка', () => {
    expect(dataImage('images/too.webp')).toBeNull()
    expect(dataImage('data:image/jpeg;base64,AAEC').buf).toEqual(Buffer.from([0, 1, 2]))
  })
})
