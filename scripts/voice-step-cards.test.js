import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { isSample, speakable, tooLong, tooShort, synthesizeChecked } = require('./voice-step-cards.js')

// MP3 заданной длины: кадры MPEG-1 Layer III, 128 кбит/с, 44,1 кГц — 417 байт
// и ≈26,1 мс каждый (как в selfstudy/cut-clip.test.js).
function mp3Of(seconds) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0x00])
  return Buffer.concat(Array.from({ length: Math.round(seconds / (1152 / 44100)) }, () => frame))
}

describe('voice-step-cards — что озвучивать в шаге record', () => {
  it('английская строка — образец', () => {
    expect(isSample('I like coffee.')).toBe(true)
    expect(isSample("My closest friend is … . We've known each other for/since … .")).toBe(true)
  })

  // Половина строк record у B1 — задания по-русски: английский голос прочёл
  // бы кириллицу мусором.
  it('задание по-русски — не образец, даже с английскими вставками', () => {
    expect(isSample('Одно в Present Simple: как часто вы встречаетесь с друзьями.')).toBe(false)
    expect(isSample('Guilt-free бренды — реальный ответ или просто тренд? Используйте I’m convinced…')).toBe(false)
    expect(isSample('Досыңыз кім? Қанша уақыт таныссыз?')).toBe(false)
  })

  it('пустая строка — не образец', () => {
    expect(isSample('')).toBe(false)
    expect(isSample(null)).toBe(false)
  })
})

// Синтез не детерминирован и изредка срывается в бормотание: рамка из 11 слов
// однажды вышла записью на 23 с, тот же текст повторно — 5 с.
describe('voice-step-cards — сорвавшийся синтез', () => {
  const frame = 'The school I went to … . There was a … , and the … was … .'

  it('запись в разы длиннее текста — сорвалась', () => {
    expect(tooLong(frame, 23.1)).toBe(true)
  })

  it('обычная запись и рамка с паузами — нет', () => {
    expect(tooLong(frame, 5.2)).toBe(false)
    expect(tooLong('First, …', 0.8)).toBe(false)
    expect(tooLong('My phone number is 07700 900 461.', 6.6)).toBe(false)
  })

  // Живая речь — от 0.2 с на слово; меньше 0.1 — тишина или обрезок.
  it('запись короче 0.1 с на слово — обрезана', () => {
    expect(tooShort(frame, 0.5)).toBe(true)
    expect(tooShort(frame, 5.2)).toBe(false)
    expect(tooShort('First, …', 0.74)).toBe(false)
  })

  describe('synthesizeChecked', () => {
    beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}))
    afterEach(() => vi.restoreAllMocks())

    it('сорвавшийся синтез переспрашивает и берёт первую годную запись', async () => {
      const takes = [mp3Of(23), mp3Of(5)]
      const synth = vi.fn(async () => takes.shift())
      const buf = await synthesizeChecked(frame, { synth, gapMs: 0 })
      expect(synth).toHaveBeenCalledTimes(2)
      expect(buf.length).toBe(mp3Of(5).length)
    })

    it('три срыва подряд — записи нет', async () => {
      const synth = vi.fn(async () => mp3Of(30))
      expect(await synthesizeChecked(frame, { synth, gapMs: 0 })).toBeNull()
      expect(synth).toHaveBeenCalledTimes(3)
    })

    it('ответ не MP3 — неудачная попытка, а не падение прогона', async () => {
      const takes = [Buffer.from('not an mp3 at all'), mp3Of(5)]
      const synth = vi.fn(async () => takes.shift())
      expect((await synthesizeChecked(frame, { synth, gapMs: 0 })).length).toBe(mp3Of(5).length)
    })

    it('синтез получает текст для произношения', async () => {
      const synth = vi.fn(async () => mp3Of(3))
      await synthesizeChecked('What time? → Could you tell me…?', { synth, gapMs: 0 })
      expect(synth).toHaveBeenCalledWith('What time? Could you tell me…?')
    })
  })
})

describe('voice-step-cards — speakable', () => {
  // «Вопрос → начало косвенного вопроса»: стрелку синтез прочёл бы вслух, а
  // это граница двух реплик.
  it('стрелка — граница реплик', () => {
    expect(speakable('What time does the museum close? → Could you tell me…?')).toBe(
      'What time does the museum close? Could you tell me…?',
    )
    expect(speakable('Check the booking for me. → I wonder if you could…')).toBe('Check the booking for me. I wonder if you could…')
    expect(speakable('Call me → Could you call me?')).toBe('Call me. Could you call me?')
  })

  it('ремарка (pause) — пауза, а не слово', () => {
    expect(speakable("So then … (pause) … Yes, it's true.")).toBe("So then … … … Yes, it's true.")
  })

  it('прежнее поведение: пары через разделитель и размеченные реплики', () => {
    expect(speakable('loose / lose')).toBe('loose, lose')
    expect(speakable('employer — employee')).toBe('employer, employee')
    expect(speakable('<b>On the phone:</b> I understand that… · Could you tell me…?')).toBe(
      'On the phone: I understand that… Could you tell me…?',
    )
  })
})
