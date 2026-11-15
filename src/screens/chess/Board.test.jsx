// @vitest-environment jsdom
// src/screens/chess/Board.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(cleanup)
import { render, fireEvent, cleanup } from '@testing-library/react'
import Board, { squaresFor } from './Board.jsx'
import { PieceSprite } from './pieces.jsx'
import { chessT, CHESS_LANGS, CHESS_DICTS } from './strings.js'
import { createGame } from '../../practice/chess/game.js'

const t = chessT('en')
function setup(game, props = {}) {
  const onMove = vi.fn()
  const utils = render(
    <>
      <PieceSprite />
      <Board fen={game.fen()} board={game.board()} orientation="w" playerColor="w" interactive movesFrom={(sq) => game.movesFrom(sq)}
        onMove={onMove} lastMove={null} check={null} hint={null} animateLast={false} t={t} {...props} />
    </>,
  )
  const sq = (name) => utils.container.querySelector(`[data-square="${name}"]`)
  const tap = (name) => fireEvent.pointerDown(sq(name), { pointerId: 1, clientX: 0, clientY: 0 })
  return { ...utils, onMove, sq, tap }
}

describe('словарь шахмат', () => {
  it('у языков одни и те же ключи', () => {
    const en = Object.keys(CHESS_DICTS.en).sort()
    for (const lang of CHESS_LANGS) expect(Object.keys(CHESS_DICTS[lang]).sort()).toEqual(en)
  })
  it('подстановка и запасной английский', () => {
    expect(chessT('ru')('minutes', { n: 5 })).toBe('5 мин')
    expect(chessT('xx')('play')).toBe('Play')
  })
})

describe('доска', () => {
  it('белыми a8 слева сверху, чёрными — h1', () => {
    expect(squaresFor('w')[0]).toBe('a8')
    expect(squaresFor('w')[63]).toBe('h1')
    expect(squaresFor('b')[0]).toBe('h1')
    expect(squaresFor('b')[63]).toBe('a8')
  })
  it('рисует 64 клетки с фигурами начальной позиции', () => {
    const { container, sq } = setup(createGame())
    expect(container.querySelectorAll('[data-square]')).toHaveLength(64)
    expect(sq('e1').dataset.piece).toBe('wk')
    expect(sq('d8').dataset.piece).toBe('bq')
    expect(sq('e4').dataset.piece).toBe('')
    expect(sq('e2').getAttribute('aria-label')).toBe('e2, white pawn')
  })
  it('выбор фигуры ставит точки на пустые клетки', () => {
    const { container, tap } = setup(createGame())
    tap('e2')
    const marks = [...container.querySelectorAll('[data-move]')]
    expect(marks.map((m) => m.dataset.move)).toEqual(['dot', 'dot'])
    expect(marks.map((m) => m.closest('[data-square]').dataset.square).sort()).toEqual(['e3', 'e4'])
  })
  it('на клетке со взятием — кольцо', () => {
    const g = createGame()
    g.move({ from: 'e2', to: 'e4' }); g.move({ from: 'd7', to: 'd5' })
    const { sq, tap } = setup(g)
    tap('e4')
    expect(sq('d5').querySelector('[data-move]').dataset.move).toBe('ring')
    expect(sq('e5').querySelector('[data-move]').dataset.move).toBe('dot')
  })
  it('тап по фигуре и тап по отмеченной клетке — ход; тап мимо снимает выбор', () => {
    const { container, onMove, tap } = setup(createGame())
    tap('e2'); tap('e4')
    expect(onMove).toHaveBeenCalledWith('e2', 'e4', undefined)
    tap('g1'); tap('a5')
    expect(container.querySelectorAll('[data-move]')).toHaveLength(0)
    expect(onMove).toHaveBeenCalledTimes(1)
  })
  it('чужие фигуры и выключенная доска не выбираются', () => {
    const a = setup(createGame())
    a.tap('e7')
    expect(a.container.querySelectorAll('[data-move]')).toHaveLength(0)
    a.unmount()
    const b = setup(createGame(), { interactive: false })
    b.tap('e2')
    expect(b.container.querySelectorAll('[data-move]')).toHaveLength(0)
  })
  it('превращение спрашивает фигуру и отдаёт её в ход', () => {
    const g = createGame('[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n[SetUp "1"]\n\n*')
    const { container, onMove, tap } = setup(g)
    tap('a7'); tap('a8')
    expect(onMove).not.toHaveBeenCalled()
    const choices = [...container.querySelectorAll('.ch-promo [data-promote]')]
    expect(choices.map((c) => c.dataset.promote)).toEqual(['q', 'r', 'b', 'n'])
    fireEvent.click(choices[3])
    expect(onMove).toHaveBeenCalledWith('a7', 'a8', 'n')
  })
  it('последний ход, шах и подсказка помечены', () => {
    const g = createGame()
    const { container, sq } = setup(g, { lastMove: { from: 'e2', to: 'e4' }, check: 'e1', hint: { from: 'g1', to: 'f3' } })
    expect(sq('e2').className).toContain('ch-sq--last')
    expect(sq('e4').className).toContain('ch-sq--last')
    expect(sq('e1').className).toContain('ch-sq--check')
    expect(container.querySelector('.ch-arrow')).not.toBe(null)
  })
  it('Enter по клетке работает как тап', () => {
    const { onMove, sq } = setup(createGame())
    fireEvent.keyDown(sq('e2'), { key: 'Enter' })
    fireEvent.keyDown(sq('e4'), { key: 'Enter' })
    expect(onMove).toHaveBeenCalledWith('e2', 'e4', undefined)
  })
})

describe('мышь', () => {
  it('повторное нажатие на выбранную фигуру снимает выбор', () => {
    const { sq, tap, container } = setup(createGame())
    const root = container.querySelector('.ch-board')
    tap('e2')
    fireEvent.pointerUp(root, { pointerId: 1, clientX: 0, clientY: 0 })
    expect(sq('e2').className).toContain('ch-sq--picked')
    tap('e2')
    fireEvent.pointerUp(root, { pointerId: 1, clientX: 0, clientY: 0 })
    expect(sq('e2').className).not.toContain('ch-sq--picked')
    expect(container.querySelectorAll('[data-move]')).toHaveLength(0)
  })
  it('правая кнопка отменяет выбор и не делает хода', () => {
    const { sq, tap, onMove, container } = setup(createGame())
    tap('e2')
    // В jsdom нет PointerEvent с кнопкой — событие того же имени собираем из MouseEvent.
    fireEvent(sq('e4'), new MouseEvent('pointerdown', { bubbles: true, button: 2 }))
    expect(container.querySelectorAll('[data-move]')).toHaveLength(0)
    expect(onMove).not.toHaveBeenCalled()
  })
  it('рука — только на своих фигурах, палец — на клетках хода', () => {
    const { sq, tap } = setup(createGame())
    expect(sq('e2').className).toContain('ch-sq--mine')
    expect(sq('e7').className).not.toContain('ch-sq--mine')
    tap('e2')
    expect(sq('e4').className).toContain('ch-sq--target')
  })
})
