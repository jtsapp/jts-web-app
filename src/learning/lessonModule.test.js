import { describe, it, expect, vi } from 'vitest'
import { pickLevelModule, resolveModuleId } from './lessonModule.js'

const mod = (id, level, orderIndex) => ({ id, level, orderIndex })

describe('выбор модуля «Обучения» под уровень', () => {
  it('берёт модуль своего уровня, а не первый попавшийся', () => {
    const mods = [mod('a', 'A1', 0), mod('b', 'B1', 0), mod('c', 'B2', 0)]

    expect(pickLevelModule(mods, 'B1').id).toBe('b')
  })

  // Уровень приезжает и из статики королевства, и из профиля ученика, и
  // регистр там исторически разный.
  it('сравнивает уровень без учёта регистра с обеих сторон', () => {
    expect(pickLevelModule([mod('a', 'b1', 0)], 'B1').id).toBe('a')
    expect(pickLevelModule([mod('a', 'B1', 0)], 'b1').id).toBe('a')
  })

  // Несколько модулей на уровень миграция не создаёт, но запрета нет. Порядок
  // обязан совпадать с остальными клиентами: иначе прогресс и квота на разных
  // устройствах считались бы по разным модулям.
  it('при нескольких модулях уровня берёт первый по orderIndex, а не по порядку в ответе', () => {
    const mods = [mod('второй', 'B1', 5), mod('первый', 'B1', 1)]

    expect(pickLevelModule(mods, 'B1').id).toBe('первый')
  })

  it('модуль без orderIndex считается нулевым и не уезжает в конец', () => {
    const mods = [mod('с-индексом', 'B1', 3), { id: 'без-индекса', level: 'B1' }]

    expect(pickLevelModule(mods, 'B1').id).toBe('без-индекса')
  })

  it('нет модуля этого уровня — null, а не чужой модуль', () => {
    expect(pickLevelModule([mod('a', 'A1', 0)], 'C1')).toBeNull()
  })

  // Вызывающий передаёт сюда результат сетевого запроса: пустой ответ, отказ,
  // отсутствующий уровень — всё это нормальные входы, а не повод упасть.
  it('мусор на входе не роняет вызывающего', () => {
    expect(pickLevelModule([], 'B1')).toBeNull()
    expect(pickLevelModule(null, 'B1')).toBeNull()
    expect(pickLevelModule(undefined, 'B1')).toBeNull()
    expect(pickLevelModule([mod('a', 'B1', 0)], null)).toBeNull()
    expect(pickLevelModule([{ id: 'без-уровня' }], 'B1')).toBeNull()
  })
})

describe('номер модуля на завершении урока', () => {
  const level = 'B1'

  it('модуль известен — сеть не трогаем вовсе', async () => {
    const fetchModules = vi.fn()

    const out = await resolveModuleId({ moduleId: 'mod-1', modulesUnavailable: false, level, fetchModules })

    expect(out).toEqual({ moduleId: 'mod-1', modulesUnavailable: false })
    expect(fetchModules).not.toHaveBeenCalled()
  })

  // Список загрузился и модуля для уровня в нём нет — это ответ, а не сбой.
  // Переспрашивать на каждом уроке незачем.
  it('модуля для уровня нет — сеть не трогаем', async () => {
    const fetchModules = vi.fn()

    const out = await resolveModuleId({ moduleId: null, modulesUnavailable: false, level, fetchModules })

    expect(out).toEqual({ moduleId: null, modulesUnavailable: false })
    expect(fetchModules).not.toHaveBeenCalled()
  })

  // Главный случай: при входе список не загрузился. Без переспроса урок ушёл бы
  // на модульный эндпоинт — награда есть, проверки квоты нет.
  it('список не загрузился при входе — переспрашиваем и находим модуль', async () => {
    const fetchModules = vi.fn(async () => [{ id: 'mod-1', level: 'B1', orderIndex: 0 }])

    const out = await resolveModuleId({ moduleId: null, modulesUnavailable: true, level, fetchModules })

    expect(out).toEqual({ moduleId: 'mod-1', modulesUnavailable: false })
    expect(fetchModules).toHaveBeenCalledTimes(1)
  })

  it('переспросили и модуля правда нет — флаг снимается, следующий урок не переспрашивает', async () => {
    const fetchModules = vi.fn(async () => [{ id: 'чужой', level: 'A1', orderIndex: 0 }])

    const out = await resolveModuleId({ moduleId: null, modulesUnavailable: true, level, fetchModules })

    expect(out).toEqual({ moduleId: null, modulesUnavailable: false })
  })

  it('бэкенд всё ещё недоступен — состояние прежнее, следующий урок попробует снова', async () => {
    const fetchModules = vi.fn(async () => {
      throw new Error('network')
    })

    const out = await resolveModuleId({ moduleId: null, modulesUnavailable: true, level, fetchModules })

    expect(out).toEqual({ moduleId: null, modulesUnavailable: true })
  })
})
