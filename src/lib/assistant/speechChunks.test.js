import { describe, it, expect } from 'vitest'
import { FIRST_MAX, MAX_CHUNK, cleanForSpeech, createSpeechChunker } from './speechChunks.js'

describe('cleanForSpeech', () => {
  it('снимает разметку и метки', () => {
    expect(cleanForSpeech('**Практика** — раздел.\n- Откройте её\n[[REPORT_BUG]]')).toBe('Практика — раздел.\nОткройте её')
  })

  it('дефис внутри строки не трогает', () => {
    expect(cleanForSpeech('Speaking Buddy — голосовой тьютор, A1-уровень')).toBe('Speaking Buddy — голосовой тьютор, A1-уровень')
  })

  // Живой прогон 14.10.2026: Луна читала эмодзи вслух («smiling face»).
  it('эмодзи вслух не читаются: смайлы, сердечки, флаги, составные и цифры-клавиши', () => {
    expect(cleanForSpeech('Отлично! 😊 Так держать 👍🏽')).toBe('Отлично! Так держать')
    expect(cleanForSpeech('Удачи ❤️ и до встречи 👋')).toBe('Удачи и до встречи')
    expect(cleanForSpeech('Казахстан 🇰🇿 и семья 👨‍👩‍👧')).toBe('Казахстан и семья')
    expect(cleanForSpeech('Шаг 1️⃣ — открыть ✅ «Практику» ✨')).toBe('Шаг — открыть «Практику»')
  })

  it('на месте эмодзи перед знаком препинания не остаётся пробела', () => {
    expect(cleanForSpeech('Раздел «Домашняя работа» 😊. Удачи 👋!')).toBe('Раздел «Домашняя работа». Удачи!')
  })

  it('обычные знаки, цифры и буквы не трогает', () => {
    expect(cleanForSpeech('У вас 20% и 3 урока — «A2», ok? © JTS #1')).toBe('У вас 20% и 3 урока — «A2», ok? © JTS #1')
  })
})

describe('createSpeechChunker', () => {
  const run = (parts, opts) => {
    const c = createSpeechChunker(opts)
    return [...parts.flatMap((p) => c.push(p)), ...c.flush()]
  }

  it('первая фраза уходит, как только кончилось предложение длиной ≥ 30', () => {
    const c = createSpeechChunker()
    expect(c.push('Домашка лежит в разделе «Домашняя работа». ')).toEqual(['Домашка лежит в разделе «Домашняя работа».'])
  })

  it('короткое первое предложение ждёт следующего', () => {
    const c = createSpeechChunker()
    expect(c.push('Конечно! ')).toEqual([])
    expect(c.push('Откройте меню слева и выберите раздел. ')).toEqual(['Конечно! Откройте меню слева и выберите раздел.'])
  })

  it('без пробела после точки фраза ждёт продолжения или конца ответа', () => {
    const c = createSpeechChunker()
    expect(c.push('Домашка лежит в разделе «Домашняя работа».')).toEqual([])
    expect(c.flush()).toEqual(['Домашка лежит в разделе «Домашняя работа».'])
  })

  it('число с точкой не режет фразу', () => {
    const c = createSpeechChunker()
    expect(c.push('Ваш балл IELTS сейчас 5.5, а цель — 6.5 к декабрю. ')).toEqual([
      'Ваш балл IELTS сейчас 5.5, а цель — 6.5 к декабрю.',
    ])
  })

  it('следующие фразы склеиваются до ≥ 120 символов', () => {
    const s = 'Это предложение ровно для проверки склейки. '
    const out = run(['Первое предложение достаточно длинное. ', s, s, s, s])
    expect(out[0]).toBe('Первое предложение достаточно длинное.')
    expect(out[1].length).toBeGreaterThanOrEqual(120)
    expect(out.join(' ')).toBe(`Первое предложение достаточно длинное. ${s.repeat(4).trim()}`)
  })

  it('перевод строки — тоже конец фразы', () => {
    const c = createSpeechChunker()
    expect(c.push('Откройте раздел «Практика» в меню\nТам выберите тренажёр')).toEqual(['Откройте раздел «Практика» в меню'])
    expect(c.flush()).toEqual(['Там выберите тренажёр'])
  })

  it(`потолок ${MAX_CHUNK}: без конца предложения режет по пробелу, ничего не теряя`, () => {
    const long = `${'слово '.repeat(90)}конец.`
    const out = run([long])
    expect(out.length).toBeGreaterThan(1)
    expect(out.every((p) => p.length <= MAX_CHUNK)).toBe(true)
    expect(out.join(' ')).toBe(long.trim())
  })

  it('длинная склейка режется по последнему концу предложения в пределах потолка', () => {
    const s = `${'а'.repeat(90)}. `
    const out = run(['Первое предложение достаточно длинное. ', s.repeat(6)])
    expect(out.slice(1).every((p) => p.length <= MAX_CHUNK && p.endsWith('.'))).toBe(true)
  })

  it('разметка не озвучивается даже на стыке кусков', () => {
    expect(run(['Откройте **Прак', 'тику** в меню слева, там всё есть. '])).toEqual([
      'Откройте Практику в меню слева, там всё есть.',
    ])
  })

  it('пустые и служебные куски не дают фраз', () => {
    expect(run(['- ', '\n', '[[REPORT_BUG]]'])).toEqual([])
  })

  // Голос Gemini не потоковый: первая фраза синтезируется целиком, ~40 мс на
  // символ. Длинное первое предложение — секунды тишины перед первым словом.
  it(`первая фраза не длиннее ${FIRST_MAX}: длинное предложение режется по запятой`, () => {
    const first = 'Студент, у вас пять домашек уже просрочены, самая старая с 2 октября, и по ним идёт отставание от курса. '
    const out = run([first, 'Открыть?'])
    expect(out[0].length).toBeLessThanOrEqual(FIRST_MAX)
    expect(out[0].endsWith(',')).toBe(true)
    expect(out.join(' ')).toBe(`${first.trim()} Открыть?`)
  })

  // Текст на экране показывается по мере того, как Луна его произносит: виджету
  // нужно знать, где в исходном потоке кончается каждая фраза.
  it('ends — конец каждой фразы в исходном потоке, с разметкой', () => {
    const c = createSpeechChunker()
    const raw = ['Откройте **Практику** в меню слева. ', 'Там вкладки. ', 'И ещё.']
    const phrases = [...raw.flatMap((p) => c.push(p)), ...c.flush()]
    const full = raw.join('')
    expect(c.ends).toHaveLength(phrases.length)
    expect(full.slice(0, c.ends[0])).toBe('Откройте **Практику** в меню слева.')
    expect(c.ends.at(-1)).toBe(full.length)
  })

  it('кусок без слов для речи своей фразы не даёт — его текст уходит со следующей', () => {
    const c = createSpeechChunker()
    c.push('🙂\n')
    c.push('Откройте Практику в меню слева, там всё есть. ')
    expect(c.ends).toEqual(['🙂\nОткройте Практику в меню слева, там всё есть.'.length])
  })
})
