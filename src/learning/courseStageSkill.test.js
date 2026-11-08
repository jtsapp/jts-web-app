// Навык ответа урока курса по стадии: до 08.11.2026 ответы «Обучения» в навыки не шли вовсе (новый плеер не звал
// recordSkill), и «Сильные и слабые стороны» не видели главной программы.
import { describe, expect, it } from 'vitest'
import { stageSkill } from './CourseStepPlayer.jsx'

describe('stageSkill', () => {
  it('стадии курса → навыки; Разминка и Итоги — без навыка', () => {
    expect(['Слова', 'Грамматика', 'Практика', 'Чтение', 'Аудирование', 'Говорение'].map(stageSkill)).toEqual([
      'vocab', 'grammar', 'grammar', 'reading', 'listening', 'speaking',
    ])
    expect(stageSkill('Разминка')).toBeNull()
    expect(stageSkill('Итоги')).toBeNull()
    expect(stageSkill(undefined)).toBeNull()
  })
})
