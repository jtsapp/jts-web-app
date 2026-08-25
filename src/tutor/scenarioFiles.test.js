import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SCENARIOS } from './scenarios.js'

// Файл сцены обязан лежать в ДВУХ папках: data/scenarios/ читает дев, а
// agent/scenarios/ уезжает в Docker-образ агента (контекст сборки — agent/).
// Разъедутся — прод молча поедет на старом промпте, и заметить это можно
// только по странному поведению NPC в звонке.
const DATA_DIR = join(process.cwd(), 'data', 'scenarios')
const AGENT_DIR = join(process.cwd(), 'agent', 'scenarios')

describe('файлы сценариев', () => {
  it('обе папки содержат один и тот же набор файлов', () => {
    expect(readdirSync(AGENT_DIR).sort()).toEqual(readdirSync(DATA_DIR).sort())
  })

  it('каждый файл побайтово одинаков в обеих папках', () => {
    for (const name of readdirSync(DATA_DIR)) {
      expect(readFileSync(join(AGENT_DIR, name), 'utf8')).toBe(
        readFileSync(join(DATA_DIR, name), 'utf8'),
      )
    }
  })

  it('в промптах нет разметки со звёздочками', () => {
    // Каждый символ, который модель напишет в ответ, TTS читает вслух. Курсив
    // markdown в тексте сцены — приглашение echo'нуть «звёздочка be звёздочка»
    // ученику в ухо, поэтому обёртка промпта звёздочки прямо запрещает, а в
    // самих файлах их нет ни одной.
    for (const name of readdirSync(DATA_DIR)) {
      expect(readFileSync(join(DATA_DIR, name), 'utf8')).not.toMatch(/\*/)
    }
  })

  it('у каждой сцены реестра есть промпт', () => {
    const files = new Set(readdirSync(DATA_DIR))
    for (const s of SCENARIOS) {
      expect(files.has(`${s.id}.md`)).toBe(true)
    }
  })

  it('у каждой сцены реестра есть картинка карточки', () => {
    // img — путь от корня public. Файла нет — карточка рисует пустой серый
    // прямоугольник вместо фото, и в ревью это не видно: битой ссылки в
    // background-image браузер не показывает.
    for (const s of SCENARIOS) {
      expect(existsSync(join(process.cwd(), 'public', s.img))).toBe(true)
    }
  })
})
