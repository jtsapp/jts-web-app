// Разделение банка на публичную часть и ключи.
//
// Банк заданий отдаётся браузеру целиком, и вместе с ним уезжали ответы: индекс
// верного варианта, эталонные строки, T/F/NS для каждого утверждения, верный
// порядок шагов и слов, пары для сопоставления. То есть любой мог открыть
// /practice/placement/bank.json и прочитать ключ ко всему тесту, а проверка
// ответов на клиенте была проверкой по этим же ключам.
//
// Теперь генератор (scripts/extract-placement.js) раскладывает банк надвое:
//   • public/practice/placement/bank.json — только то, что нужно нарисовать;
//   • src/practice/placement/keys.generated.json — ответы, живут на сервере.
// Перемешивания детерминированы (сид от id задания), чтобы перегенерация не
// давала диффов на ровном месте.
//
// Что осознанно остаётся в публичной части:
//   • минимальные пары (word/distractor) — записей произношения в репозитории
//     нет (jts-bank/pairs пуст), и задание озвучивается синтезатором прямо из
//     слова; без него раздел просто не звучит;
//   • словарь LexTALE — это словарь, «ключ» в нём неотделим от данных;
//     на уровень он влияет только приором, а серверный пересчёт его не берёт;
//   • expectKeywords говорения — на уровень не влияет (говорение не входит в θ).

import { mulberry32, seededShuffle } from './engine.generated.js'

/** Детерминированный ГПСЧ по строке — чтобы перемешивания были стабильны.
 *  Экспортируется: тем же сидом сервер собирает варианты A0-моста
 *  (lib/placementA0.js), иначе один и тот же ученик видел бы разный порядок
 *  на каждый запрос. */
export function rngFor(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return mulberry32(h >>> 0)
}

const OPEN_FORMATS = new Set(['cloze_open', 'wform', 'transform'])

/**
 * @param {object} data — содержимое bank.json целиком
 * @returns {{public: object, keys: object}}
 */
export function splitBank(data) {
  const copy = JSON.parse(JSON.stringify(data))
  const keys = { version: copy.bank?.version ?? null, items: {} }
  const put = (id, patch) => {
    keys.items[id] = { ...(keys.items[id] || {}), ...patch }
  }

  // --- основной банк: варианты и открытые ответы ---
  for (const item of copy.bank.items || []) {
    if (item.options) {
      if (item.key != null) put(item.id, { key: item.key })
      delete item.key
      // Разбор дистракторов объясняет, почему вариант неверный, — тот же ключ.
      // Методистам он нужен, поэтому не выбрасываем, а прячем в ключи.
      if (item.options.some((o) => o.m !== undefined)) {
        put(item.id, { optionNotes: item.options.map((o) => o.m ?? null) })
      }
      item.options = item.options.map((o) => ({ t: o.t }))
    }
    if (OPEN_FORMATS.has(item.format) && item.answer) {
      put(item.id, { answer: item.answer, gloss: item.gloss ?? null })
      delete item.answer
      delete item.gloss // объяснение ответа
    }
  }

  // Копия заданий A0-моста лежит и в конфиге ветки (bank.a0.bridge.items) —
  // те же id, тот же ответ. Плюс спецификация будущих картиночных заданий.
  for (const item of copy.bank.a0?.bridge?.items || []) {
    if (item.answer) {
      put(item.id, { answer: item.answer, gloss: item.gloss ?? null })
      delete item.answer
      delete item.gloss
    }
  }
  for (const set of copy.bank.a0?.imageItemSpec?.sets || []) {
    if (set.key != null) {
      put(`imageSpec:${set.id ?? copy.bank.a0.imageItemSpec.sets.indexOf(set)}`, { key: set.key })
      delete set.key
    }
  }

  // --- дополнительный банк (bank2), из него собираются аудирование и интерактив ---
  const b2 = copy.bank2 || {}

  for (const q of b2.listening2?.items || []) {
    if (q.type === 'tfns' && Array.isArray(q.statements)) {
      put(q.id, { statements: q.statements.map((s) => s.key) })
      q.statements = q.statements.map((s) => ({ t: s.t }))
    } else if (q.type === 'order' && Array.isArray(q.steps)) {
      put(q.id, { steps: q.steps.slice() })
      q.steps = seededShuffle(q.steps.slice(), rngFor(q.id))
    } else if (q.key != null) {
      put(q.id, { key: q.key })
      delete q.key
    }
  }

  for (const q of b2.clips?.items || []) {
    if (q.key != null) put(q.id, { key: q.key })
    delete q.key
  }

  const inter = b2.interactive || {}
  for (const q of inter.order || []) {
    put(q.id, { answer: q.answer })
    // Клиенту нужны слова, но не их порядок: поле остаётся на месте (движок
    // собирает из него набор слов), но хранит перемешанную последовательность.
    q.answer = seededShuffle(String(q.answer).replace(/[.!?]$/, '').split(/\s+/), rngFor(q.id)).join(' ')
  }
  for (const q of inter.bankfill || []) {
    put(q.id, { answers: q.answers })
    // Длина нужна экрану (сколько пропусков), значения — нет.
    q.answers = q.answers.map(() => '')
  }
  for (const q of inter.match || []) {
    // Правую колонку перемешиваем: сопоставление «i-я слева — i-я справа»
    // и было ответом. matchMap[i] — индекс верной правой части в публичном
    // порядке; сами пары сохраняем для сверки движка с бандлом.
    const order = seededShuffle(q.pairs.map((_, i) => i), rngFor(q.id))
    put(q.id, { pairs: q.pairs.map((p) => p.slice()), matchMap: order.map((_, i) => order.indexOf(i)) })
    q.pairs = q.pairs.map((p, i) => [p[0], q.pairs[order[i]][1]])
  }

  return { public: copy, keys }
}

/** Собирает полный банк обратно: публичная часть + ключи (только на сервере). */
export function mergeKeys(publicData, keys) {
  const data = JSON.parse(JSON.stringify(publicData))
  const byId = keys?.items || {}

  for (const item of data.bank.items || []) {
    const k = byId[item.id]
    if (!k) continue
    if (k.key != null) item.key = k.key
    if (k.answer) item.answer = k.answer
    if (k.gloss !== undefined) item.gloss = k.gloss
    if (k.optionNotes && item.options) {
      item.options = item.options.map((o, i) => ({ ...o, m: k.optionNotes[i] }))
    }
  }

  for (const item of data.bank.a0?.bridge?.items || []) {
    const k = byId[item.id]
    if (!k) continue
    if (k.answer) item.answer = k.answer
    if (k.gloss !== undefined) item.gloss = k.gloss
  }
  const sets = data.bank.a0?.imageItemSpec?.sets || []
  sets.forEach((set, i) => {
    const k = byId[`imageSpec:${set.id ?? i}`]
    if (k?.key != null) set.key = k.key
  })

  const b2 = data.bank2 || {}
  for (const q of b2.listening2?.items || []) {
    const k = byId[q.id]
    if (!k) continue
    if (k.key != null) q.key = k.key
    if (k.statements) q.statements = q.statements.map((s, i) => ({ ...s, key: k.statements[i] }))
    if (k.steps) q.steps = k.steps
  }
  for (const q of b2.clips?.items || []) {
    const k = byId[q.id]
    if (k?.key != null) q.key = k.key
  }
  const inter = b2.interactive || {}
  for (const q of inter.order || []) {
    const k = byId[q.id]
    if (k?.answer) q.answer = k.answer
  }
  for (const q of inter.bankfill || []) {
    const k = byId[q.id]
    if (k?.answers) q.answers = k.answers
  }
  for (const q of inter.match || []) {
    const k = byId[q.id]
    if (!k) continue
    if (k.pairs) q.pairs = k.pairs
  }
  return data
}
