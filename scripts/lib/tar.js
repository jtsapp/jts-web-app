// Минимальный писатель tar (ustar) без внешних зависимостей — пара к zip.js.
//
// Нужен под одно: модель Vosk для позывного Луны приезжает с alphacephei.com
// zip-архивом, а vosk-browser читает только .tar.gz (scripts/fetch-wake-model.js).
// Тянуть ради перепаковки tar/fflate не стали — как и с ZIP.
//
// mtime у всех записей нулевой: архив из одного и того же zip побайтно один и тот
// же при любом прогоне, и сборки не отличаются ничем, кроме кода.
const zlib = require('zlib')

// Числовые поля tar — восьмеричные строки фиксированной ширины с завершающим \0.
function octal(n, width) {
  return n.toString(8).padStart(width - 1, '0') + '\0'
}

function header(name, size, type) {
  // Длинные имена требуют поля prefix или расширений pax — у модели самое длинное
  // имя 54 байта, поэтому честно падаем, а не режем путь молча.
  if (Buffer.byteLength(name) > 99) throw new Error(`tar: имя длиннее 99 байт: ${name}`)
  const h = Buffer.alloc(512)
  h.write(name, 0, 'utf8')
  h.write(octal(type === '5' ? 0o755 : 0o644, 8), 100, 'ascii')
  h.write(octal(0, 8), 108, 'ascii')
  h.write(octal(0, 8), 116, 'ascii')
  h.write(octal(size, 12), 124, 'ascii')
  h.write(octal(0, 12), 136, 'ascii')
  // Контрольная сумма считается, пока её собственное поле заполнено пробелами.
  h.write('        ', 148, 'ascii')
  h.write(type, 156, 'ascii')
  h.write('ustar\0', 257, 'ascii')
  h.write('00', 263, 'ascii')
  let sum = 0
  for (const b of h) sum += b
  h.write(`${octal(sum, 7)} `, 148, 'ascii')
  return h
}

/**
 * Собирает несжатый tar.
 * @param {{name: string, data?: Buffer}[]} entries  имя, кончающееся на «/», — каталог
 * @returns {Buffer}
 */
function tarSync(entries) {
  const parts = []
  for (const e of entries) {
    const dir = e.name.endsWith('/')
    const data = dir ? Buffer.alloc(0) : Buffer.from(e.data ?? '')
    parts.push(header(e.name, data.length, dir ? '5' : '0'))
    if (data.length) {
      parts.push(data)
      const pad = (512 - (data.length % 512)) % 512
      if (pad) parts.push(Buffer.alloc(pad))
    }
  }
  parts.push(Buffer.alloc(1024))
  return Buffer.concat(parts)
}

/** tar, сжатый gzip. */
function tarGzSync(entries) {
  return zlib.gzipSync(tarSync(entries), { level: 9 })
}

module.exports = { tarSync, tarGzSync }
