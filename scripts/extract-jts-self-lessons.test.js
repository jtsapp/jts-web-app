import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { extractCourse } from './extract-jts-self-lessons.js'

const stage = (name, rows) => `<section class="stage" data-stage="${name}">${rows}</section>`
const quiz = (n) => `<div class="task" data-task><div class="row"><span class="body">q${n}
  <div class="opts" data-correct="0"><button class="opt" data-val="0">yes</button><button class="opt" data-val="1">no</button></div>
</span></div></div>`
const stageOf = (name, count) => stage(name, Array.from({ length: count }, (_, i) => quiz(i)).join(''))

function tmpCourse() {
  const lessonHtml = stageOf('Warm-up', 4) + stageOf('Grammar', 4)
  const body = `
    <title>just to study — A0 · Course</title>
    <script>
    const UNITS=[["Lessons 1–3",["One"]]];
    const LESSONS={1:{"unit":1,"no":1,"title":"One","blurb":"","tracks":{},"html":${JSON.stringify(lessonHtml)}}};
    const REVIEWS={1:{unit:1,items:2,pass:1,title:"Unit Test · Unit 1",html:${JSON.stringify(stageOf('Unit Test', 3))}}};
    </script>`
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-')), 'a0.html')
  fs.writeFileSync(file, body)
  return file
}

// Урок со словарём (VOCAB), но без стадии, чью title можно узнать по
// /vocab|words/i — имитирует переименование стадии словаря в будущем курсе.
function tmpCourseVocabWithoutStage() {
  const lessonHtml = stageOf('Warm-up', 4) + stageOf('Grammar', 4)
  const body = `
    <title>just to study — A0 · Course</title>
    <script>
    const UNITS=[["Lessons 1–3",["One"]]];
    const LESSONS={1:{"unit":1,"no":1,"title":"One","blurb":"","tracks":{},
      "VOCAB":[["like","","нравится","ұнайды","to feel that something is good"]],
      "html":${JSON.stringify(lessonHtml)}}};
    </script>`
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-')), 'a0.html')
  fs.writeFileSync(file, body)
  return file
}

describe('extractCourse', () => {
  it('даёт узлы уроков, затем узел юнит-теста, и согласованный каталог', () => {
    const out = extractCourse(tmpCourse())

    expect(out.level).toBe('a0')
    expect(out.label).toBe('A0')
    expect(out.catalog.map((n) => n.code)).toEqual(['L01-1', 'L01-2', 'R01'])
    expect(out.catalog.map((n) => n.order)).toEqual([0, 1, 2])
    expect(out.catalog.at(-1).type).toBe('final')
    expect(Object.keys(out.lessons)).toEqual(['L01-1', 'L01-2', 'R01'])
  })

  it('taskCount каталога совпадает с числом заданий узла', () => {
    const out = extractCourse(tmpCourse())
    for (const entry of out.catalog) {
      expect(entry.taskCount).toBe(out.lessons[entry.code].tasks.length)
    }
  })

  // Находка ревью: раньше при отсутствии узла с "vocab"/"words" в заголовке
  // карточки словаря молча терялись — ни ошибки, ни строчки в логе. Если
  // стадию словаря переименуют в будущем курсе, это должно быть видно в CLI.
  it('предупреждает в CLI, если для карточек словаря не нашлось узла', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    extractCourse(tmpCourseVocabWithoutStage())

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('карточки словаря')
    expect(warn.mock.calls[0][0]).toContain('урока 1')

    warn.mockRestore()
  })
})
