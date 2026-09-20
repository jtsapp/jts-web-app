import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_SIZES, LC_BASE, buildData, imagePath, imageSrcSet, loadListenChoose, optionsOf, resetListenChooseCache } from './data.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const PUBLIC = path.join(ROOT, 'public')
const JSON_DATA = JSON.parse(readFileSync(path.join(PUBLIC, 'practice', 'listenchoose', 'questions.json'), 'utf8'))

describe('buildData', () => {
  it('индексы по id задания и сцены, подписи фото сцены', () => {
    const data = buildData(JSON_DATA)
    expect(data.questions).toHaveLength(150)
    expect(data.scenes).toHaveLength(13)
    const q = data.byId['bus-easy']
    expect(q.scene).toBe('bus')
    expect(optionsOf(data, q)).toBe(data.sceneById.bus.options)
    expect(optionsOf(data, q)).toHaveLength(4)
  })

  it('чужая форма файла — понятная ошибка', () => {
    expect(() => buildData(null)).toThrow(/questions/)
    expect(() => buildData({ questions: [] })).toThrow(/scenes/)
  })
})

describe('адреса', () => {
  it('картинка: сцена, номер фото и ширина', () => {
    expect(imagePath('bus', 2)).toBe(`${LC_BASE}/img/bus-2-512.webp`)
    expect(imagePath('art', 0, 320)).toBe(`${LC_BASE}/img/art-0-320.webp`)
  })

  it('srcset показа и предзагрузки один: 320w и 512w, метка повтора — на обоих', () => {
    expect(imageSrcSet('bus', 1)).toBe(`${LC_BASE}/img/bus-1-320.webp 320w, ${LC_BASE}/img/bus-1-512.webp 512w`)
    expect(imageSrcSet('bus', 1, '?retry=7')).toBe(
      `${LC_BASE}/img/bus-1-320.webp?retry=7 320w, ${LC_BASE}/img/bus-1-512.webp?retry=7 512w`,
    )
    expect(IMAGE_SIZES).toContain('46vw')
  })
})

// Красный тест здесь — не «баг кода», а «забыли прогнать»: экстрактор
// (картинки) или озвучку (записи). Раздел без файла молчит или показывает
// пустую рамку, поэтому ловим это до продакшена.
describe('материал на диске', () => {
  const data = buildData(JSON_DATA)

  it('у каждого из 150 заданий есть запись', () => {
    const missing = data.questions.filter((q) => !existsSync(path.join(PUBLIC, q.audio.replace(/^\//, '')))).map((q) => q.id)
    expect(missing, `нет записей — node scripts/make-listenchoose-audio.js`).toEqual([])
  })

  it('каждая запись — настоящий mp3 (ID3 или кадр MPEG), а не пустышка или тело ошибки', () => {
    const bad = []
    for (const q of data.questions) {
      const buf = readFileSync(path.join(PUBLIC, q.audio.replace(/^\//, '')))
      const mpeg = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
      if (buf.length < 5000 || !(buf.toString('latin1', 0, 3) === 'ID3' || mpeg)) bad.push(`${q.id} (${buf.length} байт)`)
    }
    expect(bad, 'битые записи — node scripts/make-listenchoose-audio.js --force').toEqual([])
  })

  it('каждая картинка — настоящий WEBP', () => {
    const bad = []
    for (const s of data.scenes) {
      for (let i = 0; i < 4; i++) {
        for (const size of [320, 512]) {
          const p = imagePath(s.id, i, size)
          const buf = readFileSync(path.join(PUBLIC, p.replace(/^\//, '')))
          if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') bad.push(p)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('у каждой сцены все четыре фото в обоих размерах', () => {
    const missing = []
    for (const s of data.scenes) {
      for (let i = 0; i < 4; i++) {
        for (const size of [320, 512]) {
          const p = imagePath(s.id, i, size)
          if (!existsSync(path.join(PUBLIC, p.replace(/^\//, '')))) missing.push(p)
        }
      }
    }
    expect(missing, 'нет картинок — node scripts/extract-listenchoose.js').toEqual([])
  })
})

describe('loadListenChoose', () => {
  beforeEach(() => resetListenChooseCache())
  const ok = () => Promise.resolve({ ok: true, json: () => Promise.resolve(JSON_DATA) })

  it('грузит questions.json один раз на вкладку', async () => {
    const fetchImpl = vi.fn(ok)
    const [a, b] = await Promise.all([loadListenChoose(fetchImpl), loadListenChoose(fetchImpl)])
    expect(a).toBe(b)
    await loadListenChoose(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(`${LC_BASE}/questions.json`)
  })

  it('сбой не кэшируется: следующий вызов пробует снова', async () => {
    await expect(loadListenChoose(() => Promise.resolve({ ok: false, status: 503 }))).rejects.toThrow(/503/)
    await expect(loadListenChoose(() => Promise.reject(new Error('offline')))).rejects.toThrow(/offline/)
    const data = await loadListenChoose(ok)
    expect(data.questions).toHaveLength(150)
  })
})
