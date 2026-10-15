// @vitest-environment jsdom
// Что про задание «Слушай и выбирай» узнаёт помощник по сайту (снимок экрана). Попыток две: после первой ошибки
// верный ответ скрыт намеренно, и помощник не должен его выдать; после второй задание закрыто, сайт обводит верное
// фото — но на плитке подписи нет текстом (снимок видит «3 ✓»), поэтому подпись приходит ключом на полосе разбора.
// Экран — настоящий LcMain на настоящем контроллере и данных; плеер фейковый: «дослушал» зовёт тест.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, act } from '@testing-library/react'
import { I18nProvider, useI18n } from '../../i18n.jsx'
import { buildData } from '../../practice/listenchoose/data.js'
import { normalizeDevice } from '../../practice/listenchoose/listenchooseSettings.js'
import { ListenChooseSession } from '../../practice/listenchoose/session.js'
import { snapshotScreen } from '../../lib/assistant/screenSnapshot.js'
import LcMain from './LcMain.jsx'

const DATA = buildData(
  JSON.parse(readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'practice', 'listenchoose', 'questions.json'), 'utf8')),
)
const EXPECTED = 'верный ответ по заданию'

function fakePlayer() {
  const snap = { state: 'ready', position: 0, duration: 10, rate: 1, volume: 0.8 }
  return {
    subscribe: () => () => {},
    getSnapshot: () => snap,
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    replay: vi.fn(),
    seek: vi.fn(),
    resetListening: vi.fn(),
    setRate: vi.fn(),
    setVolume: vi.fn(),
    destroy: vi.fn(),
  }
}

function Screen({ session }) {
  const { t } = useI18n()
  return <LcMain session={session} data={DATA} t={t} />
}

function mount() {
  let dev = normalizeDevice({})
  let onHeard = () => {}
  const session = new ListenChooseSession({
    data: DATA,
    device: { read: () => dev, write: (patch) => (dev = normalizeDevice({ ...dev, ...patch })) },
    progress: { readSeen: () => [], writeSeen: () => {} },
    createPlayer: (o) => {
      onHeard = o.onHeard
      return fakePlayer()
    },
    preload: () => [],
  })
  const utils = render(
    <I18nProvider>
      <Screen session={session} />
    </I18nProvider>,
  )
  // Все четыре фото «загрузились» — иначе выбор закрыт воротами.
  utils.container.querySelectorAll('.lc-opt img').forEach((img) => fireEvent.load(img))
  const question = session.getSnapshot().question
  const wrong = [0, 1, 2, 3].filter((i) => i !== question.answer)
  return {
    ...utils,
    session,
    question,
    wrong,
    listen: () => act(() => onHeard()),
    pick: (oi) => fireEvent.click(utils.container.querySelector(`.lc-opt[data-option="${oi}"]`)),
    snap: () => snapshotScreen(utils.container),
  }
}

afterEach(cleanup)

describe('«Слушай и выбирай»: ключ помощнику — только когда задание закрыто промахом', () => {
  it('до ответа ключа нет', () => {
    const s = mount()
    s.listen()
    expect(s.snap()).not.toContain(EXPECTED)
  })

  it('первая ошибка: ответ скрыт на вторую попытку — ключа нет', () => {
    const s = mount()
    s.listen()
    s.pick(s.wrong[0])
    expect(s.session.getSnapshot().round).toMatchObject({ resolved: false, wrong: [s.wrong[0]] })
    expect(s.snap()).not.toContain(EXPECTED)
  })

  it('вторая ошибка: ключ — номер и подпись верного фото', () => {
    const s = mount()
    s.listen()
    s.pick(s.wrong[0])
    s.listen() // после первой ошибки запись надо дослушать заново
    s.pick(s.wrong[1])

    const { round, options } = s.session.getSnapshot()
    expect(round).toMatchObject({ resolved: true, correct: false })
    const pos = round.order.indexOf(s.question.answer) + 1
    const text = s.snap()
    expect(text).toContain(`[${EXPECTED}: «Картинка ${pos}: ${options[s.question.answer]}»]`)
    // Ключ — под полосой разбора, а не где-то в стороне.
    expect(text).toMatch(new RegExp(`Разберём ключевую деталь[\\s\\S]*\\[${EXPECTED}`))
  })

  it('верный ответ (с первой и со второй попытки) ключа не несёт', () => {
    const first = mount()
    first.listen()
    first.pick(first.question.answer)
    expect(first.session.getSnapshot().round).toMatchObject({ resolved: true, correct: true })
    expect(first.snap()).not.toContain(EXPECTED)
    cleanup()

    const second = mount()
    second.listen()
    second.pick(second.wrong[0])
    second.listen()
    second.pick(second.question.answer)
    expect(second.session.getSnapshot().round).toMatchObject({ resolved: true, correct: true, attempts: 2 })
    expect(second.snap()).not.toContain(EXPECTED)
  })
})
