// Снимает текст реплик со страниц комикса — для панели перевода в читалке.
//
// Текстового слоя в исходном PDF нет (страницы — сплошной растр), поэтому текст
// читает зрение Claude. Координаты баллонов у модели ненадёжны (проверено: до
// половины рамок ложится на пустой рисунок), поэтому кликабельных зон поверх
// картинки НЕ делаем — читалка показывает реплики списком в порядке чтения.
//
// Заодно просим готовый перевод реплики целиком: пословный разбор студент
// получит тапом по слову (gtx, как в «Книжках»), а связный перевод фразы
// сетевой переводчик на комиксовом сленге портит.
//
// Пишет build/comics/<id>/text-<id>.json:
//   { id, model, pages: { "<n>": [{ kind, en, ru, kk }] } }
// и перепаковывает build/comics/<id>.zip — тот самый архив, который
// контентщик заливает через админку.
//
// Прогон докатывается: уже разобранные страницы пропускаются, поэтому упавший
// на середине запуск можно просто повторить.
//
// Запуск:
//   node scripts/extract-comic-text.js --id yellow            # все страницы
//   node scripts/extract-comic-text.js --id yellow --limit 12 # первые 12
//   node scripts/extract-comic-text.js --id yellow --from 50 --to 80
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const { stagingDir, packComic } = require('./lib/comic-pack.js')

// Страница целиком в один запрос: реплики связаны между собой, и по кускам
// модель теряет, кто кому отвечает.
const MODEL = process.env.COMICS_MODEL || 'claude-opus-5'
// Сколько страниц разбираем параллельно. Выше — упираемся в rate limit.
const CONCURRENCY = 4
const RETRIES = 2

const SYSTEM = `Ты размечаешь страницы англоязычного графического романа для учебного приложения.

Верни СТРОГО JSON без пояснений и без markdown-ограды:
{"blocks":[{"kind":"balloon|caption|sfx|sign","en":"...","ru":"...","kk":"..."}]}

Правила:
- Порядок blocks — порядок чтения страницы: кадр за кадром, внутри кадра
  сверху вниз и слева направо. Порядок важнее всего: по нему студент следит
  за диалогом, не имея подсказки на самой картинке.
- en — текст как напечатан, но обычным регистром (в комиксе всё капсом; курсив
  внутри баллона — это ударение, ради него регистр не меняем). Перенос строки
  внутри баллона склеиваем пробелом.
- ru и kk — естественный перевод реплики целиком, не пословный. Сохраняй
  разговорность: это живая речь, а не инструкция.
- kind: balloon — речь, caption — авторская плашка/титр, sfx — звук («BOOM»),
  sign — надпись внутри кадра (вывеска, газета, экран).
- Страница без текста — {"blocks":[]}.
- Мат переводим матом: это художественный текст, смягчать нельзя.`

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}

// Ключ берём из .env.local — отдельного секрета у скрипта нет и быть не должно.
function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.replace(/^﻿/, '').trim()
  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) throw new Error('нет ANTHROPIC_API_KEY и нет .env.local')
  const m = /^ANTHROPIC_API_KEY\s*=\s*"?([^"\r\n]+)/m.exec(fs.readFileSync(envFile, 'utf8'))
  if (!m) throw new Error('в .env.local нет ANTHROPIC_API_KEY')
  return m[1].replace(/^﻿/, '').trim()
}

// Модель иногда всё-таки оборачивает ответ в ``` — снимаем ограду перед разбором.
function parseBlocks(text) {
  const json = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
  const data = JSON.parse(json)
  if (!Array.isArray(data?.blocks)) throw new Error('в ответе нет blocks')
  return data.blocks
    .filter((b) => b && typeof b.en === 'string' && b.en.trim())
    .map((b) => ({
      kind: ['balloon', 'caption', 'sfx', 'sign'].includes(b.kind) ? b.kind : 'balloon',
      en: String(b.en).trim(),
      ru: String(b.ru || '').trim(),
      kk: String(b.kk || '').trim(),
    }))
}

async function readPage(client, file) {
  const data = fs.readFileSync(file).toString('base64')
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/webp', data } },
          { type: 'text', text: 'Сними текст этой страницы.' },
        ],
      },
    ],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { blocks: parseBlocks(text), usage: res.usage }
}

async function main() {
  const id = arg('id', 'yellow')
  const stage = stagingDir(id)
  const pagesDir = path.join(stage, 'pages')
  if (!fs.existsSync(pagesDir)) throw new Error(`нет страниц ${pagesDir} — сначала прогони extract-comics.js`)

  const Anthropic = require('@anthropic-ai/sdk')
  const client = new (Anthropic.default || Anthropic)({ apiKey: apiKey() })

  const outFile = path.join(stage, `text-${id}.json`)
  const doc = fs.existsSync(outFile)
    ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
    : { id, model: MODEL, pages: {} }

  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.webp')).sort()
  const from = Number(arg('from', 1))
  const to = Number(arg('to', files.length))
  const limit = Number(arg('limit', 0))
  let todo = files
    .map((f, i) => ({ n: i + 1, file: path.join(pagesDir, f) }))
    .filter((p) => p.n >= from && p.n <= to && !doc.pages[p.n])
  if (limit > 0) todo = todo.slice(0, limit)

  console.log(`${id}: страниц ${files.length}, уже разобрано ${Object.keys(doc.pages).length}, к разбору ${todo.length}`)
  if (!todo.length) return

  let inTok = 0
  let outTok = 0
  let done = 0
  let failed = 0
  const queue = [...todo]
  // Сохраняем после каждой страницы: прогон длинный, и падение на 180-й
  // странице не должно стоить всех предыдущих.
  const save = () => fs.writeFileSync(outFile, JSON.stringify(doc, null, 1))

  const worker = async () => {
    for (;;) {
      const item = queue.shift()
      if (!item) return
      let ok = false
      for (let attempt = 0; attempt <= RETRIES && !ok; attempt++) {
        try {
          const r = await readPage(client, item.file)
          doc.pages[item.n] = r.blocks
          inTok += r.usage.input_tokens
          outTok += r.usage.output_tokens
          ok = true
          done++
          save()
          if (done % 10 === 0) console.log(`  … ${done}/${todo.length}`)
        } catch (e) {
          if (attempt === RETRIES) {
            failed++
            console.warn(`  ! стр. ${item.n}: ${e.message}`)
          } else {
            // Rate limit и обрыв соединения лечатся паузой, а не отказом.
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          }
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  save()

  const blocks = Object.values(doc.pages).reduce((s, b) => s + b.length, 0)
  console.log(`OK: страниц ${Object.keys(doc.pages).length}, реплик ${blocks}, не далось ${failed}`)
  console.log(`токены in=${inTok} out=${outTok}`)
  const zip = packComic(id)
  console.log(`Архив пересобран: ${zip.path} — ${(zip.bytes / 1048576).toFixed(1)} МБ`)
}

module.exports = { parseBlocks }

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
