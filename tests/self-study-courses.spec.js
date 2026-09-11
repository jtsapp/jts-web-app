import { test, expect } from '@playwright/test'

// Два курса одного уровня CEFR в разделе «Самостоятельно»: общий B2 и Business
// English с тем же кодом B2 и отдельным доступом. Чип раньше держался на коде
// уровня — два B2 давали повтор ключа, второй курс не выбирался вовсе.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const selfLesson = (id, title) => [{ id, title, type: 'LESSON', mode: 'SELF_STUDY' }]

const CATALOG = [
  {
    id: 1, code: 'A1', label: 'just to study — Elementary A1 · Course', separateAccess: false, locked: false,
    units: [{ id: 1, name: 'Unit 1', lessons: selfLesson(10, 'My biography') }],
  },
  // Business заведён раньше общего B2 и в ответе стоит первым — порядок чипов
  // на это опираться не должен. Название с брендом, как в настоящем каталоге:
  // без его срезания чип читался «B2 just to study».
  {
    id: 4, code: 'B2', label: 'just to study — English for Media & Marketing · B2+/C1', separateAccess: true, locked: false,
    units: [{ id: 40, name: 'Media Unit', lessons: selfLesson(400, 'Press release') }],
  },
  {
    id: 5, code: 'B2', label: 'just to study — Upper-Intermediate B2 · Course', separateAccess: false, locked: false,
    units: [{ id: 3, name: 'Unit 3', lessons: selfLesson(30, 'Future forms') }],
  },
]

async function openSelfStudy(page, catalog = CATALOG) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B2' } })))
  await page.route('**/mobile/course-catalog', (r) => r.fulfill(json(catalog)))
  await page.route('**/mobile/course-catalog/progress', (r) => r.fulfill(json({ completedLessonIds: [] })))
  await page.goto('/?screen=lessons')
  await page.locator('.ls-tab', { hasText: 'Самостоятельно' }).click()
}

test('два курса B2 — два чипа, каждый открывает свой курс', async ({ page }, testInfo) => {
  await openSelfStudy(page)
  const chips = page.locator('.ss .gr-levelchip')

  await expect(chips).toHaveText(['A1', 'B2', 'B2 English for Media & Marketing'])
  // Открывается на общем курсе своего уровня, а не на выданном сбоку.
  await expect(page.locator('.ss .gr-levelchip.on')).toHaveText('B2')
  await expect(page.getByText('Future forms')).toBeVisible()

  const media = page.getByRole('button', { name: 'B2 English for Media & Marketing' })
  await media.focus()
  await page.keyboard.press('Enter')
  await expect(media).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Press release')).toBeVisible()
  await expect(page.getByText('Future forms')).toHaveCount(0)
  // Переходы чипа и появление карточек доигрываются, иначе снимок ловит
  // середину смены выбора.
  await page.screenshot({ path: testInfo.outputPath('self-study-two-b2.png'), fullPage: true, animations: 'disabled' })

  // Выбор второго курса того же уровня переживает возврат на экран.
  await page.reload()
  await page.locator('.ls-tab', { hasText: 'Самостоятельно' }).click()
  await expect(page.locator('.ss .gr-levelchip.on')).toHaveText('B2 English for Media & Marketing')
})

test('закрытый отдельный курс с витриной не ведёт в тарифы', async ({ page }, testInfo) => {
  // Витрину сервер размечает любому закрытому курсу, а отдельный открывает
  // только выдача менеджера — дорога в тарифы вела бы туда, где его нет.
  const catalog = CATALOG.map((c) => (c.id !== 4 ? c : {
    ...c,
    locked: true,
    units: [{
      id: 40,
      name: 'Media Unit',
      lessons: [
        { id: 400, title: 'Press release', type: 'LESSON', mode: 'SELF_STUDY', preview: true },
        { id: 401, title: 'Brand voice', type: 'LESSON', mode: 'SELF_STUDY', preview: false },
      ],
    }],
  }))
  await openSelfStudy(page, catalog)

  await page.getByRole('button', { name: 'B2 English for Media & Marketing' }).click()
  await expect(page.getByText('Курс «English for Media & Marketing» открыт частично')).toBeVisible()
  // Витрина здесь из одного материала: фраза раньше была одна на все числа и
  // читалась «Первые 1 материала».
  await expect(page.locator('.ss-preview__text')).toHaveText(/^1 материал в начале курса можно пройти бесплатно/)
  await expect(page.getByText(/Остальные открывает менеджер/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Смотреть тарифы' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('self-study-separate-preview.png'), fullPage: true, animations: 'disabled' })

  // Закрытый материал никуда не уводит: ученик остаётся в разделе.
  await page.getByText('Brand voice').click()
  await expect(page.locator('.ss .gr-levelchip.on')).toHaveText('B2 English for Media & Marketing')
  // exact: подстрокой та же фраза есть и в полосе над сеткой («Остальные
  // открывает менеджер…»), а нужна подпись именно на карточке.
  await expect(page.getByText('Открывает менеджер', { exact: true })).toBeVisible()
})
