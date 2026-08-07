// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { isTeacher, roleFromToken } from './jwt.js'

/** Собирает JWT-подобную строку: подпись здесь не важна, важен payload. */
function tokenWith(payload) {
  const b64 = (value) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.signature`
}

describe('roleFromToken', () => {
  it('читает роль из payload', () => {
    expect(roleFromToken(tokenWith({ role: 'TEACHER', userId: 126 }))).toBe('TEACHER')
    expect(roleFromToken(tokenWith({ role: 'STUDENT' }))).toBe('STUDENT')
  })

  // Значение отдаётся как есть: на точное сравнение завязан canControl в
  // liveStatus.js. Регистронезависимость — забота isTeacher.
  it('отдаёт роль без изменений', () => {
    expect(roleFromToken(tokenWith({ role: 'teacher' }))).toBe('teacher')
  })

  // Токен приходит из localStorage: он может быть протухшим, обрезанным или
  // оставшимся от другой версии приложения. Разбор не должен ронять экран.
  it('возвращает null на мусоре, а не падает', () => {
    for (const bad of [null, undefined, '', 'не-jwt', 'a.b', 'a.b.c.d', 'a.!!!.c']) {
      expect(roleFromToken(bad)).toBeNull()
    }
  })

  it('возвращает null, если роли в payload нет', () => {
    expect(roleFromToken(tokenWith({ userId: 1 }))).toBeNull()
  })

  it('переживает кириллицу в payload', () => {
    expect(roleFromToken(tokenWith({ role: 'TEACHER', name: 'Айгуль' }))).toBe('TEACHER')
  })
})

describe('isTeacher', () => {
  it('верно отличает преподавателя от ученика', () => {
    expect(isTeacher(tokenWith({ role: 'TEACHER' }))).toBe(true)
    expect(isTeacher(tokenWith({ role: 'teacher' }))).toBe(true)
    expect(isTeacher(tokenWith({ role: 'STUDENT' }))).toBe(false)
    expect(isTeacher(null)).toBe(false)
  })
})
