import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { zipSync, unzipSync, crc32 } = require('./zip.js')

describe('zip — свой писатель архива', () => {
  it('CRC32 совпадает с эталоном', () => {
    // Проверочное значение из спецификации zlib на строке "123456789".
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926)
    expect(crc32(Buffer.from(''))).toBe(0)
  })

  it('записанное читается обратно байт в байт', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10])
    const zip = zipSync([
      { name: 'yellow/pages/001.webp', data: png },
      { name: 'yellow/index.json', data: '{"id":"yellow"}' },
    ])
    const back = unzipSync(zip)
    expect(Object.keys(back)).toEqual(['yellow/pages/001.webp', 'yellow/index.json'])
    expect(back['yellow/pages/001.webp'].equals(png)).toBe(true)
    expect(back['yellow/index.json'].toString('utf8')).toBe('{"id":"yellow"}')
  })

  it('обратные слэши превращаются в прямые', () => {
    // На Windows путь приходит с «\», а ZIP такой разделитель не понимает —
    // Java-распаковщик получил бы файл с именем «pages\001.webp».
    const back = unzipSync(zipSync([{ name: 'yellow\\pages\\001.webp', data: 'x' }]))
    expect(Object.keys(back)).toEqual(['yellow/pages/001.webp'])
  })

  it('архив одинакового содержимого побайтно одинаков', () => {
    // Штампа времени в записях нет намеренно: иначе один и тот же материал
    // каждый раз даёт новый файл, и «изменилось ли что-то» не проверить.
    const make = () => zipSync([{ name: 'a.txt', data: 'one' }, { name: 'b.txt', data: 'two' }])
    expect(make().equals(make())).toBe(true)
  })

  it('пустой архив остаётся валидным', () => {
    const zip = zipSync([])
    expect(zip.readUInt32LE(0)).toBe(0x06054b50) // сразу End of central directory
    expect(unzipSync(zip)).toEqual({})
  })

  it('архив распаковывается системным распаковщиком, а не только своим', () => {
    // Свой unzipSync мог бы «понимать» собственные ошибки, поэтому итог
    // проверяем чужим кодом — тем самым, каким его откроет бэкенд.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'))
    const file = path.join(dir, 'a.zip')
    fs.writeFileSync(file, zipSync([{ name: 'yellow/index.json', data: '{"ok":true}' }]))
    try {
      const out = execFileSync(
        'powershell',
        ['-NoProfile', '-Command',
         `Add-Type -A System.IO.Compression.FileSystem;` +
         `$z=[IO.Compression.ZipFile]::OpenRead('${file.replace(/\\/g, '\\\\')}');` +
         `$e=$z.Entries[0];$r=New-Object IO.StreamReader($e.Open());` +
         `Write-Output ($e.FullName + '|' + $r.ReadToEnd());$z.Dispose()`],
        { encoding: 'utf8' },
      ).trim()
      expect(out).toBe('yellow/index.json|{"ok":true}')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
