import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Опора задания — то, на что ссылается его же формулировка: рамки предложений
// («I like ___ .») и слова, из которых их собирают. Лежит в step.html.
//
// Проверяем исходник текстом, а не рендером: плеер — компонент на полторы
// тысячи строк с контекстом и i18n, поднимать его ради одной строки дороже,
// чем убедиться, что ветка вообще обращается к step.html. Тот же приём уже
// используется в loginName.test.js.
const src = dirname(fileURLToPath(import.meta.url))
const player = readFileSync(join(src, 'CourseStepPlayer.jsx'), 'utf8').replace(/\r\n/g, '\n')

/** Тело ветки switch: от `case 'x':` до следующего `case`. */
function branch(name) {
  const start = player.indexOf(`case '${name}':`)
  if (start === -1) return ''
  const rest = player.slice(start + 1)
  const end = rest.search(/\n {4}case '/)
  return end === -1 ? rest : rest.slice(0, end)
}

describe('опора задания доходит до студента', () => {
  it('«напишите о себе» показывает слова, которые велено использовать', () => {
    // Ветка рисовала только пустое поле ввода. Студент читал «Используйте слова
    // ниже», а ниже не было ничего — и писал менеджеру «ничего нету и не видно».
    // Задело все 156 заданий этого типа: опора была в данных у каждого.
    expect(branch('write')).toContain('step.html')
  })

  it('каждое задание «напишите» несёт опору в данных', () => {
    // Вторая половина того же: если опора однажды пропадёт из данных, ветка
    // отрисует пустоту и снова молча.
    const levels = join(src, '..', '..', 'public', 'course')
    const missing = []
    for (const level of readdirSync(levels)) {
      const dir = join(levels, level)
      for (const file of readdirSync(dir).filter((f) => f.startsWith('steps-') && f.endsWith('.json'))) {
        const data = JSON.parse(readFileSync(join(dir, file), 'utf8'))
        for (const step of data.steps || []) {
          if (step.type === 'write' && !step.html) missing.push(`${level}/${file}: ${step.title}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})
