// @vitest-environment jsdom
// Приём результата из раннера placement. Проверяется договор моста: уровень
// сохраняется по первому сообщению (иначе пройденный тест пропадёт, если
// закрыть вкладку на экране результата), а уводит с экрана только «Let's go».
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import PlacementTestPage from './PlacementTestPage.jsx'

const post = (data) => window.dispatchEvent(new MessageEvent('message', { data }))
const result = (level, extra = {}) => ({ source: 'jts-placement', result: { level, ...extra } })

afterEach(cleanup)

describe('PlacementTestPage', () => {
  it('встраивает раннер и передаёт ему язык интерфейса', () => {
    const { container } = render(<PlacementTestPage lang="kk" />)
    const frame = container.querySelector('iframe')
    expect(frame.getAttribute('src')).toBe('/practice/placement/index.html?lang=kk')
    expect(frame.getAttribute('allow')).toContain('autoplay')
  })

  it('сохраняет уровень сразу по «placement:result», не дожидаясь кнопки', async () => {
    const onLevel = vi.fn()
    const onDone = vi.fn()
    render(<PlacementTestPage onLevel={onLevel} onDone={onDone} />)

    post({ ...result('B2', { theta: 0.7 }), type: 'placement:result' })

    await waitFor(() => expect(onLevel).toHaveBeenCalledWith('B2', expect.objectContaining({ level: 'B2' })))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('«placement:done» уводит с экрана с уже известным уровнем', async () => {
    const onDone = vi.fn()
    render(<PlacementTestPage onLevel={() => {}} onDone={onDone} />)

    post({ ...result('A0'), type: 'placement:result' })
    post({ ...result('A0'), type: 'placement:done' })

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('A0', expect.objectContaining({ level: 'A0' })))
  })

  // Чужие сообщения в окне обычное дело (расширения браузера, виджеты):
  // на них экран реагировать не должен.
  it('сообщения не от раннера игнорируются', async () => {
    const onLevel = vi.fn()
    const onDone = vi.fn()
    render(<PlacementTestPage onLevel={onLevel} onDone={onDone} />)

    post({ source: 'react-devtools', type: 'placement:done', result: { level: 'C2' } })
    post('строка')
    post(null)

    await new Promise((r) => setTimeout(r, 20))
    expect(onLevel).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('незнакомый уровень в профиль не уходит', async () => {
    const onLevel = vi.fn()
    render(<PlacementTestPage onLevel={onLevel} onDone={() => {}} />)

    post({ ...result('D7'), type: 'placement:result' })

    await new Promise((r) => setTimeout(r, 20))
    expect(onLevel).not.toHaveBeenCalled()
  })
})
