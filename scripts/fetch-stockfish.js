// scripts/fetch-stockfish.js
// Кладёт Stockfish в public/chess/engine. Движок — GPL-3.0: он едет отдельными файлами и работает в воркере
// (отдельная программа рядом с сайтом), поэтому в зависимостях и в бандле его нет. Сборка сверяется по sha256:
// незаметно сменившийся файл — это чужой код в браузере ученика.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')

const VERSION = '19.0.1'
const FILES = {
  'stockfish-19-lite-single.js': 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a',
  'stockfish-19-lite-single.wasm': 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de',
}
const OUT = path.join(__dirname, '..', 'public', 'chess', 'engine')
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jts-stockfish-'))
// shell: на Windows npm — это npm.cmd
execFileSync('npm', ['pack', `stockfish@${VERSION}`, '--silent'], { cwd: tmp, stdio: 'inherit', shell: true })
execFileSync('tar', ['-xzf', `stockfish-${VERSION}.tgz`], { cwd: tmp, stdio: 'inherit' })
fs.mkdirSync(OUT, { recursive: true })
for (const [name, want] of Object.entries(FILES)) {
  const src = path.join(tmp, 'package', 'bin', name)
  const got = sha(src)
  if (got !== want) throw new Error(`${name}: sha256 ${got}, ждали ${want}`)
  fs.copyFileSync(src, path.join(OUT, name))
}
fs.copyFileSync(path.join(tmp, 'package', 'Copying.txt'), path.join(OUT, 'COPYING.txt'))
fs.writeFileSync(path.join(OUT, 'SOURCE.txt'), [
  `Stockfish.js ${VERSION} (Stockfish 19, lite single-threaded WASM build)`,
  'License: GNU General Public License v3.0 — see COPYING.txt in this folder.',
  `Source code: https://github.com/nmrugg/stockfish.js/tree/v${VERSION}`,
  'Upstream engine: https://github.com/official-stockfish/Stockfish',
  'These files are served unmodified and run as a separate program in a Web Worker.',
  '',
].join('\n'))
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`Stockfish ${VERSION} → ${OUT}`)
