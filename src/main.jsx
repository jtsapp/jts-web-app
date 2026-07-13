import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Две системы i18n сосуществуют: I18nProvider (миры/обучение, useI18n) и
// LanguageProvider (экраны тьютора, useT/useLang). Оба контекста нужны App'у.
import { I18nProvider } from './i18n.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import './styles.css'
import './tutor.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </I18nProvider>
  </React.StrictMode>,
)
