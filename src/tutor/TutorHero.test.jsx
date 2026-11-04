// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import TutorHero from './TutorHero.jsx'
import { TUTORS } from './tutors.js'

vi.mock('../i18n/LanguageContext.jsx', () => ({ useLang: () => ({ t: (key) => key }) }))

describe('TutorHero', () => {
  // Полный портрет 520×520 в кружке 32 px занимал канал на 50 КБ, пока качалось главное лицо страницы.
  it('в кружках «Другие тьюторы» — маленькие лица', () => {
    const dexter = TUTORS.find((t) => t.key === 'dexter')
    const { container } = render(<TutorHero tutor={dexter} />)
    const faces = [...container.querySelectorAll('.tp-hero__face img')]
    expect(faces).toHaveLength(3)
    for (const face of faces) expect(face.getAttribute('src')).toMatch(/^\/tutor\/v2\/mini-[a-z]+\.webp$/)
  })
})
