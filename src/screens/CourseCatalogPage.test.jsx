// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseCatalogPage from './CourseCatalogPage.jsx'

// Каталог открывается с экрана «Уроки», и до появления этой кнопки уйти с него
// можно было только через сайдбар — на узком экране он спрятан в drawer, то есть
// выхода фактически не было.
function renderCatalog(props) {
  return render(
    <I18nProvider>
      <CourseCatalogPage userName="Demo" userLevel="A1" onNav={() => {}} onProfile={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('CourseCatalogPage — выход из каталога', () => {
  it('показывает кнопку выхода, когда передан onBack', () => {
    renderCatalog({ onBack: () => {} })
    expect(screen.getByRole('button', { name: /к урокам/i })).toBeTruthy()
  })

  it('вызывает onBack по клику', () => {
    const onBack = vi.fn()
    renderCatalog({ onBack })
    screen.getByRole('button', { name: /к урокам/i }).click()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('не показывает кнопку, если onBack не передан', () => {
    renderCatalog()
    expect(screen.queryByRole('button', { name: /к урокам/i })).toBeNull()
  })
})
