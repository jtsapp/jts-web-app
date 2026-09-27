// @vitest-environment jsdom
//
// Рамка файлового урока и стадии: сообщение `stage` от скрипта в файле уходит
// наверх, переход на стадию уходит вниз — тем же контрактом, что у рабочей
// области преподавателя в web-admin (см. lessonStages.js).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import SectionMaterialFrame, { LOAD_SETTLE_MS } from './SectionMaterialFrame.jsx'

const MATERIAL = { id: 1, materialId: 11, title: 'A0 · Урок 05', materialType: 'INTERACTIVE_HTML', fileUrl: 'https://files/L05.html' }

function frame(props) {
  return (
    <I18nProvider>
      <SectionMaterialFrame lessonId={14} token="t" material={MATERIAL} isStaff={false} {...props} />
    </I18nProvider>
  )
}

function renderFrame(props = {}) {
  const ref = createRef()
  const view = render(frame({ ref, ...props }))
  return { ...view, ref, iframe: view.container.querySelector('iframe') }
}

function message(data) {
  return act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data }))
  })
}

/** Рамка загрузилась и осела — теперь ей можно писать. */
async function settle(iframe) {
  await act(async () => { iframe.dispatchEvent(new Event('load')) })
  await act(async () => { vi.advanceTimersByTime(LOAD_SETTLE_MS) })
}

describe('SectionMaterialFrame — стадии файлового урока', () => {
  it('сообщение stage от рамки уходит наверх как {index, total}', async () => {
    const onStage = vi.fn()
    renderFrame({ onStage })
    await message({ source: 'jts-lesson', type: 'stage', index: 3, total: 7 })
    expect(onStage).toHaveBeenCalledWith({ index: 3, total: 7 }, { own: false })
  })

  it('за стадию не принимаются чужие сообщения, а мост работает как раньше', async () => {
    const onStage = vi.fn()
    const onMirror = vi.fn()
    renderFrame({ onStage, onMirror })
    await message({ source: 'jts-bridge', type: 'mirror', selector: '#a', eventType: 'click' })
    await message({ source: 'jts-lesson', type: 'stage', index: 'x' })
    expect(onStage).not.toHaveBeenCalled()
    // Зеркало ученика дошло: ветка стадий стоит перед мостом и не глотает его.
    expect(onMirror).toHaveBeenCalledWith({ selector: '#a', eventType: 'click', value: null })
  })

  it('gotoStage шлёт осевшей рамке goto-stage от имени рабочей области', async () => {
    vi.useFakeTimers()
    const { ref, iframe } = renderFrame()
    await settle(iframe)
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => {
      ref.current.gotoStage(4)
    })
    expect(post).toHaveBeenCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 4 }, '*')
    vi.useRealTimers()
  })
})

// Стадию в рамке преподавателя двигает не только он: мост проигрывает
// сохранённую работу ученика и зеркалит его клики, страница сама сообщает, где
// открылась, а restoreStage доводит рамку до нужной стадии. Своей стадия
// считается только сразу после его действия (stage-rule-exact.md): разовый
// признак взводят доверенный клик или ввод (present-event) и свой переход по
// стадиям, гасит первый же отчёт о стадии, и через 500 мс он истекает.
describe('SectionMaterialFrame — стадия как действие преподавателя', () => {
  afterEach(() => vi.useRealTimers())

  const stage = (index) => message({ source: 'jts-lesson', type: 'stage', index, total: 7 })
  const presentEvent = (eventType = 'click') => message({ source: 'jts-bridge', type: 'present-event', selector: '#rail > button', eventType })
  const ownFlags = (onStage) => onStage.mock.calls.map(([, { own }]) => own)
  const wait = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
  const goto = (index) => [{ source: 'jts-workspace', type: 'goto-stage', index }, '*']

  it('после своего клика стадия его, следующая подряд (проигрывание, зеркало) — уже нет', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    renderFrame({ isStaff: true, reviewStudentId: 7, onStage })

    await stage(0)
    await stage(2)
    await presentEvent()
    await wait(400)
    await stage(3)
    await stage(4)

    expect(ownFlags(onStage)).toEqual([false, false, true, false])
  })

  it('стадия позже 500 мс после клика — не его', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    renderFrame({ isStaff: true, reviewStudentId: 7, onStage })

    await presentEvent()
    await wait(501)
    await stage(3)

    expect(ownFlags(onStage)).toEqual([false])
  })

  // isTrusted прокрутку не отличает от программной (её роняют и переходы,
  // проигранные мостом), поэтому она признак не взводит.
  it('прокрутка — не действие преподавателя', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    renderFrame({ isStaff: true, reviewStudentId: 7, onStage })

    await presentEvent('scroll')
    await stage(2)

    expect(ownFlags(onStage)).toEqual([false])
  })

  // До осадки goto-stage пропал бы, а признак остался бы стоять — и своей
  // посчиталась бы стадия открытия новой страницы.
  it('свой переход до осадки отложен; стадия открытия — не его, стадия перехода — его', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { ref, container, rerender } = renderFrame({ isStaff: true, reviewStudentId: 7, onStage })
    await settle(container.querySelector('iframe'))

    rerender(frame({ ref, isStaff: true, reviewStudentId: 8, onStage }))
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    act(() => { ref.current.gotoStage(4) })
    expect(post).not.toHaveBeenCalled()
    await stage(0)

    await settle(fresh)
    expect(post).toHaveBeenCalledWith(...goto(4))
    await stage(4)

    expect(ownFlags(onStage)).toEqual([false, true])
  })

  it('новый документ в рамке — взведённый признак сброшен', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { rerender } = renderFrame({ isStaff: true, reviewStudentId: 7, onStage })
    await presentEvent()

    rerender(frame({ isStaff: true, reviewStudentId: 7, reloadToken: 1, onStage }))
    await stage(0)

    expect(ownFlags(onStage)).toEqual([false])
  })

  // Доводка (класса после F5, своей после «Внимания») — не действие
  // преподавателя. Мост передаёт её синтетический клик по рельсу наверх тем же
  // present-event: этот отголосок признак не взводит и классу не уходит — класс
  // уже на этой стадии.
  it('доводка ждёт осадки; её стадия не его, отголосок признак не взводит и дальше не идёт', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const onPresentEvent = vi.fn()
    const { ref, iframe } = renderFrame({ isStaff: true, presenting: true, reviewStudentId: 7, onStage, onPresentEvent })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    act(() => { ref.current.restoreStage(3) })
    expect(post).not.toHaveBeenCalled()
    await settle(iframe)
    expect(post).toHaveBeenCalledWith(...goto(3))

    await stage(3)
    await presentEvent()
    await stage(5)

    expect(ownFlags(onStage)).toEqual([false, false])
    expect(onPresentEvent).not.toHaveBeenCalled()
  })

  // Отголоска может не быть (у файла нет рельса, мост ещё не слушает) — тогда
  // окно не должно съесть настоящий клик.
  it('клик позже 1 с после доводки — его действие', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const onPresentEvent = vi.fn()
    const { ref, iframe } = renderFrame({ isStaff: true, presenting: true, reviewStudentId: 7, onStage, onPresentEvent })
    act(() => { ref.current.restoreStage(3) })
    await settle(iframe)

    await wait(1_001)
    await presentEvent()
    await stage(5)

    expect(ownFlags(onStage)).toEqual([true])
    expect(onPresentEvent).toHaveBeenCalledTimes(1)
  })
})

// Стадия класса (спека live-lesson-server-state §7): следующий ученик идёт за
// стадией преподавателя. Рамка, которая ещё грузится, сообщение потеряла бы
// молча — поэтому стадия ждёт загрузки и уходит заново после каждой.
describe('SectionMaterialFrame — стадия класса', () => {
  afterEach(() => vi.useRealTimers())

  const gotoStage = (index) => [{ source: 'jts-workspace', type: 'goto-stage', index }, '*']

  it('до загрузки не шлёт, после осадки — шлёт', async () => {
    vi.useFakeTimers()
    const { iframe } = renderFrame({ stage: 3 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    expect(post).not.toHaveBeenCalled()

    await settle(iframe)

    expect(post).toHaveBeenCalledWith(...gotoStage(3))
  })

  it('смена стадии у открытой рамки уходит сразу', async () => {
    vi.useFakeTimers()
    const { iframe, rerender } = renderFrame({ stage: 3 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    await settle(iframe)
    post.mockClear()

    rerender(frame({ stage: 4 }))

    expect(post).toHaveBeenCalledWith(...gotoStage(4))
  })

  // Явная указка перезагружает рамку (reloadToken) — стадия уходит в новую.
  it('после перезагрузки рамки стадия уходит заново', async () => {
    vi.useFakeTimers()
    const { container, iframe, rerender } = renderFrame({ stage: 3 })
    await settle(iframe)

    rerender(frame({ stage: 3, reloadToken: 1 }))
    const reloaded = container.querySelector('iframe')
    const post = vi.spyOn(reloaded.contentWindow, 'postMessage')
    expect(post).not.toHaveBeenCalled()

    await settle(reloaded)
    expect(post).toHaveBeenCalledWith(...gotoStage(3))
  })

  it('без стадии класса рамке ничего не шлёт', async () => {
    vi.useFakeTimers()
    const { iframe } = renderFrame({ stage: null })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    await settle(iframe)

    expect(post).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'goto-stage' }), '*')
  })
})

// Снимок рамки преподавателя и его живые действия — разные вещи: снимок идёт
// ответом на просьбу, и странице надо знать, кому его отдать (классу или
// одному догоняющему ученику).
describe('SectionMaterialFrame — снимок и живой показ', () => {
  afterEach(() => vi.useRealTimers())

  const message = (data) => act(async () => { window.dispatchEvent(new MessageEvent('message', { data })) })

  // Запрос в рамку, которая ещё грузится, пропал бы молча, а очередь ответов
  // ждала бы его до истечения.
  it('запрос снимка до осадки рамки уходит после неё', async () => {
    vi.useFakeTimers()
    const { ref, iframe } = renderFrame({ isStaff: true, presenting: true })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    act(() => { ref.current.requestSnapshot() })
    expect(post).not.toHaveBeenCalled()

    await settle(iframe)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'request-snapshot' }, '*')
  })

  it('снимок уходит в onSnapshot, живое действие — в onPresentEvent', async () => {
    const onSnapshot = vi.fn()
    const onPresentEvent = vi.fn()
    renderFrame({ isStaff: true, presenting: true, onSnapshot, onPresentEvent })
    const events = [{ selector: '#a', eventType: 'click', value: null }]

    await message({ source: 'jts-bridge', type: 'snapshot', events })
    await message({ source: 'jts-bridge', type: 'present-event', selector: '#b', eventType: 'input', value: 'x' })

    expect(onSnapshot).toHaveBeenCalledWith(events)
    expect(onPresentEvent).toHaveBeenCalledTimes(1)
    expect(onPresentEvent).toHaveBeenCalledWith([{ selector: '#b', eventType: 'input', value: 'x' }])
  })
})

// Адрес рамки зависит не только от материала и перезагрузки: у ученика — от
// страницы следования, у преподавателя — от ученика, чей экран он смотрит.
// Сменилось любое из них — в рамке открывается новый документ, и отметки
// загрузки прошлого к нему не относятся.
describe('SectionMaterialFrame — новый документ в рамке', () => {
  afterEach(() => vi.useRealTimers())

  const stage = (index) => message({ source: 'jts-lesson', type: 'stage', index, total: 7 })

  it('сменился ученик для просмотра — стадия новой страницы не действие преподавателя', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { rerender } = renderFrame({ isStaff: true, reviewStudentId: 7, onStage })
    await message({ source: 'jts-bridge', type: 'present-event', selector: '#a', eventType: 'click' })

    rerender(frame({ isStaff: true, reviewStudentId: 8, onStage }))
    await stage(0)

    expect(onStage).toHaveBeenLastCalledWith({ index: 0, total: 7 }, { own: false })
  })

  // Таймер осадки прошлой страницы, сработав уже после смены документа, отметил
  // бы новую осевшей раньше времени — и ей стали бы писать до её загрузки.
  it('осадка прошлого документа новому не засчитывается', async () => {
    vi.useFakeTimers()
    const { ref, container, rerender } = renderFrame({ follow: true })
    const old = container.querySelector('iframe')
    await act(async () => { old.dispatchEvent(new Event('load')) })

    rerender(frame({ ref, follow: true, reloadToken: 1 }))
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    await act(async () => { vi.advanceTimersByTime(LOAD_SETTLE_MS) })
    act(() => { ref.current.setHiddenKeys(['s1']) })
    expect(post).not.toHaveBeenCalled()

    await settle(fresh)
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['s1'] }, '*')
  })

  // Поздний вход ученика включает страницу следования без перезагрузки: ответ
  // на просьбу догнать класс, ушедший в прежний документ, пропал бы вместе с ним.
  it('включилась страница следования — реплей ждёт загрузки новой страницы', async () => {
    vi.useFakeTimers()
    const { ref, container, rerender } = renderFrame({ follow: false })
    await settle(container.querySelector('iframe'))

    rerender(frame({ ref, follow: true }))
    const followPage = container.querySelector('iframe')
    const post = vi.spyOn(followPage.contentWindow, 'postMessage')
    const events = [{ selector: '#a', eventType: 'click', value: null }]
    act(() => { ref.current.replay(events) })
    expect(post).not.toHaveBeenCalled()

    await settle(followPage)
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'present', events }, '*')
  })
})
