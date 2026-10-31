import { describe, it, expect } from 'vitest'
import { isStudentSectionHidden, isStudentMenuItemHidden } from './config.js'

const hidden = ['tokens', 'prizes', 'notifications', 'contracts', 'my-teacher', 'teacher-wizard', 'teacher-pick', 'group']
describe('временное скрытие кабинетов ученика на проде', () => {
  it.each(hidden)('%s закрыт на проде и доступен для проверки на dev', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(true)
    expect(isStudentSectionHidden(screen, 'AI-TUTOR.JUSTTOSTUDY.KZ:443')).toBe(true)
    expect(isStudentSectionHidden(screen, 'dev-tutor.justtostudy.kz')).toBe(false)
    expect(isStudentSectionHidden(screen, 'localhost')).toBe(false)
  })
  it.each(['feedback', 'home', 'practice', 'lessons', 'homework', 'profile', 'ielts', 'sat', 'vocab'])('%s остаётся доступным', (screen) => {
    expect(isStudentSectionHidden(screen, 'ai-tutor.justtostudy.kz')).toBe(false)
  })
})

describe('меню ученика на проде', () => {
  it.each(['grammar-games', 'speed-reading'])('%s убран из меню, но экран открыт', (key) => {
    expect(isStudentMenuItemHidden(key, 'ai-tutor.justtostudy.kz')).toBe(true)
    expect(isStudentMenuItemHidden(key, 'dev-tutor.justtostudy.kz')).toBe(false)
    expect(isStudentSectionHidden(key, 'ai-tutor.justtostudy.kz')).toBe(false)
  })
  it.each(['my-teacher', 'tokens', 'prizes', 'notifications', 'contracts'])('%s скрыт и в меню', (key) => {
    expect(isStudentMenuItemHidden(key, 'ai-tutor.justtostudy.kz')).toBe(true)
  })
  it.each(['feedback', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'learning'])('%s остаётся в меню', (key) => {
    expect(isStudentMenuItemHidden(key, 'ai-tutor.justtostudy.kz')).toBe(false)
  })
})
