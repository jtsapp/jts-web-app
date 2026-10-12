// Ревью Практики 08.10.2026, #82: помощник (плавающая кнопка и окно чата)
// стоял на z-index 90, а окна Практики — ниже: панель настроек Чтения (70),
// оглавление Воркбука (60), окна Письма (60, 80), окно Словаря (50). Кнопка
// помощника лежала поверх затемнения и самого окна и нажималась сквозь него;
// так же — над окнами оплаты (60) и «Выйти из урока» на телефоне (60).
//
// Правило шапки assistant.css — «выше контента, ниже любого окна». Сторож
// проверяет его по всем стилям сразу: каждое полноэкранное окно
// (position: fixed + inset: 0) обязано лежать выше помощника, а сам помощник —
// выше липких шапок и карточек перевода, которые живут ниже 40.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('.', import.meta.url))

function cssFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) cssFiles(full, out)
    else if (e.name.endsWith('.css')) out.push(full)
  }
  return out
}

// Самые внутренние блоки «селектор { свойства }» — @media-обёртки отпадают сами.
function rules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }))
}
const zOf = (body) => {
  const m = body.match(/z-index:\s*(\d+)/)
  return m ? Number(m[1]) : null
}

const files = cssFiles(SRC).map((f) => ({ path: f.slice(SRC.length).split(sep).join('/'), text: readFileSync(f, 'utf8') }))
const assistant = files.find((f) => f.path === 'assistant.css')
const asstZ = Math.max(...rules(assistant.text).filter((r) => /\.asst__(launcher|panel)\b/.test(r.sel)).map((r) => zOf(r.body) || 0))

describe('слой помощника', () => {
  it('каждое полноэкранное окно выше помощника', () => {
    const below = []
    for (const f of files) {
      for (const r of rules(f.text)) {
        if (!/position:\s*fixed/.test(r.body) || !/inset:\s*0\b/.test(r.body)) continue
        const z = zOf(r.body)
        // z-index 0 и ниже — фон страницы (.kd-bg), а не окно.
        if (z !== null && z > 0 && z <= asstZ) below.push(`${f.path} ${r.sel} (z-index ${z})`)
      }
    }
    expect(below).toEqual([])
  })

  it('помощник выше липких шапок экранов: на телефоне его окно во всю высоту', () => {
    // Лендинг — отдельный маршрут (src/app/landing), помощника там нет.
    const above = []
    for (const f of files) {
      if (f.path === 'landing.css') continue
      for (const r of rules(f.text)) {
        if (!/position:\s*sticky/.test(r.body)) continue
        const z = zOf(r.body)
        if (z !== null && z >= asstZ) above.push(`${f.path} ${r.sel} (z-index ${z})`)
      }
    }
    expect(above).toEqual([])
  })
})
