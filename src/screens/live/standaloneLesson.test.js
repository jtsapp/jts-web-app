import { describe, it, expect } from 'vitest'
import { isStandaloneLessonUrl } from './catalogLessonByUrl.js'
import { materialView } from '../workspace/materialView.js'

/**
 * Самодостаточный урок у ученика.
 *
 * Файл лежит рядом с каталожными (`course-catalog/standalone/…`) — намеренно:
 * только адреса под этим префиксом сервер подгружает сам и вшивает в них
 * bridge-скрипт, поэтому у ученика работают и сохранение ответов, и
 * зеркалирование экрана преподавателю. Но уроком каталога такой файл НЕ является:
 * он ни в одном уровне не состоит и на шаги не разбирается.
 *
 * Отсюда две вещи, которые проверяются здесь: его надо узнавать по адресу (чтобы
 * не ходить за деревом каталога впустую) и показывать файлом, а не шагами.
 */
describe('Пробный урок: узнаём по адресу', () => {
  it('файл из standalone — самодостаточный', () => {
    expect(isStandaloneLessonUrl('http://s3/dev/course-catalog/standalone/trial-1.html')).toBe(true)
  })

  /* Обычный урок каталога лежит под уровнем и в каталоге ЕСТЬ — за ним ходить
     надо, иначе он откроется файлом вместо шагов. */
  it('урок уровня — не самодостаточный', () => {
    expect(isStandaloneLessonUrl('http://s3/dev/course-catalog/a1/lessons/L01.html?mode=ONE_TO_ONE')).toBe(false)
  })

  it('материал преподавателя — не самодостаточный', () => {
    expect(isStandaloneLessonUrl('http://s3/dev/materials/own.html')).toBe(false)
    expect(isStandaloneLessonUrl('')).toBe(false)
    expect(isStandaloneLessonUrl(null)).toBe(false)
  })
})

describe('Пробный урок: что показываем в центре', () => {
  /* Шагов у него нет и не будет, поход в каталог пропущен — значит
     `catalogResolved` сразу true, и ученик видит файл, а не «загружаем». */
  it('показывается файлом сразу, без ожидания каталога', () => {
    const view = materialView({
      hasStep: false,
      fileUrl: 'http://s3/dev/course-catalog/standalone/trial-1.html',
      catalogResolved: true,
      allStepsHidden: false,
    })

    expect(view).toBe('file')
  })

  /* Для урока каталога правило прежнее: пока не знаем, урок это или файл, файл
     открывать нельзя — бридж успевал записать пустой поток поверх ответов. */
  it('урок каталога до ответа каталога ждёт, а не открывает файл', () => {
    const view = materialView({
      hasStep: false,
      fileUrl: 'http://s3/dev/course-catalog/a1/lessons/L01.html',
      catalogResolved: false,
      allStepsHidden: false,
    })

    expect(view).toBe('loading')
  })
})
