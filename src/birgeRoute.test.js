import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { shellNavOf } from './lib/screenShell.js'

// Проводка Birge в App проверяется по исходнику, как в screenRoutes.test.js и sidebarNav.test.js: App целиком в тесте не
// поднять, а забытая строка (ветка handleNav, чтение ?post=) не ломает сборку — раздел просто молча не открывается.
const app = readFileSync(fileURLToPath(new URL('./App.jsx', import.meta.url)), 'utf8')

describe('Birge в App', () => {
  it('экран ленивый и смонтирован с целью перехода', () => {
    expect(app).toContain("const BirgePage = lazyScreen(() => import('./screens/BirgePage.jsx'))")
    expect(app).toMatch(/case 'birge':\s*\n\s*return <BirgePage target=\{birgeTarget\}/)
  })

  it('меню и уведомление ведут в раздел; цель несёт id ветки и метку времени', () => {
    expect(app).toContain("else if (key === 'birge') {")
    expect(app).toContain('setBirgeTarget({ postId: payload?.postId ? Number(payload.postId) : null, at: Date.now() })')
  })

  it('?screen=birge&post=<id> открывает ветку, а сам экран держится в адресе', () => {
    expect(app).toMatch(/deepLink === 'birge'[\s\S]{0,240}searchParams\.get\('post'\)/)
    const persistable = app.slice(app.indexOf('const PERSISTABLE_SCREENS'), app.indexOf('function persistsInUrl'))
    expect(persistable).toContain("'birge'")
  })

  it('«Открыть обращение» доходит до Feedback с id обращения', () => {
    expect(app).toContain('payload?.feedbackId != null ? { feedbackId: payload.feedbackId } : null')
    expect(app).toContain('initialFeedbackId={feedbackDraft?.feedbackId}')
  })

  it('пока грузится чанк, в меню горит Birge', () => {
    expect(shellNavOf('birge')).toBe('birge')
  })
})
