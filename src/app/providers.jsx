'use client'

// Две системы i18n сосуществуют: I18nProvider (миры/обучение, useI18n) и
// LanguageProvider (экраны тьютора, useT/useLang). Оба контекста нужны App'у.
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'

export default function Providers({ children }) {
  return (
    <I18nProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nProvider>
  )
}
