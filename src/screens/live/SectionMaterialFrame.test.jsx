// @vitest-environment jsdom
//
// Рамка файлового урока и стадии: сообщение `stage` от скрипта в файле уходит
// наверх, переход на стадию уходит вниз — тем же контрактом, что у рабочей
// области преподавателя в web-admin (см. lessonStages.js).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { StrictMode, createRef, useEffect, useLayoutEffect } from 'react'
import { render, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import SectionMaterialFrame, { LOAD_SETTLE_MS } from './SectionMaterialFrame.jsx'
import { GOTO_LESSON_MS } from './lessonStages.js'

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
    const { ref, iframe } = renderFrame()
    await message({ source: 'jts-lesson', type: 'stage', index: 0, total: 7 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => {
      ref.current.gotoStage(4)
    })
    expect(post).toHaveBeenCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 4 }, '*')
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
  // Осела для своего перехода = движок сообщил первую стадию документа (как в
  // web-admin): его слушатель goto-stage уже стоит.
  it('свой переход до осадки отложен до первой стадии документа; стадия открытия — не его', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { ref, container, rerender } = renderFrame({ isStaff: true, reviewStudentId: 7, onStage })
    await settle(container.querySelector('iframe'))
    await stage(0)

    rerender(frame({ ref, isStaff: true, reviewStudentId: 8, onStage }))
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    act(() => { ref.current.gotoStage(4) })
    expect(post).not.toHaveBeenCalled()

    await stage(0)
    expect(post).toHaveBeenCalledWith(...goto(4))
    await stage(4)

    expect(ownFlags(onStage)).toEqual([false, false, true])
  })

  it('отложенный свой переход уходит, даже если рамка уже на этой стадии', async () => {
    const { ref, iframe } = renderFrame({ isStaff: true, reviewStudentId: 7 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => { ref.current.gotoStage(0) })

    await stage(0)

    expect(post).toHaveBeenCalledWith(...goto(0))
  })

  // Отложенный переход — для страницы, на которой его выбрали: новой (другой
  // ученик, другой материал) он не указ.
  it('отложенный свой переход сбрасывается со сменой документа', async () => {
    vi.useFakeTimers()
    const { ref, container, rerender } = renderFrame({ isStaff: true, reviewStudentId: 7 })
    act(() => { ref.current.gotoStage(4) })

    rerender(frame({ ref, isStaff: true, reviewStudentId: 7, reloadToken: 1 }))
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    await stage(0)
    await settle(fresh)

    expect(post).not.toHaveBeenCalledWith(...goto(4))
  })

  it.each([
    ['доводка, потом свой', (frameRef) => { frameRef.restoreStage(3); frameRef.gotoStage(4) }],
    ['свой, потом доводка', (frameRef) => { frameRef.gotoStage(4); frameRef.restoreStage(3) }],
  ])('свой переход важнее доводки (%s)', async (_, request) => {
    vi.useFakeTimers()
    const { ref, iframe } = renderFrame({ isStaff: true, reviewStudentId: 7 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => { request(ref.current) })

    await stage(0)
    await settle(iframe)

    expect(post).toHaveBeenCalledWith(...goto(4))
    expect(post).not.toHaveBeenCalledWith(...goto(3))
  })

  // Мост передаёт синтетический клик по рельсу наверх и после своего перехода:
  // это тот же отголосок, что у доводки. Стадию классу отдаёт сам переход.
  it('отголосок своего перехода признак не взводит и дальше не идёт', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const onPresentEvent = vi.fn()
    const { ref } = renderFrame({ isStaff: true, presenting: true, reviewStudentId: 7, onStage, onPresentEvent })
    await stage(0)

    act(() => { ref.current.gotoStage(4) })
    await stage(4)
    await presentEvent()
    await stage(5)

    expect(ownFlags(onStage)).toEqual([false, true, false])
    expect(onPresentEvent).not.toHaveBeenCalled()
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

  // Новая страница может загрузиться раньше, чем отработают эффекты рендера:
  // сброс по смене документа тогда снял бы уже её таймер осадки, и рамка не
  // осела бы никогда. Поэтому сброс — в эффекте раскладки, до событий браузера.
  it('load новой страницы до эффектов рендера не теряет её осадку', async () => {
    vi.useFakeTimers()
    // Обёртка грузит новую страницу из своего эффекта раскладки: он идёт после
    // эффектов раскладки рамки, но раньше всех обычных эффектов.
    let loadEarly = null
    function LoadsEarly({ children }) {
      useLayoutEffect(() => { loadEarly?.() })
      return children
    }
    const ref = createRef()
    const view = (reloadToken) => (
      <I18nProvider>
        <LoadsEarly>
          <SectionMaterialFrame ref={ref} lessonId={14} token="t" material={MATERIAL} isStaff={false} reloadToken={reloadToken} />
        </LoadsEarly>
      </I18nProvider>
    )
    const { container, rerender } = render(view(0))
    await settle(container.querySelector('iframe'))

    loadEarly = () => {
      loadEarly = null
      container.querySelector('iframe').dispatchEvent(new Event('load'))
    }
    act(() => { rerender(view(1)) })
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    await act(async () => { vi.advanceTimersByTime(LOAD_SETTLE_MS) })
    act(() => { ref.current.setHiddenKeys(['s1']) })

    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['s1'] }, '*')
  })

  // Таймер осадки прошлой страницы, сработав уже после смены документа, отметил
  // бы новую осевшей раньше времени — и ей стали бы писать до её загрузки.
  it('осадка прошлого документа новому не засчитывается', async () => {
    vi.useFakeTimers()
    const { ref, container, rerender } = renderFrame()
    const old = container.querySelector('iframe')
    await act(async () => { old.dispatchEvent(new Event('load')) })

    rerender(frame({ ref, reloadToken: 1 }))
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    await act(async () => { vi.advanceTimersByTime(LOAD_SETTLE_MS) })
    act(() => { ref.current.setHiddenKeys(['s1']) })
    expect(post).not.toHaveBeenCalled()

    await settle(fresh)
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['s1'] }, '*')
  })

  // Указка «Перенести ученика сюда» на другой материал: страница уже стоит,
  // рамка нового материала монтируется в обновлении, и указка уходит в неё в
  // том же коммите. В разработке StrictMode повторяет эффекты только что
  // смонтированной рамки (не страницы) — сброс на повторе стирал указку (стенд 06.10).
  it('повтор эффектов новой рамки (StrictMode) не стирает реплей, отданный в том же коммите', async () => {
    vi.useFakeTimers()
    const events = [{ selector: '[data-tid="voc-match"]', eventType: 'point', value: null }]
    const ref = createRef()
    function Page({ open }) {
      useEffect(() => { if (open) ref.current.replay(events) }, [open])
      return open ? <SectionMaterialFrame ref={ref} lessonId={14} token="t" material={MATERIAL} isStaff={false} /> : null
    }
    const tree = (open) => <StrictMode><I18nProvider><Page open={open} /></I18nProvider></StrictMode>
    const { container, rerender } = render(tree(false))

    act(() => { rerender(tree(true)) })
    const iframe = container.querySelector('iframe')
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    await settle(iframe)

    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'present', events }, '*')
  })
})

// Когда рамка открывается заново. Страницу урока сервер отдаёт по занятию и материалу, и мост с
// backend#222 одинаков в своём уроке и при следовании за классом. Новый документ — только когда
// меняется сама страница: материал, урок файла, перезагрузка или ученик, чей экран смотрит
// преподаватель. Дев 08.10.2026, урок 134: рамка ученика открывалась заново на каждом уходе от
// класса и при переходе на плитку того же файла в другом разделе.
describe('SectionMaterialFrame — когда рамка открывается заново', () => {
  it('плитка того же материала в другом разделе — тот же документ', () => {
    const { ref, container, rerender } = renderFrame()
    const page = container.querySelector('iframe')

    rerender(frame({ ref, material: { ...MATERIAL, id: 2 } }))

    expect(container.querySelector('iframe')).toBe(page)
  })

  it('другой урок того же файла — новая страница', () => {
    const { ref, container, rerender } = renderFrame({ material: { ...MATERIAL, focusLessonNo: 5 } })
    const page = container.querySelector('iframe')

    rerender(frame({ ref, material: { ...MATERIAL, id: 2, focusLessonNo: 6 } }))

    expect(container.querySelector('iframe')).not.toBe(page)
  })
})

// Материал занятия с номером урока (focusLessonNo): файл открывает этот урок
// goto-lesson'ом уже после загрузки и переписывает разметку. Реплей показа,
// стадия класса и доводка, ушедшие раньше, достались бы уроку, который сейчас
// сменится, и пропали бы вместе с ним.
describe('SectionMaterialFrame — урок файла открывается после загрузки', () => {
  afterEach(() => vi.useRealTimers())

  it('реплей и стадия класса уходят после goto-lesson', async () => {
    vi.useFakeTimers()
    const { ref, iframe } = renderFrame({ material: { ...MATERIAL, focusLessonNo: 5 }, stage: 3 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    const events = [{ selector: '#a', eventType: 'click', value: null }]
    act(() => { ref.current.replay(events) })

    await act(async () => { iframe.dispatchEvent(new Event('load')) })
    await act(async () => { vi.advanceTimersByTime(LOAD_SETTLE_MS) })
    expect(post).not.toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'present', events }, '*')

    await act(async () => { vi.advanceTimersByTime(GOTO_LESSON_MS) })
    const types = post.mock.calls.map(([m]) => m.type)
    expect(types).toEqual(['goto-lesson', 'present', 'goto-stage'])
  })

  const LESSON_MATERIAL = { ...MATERIAL, focusLessonNo: 5 }
  const load = (iframe) => act(async () => { iframe.dispatchEvent(new Event('load')) })
  const wait = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
  const types = (post) => post.mock.calls.map(([m]) => m.type)

  // Живой показ или ответ на «догоните», пришедший в загруженную рамку до
  // goto-lesson, достался бы уроку по умолчанию.
  it('показ, пришедший после загрузки, но до урока занятия, ждёт его', async () => {
    vi.useFakeTimers()
    const { ref, iframe } = renderFrame({ material: LESSON_MATERIAL })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    const events = [{ selector: '#a', eventType: 'click', value: null }]

    await load(iframe)
    await wait(100)
    act(() => { ref.current.replay(events) })
    expect(post).not.toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'present', events }, '*')

    await wait(GOTO_LESSON_MS + LOAD_SETTLE_MS)
    expect(types(post)).toEqual(['goto-lesson', 'present'])
  })

  // Отчёт о стадии урока по умолчанию — ещё не готовность: свой переход ушёл
  // бы не в тот урок, а признак «своё» отдал бы классу чужую стадию.
  it('свой переход, выбранный до урока занятия, уходит после него и считается своим', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { ref, iframe } = renderFrame({ material: LESSON_MATERIAL, isStaff: true, reviewStudentId: 7, onStage })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => { ref.current.gotoStage(4) })

    await message({ source: 'jts-lesson', type: 'stage', index: 0, total: 7 })
    await load(iframe)
    expect(types(post)).toEqual([])

    await wait(GOTO_LESSON_MS + LOAD_SETTLE_MS)
    expect(types(post)).toEqual(['goto-lesson', 'goto-stage'])
    expect(post).toHaveBeenLastCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 4 }, '*')
    await message({ source: 'jts-lesson', type: 'stage', index: 4, total: 7 })

    expect(onStage.mock.calls.map(([, { own }]) => own)).toEqual([false, true])
  })

  it('доводка и запрос снимка ждут урока занятия', async () => {
    vi.useFakeTimers()
    const { ref, iframe } = renderFrame({ material: LESSON_MATERIAL, isStaff: true, presenting: true, reviewStudentId: 7 })
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    await load(iframe)
    await wait(LOAD_SETTLE_MS)

    act(() => {
      ref.current.restoreStage(3)
      ref.current.requestSnapshot()
    })
    expect(types(post)).toEqual([])

    await wait(GOTO_LESSON_MS)
    expect(types(post)).toEqual(['goto-lesson', 'goto-stage', 'request-snapshot'])
  })

  // Таймер goto-lesson прошлой страницы, сработав после смены документа, открыл
  // бы урок в ещё не загруженной новой.
  it('goto-lesson прошлой страницы в новую не уходит', async () => {
    vi.useFakeTimers()
    const { ref, container, rerender } = renderFrame({ material: LESSON_MATERIAL })
    await load(container.querySelector('iframe'))

    rerender(frame({ ref, material: LESSON_MATERIAL, reloadToken: 1 }))
    const fresh = container.querySelector('iframe')
    const post = vi.spyOn(fresh.contentWindow, 'postMessage')
    await wait(GOTO_LESSON_MS)

    expect(types(post)).toEqual([])
  })
})


// Лоадер рамки (видео владельца 03.10): после выбора урока и после «Перенести
// ученика сюда» рамка секундами стояла пустым белым листом, а затем на глазах
// проигрывала поток преподавателя — стадии мелькали одна за другой. Лоадер
// закрывает рамку, пока она грузится и пока мост проигрывает пачку; одиночное
// живое действие его не вызывает.
describe('SectionMaterialFrame — лоадер', () => {
  afterEach(() => vi.useRealTimers())

  const cover = (container) => container.querySelector('.lw-frame-cover')
  const shown = (container) => !cover(container).classList.contains('is-hidden')
  const replayState = (busy, size) => message({ source: 'jts-bridge', type: 'replay', busy, size })
  const EVENTS = [
    { selector: '#a', eventType: 'click', value: null },
    { selector: 'window', eventType: 'stage', value: '2' },
    { selector: 'window', eventType: 'scroll', value: '0' },
  ]

  it('пока рамка грузится — «Загружаем урок…», после осадки скрыт', async () => {
    vi.useFakeTimers()
    const { container, iframe } = renderFrame()
    expect(shown(container)).toBe(true)
    expect(cover(container).textContent).toContain('Загружаем урок')
    expect(container.querySelector('.lw-material-frame').getAttribute('aria-busy')).toBe('true')

    await settle(iframe)

    expect(shown(container)).toBe(false)
    expect(cover(container).getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.lw-material-frame').getAttribute('aria-busy')).toBe('false')
  })

  it('пачка показа, дождавшаяся загрузки, — «Переходим к преподавателю…» до сигнала моста «свободен»', async () => {
    vi.useFakeTimers()
    const { ref, container, iframe } = renderFrame()
    act(() => { ref.current.replay(EVENTS) })

    await settle(iframe)
    expect(shown(container)).toBe(true)
    expect(cover(container).textContent).toContain('Переходим к преподавателю')

    await replayState(true, 3)
    expect(shown(container)).toBe(true)
    await replayState(false, 0)
    expect(shown(container)).toBe(false)
  })

  it('без сигнала моста (старый бэкенд) лоадер догона снимается сам, по длине пачки', async () => {
    vi.useFakeTimers()
    const { ref, container, iframe } = renderFrame()
    act(() => { ref.current.replay(EVENTS) })
    await settle(iframe)
    expect(shown(container)).toBe(true)

    await act(async () => { vi.advanceTimersByTime(EVENTS.length * 80 + 1000) })

    expect(shown(container)).toBe(false)
  })

  it('одиночное живое действие лоадер не показывает', async () => {
    vi.useFakeTimers()
    const { container, iframe } = renderFrame()
    await settle(iframe)

    await replayState(true, 1)
    expect(shown(container)).toBe(false)
    await replayState(false, 0)
    expect(shown(container)).toBe(false)
  })

  it('снимок осевшей рамке («Слушаем вместе» включили) — лоадер на время проигрывания', async () => {
    vi.useFakeTimers()
    const { container, iframe } = renderFrame()
    await settle(iframe)

    await replayState(true, 12)
    expect(shown(container)).toBe(true)
    expect(cover(container).textContent).toContain('Переходим к преподавателю')
    await replayState(false, 0)
    expect(shown(container)).toBe(false)
  })

  it('восстановление ответов (F5) держит «Загружаем урок…» и после осадки — до «свободен»', async () => {
    vi.useFakeTimers()
    const { container, iframe } = renderFrame({ isStaff: true, reviewStudentId: 7 })
    await replayState(true, -1)

    await settle(iframe)
    expect(shown(container)).toBe(true)
    expect(cover(container).textContent).toContain('Загружаем урок')

    await replayState(true, 40)
    expect(cover(container).textContent).toContain('Загружаем урок')
    await replayState(false, 0)
    expect(shown(container)).toBe(false)
  })

  it('перезагрузка рамки (указка) — лоадер снова', async () => {
    vi.useFakeTimers()
    const { ref, container, rerender, iframe } = renderFrame()
    await settle(iframe)
    expect(shown(container)).toBe(false)

    rerender(frame({ ref, reloadToken: 1 }))

    expect(shown(container)).toBe(true)
    expect(cover(container).textContent).toContain('Загружаем урок')
  })

  it('видео/ссылка без моста — лоадер до загрузки рамки', async () => {
    const video = { ...MATERIAL, materialType: 'VIDEO', fileUrl: 'https://files/v.mp4' }
    const { container } = render(frame({ material: video }))
    expect(shown(container)).toBe(true)

    await act(async () => { container.querySelector('iframe').dispatchEvent(new Event('load')) })

    expect(shown(container)).toBe(false)
  })
})

// Под лоадером догона рамка проигрывает поток преподавателя и проходит стадии
// одну за другой; «Темы» справа видны и мигали тем же списком (стенд 04.10).
// Пока рамка закрыта, наверх уходит только итог — последняя стадия.
describe('SectionMaterialFrame — стадии под лоадером', () => {
  afterEach(() => vi.useRealTimers())

  const replayState = (busy, size) => message({ source: 'jts-bridge', type: 'replay', busy, size })
  const stage = (index) => message({ source: 'jts-lesson', type: 'stage', index, total: 7 })

  it('проигрывание пачки — наверх только последняя стадия, когда лоадер ушёл', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { iframe } = renderFrame({ onStage })
    await settle(iframe)
    onStage.mockClear()

    await replayState(true, 40)
    await stage(2)
    await stage(1)
    await stage(4)
    await stage(1)
    expect(onStage).not.toHaveBeenCalled()

    await replayState(false, 0)

    expect(onStage).toHaveBeenCalledTimes(1)
    expect(onStage).toHaveBeenCalledWith({ index: 1, total: 7 }, { own: false })
  })

  it('пока рамка открыта, стадии уходят сразу, как раньше', async () => {
    vi.useFakeTimers()
    const onStage = vi.fn()
    const { iframe } = renderFrame({ onStage })
    await settle(iframe)
    onStage.mockClear()

    await stage(3)

    expect(onStage).toHaveBeenCalledWith({ index: 3, total: 7 }, { own: false })
  })
})
