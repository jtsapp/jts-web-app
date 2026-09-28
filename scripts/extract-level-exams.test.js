// Инварианты экстрактора финальных экзаменов: прототипы методиста исполняются,
// состав экзамена тот, на котором стоит порог, выгрузка на диске совпадает со
// свежей. Падение здесь = исходник пере-экспортировали или правили руками
// public/exam — чинить экстрактор/перегонять, а не замалчивать.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  EXPECTED,
  OUT_DIR,
  FIXTURES_DIR,
  sourceFiles,
  runPrototype,
  buildExam,
  extractLevel,
  flatQuestions,
  listeningAudioFile,
  I18N_SOURCE,
} from './extract-level-exams.js'

const SOURCES = sourceFiles()
const I18N = JSON.parse(fs.readFileSync(I18N_SOURCE, 'utf8'))

describe('extract-level-exams', () => {
  it('исходники на месте: A0, A1, A2, B2', () => {
    expect(SOURCES.map((s) => s.level)).toEqual(['a0', 'a1', 'a2', 'b2'])
  })

  for (const src of SOURCES) {
    describe(src.level, () => {
      const { exam, oracle } = extractLevel(src, I18N)

      it('50 вопросов по 20/10/10/10, id уникальны, порог 35', () => {
        expect(exam.total).toBe(50)
        expect(exam.pass).toBe(35)
        for (const s of exam.sections) {
          const n = flatQuestions({ sections: [s] }).length
          expect(n, s.key).toBe(EXPECTED[s.key])
        }
        const ids = flatQuestions(exam).map((q) => q.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      it('пропуски диалога связаны с вопросами по порядку', () => {
        for (const key of ['grammar', 'vocabulary']) {
          const d = exam.sections.find((s) => s.key === key).dialogue
          const gaps = d.lines.flatMap((l) => l.parts.filter((p) => typeof p !== 'string').map((p) => p.gap))
          expect(gaps).toEqual(d.gaps.map((_, i) => i))
        }
      })

      it('True/False — пара вариантов с ответом индексом, как у renderTF', () => {
        const tf = flatQuestions(exam).filter((q) => q.tf)
        expect(tf.length).toBe(8)
        for (const q of tf) {
          expect(q.options).toEqual(['True', 'False'])
          expect([0, 1]).toContain(q.answer)
        }
      })

      it('у записи аудирования имя — хэш стенограммы', () => {
        for (const p of exam.sections.find((s) => s.key === 'listening').passages) {
          expect(p.audio).toBe(listeningAudioFile(p.lines))
        }
      })

      it('советы на трёх языках', () => {
        for (const key of Object.keys(EXPECTED)) {
          expect(exam.tips[key].en).toBeTruthy()
          expect(exam.tips[key].ru).toBeTruthy()
          expect(exam.tips[key].kk).toBeTruthy()
        }
      })

      it('выгрузка и оракул на диске совпадают со свежими', () => {
        const disk = JSON.parse(fs.readFileSync(path.join(OUT_DIR, src.level, 'exam.json'), 'utf8'))
        expect(disk).toEqual(exam)
        const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `level-exam-oracle-${src.level}.json`), 'utf8'))
        expect(fixture).toEqual(oracle)
      })

      it('оракул видит и сдачу, и провал', () => {
        const passed = oracle.cases.filter((c) => c.expect.passed)
        expect(passed.length).toBeGreaterThan(1)
        expect(oracle.cases.length - passed.length).toBeGreaterThan(1)
        // Хотя бы одна сдача с проседающим навыком — иначе советы на экране
        // успеха ничем не проверены.
        expect(passed.some((c) => c.expect.weak.length > 0)).toBe(true)
      })
    })
  }

  it('нарушенный инвариант роняет выгрузку, а не пишет брак', () => {
    const src = SOURCES[0]
    const html = fs.readFileSync(src.file, 'utf8')
    // Выбить один вопрос грамматики — состав 20/10/10/10 обязан сломаться.
    const broken = html.replace(/\n\s*\{ id:"g1",[^\n]*\n/, '\n')
    expect(broken).not.toBe(html)
    expect(() => buildExam(src.level, broken, runPrototype(broken), I18N)).toThrow(/grammar: вопросов 19/)
  })

  it('без перевода совета выгрузка падает', () => {
    const src = SOURCES[0]
    const html = fs.readFileSync(src.file, 'utf8')
    const i18n = JSON.parse(JSON.stringify(I18N))
    i18n[src.level].reading.en = 'старая формулировка'
    expect(() => buildExam(src.level, html, runPrototype(html), i18n)).toThrow(/reading: нет перевода/)
  })
})
