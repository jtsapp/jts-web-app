// @vitest-environment jsdom
// Каталог комиксов, который не загрузился, не должен «залипать» пустым.
//
// Раньше `loadComicsIndex` ловил любую ошибку в `[]` и запоминал этот пустой
// ответ до перезагрузки вкладки. Один случайный сбой на нестабильной мобильной
// сети — и комиксов нет, а повторный заход в раздел ничего не менял: сети
// больше никто не спрашивал. Выглядело как «каталога нет», хотя в базе их 87.
//
// Отдельный файл и свежий модуль на каждый тест: состояние модуля — ровно то,
// что здесь проверяется, и общее на файл оно утекало бы между тестами.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getComics = vi.fn()
vi.mock('../../api.js', () => ({
  getComics: (...a) => getComics(...a),
  getComic: vi.fn(),
  searchComics: vi.fn(),
}))

async function freshLoader() {
  vi.resetModules()
  return (await import('./comicsData.js')).loadComicsIndex
}

const CARD = { id: 1, slug: 'yellow', title: 'Жёлтый', level: 'A1', coverUrl: 'c.jpg', pageCount: 3 }

// Фигурные скобки обязательны: mockReset() возвращает сам мок, а vitest считает
// функцию, возвращённую из beforeEach, коллбэком очистки и вызывает её после
// теста — лишний вызов getComics и «необработанный» отказ в чужом тесте.
beforeEach(() => {
  getComics.mockReset()
})

describe('loadComicsIndex — отказ не запоминается', () => {
  it('сбой пробрасывается, а не превращается в пустой список', async () => {
    getComics.mockRejectedValue(new Error('сеть'))
    const loadComicsIndex = await freshLoader()

    await expect(loadComicsIndex('T')).rejects.toThrow('сеть')
  })

  it('после сбоя повторный вызов снова идёт в сеть и получает каталог', async () => {
    getComics.mockRejectedValueOnce(new Error('сеть'))
    const loadComicsIndex = await freshLoader()
    await expect(loadComicsIndex('T')).rejects.toThrow()

    getComics.mockResolvedValueOnce([CARD])
    const list = await loadComicsIndex('T')

    expect(getComics).toHaveBeenCalledTimes(2)
    expect(list).toHaveLength(1)
  })

  // Обратная сторона: удачный ответ по-прежнему запоминается, иначе каждый
  // заход в раздел стоил бы похода за каталогом.
  it('удачный ответ запоминается — сеть не спрашивают второй раз', async () => {
    getComics.mockResolvedValue([CARD])
    const loadComicsIndex = await freshLoader()

    await loadComicsIndex('T')
    await loadComicsIndex('T')

    expect(getComics).toHaveBeenCalledTimes(1)
  })
})
