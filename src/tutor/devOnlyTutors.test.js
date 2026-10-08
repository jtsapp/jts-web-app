import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEV_ONLY_TUTOR_KEYS, tutorKeyForStand } from './devOnlyTutors.js'

// Флаг сборки читается на импорте config.js — tutors.js грузим заново под
// каждое окружение, как в tutors.test.js.
async function loadTutors(devStand) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_ENABLE_JARVIS', devStand ? '1' : '')
  return import('./tutors.js')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('tutorKeyForStand — dev-only тьюторы не уходят агенту с прода', () => {
  it('прод: KZ тест и Спарк тест превращаются в Спарка, в любом регистре', () => {
    for (const key of ['jarvis', 'sparktest', ' SparkTest ', 'JARVIS']) {
      expect(tutorKeyForStand(key, false), key).toBe('spark')
    }
  })

  it('прод: обычные тьюторы проходят как есть', () => {
    for (const key of ['luna', 'dexter', 'spark', 'aizere']) {
      expect(tutorKeyForStand(key, false)).toBe(key)
    }
  })

  it('dev-стенд: dev-only ключи проходят', () => {
    expect(tutorKeyForStand('sparktest', true)).toBe('sparktest')
    expect(tutorKeyForStand(' Jarvis', true)).toBe('jarvis')
  })

  it('мусор вместо ключа — тьютор не указан', () => {
    for (const key of [undefined, null, 42, {}, '']) {
      expect(tutorKeyForStand(key, false)).toBe('')
    }
  })

  // Откат сервера и клиента обязан совпадать, иначе на экране один тьютор, а в
  // звонке другой.
  it('откат — тот же тьютор, что DEFAULT_TUTOR на клиенте', async () => {
    const { DEFAULT_TUTOR } = await loadTutors(false)
    expect(tutorKeyForStand('sparktest', false)).toBe(DEFAULT_TUTOR.key)
  })

  // Новый dev-only тьютор в tutors.js без строки здесь — и сервер прода молча
  // пропустил бы его ключ к агенту.
  it('список совпадает с тьюторами, которых нет в прод-сборке', async () => {
    const dev = (await loadTutors(true)).TUTORS.map((t) => t.key)
    const prod = (await loadTutors(false)).TUTORS.map((t) => t.key)
    expect([...DEV_ONLY_TUTOR_KEYS].sort()).toEqual(dev.filter((k) => !prod.includes(k)).sort())
  })
})
