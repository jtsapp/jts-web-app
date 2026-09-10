'use client'

// Перевод слова. В данных прототипа есть только русский и казахский — это
// материал, а не строки интерфейса, и переводить его на лету нельзя:
// сетевой переводчик на односложных словах вне контекста врёт («bat» —
// летучая мышь или бита?).
//
// Поэтому при английском интерфейсе перевода нет вовсе: остаются английское
// слово и картинка, а картинка в визуальном словаре и есть значение.
// Переключатель RU/KZ внутри раздела при этом работает при любом языке
// интерфейса — как в прототипе.

export const WORD_LANGS = ['ru', 'kk']
export const DEFAULT_WORD_LANG = 'ru'
// Язык подписи хранится отдельно от языка интерфейса: человек может учиться
// на русском интерфейсе, а проверять себя на казахском.
export const WORD_LANG_KEY = 'jts_words_lang'

/** Язык интерфейса приложения → язык подписи по умолчанию. */
export function wordLangFor(uiLang) {
  if (uiLang === 'kz' || uiLang === 'kk') return 'kk'
  if (uiLang === 'en') return null // без перевода
  return 'ru'
}

export function readWordLang() {
  try {
    const v = localStorage.getItem(WORD_LANG_KEY)
    if (WORD_LANGS.includes(v)) return v
  } catch {
    /* приватный режим — берём язык по умолчанию */
  }
  return null
}

export function writeWordLang(lang) {
  if (!WORD_LANGS.includes(lang)) return
  try {
    localStorage.setItem(WORD_LANG_KEY, lang)
  } catch {
    /* нет квоты — выбор просто не переживёт перезагрузку */
  }
}

/** Подпись к слову. Пустая строка значит «перевода не показываем». */
export function translate(word, lang) {
  if (!word || !lang) return ''
  return word[lang] || ''
}
