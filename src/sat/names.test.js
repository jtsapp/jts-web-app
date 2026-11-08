import { describe, expect, it } from 'vitest'
import { OFFICIAL_NAME, TAXONOMY, domainName, skillName } from './names.js'

describe('названия тем SAT — официальные, на английском (ТЗ SAT, задача 6)', () => {
  it('одинаковы при любом языке интерфейса', () => {
    for (const lang of ['ru', 'kk', 'en']) {
      expect(domainName('m.alg', lang)).toBe('Algebra')
      expect(skillName('rw.ii.central-ideas', lang)).toBe('Central Ideas and Details')
    }
  })

  it('у каждого домена и навыка таксономии есть официальное имя', () => {
    const missing = [...TAXONOMY.domains, ...TAXONOMY.skills].map((x) => x.id).filter((id) => !OFFICIAL_NAME[id])
    expect(missing).toEqual([])
  })

  it('старые навыки Advanced Math и секции — по-прежнему с понятным именем', () => {
    expect(skillName('m.adv.quadratics', 'ru')).toBe('Nonlinear Equations')
    expect(skillName('math', 'ru')).toBe('Math')
    expect(domainName('rw', 'kk')).toBe('Reading and Writing')
  })
})
