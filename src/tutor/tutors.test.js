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

  // С 24.09.2026 Айзере говорит: на dev-стенде она полноценный тьютор — её
  // можно выбрать, позвонить, увидеть в шапке звонка. Кнопка «Скоро» ей больше
  // не нужна.
  it('dev-стенд: Айзере — выбираемый тьютор с аватаркой', async () => {
    const { PICK_TUTORS, TUTORS, getTutor, temperFor } = await load(true)
    const aizere = getTutor('aizere')
    expect(aizere.key).toBe('aizere')
    expect(PICK_TUTORS.find((t) => t.key === 'aizere').comingSoon).toBeFalsy()
    expect(TUTORS.map((t) => t.key)).toEqual(['luna', 'dexter', 'spark', 'aizere', 'jarvis'])
    expect(aizere.avatar).toMatch(/^\/tutor\/.+\.png$/)
    // Нрава 18+ нет, как у Луны: наверх уходит null, агент берёт базовую персону.
    expect(temperFor('aizere', 'harsh')).toBeNull()
  })

  // Своих промпта и методички у неё ещё нет — на проде её нет нигде, а старый
  // сохранённый выбор падает на тьютора по умолчанию.
  it('прод: Айзере нет ни в TUTORS, ни в getTutor', async () => {
    const { TUTORS, getTutor, DEFAULT_TUTOR } = await load(false)
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
