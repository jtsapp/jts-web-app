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

  /**
   * Свой unzipSync мог бы «понимать» собственные ошибки, поэтому итог проверяем
   * ЧУЖИМ кодом — тем самым, каким архив откроет бэкенд.
   *
   * Распаковщик выбираем по тому, что есть на машине. Раньше здесь был жёстко
   * прописан `powershell`, и тест падал везде, кроме Windows: на macOS и в CI
   * он краснел «command not found» — то есть не проверял ничего и вдобавок не
   * давал завести стадию тестов в пайплайне.
   */
  const распаковщики = [
    // zipfile из стандартной библиотеки Python — строгая независимая реализация.
    { cmd: 'python3', args: (file) => ['-c',
      'import sys,zipfile\n' +
      'z=zipfile.ZipFile(sys.argv[1])\n' +
      'n=z.namelist()[0]\n' +
      'sys.stdout.write(n + "|" + z.read(n).decode())', file] },
    { cmd: 'unzip', args: (file) => ['-p', file, 'yellow/index.json'], prefix: 'yellow/index.json|' },
    { cmd: 'powershell', args: (file) => ['-NoProfile', '-Command',
      `Add-Type -A System.IO.Compression.FileSystem;` +
      `$z=[IO.Compression.ZipFile]::OpenRead('${file.replace(/\\/g, '\\\\')}');` +
      `$e=$z.Entries[0];$r=New-Object IO.StreamReader($e.Open());` +
      `Write-Output ($e.FullName + '|' + $r.ReadToEnd());$z.Dispose()`] },
  ]

  /** Первый распаковщик, который вообще есть на этой машине. */
  const доступный = распаковщики.find((u) => {
    try {
      execFileSync(process.platform === 'win32' ? 'where' : 'which', [u.cmd], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  })

  it('архив распаковывается системным распаковщиком, а не только своим', () => {
    // Молчаливого пропуска быть не должно: если чужого распаковщика нет вовсе,
    // проверка не состоялась, и знать об этом надо.
    expect(доступный).toBeTruthy()

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'))
    const file = path.join(dir, 'a.zip')
    fs.writeFileSync(file, zipSync([{ name: 'yellow/index.json', data: '{"ok":true}' }]))
    try {
      const out = execFileSync(доступный.cmd, доступный.args(file), { encoding: 'utf8' }).trim()
      expect((доступный.prefix ?? '') + out).toBe('yellow/index.json|{"ok":true}')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
