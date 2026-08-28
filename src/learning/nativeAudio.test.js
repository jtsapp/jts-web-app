// Записи уроков A0/A1 лежат в public/learning/audio/<level>/, а ссылку на них
// в задание ставит отдельный шаг (scripts/link-lesson-audio.js, он же внутри
// экстрактора). Шаг легко забыть: 25.08 записи A1 сгенерировали и пересобрали
// шаги КУРСА, а public/learning/a1.json — из него и рендерятся уроки A0/A1 —
// остался без ссылок, и 452 слова ещё три дня читал браузерный синтез. Тест
// ловит ровно это: mp3 на диске есть, а задание про него не знает.
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { STEP_LEVELS } from './nativeSteps.js'

const ROOT = path.join(import.meta.dirname, '..', '..')
const LEARNING = path.join(ROOT, 'public/learning')
const AUDIO = path.join(LEARNING, 'audio')

// Дубль sayAudioSlug из scripts/jts-self/say-audio.js: тест на то и тест,
// чтобы падать, если генератор имён разъедется с тем, что ждёт плеер.
const slug = (text) =>
  crypto
    .createHash('sha1')
    .update(String(text || '').replace(/\s+/g, ' ').trim().toLowerCase())
    .digest('hex')
    .slice(0, 12)

const levelsWithData = STEP_LEVELS.filter((l) => existsSync(path.join(LEARNING, `${l}.json`)))

describe('записи уроков A0/A1 привязаны к заданиям', () => {
  it.each(levelsWithData)('%s: у каждого слова с записью стоит ссылка', (level) => {
    const { lessons } = JSON.parse(readFileSync(path.join(LEARNING, `${level}.json`), 'utf8'))
    const silent = []
    for (const [code, lesson] of Object.entries(lessons)) {
      for (const task of lesson.tasks || []) {
        if (task.type !== 'cards') continue
        for (const w of task.words || []) {
          if (existsSync(path.join(AUDIO, level, `${slug(w.en)}.mp3`)) && !w.audio) silent.push(`${code}:${w.en}`)
        }
      }
    }
    expect(silent).toEqual([])
  })

  it.each(levelsWithData)('%s: ссылки ведут на существующие файлы', (level) => {
    const { lessons } = JSON.parse(readFileSync(path.join(LEARNING, `${level}.json`), 'utf8'))
    const broken = new Set()
    const check = (url) => {
      if (url && url.startsWith('/learning/') && !existsSync(path.join(ROOT, 'public', url))) broken.add(url)
    }
    for (const lesson of Object.values(lessons)) {
      for (const task of lesson.tasks || []) {
        check(task.track)
        check(task.sayTrack)
        for (const w of task.words || []) check(w.audio)
      }
    }
    expect([...broken]).toEqual([])
  })

  it.each(levelsWithData)('%s: связный материал с записью её и получает', (level) => {
    const { lessons } = JSON.parse(readFileSync(path.join(LEARNING, `${level}.json`), 'utf8'))
    const silent = []
    for (const [code, lesson] of Object.entries(lessons)) {
      for (const task of lesson.tasks || []) {
        if (task.type !== 'info' || !task.say) continue
        if (existsSync(path.join(AUDIO, level, `${slug(task.say)}.mp3`)) && !task.track) silent.push(`${code}:${task.say.slice(0, 40)}`)
      }
    }
    expect(silent).toEqual([])
  })

  it('в папке записей нет файлов, на которые никто не ссылается', () => {
    const orphans = []
    for (const level of levelsWithData) {
      const dir = path.join(AUDIO, level)
      if (!existsSync(dir)) continue
      const used = new Set()
      const { lessons } = JSON.parse(readFileSync(path.join(LEARNING, `${level}.json`), 'utf8'))
      for (const lesson of Object.values(lessons)) {
        for (const task of lesson.tasks || []) {
          for (const url of [task.track, task.sayTrack, ...(task.words || []).map((w) => w.audio)]) {
            if (url) used.add(path.basename(url))
          }
        }
      }
      // Тесты юнитов у A0/A1 берутся из public/course/<level>/steps-T<u>.json
      // и ссылаются на те же файлы — их считаем использованными тоже.
      const courseDir = path.join(ROOT, 'public/course', level)
      if (existsSync(courseDir)) {
        for (const f of readdirSync(courseDir).filter((n) => /^steps-.*\.json$/.test(n))) {
          for (const m of readFileSync(path.join(courseDir, f), 'utf8').matchAll(/\/learning\/audio\/[a-z0-9]+\/([0-9a-f]{12}\.mp3)/g)) {
            used.add(m[1])
          }
        }
      }
      for (const f of readdirSync(dir)) if (!used.has(f)) orphans.push(`${level}/${f}`)
    }
    expect(orphans).toEqual([])
  })
})
