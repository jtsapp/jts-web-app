import { createContext, useContext, useMemo, useState } from 'react'
import { DICT, LANGS, DEFAULT_LANG } from './dict.js'

const LanguageContext = createContext(null)

const STORE_KEY = 'jts.lang'

function readInitial() {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved && LANGS.includes(saved)) return saved
  } catch {
    /* localStorage недоступен — молча используем дефолт */
  }
  return DEFAULT_LANG
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitial)

  const value = useMemo(() => {
    function setLang(next) {
      if (!LANGS.includes(next)) return
      setLangState(next)
      try {
        localStorage.setItem(STORE_KEY, next)
      } catch {
        /* игнорируем — не критично */
      }
    }

    // t(key, vars?) — берёт строку текущего языка, откатывается на ru, затем на ключ.
    // Подстановка {name} и т.п. из vars.
    function t(key, vars) {
      const table = DICT[lang] || DICT[DEFAULT_LANG]
      let str = table[key]
      if (str == null) str = DICT[DEFAULT_LANG][key]
      if (str == null) return key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll('{' + k + '}', v)
        }
      }
      return str
    }

    return { lang, setLang, t }
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang должен использоваться внутри <LanguageProvider>')
  return ctx
}

// Удобный хук, когда нужна только функция перевода.
export function useT() {
  return useLang().t
}
