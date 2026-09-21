// Тесты экстрактора «Слушай и выбирай». Гоняются по настоящему прототипу
// (data/jtslistenchoose.html) — если ре-экспорт макета сдвинет структуру,
// красным станет здесь, а не пустым экраном в проде.

import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SRC,
  SIZES,
  buildOracle,
  checkData,
  mulberry32,
  pickScripts,
  readPrototype,
  scriptBodies,
} from './extract-listenchoose.js'

const html = fs.readFileSync(DEFAULT_SRC, 'utf8')
const proto = readPrototype(html)

describe('срез прототипа', () => {
  it('находит ровно пять скриптов и узнаёт каждый по содержимому', () => {
    expect(scriptBodies(html)).toHaveLength(5)
    const s = pickScripts(html)
    expect(s.data).toContain('const QUESTIONS')
    expect(s.media.startsWith('window.JTS_MEDIA=')).toBe(true)
    expect(s.player).toContain('class ListeningPlayer')
    expect(s.sampling).toContain('function sampleQuestions')
    expect(s.app).toContain('const STORE=')
  })

  it('падает, если структура прототипа сдвинулась', () => {
    expect(() => readPrototype(html.replace('class ListeningPlayer', 'class Broken'))).toThrow(/плеер/)
    expect(() => readPrototype(html.replace('function sampleQuestions', 'function drawQuestions'))).toThrow(/выборка/)
    expect(() => readPrototype('<html><script>1</script></html>')).toThrow(/структура прототипа изменилась/)
  })

  it('id сцены идёт в имя файла: слэши и точки не пропускаются', () => {
    const data = { scenes: proto.scenes, questions: proto.questions, levels: proto.levels }
    expect(() => checkData(data)).not.toThrow()
    for (const bad of ['../bus', 'a/b', 'Bus', 'bus.webp', '']) {
      const scenes = proto.scenes.map((s, i) => (i === 0 ? { ...s, id: bad } : s))
      expect(() => checkData({ ...data, scenes }), bad).toThrow(/id идёт в имя файла/)
    }
  })

  it('падает, если картинок стало меньше', () => {
    const broken = html.replace('"library-3-512":', '"library-3-999":')
    expect(() => readPrototype(broken)).toThrow(/library-3-512/)
  })
})

describe('состав материала', () => {
  it('13 сцен по 4 подписи фото и 150 заданий — по 50 на сложность', () => {
    expect(proto.scenes).toHaveLength(13)
    for (const s of proto.scenes) expect(s.options, s.id).toHaveLength(4)
    expect(proto.levels).toEqual(['easy', 'medium', 'hard'])
    expect(proto.questions).toHaveLength(150)
    for (const level of proto.levels) {
      expect(proto.questions.filter((q) => q.level === level), level).toHaveLength(50)
    }
  })

  it('у сцены art по два фото на сложность, у остальных по четыре', () => {
    for (const level of proto.levels) {
      expect(proto.questions.filter((q) => q.scene === 'art' && q.level === level)).toHaveLength(2)
      expect(proto.questions.filter((q) => q.scene === 'bus' && q.level === level)).toHaveLength(4)
    }
  })

  it('id уникальны, answer в 0–3, тексты и ключи не пустые, запись названа по хэшу текста', () => {
    expect(new Set(proto.questions.map((q) => q.id)).size).toBe(150)
    for (const q of proto.questions) {
      expect([0, 1, 2, 3], q.id).toContain(q.answer)
      expect(q.text.trim().length, q.id).toBeGreaterThan(10)
      expect(q.key.trim().length, q.id).toBeGreaterThan(5)
      expect(q.audio, q.id).toMatch(/^\/practice\/listenchoose\/audio\/[0-9a-f]{12}\.mp3$/)
    }
    expect(new Set(proto.questions.map((q) => q.audio)).size).toBe(150)
  })

  it('«главное» задание первых сцен без суффикса, остальные с номером фото', () => {
    const ids = new Set(proto.questions.map((q) => q.id))
    expect(ids.has('bus-easy')).toBe(true)
    expect(ids.has('bus-easy-1')).toBe(true)
    expect(ids.has('bus-easy-0')).toBe(false)
    expect(ids.has('rain-easy-0')).toBe(true)
  })
})

describe('картинки', () => {
  it('104 файла: 52 фото в двух размерах, каждое — настоящий WEBP', () => {
    const keys = Object.keys(proto.images)
    expect(keys).toHaveLength(104)
    for (const s of proto.scenes) {
      for (let i = 0; i < 4; i++) {
        for (const size of SIZES) {
          const buf = proto.images[`${s.id}-${i}-${size}`]
          expect(buf, `${s.id}-${i}-${size}`).toBeInstanceOf(Buffer)
          expect(buf.toString('latin1', 0, 4)).toBe('RIFF')
          expect(buf.toString('latin1', 8, 12)).toBe('WEBP')
        }
      }
    }
  })
})

describe('словарь интерфейса', () => {
  it('три языка (kz прототипа → kk), один и тот же набор из 65 ключей', () => {
    expect(Object.keys(proto.i18n).sort()).toEqual(['en', 'kk', 'ru'])
    const keys = Object.keys(proto.i18n.en).sort()
    expect(keys).toHaveLength(65)
    expect(Object.keys(proto.i18n.ru).sort()).toEqual(keys)
    expect(Object.keys(proto.i18n.kk).sort()).toEqual(keys)
    for (const lang of ['ru', 'en', 'kk']) {
      expect(proto.i18n[lang].subtitle).toBeTruthy()
      expect(proto.i18n[lang].helpBody).toBeTruthy()
    }
  })

  it('английские хвосты ru/kk, которые порт переводит, — ровно эти четыре ключа', () => {
    // footer у ru — фирменная строка, её английской и оставляем.
    const same = (lang) => Object.keys(proto.i18n[lang]).filter((k) => proto.i18n[lang][k] === proto.i18n.en[k]).sort()
    expect(same('ru')).toEqual(['footer', 'hide', 'next', 'show', 'wrong'])
    expect(same('kk')).toEqual(['hide', 'next', 'show', 'wrong'])
  })

  it('дополнения Object.assign (набор заданий) подхвачены', () => {
    for (const lang of ['ru', 'en', 'kk']) {
      expect(proto.i18n[lang].countLabel, lang).toBeTruthy()
      expect(proto.i18n[lang].startSet, lang).toBeTruthy()
    }
  })
})

describe('оракул', () => {
  const oracle = buildOracle(html)

  it('генератор случайных чисел воспроизводим — сверка с ним в тесте порта', () => {
    const rng = mulberry32(1)
    expect([rng(), rng(), rng(), rng(), rng()]).toEqual(oracle.rngProbe)
  })

  it('выборка: 3 сложности × 5 размеров × 3 «уже было» × 3 предыдущие сцены и плохие размеры', () => {
    const ok = oracle.sampling.filter((c) => c.result.queue)
    expect(ok).toHaveLength(3 * 5 * 3 * 3)
    for (const c of ok) {
      expect(c.result.queue, `${c.level}/${c.count}`).toHaveLength(c.count)
      expect(new Set(c.result.queue).size).toBe(c.count)
    }
    const bad = oracle.sampling.filter((c) => c.result.throws)
    expect(bad.map((c) => c.count).sort((a, b) => a - b)).toEqual([0, 1.5, 51])
    for (const c of bad) expect(c.result.throws).toBe('RangeError')
  })

  it('трассы плеера: что прототип считает «прослушанным»', () => {
    const by = Object.fromEntries(oracle.player.map((t) => [t.name, t.expect]))
    expect(Object.keys(by).sort()).toEqual(
      [
        'full-listen',
        'mute-midway',
        'pause-resume',
        'rate-125',
        'reset-after-wrong',
        'seek-back-replay',
        'seek-skip',
        'stutter-jump',
        'tail-ok',
        'tail-short',
      ].sort(),
    )
    // Дослушал целиком — засчитано.
    expect(by['full-listen'].heard).toBe(1)
    expect(by['full-listen'].ranges).toEqual([[0, 6]])
    // Перемотка вперёд диапазон не наращивает, недослушанное не считается.
    expect(by['seek-skip'].heard).toBe(0)
    expect(by['seek-skip'].coverage).toBe(2.5)
    // Вернулся назад и прослушал заново — склеилось в один диапазон.
    expect(by['seek-back-replay'].heard).toBe(1)
    expect(by['seek-back-replay'].ranges).toEqual([[0, 6]])
    expect(by['pause-resume'].heard).toBe(1)
    // Громкость 0 не наращивает диапазон.
    expect(by['mute-midway'].heard).toBe(0)
    expect(by['mute-midway'].coverage).toBe(3)
    expect(by['rate-125'].heard).toBe(1)
    // Скачок без события seeking — «быстрее реального времени», не засчитывается.
    expect(by['stutter-jump'].heard).toBe(0)
    expect(by['stutter-jump'].coverage).toBe(3)
    // Порог хвоста — 0.32 с.
    expect(by['tail-ok'].heard).toBe(1)
    expect(by['tail-short'].heard).toBe(0)
    // После ошибки прослушанное сбрасывается, и второй проход считается заново.
    expect(by['reset-after-wrong'].heard).toBe(2)
  })
})
