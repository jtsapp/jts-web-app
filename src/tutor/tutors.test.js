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
  // С 03.10.2026 Айзере в проде: четыре карточки в порядке макета, KZ теста нет.
  it('прод: четверо в порядке макета, Айзере четвёртая', async () => {
    const { PICK_TUTORS } = await load(false)
    expect(PICK_TUTORS.map((t) => t.key)).toEqual(['dexter', 'luna', 'spark', 'aizere'])
    for (const t of PICK_TUTORS) expect(t.figure).toMatch(/^\/tutor\/pick\/.+\.webp$/)
  })

  it('dev-стенд: Айзере сразу за тройкой, KZ тест и Спарк тест в хвосте', async () => {
    const { PICK_TUTORS } = await load(true)
    expect(PICK_TUTORS.map((t) => t.key)).toEqual(['dexter', 'luna', 'spark', 'aizere', 'jarvis', 'sparktest'])
  })

  // «Спарк тест» — место для тестов эмоций: лицо, а не шар (face не задан),
  // картинки Спарка, нрава 18+ нет.
  it('dev-стенд: Спарк тест — с лицом и без нрава', async () => {
    const { getTutor, temperFor } = await load(true)
    const st = getTutor('sparktest')
    expect(st.key).toBe('sparktest')
    expect(st.face).toBeUndefined()
    expect(st.assistant).toBeFalsy()
    expect(st.avatar).toMatch(/^\/tutor\/.+\.png$/)
    expect(st.figure).toMatch(/^\/tutor\/pick\/.+\.webp$/)
    expect(temperFor('sparktest', 'harsh')).toBeNull()
  })

  // Айзере — полноценный тьютор и на проде, и на стенде: её можно выбрать,
  // позвонить, увидеть в шапке звонка. Старый сохранённый выбор 'aizere' больше
  // не падает на тьютора по умолчанию.
  it('Айзере — выбираемый тьютор с аватаркой на проде и на стенде', async () => {
    for (const dev of [false, true]) {
      const { PICK_TUTORS, TUTORS, getTutor, temperFor } = await load(dev)
      const aizere = getTutor('aizere')
      expect(aizere.key).toBe('aizere')
      expect(PICK_TUTORS.find((t) => t.key === 'aizere').comingSoon).toBeFalsy()
      expect(TUTORS.map((t) => t.key)).toEqual(
        dev ? ['luna', 'dexter', 'spark', 'aizere', 'jarvis', 'sparktest'] : ['luna', 'dexter', 'spark', 'aizere'],
      )
      expect(aizere.avatar).toMatch(/^\/tutor\/.+\.png$/)
      // Нрава 18+ нет, как у Луны: наверх уходит null, агент берёт базовую персону.
      expect(temperFor('aizere', 'harsh')).toBeNull()
    }
  })

  it('прод: KZ теста и Спарк теста нет ни в TUTORS, ни в getTutor', async () => {
    const { TUTORS, getTutor, DEFAULT_TUTOR } = await load(false)
    for (const key of ['jarvis', 'sparktest']) {
      expect(TUTORS.some((t) => t.key === key)).toBe(false)
      expect(getTutor(key)).toBe(DEFAULT_TUTOR)
    }
  })

  // Мобильная карусель (кадр 4338:1568): Декстер в центре, Луна слева, Спарк
  // справа; в круге те же тьюторы, что в ряду, ни один не потерян.
  it('карусель: Луна → Декстер → Спарк, состав как у ряда', async () => {
    for (const dev of [false, true]) {
      const { CAROUSEL_TUTORS, PICK_TUTORS } = await load(dev)
      expect(CAROUSEL_TUTORS.slice(0, 3).map((t) => t.key)).toEqual(['luna', 'dexter', 'spark'])
      expect(CAROUSEL_TUTORS.map((t) => t.key).sort()).toEqual(PICK_TUTORS.map((t) => t.key).sort())
    }
  })

  // Кнопка «Выбрать <имя>» в карусели — у каждого тьютора экрана выбора.
  it('у каждого тьютора есть «Выбрать» во всех языках', async () => {
    const { PICK_TUTORS } = await load(true)
    const { DICT, LANGS } = await import('../i18n/dict.js')
    for (const lang of LANGS) {
      for (const t of PICK_TUTORS) expect(DICT[lang][`tutor.${t.key}.choose`], `${lang} ${t.key}`).toBeTruthy()
    }
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
