// Проверяем сам список платных секций и то, что ключи модулей в
// src/screens/IeltsPage.jsx (listening/reading/writing/speaking) - это ровно
// то, что ожидает sectionConsumesQuota. Разъедутся названия - экран молча
// перестанет запирать Speaking/Writing или начнёт запирать бесплатные
// Reading/Listening, и юнит-тест на самой функции это не поймает без явной
// сверки ключей, поэтому проверяем строки буквально, а не через константу.
import { describe, it, expect } from 'vitest'
import { sectionConsumesQuota } from './paidSections.js'

describe('sectionConsumesQuota', () => {
  it('speaking и writing - платные секции (внешняя проверка)', () => {
    expect(sectionConsumesQuota('speaking')).toBe(true)
    expect(sectionConsumesQuota('writing')).toBe(true)
  })

  it('reading и listening - бесплатные (локальный грейдер)', () => {
    expect(sectionConsumesQuota('reading')).toBe(false)
    expect(sectionConsumesQuota('listening')).toBe(false)
  })

  it('регистр не важен - ключи модулей могут прийти как есть', () => {
    expect(sectionConsumesQuota('SPEAKING')).toBe(true)
    expect(sectionConsumesQuota('Writing')).toBe(true)
  })

  it('неизвестная и отсутствующая секция квоту не тратят', () => {
    expect(sectionConsumesQuota('unknown')).toBe(false)
    expect(sectionConsumesQuota(undefined)).toBe(false)
  })
})
