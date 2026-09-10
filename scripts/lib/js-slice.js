// Вырезание кусков JavaScript из html-прототипов по имени, а не по номеру
// строки: номера умирают при первом же ре-экспорте макета.
//
// Голого счётчика скобок здесь мало. В прототипах встречаются регэкспы с
// фигурными скобками (`/\{[^}]+\}/g` в «Чтении»), апострофы внутри строк и
// комментарии — любая из этих скобок закрыла бы объявление на середине.
// Поэтому строки, комментарии и регэкспы проматываются целиком.
//
// Вынесено из scripts/extract-reading.js, когда те же ~80 строк понадобились
// экстрактору «Слов в картинках»: там данные и DOM лежат в ОДНОМ <script>,
// поэтому резать приходится каждую константу отдельно.

function fail(msg) {
  throw new Error('[js-slice] ' + msg)
}

/** Проматывает строковый литерал, начинающийся в позиции at. Возвращает индекс за ним. */
function skipString(src, at) {
  const quote = src[at]
  for (let i = at + 1; i < src.length; i++) {
    if (src[i] === '\\') { i++; continue }
    if (src[i] === quote) return i + 1
  }
  return fail('не закрылась строка в исходнике прототипа')
}

// Слеш начинает регэксп, а не деление, если перед ним оператор или открывающая
// скобка. В вырезаемых объявлениях регэкспы стоят только после `(`, `,` и `=`
// (.match(/…/), .replace(/…/, …)), так что списка хватает с запасом.
function isRegexStart(src, at) {
  for (let i = at - 1; i >= 0; i--) {
    const c = src[i]
    if (/\s/.test(c)) continue
    return '(,=:[!&|?{};+-*%~^'.includes(c)
  }
  return true
}

/** Проматывает регэксп-литерал вместе с флагами. Возвращает индекс за ним. */
function skipRegex(src, at) {
  let inClass = false
  for (let i = at + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') { i++; continue }
    if (c === '[') inClass = true
    else if (c === ']') inClass = false
    else if (c === '/' && !inClass) {
      while (/[a-z]/.test(src[i + 1] || '')) i++ // флаги
      return i + 1
    }
  }
  return fail('не закрылся регэксп в исходнике прототипа')
}

// Один шаг сканера: если в позиции i начинается строка, комментарий или
// регэксп — вернуть индекс за ними, иначе null (символ значим для баланса).
function skipNoise(src, i) {
  const c = src[i]
  if (c === '"' || c === "'" || c === '`') return skipString(src, i)
  if (c === '/' && src[i + 1] === '/') {
    const nl = src.indexOf('\n', i)
    return nl < 0 ? src.length : nl
  }
  if (c === '/' && src[i + 1] === '*') {
    const end = src.indexOf('*/', i)
    return end < 0 ? fail('не закрылся комментарий') : end + 2
  }
  if (c === '/' && isRegexStart(src, i)) return skipRegex(src, i)
  return null
}

/**
 * Исходник именованной функции целиком, вместе с сигнатурой.
 * Нужен для оракула: метрики должен считать САМ прототип, иначе фикстура
 * проверяет наш порт против нашего же порта и ничего не ловит.
 */
function sliceFunction(src, name) {
  const head = `function ${name}(`
  const at = src.indexOf(head)
  if (at < 0) fail(`не найдена функция ${name}() — прототип изменил структуру`)
  const open = src.indexOf('{', src.indexOf(')', at))
  if (open < 0) fail(`не найдено тело функции ${name}()`)
  let depth = 0
  let i = open
  while (i < src.length) {
    const skipped = skipNoise(src, i)
    if (skipped !== null) { i = skipped; continue }
    const c = src[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return src.slice(at, i + 1)
    }
    i++
  }
  return fail(`не закрылось тело функции ${name}()`)
}

/**
 * Исходник объявления `const NAME = …` до точки с запятой ВЕРХНЕГО уровня.
 * Точка с запятой внутри скобок, строк и регэкспов объявление не закрывает —
 * иначе стрелочные функции в данных резались бы посередине.
 */
function sliceConst(src, name) {
  const re = new RegExp(`(?:^|[\\n;])\\s*(const|let|var)\\s+${name}\\s*=`, 'm')
  const m = re.exec(src)
  if (!m) fail(`не найдено объявление ${name} — прототип изменил структуру`)
  const keyword = m[1]
  const start = src.indexOf(name, m.index + m[1].length)
  let depth = 0
  let i = src.indexOf('=', start) + 1
  while (i < src.length) {
    const skipped = skipNoise(src, i)
    if (skipped !== null) { i = skipped; continue }
    const c = src[i]
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) depth--
    else if ((c === ';' || c === '\n') && depth === 0) {
      // Перевод строки закрывает объявление только там, где выражение уже
      // синтаксически целое: прототипы пишут и с точкой с запятой, и без.
      const body = src.slice(start, i)
      if (c === ';' || isComplete(`${keyword} ${body}`)) return `${keyword} ${body}`
    }
    i++
  }
  return fail(`не закрылось объявление ${name}`)
}

function isComplete(code) {
  try {
    new Function(code)
    return true
  } catch {
    return false
  }
}

module.exports = { sliceFunction, sliceConst, skipString, skipRegex, isRegexStart }
