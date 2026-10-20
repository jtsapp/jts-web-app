import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { WAKE_MODELS, WAKE_MODEL_URL } from '../src/lib/assistant/wake/model.js'

const require = createRequire(import.meta.url)
const { MODEL, MODELS, fetchModel, sha256, zipToTarGz } = require('./fetch-wake-model.js')
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

// Шаг с моделями в Dockerfile стоит после `COPY . .` и слоем не кэшируется;
// между сборками модели держит кэш-маунт, его скрипт получает через --cache.
describe('кэш моделей сборки (--cache)', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wake-'))
  const zip = zipSync([{ name: 'm/conf/model.conf', data: '--beam=10.0\n' }])
  const model = { key: 't', url: 'https://example.invalid/m.zip', sha256: sha256(zip), out: 'public/w/m.tar.gz' }
  afterEach(() => vi.unstubAllGlobals())

  it('модель из кэша не скачивается', async () => {
    const root = tmp()
    const cache = tmp()
    fs.writeFileSync(path.join(cache, 'm.tar.gz'), 'cached')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await fetchModel(model, { cacheDir: cache, root })
    expect(fetch).not.toHaveBeenCalled()
    expect(fs.readFileSync(path.join(root, model.out), 'utf8')).toBe('cached')
  })

  it('скачанная модель ложится и в кэш', async () => {
    const root = tmp()
    const cache = tmp()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(zip)))
    await fetchModel(model, { cacheDir: cache, root })
    expect(fs.readFileSync(path.join(cache, 'm.tar.gz'))).toEqual(fs.readFileSync(path.join(root, model.out)))
  })

  it('неудачная загрузка (--soft) в кэш не попадает — следующая сборка попробует снова', async () => {
    const root = tmp()
    const cache = tmp()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await fetchModel(model, { soft: true, cacheDir: cache, root })
    expect(fs.readdirSync(cache)).toEqual([])
    expect(fs.existsSync(path.join(root, model.out))).toBe(false)
  })
})
