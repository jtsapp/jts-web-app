import { afterEach, describe, expect, it, vi } from 'vitest'

// Флаги сборки читаются на импорте config.js, поэтому модуль грузится заново
// под каждое окружение.
async function load(devStand) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_ENABLE_JARVIS', devStand ? '1' : '')
  return import('./tutors.js')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('PICK_TUTORS — карточки экрана выбора', () => {
  it('прод: трое в порядке макета, Айзере нет', async () => {
    const { PICK_TUTORS } = await load(false)
    expect(PICK_TUTORS.map((t) => t.key)).toEqual(['dexter', 'luna', 'spark'])
    for (const t of PICK_TUTORS) expect(t.figure).toMatch(/^\/tutor\/pick\/.+\.webp$/)
  })

  it('dev-стенд: Айзере сразу за тройкой, KZ тест в хвосте', async () => {
    const { PICK_TUTORS } = await load(true)
    expect(PICK_TUTORS.map((t) => t.key)).toEqual(['dexter', 'luna', 'spark', 'aizere', 'jarvis'])
  })

  // Голоса и персоны у агента для Айзере нет: попади она в TUTORS, её можно
  // было бы выбрать в «Управлении тьютором» и позвонить с ключом, которого
  // агент не знает.
  it('Айзере — только место: comingSoon и вне TUTORS', async () => {
    const { PICK_TUTORS, TUTORS, getTutor, DEFAULT_TUTOR } = await load(true)
    const aizere = PICK_TUTORS.find((t) => t.key === 'aizere')
    expect(aizere.comingSoon).toBe(true)
    expect(TUTORS.some((t) => t.key === 'aizere')).toBe(false)
    expect(getTutor('aizere')).toBe(DEFAULT_TUTOR)
  })

  // Чипы выбранной карточки рисуются по traitColors, подпись — из словаря по
  // номеру. Цвет без подписи вылез бы сырым ключом tutor.x.traitN.
  it('на каждый цвет черты есть подпись во всех языках', async () => {
    const { PICK_TUTORS } = await load(true)
    const { DICT, LANGS } = await import('../i18n/dict.js')
    for (const lang of LANGS) {
      for (const t of PICK_TUTORS) {
        t.traitColors.forEach((_, i) => {
          expect(DICT[lang][`tutor.${t.key}.trait${i + 1}`], `${lang} ${t.key} trait${i + 1}`).toBeTruthy()
        })
      }
    }
  })
})
