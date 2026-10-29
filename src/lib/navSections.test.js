import { describe, it, expect } from 'vitest'
import { menuItems as buildMenu, mobileTabs, serviceItems, tabFor, showsTabBar } from './navSections.js'

// Явный ответ «абонемента пока нет»: обычное меню во время онбординга.
const menuItems = (options = {}) => buildMenu({ sections: { known: false, allowed: [] }, ...options })

const keys = (list) => list.map((i) => i.key)

describe('меню ученика', () => {
  it('обычный ученик: Главная и разделы курса, без экзаменов и наград', () => {
    expect(keys(menuItems())).toEqual([
      'home', 'group', 'learning', 'practice', 'grammar-games', 'speed-reading', 'tutor', 'lessons', 'homework', 'vocab', 'feedback', 'notifications', 'contracts',
    ])
  })

  it('«Мой учитель» — сразу под «Главной», когда на стенде есть подбор, и не у преподавателя', () => {
    expect(keys(menuItems({ myTeacher: true })).slice(0, 4)).toEqual(['home', 'my-teacher', 'group', 'learning'])
    expect(keys(menuItems({ myTeacher: true, ieltsAccount: true })).slice(0, 2)).toEqual(['home', 'my-teacher'])
    expect(keys(menuItems({ myTeacher: true, teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('экзамен появляется только при своей подписке', () => {
    expect(keys(menuItems({ exams: { ielts: true, sat: false } }))).toEqual([
      'home', 'group', 'learning', 'practice', 'grammar-games', 'speed-reading', 'tutor', 'lessons', 'homework', 'ielts', 'vocab', 'feedback', 'notifications', 'contracts',
    ])
  })

  it('награды — только там, где они включены', () => {
    expect(keys(menuItems({ rewards: true })).slice(-5)).toEqual(['tokens', 'prizes', 'feedback', 'notifications', 'contracts'])
  })

  it('закрытый по тарифу раздел в меню не показываем; до ответа сервера и при ошибке доступ ограничен', () => {
    expect(keys(menuItems({ sections: { known: true, allowed: [] } }))).not.toContain('group')
    expect(keys(menuItems({ sections: null }))).not.toContain('group')
    expect(keys(menuItems({ sections: { status: 'error' } }))).not.toContain('lessons')
  })

  it('оплаченный экзамен также требует разрешения матрицы', () => {
    const sections = { known: true, allowed: ['sat'] }
    expect(keys(menuItems({ sections, exams: { ielts: true, sat: true } }))).toContain('sat')
    expect(keys(menuItems({ sections, exams: { ielts: true, sat: true } }))).not.toContain('ielts')
    expect(keys(menuItems({ sections, exams: { sat: false } }))).not.toContain('sat')
  })

  it('преподаватель: только Практика и Уроки', () => {
    expect(keys(menuItems({ teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('аккаунт IELTS — свой порядок', () => {
    expect(keys(menuItems({ ieltsAccount: true, exams: { ielts: true, sat: true } }))).toEqual([
      'home', 'group', 'learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'ielts', 'sat', 'feedback', 'notifications', 'contracts',
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
      'group', 'learning', 'grammar-games', 'speed-reading', 'homework', 'ielts', 'sat', 'vocab', 'feedback', 'notifications', 'contracts',
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
    for (const s of ['reading', 'workbook', 'writing', 'situations', 'wordhunt', 'prepositions', 'pronunciation', 'numbers', 'ge-plan', 'course-catalog', 'teacher-wizard']) {
      expect(showsTabBar(s)).toBe(false)
    }
  })
})
