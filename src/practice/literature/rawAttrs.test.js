// Сторож подстановок без esc() в атрибутах движка.
//
// Движок прототипа ставит часть полей данных в атрибуты (onclick="go('item','${id}')", class, href…) без
// экранирования, а код атрибутов data-lw-on… экран исполняет через eval. Безопасно это только потому, что бэкенд
// пропускает такие поля по белому списку формы (backend docs/practice/LITERATURE.md, LiteratureMarkup). Список снят с
// движка 17.11.2026; заливку с другим движком бэкенд замечает по engine-sha, а пересборку движка сайтом — никто.
// Поэтому снимок: новый прототип принёс новую сырую подстановку — тест красный. Тогда: если выражение берёт поле
// данных бандла, добавить его в белый список бэкенда (и в LITERATURE.md), и только потом обновить снимок
// (`npx vitest run src/practice/literature/rawAttrs.test.js -u`).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ENGINE = readFileSync(new URL('./engine.js', import.meta.url), 'utf8')

/** Все `${…}` внутри значений атрибутов шаблонов: «имя :: выражение». */
function rawAttrExprs(src) {
  const re = /([\w:-]+)=(["'])/g
  const out = new Set()
  let m
  while ((m = re.exec(src))) {
    const q = m[2]
    let i = re.lastIndex
    let depth = 0
    let start = 0
    const exprs = []
    let ok = true
    for (let guard = 0; i < src.length && guard < 4000; guard++) {
      const c = src[i]
      if (depth === 0 && c === q) break
      // не атрибут разметки, а что-то другое (строка кода, конец шаблона) — пропускаем
      if (depth === 0 && (c === '<' || c === '>' || c === '\n' || c === '`')) {
        ok = false
        break
      }
      if (c === '$' && src[i + 1] === '{') {
        if (depth === 0) start = i + 2
        depth++
        i += 2
        continue
      }
      if (depth > 0 && c === '{') depth++
      if (depth > 0 && c === '}') {
        depth--
        if (depth === 0) exprs.push(src.slice(start, i))
      }
      i++
    }
    if (!ok) continue
    for (const e of exprs) {
      const expr = e.replace(/\s+/g, ' ').trim()
      // экранированное движком — не про белый список
      if (/^esc\(/.test(expr)) continue
      out.add(`${m[1]} :: ${expr}`)
    }
  }
  return [...out].sort()
}

describe('Literature World — подстановки без esc() в атрибутах движка', () => {
  it('список тот же, что сверен с белым списком бэкенда', () => {
    const list = rawAttrExprs(ENGINE)
    expect(list.length).toBeGreaterThan(50)
    expect(list).toMatchSnapshot()
  })
})
