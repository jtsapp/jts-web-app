// @vitest-environment jsdom
// Ревью 08.10.2026: в свободном письме (без жанра) «Доработать текст» на экране
// результата открывало пустой Блокнот — WritingPad всегда заводил новый
// черновик, и проверенный текст был виден только через «Мои работы», а пустые
// черновики копились и вытесняли старые (MAX_DRAFTS). Блокнот, открытый с id
// черновика, обязан продолжить именно его.
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import WritingPad from './WritingPad.jsx'
import { saveDraft, draftsAll } from '../../practice/writing/writingStore.js'

describe('WritingPad — продолжение черновика', () => {
  beforeEach(() => localStorage.clear())

  it('с draftId открывает тот же черновик, а не новый пустой', () => {
    saveDraft({
      id: 'd-free-1',
      genreId: 'free',
      genreTitle: 'Free writing',
      levelId: 'free',
      title: 'Free writing',
      html: '<p>My trip to Almaty was long.</p>',
      text: 'My trip to Almaty was long.',
      words: 6,
      checks: {},
      assessment: null,
    })
    const view = render(
      <I18nProvider>
        <WritingPad genre={null} meta={{ rules: {} }} level={null} draftId="d-free-1" onResult={() => {}} onBack={() => {}} />
      </I18nProvider>,
    )
    expect(view.container.querySelector('.wr-editor').textContent).toContain('My trip to Almaty')
    // И пустой черновик-двойник не завёлся.
    expect(draftsAll()).toHaveLength(1)
  })
})
