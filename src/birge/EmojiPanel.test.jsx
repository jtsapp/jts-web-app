// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import EmojiPanel from './EmojiPanel.jsx'

afterEach(cleanup)

function mount(props = {}) {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(
    <I18nProvider>
      <EmojiPanel recent={[]} onPick={onPick} onClose={onClose} {...props} />
    </I18nProvider>,
  )
  return { onPick, onClose }
}

describe('панель смайликов', () => {
  it('без недавних — восемь вкладок, открыты «Эмоции»', () => {
    mount()
    expect(screen.getAllByRole('tab')).toHaveLength(8)
    expect(screen.getByRole('tab', { name: 'Эмоции' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Эмоции', { selector: '.brg-etitle' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Недавние' })).toBeNull()
  })

  it('с недавними — вкладка «Недавние» первой', () => {
    mount({ recent: ['🎉'] })
    expect(screen.getAllByRole('tab')[0].getAttribute('aria-label')).toBe('Недавние')
  })

  it('выбор зовёт onPick, сама панель не закрывается', () => {
    const { onPick, onClose } = mount()
    fireEvent.click(screen.getByRole('button', { name: '😀' }))
    expect(onPick).toHaveBeenCalledWith('😀')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Смайлики' })).toBeTruthy()
  })

  it('вкладка «Учёба» показывает свой набор', () => {
    mount()
    fireEvent.click(screen.getByRole('tab', { name: 'Учёба' }))
    expect(screen.getByRole('button', { name: '📚' })).toBeTruthy()
    expect(screen.getByText('Учёба', { selector: '.brg-etitle' })).toBeTruthy()
  })

  it('Esc закрывает', () => {
    const { onClose } = mount()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Смайлики' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
