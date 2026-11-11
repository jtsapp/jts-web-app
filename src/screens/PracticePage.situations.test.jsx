// @vitest-environment jsdom
// Жалоба 11.11.2026 с прода: карточки «Ситуаций» открывались голым роликом с
// кнопкой «Отметить пройденной», а не экраном сценария. На бэкенде (прод и дев)
// ситуативки id 1–50 повторяют сценарии статики (slug situ-<уровень>-<NN>), и
// «Практика» рисовала эти зеркала своими карточками. На деве их прикрывали 10
// сценариев A1 первыми карточками; на проде тестовому ученику админ закрыл
// всё, кроме B1, «Все» брала статику A1 — закрытую, — и оставались одни ролики.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((k) => [k, typeof actual[k] === 'function' ? vi.fn(async () => []) : actual[k]]),
  )
})

vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ loading: false, allowed: true, limit: null, source: 'PLAN', sourceName: null, check: vi.fn() }),
}))

// Уровень статики — тем же файлом, что отдаёт сайт: в jsdom относительный fetch не ходит.
vi.mock('../practice/situations/situationsData.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    loadLevel: vi.fn(async (code) =>
      JSON.parse(readFileSync(resolve(__dirname, `../../public/practice/situations/${code}.json`), 'utf8')).items,
    ),
  }
})

import PracticePage from './PracticePage.jsx'
import { pickLang } from './situations/SituationsCatalog.jsx'

vi.setConfig({ testTimeout: 30_000 })

const STATIC = Object.fromEntries(
  ['a1', 'a2', 'b1', 'b2', 'c1'].map((c) => [
    c,
    JSON.parse(readFileSync(resolve(__dirname, `../../public/practice/situations/${c}.json`), 'utf8')).items,
  ]),
)

// Ответ /mobile/situativki прода для test_student: 50 зеркал, открыт только B1
// (у закрытых бэкенд срезает ролик и миссии).
const PROD = Object.entries(STATIC).flatMap(([code, items], li) =>
  items.map((it, i) => {
    const locked = code !== 'b1'
    return {
      id: li * 10 + i + 1,
      slug: `situ-${code}-${String(it.id).padStart(2, '0')}`,
      level: code.toUpperCase(),
      title: pickLang(it.title, 'en'),
      coverUrl: `https://media/situativki/situ-${code}-${i + 1}-cover.jpg`,
      videoUrl: locked ? null : `https://media/situativki/situ-${code}-${i + 1}-video.mp4`,
      completed: false,
      locked,
    }
  }),
)

// Карточка статики подписана на языке интерфейса (по умолчанию ru).
const titleOf = (t) => pickLang(t, 'ru')

async function renderSituations(situativki, onNav = vi.fn()) {
  const api = await import('../api.js')
  api.getSituativki.mockImplementation(async () => situativki)
  const view = render(
    <I18nProvider>
      <PracticePage userLevel="A2" userName="Тест" token="T" openTarget={{ filter: 'situations' }} onNav={onNav} onProfile={() => {}} />
    </I18nProvider>,
  )
  return { ...view, onNav }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('PracticePage — «Ситуации» и зеркала бэкенда', () => {
  it('прод: на «Все» — десять сценариев B1 экраном сценария, без роликов-дублей', async () => {
    const { container, onNav } = await renderSituations(PROD)
    const want = STATIC.b1.map((s) => titleOf(s.title))
    await waitFor(() => {
      const titles = [...container.querySelectorAll('.pk-situ__title')].map((el) => el.textContent)
      expect(titles).toEqual(want)
    })
    fireEvent.click(container.querySelector('.pk-situ'))
    expect(onNav).toHaveBeenCalledWith('situations', { level: 'b1', id: STATIC.b1[0].id })
    // Окна ситуативки с роликом и «Отметить пройденной» нет.
    expect(document.querySelector('video')).toBeNull()
  })

  it('своя ситуативка методиста по-прежнему рядом со статикой', async () => {
    const own = { id: 900, slug: 'job-interview-own', level: 'B1', title: 'Own Interview', coverUrl: '/c.jpg', videoUrl: '/v.mp4', completed: false, locked: false }
    const { container } = await renderSituations([...PROD, own])
    await waitFor(() => {
      const titles = [...container.querySelectorAll('.pk-situ__title')].map((el) => el.textContent)
      expect(titles).toHaveLength(11)
      expect(titles.at(-1)).toBe('Own Interview')
    })
  })

  it('без замков «Все» — по-прежнему A1', async () => {
    const open = PROD.map((s) => ({ ...s, locked: false }))
    const { container } = await renderSituations(open)
    await waitFor(() => {
      const titles = [...container.querySelectorAll('.pk-situ__title')].map((el) => el.textContent)
      expect(titles).toEqual(STATIC.a1.map((s) => titleOf(s.title)))
    })
  })
})
