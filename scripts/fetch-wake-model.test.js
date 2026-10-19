import { describe, it, expect } from 'vitest'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { WAKE_MODELS, WAKE_MODEL_URL } from '../src/lib/assistant/wake/model.js'

const require = createRequire(import.meta.url)
const { MODEL, MODELS, zipToTarGz } = require('./fetch-wake-model.js')
const { zipSync } = require('./lib/zip.js')

const tarNames = (tar) => {
  const names = []
  for (let i = 0; i + 512 <= tar.length; ) {
    const h = tar.subarray(i, i + 512)
    if (h.every((b) => b === 0)) break
    const size = parseInt(h.toString('ascii', 124, 135), 8)
    names.push(h.toString('utf8', 0, 100).replace(/\0.*$/s, ''))
    i += 512 + Math.ceil(size / 512) * 512
  }
  return names
}

describe('модель позывного', () => {
  it('файл сборки и адрес на клиенте — один и тот же', () => {
    expect(`/${MODEL.out.replace(/^public\//, '')}`).toBe(WAKE_MODEL_URL)
  })

  it('каждая модель сборки — ровно та, что ждёт клиент (WAKE_MODELS)', () => {
    expect(MODELS.map((m) => m.key).sort()).toEqual(Object.keys(WAKE_MODELS).sort())
    for (const m of MODELS) expect(`/${m.out.replace(/^public\//, '')}`).toBe(WAKE_MODELS[m.key])
  })

  it('закреплён sha256 именно тех моделей, чей словарь проверен', () => {
    expect(MODEL.url).toBe('https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip')
    expect(MODEL.sha256).toBe('961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4')
    const kk = MODELS.find((m) => m.key === 'kk')
    expect(kk.url).toBe('https://alphacephei.com/vosk/models/vosk-model-small-kz-0.42.zip')
    expect(kk.sha256).toBe('b6d6bfe6195c866805bd18b1f56723e4d2ba4866e81df1481006d0c5704fda4f')
  })

  it('zip → tar.gz: те же файлы под той же папкой, по алфавиту', () => {
    const zip = zipSync([
      { name: 'vosk-model-small-ru-0.22/conf/model.conf', data: '--beam=10.0\n' },
      { name: 'vosk-model-small-ru-0.22/am/final.mdl', data: Buffer.alloc(700, 1) },
    ])
    expect(tarNames(zlib.gunzipSync(zipToTarGz(zip)))).toEqual([
      'vosk-model-small-ru-0.22/am/final.mdl',
      'vosk-model-small-ru-0.22/conf/model.conf',
    ])
  })

  it('не zip — ошибка, а не пустая модель', () => {
    expect(() => zipToTarGz(Buffer.from('not a zip'))).toThrow(/пустой/)
  })
})
