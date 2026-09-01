// Минимальный писатель ZIP без внешних зависимостей.
//
// Нужен ровно под один сценарий: собрать комикс в архив, который админка
// отдаёт бэкенду одним куском (см. docs/superpowers/specs/2026-08-31-comics-api-contract.md).
// Тянуть ради этого archiver/fflate не стали — в проекте и PDF разбирается
// своим парсером.
//
// Пишем методом STORE (без сжатия): внутри архива лежат WebP, они уже сжаты,
// и deflate поверх них даёт доли процента при заметном времени. JSON рядом
// весит килобайты, на общий размер не влияет.
const zlib = require('zlib')

// CRC32 — часть формата, без него распаковщики ругаются на битый архив.
// Таблицу считаем один раз при первом вызове.
let CRC_TABLE = null
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE
  CRC_TABLE = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    CRC_TABLE[i] = c
  }
  return CRC_TABLE
}

function crc32(buf) {
  const table = crcTable()
  let c = -1
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

// Время правим на фиксированное: иначе одинаковый по содержимому архив каждый
// раз получает новый хеш, и «поменялось ли что-то» уже не проверить.
const DOS_TIME = 0
const DOS_DATE = 0x2821 // 2000-01-01

// Имена внутри архива всегда через прямой слэш, даже когда скрипт гоняют на
// Windows: обратный слэш в ZIP формально запрещён, и Java-распаковщик получит
// файл с именем «pages\001.webp» вместо папки.
function normalizeName(name) {
  return String(name).replace(/\\/g, '/').replace(/^\/+/, '')
}

/**
 * Собирает ZIP из списка записей.
 * @param {{name: string, data: Buffer|string}[]} entries
 * @returns {Buffer}
 */
function zipSync(entries) {
  const locals = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(normalizeName(entry.name), 'utf8')
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8')
    const crc = crc32(data)

    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0) // signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: имена в UTF-8
    local.writeUInt16LE(0, 8) // method: store
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18) // compressed
    local.writeUInt32LE(data.length, 22) // uncompressed
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28) // extra
    name.copy(local, 30)

    const dir = Buffer.alloc(46 + name.length)
    dir.writeUInt32LE(0x02014b50, 0)
    dir.writeUInt16LE(20, 4) // version made by
    dir.writeUInt16LE(20, 6) // version needed
    dir.writeUInt16LE(0x0800, 8)
    dir.writeUInt16LE(0, 10)
    dir.writeUInt16LE(DOS_TIME, 12)
    dir.writeUInt16LE(DOS_DATE, 14)
    dir.writeUInt32LE(crc, 16)
    dir.writeUInt32LE(data.length, 20)
    dir.writeUInt32LE(data.length, 24)
    dir.writeUInt16LE(name.length, 28)
    dir.writeUInt16LE(0, 30) // extra
    dir.writeUInt16LE(0, 32) // comment
    dir.writeUInt16LE(0, 34) // disk
    dir.writeUInt16LE(0, 36) // internal attrs
    dir.writeUInt32LE(0, 38) // external attrs
    dir.writeUInt32LE(offset, 42) // смещение локального заголовка
    name.copy(dir, 46)

    locals.push(local, data)
    central.push(dir)
    offset += local.length + data.length
  }

  const dirBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4) // disk
  end.writeUInt16LE(0, 6) // disk with central dir
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(dirBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20) // comment

  return Buffer.concat([...locals, dirBuf, end])
}

// Читаем свои же архивы только в тестах — распаковщик умеет ровно то, что
// умеет писатель (store), и на чужих архивах с deflate вернёт пустоту.
function unzipSync(buf) {
  const out = {}
  let i = 0
  while (i < buf.length - 3) {
    if (buf.readUInt32LE(i) !== 0x04034b50) break
    const method = buf.readUInt16LE(i + 8)
    const size = buf.readUInt32LE(i + 18)
    const nameLen = buf.readUInt16LE(i + 26)
    const extraLen = buf.readUInt16LE(i + 28)
    const name = buf.toString('utf8', i + 30, i + 30 + nameLen)
    const start = i + 30 + nameLen + extraLen
    const raw = buf.subarray(start, start + size)
    out[name] = method === 8 ? zlib.inflateRawSync(raw) : raw
    i = start + size
  }
  return out
}

module.exports = { zipSync, unzipSync, crc32 }
