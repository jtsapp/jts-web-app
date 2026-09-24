import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { mp3Frames, cutMp3, joinMp3 } = require('./cut-clip.js')

// MPEG-1 Layer III, 128 кбит/с, 44,1 кГц, без CRC и паддинга: кадр 417 байт и
// 1152 сэмпла (≈26,1 мс). В теле кадра — его номер, чтобы видеть, какие кадры
// попали в вырезку.
const FRAME = 417
const SEC = 1152 / 44100
const ID_AT = 200

function frame(i, { tag = null } = {}) {
  const b = Buffer.alloc(FRAME)
  b.set([0xff, 0xfb, 0x90, 0x00])
  // Служебный кадр LAME/Xing: метка сразу за side info (4 + 32 байта у стерео).
  if (tag) b.write(tag, 36, 'latin1')
  b.writeUInt32BE(i, ID_AT)
  return b
}

const mp3 = (frames, prefix = Buffer.alloc(0)) => Buffer.concat([prefix, ...frames])
const plain = (n) => Array.from({ length: n }, (_, i) => frame(i))
const ids = (buf) => mp3Frames(buf).frames.map((f) => buf.readUInt32BE(f.at + ID_AT))

// ID3v2 с размером в syncsafe-байтах: 0x01 0x00 = 128 байт тела. В теле —
// байты, похожие на заголовок кадра: в настоящих тегах (обложка) такое
// встречается, и поиск кадра без пропуска тега принял бы их за звук.
function id3() {
  const body = Buffer.alloc(128)
  body.set([0xff, 0xfb, 0x90, 0x00], 16)
  return Buffer.concat([Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0x01, 0x00]), body])
}

describe('mp3Frames', () => {
  it('считает кадры и длительность', () => {
    const { frames, duration } = mp3Frames(mp3(plain(100)))
    expect(frames).toHaveLength(100)
    expect(duration).toBeCloseTo(100 * SEC, 6)
    expect(frames[1].start).toBeCloseTo(SEC, 6)
  })

  it('пропускает ID3v2 в начале файла', () => {
    expect(ids(mp3(plain(3), id3()))).toEqual([0, 1, 2])
  })

  // Кадр Xing/Info декодер пропускает, и отметки времени распознавания идут от
  // первого звучащего кадра — иначе вырезка съехала бы на 26 мс.
  it('служебный кадр Xing/Info не звучит и время не сдвигает', () => {
    const buf = mp3([frame(99, { tag: 'Info' }), ...plain(3)])
    const { frames } = mp3Frames(buf)
    expect(frames.map((f) => buf.readUInt32BE(f.at + ID_AT))).toEqual([0, 1, 2])
    expect(frames[0].start).toBe(0)
  })

  it('терпит ID3v1 в хвосте, но не мусор посреди файла', () => {
    const tail = Buffer.concat([Buffer.from('TAG'), Buffer.alloc(125)])
    expect(mp3Frames(Buffer.concat([mp3(plain(3)), tail])).frames).toHaveLength(3)
    const broken = Buffer.concat([mp3(plain(3)), Buffer.alloc(500, 7), mp3(plain(3))])
    expect(() => mp3Frames(broken)).toThrow(/кадр/)
  })

  it('падает на файле без MP3-кадров', () => {
    expect(() => mp3Frames(Buffer.from('RIFF....WAVEfmt '))).toThrow(/MP3/)
  })
})

describe('cutMp3', () => {
  it('берёт кадры, начавшиеся внутри отрезка', () => {
    // 0,5 с — между кадрами 19 (0,496) и 20 (0,522); 1,0 с — между 38 и 39.
    const out = cutMp3(mp3(plain(100)), 0.5, 1.0)
    expect(ids(out)).toEqual(Array.from({ length: 19 }, (_, i) => 20 + i))
    expect(out.length).toBe(19 * FRAME)
  })

  it('отрезок за концом файла — ошибка, а не пустой файл', () => {
    expect(() => cutMp3(mp3(plain(10)), 5, 6)).toThrow(/пуст/)
    expect(() => cutMp3(mp3(plain(10)), 0.2, 0.1)).toThrow()
  })
})

// Склейка нужна, когда фраза задания в курсе нарезана на два соседних клипа
// (A1: «I opened the door.» + «I've opened the door.»), а задание звучит одним.
describe('joinMp3', () => {
  it('склеивает кадры кусков через паузу из тихих кадров', () => {
    const out = joinMp3([mp3(plain(3), id3()), mp3([frame(7), frame(8)])], 0.1)
    const { frames } = mp3Frames(out)
    // 0,1 с — 4 кадра по 26 мс (с округлением вверх).
    expect(frames).toHaveLength(3 + 4 + 2)
    const got = frames.map((f) => out.readUInt32BE(f.at + ID_AT))
    expect(got.slice(0, 3)).toEqual([0, 1, 2])
    expect(got.slice(7)).toEqual([7, 8])
    // Тихий кадр — заголовок первого кадра и нули: декодер отыграет тишину.
    const gap = frames[3]
    expect(out.subarray(gap.at, gap.at + 4)).toEqual(Buffer.from([0xff, 0xfb, 0x90, 0x00]))
    expect(out.subarray(gap.at + 4, gap.at + FRAME).every((b) => b === 0)).toBe(true)
  })

  // Кадры разной частоты или битрейта в одном потоке браузер вправе не
  // сыграть: склейка из клипа курса (24 кГц) и старого трека (44,1 кГц) —
  // ошибка, а не тихо испорченный файл.
  it('куски разного формата не склеивает', () => {
    // 48 кГц при том же битрейте: кадр 384 байта.
    const other = Buffer.alloc(384)
    other.set([0xff, 0xfb, 0x94, 0x00])
    expect(() => joinMp3([mp3(plain(2)), mp3([other, other])], 0)).toThrow(/формат/)
  })
})
