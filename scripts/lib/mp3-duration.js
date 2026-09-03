// Длительность mp3 без внешних зависимостей.
//
// Нужна разметке караоке: `duration` в ней — это длина ФОНОГРАММЫ, а не конец
// последней строки. По ней строятся маски метрик (см. scoring.js), и если взять
// конец последней строки, у песни с длинным проигрышем в конце покрытие и ритм
// посчитаются по укороченной шкале — балл будет завышен.
//
// Своя реализация, а не пакет: в проекте так же сделаны парсер PDF и писатель
// ZIP (scripts/extract-comics.js, scripts/lib/zip.js) — тянуть зависимость ради
// одного заголовка не хочется.

// Битрейты MPEG-1 Layer III, кбит/с. Нулевой индекс — «free format», его не
// поддерживаем: таких файлов в природе почти нет.
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
}

/** Размер тега ID3v2 в начале файла (0, если тега нет). */
function id3Size(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return 0
  // Синхробезопасные целые: в каждом байте значащие только 7 бит.
  const size =
    ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
  return 10 + size
}

function findFrame(buf, from) {
  for (let i = from; i < buf.length - 4; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) return i
  }
  return -1
}

/**
 * @param {Buffer} buf содержимое mp3
 * @returns {{ seconds: number, bitrate: number, sampleRate: number, vbr: boolean } | null}
 */
export function mp3Info(buf) {
  const start = id3Size(buf)
  const frame = findFrame(buf, start)
  if (frame < 0) return null

  const h1 = buf[frame + 1]
  const h2 = buf[frame + 2]
  const version = (h1 >> 3) & 3 // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
  const layer = (h1 >> 1) & 3 // 1 = Layer III
  if (layer !== 1) return null

  const rates = SAMPLE_RATES[version]
  if (!rates) return null
  const sampleRate = rates[(h2 >> 2) & 3]
  const table = version === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3
  const bitrate = table[(h2 >> 4) & 0xf]
  if (!sampleRate || !bitrate) return null

  // Отсчётов на кадр: у MPEG-1 Layer III их 1152, у MPEG-2/2.5 вдвое меньше.
  const samplesPerFrame = version === 3 ? 1152 : 576

  // Xing/Info в первом кадре — единственный честный источник длительности для
  // VBR: считать по битрейту первого кадра там нельзя, он не постоянный.
  const head = buf.subarray(frame, Math.min(frame + 200, buf.length))
  for (const tag of ['Xing', 'Info']) {
    const at = head.indexOf(tag, 0, 'latin1')
    if (at < 0) continue
    const flags = head.readUInt32BE(at + 4)
    if (!(flags & 1)) break // числа кадров нет — считаем как CBR
    const frames = head.readUInt32BE(at + 8)
    return {
      seconds: (frames * samplesPerFrame) / sampleRate,
      bitrate,
      sampleRate,
      vbr: tag === 'Xing',
    }
  }

  return {
    seconds: ((buf.length - start) * 8) / (bitrate * 1000),
    bitrate,
    sampleRate,
    vbr: false,
  }
}
