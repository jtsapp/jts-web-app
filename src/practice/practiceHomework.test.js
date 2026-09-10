// @vitest-environment jsdom
//
// Мост «Практика → домашняя работа». Раздел живёт в кабинете, домашка — в
// JTS-бэкенде, и связать их может только клиент. Отметка best-effort: она уже
// сохранена локально, и сетевая осечка не должна её отменять.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/session.js', () => ({ loadToken: vi.fn() }))
vi.mock('../api.js', () => ({ markPracticeUnitDone: vi.fn() }))

const { loadToken } = await import('../lib/session.js')
const { markPracticeUnitDone } = await import('../api.js')
const { countUnitTowardsHomework } = await import('./practiceHomework.js')

describe('засчитывание юнита «Практики» в домашку', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    markPracticeUnitDone.mockResolvedValue({ counted: 1, alreadyDone: 0 })
  })
  afterEach(() => vi.restoreAllMocks())

  it('отправляет адрес юнита: раздел, уровень, номер', async () => {
    loadToken.mockReturnValue('токен')

    await countUnitTowardsHomework('grammar', 'a1', 12)

    expect(markPracticeUnitDone).toHaveBeenCalledWith('токен', {
      area: 'grammar', level: 'a1', unitId: 12, unitKey: null, done: null, total: null,
    })
  })

  // Гость на сервер не пишет — как и остальной синк «Практики».
  it('без токена не ходит на сервер', async () => {
    loadToken.mockReturnValue(null)

    await countUnitTowardsHomework('grammar', 'a1', 12)

    expect(markPracticeUnitDone).not.toHaveBeenCalled()
  })

  // Отказ сервера не должен всплыть наружу: локальная отметка «Пройдено» уже
  // записана, и ронять на ней экран итогов нечем.
  it('сетевая осечка не выбрасывается наружу', async () => {
    loadToken.mockReturnValue('токен')
    markPracticeUnitDone.mockRejectedValue(new Error('нет связи'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(countUnitTowardsHomework('grammar', 'a1', 12)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })

  it('неполный адрес юнита на сервер не уходит', async () => {
    loadToken.mockReturnValue('токен')

    await countUnitTowardsHomework('grammar', 'a1', null)
    await countUnitTowardsHomework('', 'a1', 12)
    await countUnitTowardsHomework('workbooks', 'a0', '')

    expect(markPracticeUnitDone).not.toHaveBeenCalled()
  })

  // Нумерована только грамматика. У воркбука адрес — код уровня, у шэдоуинга —
  // id урока: тот же адрес, каким юнит выдавали.
  it('строковый адрес уезжает ключом, а не номером', async () => {
    loadToken.mockReturnValue('токен')

    await countUnitTowardsHomework('workbooks', 'a0', 'a0')

    expect(markPracticeUnitDone).toHaveBeenCalledWith('токен', {
      area: 'workbooks', level: 'a0', unitId: null, unitKey: 'a0', done: null, total: null,
    })
  })

  // У шэдоуинга уровня нет вовсе — урок адресуется сам собой.
  it('без уровня отправляется null, а не пустая строка', async () => {
    loadToken.mockReturnValue('токен')

    await countUnitTowardsHomework('shadowing', null, 'sg')

    expect(markPracticeUnitDone).toHaveBeenCalledWith('токен', {
      area: 'shadowing', level: null, unitId: null, unitKey: 'sg', done: null, total: null,
    })
  })

  /**
   * Разделы, выдаваемые уровнем целиком, шлют ЧИСЛА: «пройдено» там не событие,
   * а доля. Порог засчитывания держит сервер — здесь только факты.
   */
  it('ход работы уезжает числами', async () => {
    loadToken.mockReturnValue('токен')

    await countUnitTowardsHomework('listening', 'a1', 'a1', { done: 37, total: 124 })

    expect(markPracticeUnitDone).toHaveBeenCalledWith('токен', {
      area: 'listening', level: 'a1', unitId: null, unitKey: 'a1', done: 37, total: 124,
    })
  })

  /* Мусорные числа не отправляем: сервер поймёт отчёт без них как «закрыт»,
     а «сделано 0 из 0» было бы ложным закрытием. */
  it('негодные числа не подмешиваются', async () => {
    loadToken.mockReturnValue('токен')

    await countUnitTowardsHomework('listening', 'a1', 'a1', { done: 5, total: 0 })
    await countUnitTowardsHomework('listening', 'a1', 'a1', { done: undefined, total: 124 })

    const [, первый] = markPracticeUnitDone.mock.calls[0]
    const [, второй] = markPracticeUnitDone.mock.calls[1]
    expect(первый.total).toBeNull()
    expect(первый.done).toBe(5)
    expect(второй.done).toBeNull()
  })
})
