#!/usr/bin/env node
// Модели Vosk для позывного помощника: скачать, сверить, перепаковать.
// Русская — для Луны («Луна», «Привет, Луна»), казахская — для Айзере, помощника
// при казахском интерфейсе («Айзере», «Сәлем, Айзере»; src/lib/assistant/wake/matchWake.js).
//
// Модели весят 45 и 60 МБ, поэтому в git их нет (репозиторий и так почти весь из
// бинарей) — их кладёт сюда сборка (Dockerfile) и этот же скрипт локально.
// alphacephei.com отдаёт zip, а vosk-browser читает только .tar.gz с папкой
// модели внутри (первый уровень пути он срезает сам) — отсюда перепаковка.
//
// sha256 закреплён: модель исполняет распознаватель на устройстве каждого
// ученика, и подменённый архив должен ронять сборку, а не уезжать в прод. Словарь
// именно этих моделей проверен по их Gr.fst: в русской (16.10.2026) есть «привет»,
// «салем», «луна», в казахской (19.10.2026) — «айзере», «сәлем», «привет». Без
// них грамматика позывного тихо потеряла бы слова.
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

// key — как в WAKE_MODELS (src/lib/assistant/wake/model.js); адрес на сайте и out
// сверяет тест.
const MODELS = [
  {
    key: 'ru',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip',
    sha256: '961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4',
    out: 'public/assistant/wake/vosk-model-small-ru-0.22.tar.gz',
  },
  {
    key: 'kk',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-kz-0.42.zip',
    sha256: 'b6d6bfe6195c866805bd18b1f56723e4d2ba4866e81df1481006d0c5704fda4f',
    out: 'public/assistant/wake/vosk-model-small-kz-0.42.tar.gz',
  },
]
// Прежнее имя — русская модель.
const MODEL = MODELS[0]

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

async function fetchModel(model, soft) {
  const out = path.join(__dirname, '..', model.out)
  if (fs.existsSync(out)) {
    console.log(`[wake-model] уже есть: ${model.out}`)
    return
  }
  let zip
  try {
    const res = await fetch(model.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    zip = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    const msg = `[wake-model] не скачалась ${model.url}: ${err.message}`
    if (soft) {
      console.warn(`${msg} — сборка идёт дальше, позывной (${model.key}) работать не будет`)
      return
    }
    throw new Error(msg)
  }
  // Несовпадение суммы роняет и --soft: это уже не «сеть легла», а чужой файл.
  const got = sha256(zip)
  if (got !== model.sha256) throw new Error(`[wake-model] sha256 не совпал: ${got} ≠ ${model.sha256}`)
  const tgz = zipToTarGz(zip)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  // Через временный файл: оборванная запись не должна выглядеть готовой моделью.
  fs.writeFileSync(`${out}.part`, tgz)
  fs.renameSync(`${out}.part`, out)
  console.log(`[wake-model] ${model.out}: ${(tgz.length / 1e6).toFixed(1)} МБ`)
}

async function main() {
  const soft = process.argv.includes('--soft')
  for (const model of MODELS) await fetchModel(model, soft)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

module.exports = { MODEL, MODELS, sha256, zipToTarGz }
