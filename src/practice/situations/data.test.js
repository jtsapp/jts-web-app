// Сторож данных раздела: JSON уровней собирает scripts/build-situations-data.js,
// и забыть его прогнать после правки материала легко — экран тогда молча
// показывает вчерашний текст или чёрный прямоугольник вместо видео.
//
// Поэтому проверяем не форму «как написал разработчик», а то, что уедет
// студенту: десять сценариев на уровень, существующие файлы медиа, все три
// языка на месте.

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'public/practice/situations')
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const LANGS = ['en', 'kz', 'ru']

function load(level) {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${level}.json`), 'utf8'))
}

// Собирает все трёхъязычные узлы сценария: и одиночные (title, intro, task), и
// списки (реплики, вопросы, слова…).
function mlNodes(item) {
  const out = []
  for (const key of ['title', 'intro', 'task']) if (item[key]) out.push([key, item[key]])
  if (item.scene) item.scene.lines.forEach((l, i) => out.push([`scene[${i}]`, l]))
  for (const key of ['mission', 'questions', 'react', 'critical', 'roleplay', 'followup', 'vocab', 'phrases', 'linkers']) {
    if (Array.isArray(item[key])) item[key].forEach((x, i) => out.push([`${key}[${i}]`, x]))
  }
  return out
}

describe.each(LEVELS)('уровень %s', (level) => {
  const data = load(level)

  it('десять сценариев с номерами 1..10', () => {
    expect(data.level).toBe(level)
    expect(data.items).toHaveLength(10)
    expect(data.items.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('видео и постер каждого сценария лежат на диске', () => {
    for (const item of data.items) {
      for (const key of ['video', 'poster']) {
        expect(item[key]).toMatch(/^\/practice\/situations\/media\//)
        const abs = path.join(DIR, item[key].replace('/practice/situations/', ''))
        expect(fs.existsSync(abs), `${level}[${item.id}].${key} → ${item[key]}`).toBe(true)
      }
    }
  })

  it('у каждого сценария есть задание и сцена или вопросы', () => {
    for (const item of data.items) {
      expect(item.task, `${level}[${item.id}]`).toBeTruthy()
      // Без сцены и без вопросов говорить студенту не по чему.
      expect(Boolean(item.scene || item.questions || item.react), `${level}[${item.id}]`).toBe(true)
    }
  })

  it('все три языка непусты везде', () => {
    for (const item of data.items) {
      for (const [where, node] of mlNodes(item)) {
        for (const lang of LANGS) {
          expect(typeof node[lang], `${level}[${item.id}].${where}.${lang}`).toBe('string')
          expect(node[lang].length, `${level}[${item.id}].${where}.${lang}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('промпт генерации видео в данные не попал', () => {
    // higgsfield весит больше диалога и студенту не нужен — экстрактор его режет.
    expect(JSON.stringify(data)).not.toContain('higgsfield')
  })

  it('реплики сцены размечены ролью', () => {
    for (const item of data.items) {
      if (!item.scene) continue
      expect(['dialogue', 'scenario']).toContain(item.scene.kind)
      for (const line of item.scene.lines) {
        expect(['scene', 'you', 'them']).toContain(line.who)
      }
    }
  })
})
