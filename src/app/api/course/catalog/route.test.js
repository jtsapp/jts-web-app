import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { GET, OPTIONS } from './route.js'
import { courseTrail } from '../../../../learning/courseData.js'

const index = (level) => JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'course', level, 'index.json'), 'utf8'))

describe('GET /api/course/catalog', () => {
  it('коды и порядок — как у тропы: задачу преподавателя закрывает отметка именно этого кода', async () => {
    const res = await GET()
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    const { levels } = await res.json()
    expect(levels.map((l) => l.level)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2'])
    const a1 = levels.find((l) => l.level === 'A1')
    expect(a1.lessons.map((x) => x.code)).toEqual(courseTrail(index('a1')).map((n) => n.code))
    expect(a1.lessons[0]).toEqual({ code: 'L1', kind: 'lesson', unit: 1, title: 'My biography' })
    // тесты юнитов — тоже шаги тропы (у A1 их нет вовсе, у A2 — после каждого юнита)
    expect(levels.find((l) => l.level === 'A2').lessons.filter((x) => x.kind === 'test').map((x) => x.code)).toContain('T1')
    expect(levels.find((l) => l.level === 'B2').lessons.map((x) => x.code)).toContain('Xf')
  })

  it('OPTIONS — для браузера админки с другого домена', () => {
    expect(OPTIONS().status).toBe(204)
  })
})
