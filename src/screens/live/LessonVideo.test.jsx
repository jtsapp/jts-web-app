// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, within, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonVideo from './LessonVideo.jsx'

afterEach(cleanup)

const TEACHER = { userId: '140', name: 'Айгерим', audioMuted: false, videoOn: false, isHost: true, speaking: false, isSelf: false }
const DANA = { userId: '141', name: 'Дана', audioMuted: false, videoOn: false, isHost: false, speaking: false, isSelf: false }
const ALI = { userId: '142', name: 'Али', audioMuted: true, videoOn: false, isHost: false, speaking: false, isSelf: true }

function videoState(overrides = {}) {
  return {
    phase: 'connected', fallback: null, deviceError: false, isHost: false,
    tiles: [TEACHER, DANA, ALI], micOn: true, camOn: false,
    join: vi.fn(), leave: vi.fn(), toggleMic: vi.fn(), toggleCamera: vi.fn(),
    muteUser: vi.fn(), muteAll: vi.fn(), removeUser: vi.fn(),
    attachVideo: vi.fn(async () => document.createElement('div')), detachVideo: vi.fn(),
    ...overrides,
  }
}

function renderVideo({ state = {}, lessonType = 'GROUP', enabled = true, renderFallback = () => null } = {}) {
  const video = videoState(state)
  const view = render(
    <I18nProvider>
      <LessonVideo video={video} lessonType={lessonType} enabled={enabled} renderFallback={renderFallback} />
    </I18nProvider>
  )
  return { video, ...view }
}

const tileNames = (container) =>
  [...container.querySelectorAll('figcaption')].map((c) => c.textContent)

describe('LessonVideo — звонок в уроке', () => {
  it('до подключения есть одна кнопка «Подключиться», клик зовёт join', () => {
    const { video } = renderVideo({ state: { phase: 'idle', tiles: [] } })
    fireEvent.click(screen.getByRole('button', { name: 'Подключиться к звонку' }))
    expect(video.join).toHaveBeenCalledTimes(1)
  })

  it('урок закрыт для звонка (enabled=false) — кнопка подключения недоступна', () => {
    renderVideo({ state: { phase: 'idle', tiles: [] }, enabled: false })
    expect(screen.getByRole('button', { name: 'Подключиться к звонку' }).disabled).toBe(true)
  })

  it('подключение показывает два скелета и текст', () => {
    const { container } = renderVideo({ state: { phase: 'connecting', tiles: [] } })
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2)
    expect(screen.getByText('Подключаемся…')).toBeTruthy()
  })

  it('переподключение оставляет плитки и пишет статус', () => {
    const { container } = renderVideo({ state: { phase: 'reconnecting' } })
    expect(screen.getByRole('status').textContent).toBe('Связь прервалась, переподключаемся…')
    expect(container.querySelectorAll('figure')).toHaveLength(3)
  })

  it('хост группы: плитки с учителем первым и кнопки модерации у чужих плиток', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container, video } = renderVideo({ state: { isHost: true, tiles: [TEACHER, DANA, { ...ALI, isSelf: false }] } })
    expect(container.querySelectorAll('figure')).toHaveLength(3)
    expect(tileNames(container)[0]).toContain('Айгерим')
    const dana = screen.getByText('Дана').closest('figure')
    expect(within(dana).getByRole('button', { name: 'Выключить микрофон ученику' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Выключить микрофоны у всех' })).toBeTruthy()
    fireEvent.click(within(dana).getByRole('button', { name: 'Удалить из звонка' }))
    expect(confirm).toHaveBeenCalledWith('Удалить Дана из звонка?')
    expect(video.removeUser).toHaveBeenCalledWith('141')
    fireEvent.click(screen.getByRole('button', { name: 'Выключить микрофоны у всех' }))
    expect(video.muteAll).toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('отказ в подтверждении не удаляет участника', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { video } = renderVideo({ state: { isHost: true } })
    const dana = screen.getByText('Дана').closest('figure')
    fireEvent.click(within(dana).getByRole('button', { name: 'Удалить из звонка' }))
    expect(video.removeUser).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('у выключенного микрофона ученика нет кнопки «выключить», но есть значок', () => {
    renderVideo({ state: { isHost: true, tiles: [TEACHER, { ...DANA, audioMuted: true }] } })
    const dana = screen.getByText('Дана').closest('figure')
    expect(within(dana).queryByRole('button', { name: 'Выключить микрофон ученику' })).toBeNull()
    expect(within(dana).getByRole('img', { name: 'Микрофон выключен' })).toBeTruthy()
  })

  it('не хост: кнопок модерации в DOM нет', () => {
    renderVideo({ state: { isHost: false } })
    expect(screen.queryByRole('button', { name: 'Выключить микрофон ученику' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Удалить из звонка' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Выключить микрофоны у всех' })).toBeNull()
  })

  it('индивидуальный урок — раскладка duo, групповой — grid', () => {
    const duo = renderVideo({ lessonType: 'INDIVIDUAL_STANDARD', state: { tiles: [TEACHER, { ...ALI }] } })
    expect(screen.getByRole('region', { name: 'Звонок урока' }).className).toContain('lw-video--duo')
    duo.unmount()
    renderVideo({ lessonType: 'PAIR' })
    expect(screen.getByRole('region', { name: 'Звонок урока' }).className).toContain('lw-video--grid')
  })

  it('duo: собеседник крупно (medium), своя плитка маленькая (low)', async () => {
    const { video } = renderVideo({
      lessonType: 'TRIAL',
      state: { tiles: [{ ...TEACHER, videoOn: true }, { ...ALI, videoOn: true }] },
    })
    await waitFor(() => expect(video.attachVideo).toHaveBeenCalledTimes(2))
    expect(video.attachVideo).toHaveBeenCalledWith('140', 'medium')
    expect(video.attachVideo).toHaveBeenCalledWith('142', 'low')
  })

  it('duo без собеседника: крупно своя плитка', () => {
    const { container } = renderVideo({ lessonType: 'TRIAL', state: { tiles: [ALI] } })
    expect(container.querySelectorAll('figure')).toHaveLength(1)
    expect(container.querySelector('.lw-video__self')).toBeNull()
  })

  it('сбой связи со ссылкой зовёт renderFallback', () => {
    const renderFallback = vi.fn(() => <p>прежняя карточка</p>)
    renderVideo({ state: { phase: 'failed', fallback: 'link', tiles: [] }, renderFallback })
    expect(renderFallback).toHaveBeenCalled()
    expect(screen.getByText('прежняя карточка')).toBeTruthy()
  })

  it('урок завершён — текст про закрытый звонок', () => {
    renderVideo({ state: { phase: 'failed', fallback: 'ended', tiles: [] } })
    expect(screen.getByText('Урок завершён — звонок закрыт')).toBeTruthy()
  })

  it('отказ в доступе — текст без кнопок', () => {
    renderVideo({ state: { phase: 'failed', fallback: 'denied', tiles: [] } })
    expect(screen.getByText('Не удалось подключиться к звонку')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('обрыв связи (retry) — текст и кнопка «Попробовать снова» зовёт join', () => {
    const { video } = renderVideo({ state: { phase: 'failed', fallback: 'retry', tiles: [] } })
    expect(screen.getByText('Не удалось подключиться к звонку')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }))
    expect(video.join).toHaveBeenCalledTimes(1)
  })

  it('учителя убрали из звонка — текст и кнопка подключиться заново', () => {
    const { video } = renderVideo({ state: { phase: 'removed', tiles: [] } })
    expect(screen.getByText('Преподаватель убрал вас из звонка')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Подключиться к звонку' }))
    expect(video.join).toHaveBeenCalled()
  })

  it('ошибка устройства — role=alert с подсказкой про доступ', () => {
    renderVideo({ state: { deviceError: true } })
    expect(screen.getByRole('alert').textContent).toContain('Нет доступа к камере или микрофону')
  })

  it('кнопка микрофона: подпись следует за micOn, aria-pressed нет, клик зовёт toggleMic', () => {
    const on = renderVideo({ state: { micOn: true } })
    const pressed = screen.getByRole('button', { name: 'Выключить микрофон' })
    expect(pressed.hasAttribute('aria-pressed')).toBe(false)
    fireEvent.click(pressed)
    expect(on.video.toggleMic).toHaveBeenCalled()
    on.unmount()
    renderVideo({ state: { micOn: false } })
    expect(screen.getByRole('button', { name: 'Включить микрофон' }).hasAttribute('aria-pressed')).toBe(false)
  })

  it('кнопка камеры и выхода зовут toggleCamera и leave', () => {
    const { video } = renderVideo({ state: { camOn: false } })
    fireEvent.click(screen.getByRole('button', { name: 'Включить камеру' }))
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из звонка' }))
    expect(video.toggleCamera).toHaveBeenCalled()
    expect(video.leave).toHaveBeenCalled()
    expect(screen.getByRole('toolbar')).toBeTruthy()
  })

  it('grid: «Развернуть» добавляет lw-video--expanded, Escape убирает и возвращает фокус', () => {
    renderVideo()
    const root = screen.getByRole('region', { name: 'Звонок урока' })
    const expand = screen.getByRole('button', { name: 'Развернуть звонок' })
    fireEvent.click(expand)
    expect(root.className).toContain('lw-video--expanded')
    screen.getByRole('button', { name: 'Свернуть звонок' }).focus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(root.className).not.toContain('lw-video--expanded')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Развернуть звонок' }))
  })

  it('развёрнутый вид — модальный диалог, а свёрнутый остаётся регионом', () => {
    renderVideo()
    const root = screen.getByRole('region', { name: 'Звонок урока' })
    expect(root.hasAttribute('aria-modal')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть звонок' }))
    expect(root.getAttribute('role')).toBe('dialog')
    expect(root.getAttribute('aria-modal')).toBe('true')
    expect(root.getAttribute('aria-label')).toBe('Звонок урока')
  })

  it('в развёрнутом виде Tab и Shift+Tab ходят по кругу внутри диалога', () => {
    renderVideo()
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть звонок' }))
    const root = screen.getByRole('dialog')
    const buttons = [...root.querySelectorAll('button')]
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('плитки лежат внутри video-player-container: так требует attachVideo', () => {
    const { container } = renderVideo()
    const host = container.querySelector('video-player-container')
    expect(host).toBeTruthy()
    expect(host.querySelectorAll('figure')).toHaveLength(3)
    expect(host.getAttribute('class')).toContain('lw-video__tiles')
  })

  it('duo: плитки тоже внутри video-player-container', () => {
    const { container } = renderVideo({ lessonType: 'TRIAL', state: { tiles: [TEACHER, ALI] } })
    expect(container.querySelector('video-player-container').querySelectorAll('figure')).toHaveLength(2)
  })

  it('attachVideo вернулся после ухода плитки — поток отсоединяется ещё раз', async () => {
    let resolveAttach
    const attachVideo = vi.fn(() => new Promise((resolve) => { resolveAttach = resolve }))
    const detachVideo = vi.fn()
    const view = renderVideo({ state: { tiles: [{ ...TEACHER, videoOn: true }], attachVideo, detachVideo } })
    await waitFor(() => expect(attachVideo).toHaveBeenCalled())
    view.unmount()
    expect(detachVideo).toHaveBeenCalledTimes(1)
    resolveAttach(document.createElement('div'))
    await waitFor(() => expect(detachVideo).toHaveBeenCalledTimes(2))
  })

  it('duo: кнопки «развернуть» нет', () => {
    renderVideo({ lessonType: 'INDIVIDUAL_PREMIUM', state: { tiles: [TEACHER, ALI] } })
    expect(screen.queryByRole('button', { name: 'Развернуть звонок' })).toBeNull()
  })

  it('плитка с включённым видео вставляет элемент SDK и снимает его при выключении', async () => {
    const el = document.createElement('div')
    el.setAttribute('data-sdk-video', '1')
    const attachVideo = vi.fn(async () => el)
    const detachVideo = vi.fn()
    const view = renderVideo({ state: { tiles: [{ ...TEACHER, videoOn: true }], attachVideo, detachVideo } })
    await waitFor(() => expect(view.container.querySelector('[data-sdk-video]')).toBeTruthy())
    view.unmount()
    expect(detachVideo).toHaveBeenCalledWith('140')
  })

  it('сбой attachVideo не роняет плитку: остаются инициалы', async () => {
    const attachVideo = vi.fn(async () => { throw new Error('boom') })
    const { container } = renderVideo({ state: { tiles: [{ ...TEACHER, videoOn: true }], attachVideo } })
    await waitFor(() => expect(attachVideo).toHaveBeenCalled())
    await waitFor(() => expect(container.querySelector('.lw-video__avatar').textContent).toBe('А'))
  })

  it('attachVideo бросает синхронно (до join) — компонент жив', async () => {
    const attachVideo = vi.fn(() => { throw new Error('not joined') })
    const { container } = renderVideo({ state: { tiles: [{ ...TEACHER, videoOn: true }], attachVideo } })
    await waitFor(() => expect(container.querySelector('.lw-video__avatar').textContent).toBe('А'))
  })

  it('говорящий получает модификатор lw-video__tile--speaking', () => {
    const { container } = renderVideo({ state: { tiles: [{ ...DANA, speaking: true }, TEACHER] } })
    expect(container.querySelectorAll('.lw-video__tile--speaking')).toHaveLength(1)
  })
})
