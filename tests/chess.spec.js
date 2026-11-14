// tests/chess.spec.js
import { test, expect } from '@playwright/test'

// Шахматы (?screen=chess). Тесты гостевые: прогресс гостя живёт в черновике хранилища на устройстве.
// Движок подменён функцией «позиция → ход» (window.__jtsFakeChessEngine): ходы бота задаёт сценарий теста,
// партия проходит за секунды. Настоящий Stockfish проверяет последний тест — один ход.

const sq = (page, name) => page.locator(`.ch-board [data-square="${name}"]`)
const root = (page) => page.locator('.ch')

async function fakeEngine(page, script) {
  await page.addInitScript((moves) => {
    window.__chessScript = moves.slice()
    window.__jtsFakeChessEngine = () => window.__chessScript.shift() || null
  }, script)
}

async function open(page) {
  await page.goto('/?screen=chess')
  await expect(root(page)).toBeVisible({ timeout: 30000 })
}

async function startGame(page, { color = 'w' } = {}) {
  const dialog = page.locator('.ch-dialog[data-dialog="new"]')
  await expect(dialog).toBeVisible()
  await dialog.locator(`[data-color="${color}"]`).click()
  await dialog.locator('[data-act="play"]').click()
  await expect(root(page)).toHaveAttribute('data-status', 'playing')
}

// Ход двумя тапами; ждём, пока очередь вернётся к ученику (бот ответил) или партия кончится.
async function move(page, from, to) {
  await sq(page, from).click()
  await sq(page, to).click()
  await expect(async () => {
    const status = await root(page).getAttribute('data-status')
    if (status === 'over') return
    expect(await root(page).getAttribute('data-turn')).toBe('w')
  }).toPass({ timeout: 10000 })
}

test('возможные ходы: точки на пустых клетках, кольцо на взятии', async ({ page }) => {
  await fakeEngine(page, ['d7d5'])
  await open(page)
  await startGame(page)
  await sq(page, 'e2').click()
  await expect(page.locator('.ch-board [data-move="dot"]')).toHaveCount(2)
  await expect(sq(page, 'e4').locator('[data-move="dot"]')).toBeVisible()
  await sq(page, 'e4').click()
  await expect(sq(page, 'd5')).toHaveAttribute('data-piece', 'bp')
  await sq(page, 'e4').click()
  await expect(sq(page, 'd5').locator('[data-move="ring"]')).toBeVisible()
  await expect(sq(page, 'e5').locator('[data-move="dot"]')).toBeVisible()
})

test('партия до мата: окно итога и рост рейтинга', async ({ page }) => {
  await fakeEngine(page, ['e7e5', 'b8c6', 'g8f6'])
  await open(page)
  await startGame(page)
  await move(page, 'e2', 'e4')
  await move(page, 'f1', 'c4')
  await move(page, 'd1', 'h5')
  await move(page, 'h5', 'f7')
  const result = page.locator('.ch-dialog[data-dialog="result"]')
  await expect(result).toBeVisible()
  await expect(result.locator('[data-result]')).toHaveAttribute('data-result', '1-0')
  await expect(result.locator('[data-rating]')).toHaveAttribute('data-rating', '816')
  await expect(page.locator('.ch-moves [data-ply]')).toHaveCount(7)
})

test('превращение пешки: выбор фигуры', async ({ page }) => {
  await fakeEngine(page, ['b7b5', 'a7a6', 'c8b7', 'b8c6', 'h7h6'])
  await open(page)
  await startGame(page)
  await move(page, 'a2', 'a4')
  await move(page, 'a4', 'b5')
  await move(page, 'b5', 'a6')
  await move(page, 'a6', 'b7')
  await sq(page, 'b7').click()
  await sq(page, 'a8').click()
  await expect(page.locator('.ch-promo [data-promote]')).toHaveCount(4)
  await page.locator('.ch-promo [data-promote="q"]').click()
  await expect(sq(page, 'a8')).toHaveAttribute('data-piece', 'wq')
})

test('возврат хода откатывает пару ходов и снимает рейтинг', async ({ page }) => {
  await fakeEngine(page, ['e7e5'])
  await open(page)
  await startGame(page)
  await move(page, 'e2', 'e4')
  await page.locator('[data-act="undo"]').click()
  await expect(sq(page, 'e2')).toHaveAttribute('data-piece', 'wp')
  await expect(sq(page, 'e7')).toHaveAttribute('data-piece', 'bp')
  await expect(page.locator('.ch-side [data-unrated]')).toBeVisible()
})

test('перезагрузка возвращает партию и часы', async ({ page }) => {
  await fakeEngine(page, ['e7e5'])
  await open(page)
  const dialog = page.locator('.ch-dialog[data-dialog="new"]')
  await dialog.locator('[data-time="5"]').click()
  await startGame(page)
  await move(page, 'e2', 'e4')
  const fen = await page.locator('.ch-board').getAttribute('data-fen')
  await page.reload()
  await expect(page.locator('.ch-board')).toHaveAttribute('data-fen', fen, { timeout: 30000 })
  await expect(page.locator('.ch-clock')).toHaveCount(2)
  await expect(page.locator('.ch-dialog')).toHaveCount(0)
})

test('сыгранная партия появляется в истории и листается', async ({ page }) => {
  await fakeEngine(page, ['e7e5', 'd7d6'])
  await open(page)
  await startGame(page)
  await move(page, 'e2', 'e4')
  await move(page, 'd2', 'd4')
  await page.locator('[data-act="resign"]').click()
  await page.locator('.ch-dialog[data-dialog="confirm"] [data-act="confirm"]').click()
  await expect(page.locator('.ch-dialog[data-dialog="result"] [data-rating]')).toHaveAttribute('data-rating', '784')
  await page.locator('[data-act="review"]').click()
  await expect(page.locator('.ch-review .ch-board')).toBeVisible()
  await page.locator('[data-step="first"]').click()
  await expect(sq(page, 'e2')).toHaveAttribute('data-piece', 'wp')
})

test('настоящий Stockfish поднимается и отвечает ходом', async ({ page }) => {
  await open(page)
  const dialog = page.locator('.ch-dialog[data-dialog="new"]')
  // 1500 — родная шкала движка: ход точно приходит от Stockfish, а не из «слабых» случайных.
  await dialog.locator('#ch-bot').fill('1500')
  await expect(root(page)).toHaveAttribute('data-engine', 'ready', { timeout: 20000 })
  await startGame(page)
  await sq(page, 'e2').click()
  await sq(page, 'e4').click()
  await expect(page.locator('.ch-moves [data-ply]')).toHaveCount(2, { timeout: 20000 })
})
