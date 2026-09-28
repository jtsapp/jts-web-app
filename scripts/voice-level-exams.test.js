// Раскладка голосов и склейка записей экзамена. Сам синтез здесь не зовётся:
// он платный и недетерминированный, файлы лежат в репозитории, а их наличие
// сторожит src/learning/levelExam.test.js.
import { describe, it, expect } from 'vitest'
import { CAST, SPEED, PAUSE_MS, silenceLike, plan, examLevels } from './voice-level-exams.js'
import { TTS_VOICES } from '../src/lib/ttsShared.js'

describe('voice-level-exams — голоса', () => {
  const levels = examLevels()

  it('раскладка есть у каждого уровня с экзаменом', () => {
    expect(levels).toEqual(['a0', 'a1', 'a2', 'b2'])
    for (const level of levels) {
      expect(CAST[level], level).toBeTruthy()
      expect(SPEED[level], level).toBeGreaterThan(0)
    }
  })

  it('у каждой роли каждой записи есть голос из каталога Soniox', () => {
    for (const level of levels) {
      for (const item of plan(level)) {
        expect(item.lines.length).toBeGreaterThan(0)
        for (const line of item.lines) expect(TTS_VOICES.has(line.voice), `${level}/${item.id}: ${line.voice}`).toBe(true)
      }
    }
  })

  it('в диалоге у собеседников разные голоса', () => {
    for (const [level, passages] of Object.entries(CAST)) {
      for (const [id, roles] of Object.entries(passages)) {
        const voices = Object.values(roles)
        expect(new Set(voices).size, `${level}/${id}`).toBe(voices.length)
      }
    }
  })
})

describe('voice-level-exams — пауза между репликами', () => {
  // Ответ Soniox: ID3v2 на 44 байта, дальше MPEG-2 Layer III, 128 кбит/с,
  // 24 кГц, моно, без CRC (fff3c4c4) — кадр 384 байта, 576 сэмплов (24 мс).
  const id3 = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 34, ...new Array(34).fill(0)])
  const frame = Buffer.alloc(385)
  frame.writeUInt32BE(0xfff3c6c4, 0) // тот же формат, но с байтом выравнивания

  it('кадры тишины в формате самой записи, без выравнивания', () => {
    const pause = silenceLike(Buffer.concat([id3, frame]), PAUSE_MS)
    expect(pause.length % 384).toBe(0)
    const count = pause.length / 384
    expect(count).toBe(Math.round((0.5 * 24000) / 576))
    for (let i = 0; i < count; i++) {
      expect(pause.readUInt32BE(i * 384)).toBe(0xfff3c4c4)
      expect(pause.subarray(i * 384 + 4, (i + 1) * 384).every((b) => b === 0)).toBe(true)
    }
  })

  it('незнакомый формат — без паузы, а не с мусором', () => {
    const crc = Buffer.alloc(400)
    crc.writeUInt32BE(0xfff2c4c4, 0) // бит защиты: есть CRC
    expect(silenceLike(crc, PAUSE_MS).length).toBe(0)
    expect(silenceLike(Buffer.from('not an mp3'), PAUSE_MS).length).toBe(0)
  })
})
