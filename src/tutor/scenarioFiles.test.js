import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
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

  it('у каждой сцены реестра есть промпт', () => {
    const files = new Set(readdirSync(DATA_DIR))
    for (const s of SCENARIOS) {
      expect(files.has(`${s.id}.md`)).toBe(true)
    }
  })
})
