// Полный банк движка теста уровня школы (публичный bank.json + ключи) — только на сервере.
//
// Ключей в публичном банке нет (см. bankSplit.js): браузер их не видит. Нужен полный банк двоим: подбору вариантов
// для A0-моста пробного урока (placementA0.js → /api/placement/a0-options) и сверке движка с бандлом школы
// (placementParity.test.js).
//
// До 14.10.2026 здесь же жили проверка ответов и пересчёт уровня по журналу прежнего теста уровня — их звали только
// его экран и роуты grade/session, удалённые вместе с ним (тест уровня теперь v16 методиста, src/placement/).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergeBank2 } from '../practice/placement/engine.generated.js'
import { mergeKeys } from '../practice/placement/bankSplit.js'
import keysFile from '../practice/placement/keys.generated.json'

let cached = null

/**
 * Публичный банк (то, что видит браузер) плюс ключи — только на сервере.
 * @returns {{bank, keys, manifest, vocab}}
 */
export function loadFullBank() {
  if (!cached) {
    const publicData = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'practice', 'placement', 'bank.json'), 'utf8'),
    )
    const data = mergeKeys(publicData, keysFile)
    mergeBank2(data.bank, data.manifest, data.bank2)
    cached = { bank: data.bank, keys: keysFile.items || {}, manifest: data.manifest, vocab: data.vocab }
  }
  return cached
}
