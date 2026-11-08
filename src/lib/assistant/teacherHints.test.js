import { describe, it, expect } from 'vitest'
import { questionHints, addressHint } from './turnHints.js'
import { isEnglishQuestion, grammarRefFor } from './grammarRef.js'
import { TEACHER_SET } from '../../../scripts/assistant-eval/teacher-set.js'

// Второй круг качества Луны (08.11.2026): что осталось после замера — правки, давшие эффект, и починки ложных
// срабатываний. Что пробовали и откатили — docs/assistant-eval/teacher-quality-2026-11-08-round2.md.

const hints = (question, opts = {}) => questionHints({ question, ...opts }).join('\n')

describe('указания учителя: второй круг', () => {
  it('«мало времени» — не вопрос о временах глагола', () => {
    expect(isEnglishQuestion('У меня мало времени сегодня')).toBe(false)
    expect(isEnglishQuestion('Какое время нужно в этом предложении?')).toBe(true)
  })

  it('«I\'m tired» в просьбе перевести — не усталость ученика', () => {
    expect(hints('Переведи на казахский «I\'m tired»')).not.toMatch(/Ученик устал или не хочет/)
    expect(hints('Не хочу сегодня заниматься')).toMatch(/Ученик устал или не хочет/)
  })

  it('проверка текста: число ошибок заранее не объявлять', () => {
    expect(hints('Проверь: Yesterday I have went to the cinema with my friends.')).toMatch(/заранее не объявляй/)
    expect(hints('Тексеріп берші: He go to school every day and he have a dog.', { answerLang: 'kk' })).toMatch(/қате санын алдын ала айтпа/)
  })

  it('правило: термины по уровню и проверочный без готового ответа (кейс 14)', () => {
    expect(hints('Объясни present perfect')).toMatch(/ученику ниже B1 каждый термин.*поясни простыми словами.*без готового ответа рядом/)
  })

  it('неизвестный раздел: путь — только из базы, иначе к кому обратиться (кейс 31)', () => {
    expect(hints('Где найти раздел «Марафоны»?')).toMatch(/точно не знаешь.*общем чате WhatsApp.*Служба поддержки/)
    expect(hints('«Марафондар» бөлімі қайда?', { answerLang: 'kk' })).toMatch(/Қолдау қызметі/)
    expect(hints('Где мои домашки?')).not.toMatch(/Служба поддержки/)
  })

  it('казахский ответ: разделы — по-казахски, перевод примеров — тоже', () => {
    expect(addressHint('kk')).toMatch(/Тәжірибе.*не «Практика»/)
    expect(hints('Passive voice қалай жасалады?', { answerLang: 'kk' })).toMatch(/мысалдардың аудармасы да қазақша/)
  })
})

describe('справка не повторяет ответы контрольных вопросов', () => {
  // По контрольным (holdout) мерим, помогает ли справка вообще; их готовый ответ в справке — подгонка (второй круг:
  // нашлись h07 «I'm used to getting up early», h17 «I was at home yesterday», h22 «I am interesting in …»).
  it('ни один ключ контрольного вопроса не стоит в справке дословно', () => {
    const holdout = TEACHER_SET.filter((q) => q.holdout)
    expect(holdout.length).toBeGreaterThan(0)
    for (const q of holdout) {
      const ref = grammarRefFor(q.q, { answerLang: q.lang }) || ''
      for (const k of q.keys) {
        const english = (k.match(/[A-Za-z][A-Za-z' ]{12,}[A-Za-z]/g) || [])
        for (const e of english) expect(ref, `${q.id}: «${e}»`).not.toContain(e)
      }
    }
  })
})
