// Прогон оценки IELTS Speaking на стенде готовыми записями — тем же запросом, что шлёт экран прохождения.
// Нужен, когда «Оценка не удалась» и непонятно почему: печатает статус, код ошибки и время роута.
//
//   JTS_TOKEN=<access token ученика> node scripts/ielts/probe-speaking-assess.mjs <папка с .wav> [testId] [стенд]
//
// Записи — WAV 16 кГц mono, по одной на вопрос в алфавитном порядке имён; длительность берётся из файла.
// Токен — jts_access_token из localStorage стенда. Каждая удачная оценка тратит квоту IELTS этого аккаунта.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [dir, testId = 'S-P1-T01', web = 'https://dev-tutor.justtostudy.kz'] = process.argv.slice(2)
// из консоли DevTools строка копируется в кавычках — их срезаем
const token = (process.env.JTS_TOKEN || '').trim().replace(/^['"]|['"]$/g, '')
if (!dir || !token) {
  console.error('usage: JTS_TOKEN=… node scripts/ielts/probe-speaking-assess.mjs <dir> [testId] [web]')
  process.exit(1)
}
const api = (process.env.JTS_API || 'https://dev-server.justtostudy.kz').replace(/\/$/, '')

// длительность — по чанку data, а не по размеру файла: заголовок WAV бывает длиннее 44 байт
function wavSeconds(buf) {
  const rate = buf.readUInt32LE(24)
  const block = buf.readUInt16LE(32)
  for (let o = 12; o < buf.length - 8; ) {
    const size = buf.readUInt32LE(o + 4)
    if (buf.toString('ascii', o, o + 4) === 'data') return size / (rate * block)
    o += 8 + size + (size % 2)
  }
  return 0
}

const testRes = await fetch(`${api}/mobile/ielts/tests/${encodeURIComponent(testId)}`, { headers: { Authorization: `Bearer ${token}` } })
const testBody = await testRes.text()
let doc = null
try {
  doc = JSON.parse(testBody)?.document
} catch {
  /* ниже печатаем тело как есть */
}
if (!doc) {
  // тело ответа — чтобы отличить «нет задания» от чужого/битого токена; process.exit с живым fetch на Windows роняет
  // node ассертом libuv, поэтому выходим через exitCode
  console.error('test load failed: HTTP', testRes.status, api, testBody.slice(0, 300))
  process.exitCode = 1
} else {
  const ids = doc.kind === 'part2' ? [doc.id] : (doc.questions || []).map((q) => q.id)
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.wav')).sort().slice(0, ids.length)

  const form = new FormData()
  form.append('testId', testId)
  form.append('mode', 'exam')
  form.append('uiLang', 'ru')
  const items = files.map((f, i) => ({ itemId: ids[i], durationSec: Math.round(wavSeconds(readFileSync(join(dir, f))) * 10) / 10 }))
  form.append('items', JSON.stringify(items))
  files.forEach((f, i) => form.append(`audio_${i}`, new Blob([readFileSync(join(dir, f))], { type: 'audio/wav' }), `${ids[i]}.wav`))
  console.log(`${testId} (${doc.kind}): ${files.length} answers`, items.map((x) => `${x.durationSec}s`).join(' '))

  const t0 = Date.now()
  const res = await fetch(`${web.replace(/\/$/, '')}/api/ielts/speaking/assess`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  const text = await res.text()
  console.log('HTTP', res.status, `${((Date.now() - t0) / 1000).toFixed(1)} s`, res.headers.get('content-type') || '')
  console.log(text.slice(0, 800))
}
