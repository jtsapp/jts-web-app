// Сверка движка с оракулом: все ожидания в __fixtures__/oracle.json посчитали
// САМИ функции прототипа (scripts/extract-verbs.js). Красный тест здесь
// значит, что порт разъехался с исходником, и чинить надо порт.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildQueue,
  checkForm,
  checkWritten,
  cleanWord,
  clipKey,
  expectedForms,
  formClips,
  gapFor,
  lookupWord,
  nextEntry,
  pattern,
  progressKey,
  rhythmForms,
  scoreMark,
  scoreTargets,
  shuffled,
  summarize,
  trickyItems,
  variantsNote,
  visibleVerbs,
  writtenFields,
} from './engine.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const DATA = JSON.parse(readFileSync(path.join(ROOT, 'public', 'practice', 'verbs', 'verbs.json'), 'utf8'))
const ORACLE = JSON.parse(readFileSync(path.join(__dirname, '__fixtures__', 'oracle.json'), 'utf8'))
const BY = Object.fromEntries(DATA.verbs.map((v) => [v.v1, v]))
const SAVED = Object.fromEntries(ORACLE.saved.map((k) => [k, true]))

describe('оракул: глаголы', () => {
  it('схема, формы ритма и ключи записей совпадают с прототипом', () => {
    for (const o of ORACLE.verbs) {
      const v = BY[o.v1]
      expect(pattern(v), `${o.v1}: схема`).toBe(o.pattern)
      expect(rhythmForms(v), `${o.v1}: ритм`).toEqual(o.rhythm)
      expect([0, 1, 2].map((i) => clipKey(v, i)), `${o.v1}: записи`).toEqual(o.clips)
    }
  })

  it('checkForm на всех ответах совпадает с прототипом', () => {
    for (const c of ORACLE.checkForm) {
      expect(checkForm(c.value, BY[c.v1], c.index), `${c.v1} V${c.index + 1} «${c.value}»`).toBe(c.ok)
    }
  })

  it('scoreTargets на всех расшифровках совпадает с прототипом', () => {
    for (const s of ORACLE.score) {
      const got = scoreTargets(s.expected, s.text, { mode: s.mode, gap: s.gap, aliases: DATA.aliases })
      expect(got, `${s.mode}/${s.gap} ${s.expected.join(' ')} ← «${s.text}»`).toEqual(s.result)
    }
  })
})

describe('оракул: очереди и фильтры', () => {
  it('очередь сессии на всех сочетаниях режим × формы × уровень × набор', () => {
    for (const q of ORACLE.queues) {
      const { available, queue } = buildQueue(DATA, {
        mode: q.mode,
        set: q.set,
        saved: SAVED,
        level: q.level,
        formCount: q.formCount,
      })
      const where = `${q.mode}/${q.formCount}/${q.level}/${q.set}`
      expect(queue.map((it) => it.id), where).toEqual(q.ids)
      expect(available.length, where).toBe(q.available)
      expect(progressKey(q.mode, q.formCount, q.level), where).toBe(q.key)
    }
  })

  it('фильтры таблицы', () => {
    for (const f of ORACLE.visible) {
      const ids = visibleVerbs(DATA.verbs, f, SAVED).map((v) => v.v1)
      expect(ids, JSON.stringify(f)).toEqual(f.ids)
    }
  })

  it('поля письменных заданий', () => {
    const items = Object.fromEntries([...DATA.sentences, ...DATA.fixes].map((it) => [it.id, it]))
    for (const f of ORACLE.fields) {
      const item = f.mode === 'write' ? { id: f.id, verb: f.id } : items[f.id]
      const v = BY[item.verb]
      expect(writtenFields(f.mode, item, v, f.formCount), `${f.mode}/${f.formCount}/${f.id}`).toEqual(f.fields)
    }
  })
})

describe('инварианты материала', () => {
  it('верный ответ каждого предложения проходит собственную проверку', () => {
    for (const it of DATA.sentences) {
      const v = BY[it.verb]
      const fields = writtenFields('sentence', it, v, 3)
      const res = checkWritten(fields, fields.map((f) => f.answer), { mode: 'sentence', item: it, v })
      expect(res.hits, it.id).toBe(res.total)
    }
    for (const it of DATA.fixes) {
      const v = BY[it.verb]
      const fields = writtenFields('fix', it, v, 3)
      const res = checkWritten(fields, [it.answer], { mode: 'fix', item: it, v })
      expect(res.hits, it.id).toBe(1)
      // Ошибка в {скобках} не должна случайно оказаться верным ответом.
      const wrong = it.text.match(/\{([^}]+)\}/)[1]
      expect(checkWritten(fields, [wrong], { mode: 'fix', item: it, v }).hits, it.id).toBe(0)
    }
  })

  it('«показать ответ» не засчитывает ни одного поля', () => {
    const v = BY.go
    const fields = writtenFields('write', { id: 'go', verb: 'go' }, v, 3)
    const res = checkWritten(fields, ['went', 'gone'], { mode: 'write', item: { id: 'go' }, v, reveal: true })
    expect(res.hits).toBe(0)
    expect(res.total).toBe(2)
  })

  it('у каждой формы для таблицы есть запись', () => {
    const files = new Set(
      ORACLE.verbs.flatMap((o) => o.clips).concat(['were', 'gotten']),
    )
    for (const v of DATA.verbs) {
      for (let i = 0; i < 3; i++) {
        for (const key of formClips(v, i)) expect(files.has(key), `${v.v1} V${i + 1}: ${key}`).toBe(true)
      }
    }
    expect(formClips(BY.be, 1)).toEqual(['was', 'were'])
    expect(formClips(BY.get, 2)).toEqual(['got', 'gotten'])
    expect(formClips(BY.read, 2)).toEqual(['read-past'])
  })
})

describe('сессия', () => {
  it('пропуск: при двух формах всегда V2, при трёх — V2 и V3 по очереди', () => {
    expect([0, 1, 2, 3].map((i) => gapFor(i, 2))).toEqual([1, 1, 1, 1])
    expect([0, 1, 2, 3].map((i) => gapFor(i, 3))).toEqual([1, 2, 1, 2])
    expect(expectedForms(BY.go, { mode: 'gap', formCount: 3, gap: 2 })).toEqual(['gone'])
    expect(expectedForms(BY.go, { mode: 'repeat', formCount: 2, gap: 1 })).toEqual(['go', 'went'])
  })

  it('перемешивание не теряет и не дублирует задания, лимит режет очередь', () => {
    let seed = 7
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const { available, queue } = buildQueue(DATA, { mode: 'repeat', level: 'all', formCount: 3, limit: 10, shuffle: true, rng })
    expect(available).toHaveLength(90)
    expect(queue).toHaveLength(10)
    expect(new Set(queue.map((it) => it.id)).size).toBe(10)
    const all = shuffled(available, rng)
    expect(all.map((it) => it.id).sort()).toEqual(available.map((it) => it.id).sort())
  })

  it('запись результата копит попытки и лучший счёт', () => {
    const a = nextEntry(undefined, { kind: 'speech', score: { hits: 2, total: 3 } })
    expect(a).toEqual({ done: true, kind: 'speech', attempts: 1, hits: 2, total: 3, best: 2 })
    const b = nextEntry(a, { kind: 'speech', score: { hits: 1, total: 3 } })
    expect(b).toMatchObject({ attempts: 2, hits: 1, best: 2 })
    const c = nextEntry(b, { kind: 'manual' })
    expect(c).toMatchObject({ kind: 'manual', attempts: 3, hits: 1, best: 2 })
  })

  it('итог и «трудные»', () => {
    const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const scores = {
      a: { done: true, kind: 'speech', hits: 3, total: 3 },
      b: { done: true, kind: 'speech', hits: 1, total: 3 },
      c: { done: true, kind: 'manual' },
    }
    expect(summarize(queue, scores)).toEqual({ done: 3, count: 4, hits: 4, total: 6 })
    expect(trickyItems(queue, scores).map((it) => it.id)).toEqual(['b', 'c', 'd'])
    expect([scoreMark(scores.a), scoreMark(scores.c), scoreMark(undefined)]).toEqual(['3/3', '✓', '—'])
  })

  it('подсказка вариантов — только в ритме', () => {
    expect(variantsNote(BY.be, { mode: 'repeat', formCount: 2 })).toBe('V2 = was / were')
    expect(variantsNote(BY.get, { mode: 'repeat', formCount: 3 })).toBe('V3 = got / gotten')
    expect(variantsNote(BY.get, { mode: 'repeat', formCount: 2 })).toBe('')
    expect(variantsNote(BY.be, { mode: 'gap', formCount: 3 })).toBe('')
  })
})

describe('словарь тапа', () => {
  it('находит слово с пунктуацией и формы глаголов', () => {
    expect(cleanWord('yesterday.')).toBe('yesterday')
    expect(cleanWord('“Hello,')).toBe('hello')
    expect(cleanWord('don’t')).toBe("don't")
    expect(cleanWord('12')).toBe('')
    expect(lookupWord('Yesterday.', DATA.dict)).toMatchObject({ ru: 'вчера' })
    expect(lookupWord('went', DATA.dict)).toMatchObject({ lemma: 'go' })
    expect(lookupWord('gotten', DATA.dict)).toMatchObject({ lemma: 'get' })
    expect(lookupWord('constructor', DATA.dict)).toBeNull()
  })
})
