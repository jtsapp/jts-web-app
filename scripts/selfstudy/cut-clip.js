// Вырезает кусок из MP3 без перекодирования — по границам кадров.
//
// Нужен правкам привязки записей курса (clip-fixes.js): часть клипов в файле
// курса обрезана раньше, чем прозвучал ответ на вопрос, а целые треки уроков
// остались в прошлой выгрузке (история git, public/course/<level>/audio/).
// ffmpeg в проекте нет, и тащить его ради пары кусков незачем: кадр MP3
// декодируется сам по себе, поэтому хватает разобрать заголовки и склеить
// нужные кадры.
//
// Резать надо в паузе между фразами: первый кадр вырезки может ссылаться на
// резерв битов предыдущего кадра, которого в файле уже нет, и декодер отыграет
// его тишиной.
//
// Запуск (секунды — по отметкам распознавания трека):
//   node scripts/selfstudy/cut-clip.js <трек.mp3> <от> <до> <выход.mp3> [--force]
const fs = require('node:fs')

const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] }

/** Заголовок кадра Layer III по смещению — или null, если там не кадр. */
function header(buf, at) {
  if (at + 4 > buf.length || buf[at] !== 0xff || (buf[at + 1] & 0xe0) !== 0xe0) return null
  const b1 = buf[at + 1]
  const b2 = buf[at + 2]
  const version = [2.5, null, 2, 1][(b1 >> 3) & 3]
  const layer3 = ((b1 >> 1) & 3) === 1
  const bitrate = BITRATES[version === 1 ? 1 : 2][b2 >> 4]
  const rate = version && RATES[version][(b2 >> 2) & 3]
  if (!version || !layer3 || !bitrate || !rate) return null
  const pad = (b2 >> 1) & 1
  return {
    size: Math.floor(((version === 1 ? 144000 : 72000) * bitrate) / rate) + pad,
    seconds: (version === 1 ? 1152 : 576) / rate,
  }
}

function skipId3(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return 0
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
  return 10 + size + (buf[5] & 0x10 ? 10 : 0)
}

// Служебный кадр LAME/Xing (Info у CBR) и VBRI у Fraunhofer. Метка лежит сразу
// за side info, длина которой зависит от версии и числа каналов.
function isInfoFrame(buf, at) {
  const tagAt = (off) => buf.toString('latin1', at + off, at + off + 4)
  return [13, 21, 36].some((off) => ['Xing', 'Info'].includes(tagAt(off))) || tagAt(36) === 'VBRI'
}

function isTailTag(buf, at) {
  const rest = buf.subarray(at)
  const head = rest.toString('latin1', 0, 11)
  return head.startsWith('TAG') || head.startsWith('APETAGEX') || head.startsWith('LYRICSBEGIN') || rest.every((b) => b === 0)
}

/**
 * Кадры файла со временем начала каждого (секунды от первого звучащего кадра —
 * так же отсчитывает время распознавание, по которому выбирают отрезок).
 */
function mp3Frames(buf) {
  let at = skipId3(buf)
  // Между тегом и первым кадром кодировщики иногда оставляют нули.
  const limit = Math.min(buf.length, at + 4096)
  while (at < limit && !header(buf, at)) at++
  if (!header(buf, at)) throw new Error('не MP3: не найден ни один кадр Layer III')

  const frames = []
  let time = 0
  let first = true
  let truncated = false
  while (at < buf.length) {
    const h = header(buf, at)
    if (!h) break
    // Последний кадр, обрезанный при записи, — обычное дело; играть его нечем.
    if (at + h.size > buf.length) {
      truncated = true
      break
    }
    if (!(first && isInfoFrame(buf, at))) {
      frames.push({ at, size: h.size, start: time })
      time += h.seconds
    }
    first = false
    at += h.size
  }
  // Посреди файла кадры идут вплотную. Если цепочка оборвалась не на теге в
  // хвосте, дальше разбирать нечего — лучше упасть, чем тихо отдать половину.
  if (!truncated && at < buf.length && !isTailTag(buf, at)) {
    throw new Error(`не кадр на смещении ${at}: осталось ${buf.length - at} байт`)
  }
  return { frames, duration: time }
}

/** Кадры, начавшиеся в [from, to), одним буфером. */
function cutMp3(buf, from, to) {
  if (!(to > from)) throw new Error(`пустой отрезок ${from}–${to}`)
  const { frames } = mp3Frames(buf)
  const picked = frames.filter((f) => f.start >= from && f.start < to)
  if (!picked.length) throw new Error(`отрезок ${from}–${to} с пуст: в файле ${frames.length} кадров`)
  return Buffer.concat(picked.map((f) => buf.subarray(f.at, f.at + f.size)))
}

// Формат потока: версия, слой, частота и режим каналов. Битрейт не в счёт —
// у VBR он меняется от кадра к кадру и в одном файле.
const formatOf = (buf, at) => [buf[at + 1] & 0xfe, (buf[at + 2] >> 2) & 3, buf[at + 3] >> 6].join('/')

/**
 * Склейка кусков в один клип через паузу из тихих кадров.
 *
 * Тихий кадр — заголовок первого кадра (без CRC и паддинга) и нули: side info
 * из нулей значит «ни одного бита звука», и декодер отыгрывает тишину. Куски
 * обязаны быть одного формата: кадры разной частоты в одном потоке браузер
 * вправе не сыграть.
 */
function joinMp3(buffers, gapSeconds = 0.3) {
  const parts = buffers.map((buf) => ({ buf, ...mp3Frames(buf) }))
  const first = parts[0].frames[0]
  const format = formatOf(parts[0].buf, first.at)
  for (const p of parts) {
    const f = formatOf(p.buf, p.frames[0].at)
    if (f !== format) throw new Error(`формат кусков разный: ${format} и ${f}`)
  }
  const hdr = Buffer.from(parts[0].buf.subarray(first.at, first.at + 4))
  hdr[1] |= 1
  hdr[2] &= ~2
  const { size, seconds } = header(hdr, 0)
  const silent = Buffer.alloc(size)
  hdr.copy(silent, 0)
  const gap = Array(Math.ceil(gapSeconds / seconds - 1e-9)).fill(silent)
  const out = []
  parts.forEach((p, i) => {
    if (i) out.push(...gap)
    out.push(...p.frames.map((f) => p.buf.subarray(f.at, f.at + f.size)))
  })
  return Buffer.concat(out)
}

if (require.main === module && process.argv[2] === '--join') {
  // node scripts/selfstudy/cut-clip.js --join <кусок.mp3>[@от-до] … <выход.mp3> [--gap <с>] [--force]
  const rest = process.argv.slice(3).filter((a) => a !== '--force')
  const gapAt = rest.indexOf('--gap')
  const gapSeconds = gapAt >= 0 ? Number(rest.splice(gapAt, 2)[1]) : 0.3
  const out = rest.pop()
  if (fs.existsSync(out) && !process.argv.includes('--force')) {
    console.error(`${out} уже есть — перезапись только с --force`)
    process.exit(1)
  }
  const pieces = rest.map((spec) => {
    const m = /^(.*)@([\d.]+)-([\d.]+)$/.exec(spec)
    const buf = fs.readFileSync(m ? m[1] : spec)
    return m ? cutMp3(buf, Number(m[2]), Number(m[3])) : buf
  })
  const clip = joinMp3(pieces, gapSeconds)
  fs.writeFileSync(out, clip)
  console.log(`${out}: ${mp3Frames(clip).duration.toFixed(2)} с, ${clip.length} байт`)
} else if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => a !== '--force')
  const [src, from, to, out] = args
  if (!out) {
    console.error('node scripts/selfstudy/cut-clip.js <трек.mp3> <от> <до> <выход.mp3> [--force]')
    process.exit(1)
  }
  // Выход — исходник правки, лежит в репозитории: затереть его опечаткой в
  // аргументах и не заметить слишком легко.
  if (fs.existsSync(out) && !process.argv.includes('--force')) {
    console.error(`${out} уже есть — перезапись только с --force`)
    process.exit(1)
  }
  const clip = cutMp3(fs.readFileSync(src), Number(from), Number(to))
  fs.writeFileSync(out, clip)
  console.log(`${out}: ${mp3Frames(clip).duration.toFixed(2)} с, ${clip.length} байт`)
}

module.exports = { mp3Frames, cutMp3, joinMp3 }
