// Сторож озвучки шагов курса (public/course/<level>/steps-*.json).
//
// 331 карточка слов, 624 фразы «послушайте и повторите», 473 образца
// «послушайте, затем запишите себя» и четыре шага «Аудирования» A0 были
// немыми: карточку, фразу и образец читал браузерный синтез (на Android без
// английского голоса — тишина), а вопрос на слух без записи засчитывался
// наугад. Записи сгенерированы
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

const CYRILLIC = /\p{Script=Cyrillic}/u
const LATIN = /\p{Script=Latin}/u

// Строки шагов record → { text, src }: текст из items, запись из itemAudio.
function recordLines(steps) {
  return steps.flatMap(({ s, where }) =>
    s.type === 'record' ? (s.items || []).map((it, i) => ({ where, line: { text: String(it ?? ''), src: s.itemAudio?.[i] || null } })) : [],
  )
}

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

  // Образцы «послушайте, затем запишите себя» были строками, и записи
  // прописать было некуда — их читал браузерный синтез. Теперь образец с
  // запись — в itemAudio (recordLine в CourseStepPlayer.jsx).
  // Старый плеер рендерит образец как есть: объект в items — белый экран у
  // вкладки, открытой до выкатки. Записи живут только в itemAudio.
  it('образцы record — строки, itemAudio — той же длины', () => {
    const bad = steps
      .filter(({ s }) => s.type === 'record')
      .filter(({ s }) => (s.items || []).some((it) => typeof it !== 'string') || (s.itemAudio && s.itemAudio.length !== s.items.length))
      .map(({ where }) => where)
    expect(bad).toEqual([])
  })

  it('у каждого английского образца record есть запись, и файл на месте', () => {
    const bad = recordLines(steps)
      .filter(({ line }) => !CYRILLIC.test(line.text))
      .filter(({ line }) => !line.src || !onDisk(line.src))
      .map(({ line, where }) => `${where} ${line.text}`)
    expect(bad).toEqual([])
  })

  // Задания по-русски (половина строк record у B1) — не образцы: английский
  // голос прочёл бы кириллицу мусором, и плеер показывает их текстом.
  it('задания по-русски в record английским голосом не озвучены', () => {
    const bad = recordLines(steps)
      .filter(({ line }) => CYRILLIC.test(line.text) && line.src)
      .map(({ line, where }) => `${where} ${line.text}`)
    expect(bad).toEqual([])
  })

  // Задание от образца отличает кириллица — и одна кириллическая «о» или «с»
  // в английской строке молча сделала бы её неозвучиваемым заданием, а оба
  // теста выше её бы пропустили. В живом тексте слова из двух алфавитов нет:
  // такое слово — буква-двойник.
  it('в строках record нет слов из смешанных алфавитов', () => {
    const bad = recordLines(steps)
      .filter(({ line }) => line.text.split(/\s+/).some((w) => LATIN.test(w) && CYRILLIC.test(w)))
      .map(({ line, where }) => `${where} ${line.text}`)
    expect(bad).toEqual([])
  })
})
