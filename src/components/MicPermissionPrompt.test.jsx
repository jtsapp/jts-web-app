// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MicPermissionPrompt from './MicPermissionPrompt.jsx'

// Плашка общая у звонка тьютору и у Луны: у тьютора она та же, что была (стрелка к адресной строке, кнопка и
// подсказка, без «Не сейчас»), у Луны — ещё запрет в браузере и шаги.
afterEach(cleanup)

describe('MicPermissionPrompt', () => {
  it('просьба: стрелка к адресной строке, кнопка зовёт onAllow, «Не сейчас» нет без onClose', () => {
    const onAllow = vi.fn()
    const { container } = render(<MicPermissionPrompt hint="Дайте разрешение" allowLabel="Разрешить, когда я на сайте" onAllow={onAllow} />)
    const box = screen.getByRole('dialog', { name: 'Дайте разрешение' })
    expect(box.dataset.micPerm).toBe('ask')
    expect(container.querySelector('.t-micperm__chip--arrow')).not.toBeNull()
    expect(container.querySelector('.t-micperm__close')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Разрешить, когда я на сайте' }))
    expect(onAllow).toHaveBeenCalledTimes(1)
  })

  it('запрет: без стрелки, шаги внутри, «Не сейчас» зовёт onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MicPermissionPrompt blocked hint="Заблокирован" allowLabel="Попробовать снова" onAllow={() => {}} closeLabel="Не сейчас" onClose={onClose} className="asst__micperm">
        <ol>
          <li>Шаг</li>
        </ol>
      </MicPermissionPrompt>,
    )
    const box = screen.getByRole('dialog', { name: 'Заблокирован' })
    expect(box.dataset.micPerm).toBe('blocked')
    expect(box.classList.contains('asst__micperm')).toBe(true)
    expect(container.querySelector('.t-micperm__chip--arrow')).toBeNull()
    expect(screen.getByText('Шаг')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Не сейчас' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
