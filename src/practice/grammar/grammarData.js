// Загрузка данных раздела «Грамматика» (public/practice/grammar/, собирается
// scripts/extract-grammar.js из грамматика_практика.html):
//   index.json     — лёгкий каталог всех уровней (для карточек, без уроков)
//   <level>.json   — тяжёлый контент уроков уровня (теория + упражнения)
// Оба кэшируются промисами на модуль: каталог грузится один раз, а контент
// уровня — при первом открытии любого его урока. Паттерн — как у fetchCoversIndex
// в PracticePage.

// Уровни витрины — ровно те, что есть в выгрузке курса (A0–C1). C2 отсюда
// убран: чип показывал заглушку «скоро», курса под ним нет и не планируется.
export const GRAMMAR_LEVELS = [
  { code: 'a0', label: 'A0' },
  { code: 'a1', label: 'A1' },
  { code: 'a2', label: 'A2' },
  { code: 'b1', label: 'B1' },
  { code: 'b2', label: 'B2' },
  { code: 'c1', label: 'C1' },
]

// Уровень пользователя (напр. 'B1') → код курса. За пределами A0–C1 (в т.ч. C2)
// откатываемся на ближайший доступный, чтобы рейл всегда что-то показывал.
// A0 — собственный курс с 2026-08-27; до него новички попадали сразу в A1.
export function levelToCourse(userLevel) {
  const c = String(userLevel || '').toLowerCase()
  if (['a0', 'a1', 'a2', 'b1', 'b2', 'c1'].includes(c)) return c
  if (c.startsWith('c')) return 'c1'
  if (c.startsWith('b')) return 'b1'
  return 'a1'
}

let _indexPromise = null
export function loadGrammarIndex() {
  if (!_indexPromise) {
    // Промах НЕ кэшируем: раньше единственный сбой (офлайн в момент открытия,
    // 404 сразу после деплоя) записывал null навсегда, и раздел «Грамматика»
    // молча исчезал из Практики до перезагрузки страницы — тот же приём с
    // обнулением кэша уже применён к демо-токену в api.js.
    _indexPromise = fetch('/practice/grammar/index.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (!data) _indexPromise = null
        return data
      })
  }
  return _indexPromise
}

const _levelPromises = {}
export function loadGrammarLevel(code) {
  if (!_levelPromises[code]) {
    // Промах НЕ кэшируем — по той же причине, что и в loadGrammarIndex выше:
    // один сбой сети при первом уроке уровня делал все его уроки «пустыми»
    // до перезагрузки страницы.
    _levelPromises[code] = fetch(`/practice/grammar/${code}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (!data) delete _levelPromises[code]
        return data
      })
  }
  return _levelPromises[code]
}

// Диапазон номеров юнитов в секции → «Unit 1-9» (для пилюли рядом с заголовком).
export function sectionRange(units) {
  if (!units || !units.length) return ''
  const ids = units.map((u) => u.id)
  const lo = Math.min(...ids)
  const hi = Math.max(...ids)
  return lo === hi ? `Unit ${lo}` : `Unit ${lo}-${hi}`
}

// Группировка юнитов уровня по секциям в порядке SECTIONS (как в каталоге курса).
export function groupBySection(level) {
  if (!level) return []
  return level.sections
    .map((s) => ({
      key: s.k,
      name: s.name,
      theme: s.theme,
      units: level.units.filter((u) => u.secKey === s.k),
    }))
    .filter((g) => g.units.length)
}

// Цвета обложки карточки по теме секции (THEMES из курса). Фолбэк — фиолетовый.
export function themeGradient(themes, themeIndex) {
  const th = themes && themes[themeIndex]
  const a = (th && th.a) || '#8B5CF6'
  const b = (th && th.b) || '#6E63E8'
  return `linear-gradient(140deg, ${a}, ${b})`
}

// Чистый текст из HTML-строки (заголовки/описания юнитов содержат <em>).
export function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, '')
}
