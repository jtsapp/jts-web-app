import { createContext, useContext, useMemo } from 'react'
import { DICT, LANGS, DEFAULT_LANG } from './dict.js'
import { useI18n } from '../i18n.jsx'

// Язык приложения хранит общий I18nProvider (src/i18n.jsx, ключ 'lang', коды
// ru/en/kk). Этот контекст — тонкий адаптер над ним для тьютор-словаря,
// который исторически живёт на кодах ru/en/kz: он маппит kk↔kz и даёт t()
// поверх DICT. Собственного стейта и ключа 'jts.lang' больше нет — смена языка
// в профиле переключает тьютор-раздел и наоборот.

const LanguageContext = createContext(null)

// Основной i18n использует ISO-код казахского 'kk', тьютор-словарь — 'kz'.
const APP_TO_TUTOR = { kk: 'kz' }
const TUTOR_TO_APP = { kz: 'kk' }

const LEGACY_KEY = 'jts.lang'

// Одноразовая миграция: язык, выбранный в тьюторе до объединения систем,
// переносится в общий 'lang' (если тот ещё не выбран — иначе общий главнее),
// легаси-ключ удаляется. Выполняется на импорте, до первого рендера
// I18nProvider, чтобы приложение сразу поднялось на нужном языке без мигания.
;(function migrateLegacyLang() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return
    localStorage.removeItem(LEGACY_KEY)
    if (!LANGS.includes(legacy)) return
    if (localStorage.getItem('lang')) return
    localStorage.setItem('lang', TUTOR_TO_APP[legacy] || legacy)
  } catch {
    /* SSR или недоступный localStorage — миграция просто не нужна */
  }
})()

export function LanguageProvider({ children }) {
  const app = useI18n()
  if (!app) throw new Error('LanguageProvider должен быть внутри <I18nProvider>')
  const { lang: appLang, setLang: setAppLang } = app

  const value = useMemo(() => {
    const lang = APP_TO_TUTOR[appLang] || (LANGS.includes(appLang) ? appLang : DEFAULT_LANG)

    function setLang(next) {
      if (!LANGS.includes(next)) return
      setAppLang(TUTOR_TO_APP[next] || next)
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
  }, [appLang, setAppLang])

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
