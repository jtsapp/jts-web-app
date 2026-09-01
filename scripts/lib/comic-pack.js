// Общий staging комиксов и упаковка их в ZIP.
//
// Материал больше не лежит в public/: раздел «Комиксы» берёт данные только из
// API (см. docs/superpowers/specs/2026-08-31-comics-api-contract.md), а
// экстракторы готовят архив, который контентщик заливает через админку.
// Поэтому всё собирается в build/ — он в .gitignore.
const fs = require('fs')
const path = require('path')
const { zipSync } = require('./zip.js')

const ROOT = path.join(__dirname, '..', '..')
const BUILD = path.join(ROOT, 'build/comics')

function stagingDir(id) {
  return path.join(BUILD, id)
}

function zipPath(id) {
  return path.join(BUILD, `${id}.zip`)
}

// Рекурсивный обход staging: имена внутри архива идут от каталога комикса,
// то есть `yellow/pages/001.webp` — ровно та форма, которую ждёт бэкенд.
function collect(dir, prefix, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name)
    const rel = `${prefix}/${name}`
    if (fs.statSync(full).isDirectory()) collect(full, rel, out)
    else out.push({ name: rel, data: fs.readFileSync(full) })
  }
  return out
}

/**
 * Пакует staging комикса в build/comics/<id>.zip.
 * @returns {{files:number, bytes:number, path:string}}
 */
function packComic(id) {
  const dir = stagingDir(id)
  if (!fs.existsSync(dir)) throw new Error(`нет материала ${dir} — сначала прогони extract-comics.js`)
  const entries = collect(dir, id)
  const zip = zipSync(entries)
  const out = zipPath(id)
  fs.writeFileSync(out, zip)
  return { files: entries.length, bytes: zip.length, path: out }
}

module.exports = { BUILD, stagingDir, zipPath, packComic }
