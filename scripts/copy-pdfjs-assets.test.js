// Копия ресурсов pdf.js в public/pdfjs должна совпадать с установленным pdfjs-dist
// побайтно: декодер wasm другой версии pdf.js не поднимет, и страницы с JPEG 2000
// снова выйдут пустыми — без единой ошибки в тестах экрана.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FOLDERS, OUT, SOURCE, listFiles } from './copy-pdfjs-assets.js'

describe('copy-pdfjs-assets', () => {
  it.each(FOLDERS)('public/pdfjs/%s совпадает с pdfjs-dist (иначе: node scripts/copy-pdfjs-assets.js)', (folder) => {
    const source = path.join(SOURCE, folder)
    const copy = path.join(OUT, folder)
    expect(fs.existsSync(copy), `нет ${path.relative(process.cwd(), copy)}`).toBe(true)
    const files = listFiles(source)
    expect(files.length).toBeGreaterThan(0)
    expect(listFiles(copy)).toEqual(files)
    const changed = files.filter((file) => !fs.readFileSync(path.join(source, file)).equals(fs.readFileSync(path.join(copy, file))))
    expect(changed).toEqual([])
  })
})
