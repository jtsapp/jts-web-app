import { describe, it, expect } from 'vitest'
import { isStudentSectionHidden } from './config.js'

const hidden = ['tokens', 'prizes', 'notifications', 'birge', 'contracts', 'group', 'chess']
describe('временное скрытие кабинетов ученика на проде', () => {
  it.each(hidden)('%s закрыт на проде и доступен для проверки на dev', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(true)
    expect(isStudentSectionHidden(screen, 'AI-TUTOR.JUSTTOSTUDY.KZ:443')).toBe(true)
    expect(isStudentSectionHidden(screen, 'justtostudy-english.kz')).toBe(true)
    expect(isStudentSectionHidden(screen, 'www.justtostudy-english.kz')).toBe(true)
    expect(isStudentSectionHidden(screen, 'dev-tutor.justtostudy.kz')).toBe(false)
    expect(isStudentSectionHidden(screen, 'localhost')).toBe(false)
  })
  it.each(['feedback', 'home', 'practice', 'lessons', 'homework', 'profile', 'ielts', 'sat', 'vocab', 'my-teacher', 'teacher-wizard', 'teacher-pick'])('%s остаётся доступным', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(false)
  })
  it.each(['grammar-games', 'speed-reading'])('%s без пункта меню, но экран открыт: в него заходят из «Практики»', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(false)
    expect(isStudentSectionHidden(screen, 'dev-tutor.justtostudy.kz')).toBe(false)
  })
})
