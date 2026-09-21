// Сторож озвучки шагов курса (public/course/<level>/steps-*.json).
//
// 331 карточка слов, 624 фразы «послушайте и повторите» и четыре шага
// «Аудирования» A0 были немыми: карточку и фразу читал
// браузерный синтез (на Android без английского голоса — тишина), а вопрос на
// слух без записи засчитывался наугад. Записи сгенерированы
// (scripts/voice-step-cards.js, scripts/voice-a0-silent-listening.js), но
// экстрактор при следующей выгрузке курса перепишет шаги — и если новая
// выгрузка снова принесёт немые места, этот тест скажет об этом раньше
// студента.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const COURSE = path.join(ROOT, 'public', 'course')
const levels = fs.readdirSync(COURSE).filter((d) => fs.statSync(path.join(COURSE, d)).isDirectory())

function stepsOf(level) {
  return fs
    .readdirSync(path.join(COURSE, level))
    .filter((f) => /^steps-.*\.json$/.test(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(COURSE, level, f), 'utf8')).steps.map((s, i) => ({ s, where: `${level}/${f}#${i}` })))
}

// Локальный адрес записи → файл в public/. Внешние адреса не проверяем.
const onDisk = (url) => !url || /^https?:/.test(url) || fs.existsSync(path.join(ROOT, 'public', decodeURI(url)))

describe.each(levels)('озвучка шагов %s', (level) => {
  const steps = stepsOf(level)

  it('у каждой карточки слова есть запись, и файл на месте', () => {
    const bad = steps.flatMap(({ s, where }) =>
      s.type === 'cards' ? (s.words || []).filter((w) => !w.audio || !onDisk(w.audio)).map((w) => `${where} ${w.en}`) : [],
    )
    expect(bad).toEqual([])
  })

  it('у каждого «послушайте и выберите» с вариантами есть запись', () => {
    const bad = steps
      .filter(({ s }) => s.type === 'listen' && (s.options || []).length && s.answer)
      .filter(({ s }) => !(s.src || s.track) || !onDisk(s.src))
      .map(({ where }) => where)
    expect(bad).toEqual([])
  })

  // «Послушайте и повторите»: 624 фразы A0–B1 читал браузерный синтез —
  // на слух чужой голос посреди урока, а на Android без английского голоса
  // тишина.
  it('у каждой фразы «послушайте и повторите» есть запись', () => {
    const bad = steps.flatMap(({ s, where }) =>
      s.type === 'phrases' ? (s.items || []).filter((it) => !it.src || !onDisk(it.src)).map((it) => `${where} ${it.text}`) : [],
    )
    expect(bad).toEqual([])
  })

  it('у слова «выберите, что слышите» есть запись', () => {
    const bad = steps
      .filter(({ s }) => s.type === 'choice' && s.say)
      .filter(({ s }) => !s.sayTrack || !onDisk(s.sayTrack))
      .map(({ s, where }) => `${where} ${s.say}`)
    expect(bad).toEqual([])
  })
})
