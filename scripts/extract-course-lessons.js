// Разбирает курс-файл «одна страница = весь уровень» (a2.html / b1.html) на
// части, которые сайт умеет отдавать по требованию: разметку урока, движок,
// стили, картинки и аудио.
//
// Зачем не как extract-kingdom-lessons.js: там уроки Speakout переводились в
// плоский список заданий (choice/gap/chips/…) для нативного плеера. У этого
// курса типов заданий втрое больше — сортировка по колонкам, слоты, порядок
// слов, поиск ошибки, диалоги, юнит-тесты с рубриками. Перекладывать их в семь
// типов = выбросить курс. Поэтому переносим урок целиком: его разметку и его
// же движок, а сайт становится оболочкой.
//
// Режимы: файл держит self / 1-to-1 / group в одной разметке и переключает их
// через body[data-mode] + [data-only]. Мы фиксируем self и НЕ вырезаем чужие
// блоки — они остаются скрытыми правилом [data-only]{display:none}. Резать
// разметку регулярками рискованнее, чем не трогать её вовсе.
//
// Пишет:
//   public/course/<level>/index.json        — юниты, уроки, тесты (лёгкий каталог)
//   public/course/<level>/lesson-<n>.json   — один урок (html + данные стадий)
//   public/course/<level>/test-<u>.json     — юнит-тест
//   public/course/<level>/img-index.json    — слово → картинка на весь уровень
//   public/course/<level>/shell.html        — разметка оболочки курса
//   public/course/<level>/course.css        — стили курса, каждый селектор под .jc
//   public/course/<level>/engine.js         — движок курса без данных и без boot
//   public/course/<level>/img/*.webp, audio/*.mp3
//
// Запуск:
//   node scripts/extract-course-lessons.js --src ~/Downloads/b1.html --level b1
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

// --- аргументы ---------------------------------------------------------------
function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const SRC = arg('src')
const LEVEL = String(arg('level') || '').toLowerCase()
if (!SRC || !LEVEL) {
  console.error('нужны --src <file.html> и --level <a2|b1>')
  process.exit(1)
}
const OUT = path.join(ROOT, 'public/course', LEVEL)

// --- разбор файла ------------------------------------------------------------
// Курс-файл на 100–150 МБ: почти весь вес — base64 аудио и картинок в двух
// объявлениях. Читаем построчно и режем по маркерам, а не парсим как HTML.
function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n')
}

// Номер строки, с которой начинается объявление `const NAME=`.
function findDecl(lines, name) {
  const i = lines.findIndex((l) => l.startsWith(`const ${name}=`))
  if (i < 0) throw new Error(`${name}: объявление не найдено`)
  return i
}
// Верхнеуровневый литерал закрывается строкой ровно `};` или `];` в нулевой
// колонке (UNITS — массив, остальные — объекты).
function findClose(lines, from) {
  for (let i = from + 1; i < lines.length; i++) if (/^[}\]];?\s*$/.test(lines[i])) return i
  throw new Error(`не найден конец литерала, начатого на строке ${from + 1}`)
}
function findLine(lines, pred, from = 0) {
  for (let i = from; i < lines.length; i++) if (pred(lines[i])) return i
  return -1
}

// Литерал объекта/массива → значение. Данные курса — чистые литералы без
// вычислений, поэтому одного Function достаточно.
function evalLiteral(src) {
  const body = src.slice(src.indexOf('=') + 1).trim().replace(/;\s*$/, '')
  return new Function('return (' + body + ')')()
}

// --- CSS: каждый селектор внутрь контейнера ----------------------------------
// Стили курса писались для отдельной страницы (body, :root, .app-сетка) и
// пересекаются с глобальными по именам (.btn, .bubble, .card, .app). Префикс
// одновременно ограничивает их областью урока и поднимает специфичность выше
// одноклассовых правил сайта, так что внутри урока побеждает курс.
const SCOPE = '.jc'

function scopeSelector(sel) {
  const s = sel.trim()
  if (!s || s.startsWith('@') || s.startsWith('%') || /^\d/.test(s)) return s // ключевые кадры
  // Сам контейнер играет роль body/html/:root — на нём и data-mode, и переменные.
  if (/^(html|body|:root)$/.test(s)) return SCOPE
  const m = /^(html|body)\b(.*)$/.exec(s)
  if (m) return SCOPE + m[2]
  if (s === '*') return SCOPE + ' *'
  return SCOPE + ' ' + s
}

function scopeCss(css) {
  let out = ''
  let i = 0
  let buf = ''
  const stack = [] // 'at' — блок @media/@supports (селекторы внутри тоже префиксуем),
  //                  'kf' — @keyframes (внутри проценты, не трогаем),
  //                  'decl' — обычное правило
  while (i < css.length) {
    const ch = css[i]
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      const stop = end < 0 ? css.length : end + 2
      buf += css.slice(i, stop)
      i = stop
      continue
    }
    if (ch === '{') {
      const head = buf.trim()
      buf = ''
      if (head.startsWith('@')) {
        const kind = /^@(keyframes|-webkit-keyframes|font-face|counter-style|property)/.test(head) ? 'kf' : 'at'
        stack.push(kind)
        out += head + '{'
      } else if (stack[stack.length - 1] === 'kf' || stack[stack.length - 1] === 'decl') {
        // Вложенный блок внутри keyframes (проценты) или внутри правила — как есть.
        stack.push('kf')
        out += head + '{'
      } else {
        stack.push('decl')
        // Комментарий перед селектором нельзя тащить внутрь: `.jc /*…*/ :root`
        // читается как `.jc :root` и не совпадает ни с чем — так первым же
        // правилом терялись все переменные темы.
        const lead = /^(?:\s*\/\*[\s\S]*?\*\/)*\s*/.exec(head)[0]
        out += lead + head.slice(lead.length).split(',').map(scopeSelector).join(',') + '{'
      }
      i++
      continue
    }
    if (ch === '}') {
      out += buf + '}'
      buf = ''
      stack.pop()
      i++
      continue
    }
    buf += ch
    i++
  }
  return out + buf
}

// --- медиа -------------------------------------------------------------------
function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

function writeDataUri(uri, dir, name) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(uri)
  if (!m) return null
  const ext = (m[1].split('/')[1] || 'bin').replace('jpeg', 'jpg')
  const file = `${name}.${ext}`
  fs.writeFileSync(path.join(dir, file), Buffer.from(m[2], 'base64'))
  return file
}

// --- движок ------------------------------------------------------------------
// Движок берётся целиком, кроме того, что теперь приходит снаружи: данные
// уровня, аудио-блобы и boot-хвост, который в файле сам открывал первый урок.
function patchEngine(src) {
  let out = src

  // Аудио больше не base64 в памяти — файлы рядом с уроком.
  out = out.replace(
    /function trackSrc\(file\)\{[^\n]*\}/,
    "function trackSrc(file){ return (window.__JC_AUDIO_BASE||'audio/')+file; }",
  )

  // Картинка слова нужна словарю на весь уровень, а в памяти теперь один урок,
  // поэтому индекс приходит готовым (слово → URL).
  out = out.replace(
    /const IMGX=\{\};\s*Object\.keys\(LESSONS\)\.forEach\([\s\S]*?\}\);\s*\}\);/,
    'const IMGX=window.__JC_IMGX||{};',
  )
  if (!/window\.__JC_IMGX/.test(out)) throw new Error('движок: не удалось заменить построение IMGX')
  if (!/__JC_AUDIO_BASE/.test(out)) throw new Error('движок: не удалось заменить trackSrc')

  // Режим и переключатели вида (перевод, подсветка модели) висели на <body>;
  // теперь курс живёт в контейнере .jc внутри страницы сайта, и селекторы
  // стилей после скоупинга смотрят на него же (body.tr-on → .jc.tr-on).
  const before = out
  out = out
    .replace(/document\.body\.dataset\.mode=/g, 'JCROOT().dataset.mode=')
    .replace(/document\.body\.classList/g, 'JCROOT().classList')
  if (out === before) throw new Error('движок: не найдены переключатели вида на body')
  out = "function JCROOT(){ return document.querySelector('.jc')||document.body; }\n" + out

  // Движок жил в глобальной области отдельной страницы. В SPA так нельзя: при
  // переходе A2 → B1 второй файл упал бы на `const UNITS has already been
  // declared`. Заворачиваем всё в IIFE, а функции, которые зовут инлайновые
  // onclick в разметке курса, раздаём в window списком — он собирается из
  // самого кода, чтобы ни одну не забыть. Повторный запуск файла безопасен:
  // просто переприсваивает window.*.
  const exported = [...out.matchAll(/^function ([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1])
  const uniq = [...new Set(exported)]

  const head = [
    '/* Собрано scripts/extract-course-lessons.js из курс-файла уровня. */',
    '(function(){',
    '/* Данные уровня приходят от приложения (см. src/learning/CourseLesson.jsx). */',
    'const UNITS=window.__JC_UNITS||[];',
    'const LESSONS=window.__JC_LESSONS||{};',
    'const REVIEWS=window.__JC_REVIEWS||{};',
    'const AUDIO_B64={};',
    '',
  ].join('\n')

  // Boot курса открывал первый урок сам; здесь урок выбирает приложение.
  const tail = [
    '',
    '/* Инлайновые обработчики разметки курса ищут эти функции в window. */',
    `Object.assign(window,{${uniq.join(',')}});`,
    'window.__JC={',
    '  openLesson, openReview, setMode, go,',
    '  flush(){ try{ flushWriting() }catch(e){} },',
    '  /* Счёт урока для наград приложения: только проверяемые задания. */',
    '  score(){ let ok=0,total=0; document.querySelectorAll(".task").forEach(t=>{',
    '    if(!visible(t))return; const s=taskScores.get(t); if(s){ok+=s[0];total+=s[1];} });',
    '    return {ok,total}; },',
    '  stageCount:()=>stages.length,',
    '  stageIndex:()=>cur,',
    '};',
    "window.dispatchEvent(new CustomEvent('jc:ready'));",
    '})();',
  ].join('\n')

  return head + out + tail
}

// --- прогон ------------------------------------------------------------------
function run() {
  const lines = readLines(SRC)

  const iUnits = findDecl(lines, 'UNITS')
  const iAudio = findDecl(lines, 'AUDIO_B64')
  const iLessons = findDecl(lines, 'LESSONS')
  const iReviews = findDecl(lines, 'REVIEWS')
  const endUnits = findClose(lines, iUnits)
  const endAudio = findClose(lines, iAudio)
  const endLessons = findClose(lines, iLessons)
  const endReviews = findClose(lines, iReviews)

  const iBoot = findLine(lines, (l) => /BOOT ====/.test(l))
  const iScriptEnd = findLine(lines, (l) => l.startsWith('</script'), endReviews)
  const iScriptStart = findLine(lines, (l) => l.startsWith('<script'))
  const iBodyStart = findLine(lines, (l) => l.startsWith('<body'))
  if (iBoot < 0 || iScriptEnd < 0 || iScriptStart < 0 || iBodyStart < 0) throw new Error('не найдены границы script/body/BOOT')

  const UNITS = evalLiteral(lines.slice(iUnits, endUnits + 1).join('\n'))
  const AUDIO = evalLiteral(lines.slice(iAudio, endAudio + 1).join('\n'))
  const LESSONS = evalLiteral(lines.slice(iLessons, endLessons + 1).join('\n'))
  const REVIEWS = evalLiteral(lines.slice(iReviews, endReviews + 1).join('\n'))

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true })
  fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true })

  // --- аудио ---
  let audioBytes = 0
  const audioFiles = {}
  for (const [file, b64] of Object.entries(AUDIO)) {
    const buf = Buffer.from(b64, 'base64')
    fs.writeFileSync(path.join(OUT, 'audio', file), buf)
    audioBytes += buf.length
    audioFiles[file] = true
  }

  // --- уроки ---
  const imgIndex = {}
  let imgBytes = 0
  const catalog = []

  for (const key of Object.keys(LESSONS).sort((a, b) => a - b)) {
    const L = LESSONS[key]
    const IMG = {}
    for (const [word, uri] of Object.entries(L.IMG || {})) {
      const name = `l${key}-${slug(word)}`
      const file = writeDataUri(uri, path.join(OUT, 'img'), name)
      if (!file) continue
      imgBytes += fs.statSync(path.join(OUT, 'img', file)).size
      IMG[word] = `/course/${LEVEL}/img/${file}`
      if (!imgIndex[word]) imgIndex[word] = IMG[word]
    }
    const lesson = { ...L, IMG }
    fs.writeFileSync(path.join(OUT, `lesson-${key}.json`), JSON.stringify(lesson))
    catalog.push({ n: +key, unit: L.unit, no: L.no, title: L.title, blurb: L.blurb || '' })
    // Урок ссылается на треки по имени файла — проверяем, что они есть.
    for (const f of Object.values(L.tracks || {})) {
      if (!audioFiles[f]) console.warn(`  ! урок ${key}: нет аудио ${f}`)
    }
  }

  // --- юнит-тесты ---
  const tests = []
  for (const u of Object.keys(REVIEWS).sort((a, b) => a - b)) {
    const R = REVIEWS[u]
    fs.writeFileSync(path.join(OUT, `test-${u}.json`), JSON.stringify(R))
    tests.push({ unit: +u, title: R.title, items: R.items || 0, pass: R.pass || 0 })
    for (const f of Object.values(R.tracks || {})) {
      if (!audioFiles[f]) console.warn(`  ! тест ${u}: нет аудио ${f}`)
    }
  }

  fs.writeFileSync(path.join(OUT, 'img-index.json'), JSON.stringify(imgIndex))
  fs.writeFileSync(
    path.join(OUT, 'index.json'),
    JSON.stringify({ level: LEVEL, units: UNITS, lessons: catalog, tests }),
  )

  // --- оболочка, стили, движок ---
  const shell = lines.slice(iBodyStart + 1, iScriptStart).join('\n')
  fs.writeFileSync(path.join(OUT, 'shell.html'), shell)

  const head = lines.slice(0, iBodyStart).join('\n')
  const css = [...head.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
  if (!css.trim()) throw new Error('не найден <style> курса')
  fs.writeFileSync(path.join(OUT, 'course.css'), scopeCss(css))

  const prelude = lines.slice(iScriptStart + 1, iUnits).join('\n')
  const engine = lines.slice(endReviews + 1, iBoot - 1).join('\n')
  fs.writeFileSync(path.join(OUT, 'engine.js'), patchEngine(prelude + '\n' + engine))

  const mb = (n) => (n / 1048576).toFixed(1) + ' MB'
  console.log(`${LEVEL}: ${catalog.length} уроков, ${tests.length} тестов`)
  console.log(`  картинки ${Object.keys(imgIndex).length} слов → ${mb(imgBytes)}`)
  console.log(`  аудио ${Object.keys(audioFiles).length} файлов → ${mb(audioBytes)}`)
  console.log(`  css ${(fs.statSync(path.join(OUT, 'course.css')).size / 1024) | 0} KB · engine ${(fs.statSync(path.join(OUT, 'engine.js')).size / 1024) | 0} KB · shell ${(fs.statSync(path.join(OUT, 'shell.html')).size / 1024) | 0} KB`)
}

if (require.main === module) {
  try {
    run()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

module.exports = { scopeCss, scopeSelector, patchEngine }
