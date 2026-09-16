import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { FIXES, FIX_ROOT, clipFixer, clipFixFiles, clipFixTexts } = require('./clip-fixes.js')
const { sayAudioFile } = require('../jts-self/say-audio.js')

const ROOT = path.join(import.meta.dirname, '..', '..')

// Мини-банк: урок 12 и тест юнита 104, который везёт клип урока под ключом
// l12_<ключ> — как это делает движок курса.
const BANK = {
  '12:f3': '/course/a0/audio/aaaaaaaaaaa3.mp3',
  '12:f5': '/course/a0/audio/aaaaaaaaaaa5.mp3',
  '12:f7': '/course/a0/audio/aaaaaaaaaaa7.mp3',
  '12:m12': '/course/a0/audio/bbbbbbbbbb12.mp3',
  '104:l12_f7': '/course/a0/audio/aaaaaaaaaaa7.mp3',
  '12:z1': '/course/a0/audio/cccccccccc01.mp3',
}
const TABLE = {
  12: {
    f3: { was: 'aaaaaaaaaaa3', use: 'f5' },
    f5: { was: 'aaaaaaaaaaa5', use: 'f7' },
    f7: { was: 'aaaaaaaaaaa7', file: 'a0/12-f9.mp3' },
    m12: { was: 'bbbbbbbbbb12', say: 'July' },
  },
}
const raw = (lesson, key) => BANK[`${lesson}:${key}`] || null
const media = {
  fileUrl: (rel) => (rel === 'a0/12-f9.mp3' ? '/course/a0/audio/ffffffffffff.mp3' : null),
  sayUrl: (text) => (text === 'July' ? '/learning/audio/a0/july.mp3' : null),
}
const fixer = (table = TABLE, m = media) => clipFixer('a0', raw, m, table)

describe('clipFixer', () => {
  it('без правки отдаёт привязку курса', () => {
    expect(fixer().clip('12', 'z1')).toBe(BANK['12:z1'])
  })

  // Правки цепочкой (f3→f5, f5→f7) не должны схлопываться: f3 обязан получить
  // запись f5 из файла курса, а не то, во что превратился сам f5.
  it('use берёт клип из файла курса, не проходя по цепочке правок', () => {
    const f = fixer()
    expect(f.clip('12', 'f3')).toBe(BANK['12:f5'])
    expect(f.clip('12', 'f5')).toBe(BANK['12:f7'])
  })

  it('file и say подставляют вырезку и озвучку', () => {
    const f = fixer()
    expect(f.clip('12', 'f7')).toBe('/course/a0/audio/ffffffffffff.mp3')
    expect(f.clip('12', 'm12')).toBe('/learning/audio/a0/july.mp3')
  })

  it('тест юнита получает ту же правку, что и урок', () => {
    const f = fixer()
    expect(f.clip('104', 'l12_f7')).toBe('/course/a0/audio/ffffffffffff.mp3')
  })

  it('разошлась с файлом курса — привязка курса остаётся, отчёт это называет', () => {
    const f = fixer({ 12: { f3: { was: 'deadbeefdead', use: 'f5' } } })
    expect(f.clip('12', 'f3')).toBe(BANK['12:f3'])
    const r = f.report()
    expect(r.applied).toEqual([])
    expect(r.stale).toEqual(['12:f3: курс ставит aaaaaaaaaaa3, правка ждёт deadbeefdead'])
  })

  it('отчёт знает, какие правки не встретились вовсе', () => {
    const f = fixer()
    f.clip('12', 'f3')
    f.clip('104', 'l12_f7')
    expect(f.report()).toEqual({ applied: ['12:f3', '12:f7'], stale: [], unused: ['12:f5', '12:m12'] })
  })

  it('нет озвучки — ошибка с командой, которая её сделает', () => {
    const f = fixer(TABLE, { ...media, sayUrl: () => null })
    expect(() => f.clip('12', 'm12')).toThrow(/make-lesson-audio\.js --level a0/)
  })

  it('use на клип, которого в уроке нет, — ошибка, а не тишина', () => {
    const f = fixer({ 12: { z1: { was: 'cccccccccc01', use: 'nope' } } })
    expect(() => f.clip('12', 'z1')).toThrow(/нет клипа nope/)
  })
})

describe('таблица правок', () => {
  const entries = Object.entries(FIXES).flatMap(([level, lessons]) =>
    Object.entries(lessons).flatMap(([lesson, keys]) => Object.entries(keys).map(([key, fix]) => ({ level, id: `${level}/${lesson}:${key}`, fix }))),
  )

  it.each(entries.map((e) => [e.id, e]))('%s: одна замена и хэш текущего клипа', (_, { fix }) => {
    expect(fix.was).toMatch(/^[0-9a-f]{12}$/)
    expect(['use', 'file', 'say'].filter((k) => fix[k])).toHaveLength(1)
  })

  it('вырезки лежат в data/course-clips', () => {
    const missing = Object.keys(FIXES)
      .flatMap((level) => clipFixFiles(level))
      .filter((rel) => !fs.existsSync(path.join(FIX_ROOT, rel)))
    expect(missing).toEqual([])
  })

  it('озвучка текстов правок сгенерирована', () => {
    const missing = Object.keys(FIXES).flatMap((level) =>
      clipFixTexts(level).filter((text) => !fs.existsSync(path.join(ROOT, 'public/learning/audio', level, sayAudioFile(text)))),
    )
    expect(missing).toEqual([])
  })
})

// Шаги A0 пересобраны с правками: задание слышит свою фразу, а не соседнюю.
// Упадёт, если уровень пересоберут без таблицы правок или файл курса сменится.
// Жалоба пришла на урок 12 (Save the date, on/in с датами): Женский день
// играл высадку на Луну, Новый год — Женский день и так до конца упражнения.
describe('A0: задания слышат свою запись', () => {
  const steps = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, `public/course/a0/steps-${n}.json`), 'utf8')).steps
  const course = (hash) => `/course/a0/audio/${hash}.mp3`
  const cut = (rel) => course(crypto.createHash('sha1').update(fs.readFileSync(path.join(FIX_ROOT, rel))).digest('hex').slice(0, 12))
  const said = (text) => `/learning/audio/a0/${sayAudioFile(text)}`

  const one = (list, pick, what) => {
    const found = list.filter(pick)
    if (found.length !== 1) throw new Error(`${what}: найдено ${found.length}, ждали одно`)
    return found[0]
  }
  const listen = (answer) => (list) => one(list, (s) => s.type === 'listen' && s.answer === answer, answer).src
  const asked = (prompt) => (list) => one(list, (s) => s.prompt === prompt, prompt).src
  const gap = (before, after) => (list) => one(list, (s) => s.type === 'gap' && s.before === before && s.after === after, `${before} ___ ${after}`).src
  const card = (en) => (list) => one(list.flatMap((s) => (s.type === 'cards' ? s.words : [])), (w) => w.en === en, en).audio

  it.each([
    ['11', '7:33', listen('7:33'), said('seven thirty-three')],
    ['12', 'July', card('July'), said('July')],
    ['12', 'twelfth', gap('the', 'of the month'), said('twelfth')],
    ['12', 'Women’s Day', asked('Когда Женский день?'), course('cab8548991f4')],
    ['12', 'New Year', asked('Когда Новый год?'), course('6a688207182e')],
    ['12', 'Mandela', gap('Nelson Mandela died on', 'December 2013.'), cut('a0/12-f9.mp3')],
    ['12', '4th November', listen('4th November'), course('92df1c0b08d1')],
    ['12', '12th July 2009', listen('12th July 2009'), course('988b7b445f1d')],
    ['12', '13th May', gap('', 'May'), said('the thirteenth of May')],
    ['T4', '13th May', gap('', 'May'), said('the thirteenth of May')],
    ['2', 'Nice to meet you', gap('Nice to', 'you, Havva.'), cut('a0/2-d14_1.mp3')],
    ['8', 'negative', asked('Утверждение или отрицание?'), course('5146e33fedf9')],
    ['8', 'theatre', gap('There', 'a theatre.'), said("There isn't a theatre.")],
    ['14', 'Christina', listen("Christina doesn't live in New York."), course('4c9cfacf86d6')],
    ['14', 'Essex Road', gap('The trains', 'go to Essex Road.'), course('2877fbd51ddf')],
    ['14', 'Pedro', listen("Pedro doesn't go to work by bus."), course('54a3033fe92b')],
    ['T5', 'Pedro', listen("Pedro doesn't go to work by bus."), course('54a3033fe92b')],
    ['15', 'family dinner', listen('When does your family eat dinner?'), course('e03558b3e6cd')],
    ['18', 'reading', gap('I like', 'and listening to music at home.'), cut('a0/18-h2.mp3')],
    ['19', 'orange juice', card('orange juice'), said('orange juice')],
    ['19', 'water', card('water'), course('2d4011137657')],
    ['19', 'the menu', asked('Что официант предлагает сначала?'), cut('a0/19-cafe.mp3')],
    ['19', 'I’d like a tea', gap('', 'like a tea.'), said("I'd like a tea.")],
    ['21', 'Auckland', asked('Какая там погода?'), cut('a0/21-auck.mp3')],
    ['22', 'good idea', asked('Как отвечает собеседник?'), cut('a0/22-go.mp3')],
  ])('steps-%s: %s', (n, _, pick, want) => {
    expect(pick(steps(n))).toBe(want)
    expect(fs.existsSync(path.join(ROOT, 'public', want))).toBe(true)
  })
})
