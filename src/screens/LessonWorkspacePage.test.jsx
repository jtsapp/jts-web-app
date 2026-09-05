// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
}))

import LessonWorkspacePage from './LessonWorkspacePage.jsx'

const FILE_URL = 'https://files-dev.justtostudy.kz/development/course-catalog/a2/lessons/L01.html'

function show(loadLesson, props = {}) {
  return render(
    <I18nProvider>
      <LessonWorkspacePage
        lessonId={42}
        token="TOK"
        loadLesson={loadLesson}
        onExit={() => {}}
        onNav={() => {}}
        onProfile={() => {}}
        {...props}
      />
    </I18nProvider>,
  )
}

describe('урок в воркспейсе', () => {
  it('урок без разбора на шаги открывается своим материалом', async () => {
    // Две трети уроков каталога не разобраны на шаги — файл курса и есть урок.
    const { container } = show(async () => ({ id: 42, title: 'Getting to know you', fileUrl: FILE_URL, steps: [] }))

    await waitFor(() => expect(container.querySelector('.lw-material-iframe')).toBeTruthy())
    expect(container.querySelector('.lw-material-iframe').getAttribute('src')).toBe(FILE_URL)
  })

  it('не подставляет демо-урок вместо запрошенного', async () => {
    // Раньше здесь стоял `loaded || SAMPLE_LESSON`, и ученик получал чужой
    // демонстрационный урок с заглушкой «Место для баннера» — а читал это как
    // «материал обрезали». Не загрузилось — говорим об этом прямо.
    show(async () => null)

    expect(await screen.findByText(/Не удалось загрузить урок/)).toBeTruthy()
    expect(screen.queryByText('Место для баннера')).toBeNull()
  })

  it('без урока вовсе демо-урок остаётся — это его место', async () => {
    // SAMPLE_LESSON задуман содержимым экрана, открытого без lessonId.
    show(undefined, { lessonId: undefined, loadLesson: async () => null })

    expect(await screen.findByText('Место для баннера')).toBeTruthy()
  })
})
