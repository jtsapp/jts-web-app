import { describe, it, expect } from 'vitest'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { tarSync, tarGzSync } = require('./tar.js')

// Читатель — только для теста: имя, тип, размер, данные и сверка контрольной суммы.
function readTar(buf) {
  const out = []
  let i = 0
  while (i + 512 <= buf.length) {
    const h = buf.subarray(i, i + 512)
    if (h.every((b) => b === 0)) break
    const name = h.toString('utf8', 0, 100).replace(/\0.*$/s, '')
    const size = parseInt(h.toString('ascii', 124, 135), 8)
    const type = h.toString('ascii', 156, 157)
    const stored = parseInt(h.toString('ascii', 148, 154), 8)
    let sum = 0
    for (let k = 0; k < 512; k++) sum += k >= 148 && k < 156 ? 32 : h[k]
    out.push({ name, size, type, sumOk: stored === sum, data: buf.subarray(i + 512, i + 512 + size) })
    i += 512 + Math.ceil(size / 512) * 512
  }
  return out
}

describe('tar', () => {
  it('каталоги и файлы — с верной суммой, размером и данными', () => {
    const entries = readTar(
      tarSync([
        { name: 'm/' },
        { name: 'm/conf/model.conf', data: Buffer.from('--beam=10.0\n') },
        { name: 'm/am/final.mdl', data: Buffer.alloc(1300, 7) },
      ]),
    )
    expect(entries.map((e) => [e.name, e.type, e.size])).toEqual([
      ['m/', '5', 0],
      ['m/conf/model.conf', '0', 12],
      ['m/am/final.mdl', '0', 1300],
    ])
    expect(entries.every((e) => e.sumOk)).toBe(true)
    expect(entries[1].data.toString()).toBe('--beam=10.0\n')
    expect(entries[2].data.every((b) => b === 7)).toBe(true)
  })

  it('конец архива — два нулевых блока, размер кратен 512', () => {
    const buf = tarSync([{ name: 'a', data: Buffer.from('x') }])
    expect(buf.length % 512).toBe(0)
    expect(buf.subarray(-1024).every((b) => b === 0)).toBe(true)
  })

  it('слишком длинное имя — ошибка, а не обрезанный путь', () => {
    expect(() => tarSync([{ name: 'x'.repeat(100), data: Buffer.from('') }])).toThrow(/длиннее 99/)
  })

  it('tar.gz разжимается в тот же tar и побайтно стабилен', () => {
    const entries = [{ name: 'a/' }, { name: 'a/b', data: Buffer.from('hello') }]
    expect(zlib.gunzipSync(tarGzSync(entries))).toEqual(tarSync(entries))
    expect(tarGzSync(entries)).toEqual(tarGzSync(entries))
  })
})
