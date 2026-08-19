// Контракт контента Shadowing: индекс (lessons.js) и файлы уроков
// (public/shadowing/<id>.json) должны сходиться, а сегменты — укладываться в
// пределы, за которыми оценка произношения молча ломается.
//
// Проверяем именно тут, а не глазами в плеере: уроки добавляются пачками из
// подборки клиента, и разъехавшийся segCount или фраза на 40 секунд заметны
// только в момент записи — то есть у пользователя.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LESSONS, getLesson } from './lessons.js'

const DIR = path.join(process.cwd(), 'public', 'shadowing')

// Выше этого порога assessAgainstReference уходит в continuous-режим
// (REF_SINGLE_SHOT_MAX_SEC в src/lib/ielts/azure-pronunciation.js) — фразовая
// оценка на такое не рассчитана.
const MAX_SEGMENT_SEC = 25
// Референс режется перед отправкой в Azure (src/lib/ielts/azure-pronunciation.js),
// и всё, что не влезло, тихо не оценивается.
const MAX_SEGMENT_CHARS = 1000

const files = Object.fromEntries(
  LESSONS.map((l) => [l.id, path.join(DIR, `${l.id}.json`)]),
)

describe('индекс уроков Shadowing', () => {
  it('id уникальны', () => {
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getLesson отдаёт первый урок на битом id — диплинк не должен ронять экран', () => {
    expect(getLesson('нет-такого').id).toBe(LESSONS[0].id)
  })

  it.each(LESSONS)('$id: video — 11-символьный id YouTube', (lesson) => {
    expect(lesson.video).toMatch(/^[A-Za-z0-9_-]{11}$/)
  })

  it.each(LESSONS)('$id: есть файл с фразами', (lesson) => {
    expect(fs.existsSync(files[lesson.id])).toBe(true)
  })
})

describe('файлы уроков Shadowing', () => {
  const loaded = LESSONS.filter((l) => fs.existsSync(files[l.id])).map((l) => ({
    lesson: l,
    file: JSON.parse(fs.readFileSync(files[l.id], 'utf8')),
  }))

  it.each(loaded)('$lesson.id: метаданные совпадают с индексом', ({ lesson, file }) => {
    expect(file.id).toBe(lesson.id)
    expect(file.video).toBe(lesson.video)
    expect(file.segments.length).toBe(lesson.segCount)
  })

  it.each(loaded)('$lesson.id: тайминги фраз идут по возрастанию', ({ file }) => {
    let prevStart = -1
    for (const [start, end, text] of file.segments) {
      expect(typeof start).toBe('number')
      expect(typeof end).toBe('number')
      expect(end).toBeGreaterThan(start)
      expect(start).toBeGreaterThanOrEqual(prevStart)
      expect(String(text).trim().length).toBeGreaterThan(0)
      prevStart = start
    }
  })

  it.each(loaded)('$lesson.id: фразы влезают в лимиты оценки', ({ file }) => {
    for (const [start, end, text] of file.segments) {
      expect(end - start).toBeLessThanOrEqual(MAX_SEGMENT_SEC)
      expect(text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS)
    }
  })
})
