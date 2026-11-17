import { describe, it, expect } from 'vitest'
import { myTeacherTabState } from './useMyTeacherTab.js'

// Вкладка «Мой учитель» в «Уроках» (задача 219) видна по тем же правилам, по которым был виден пункт меню.
const open = { status: 'ready', known: false, allowed: [] }

describe('myTeacherTabState', () => {
  it('ученику с подбором на стенде — есть', () => {
    expect(myTeacherTabState({ sections: open, status: 'none' })).toBe('yes')
    expect(myTeacherTabState({ sections: { status: 'ready', known: true, allowed: ['teacher', 'lessons'] }, status: 'assigned' })).toBe('yes')
    // без абонемента экран объясняет, что делать, — вкладка нужна
    expect(myTeacherTabState({ sections: open, status: 'no_subscription' })).toBe('yes')
  })

  it('преподавателю, на прод-домене и без раздела тарифа — нет', () => {
    expect(myTeacherTabState({ teacher: true, sections: open, status: 'none' })).toBe('no')
    expect(myTeacherTabState({ hidden: true, sections: open, status: 'none' })).toBe('no')
    expect(myTeacherTabState({ sections: { status: 'ready', known: true, allowed: ['group', 'lessons'] }, status: 'none' })).toBe('no')
    expect(myTeacherTabState({ sections: { status: 'error', allowed: [] }, status: 'none' })).toBe('no')
  })

  it('подбора на стенде нет (404) — нет, как не было и пункта меню', () => {
    expect(myTeacherTabState({ sections: open, status: 'unavailable' })).toBe('no')
  })

  it('пока подбор или разделы тарифа не ответили — ждём', () => {
    expect(myTeacherTabState({ sections: open, status: 'loading' })).toBe('pending')
    expect(myTeacherTabState({ sections: open, status: 'idle' })).toBe('pending')
    expect(myTeacherTabState({ sections: { status: 'loading', allowed: [] }, status: 'none' })).toBe('pending')
  })
})
