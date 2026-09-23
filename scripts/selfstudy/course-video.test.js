import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..', '..')
const DIR = path.join(ROOT, 'public/course/b2')

// Видео-репортаж B2 — ролик ЮНИТА КУРСА (video/v<юнит>.mp4). Курс ссылается
// на ролики номерами юнитов учебника Navigate, а свои юниты переставил, и
// привязка по номеру из ссылки отдала 9 урокам из 12 чужой ролик: «Against
// the Law?» показывал Прекрасную эпоху, «Why We See Colour» — Флит-стрит.
// Упадёт, если уровень пересоберут со старой привязкой.
describe('B2: у урока ролик своего юнита', () => {
  const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'))
  const unitOf = new Map((index.lessons || []).map((l) => [l.n, l.unit]))
  const watch = fs
    .readdirSync(DIR)
    .filter((f) => /^steps-\d+\.json$/.test(f))
    .flatMap((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
      return data.steps.filter((s) => s.type === 'watch').map((s) => ({ lesson: data.n, title: s.title, src: s.src }))
    })

  it('роликов двенадцать — по одному на юнит', () => {
    expect(watch.map((w) => unitOf.get(w.lesson)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it.each(watch.map((w) => [w.title, w]))('%s', (_, w) => {
    expect(w.src).toBe(`/course/b2/video/v${unitOf.get(w.lesson)}.mp4`)
  })
})
