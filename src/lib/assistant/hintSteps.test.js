// @vitest-environment jsdom
// Ступени подсказки (ТЗ v2.0, 7.2б): какая ступень, когда ключ, что в указании модели. Решает код, модель — только
// формулирует; поэтому правила режима держатся здесь, а не в промпте.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  ANSWER,
  MAX_STEP,
  hintInstruction,
  hintMark,
  hintState,
  hintStepFor,
  isHintAsk,
  isHintTurn,
  keyAllowed,
  nextHintStep,
  noteWrong,
  parseHintMark,
  recordHint,
  resetHints,
  stepNumber,
} from './hintSteps.js'

describe('пометка подсказки', () => {
  it('туда и обратно — все ступени, режимы и причины', () => {
    for (const step of [1, 2, 3, ANSWER]) {
      for (const mode of ['practice', 'homework']) {
        for (const reason of ['errors', 'idle', 'asked']) {
          const mark = hintMark({ step, mode, reason })
          expect(parseHintMark(mark)).toEqual({ step, mode, reason })
          expect(isHintTurn(mark)).toBe(true)
        }
      }
    }
    expect(hintMark({ step: 2, mode: 'homework', reason: 'errors' })).toBe('[подсказка: ступень 2; домашка; ошибка]')
  })

  it('обычный текст и подделки — не пометка', () => {
    expect(parseHintMark('подскажи')).toBe(null)
    expect(parseHintMark('[подсказка: ступень 4; практика; ошибка]')).toBe(null)
    expect(parseHintMark('[подсказка: ступень 1; тест; ошибка]')).toBe(null)
    expect(parseHintMark('ну [подсказка: ступень 1; практика; ошибка]')).toBe(null)
  })
})

describe('isHintAsk', () => {
  it('короткая просьба подсказки — да; вопрос со смыслом — нет', () => {
    for (const s of ['подскажи', 'Подскажи!', 'ещё подсказку', 'Луна, подскажи пожалуйста', 'дай подсказку', 'намекни', 'подскажи с этим заданием', 'көмектес', 'тағы кеңес бер', 'hint', 'give me a hint', 'another hint please']) {
      expect(isHintAsk(s), s).toBe(true)
    }
    for (const s of ['подскажи, где словарь', 'подскажи ответ на всё', 'почему неверно?', 'как открыть урок', 'hint: what does go mean', '']) {
      expect(isHintAsk(s), s).toBe(false)
    }
  })
})

describe('nextHintStep', () => {
  it('практика: 1 → 2 → 3; после 3-й — снова разбор, ответ только после ещё одной попытки', () => {
    expect(nextHintStep('practice', {})).toBe(1)
    expect(nextHintStep('practice', { step: 1 })).toBe(2)
    expect(nextHintStep('practice', { step: 2 })).toBe(3)
    expect(nextHintStep('practice', { step: 3 })).toBe(3)
    expect(nextHintStep('practice', { step: 3, wrongAfter3: true })).toBe(ANSWER)
    expect(nextHintStep('practice', { step: ANSWER })).toBe(ANSWER)
  })

  it('домашка: не больше двух ступеней, ответа нет никогда', () => {
    expect(MAX_STEP.homework).toBe(2)
    expect(nextHintStep('homework', {})).toBe(1)
    expect(nextHintStep('homework', { step: 1 })).toBe(2)
    expect(nextHintStep('homework', { step: 2 })).toBe(null)
    expect(nextHintStep('homework', { step: 2, wrongAfter3: true })).toBe(null)
  })

  it('тест и неизвестный режим — подсказок нет', () => {
    expect(nextHintStep('test', {})).toBe(null)
    expect(nextHintStep('exam', {})).toBe(null)
  })
})

describe('keyAllowed', () => {
  it('ключ — только практика, только 3-я ступень и ответ', () => {
    expect(keyAllowed('practice', 1)).toBe(false)
    expect(keyAllowed('practice', 2)).toBe(false)
    expect(keyAllowed('practice', 3)).toBe(true)
    expect(keyAllowed('practice', ANSWER)).toBe(true)
    for (const step of [1, 2, 3, ANSWER]) {
      expect(keyAllowed('homework', step)).toBe(false)
      expect(keyAllowed('test', step)).toBe(false)
    }
  })
})

describe('hintInstruction', () => {
  it('ступени 1–3: ответ не называть; ключ — только на 3-й в практике', () => {
    for (const step of [1, 2]) {
      const text = hintInstruction({ step, mode: 'practice', reason: 'asked' }, { key: 'went' })
      expect(text).toContain('Верный ответ не называй')
      expect(text).not.toContain('went')
    }
    const third = hintInstruction({ step: 3, mode: 'practice', reason: 'errors' }, { key: 'went' })
    expect(third).toContain('Ступень 3')
    expect(third).toContain('Верный ответ не называй')
    expect(third).toContain('Ключ задания — только для тебя')
    expect(third).toContain('«went»')
  })

  it('ответ: ключ можно назвать', () => {
    const text = hintInstruction({ step: ANSWER, mode: 'practice', reason: 'errors' }, { key: 'went' })
    expect(text).not.toContain('Верный ответ не называй')
    expect(text).toContain('Ключ задания (сайт отдал его для ответа): «went»')
  })

  it('домашка: ключ не попадает в указание, даже если его передали', () => {
    const text = hintInstruction({ step: 2, mode: 'homework', reason: 'errors' }, { key: 'went' })
    expect(text).not.toContain('went')
    expect(text).toContain('Это домашка')
    expect(text).toContain('и это последняя')
    expect(text).toContain('ответ не называй никогда')
  })

  it('3-я ступень без ключа — не угадывать', () => {
    expect(hintInstruction({ step: 3, mode: 'practice', reason: 'idle' })).toContain('Ключа задания у тебя нет')
  })
})

describe('учёт по заданию', () => {
  beforeEach(() => resetHints())

  it('ступень копится по заданию и переживает перезагрузку модуля (sessionStorage)', () => {
    expect(hintState('t1')).toEqual({})
    recordHint('t1', 1)
    recordHint('t2', 2)
    expect(hintState('t1').step).toBe(1)
    expect(hintStepFor('t2')).toBe(2)
    expect(JSON.parse(sessionStorage.getItem('jts_luna_hints')).t1.step).toBe(1)
  })

  it('неверный ответ: без подсказки — false; после 3-й — открывает ответ', () => {
    expect(noteWrong('t1')).toBe(false)
    recordHint('t1', 3)
    expect(noteWrong('t1')).toBe(true)
    expect(hintState('t1').wrongAfter3).toBe(true)
    expect(nextHintStep('practice', hintState('t1'))).toBe(ANSWER)
  })

  it('преподаватель видит число: «ответ» — это третья ступень', () => {
    expect(stepNumber(ANSWER)).toBe(3)
    recordHint('t1', ANSWER)
    expect(hintStepFor('t1')).toBe(3)
    expect(hintStepFor('нет')).toBe(0)
  })
})
