// Тесты плана озвучки «Слушай и выбирай». Сеть не трогаем: проверяем, что
// именно скрипт собирается озвучить, а не сам Soniox.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { generate, looksLikeMp3, parseArgs, planAudio } from './make-listenchoose-audio.js'

const { questions } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'practice', 'listenchoose', 'questions.json'), 'utf8'),
)

describe('planAudio', () => {
  it('без записей на диске планирует все 150 в порядке банка, файлы уникальны', () => {
    const plan = planAudio(questions, { exists: () => false })
    expect(plan).toHaveLength(150)
    expect(plan.map((p) => p.id)).toEqual(questions.map((q) => q.id))
    expect(new Set(plan.map((p) => p.file)).size).toBe(150)
    for (const [i, p] of plan.entries()) {
      expect(p.file, p.id).toBe(path.basename(questions[i].audio))
      expect(p.out.replace(/\\/g, '/'), p.id).toMatch(/\/public\/practice\/listenchoose\/audio\/[0-9a-f]{12}\.mp3$/)
      expect(p.text).toBe(questions[i].text)
    }
  })

  it('существующие записи пропускает, а --force озвучивает всё заново', () => {
    const have = path.basename(questions[3].audio)
    const exists = (f) => f.endsWith(have)
    const plan = planAudio(questions, { exists })
    expect(plan).toHaveLength(149)
    expect(plan.some((p) => p.file === have)).toBe(false)
    expect(planAudio(questions, { exists, force: true })).toHaveLength(150)
  })

  it('--limit режет уже отобранное: берёт первые недостающие, а не первые вообще', () => {
    const have = path.basename(questions[0].audio)
    const plan = planAudio(questions, { exists: (f) => f.endsWith(have), limit: 2 })
    expect(plan.map((p) => p.id)).toEqual([questions[1].id, questions[2].id])
  })

  it('два задания с одним файлом дают одну запись', () => {
    const twin = [
      { id: 'a', text: 'same', audio: '/practice/listenchoose/audio/aaaaaaaaaaaa.mp3' },
      { id: 'b', text: 'same', audio: '/practice/listenchoose/audio/aaaaaaaaaaaa.mp3' },
    ]
    expect(planAudio(twin, { exists: () => false })).toHaveLength(1)
  })
})

describe('parseArgs', () => {
  it('флаги, значения по умолчанию и мусор', () => {
    const d = parseArgs([])
    expect(d).toMatchObject({ dry: false, force: false, limit: Infinity, voice: 'Owen', speed: 0.95 })
    const a = parseArgs(['--dry', '--force', '--limit', '3', '--voice', 'Grace', '--speed', '0.9'])
    expect(a).toMatchObject({ dry: true, force: true, limit: 3, voice: 'Grace', speed: 0.9 })
    expect(() => parseArgs(['--limit', 'abc'])).toThrow(/--limit/)
    expect(() => parseArgs(['--speed', '5'])).toThrow(/--speed/)
    expect(() => parseArgs(['--nope'])).toThrow(/--nope/)
  })
})

describe('looksLikeMp3', () => {
  it('узнаёт ID3-заголовок и кадр MPEG, отвергает JSON-ошибку и обрезок', () => {
    expect(looksLikeMp3(Buffer.concat([Buffer.from('ID3'), Buffer.alloc(2000)]))).toBe(true)
    expect(looksLikeMp3(Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(2000)]))).toBe(true)
    expect(looksLikeMp3(Buffer.from('{"error":"quota"}' + ' '.repeat(2000)))).toBe(false)
    expect(looksLikeMp3(Buffer.from([0xff, 0xfb]))).toBe(false)
  })
})

describe('generate: путь записи без сети', () => {
  const mp3 = () => Buffer.concat([Buffer.from('ID3'), Buffer.alloc(2000, 1)])
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lc-audio-'))
  const item = (dir, id) => ({ id, text: `text ${id}`, out: path.join(dir, `${id}.mp3`) })

  it('пишет каждую запись и считает объём', async () => {
    const dir = tmp()
    const plan = [item(dir, 'a'), item(dir, 'b')]
    const seen = []
    const r = await generate(plan, {
      synthesize: async (text) => {
        seen.push(text)
        return mp3()
      },
    })
    expect(seen).toEqual(['text a', 'text b'])
    expect(r).toEqual({ done: 2, bytes: 2 * 2003 })
    for (const p of plan) expect(fs.readFileSync(p.out).length).toBe(2003)
  })

  it('не-mp3 от провайдера — ошибка с id, файл не создан', async () => {
    const dir = tmp()
    const a = item(dir, 'a')
    const json = async () => Buffer.from('{"error":"quota"}' + ' '.repeat(2000))
    await expect(generate([a], { synthesize: json })).rejects.toThrow(/^a: провайдер вернул не mp3/)
    expect(fs.existsSync(a.out)).toBe(false)
  })

  it('сбой синтеза называет задание, на котором упал', async () => {
    const dir = tmp()
    const boom = async () => {
      throw new Error('429')
    }
    await expect(generate([item(dir, 'z')], { synthesize: boom })).rejects.toThrow('z: 429')
  })

  it('существующий файл не затирает, а с force — заменяет', async () => {
    const dir = tmp()
    const a = item(dir, 'a')
    fs.writeFileSync(a.out, 'старая запись')
    await expect(generate([a], { synthesize: async () => mp3() })).rejects.toThrow(/EEXIST/)
    expect(fs.readFileSync(a.out, 'utf8')).toBe('старая запись')
    await generate([a], { synthesize: async () => mp3(), force: true })
    expect(fs.readFileSync(a.out).length).toBe(2003)
  })
})
