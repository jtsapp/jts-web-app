// Патч состояния раздела «Практики» — правки ученика, которых сервер ещё не
// подтвердил. Разделы-объекты (воркбук, «Письмо», глаголы, «Слушай и выбирай»,
// «Словарь») сервер хранит заменой: что пришло, то и лежит. Раньше их запись
// до ответа сервера уходила целиком и стирала прогресс с другого устройства, а
// сбой отправки забывался до следующей правки (ревью 08.10.2026, #78). Теперь
// хранилище копит патч и кладёт его поверх серверного.
//
// Патч повторяет форму состояния:
// - словарь — правки по ключам, вглубь (корзина результатов режима глаголов —
//   это словарь внутри словаря, и правка одного глагола не заменяет её целиком);
// - список — как множество: что добавлено и что снято. Список «изучено» уровня
//   или «уже было» сложности с другого устройства так не стирается;
// - запись — словарь из простых полей глубже первого уровня (результат
//   задания «Письма», запись глагола в корзине, промахи слова) — целиком:
//   поля по отдельности дали бы обрубок, если на сервере запись успели снять;
// - остальное — значение целиком, снятый ключ — DEL.
//
// Разделы первого уровня (saved, seen, sc) — не записи, а словари по id, даже
// если значения у них простые: их правим по ключам. Ключи из opts.atomic
// (промахи воркбука — список последней попытки) берутся целиком на уровень ниже.
//
// Без DOM и сети: патч храним в localStorage, поэтому он обязан пережить JSON.

const DEL = { $del: 1 }

const isMap = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const isDel = (v) => isMap(v) && v.$del === 1 && Object.keys(v).length === 1
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const keyOf = (e) => JSON.stringify(e)
const keysOf = (list) => new Set((list || []).map(keyOf))
const isList = (n) => isMap(n) && (Array.isArray(n.add) || Array.isArray(n.del)) && !('set' in n) && !('sub' in n)

// Запись: непустой словарь, где все значения простые (не словари и не списки).
const isRecord = (v) => isMap(v) && Object.keys(v).length > 0 && Object.values(v).every((x) => x === null || typeof x !== 'object')

// depth — уровень словаря: 0 — само состояние, 1 — его разделы. whole — брать
// значения этого словаря целиком (ключ из opts.atomic).
function diffNode(x, y, depth = 0, opts = {}, whole = false) {
  if (same(x, y)) return null
  if (whole || (depth >= 2 && (isRecord(x) || isRecord(y)))) return { set: y === undefined ? DEL : y }
  // Ключа на этом устройстве не было: список или словарь вливается в
  // серверный, а не заменяет его — на сервере ключ мог появиться раньше.
  if (x === undefined && Array.isArray(y)) return { add: y, del: [] }
  if (x === undefined && isMap(y)) return diffNode({}, y, depth, opts)
  if (isMap(x) && isMap(y)) {
    const sub = {}
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (!(k in y)) sub[k] = { set: DEL }
      else {
        const atomicChildren = depth === 1 && (opts.atomic || []).includes(parentKey(opts))
        const d = diffNode(x[k], y[k], depth + 1, depth === 0 ? { ...opts, top: k } : opts, atomicChildren)
        if (d) sub[k] = d
      }
    }
    return Object.keys(sub).length ? { sub } : null
  }
  if (Array.isArray(x) && Array.isArray(y)) {
    const kx = keysOf(x)
    const ky = keysOf(y)
    const add = y.filter((e) => !kx.has(keyOf(e)))
    const del = x.filter((e) => !ky.has(keyOf(e)))
    // Сменился только порядок — для множества это не правка.
    return add.length || del.length ? { add, del } : null
  }
  return { set: y === undefined ? DEL : y }
}

function applyNode(base, node) {
  if (!isMap(node)) return base
  if ('set' in node) return isDel(node.set) ? undefined : node.set
  if ('sub' in node) {
    const out = isMap(base) ? { ...base } : {}
    for (const [k, n] of Object.entries(node.sub)) {
      const v = applyNode(out[k], n)
      if (v === undefined) delete out[k]
      else out[k] = v
    }
    return out
  }
  if (isList(node)) {
    const del = keysOf(node.del)
    const kept = (Array.isArray(base) ? base : []).filter((e) => !del.has(keyOf(e)))
    const have = keysOf(kept)
    return [...kept, ...(node.add || []).filter((e) => !have.has(keyOf(e)))]
  }
  return base
}

function composeNode(a, b) {
  if (!a) return b
  if ('set' in b) return b
  if ('set' in a) {
    // Правка поверх замены накладывается на её значение.
    const v = applyNode(isDel(a.set) ? undefined : a.set, b)
    return { set: v === undefined ? DEL : v }
  }
  if ('sub' in a && 'sub' in b) {
    const sub = { ...a.sub }
    for (const [k, n] of Object.entries(b.sub)) sub[k] = composeNode(sub[k], n)
    return { sub }
  }
  if (isList(a) && isList(b)) {
    const bAdd = keysOf(b.add)
    const bDel = keysOf(b.del)
    const add = [...(a.add || []).filter((e) => !bDel.has(keyOf(e))), ...(b.add || [])]
    const del = [...(a.del || []).filter((e) => !bAdd.has(keyOf(e))), ...(b.del || [])]
    return { add: dedupe(add), del: dedupe(del) }
  }
  return b
}

function dedupe(list) {
  const seen = new Set()
  return list.filter((e) => {
    const k = keyOf(e)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function subtractNode(s, a) {
  if (!a) return s
  if ('sub' in s && 'sub' in a) {
    const sub = {}
    for (const [k, n] of Object.entries(s.sub)) {
      const r = subtractNode(n, a.sub[k])
      if (r) sub[k] = r
    }
    return Object.keys(sub).length ? { sub } : null
  }
  if (isList(s) && isList(a)) {
    const aAdd = keysOf(a.add)
    const aDel = keysOf(a.del)
    const add = (s.add || []).filter((e) => !aAdd.has(keyOf(e)))
    const del = (s.del || []).filter((e) => !aDel.has(keyOf(e)))
    return add.length || del.length ? { add, del } : null
  }
  return same(s, a) ? null : s
}

function validNode(n, depth = 0) {
  if (!isMap(n) || depth > 32) return false
  if ('set' in n) return true
  if ('sub' in n) return isMap(n.sub) && Object.values(n.sub).every((c) => validNode(c, depth + 1))
  return isList(n)
}

const parentKey = (opts) => opts.top

/**
 * Что поменялось между prev и next. opts.atomic — разделы, чьи значения
 * берутся целиком (а не множеством или по полям).
 */
export function diffState(prev, next, opts = {}) {
  return diffNode(isMap(prev) ? prev : {}, isMap(next) ? next : {}, 0, opts)?.sub ?? {}
}

/** Сначала a, потом b: поздняя правка того же места перекрывает раннюю. */
export function composePatch(a, b) {
  return composeNode(isMap(a) ? { sub: a } : null, { sub: isMap(b) ? b : {} }).sub
}

/** Серверное состояние + правки ученика. Исходник не меняется. */
export function applyPatch(base, patch) {
  return applyNode(isMap(base) ? base : {}, { sub: isMap(patch) ? patch : {} })
}

/**
 * Что из stored ещё не подтверждено, если сервер принял acked. Убирается
 * только то, что совпадает: правка, сделанная после отправки, остаётся.
 */
export function subtractPatch(stored, acked) {
  if (!isMap(stored)) return {}
  return subtractNode({ sub: stored }, { sub: isMap(acked) ? acked : {} })?.sub ?? {}
}

export function isEmptyPatch(p) {
  return !isMap(p) || Object.keys(p).length === 0
}

/** Патч из хранилища мог побиться или прийти от другой версии — проверяем форму. */
export function isValidPatch(p) {
  return isMap(p) && Object.values(p).every((n) => validNode(n))
}
