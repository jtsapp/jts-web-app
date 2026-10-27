import { describe, it, expect } from 'vitest'
import { menuItems, mobileTabs, serviceItems, tabFor, showsTabBar } from './navSections.js'

const keys = (list) => list.map((i) => i.key)

describe('меню ученика', () => {
  it('обычный ученик: Главная и разделы курса, без экзаменов и наград', () => {
    expect(keys(menuItems())).toEqual(['home', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'feedback'])
  })

  it('«Мой учитель» — сразу под «Главной», когда на стенде есть подбор, и не у преподавателя', () => {
    expect(keys(menuItems({ myTeacher: true })).slice(0, 3)).toEqual(['home', 'my-teacher', 'learning'])
    expect(keys(menuItems({ myTeacher: true, ieltsAccount: true })).slice(0, 2)).toEqual(['home', 'my-teacher'])
    expect(keys(menuItems({ myTeacher: true, teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('экзамен появляется только при своей подписке', () => {
    expect(keys(menuItems({ exams: { ielts: true, sat: false } }))).toEqual([
      'home', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'ielts', 'vocab', 'feedback',
    ])
  })

  it('награды — только там, где они включены', () => {
    expect(keys(menuItems({ rewards: true })).slice(-3)).toEqual(['tokens', 'prizes', 'feedback'])
  })

  it('преподаватель: только Практика и Уроки', () => {
    expect(keys(menuItems({ teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('аккаунт IELTS — свой порядок', () => {
    expect(keys(menuItems({ ieltsAccount: true, exams: { ielts: true, sat: true } }))).toEqual([
      'home', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'ielts', 'sat', 'feedback',
    ])
  })
})

describe('нижняя панель телефона', () => {
  it('ученик: пять вкладок как в приложении', () => {
    expect(keys(mobileTabs(menuItems()))).toEqual(['home', 'practice', 'tutor', 'lessons', 'services'])
  })

  it('вкладка тьютора подписана как в меню — Speaking Buddy', () => {
    expect(mobileTabs(menuItems()).find((t) => t.key === 'tutor').label).toBe('nav.tutor')
  })

  it('преподаватель: Практика, Уроки и Сервисы', () => {
    expect(keys(mobileTabs(menuItems({ teacher: true })))).toEqual(['practice', 'lessons', 'services'])
  })

  it('Сервисы — разделы, которые не стали вкладками, в порядке меню', () => {
    expect(keys(serviceItems(menuItems({ exams: { ielts: true, sat: true } })))).toEqual([
      'learning', 'homework', 'ielts', 'sat', 'vocab', 'feedback',
    ])
    expect(serviceItems(menuItems({ teacher: true }))).toEqual([])
  })

  it('выбрана своя вкладка, а всё прочее живёт в «Сервисах»', () => {
    expect(tabFor('home')).toBe('home')
    expect(tabFor('practice')).toBe('practice')
    expect(tabFor('tutor')).toBe('tutor')
    expect(tabFor('lessons')).toBe('lessons')
    for (const a of ['learning', 'homework', 'ielts', 'sat', 'vocab', 'services', '', undefined]) {
      expect(tabFor(a)).toBe('services')
    }
  })
})

describe('где видна нижняя панель', () => {
  it('на корнях вкладок и экранах без своей «назад» — есть', () => {
    for (const s of ['home', 'practice', 'lessons', 'services', 'tutor-dashboard', 'kingdom', 'homework', 'vocab', 'ielts', 'sat', 'profile', 'my-teacher']) {
      expect(showsTabBar(s)).toBe(true)
    }
  })

  it('внутри разделов, как в приложении, — нет: там своя «назад»', () => {
    for (const s of ['reading', 'workbook', 'writing', 'situations', 'wordhunt', 'prepositions', 'numbers', 'ge-plan', 'course-catalog', 'teacher-wizard']) {
      expect(showsTabBar(s)).toBe(false)
    }
  })
})
