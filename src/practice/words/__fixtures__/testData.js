// Чтение данных раздела с диска для юнит-тестов. В браузере секции приходят
// фетчем (data.js), в node их проще читать напрямую — иначе каждый тест
// поднимал бы мок сети ради одного и того же JSON.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(HERE, '..', '..', '..', '..', 'public', 'practice', 'words')

export const SECTIONS = ['animals', 'food', 'clothes', 'house', 'body']

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function loadSection(section) {
  return read(path.join(DATA_DIR, `${section}.json`))
}

export function loadMeta() {
  return read(path.join(DATA_DIR, 'meta.json'))
}

export function loadFixture(section) {
  return read(path.join(HERE, `oracle-${section}.json`))
}
