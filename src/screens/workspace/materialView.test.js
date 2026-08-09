import { describe, it, expect } from 'vitest'
import { materialView } from './materialView.js'

describe('что показать в центре урока', () => {
  // Регрессия: пока каталог не ответил, файл открывать нельзя. Бридж внутри
  // отрендеренного материала пишет свой прогресс по тому же ключу, что и ответы
  // урока из шагов, и мелькнувший iframe стирал работу ученика.
  it('пока не известно, урок это или файл — ни того, ни другого', () => {
    expect(materialView({ hasStep: false, fileUrl: 'https://f/a2/L01.html', catalogResolved: false }))
      .toBe('loading')
  })

  it('каталог ответил «это не урок» — открываем файл', () => {
    expect(materialView({ hasStep: false, fileUrl: 'https://f/own.pdf', catalogResolved: true }))
      .toBe('file')
  })

  it('урок разобран — показываем шаги, файл больше не нужен', () => {
    expect(materialView({ hasStep: true, fileUrl: 'https://f/a2/L01.html', catalogResolved: true }))
      .toBe('steps')
  })

  // Шаг есть, а ответа каталога ещё нет — так бывает при переключении раздела,
  // когда прошлый урок уже разобран. Шаги важнее: они и есть тот самый урок.
  it('шаг перевешивает незавершённую проверку каталога', () => {
    expect(materialView({ hasStep: true, fileUrl: 'https://f/a2/L01.html', catalogResolved: false }))
      .toBe('steps')
  })

  it('материала нет вовсе — ждать нечего, показываем пустой файл-слот', () => {
    expect(materialView({ hasStep: false, fileUrl: null, catalogResolved: false })).toBe('file')
  })
})
