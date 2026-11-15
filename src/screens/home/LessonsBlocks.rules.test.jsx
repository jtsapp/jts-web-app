// @vitest-environment jsdom
// «📄 Правила обучения» в блоке «Уроки с преподавателем» (ТЗ v2.0, 5.4; задача 190): кнопка ведёт во вкладку
// «Правила» «Уроков» — PDF правил у школы нет, правила живут там.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { RulesButton, TeacherLessonsCard } from './LessonsBlocks.jsx'

vi.mock('./useHomeData.js', () => ({ useLessonTopic: () => null }))

describe('Правила обучения на «Главной»', () => {
  it('кнопка открывает «Уроки» на вкладке «Правила»', () => {
    const onNav = vi.fn()
    render(
      <I18nProvider>
        <RulesButton onNav={onNav} />
      </I18nProvider>,
    )
    expect(screen.getByText('Перенос, отмена, заморозка')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Правила обучения/ }))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'rules' })
  })

  it('стоит в «Уроках с преподавателем»', () => {
    render(
      <I18nProvider>
        <TeacherLessonsCard token="T" occurrences={[]} summary={null} homework={[]} homeworkState="ready" onNav={() => {}} />
      </I18nProvider>,
    )
    expect(document.querySelector('.hm-tl [data-testid="home-rules"]')).toBeTruthy()
  })
})
