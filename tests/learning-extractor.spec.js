import { test, expect } from '@playwright/test'
const fs = require('fs')
const path = require('path')

// Экстрактор — CommonJS; тянем его чистые функции через require.
const { normalizeTask, decodeDataUri, prefixClasses } = require('../scripts/extract-kingdom-lessons.js')

const ROOT = path.join(__dirname, '..')
const ref = (id) => (id ? `/m/${id}` : null)

test.describe('extract-kingdom-lessons: нормализация задания по типу', () => {
  test('choice → варианты/ответ/флаг two', () => {
    const t = normalizeTask(
      { type: 'choice', sec: '2. Vocab', title: 'T', sub: 'S', visual: '🇰🇿', word: 'Kazakhstan', options: ['Kazakh', 'British'], answer: 'Kazakh', two: true },
      ref,
    )
    expect(t).toMatchObject({ type: 'choice', visual: '🇰🇿', word: 'Kazakhstan', options: ['Kazakh', 'British'], answer: 'Kazakh', two: true })
  })

  test('gap → answer с "|" разбивается в answers[]', () => {
    const t = normalizeTask({ type: 'gap', gapBefore: 'We ', gapAfter: '.', answer: 'clicked|hit it off' }, ref)
    expect(t.type).toBe('gap')
    expect(t.answers).toEqual(['clicked', 'hit it off'])
  })

  test('chips → банк слов + одиночный ответ', () => {
    const t = normalizeTask({ type: 'chips', gapBefore: 'I ', gapAfter: ' here.', answer: 'am', bank: ['am', 'is', 'are'] }, ref)
    expect(t).toMatchObject({ type: 'chips', answer: 'am', bank: ['am', 'is', 'are'] })
  })

  test('listen → tracks резолвятся в media src, пустые отбрасываются', () => {
    const t = normalizeTask({ type: 'listen', tracks: [['au1', 'A'], ['au2', 'B']] }, (id) => (id === 'au1' ? '/m/au1.mp3' : null))
    expect(t.tracks).toEqual([{ src: '/m/au1.mp3', label: 'A' }])
  })

  test('watch → video src, дефолт vid1', () => {
    const t = normalizeTask({ type: 'watch', vtitle: 'BBC' }, (id) => (id === 'vid1' ? '/m/vid1.mp4' : null))
    expect(t).toMatchObject({ type: 'watch', src: '/m/vid1.mp4', vtitle: 'BBC' })
  })

  test('info/read → тип info, классы префиксованы l-', () => {
    const t = normalizeTask({ type: 'read', html: '<table class="grid"><b>x</b></table>' }, ref)
    expect(t.type).toBe('info')
    expect(t.html).toContain('class="l-grid"')
  })

  test('speak НЕ доходит до нормализатора — фильтруется в collectLessonInPage', () => {
    // Санити: normalizeTask с неизвестным типом даёт info-заглушку + флаг.
    const t = normalizeTask({ type: 'speak', title: 'x' }, ref)
    expect(t.__unknown).toBe('speak')
  })
})

test('decodeDataUri: base64 → буфер + расширение', () => {
  const uri = 'data:audio/mpeg;base64,' + Buffer.from('hello').toString('base64')
  const d = decodeDataUri(uri)
  expect(d.ext).toBe('mp3')
  expect(d.buf.toString()).toBe('hello')
})

test('prefixClasses изолирует все классы', () => {
  expect(prefixClasses('<div class="a b">')).toBe('<div class="l-a l-b">')
})

// ——— Интеграция: реальный вывод экстрактора (public/learning) ———
test.describe('вывод экстрактора a1 корректен', () => {
  const a1Path = path.join(ROOT, 'public/learning/a1.json')
  const idxPath = path.join(ROOT, 'public/learning/index.json')

  test.skip(() => !fs.existsSync(a1Path), 'сначала: node scripts/extract-kingdom-lessons.js')

  test('каталог и данные согласованы, speak отсутствует, media — абсолютные URL', () => {
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'))
    const a1 = JSON.parse(fs.readFileSync(a1Path, 'utf8'))
    expect(idx.a1.lessons.length).toBe(Object.keys(a1.lessons).length)

    let speak = 0
    let tracks = 0
    for (const code of Object.keys(a1.lessons)) {
      const les = a1.lessons[code]
      expect(les.tasks.length).toBeGreaterThan(0)
      for (const t of les.tasks) {
        if (t.type === 'speak') speak++
        // Задачи `watch` бывают только у данных из Speakout-экстрактора. Если
        // такая встретилась — ссылка обязана быть абсолютной, как и раньше.
        if (t.type === 'watch' && t.src) expect(t.src).toMatch(/^https:\/\//)
        if (t.type === 'listen') {
          for (const tr of t.tracks) {
            expect(tr.src).toMatch(/^https:\/\//)
            tracks++
          }
        }
      }
    }
    expect(speak).toBe(0)
    // Раньше здесь стояло `mediaUrls > 0` — счётчик задач `watch` со ссылками
    // на files-api.iqra.space. Такого в a1 больше нет и быть не должно: уровень
    // производит scripts/extract-jts-self-lessons.js из файла курса, а
    // Speakout-экстрактор оставлен только под B2/C1 (его прогон по a1 затёр бы
    // новый курс — см. CLAUDE.md). Проверка медиа осталась, но по тому, что в
    // данных действительно есть: дорожки шагов слушания.
    expect(tracks).toBeGreaterThan(0)
  })
})
