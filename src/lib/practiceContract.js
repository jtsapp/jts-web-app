// Чистые (без БД/сети/DOM) хелперы синхронизации прогресса практики. Пример
// проверяем на Web Request — поэтому здесь нет ни импортов алиаса `@`, ни доступа
// к localStorage: всё unit-тестируется в node.

// 'situations' — статический движок «Speaking Practice A1–C1»
// (public/practice/situations/), не путать с ситуативками из Java-бэкенда: те
// адресуются по id и ограничиваются через ContentType.SITUATIVKA. Здесь
// единица прохождения — уровень (их 5), других событий у статики нет.
// 'workbooks' — воркбуки A0–B2 (public/practice/workbooks/), та же модель:
// единица = открытый CEFR-уровень.
// 'writing' — стейт-объект {tasks, seen} (лучший результат по заданию + просмотры
// теории), поэтому семантика replace, как у vocab, а не union: гонка двух
// устройств может потерять результат одного из них — осознанный компромисс,
// тот же, что уже принят для vocab.
export const PRACTICE_MODULES = [
  'vocab',
  'grammar',
  'listening',
  'shadowing',
  'situations',
  'workbooks',
  'writing',
]

// Модули, чей state — это растущее множество пройденных id: прохождение нельзя
// терять при синхронизации двух устройств, поэтому их POST объединяет, а не
// заменяет.
const DONE_MODULES = ['grammar', 'listening', 'shadowing', 'situations', 'workbooks']

export function isValidModule(m) {
  return PRACTICE_MODULES.includes(m)
}

// state должен быть объектом-словарём, но не массивом: typeof [] === 'object'
// пропустил бы массив, который для vocab сохранился бы мусорным jsonb.
export function isValidStateShape(state) {
  return !!state && typeof state === 'object' && !Array.isArray(state)
}

// Множество пройденных id: только непустые строки, без дублей, стабильный порядок.
export function normalizeDone(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  for (const x of arr) if (typeof x === 'string' && x) seen.add(x)
  return [...seen]
}

export function emptyState(module) {
  return DONE_MODULES.includes(module) ? { done: [] } : {}
}

// Семантика записи: union для done-модулей (монотонность прохождения), replace
// для vocab (настройки + SRS перезаписываются целиком).
export function mergeModuleState(module, existing, incoming) {
  if (DONE_MODULES.includes(module)) {
    return {
      done: normalizeDone([
        ...normalizeDone(existing?.done),
        ...normalizeDone(incoming?.done),
      ]),
    }
  }
  return incoming && typeof incoming === 'object' ? incoming : existing ?? {}
}

// Гейт «только для залогиненных»: без валидного Bearer-заголовка возвращаем
// готовый 401, иначе null. Аутентификация первична — проверяется до наличия БД.
export function unauthorizedIfNoBearer(request) {
  const header = (request.headers.get('authorization') || '').trim()
  if (/^Bearer\s+\S+/i.test(header)) return null
  return Response.json({ configured: true, error: 'Authentication required.' }, { status: 401 })
}
