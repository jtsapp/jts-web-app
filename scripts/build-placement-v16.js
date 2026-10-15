// Собирает тест уровня v16 методиста (data/jtsplacement-v16.html) в public/placement/v16/ — страницу, которую
// приложение открывает в iframe (экран ?screen=placement, см. src/screens/PlacementPage.jsx).
//
// Тест встраивается КАК ЕСТЬ (спека docs/superpowers/specs/2026-10-14-placement-v16-first-login-design.md):
// логику и разметку автора не переписываем, своё подключаем через его же крючки (JTSPlacementConfig,
// JTSSpeakingBuddy). Сборка делает только то, без чего страницу нельзя отдавать ученику:
//   1. вшитые base64 (картинки, шрифты, видео — 8 из 8.6 МБ файла) выносит файлами в media/: браузер кэширует их
//      отдельно, а html перестаёт весить как фильм;
//   2. записи аудирования с CloudFront чужого аккаунта Higgsfield скачивает в audio/ — аккаунт может исчезнуть
//      вместе с записями (та же причина, что у fetch-words-assets.js);
//   3. накладывает точечные патчи (PATCHES). Каждый обязан найтись РОВНО ОДИН раз: новая версия автора, где
//      строка поменялась, роняет сборку, а не уезжает к ученикам без патча.
//
// Запуск: node scripts/build-placement-v16.js [путь-к-html] [--force]
//   --force — перекачать записи, даже если они уже лежат.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtsplacement-v16.html')
const OUT_DIR = path.join(ROOT, 'public', 'placement', 'v16')

// Мелочь (иконки-SVG на сотню байт) оставляем внутри: отдельный запрос за ней дороже самой картинки.
const MIN_EXTRACT_BYTES = 2048

const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'font/woff2': 'woff2',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
}

const CLOUDFRONT_RE = /https:\/\/d8j0ntlcm91z4\.cloudfront\.net\/[A-Za-z0-9_\-/.]+?\.mp3/g

// Прелюдия: страница узнаёт язык и «пространство» профиля из своего адреса (?lang=ru&ns=<id>). Отдельным скриптом
// ДО скрипта автора — его переменные объявляются при первом же исполнении.
const PRELUDE =
  '<script>/* jts host prelude (scripts/build-placement-v16.js) */' +
  "(function(){try{var q=new URLSearchParams(location.search);var l=q.get('lang');" +
  "window.JTS_HOST={lang:['ru','kk','en'].indexOf(l)>=0?l:null,ns:(q.get('ns')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64)}" +
  '}catch(e){window.JTS_HOST={lang:null,ns:\'\'}}})();</script>'

// Казахский интерфейс — на Inter, как во всём приложении (src/kk-font.css). Правила приложения в iframe не доходят: у
// теста свой документ и своя вшитая гарнитура «JTS Manrope». Тест сам ставит <html lang="kk"> при казахском (chrome()
// автора, и при переключении языка внутри теста тоже), поэтому правило висит на атрибуте. Гарнитур у теста только две —
// «JTS Manrope» и Inter, моноширинных и иконочных нет, — так что * с !important ничего чужого не задевает. Inter — той же
// ссылкой Google Fonts, что в layout.jsx: файлы шрифта браузер качает, только когда гарнитура реально нужна. Логотип
// (.wordmark) автор сам задал на Inter на всех языках — без этой ссылки он падал на системный шрифт.
const KK_FONT =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap"/>' +
  '<style id="jts-host-kk-font">html[lang="kk"] *{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important}</style>'

// [что ищем, на что меняем, зачем]. Строки — точные куски исходника.
const PATCHES = [
  [
    "const STORAGE='jts_placement_ui_v11';",
    "const STORAGE='jts_placement_ui_v11'+(window.JTS_HOST&&window.JTS_HOST.ns?':'+window.JTS_HOST.ns:'');",
    // Прогон автора живёт в localStorage устройства и принадлежит не аккаунту, а устройству: второй ученик на
    // том же компьютере продолжил бы чужой тест. Ключ с пространством профиля разводит их.
    'storage-namespace',
  ],
  [
    "let app=null;let lang='ru';",
    "let app=null;let lang=(window.JTS_HOST&&window.JTS_HOST.lang)||'ru';",
    // Стартовый язык — язык интерфейса приложения; переключатель самого теста по-прежнему работает и запоминается.
    'start-language',
  ],
  [
    "appUrl:'https://dev-tutor.justtostudy.kz/',",
    "appUrl:'/',",
    // Запасная навигация автора открывала дев-стенд в новой вкладке даже с прода. Основной путь — наш navigate.
    'app-url',
  ],
  [
    "practiceUrl:'https://dev-tutor.justtostudy.kz/?screen=practice',",
    "practiceUrl:'/?screen=practice',",
    'practice-url',
  ],
]

function count(haystack, needle) {
  let n = 0
  let i = -1
  while ((i = haystack.indexOf(needle, i + 1)) >= 0) n++
  return n
}

/** Накладывает PATCHES; бросает, если кусок не найден или найден не один раз. */
function applyPatches(html, patches = PATCHES) {
  let out = html
  for (const [from, to, name] of patches) {
    const n = count(out, from)
    if (n !== 1) throw new Error(`[build-placement-v16] патч «${name}»: найдено ${n} вхождений вместо одного`)
    out = out.replace(from, () => to)
  }
  return out
}

/** Вставляет прелюдию перед первым <script> страницы. */
function injectPrelude(html) {
  const at = html.indexOf('<script')
  if (at < 0) throw new Error('[build-placement-v16] в странице нет <script>')
  return html.slice(0, at) + PRELUDE + html.slice(at)
}

/** Inter для казахского — в конец <head>, после стилей автора. */
function injectKkFont(html) {
  const at = html.indexOf('</head>')
  if (at < 0) throw new Error('[build-placement-v16] в странице нет </head>')
  return html.slice(0, at) + KK_FONT + html.slice(at)
}

/**
 * Выносит base64 крупнее MIN_EXTRACT_BYTES в файлы. Имя — sha1 содержимого: одинаковые картинки ложатся одним
 * файлом, а повторная сборка не плодит копий. Возвращает { html, files: [{ name, bytes }] }.
 */
function extractMedia(html, minBytes = MIN_EXTRACT_BYTES) {
  const files = new Map()
  const out = html.replace(/data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g, (whole, mime, b64) => {
    const ext = EXT[mime]
    if (!ext) return whole
    const bytes = Buffer.from(b64, 'base64')
    if (bytes.length < minBytes) return whole
    const name = `${crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 16)}.${ext}`
    files.set(name, bytes)
    return `media/${name}`
  })
  return { html: out, files: [...files].map(([name, bytes]) => ({ name, bytes })) }
}

/** Адреса записей CloudFront → локальные имена (последний сегмент пути). */
function cloudfrontMap(html) {
  const map = new Map()
  for (const url of html.match(CLOUDFRONT_RE) || []) map.set(url, `audio/${url.split('/').pop()}`)
  return map
}

function rewriteUrls(html, map) {
  let out = html
  for (const [from, to] of map) out = out.split(from).join(to)
  return out
}

async function download(url, dest, force) {
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'kept'
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1024) throw new Error(`подозрительно мало: ${buf.length} байт`)
      fs.writeFileSync(dest, buf)
      return 'fetched'
    } catch (e) {
      if (attempt === 3) throw new Error(`[build-placement-v16] не скачать ${url}: ${e.message}`)
    }
  }
  return 'failed'
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const src = args.find((a) => !a.startsWith('--')) || DEFAULT_SRC
  const raw = fs.readFileSync(src, 'utf8')

  const patched = injectKkFont(injectPrelude(applyPatches(raw)))
  const { html: lean, files } = extractMedia(patched)
  const audio = cloudfrontMap(lean)
  const html = rewriteUrls(lean, audio)
  if (/cloudfront\.net/.test(html)) throw new Error('[build-placement-v16] после замены остались адреса CloudFront')

  fs.mkdirSync(path.join(OUT_DIR, 'media'), { recursive: true })
  fs.mkdirSync(path.join(OUT_DIR, 'audio'), { recursive: true })
  // Медиа пересобираем начисто: старые файлы прошлой версии иначе копились бы в репозитории.
  for (const f of fs.readdirSync(path.join(OUT_DIR, 'media'))) fs.unlinkSync(path.join(OUT_DIR, 'media', f))
  for (const f of files) fs.writeFileSync(path.join(OUT_DIR, 'media', f.name), f.bytes)

  const stats = { kept: 0, fetched: 0 }
  for (const [url, local] of audio) {
    stats[await download(url, path.join(OUT_DIR, local), force)]++
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html)
  const kb = (n) => `${Math.round(n / 1024)} КБ`
  console.log(
    `[build-placement-v16] index.html ${kb(Buffer.byteLength(html))} (было ${kb(Buffer.byteLength(raw))}), ` +
      `media ${files.length} файлов ${kb(files.reduce((s, f) => s + f.bytes.length, 0))}, ` +
      `audio ${audio.size} (скачано ${stats.fetched}, уже было ${stats.kept})`,
  )
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
  })
}

module.exports = { applyPatches, injectPrelude, injectKkFont, extractMedia, cloudfrontMap, rewriteUrls, PATCHES, PRELUDE }
