// Вытаскивает из бандла школы (jts-placement.html) данные теста на определение
// уровня в файлы проекта — сам тест собран нативно (src/practice/placement/),
// html нужен только как источник:
//   public/practice/placement/bank.json  — банк заданий БЕЗ ответов: BANK с
//     применёнными патчами дистракторов + BANK2 (minimal pairs, клипы,
//     аудирование, интерактивные форматы)
//   src/practice/placement/keys.generated.json — ответы к ним: файл серверный,
//     в браузер не уезжает (см. src/practice/placement/bankSplit.js)
//   src/practice/placement/strings.js    — строки интерфейса (ru/kk/en)
//
// Аудио и видео (jts-bank/) в репозитории уже лежат и не трогаются.
//
// Запуск: node scripts/extract-placement.js [путь-к-jts-placement.html]
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || path.join(ROOT, '.placement-src/jts-placement.html')
const OUT_BANK = path.join(ROOT, 'public/practice/placement/bank.json')
const OUT_KEYS = path.join(ROOT, 'src/practice/placement/keys.generated.json')
const OUT_STRINGS = path.join(ROOT, 'src/practice/placement/strings.js')
const OUT_ENGINE = path.join(ROOT, 'src/practice/placement/engine.generated.js')

// Граница логики и UI в бандле: движок кончается своим node-экспортом, дальше
// начинается DOM-слой. Автор развёл их сам — этим и пользуемся, перенося
// расчётную часть один в один, без переписывания.
const LOGIC_END = 'if (typeof module !== \'undefined\' && module.exports) {'
// Строки-данные внутри логики: они уезжают в bank.json и приходят параметром.
// Сюда же — строка, применяющая патчи к вшитому банку: в bank.json они уже
// применены экстрактором, второй раз их накатывать не на что.
const DATA_DECLS = [
  'const BANK = ', 'const MANIFEST = ', 'const VOCAB = ', 'const BANK2 = ',
  'const APPLIED_PATCHES = ',
]

/** Вырезает сбалансированный литерал (объект или массив) после `имя = `. */
function literalAfter(src, declaration) {
  const at = src.indexOf(declaration)
  if (at < 0) throw new Error(`не найдено объявление: ${declaration}`)
  const start = src.indexOf(declaration.endsWith('[') ? '[' : '{', at + declaration.length - 1)
  const open = src[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  let inStr = null
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === inStr) inStr = null
    } else if (c === '"' || c === "'" || c === '`') inStr = c
    else if (c === open) depth++
    else if (c === close && --depth === 0) return src.slice(start, i + 1)
  }
  throw new Error(`литерал ${declaration} оборван`)
}

/** Патчи дистракторов из BANK_PATCHES применяются к банку при выгрузке —
 *  чтобы в рантайме лежал уже выверенный банк. Логика — копия
 *  applyBankPatches() из бандла: патч несёт kind (option/answer/stem) и
 *  findText/replace/add, а не готовые поля item. Первая версия копировала
 *  несуществующие p.options/p.key — «применила» 13 патчей, не изменив банк,
 *  и дополнительные допустимые ответы («less», «may»…) не попали в выгрузку. */
function applyPatches(bank, patches) {
  const byId = new Map(bank.items.map((it) => [it.id, it]))
  const applied = []
  for (const p of patches) {
    const item = byId.get(p.id)
    if (!item) continue
    if (p.kind === 'option' && item.options) {
      const i = item.options.findIndex((o) => o.t === p.findText)
      if (i >= 0 && i !== item.key) {
        item.options[i] = { t: p.replace.t, m: p.replace.m }
        applied.push(p.id)
      }
    } else if (p.kind === 'answer' && Array.isArray(item.answer)) {
      for (const a of p.add) if (!item.answer.includes(a)) item.answer.push(a)
      applied.push(p.id)
    } else if (p.kind === 'stem' && item.stem === p.findText) {
      item.stem = p.replace
      applied.push(p.id)
    }
  }
  return applied
}

async function run() {
  if (!fs.existsSync(SRC)) throw new Error(`не найден исходник: ${SRC}`)
  const html = fs.readFileSync(SRC, 'utf8')

  const bank = JSON.parse(literalAfter(html, 'const BANK = '))
  const bank2 = JSON.parse(literalAfter(html, 'const BANK2 = '))
  const manifest = JSON.parse(literalAfter(html, 'const MANIFEST = '))
  const vocab = JSON.parse(literalAfter(html, 'const VOCAB = '))
  // BANK_PATCHES — JS-массив с комментариями, JSON.parse его не возьмёт;
  // он состоит из простых литералов, поэтому вычисляем в изолированном Function.
  const patches = new Function(`return ${literalAfter(html, 'const BANK_PATCHES = [')}`)()
  const applied = applyPatches(bank, patches)

  // Движок пишем первым: разделение банка использует его seededShuffle, чтобы
  // перемешивания совпадали с теми, что делает клиент.
  writeEngine(html)

  // Ключи в браузер не уезжают: банк раскладывается на публичную часть и
  // ответы (bankSplit.js), иначе тест можно просто прочитать.
  const { splitBank } = await import(
    require('url').pathToFileURL(path.join(ROOT, 'src/practice/placement/bankSplit.js')).href
  )
  const full = { bank, bank2, manifest, vocab, appliedPatches: applied }
  const { public: publicBank, keys } = splitBank(full)

  fs.mkdirSync(path.dirname(OUT_BANK), { recursive: true })
  fs.writeFileSync(OUT_BANK, JSON.stringify(publicBank))
  fs.writeFileSync(OUT_KEYS, JSON.stringify(keys, null, 2))
  const kb = (fs.statSync(OUT_BANK).size / 1024) | 0
  const kkb = (fs.statSync(OUT_KEYS).size / 1024) | 0
  console.log(
    `bank.json — заданий ${bank.items.length}, патчей ${applied.length},` +
      ` слов LexTALE ${Object.keys(vocab).length} (${kb} KB, без ответов)`,
  )
  console.log(`keys.generated.json — ключей ${Object.keys(keys.items).length} (${kkb} KB, только сервер)`)

  // Строки интерфейса: объект I18N с тремя языками.
  const i18n = new Function(`return ${literalAfter(html, 'const STR = ')}`)()
  const families = new Function(`return ${literalAfter(html, 'const FAM_NAMES = ')}`)()
  const header = `// Строки теста на определение уровня — сняты 1-в-1 из бандла школы
// (scripts/extract-placement.js). Правки контента идут в бандл, потом прогон
// скрипта: руками здесь ничего не меняем.
`
  fs.writeFileSync(
    OUT_STRINGS,
    `${header}\nexport const UI = ${JSON.stringify(i18n, null, 2)}\n\nexport const FAMILY_NAMES = ${JSON.stringify(families, null, 2)}\n\nexport function T(lang, key) {\n  const d = UI[lang] || UI.ru\n  return key in d ? d[key] : UI.en[key] || key\n}\n`,
  )
  const skb = (fs.statSync(OUT_STRINGS).size / 1024) | 0
  console.log(`strings.js — языков ${Object.keys(i18n).length}, ключей ${Object.keys(i18n.ru).length} (${skb} KB)`)
}

// Расчётная часть бандла — как есть, без единой правки формул. Меняются только
// объявления данных: вместо вшитых литералов модуль принимает их параметром.
function writeEngine(html) {
  const script = html.slice(html.indexOf('"use strict";'), html.indexOf(LOGIC_END))
  const lines = script.split('\n').filter((l) => !DATA_DECLS.some((d) => l.startsWith(d)))
  const body = lines.join('\n').replace(/^"use strict";\s*/, '')

  const header = `/* eslint-disable */
// СГЕНЕРИРОВАНО scripts/extract-placement.js — руками не править.
//
// Расчётная часть теста на определение уровня, перенесённая из бандла школы
// один в один: IRT-оценка (3PL + EAP по сетке), отбор заданий по блокам,
// ветвление на A0, LexTALE со скорингом и инвалидацией, проверка открытых
// ответов, оценка письма и говорения. Формулы не тронуты — расхождение с
// источником ловит placementParity.test.js, который гоняет обе реализации
// на одних сидах.
//
// Данные (BANK / BANK2 / MANIFEST / VOCAB) сюда не вшиты: их отдаёт
// public/practice/placement/bank.json через createEngine().
`
  const footer = `
export {
  Session, simulateSession, CUTS, TARGET_TIME, GRID, VARIANTS, mergeBank2, applyBankPatches,
  scoreOrderWords, scoreBankfill, scoreMatch, scoreTfns, eapEstimate, levelFromTheta,
  vocabDraw, vocabScore, scoreWriting, scoreSpeaking, checkOpenAnswer, mulberry32,
  seededShuffle, lexThetaEquiv, THETA0_BY_CANDO, BLOCK_SEQ,
}
`
  fs.mkdirSync(path.dirname(OUT_ENGINE), { recursive: true })
  fs.writeFileSync(OUT_ENGINE, header + body + footer)
  const kb = (fs.statSync(OUT_ENGINE).size / 1024) | 0
  console.log(`engine.generated.js — строк ${lines.length} (${kb} KB)`)
}

if (require.main === module) {
  try {
    run().catch((e) => {
      console.error(String(e.message || e))
      process.exit(1)
    })
  } catch (e) {
    console.error(String(e.message || e))
    process.exit(1)
  }
}

module.exports = { literalAfter, applyPatches }
