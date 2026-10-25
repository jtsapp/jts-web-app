// Читатель прототипа Word Hunt (jtswordhunt.html) — общий у выгрузки картинок
// и стилей, урезанной фикстуры, бандла и оракула.
//
// Устройство файла (контракт docs/superpowers/specs/2026-10-25-word-hunt-design.md,
// «Что это»): один <style> с 26 картинками дизайна в data-URI, скрипт данных с
// пятью однострочными JSON-литералами (`var DB=…;`, FIELDS, AUD, PICS, CLUEQ),
// затем скрипты движка. Литералы читаем как JSON, ничего не исполняя: так же их
// читает бэкенд при заливке, и бандл сайта совпадает с бандлом бэкенда.

const crypto = require('node:crypto')

const DATA_NAMES = ['DB', 'FIELDS', 'AUD', 'PICS', 'CLUEQ']

/** Все <style> и <script> файла: { tag, attrs, body, start, end } (start/end — границы тела). */
function blocks(html) {
  const out = []
  const re = /<(script|style)([^>]*)>/g
  let m
  while ((m = re.exec(html))) {
    const start = re.lastIndex
    const end = html.indexOf(`</${m[1]}>`, start)
    if (end < 0) throw new Error(`не закрыт <${m[1]}> на ${m.index}`)
    out.push({ tag: m[1], attrs: m[2], body: html.slice(start, end), start, end })
    re.lastIndex = end
  }
  return out
}

function isDataScript(b) {
  return b.tag === 'script' && /\bvar DB=/.test(b.body)
}

/** Один литерал `var NAME=<json>;` скрипта данных. */
function literal(dataBody, name) {
  const line = dataBody.split('\n').find((l) => l.startsWith(`var ${name}=`))
  if (!line) throw new Error(`нет var ${name}=`)
  const json = line.slice(`var ${name}=`.length).replace(/;\s*$/, '')
  try {
    return JSON.parse(json)
  } catch (e) {
    throw new Error(`var ${name} — не JSON: ${e.message}`)
  }
}

function readPrototype(html) {
  const all = blocks(html)
  const data = all.filter(isDataScript)
  if (data.length !== 1) throw new Error(`скриптов данных (var DB=) ${data.length}, ждали один`)
  const values = Object.fromEntries(DATA_NAMES.map((n) => [n, literal(data[0].body, n)]))
  const styles = all.filter((b) => b.tag === 'style')
  const engine = all.filter((b) => (b.tag === 'style' || (b.tag === 'script' && !/\bsrc=/.test(b.attrs))) && !isDataScript(b))
  return { blocks: all, dataBlock: data[0], styles, engine, ...values }
}

/** Хэш движка по контракту: тексты всех <style> и <script> без src, кроме скрипта данных, через \n. */
function engineSha(html) {
  const { engine } = readPrototype(html)
  const text = engine.map((b) => b.body.replace(/\r\n?/g, '\n')).join('\n')
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

/** Скрипт движка по первой строке шапки-комментария («XWCore», «WSCore», «LXClue»…). */
function engineScript(proto, marker) {
  const found = proto.engine.filter((b) => b.tag === 'script' && b.body.includes(marker))
  if (found.length !== 1) throw new Error(`скриптов с «${marker}»: ${found.length}`)
  return found[0].body
}

module.exports = { DATA_NAMES, blocks, readPrototype, engineSha, engineScript }
