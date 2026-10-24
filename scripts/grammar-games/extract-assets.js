// Статика «Грамматики · игр»: 7 маскотов (IMG) и 563 эмодзи Apple (EMO) из
// прототипа методиста — файлами в public/practice/grammar-games/. В прототипе
// они лежат base64 прямо в html (1,5 МБ); на сайте это были бы те же 1,5 МБ в
// бандле на каждого, кто даже не открыл раздел. Файлами — грузится только то,
// что на экране, и браузер кэширует.
//
// Это не контент: темы и словарь живут на бэкенде (заливка в web-admin), а
// маскоты и эмодзи одинаковы у любой заливки. Поэтому скрипт гоняется один раз
// и при смене набора эмодзи в прототипе.
//
// Идемпотентен: одинаковый файл не перезаписывается, файл эмодзи, которого нет
// в наборе, удаляется (иначе тест «сирот нет» поймал бы его позже).
//
// Запуск: node scripts/grammar-games/extract-assets.js --html data/jtsgrammar-games.html

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const OUT = path.join(__dirname, '..', '..', 'public', 'practice', 'grammar-games')

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

// Строка вида `const NAME=<литерал>;` — литерал целиком на одной строке (так собран прототип).
function literal(lines, name) {
  const line = lines.find((l) => l.startsWith(`const ${name}=`))
  if (!line) throw new Error(`в прототипе нет const ${name}`)
  return line.slice(`const ${name}=`.length).replace(/;\s*$/, '')
}

// Имя файла — кодпоинты символа через «-», включая ZWJ и FE0F: ключ EMO — сам символ, и два разных
// символа не должны сойтись в одно имя (🙋‍♀️ и 🙋 отличаются только хвостом). Та же функция — в emoji.js.
const emojiFile = (ch) => [...ch].map((c) => c.codePointAt(0).toString(16)).join('-') + '.webp'

function webp(uri, what) {
  const m = /^data:image\/webp;base64,(.+)$/.exec(uri)
  if (!m) throw new Error(`${what}: не webp data-URI`)
  return Buffer.from(m[1], 'base64')
}

function write(file, buf) {
  if (fs.existsSync(file) && fs.readFileSync(file).equals(buf)) return false
  fs.writeFileSync(file, buf)
  return true
}

function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу «Грамматики · игр»>')
  const lines = fs.readFileSync(src, 'utf8').split('\n')

  // IMG — JS-литерал с одинарными кавычками и голыми ключами, не JSON: вычисляем в пустом контексте.
  const img = vm.runInNewContext(`(${literal(lines, 'IMG')})`)
  const emo = JSON.parse(literal(lines, 'EMO'))

  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true })
  fs.mkdirSync(path.join(OUT, 'emoji'), { recursive: true })

  let changed = 0
  for (const [name, uri] of Object.entries(img)) changed += write(path.join(OUT, 'img', `${name}.webp`), webp(uri, name))

  const keep = new Set()
  for (const [ch, uri] of Object.entries(emo)) {
    const file = emojiFile(ch)
    keep.add(file)
    changed += write(path.join(OUT, 'emoji', file), webp(uri, ch))
  }
  let removed = 0
  for (const f of fs.readdirSync(path.join(OUT, 'emoji'))) {
    if (f.endsWith('.webp') && !keep.has(f)) {
      fs.unlinkSync(path.join(OUT, 'emoji', f))
      removed++
    }
  }
  // Порядок — как в прототипе: движок строит из списка регэксп (длинные вперёд сортирует сам).
  changed += write(path.join(OUT, 'emoji', 'index.json'), Buffer.from(JSON.stringify(Object.keys(emo)) + '\n'))

  console.log(`маскотов ${Object.keys(img).length}, эмодзи ${keep.size}; записано ${changed}, удалено ${removed}`)
}

main()
