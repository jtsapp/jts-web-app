#!/usr/bin/env node
// Модель Vosk для позывного Луны («Привет, Луна»): скачать, сверить, перепаковать.
//
// Модель весит 45 МБ, поэтому в git её нет (репозиторий и так почти весь из
// бинарей) — её кладёт сюда сборка (Dockerfile) и этот же скрипт локально.
// alphacephei.com отдаёт zip, а vosk-browser читает только .tar.gz с папкой
// модели внутри (первый уровень пути он срезает сам) — отсюда перепаковка.
//
// sha256 закреплён: модель исполняет распознаватель на устройстве каждого
// ученика, и подменённый архив должен ронять сборку, а не уезжать в прод. Словарь
// именно этой модели проверен по её Gr.fst (16.10.2026): «привет», «салем», «луна»
// в нём есть — без них грамматика позывного тихо потеряла бы слова.
//
// Готовый файл не перекачивается.
//
//   node scripts/fetch-wake-model.js          # сеть легла — ошибка
//   node scripts/fetch-wake-model.js --soft   # сеть легла — предупреждение и выход 0:
//                                             # Dockerfile — недоступный сайт моделей не
//                                             # должен валить деплой всего приложения;
//                                             # позывной тогда напишет «не загрузилось».
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { unzipSync } = require('./lib/zip.js')
const { tarGzSync } = require('./lib/tar.js')

const MODEL = {
  url: 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip',
  sha256: '961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4',
  // Совпадает с WAKE_MODEL_URL в src/lib/assistant/wake/model.js (сверяет тест).
  out: 'public/assistant/wake/vosk-model-small-ru-0.22.tar.gz',
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/** zip модели → tar.gz с той же раскладкой (каталоги — отдельными записями). */
function zipToTarGz(zipBuf) {
  const files = unzipSync(zipBuf)
  const names = Object.keys(files).sort()
  if (!names.length) throw new Error('zip пустой — или это не тот формат, что читает unzipSync')
  return tarGzSync(names.map((name) => (name.endsWith('/') ? { name } : { name, data: files[name] })))
}

async function main() {
  const soft = process.argv.includes('--soft')
  const out = path.join(__dirname, '..', MODEL.out)
  if (fs.existsSync(out)) {
    console.log(`[wake-model] уже есть: ${MODEL.out}`)
    return
  }
  let zip
  try {
    const res = await fetch(MODEL.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    zip = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    const msg = `[wake-model] не скачалась ${MODEL.url}: ${err.message}`
    if (soft) {
      console.warn(`${msg} — сборка идёт дальше, позывной Луны работать не будет`)
      return
    }
    throw new Error(msg)
  }
  // Несовпадение суммы роняет и --soft: это уже не «сеть легла», а чужой файл.
  const got = sha256(zip)
  if (got !== MODEL.sha256) throw new Error(`[wake-model] sha256 не совпал: ${got} ≠ ${MODEL.sha256}`)
  const tgz = zipToTarGz(zip)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  // Через временный файл: оборванная запись не должна выглядеть готовой моделью.
  fs.writeFileSync(`${out}.part`, tgz)
  fs.renameSync(`${out}.part`, out)
  console.log(`[wake-model] ${MODEL.out}: ${(tgz.length / 1e6).toFixed(1)} МБ`)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

module.exports = { MODEL, sha256, zipToTarGz }
