import { describe, it, expect } from 'vitest'
import { menuItems as buildMenu, mobileTabs, serviceItems, tabFor, showsTabBar, NEW_ITEMS, NAV_ICONS } from './navSections.js'

// Явный ответ «абонемента пока нет»: обычное меню во время онбординга.
const menuItems = (options = {}) => buildMenu({ sections: { known: false, allowed: [] }, ...options })

const keys = (list) => list.map((i) => i.key)

describe('меню ученика', () => {
  it('обычный ученик: Главная и разделы курса, без экзаменов и наград', () => {
    expect(keys(menuItems())).toEqual([
      'home', 'group', 'practice', 'games', 'tutor', 'lessons', 'homework', 'vocab', 'learning', 'chess', 'birge', 'feedback', 'notifications', 'whats-new', 'contracts',
    ])
  })

  it('«Грамматики» и «Скорочтения» в меню нет, даже когда разделы открыты тарифом: вход — карточками «Практики»', () => {
    const sections = { known: true, allowed: ['practice', 'grammar', 'speed'] }
    expect(keys(menuItems({ sections }))).toContain('practice')
    expect(keys(menuItems({ sections }))).not.toContain('grammar-games')
    expect(keys(menuItems({ sections }))).not.toContain('speed-reading')
  })

  it('«Мой учитель» пунктом меню не стоит — это вкладка «Уроков» (задача 219)', () => {
    expect(keys(menuItems()).slice(0, 3)).toEqual(['home', 'group', 'practice'])
    expect(keys(menuItems({ ieltsAccount: true }))).not.toContain('my-teacher')
    expect(keys(menuItems({ teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('экзамен появляется только при своей подписке', () => {
    expect(keys(menuItems({ exams: { ielts: true, sat: false } }))).toEqual([
      'home', 'group', 'practice', 'games', 'tutor', 'lessons', 'homework', 'ielts', 'vocab', 'learning', 'chess', 'birge', 'feedback', 'notifications', 'whats-new', 'contracts',
    ])
  })

  it('награды — только там, где они включены', () => {
    expect(keys(menuItems({ rewards: true })).slice(-7)).toEqual(['tokens', 'prizes', 'birge', 'feedback', 'notifications', 'whats-new', 'contracts'])
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

  it('Birge — сразу перед Feedback, с меткой new и своим значком; у преподавателя его нет', () => {
    const list = keys(menuItems())
    expect(list.indexOf('birge')).toBe(list.indexOf('feedback') - 1)
    const ielts = keys(menuItems({ ieltsAccount: true }))
    expect(ielts.indexOf('birge')).toBe(ielts.indexOf('feedback') - 1)
    expect(NEW_ITEMS.has('birge')).toBe(true)
    expect(NAV_ICONS.birge).toBe('diversity_3')
    expect(keys(menuItems({ teacher: true }))).not.toContain('birge')
  })

  it('преподаватель: только Практика и Уроки', () => {
    expect(keys(menuItems({ teacher: true }))).toEqual(['practice', 'lessons'])
  })

  it('аккаунт IELTS — свой порядок', () => {
    expect(keys(menuItems({ ieltsAccount: true, exams: { ielts: true, sat: true } }))).toEqual([
      'home', 'group', 'practice', 'games', 'tutor', 'lessons', 'homework', 'vocab', 'learning', 'chess', 'ielts', 'sat', 'birge', 'feedback', 'notifications', 'whats-new', 'contracts',
    ])
  })

  // ТЗ v2.0, 4.2 (кейс 19): «Уроки» и «Домашняя работа» — только с преподавателем, и тогда, когда о тарифе ответа нет.
  describe('«Уроки» и «Домашняя работа» — по формату ученика', () => {
    const lessonItems = (list) => keys(list).filter((k) => k === 'lessons' || k === 'homework')

    it('демо без ответа о тарифе — пунктов нет, как у Self Study', () => {
      expect(lessonItems(menuItems({ demo: true }))).toEqual([])
      expect(lessonItems(menuItems({ demo: true, sections: { known: true, allowed: ['lessons', 'homework'] } }))).toEqual([])
    })

    it('Self Study — пунктов нет, даже если матрица их открыла', () => {
      const sections = { known: true, format: 'SELF', allowed: ['lessons', 'homework', 'practice'] }
      expect(lessonItems(menuItems({ sections }))).toEqual([])
    })

    it('с преподавателем — есть, и признак демо ещё не пришёл', () => {
      const sections = { known: true, format: 'GROUP', allowed: ['lessons', 'homework', 'practice'] }
      expect(lessonItems(menuItems({ sections, demo: false }))).toEqual(['lessons', 'homework'])
      expect(lessonItems(menuItems({ sections, demo: null }))).toEqual(['lessons', 'homework'])
    })

    it('не демо и тариф неизвестен — меню полное; пока признак демо не пришёл — ждём его', () => {
      expect(lessonItems(menuItems({ demo: false }))).toEqual(['lessons', 'homework'])
      expect(lessonItems(menuItems({ demo: null }))).toEqual([])
    })

    it('преподавателя правило не касается', () => {
      expect(keys(menuItems({ teacher: true, demo: true }))).toEqual(['practice', 'lessons'])
    })
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
      'group', 'games', 'homework', 'ielts', 'sat', 'vocab', 'learning', 'chess', 'birge', 'feedback', 'notifications', 'whats-new', 'contracts',
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
    for (const s of ['home', 'practice', 'lessons', 'services', 'tutor-dashboard', 'kingdom', 'homework', 'vocab', 'ielts', 'sat']) {
      expect(showsTabBar(s)).toBe(true)
    }
  })

  it('внутри разделов, как в приложении, — нет: там своя «назад»', () => {
    for (const s of ['reading', 'workbook', 'writing', 'situations', 'wordhunt', 'prepositions', 'pronunciation', 'tenses', 'punctuation', 'partsofspeech', 'literature', 'video-dictation', 'numbers', 'ge-plan', 'course-catalog', 'teacher-wizard', 'profile']) {
      expect(showsTabBar(s)).toBe(false)
    }
  })
})
