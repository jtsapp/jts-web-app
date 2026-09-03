// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import TeacherChat from './TeacherChat.jsx'

/**
 * Просили преподаватели: опечатку в чате урока не исправить, лишнее не убрать.
 *
 * Право решает сервер и присылает его при каждом сообщении (`canEdit` /
 * `canDelete`): чат один и тот же у ученика и в панели преподавателя, и
 * правило должно быть одно. Компонент только не рисует кнопку, которая всё
 * равно не сработает.
 */
function renderChat(props = {}) {
  return render(
    <I18nProvider>
      <TeacherChat messages={[]} onSend={() => {}} {...props} />
    </I18nProvider>
  )
}

const mine = { id: 1, from: 'student', text: 'Превет', canEdit: true, canDelete: true }
const theirs = { id: 2, from: 'teacher', text: 'Здравствуйте', canEdit: false, canDelete: true }

describe('TeacherChat — правка и удаление', () => {
  it('кнопки видны только там, где сервер разрешил', () => {
    renderChat({ messages: [mine, theirs], onEdit: vi.fn(), onDelete: vi.fn() })
    expect(screen.getAllByRole('button', { name: 'Изменить' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Удалить' })).toHaveLength(2)
  })

  // Обработчика нет — значит вызывающий эту возможность не подключал, и обещать
  // её кнопкой нельзя, даже когда сервер прав не отнимал.
  it('без обработчиков кнопок нет вовсе', () => {
    renderChat({ messages: [mine] })
    expect(screen.queryByRole('button', { name: 'Изменить' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Удалить' })).toBeNull()
  })

  it('правка отдаёт новый текст и закрывает поле', () => {
    const onEdit = vi.fn()
    renderChat({ messages: [mine], onEdit })

    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const input = screen.getByDisplayValue('Превет')
    fireEvent.change(input, { target: { value: '  Привет  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(onEdit).toHaveBeenCalledWith(1, 'Привет')
    expect(screen.queryByDisplayValue('Привет')).toBeNull()
  })

  it('отмена ничего не отправляет и возвращает прежний текст', () => {
    const onEdit = vi.fn()
    renderChat({ messages: [mine], onEdit })

    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    fireEvent.change(screen.getByDisplayValue('Превет'), { target: { value: 'другое' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByText('Превет')).toBeTruthy()
  })

  // Пустой текст без фотографии — это удаление, а у него другие права.
  it('пустая правка сообщения без фотографии не отправляется', () => {
    const onEdit = vi.fn()
    renderChat({ messages: [mine], onEdit })

    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    fireEvent.change(screen.getByDisplayValue('Превет'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(onEdit).not.toHaveBeenCalled()
  })

  it('удаление отдаёт id сообщения', () => {
    const onDelete = vi.fn()
    renderChat({ messages: [theirs], onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDelete).toHaveBeenCalledWith(2)
  })

  // Исправленную задним числом фразу нельзя показывать как сказанную изначально.
  it('правленое сообщение подписано', () => {
    renderChat({ messages: [{ ...mine, edited: true }] })
    expect(screen.getByText('изменено')).toBeTruthy()
  })
})
