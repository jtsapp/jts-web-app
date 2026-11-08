// Активное задание для ступеней подсказки: ключ — только у практики и только у текущего задания.
import { describe, it, expect, afterEach } from 'vitest'
import { clearHintTask, hintTask, homeworkHintId, keyFor, parseHomeworkHintId, setHintTask } from './hintTask.js'

describe('hintTask', () => {
  afterEach(() => clearHintTask())

  it('практика: задание и ключ по запросу', () => {
    setHintTask({ id: 'course:L5:3', mode: 'practice', getKey: () => '  went  ' })
    expect(hintTask()).toEqual({ id: 'course:L5:3', mode: 'practice' })
    expect(keyFor('course:L5:3')).toBe('went')
    // Чужое задание ключа не получает.
    expect(keyFor('course:L5:4')).toBe(null)
  })

  it('домашка и тест ключа не хранят, даже если раздел его передал', () => {
    setHintTask({ id: homeworkHintId(9, 'e1'), mode: 'homework', getKey: () => 'went' })
    expect(hintTask()).toEqual({ id: 'hw:9:e1', mode: 'homework' })
    expect(keyFor('hw:9:e1')).toBe(null)
    setHintTask({ id: 'exam', mode: 'test', getKey: () => 'went' })
    expect(keyFor('exam')).toBe(null)
  })

  it('id задания домашки — туда и обратно; чужие id — null', () => {
    expect(parseHomeworkHintId(homeworkHintId(7, 12))).toEqual({ homeworkId: '7', exerciseId: '12' })
    expect(parseHomeworkHintId('course:L5:3')).toBe(null)
    expect(parseHomeworkHintId('hw:7')).toBe(null)
    expect(parseHomeworkHintId(null)).toBe(null)
  })

  it('уходящий экран не снимает пришедшее следом задание', () => {
    setHintTask({ id: 'a', mode: 'practice' })
    setHintTask({ id: 'b', mode: 'practice' })
    clearHintTask('a')
    expect(hintTask()?.id).toBe('b')
    clearHintTask('b')
    expect(hintTask()).toBe(null)
  })

  it('ключ длиннее 300 знаков режется; сбой раздела — без ключа', () => {
    setHintTask({ id: 'a', mode: 'practice', getKey: () => 'x'.repeat(400) })
    expect(keyFor('a')).toHaveLength(300)
    setHintTask({ id: 'a', mode: 'practice', getKey: () => { throw new Error('нет шага') } })
    expect(keyFor('a')).toBe(null)
  })
})
