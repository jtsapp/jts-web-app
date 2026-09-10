// @vitest-environment jsdom
//
// «Урок пройден» у шэдоуинга. Правило нужно домашке: заданием выдают урок, а
// прогресс копится по отдельным фразам (sg_000, sg_001…). Порога «сколько
// достаточно» у раздела нет — верного и неверного в тренаже тоже нет,
// засчитывается сам факт записи, — поэтому единственная честная граница это
// все фразы урока.
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Серверный синк здесь не проверяем: он про своё хранилище кабинета.
vi.mock('../practiceSync.js', () => ({ pushModule: vi.fn() }))

const { SHADOWING_KEY } = await import('../practiceKeys.js')
const { markSegmentDone, isLessonDone, countLessonDone } = await import('./shadowingProgress.js')

describe('шэдоуинг: когда урок считается пройденным', () => {
  beforeEach(() => localStorage.removeItem(SHADOWING_KEY))

  it('урок пройден, только когда записаны все фразы', () => {
    markSegmentDone('sg_000')
    markSegmentDone('sg_001')
    expect(isLessonDone('sg', 3)).toBe(false)

    markSegmentDone('sg_002')
    expect(isLessonDone('sg', 3)).toBe(true)
  })

  // Урока без фраз не бывает, но 0 из 0 не должно читаться как «готово»:
  // так домашка закрылась бы на уроке, который ещё не загрузился.
  it('урок без фраз пройденным не считается', () => {
    expect(isLessonDone('sg', 0)).toBe(false)
  })

  // Префикс id — это id урока: фразы соседнего урока в счёт не идут.
  it('чужие фразы урок не закрывают', () => {
    markSegmentDone('v2_000')
    markSegmentDone('v2_001')

    expect(countLessonDone('sg')).toBe(0)
    expect(isLessonDone('sg', 2)).toBe(false)
  })

  // Записать фразу заново — не повод считать её второй.
  it('повторная запись фразы не двигает счёт', () => {
    markSegmentDone('sg_000')
    markSegmentDone('sg_000')

    expect(countLessonDone('sg')).toBe(1)
    expect(isLessonDone('sg', 2)).toBe(false)
  })
})
