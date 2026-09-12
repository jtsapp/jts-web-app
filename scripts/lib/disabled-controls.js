// Сканер «немых контролов»: элемент выключается в JSX, а в CSS у него нет
// выключенного вида.
//
// Зачем. Ученик прислал видео: пятнадцать секунд жмёт True/False на уроке, и
// ничего. Кнопки были `disabled` (урок на перерыве), но выглядели ровно как
// живые: единственным правилом у `.lw-opt` было `cursor: default`, а курсора на
// телефоне нет. Пока такую дыру ловит только чей-то глаз, она заводится снова —
// в тот же день нашлись ещё три (пары, банк слов, поле письма).
//
// Сканер текстовый, без парсера JSX: для правила «у класса есть правило со
// сцепкой :disabled» этого достаточно, а babel ради одной проверки в дерево
// зависимостей тянуть незачем.

/** Имя класса — с дефисом или подчёркиванием: `lw-opt`, `board__tool`. */
const CLASS_LITERAL = /[A-Za-z][\w-]*/g

/** `disabled` как отдельный атрибут, а не кусок `aria-disabled` или `isDisabled`. */
const DISABLED_ATTR = /(?<![\w-])disabled(?=[\s=/>}])/

/**
 * Селекторы, которые красят выключенное состояние. `.is-used` и `.is-off` —
 * принятые в этом коде имена «уже использовано / выключено», они гасят плашку
 * не хуже `:disabled`.
 */
const DISABLED_SELECTOR = /:disabled|\[disabled\]|\.is-disabled|\.is-locked|\.is-off|\.is-used|aria-disabled/

/** Нативные поля браузер гасит сам — их спрашивать не с кого. */
const NATIVE_GREY = new Set(['input', 'textarea', 'select', 'option'])

/** Убираем `${…}` из шаблонной строки: внутри выражения, а не имена классов. */
export function stripInterpolations(text) {
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('${', i)) {
      let depth = 1
      i += 2
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth += 1
        else if (text[i] === '}') depth -= 1
        i += 1
      }
    } else {
      out += text[i]
      i += 1
    }
  }
  return out
}

function classesFromLiteral(text) {
  const out = []
  for (const [, body] of text.matchAll(/['"`]([^'"`]*)['"`]/g)) {
    for (const cls of body.match(CLASS_LITERAL) || []) {
      if (/[-_]/.test(cls)) out.push(cls)
    }
  }
  return out
}

/**
 * Классы из локальной переменной: `let cls = 'lw-opt'` плюс `cls += ' is-ok'`.
 *
 * Без этого половина отчёта — «класс неизвестен»: варианты выбора, плитки пар и
 * чипы собирают имя цепочкой, и по самому тегу его не видно.
 */
export function resolveVariableClasses(text, name) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const chunks = [
    ...text.matchAll(new RegExp(`(?:let|const|var)\\s+${safe}\\s*=\\s*([^\\n]*)`, 'g')),
    ...text.matchAll(new RegExp(`${safe}\\s*\\+=\\s*([^\\n]*)`, 'g')),
  ]
  return chunks.flatMap(([, chunk]) => classesFromLiteral(stripInterpolations(chunk)))
}

/** Границы открывающих тегов: от `<Имя` до `>` на нулевой глубине скобок. */
function* tagSpans(text) {
  let i = 0
  while (i < text.length) {
    if (text[i] === '<' && /[A-Za-z_]/.test(text[i + 1] || '')) {
      let depth = 0
      let quote = null
      let j = i + 1
      for (; j < text.length; j += 1) {
        const c = text[j]
        if (quote) {
          if (c === quote) quote = null
        } else if (c === '"' || c === "'" || c === '`') quote = c
        else if (c === '{') depth += 1
        else if (c === '}') depth -= 1
        else if (c === '>' && depth === 0) {
          yield [i, j]
          break
        }
      }
      i = j + 1
    } else {
      i += 1
    }
  }
}

/** Классы, у которых в CSS есть правило про выключенное состояние. */
export function styledDisabledClasses(cssFiles) {
  const styled = new Set()
  for (const { text } of cssFiles) {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [, selector] of clean.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      for (const part of selector.split(',')) {
        if (!DISABLED_SELECTOR.test(part)) continue
        const bare = part.replace(/:disabled/g, ' ').replace(/\[disabled\]/g, ' ')
        for (const cls of bare.match(CLASS_LITERAL) || []) styled.add(cls)
      }
    }
  }
  return styled
}

/**
 * Что нашли: `gaps` — свои контролы без выключенного вида, `native` — поля,
 * которые гасит браузер, `components` — `disabled`, уехавший пропом в свой
 * компонент (смотреть надо внутри него, и он попадёт в отчёт своей строкой).
 */
export function scanDisabledControls({ jsxFiles, cssFiles }) {
  const styled = styledDisabledClasses(cssFiles)
  const gaps = []
  const native = []
  const components = []

  for (const { path, text } of jsxFiles) {
    for (const [start, end] of tagSpans(text)) {
      const tag = text.slice(start, end + 1)
      if (!DISABLED_ATTR.test(tag)) continue
      const name = /<([A-Za-z_][\w.]*)/.exec(tag)[1]
      const attr = /className=(\{`[^`]*`\}|\{[^}]*\}|"[^"]*")/s.exec(tag)
      let classes = []
      if (attr) {
        const value = attr[1].trim()
        const variable = /^\{\s*([A-Za-z_$][\w$]*)\s*\}$/.exec(value)
        classes = variable
          ? resolveVariableClasses(text, variable[1])
          : classesFromLiteral(stripInterpolations(value))
      }
      if (classes.some((cls) => styled.has(cls))) continue
      const row = { path, name, classes: [...new Set(classes)].sort() }
      if (NATIVE_GREY.has(name)) native.push(row)
      else if (/[A-Z]/.test(name[0])) components.push(row)
      else gaps.push(row)
    }
  }
  return { gaps, native, components }
}

/** Ключ находки: путь + тег + классы. Без номера строки — правка выше по файлу
 *  не должна выглядеть новой дырой. */
export function gapKey(row) {
  return `${row.path} <${row.name}>${row.classes.length ? ` .${row.classes.join('.')}` : ''}`
}
