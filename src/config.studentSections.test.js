import { describe, it, expect } from 'vitest'
import { isStudentSectionHidden } from './config.js'

const hidden = ['tokens', 'prizes', 'notifications', 'contracts', 'my-teacher', 'teacher-wizard', 'teacher-pick']
describe('временное скрытие кабинетов ученика на проде', () => {
  it.each(hidden)('%s закрыт на проде и доступен для проверки на dev', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(true)
    expect(isStudentSectionHidden(screen, 'AI-TUTOR.JUSTTOSTUDY.KZ:443')).toBe(true)
    expect(isStudentSectionHidden(screen, 'dev-tutor.justtostudy.kz')).toBe(false)
    expect(isStudentSectionHidden(screen, 'localhost')).toBe(false)
  })
  it.each(['feedback', 'home', 'practice', 'lessons', 'homework', 'profile', 'ielts', 'sat', 'vocab', 'group'])('%s остаётся доступным', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(false)
  })
})
