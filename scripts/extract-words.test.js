// Тесты экстрактора «Слов в картинках». Гоняются по настоящему прототипу
// (data/jtswords.html) — если ре-экспорт макета сдвинет структуру, красным
// станет здесь, а не пустым экраном в проде.

import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SRC,
  MIN_SCENES,
  MIN_WORDS,
  PLACEMENTS,
  SECTION_IDS,
  buildOracle,
  checkScene,
  checkWord,
  makeRng,
  playableWords,
  readPrototype,
  sliceScript,
} from './extract-words.js'

const html = fs.readFileSync(DEFAULT_SRC, 'utf8')
const proto = readPrototype(html)
// Дальше по коду — только играбельные слова: у donkey и clownfish нет
// картинки, и прототип отбрасывает их сам (hasArt внутри poolFor).
const words = playableWords(proto)

describe('срез прототипа', () => {
  it('отрезает бутстрап, оставляя объявления', () => {
    const src = sliceScript(html)
    expect(src).toContain('function placeRound')
    expect(src).not.toContain('renderAudioAudit(); else renderHome()')
  })

  it('падает, если в скрипте нет ожидаемых констант', () => {
    expect(() => sliceScript('<script>const A=1;</script>')).toThrow(/не найден бутстрап/)
  })
})

describe('состав материала', () => {
  it('пять секций из прототипа', () => {
    expect(proto.SECTIONS.map((s) => s.id)).toEqual(SECTION_IDS)
  })

  it('слов и сцен не меньше ожидаемого', () => {
    expect(proto.ANIMALS.length).toBeGreaterThanOrEqual(MIN_WORDS)
    expect(proto.ENVS.length).toBeGreaterThanOrEqual(MIN_SCENES)
  })

  it('счётчики играбельных слов по секциям не поехали', () => {
    const counts = {}
    for (const w of words) counts[w.section] = (counts[w.section] || 0) + 1
    expect(counts).toEqual({ animals: 161, food: 175, clothes: 71, house: 95, body: 60 })
  })

  it('слова без картинки отброшены, и других таких не завелось', () => {
    const dropped = proto.ANIMALS.filter((w) => !words.includes(w)).map((w) => w.id)
    expect(dropped).toEqual(['donkey', 'clownfish'])
  })

  it('у каждого играбельного слова есть запись: без неё задание беззвучно', () => {
    const mute = words.filter((w) => !proto.HOSTED.audio[w.id]).map((w) => w.id)
    expect(mute).toEqual([])
  })

  it('у каждого слова есть перевод ru и kk', () => {
    for (const w of words) expect(() => checkWord(w)).not.toThrow()
  })

  it('у каждой сцены типизированные слоты и непустой пул', () => {
    const byScene = new Map()
    for (const w of words) {
      for (const s of [w.env, w.also]) {
        if (!s) continue
        if (!byScene.has(s)) byScene.set(s, [])
        byScene.get(s).push(w)
      }
    }
    for (const env of proto.ENVS) expect(() => checkScene(env, byScene)).not.toThrow()
  })

  it('типы размещения слов и слотов — из известного набора', () => {
    const types = new Set()
    for (const env of proto.ENVS) for (const s of env.slots) types.add(s[2])
    for (const w of words) types.add(w.pl)
    expect([...types].sort()).toEqual([...PLACEMENTS].sort())
  })

  it('cm есть только у мебели: по нему считается её размер на сцене', () => {
    const withCm = words.filter((w) => w.cm != null)
    expect(withCm.length).toBeGreaterThan(0)
    expect(new Set(withCm.map((w) => w.section))).toEqual(new Set(['house']))
  })
})

describe('оракул', () => {
  it('воспроизводим: два прогона дают одно и то же', () => {
    const envs = proto.ENVS.filter((e) => e.section === 'animals').slice(0, 3)
    const a = buildOracle(proto, envs)
    const b = buildOracle(proto, envs)
    expect(a).toEqual(b)
  })

  it('пул сцены = её домашние слова плюс гости', () => {
    const env = proto.ENVS.find((e) => e.id === 'farm')
    const oracle = buildOracle(proto, [env])
    const expected = words.filter((w) => w.env === 'farm' || w.also === 'farm').map((w) => w.id)
    expect([...oracle.scenes.farm.pool].sort()).toEqual([...expected].sort())
  })

  it('раунды покрывают весь пул без потерь и дублей', () => {
    const envs = proto.ENVS.filter((e) => e.section === 'food')
    const oracle = buildOracle(proto, envs)
    for (const [id, s] of Object.entries(oracle.scenes)) {
      const flat = s.rounds.flat()
      expect(new Set(flat).size, `сцена ${id}`).toBe(flat.length)
      expect([...flat].sort()).toEqual([...s.pool].sort())
    }
  })

  it('расставленные спрайты держатся внутри безопасного поля сцены', () => {
    const envs = proto.ENVS.filter((e) => e.section === 'animals')
    const oracle = buildOracle(proto, envs)
    for (const [id, s] of Object.entries(oracle.scenes)) {
      for (const p of s.placed) {
        expect(p.x - p.w / 2, `${id}/${p.id} слева`).toBeGreaterThanOrEqual(1)
        expect(p.x + p.w / 2, `${id}/${p.id} справа`).toBeLessThanOrEqual(99)
        expect(p.y, `${id}/${p.id} снизу`).toBeLessThanOrEqual(98.5)
      }
    }
  })
})

describe('makeRng', () => {
  it('от одного сида даёт одну и ту же последовательность', () => {
    const a = makeRng(7)
    const b = makeRng(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('разные сиды расходятся', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)())
  })

  it('держится в [0, 1)', () => {
    const rng = makeRng(42)
    for (let i = 0; i < 500; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
