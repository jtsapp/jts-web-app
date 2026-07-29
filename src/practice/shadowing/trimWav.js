'use client'

// Обрезка ведущей/хвостовой тишины в 16кГц mono 16-bit WAV перед отправкой на
// Azure. Azure берёт за СЕКУНДЫ аудио, поэтому вырезанная тишина = прямая
// экономия (обычно −20–40%), без потери качества оценки. Best-effort: при любой
// нештатной ситуации возвращаем исходный blob.

const THRESHOLD = 350 // |sample| ниже ~1% от 32768 считаем тишиной
const MARGIN_SEC = 0.12 // оставляем 120мс запаса по краям (мягкие согласные)
const MIN_KEEP_SEC = 0.3 // если после обрезки осталось < 0.3с — не трогаем

// Находим data-чанк (не полагаемся на фикс. 44-байтный заголовок).
function findData(view, len) {
  let off = 12
  while (off + 8 <= len) {
    const id = String.fromCharCode(
      view.getUint8(off), view.getUint8(off + 1), view.getUint8(off + 2), view.getUint8(off + 3),
    )
    const size = view.getUint32(off + 4, true)
    if (id === 'data') return { start: off + 8, size }
    off += 8 + size + (size & 1)
  }
  return null
}

function encodeWav(samples, sampleRate) {
  const dataLen = samples.length * 2
  const buf = new ArrayBuffer(44 + dataLen)
  const v = new DataView(buf)
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, dataLen, true)
  let o = 44
  for (let i = 0; i < samples.length; i++) { v.setInt16(o, samples[i], true); o += 2 }
  return new Blob([buf], { type: 'audio/wav' })
}

export async function trimSilenceWav(blob) {
  try {
    const ab = await blob.arrayBuffer()
    const view = new DataView(ab)
    if (ab.byteLength < 44 || view.getUint32(0, false) !== 0x52494646 /* 'RIFF' */) return blob
    const sampleRate = view.getUint32(24, true) || 16000
    const data = findData(view, ab.byteLength)
    if (!data) return blob

    const samples = new Int16Array(ab, data.start, data.size >> 1)
    const n = samples.length
    let start = 0
    let end = n - 1
    while (start < n && Math.abs(samples[start]) < THRESHOLD) start++
    while (end > start && Math.abs(samples[end]) < THRESHOLD) end--
    if (start >= end) return blob // всё тихо — отправим как есть

    const margin = Math.floor(sampleRate * MARGIN_SEC)
    start = Math.max(0, start - margin)
    end = Math.min(n - 1, end + margin)
    const kept = end - start + 1
    if (kept < sampleRate * MIN_KEEP_SEC || kept >= n) return blob // нечего экономить

    return encodeWav(samples.slice(start, end + 1), sampleRate)
  } catch {
    return blob
  }
}
