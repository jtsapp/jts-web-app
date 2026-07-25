// Загрузка данных Словаря (public/practice/vocab/, собирается
// scripts/extract-vocab.js из прототипа public/vocab/index.html):
//   index.json            — мета: уровни, сферы, счётчики
//   essential-<lvl>.json  — слова уровня A1…C1
//   field-<key>.json      — слова проф. сферы
// Каждый файл кэшируется промисом на модуль: выборка грузится один раз.

const cache = {}
function loadJson(file) {
  if (!cache[file]) {
    cache[file] = fetch(`/practice/vocab/${file}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return cache[file]
}

export const loadVocabIndex = () => loadJson('index.json')
export const loadLevelWords = (lvl) => loadJson(`essential-${String(lvl).toLowerCase()}.json`)
export const loadFieldWords = (key) => loadJson(`field-${key}.json`)

// Выборка для текущих настроек: уровень (essential) или проф. сфера
// (personalized). Порядок — по сложности, как scopeWords() в прототипе.
export async function loadScope({ mode, level, field }) {
  const words = mode === 'personalized' ? await loadFieldWords(field) : await loadLevelWords(level)
  if (!words || !words.length) return []
  return words.slice().sort((a, b) => a.dif - b.dif || a.id - b.id)
}

export function shuffle(a) {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// Перевод слова на язык интерфейса и на второй язык (как tr/altTr прототипа).
export const tr = (w, lang) => (lang === 'kk' ? w.kk : w.ru)
export const altTr = (w, lang) => (lang === 'kk' ? w.ru : w.kk)

// Пример с выделенным словом: "I have {{a}} dog." → подсветка <mark>.
export function exampleHtml(ex) {
  return String(ex || '').replace(/\{\{(.+?)\}\}/g, '<mark>$1</mark>')
}
