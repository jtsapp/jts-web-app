import { describe, it, expect, vi } from 'vitest'
import { SPEED_READING_VOICES, voiceIdFor, wordsFromAlignment, sampleWpm, synthSample, elevenKey, speedReadingKey } from './sample.js'

// Посимвольная разметка ElevenLabs, как её отдаёт /with-timestamps: каждый символ — step секунд.
function align(text, step = 0.05) {
  const chars = [...text]
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => +(i * step).toFixed(3)),
    character_end_times_seconds: chars.map((_, i) => +((i + 1) * step).toFixed(3)),
  }
}

describe('wordsFromAlignment', () => {
  it('слово на каждый пробельный кусок, время — по буквам и цифрам, пунктуация не растягивает', () => {
    const text = 'Hello, everyone! "Don\'t" go — it\'s 8 o\'clock; high-speed Wi-Fi 512.'
    const w = wordsFromAlignment(text, align(text))
    expect(w.map((x) => x[0])).toEqual(text.split(/\s+/))
    expect(w[0]).toEqual(['Hello,', 0, 0.25])
    // «"Don't"» начинается с кавычки (символ 17) — время от буквы D (18)
    expect(w[2][0]).toBe('"Don\'t"')
    expect(w[2][1]).toBeCloseTo(0.9, 3)
    expect(w[2][2]).toBeCloseTo(1.15, 3)
    // тире без букв — по своим символам
    expect(w[4][0]).toBe('—')
    expect(w[4][2]).toBeGreaterThan(w[4][1])
    expect(w.at(-1)[0]).toBe('512.')
    expect(w.at(-1)[2]).toBeCloseTo(((text.length - 1) * 0.05), 3)
  })

  it('время монотонно', () => {
    const text = 'Good evening and here is the weather for tomorrow.'
    const w = wordsFromAlignment(text, align(text))
    for (let i = 1; i < w.length; i++) expect(w[i][1]).toBeGreaterThanOrEqual(w[i - 1][2] - 1e-9)
  })

  it('символы разметки могут расходиться с текстом (двойной пробел, перевод строки) — слова не съезжают', () => {
    const text = 'Good  evening\nand welcome'
    const w = wordsFromAlignment(text, align('Good evening and welcome'))
    expect(w.map((x) => x[0])).toEqual(['Good', 'evening', 'and', 'welcome'])
    expect(w[3][1]).toBeCloseTo(0.85, 3)
  })

  it('кавычки-ёлочки и типографский апостроф в тексте при прямых в разметке', () => {
    const text = 'It’s “fine”'
    const w = wordsFromAlignment(text, align('It\'s "fine"'))
    expect(w.map((x) => x[0])).toEqual(['It’s', '“fine”'])
    expect(w[1][1]).toBeCloseTo(0.3, 3)
    expect(w[1][2]).toBeCloseTo(0.5, 3)
  })

  it('пустая разметка — нули без NaN', () => {
    const w = wordsFromAlignment('one two', { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] })
    expect(w).toEqual([['one', 0, 0], ['two', 0, 0]])
    expect(wordsFromAlignment('one', null)).toEqual([['one', 0, 0]])
  })
})

describe('sampleWpm', () => {
  it('слова к времени речи от первого слова до последнего', () => {
    expect(sampleWpm([['a', 0.5, 1], ['b', 1, 30.5]])).toBe(4)
    expect(sampleWpm([])).toBe(0)
    expect(sampleWpm([['a', 0, 0]])).toBe(0)
  })
})

describe('голоса и ключи', () => {
  it('два голоса — британские женский и мужской; неизвестный — женский', () => {
    expect(Object.keys(SPEED_READING_VOICES)).toEqual(['uk-female', 'uk-male'])
    expect(voiceIdFor('uk-male')).toBe(SPEED_READING_VOICES['uk-male'])
    expect(voiceIdFor('us-male')).toBe(SPEED_READING_VOICES['uk-female'])
  })
  it('ключи без BOM; служебный по умолчанию — IELTS_GRADER_KEY', () => {
    expect(elevenKey({ ELEVENLABS_API_KEY: '﻿abc ' })).toBe('abc')
    expect(speedReadingKey({ IELTS_GRADER_KEY: '﻿g' })).toBe('g')
    expect(speedReadingKey({ SPEED_READING_KEY: 's', IELTS_GRADER_KEY: 'g' })).toBe('s')
    expect(speedReadingKey({})).toBe('')
  })
})

describe('synthSample', () => {
  it('зовёт /with-timestamps голосом текста и отдаёт mp3, слова и темп', async () => {
    const text = 'Hello there friend'
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ audio_base64: Buffer.from('ID3mp3').toString('base64'), alignment: align(text, 0.5) }), { status: 200 }))
    const out = await synthSample({ text, voice: 'uk-male', key: 'k', model: 'eleven_multilingual_v2', fetchImpl })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${SPEED_READING_VOICES['uk-male']}/with-timestamps?output_format=mp3_44100_128`)
    expect(init.method).toBe('POST')
    expect(init.headers['xi-api-key']).toBe('k')
    expect(JSON.parse(init.body)).toMatchObject({ text, model_id: 'eleven_multilingual_v2' })
    expect(out.audio.toString()).toBe('ID3mp3')
    expect(out.words.map((w) => w[0])).toEqual(['Hello', 'there', 'friend'])
    expect(out.wpm).toBe(sampleWpm(out.words))
  })

  it('не 200 — ошибка с кодом', async () => {
    const fetchImpl = vi.fn(async () => new Response('quota', { status: 401 }))
    await expect(synthSample({ text: 'a', voice: 'uk-female', key: 'k', fetchImpl })).rejects.toThrow(/401/)
  })

  it('ответ без звука — ошибка', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ alignment: null }), { status: 200 }))
    await expect(synthSample({ text: 'a', voice: 'uk-female', key: 'k', fetchImpl })).rejects.toThrow(/audio/)
  })
})
