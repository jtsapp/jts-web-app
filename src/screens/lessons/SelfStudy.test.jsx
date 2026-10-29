// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const catalog = { value: [] }
const progress = { value: [] }

vi.mock('../../api.js', () => ({
  getCourseCatalog: vi.fn(async () => catalog.value),
  getCatalogProgress: vi.fn(async () => ({ completedLessonIds: progress.value })),
  completeCatalogLesson: vi.fn(async (t, id) => ({ completedLessonIds: [...progress.value, Number(id)] })),
  uncompleteCatalogLesson: vi.fn(async (t, id) => ({
    completedLessonIds: progress.value.filter((x) => Number(x) !== Number(id)),
  })),
}))

import SelfStudy from './SelfStudy.jsx'

// Форма — как у настоящей ручки: id уровня числовой, код CEFR в code, и каждый
// урок лежит трижды, по разу на режим.
const CATALOG = [
  {
    id: 1,
    code: 'A1',
    label: 'just to study — A1 · Course',
    units: [{
      id: 1,
      name: 'Unit 1',
      lessons: [
        { id: 10, title: 'My biography', type: 'LESSON', mode: 'SELF_STUDY' },
        { id: 11, title: 'My biography', type: 'LESSON', mode: 'ONE_TO_ONE' },
        { id: 12, title: 'My biography', type: 'LESSON', mode: 'GROUP' },
      ],
    }],
  },
  {
    id: 2,
    code: 'A2',
    label: 'just to study — A2 · Course',
    units: [{
      id: 2,
      name: 'Unit 2',
      lessons: [
        { id: 20, title: 'Changing direction', type: 'LESSON', mode: 'SELF_STUDY' },
        { id: 21, title: 'Закрытый урок', type: 'LESSON', mode: 'SELF_STUDY', locked: true },
      ],
    }],
  },
  {
    id: 5,
    code: 'B2',
    label: 'just to study — B2 · Course',
    units: [{ id: 3, name: 'Unit 3', lessons: [{ id: 30, title: 'Далёкий уровень', mode: 'SELF_STUDY' }] }],
  },
]

// Тот же каталог, но у закрытого B2 сервер по старой памяти пометил материалы
// бесплатными. Живые уроки открывает только выдача менеджера — пометка ничего
// не открывает.
const WITH_PREVIEW = CATALOG.map((level) => (level.code !== 'B2' ? level : {
  ...level,
  locked: true,
  units: [{
    id: 3,
    name: 'Unit 3',
    lessons: [
      { id: 30, title: 'Витрина раз', mode: 'SELF_STUDY', preview: true },
      { id: 32, title: 'За подпиской', mode: 'SELF_STUDY', preview: false },
    ],
  }],
}))

function draw(props = {}) {
  const onOpenLesson = vi.fn()
  const view = render(
    <I18nProvider>
      <SelfStudy token="T" userLevel="A2" onOpenLesson={onOpenLesson} {...props} />
    </I18nProvider>,
  )
  return { ...view, onOpenLesson }
}

const chips = (container) => [...container.querySelectorAll('.gr-levelchip')].map((b) => b.textContent)

describe('Самостоятельное обучение', () => {
  beforeEach(() => { catalog.value = CATALOG; progress.value = []; localStorage.clear() })

  it('показывает чипами все уровни, а не только свои', async () => {
    // Пока чужие уровни прятали, курс выглядел заканчивающимся там, где он
    // продолжается: ученик не знал ни что дальше есть, ни что для этого нужно.
    const { container } = draw()
    await screen.findByText('Changing direction')
    expect(chips(container)).toEqual(['A1', 'A2', 'B2'])
  })

  it('чужой уровень помечен замком, свой — нет', async () => {
    const { container } = draw()
    await screen.findByText('Changing direction')
    const locked = [...container.querySelectorAll('.gr-levelchip.is-locked')].map((b) => b.textContent)
    expect(locked).toEqual(['B2'])
  })

  it('открывается на уровне, до которого ученик дошёл', async () => {
    // Не на первом попавшемся: человек продолжает с того места, где он сейчас,
    // а назад к пройденному уходит сам, когда хочет повторить.
    const { container } = draw()
    await screen.findByText('Changing direction')
    expect(container.querySelector('.gr-levelchip.on').textContent).toBe('A2')
    expect(screen.queryByText('My biography')).toBeNull()
  })

  it('по чипу можно вернуться на пройденный уровень', async () => {
    draw()
    fireEvent.click(await screen.findByText('A1'))
    expect(await screen.findByText('My biography')).toBeTruthy()
    expect(screen.queryByText('Changing direction')).toBeNull()
  })

  it('возвращает на тот уровень, где ученик был в прошлый раз', async () => {
    // Экран размонтируется на входе в урок. Раньше выбор жил только в его
    // состоянии, и «К урокам» приводило на верхний уровень: тому, кто идёт
    // курс подряд снизу, приходилось искать своё место после каждого урока.
    localStorage.setItem('self-study-level', 'A1')
    const { container } = draw()

    expect(await screen.findByText('My biography')).toBeTruthy()
    expect(container.querySelector('.gr-levelchip.on').textContent).toBe('A1')
  })

  it('запомненный уровень, которого больше нет, откатывается к доступному', async () => {
    // Каталог мог обновиться, а уровень ученика — измениться: пустой экран
    // из-за несуществующего кода был бы хуже, чем просто не тот чип.
    localStorage.setItem('self-study-level', 'C2')
    const { container } = draw()

    await screen.findByText('Changing direction')
    expect(container.querySelector('.gr-levelchip.on').textContent).toBe('A2')
  })

  it('выбор чипа запоминается — id курса, а не кодом уровня', async () => {
    // Код уровня у двух курсов бывает один (см. «Два курса одного уровня»).
    draw()
    fireEvent.click(await screen.findByText('A1'))
    expect(localStorage.getItem('self-study-level')).toBe('1')
  })

  it('закрытый уровень объясняет, что его открывает менеджер', async () => {
    // Живые уроки выдаются только в админке: ни подписка, ни тариф уровень не
    // открывают, и совет «обновите тариф» был бы неправдой.
    draw()
    fireEvent.click(await screen.findByText('B2'))

    expect(screen.queryByText('Далёкий уровень')).toBeNull()
    expect(await screen.findByText(/Уровень B2 пока закрыт/)).toBeTruthy()
    expect(screen.getByText(/Уровни открывает менеджер/)).toBeTruthy()
    expect(screen.queryByText(/тариф|подписк/)).toBeNull()
  })

  it('на закрытом уровне не открыт ни один материал, даже помеченный бесплатным', async () => {
    catalog.value = WITH_PREVIEW
    const { container, onOpenLesson } = draw()
    fireEvent.click(await screen.findByText('B2'))

    expect(await screen.findByText(/Уровень B2 пока закрыт/)).toBeTruthy()
    expect(screen.queryByText('Витрина раз')).toBeNull()
    expect(screen.queryByText('За подпиской')).toBeNull()
    expect(container.querySelector('.ss-card')).toBeNull()
    expect(screen.queryByRole('button', { name: /тариф/i })).toBeNull()
    expect(onOpenLesson).not.toHaveBeenCalled()
  })

  it('замок ставит сервер, а не клиент', async () => {
    // Выдачи админа знает только сервер; повтори клиент правило «свой уровень
    // и ниже» — они бы разошлись ровно на выданных уровнях.
    catalog.value = CATALOG.map((l) => (l.code === 'B2' ? { ...l, locked: false } : { ...l, locked: true }))
    const { container } = draw()

    await screen.findByText('Далёкий уровень')
    const locked = [...container.querySelectorAll('.gr-levelchip.is-locked')].map((b) => b.textContent)
    expect(locked).toEqual(['A1', 'A2'])
  })

  it('без флага от сервера падает на прежнюю формулу', async () => {
    // Старый бэкенд поля не шлёт — запирать ученику весь курс за это нельзя.
    catalog.value = CATALOG.map(({ locked, ...rest }) => rest)
    const { container } = draw()
    await screen.findByText('Changing direction')
    expect([...container.querySelectorAll('.gr-levelchip.is-locked')].map((b) => b.textContent)).toEqual(['B2'])
  })

  it('A1 открыт даже новичку с A0', async () => {
    // Курс начинается с A1, запирать вход в программу не за что.
    const { container } = draw({ userLevel: 'A0' })
    expect(await screen.findByText('My biography')).toBeTruthy()
    expect([...container.querySelectorAll('.gr-levelchip.is-locked')].map((b) => b.textContent))
      .toEqual(['A2', 'B2'])
  })

  it('берёт только самостоятельный режим, а не все три копии урока', async () => {
    // Каждый урок лежит в каталоге трижды — SELF_STUDY, ONE_TO_ONE и GROUP.
    // Без фильтра ученик увидел бы три одинаковых названия подряд.
    draw({ userLevel: 'A1' })
    expect(await screen.findAllByText('My biography')).toHaveLength(1)
  })

  it('закрытые преподавателем уроки не показывает', async () => {
    draw()
    await screen.findByText('Changing direction')
    expect(screen.queryByText('Закрытый урок')).toBeNull()
  })

  it('нажатие открывает урок по его id', async () => {
    const { onOpenLesson } = draw()
    fireEvent.click(await screen.findByText('Changing direction'))
    expect(onOpenLesson).toHaveBeenCalledWith(20)
  })

  it('юнит, где все уроки закрыты, не показывается пустой рамкой', async () => {
    catalog.value = [
      { id: 1, code: 'A1', units: [{ id: 1, name: 'Пустой юнит', lessons: [{ id: 9, title: 'x', mode: 'SELF_STUDY', locked: true }] }] },
    ]
    draw()
    await waitFor(() => expect(screen.queryByText('Пустой юнит')).toBeNull())
  })

  it('когда открывать нечего — объясняет, а не молчит', async () => {
    catalog.value = []
    draw()
    expect(await screen.findByText(/Пока нечего проходить/)).toBeTruthy()
  })

  it('без токена в сеть не ходит', async () => {
    const { getCourseCatalog } = await import('../../api.js')
    getCourseCatalog.mockClear()
    draw({ token: null })
    expect(getCourseCatalog).not.toHaveBeenCalled()
  })
})

// Общий B2 и Business English с тем же кодом B2 и отдельным доступом. Business
// заведён раньше (id меньше) и в ответе стоит первым — порядок чипов на это
// опираться не должен.
const MEDIA = {
  id: 4,
  code: 'B2',
  // С брендом, как в настоящем каталоге: без его срезания чип читался
  // «B2 just to study».
  label: 'just to study — English for Media & Marketing · B2+/C1',
  separateAccess: true,
  locked: false,
  units: [{ id: 40, name: 'Media Unit', lessons: [{ id: 400, title: 'Press release', mode: 'SELF_STUDY' }] }],
}
const GENERAL_B2 = {
  id: 5,
  code: 'B2',
  label: 'just to study — B2 · Course',
  separateAccess: false,
  locked: false,
  units: [{ id: 3, name: 'Unit 3', lessons: [{ id: 30, title: 'Далёкий уровень', mode: 'SELF_STUDY' }] }],
}
const TWO_B2 = [
  { ...CATALOG[0], locked: false },
  { ...CATALOG[1], locked: false },
  MEDIA,
  GENERAL_B2,
]
// Отдельный курс закрыт; пометка «бесплатно» на первом материале его не открывает.
const MEDIA_PREVIEW = {
  ...MEDIA,
  locked: true,
  units: [{
    id: 40,
    name: 'Media Unit',
    lessons: [
      { id: 400, title: 'Press release', mode: 'SELF_STUDY', preview: true },
      { id: 401, title: 'Brand voice', mode: 'SELF_STUDY', preview: false },
    ],
  }],
}

const chipByText = (container, text) =>
  [...container.querySelectorAll('.gr-levelchip')].find((b) => b.textContent === text)

describe('Два курса одного уровня', () => {
  beforeEach(() => { catalog.value = TWO_B2; progress.value = []; localStorage.clear() })

  it('оба курса видны отдельными чипами, общий — первым', async () => {
    // Чип был на ключе кода уровня: два B2 давали повтор ключа React, и один
    // курс прятал другой.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')

    expect(chips(container)).toEqual(['A1', 'A2', 'B2', 'B2 English for Media & Marketing'])
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/same key/)
    errors.mockRestore()
  })

  it('каждый курс выбирается своим чипом', async () => {
    const { container } = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')

    fireEvent.click(chipByText(container, 'B2 English for Media & Marketing'))
    expect(await screen.findByText('Press release')).toBeTruthy()
    expect(screen.queryByText('Далёкий уровень')).toBeNull()
    expect([...container.querySelectorAll('.gr-levelchip.on')].map((b) => b.textContent))
      .toEqual(['B2 English for Media & Marketing'])

    fireEvent.click(chipByText(container, 'B2'))
    expect(await screen.findByText('Далёкий уровень')).toBeTruthy()
    expect(screen.queryByText('Press release')).toBeNull()
    expect([...container.querySelectorAll('.gr-levelchip[aria-pressed="true"]')].map((b) => b.textContent))
      .toEqual(['B2'])
  })

  it('открывается на общем курсе своего уровня, а не на выданном сбоку', async () => {
    const { container } = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')
    expect(container.querySelector('.gr-levelchip.on').textContent).toBe('B2')
  })

  it('выбор второго курса того же уровня переживает возврат на экран', async () => {
    const first = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')
    fireEvent.click(chipByText(first.container, 'B2 English for Media & Marketing'))
    expect(localStorage.getItem('self-study-level')).toBe('4')
    first.unmount()

    const { container } = draw({ userLevel: 'B2' })
    expect(await screen.findByText('Press release')).toBeTruthy()
    expect(container.querySelector('.gr-levelchip.on').textContent).toBe('B2 English for Media & Marketing')
  })

  it('запомненный код уровня старого формата ведёт на общий курс и переписывается на id', async () => {
    // Такое значение уже лежит у учеников в браузере с тех пор, как курс был
    // один на уровень.
    localStorage.setItem('self-study-level', 'B2')
    const { container } = draw({ userLevel: 'B2' })

    expect(await screen.findByText('Далёкий уровень')).toBeTruthy()
    expect(container.querySelector('.gr-levelchip.on').textContent).toBe('B2')
    await waitFor(() => expect(localStorage.getItem('self-study-level')).toBe('5'))
  })

  it('закрытый отдельный курс говорит про курс, а не про уровень', async () => {
    // «Уровень B2 пока закрыт» рядом с открытым общим B2 читалось бы как
    // поломка, а совет обновить тариф — как неправда: курс открывает выдача.
    catalog.value = TWO_B2.map((c) => (c.id === MEDIA.id ? { ...c, locked: true } : c))
    const { container } = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')

    fireEvent.click(chipByText(container, 'B2 English for Media & Marketing'))
    expect(await screen.findByText('Курс «English for Media & Marketing» пока закрыт')).toBeTruthy()
    expect(screen.queryByText(/Уровень B2 пока закрыт/)).toBeNull()
    expect(screen.queryByText(/обновите тариф/)).toBeNull()
  })

  it('закрытый отдельный курс с пометкой «бесплатно» всё равно закрыт целиком', async () => {
    catalog.value = TWO_B2.map((c) => (c.id === MEDIA.id ? MEDIA_PREVIEW : c))
    const { container, onOpenLesson } = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')
    fireEvent.click(chipByText(container, 'B2 English for Media & Marketing'))

    expect(await screen.findByText('Курс «English for Media & Marketing» пока закрыт')).toBeTruthy()
    expect(screen.getByText(/Напишите менеджеру/)).toBeTruthy()
    expect(screen.queryByText('Press release')).toBeNull()
    expect(screen.queryByText('Brand voice')).toBeNull()
    expect(onOpenLesson).not.toHaveBeenCalled()
  })

  it('без флага замка от сервера отдельный курс закрыт, даже на своём уровне', async () => {
    // Прежняя формула «свой уровень и ниже» такой курс не открывает — только
    // выдача, а о ней знает один сервер.
    catalog.value = TWO_B2.map(({ locked, ...rest }) => rest)
    const { container } = draw({ userLevel: 'B2' })
    await screen.findByText('Далёкий уровень')

    expect([...container.querySelectorAll('.gr-levelchip.is-locked')].map((b) => b.textContent))
      .toEqual(['B2 English for Media & Marketing'])
  })
})

describe('Отметка о прохождении', () => {
  beforeEach(() => { catalog.value = CATALOG; progress.value = []; localStorage.clear() })

  it('пройденный урок открывается отмеченным', async () => {
    progress.value = [20]
    const { container } = draw()
    await screen.findByText('Changing direction')

    const marks = container.querySelectorAll('.ss-mark')
    const pressed = [...marks].filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(screen.getByText('Пройдено')).toBeTruthy()
  })

  it('нажатие отмечает урок и сохраняет на сервере', async () => {
    const { completeCatalogLesson } = await import('../../api.js')
    const { container } = draw()
    await screen.findByText('Changing direction')

    const mark = container.querySelector('.ss-card .ss-mark')
    fireEvent.click(mark)

    await waitFor(() => expect(mark.getAttribute('aria-pressed')).toBe('true'))
    expect(completeCatalogLesson).toHaveBeenCalled()
  })

  it('повторное нажатие снимает отметку', async () => {
    // Отметка ручная — значит её должно быть можно и убрать.
    progress.value = [20]
    const { uncompleteCatalogLesson } = await import('../../api.js')
    const { container } = draw()
    await screen.findByText('Changing direction')

    const mark = [...container.querySelectorAll('.ss-mark')]
      .find((b) => b.getAttribute('aria-pressed') === 'true')
    fireEvent.click(mark)

    await waitFor(() => expect(mark.getAttribute('aria-pressed')).toBe('false'))
    expect(uncompleteCatalogLesson).toHaveBeenCalled()
  })

  it('счётчик юнита показывает пройденное из общего', async () => {
    progress.value = [20]
    draw()
    // В юните A2 один урок из одного самостоятельного (второй закрыт).
    expect(await screen.findByText('1 из 1')).toBeTruthy()
  })

  it('отметка не открывает урок', async () => {
    // Карточка сама открывает урок, и клик по галочке не должен уводить с экрана.
    const { container, onOpenLesson } = draw()
    await screen.findByText('Changing direction')

    fireEvent.click(container.querySelector('.ss-mark'))
    expect(onOpenLesson).not.toHaveBeenCalled()
  })
})
