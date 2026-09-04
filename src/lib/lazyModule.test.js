import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  allowStaleBuildReload,
  clearStaleBuildMark,
  isStaleBuildError,
  loadModule,
  recoverFromStaleImport,
} from './lazyModule.js'

/**
 * Отказ ленивой загрузки — это «нажал, ничего не произошло».
 *
 * Так и было: `try { await import(...) } finally {}` без catch, промис
 * отклонялся в никуда, карточка не открывалась и не жаловалась. Ломается это у
 * вкладки, открытой до выката: её чанков на сервере уже нет.
 */
function fakeStore() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

describe('isStaleBuildError', () => {
  it('узнаёт формулировки всех браузеров', () => {
    expect(isStaleBuildError({ name: 'ChunkLoadError' })).toBe(true)
    expect(isStaleBuildError(new Error('Loading chunk 483 failed.'))).toBe(true)
    expect(isStaleBuildError(new Error('Failed to fetch dynamically imported module: /_next/chunk.js'))).toBe(true)
    expect(isStaleBuildError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isStaleBuildError(new Error('Importing a module script failed.'))).toBe(true)
  })

  /**
   * Основной случай на проде: nginx отдаёт index.html вместо пропавшего чанка
   * (try_files ... /index.html), поэтому браузер жалуется на MIME, а не на
   * отсутствие файла. Без этих строк проверка проходила бы мимо.
   */
  it('узнаёт подмену чанка на index.html', () => {
    expect(isStaleBuildError(new Error(
      'Failed to load module script: Expected a JavaScript module script but the server responded ' +
      'with a MIME type of "text/html".'))).toBe(true)
    expect(isStaleBuildError(new Error(
      'Loading module from "https://app/_next/chunk.js" was blocked because of a disallowed MIME type ("text/html").'
    ))).toBe(true)
  })

  it('обычную ошибку за устаревшую сборку не принимает', () => {
    expect(isStaleBuildError(new Error('openTaleWorld is not a function'))).toBe(false)
    expect(isStaleBuildError(null)).toBe(false)
    expect(isStaleBuildError(undefined)).toBe(false)
  })
})

describe('однократность перезагрузки', () => {
  // Без ограничителя вкладка ушла бы в цикл, если чанк не грузится по другой
  // причине — например, упала раздача статики.
  it('разрешает ровно одну попытку', () => {
    const store = fakeStore()
    expect(allowStaleBuildReload(store)).toBe(true)
    expect(allowStaleBuildReload(store)).toBe(false)
    expect(allowStaleBuildReload(store)).toBe(false)
  })

  it('удачная загрузка возвращает право на попытку', () => {
    const store = fakeStore()
    allowStaleBuildReload(store)
    clearStaleBuildMark(store)
    expect(allowStaleBuildReload(store)).toBe(true)
  })

  it('без хранилища не перезагружаемся', () => {
    expect(allowStaleBuildReload(null)).toBe(false)
    expect(() => clearStaleBuildMark(null)).not.toThrow()
  })
})

describe('loadModule', () => {
  const realSession = globalThis.sessionStorage
  const realLocation = globalThis.location

  beforeEach(() => {
    const store = fakeStore()
    Object.defineProperty(globalThis, 'sessionStorage', { value: store, configurable: true })
    Object.defineProperty(globalThis, 'location', { value: { reload: vi.fn() }, configurable: true })
  })
  afterEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', { value: realSession, configurable: true })
    Object.defineProperty(globalThis, 'location', { value: realLocation, configurable: true })
    vi.restoreAllMocks()
  })

  it('отдаёт модуль, когда загрузка прошла', async () => {
    const mod = { openTaleWorld: () => 'ok' }
    await expect(loadModule(async () => mod)).resolves.toBe(mod)
    expect(location.reload).not.toHaveBeenCalled()
  })

  it('устаревшая сборка перезагружает страницу', async () => {
    const result = await loadModule(async () => {
      throw new Error('Failed to fetch dynamically imported module')
    })
    expect(location.reload).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
  })

  it('вторая такая же ошибка уже не перезагружает', async () => {
    // Второй заход уходит в console.error — глушим, чтобы не шуметь в выводе.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const boom = async () => {
      throw new Error('Loading chunk 12 failed.')
    }
    await loadModule(boom)
    await loadModule(boom)
    expect(location.reload).toHaveBeenCalledTimes(1)
  })

  // Ошибка в самом модуле — не повод перезагружаться, от этого она не пройдёт.
  it('обычная ошибка возвращает null и не перезагружает', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await loadModule(async () => {
      throw new TypeError('boom')
    })
    expect(result).toBeNull()
    expect(location.reload).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('recoverFromStaleImport сообщает, взял ли он случай на себя', () => {
    expect(recoverFromStaleImport(new TypeError('boom'))).toBe(false)
    expect(recoverFromStaleImport(new Error('Loading chunk 1 failed.'))).toBe(true)
    expect(location.reload).toHaveBeenCalledTimes(1)
  })
})
