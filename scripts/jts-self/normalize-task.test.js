import { describe, it, expect, vi } from 'vitest'
import { normalizeBlock, trackUrl, DROP } from './normalize-task.js'

const ctx = { sec: '2. Vocabulary', trackFile: (id) => (id === 't1' ? 'a0_1.mp3' : null), level: 'a0' }

describe('normalizeBlock', () => {
  it('choice → options и answer по индексу', () => {
    const t = normalizeBlock({ kind: 'choice', prompt: 'I ___ coffee.', options: ['likes', 'like'], correct: 1, why: 'без -s' }, ctx)
    expect(t).toMatchObject({ type: 'choice', sec: '2. Vocabulary', word: 'I ___ coffee.', options: ['likes', 'like'], answer: 'like', why: 'без -s' })
  })

  it('choice с битым индексом отбрасывается — задание без верного ответа непроверяемо', () => {
    expect(normalizeBlock({ kind: 'choice', prompt: 'x', options: ['a', 'b'], correct: 5, why: '' }, ctx)).toBeNull()
  })

  it('choice с индексом -1 (data-correct не совпал ни с одним data-val) отбрасывается', () => {
    expect(normalizeBlock({ kind: 'choice', prompt: 'x', options: ['a', 'b'], correct: -1, why: '' }, ctx)).toBeNull()
  })

  // Находка ревью: проверка шла по истинности значения (`if (!answer)`), и
  // вариант с пустым текстом выглядел как отсутствие ответа. Границы массива —
  // единственный честный критерий: пустой вариант в курсе встречается.
  it('choice с верным вариантом из пустой строки не отбрасывается — индекс в границах', () => {
    const t = normalizeBlock({ kind: 'choice', prompt: 'x', options: ['', 'b'], correct: 0, why: '' }, ctx)
    expect(t).toMatchObject({ type: 'choice', options: ['', 'b'], answer: '' })
  })

  it('select → choice, ответ строкой', () => {
    const t = normalizeBlock({ kind: 'select', prompt: 'listen', options: ['слушать', 'спрашивать'], answer: 'слушать', why: '' }, ctx)
    expect(t).toMatchObject({ type: 'choice', word: 'listen', answer: 'слушать' })
  })

  it('select с ответом вне вариантов отбрасывается', () => {
    expect(normalizeBlock({ kind: 'select', prompt: 'x', options: ['a'], answer: 'b', why: '' }, ctx)).toBeNull()
  })

  it('gap → answers[] из вариантов через |', () => {
    const t = normalizeBlock({ kind: 'gap', before: 'I', after: 'coffee.', answer: 'like|love', why: 'w' }, ctx)
    expect(t).toMatchObject({ type: 'gap', gapBefore: 'I ', gapAfter: ' coffee.', answers: ['like', 'love'], why: 'w' })
  })

  it('multi → answer как отсортированный набор индексов', () => {
    const t = normalizeBlock({ kind: 'multi', prompt: 'p', options: ['a', 'b', 'c'], correct: [2, 0], why: '' }, ctx)
    expect(t).toMatchObject({ type: 'multi', options: ['a', 'b', 'c'], answer: [0, 2] })
  })

  // Находка ревью: неразобранное значение (-1) молча отфильтровывалось, и
  // задание уходило на тропу с неполным эталоном — студент, отметивший всё
  // верно, получал «неверно». Такой блок непроверяем целиком.
  it('multi с неразобранным значением (-1) отбрасывается, а не чинится частично', () => {
    expect(normalizeBlock({ kind: 'multi', prompt: 'p', options: ['a', 'b'], correct: [0, -1], why: '' }, ctx)).toBeNull()
  })

  it('multi со значением за границами списка вариантов отбрасывается', () => {
    expect(normalizeBlock({ kind: 'multi', prompt: 'p', options: ['a', 'b'], correct: [0, 7], why: '' }, ctx)).toBeNull()
  })

  it('order → слова и эталонный порядок (ранги 0..n-1 — позиции в data-order, как их отдаёт collectLesson)', () => {
    const t = normalizeBlock({ kind: 'order', prompt: '', words: ['coffee', 'I', 'like'], order: [2, 0, 1], why: '' }, ctx)
    expect(t).toMatchObject({ type: 'order', words: ['coffee', 'I', 'like'], answer: ['I', 'like', 'coffee'] })
  })

  it('order (A0, числовой формат) → перестановка валидна, ответ собирается верно', () => {
    const t = normalizeBlock(
      { kind: 'order', prompt: '', words: ['coffee', 'always', 'I', 'drink'], order: [3, 1, 0, 2], why: '' },
      ctx,
    )
    expect(t).toMatchObject({ answer: ['I', 'always', 'drink', 'coffee'] })
  })

  it('order (A1, строковый формат data-val — ранги уже пересчитаны collectLesson) → ответ собирается верно', () => {
    // На нормализацию строковый исходный data-val не попадает: collectLesson уже
    // превратил его в позицию 0..n-1. Здесь фиксируем, что эти позиции
    // обрабатываются как обычная числовая перестановка.
    const t = normalizeBlock(
      { kind: 'order', prompt: '', words: ['early', 'up', 'get', 'always', 'I'], order: [4, 3, 2, 1, 0], why: '' },
      ctx,
    )
    expect(t).toMatchObject({ answer: ['I', 'always', 'get', 'up', 'early'] })
  })

  it('order с чипом, чьё значение отсутствует в data-order (ранг -1), отбрасывается — не выдаём правдоподобный, но неверный порядок', () => {
    expect(
      normalizeBlock({ kind: 'order', prompt: '', words: ['I', 'like', 'coffee'], order: [0, -1, 2], why: '' }, ctx),
    ).toBeNull()
  })

  it('order с повторяющимися рангами (два чипа с одинаковым data-val) отбрасывается', () => {
    expect(
      normalizeBlock({ kind: 'order', prompt: '', words: ['I', 'like', 'coffee'], order: [0, 0, 2], why: '' }, ctx),
    ).toBeNull()
  })

  it('order с рангами, не покрывающими весь диапазон 0..n-1 (несовпадение длин списков), отбрасывается', () => {
    // Например data-order длиннее списка чипов: реальных рангов меньше n, и
    // получившийся набор индексов не образует полную перестановку 0..n-1.
    expect(
      normalizeBlock({ kind: 'order', prompt: '', words: ['I', 'like', 'coffee'], order: [0, 1, 3], why: '' }, ctx),
    ).toBeNull()
  })

  it('audio → listen с абсолютным URL файл-сервера', () => {
    const t = normalizeBlock({ kind: 'audio', trackId: 't1', label: 'Слушать' }, ctx)
    expect(t.type).toBe('listen')
    expect(t.tracks).toEqual([{ src: 'https://files-dev.justtostudy.kz/development/course-catalog/a0/audio/a0_1.mp3', label: 'Слушать' }])
  })

  it('audio без файла в треках урока отбрасывается', () => {
    expect(normalizeBlock({ kind: 'audio', trackId: 'нет', label: 'x' }, ctx)).toBeNull()
  })

  it('info → html как есть', () => {
    const t = normalizeBlock({ kind: 'info', html: '<p class="x">текст</p>' }, ctx)
    expect(t).toMatchObject({ type: 'info', html: '<p class="x">текст</p>' })
  })

  it('пустой info отбрасывается', () => {
    expect(normalizeBlock({ kind: 'info', html: '   ' }, ctx)).toBeNull()
  })
})

// Находка ревью: normalizeBlock молча возвращал null, и потерянный контент
// нигде не всплывал — именно поэтому буквенный data-correct у A1 (1222
// выброшенных задания) дожил до финального ревью. У каждого отказа теперь есть
// причина, и её получает вызывающий.
describe('normalizeBlock — причина отбраковки', () => {
  const withDrop = () => {
    const onDrop = vi.fn()
    return { onDrop, ctx: { ...ctx, onDrop } }
  }

  it('сообщает причину для каждого вида непроверяемого блока', () => {
    const cases = [
      [{ kind: 'choice', prompt: 'x', options: ['a'], correct: -1 }, DROP.choiceNoAnswer],
      [{ kind: 'select', prompt: 'x', options: ['a'], answer: 'b' }, DROP.selectAnswerOutside],
      [{ kind: 'gap', before: 'I', after: '', answer: '' }, DROP.gapNoAnswer],
      [{ kind: 'multi', prompt: 'x', options: ['a'], correct: [] }, DROP.multiNoAnswer],
      [{ kind: 'order', prompt: '', words: ['I'], order: [0] }, DROP.orderTooShort],
      [{ kind: 'order', prompt: '', words: ['I', 'like'], order: [0, 0] }, DROP.orderNotPermutation],
      [{ kind: 'audio', trackId: 'нет', label: 'x' }, DROP.audioNoTrack],
      [{ kind: 'info', html: '  ' }, DROP.infoEmpty],
      [{ kind: 'что-то новое' }, DROP.unknownKind],
    ]
    for (const [block, reason] of cases) {
      const { onDrop, ctx: withOnDrop } = withDrop()
      expect(normalizeBlock(block, withOnDrop)).toBeNull()
      expect(onDrop).toHaveBeenCalledWith(reason, block)
    }
  })

  it('на успешной нормализации причину не сообщает', () => {
    const { onDrop, ctx: withOnDrop } = withDrop()
    expect(normalizeBlock({ kind: 'choice', prompt: 'x', options: ['a', 'b'], correct: 1 }, withOnDrop)).not.toBeNull()
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('без onDrop в контексте работает по-прежнему', () => {
    expect(normalizeBlock({ kind: 'info', html: '' }, ctx)).toBeNull()
  })
})

describe('trackUrl', () => {
  it('строит ссылку на бандл уровня в админке', () => {
    expect(trackUrl('a1', 'A1_L1_6_1.mp3')).toBe('https://files-dev.justtostudy.kz/development/course-catalog/a1/audio/A1_L1_6_1.mp3')
  })
})
