// Immutable exports of the owner's original documents; see public/legal/*/manifest.json.
export const LEGAL_VERSION = '2026-10-29'
export const LEGAL_DOCUMENTS = ['offer', 'privacy', 'payment-security']
export const documentLanguage = (lang) => lang === 'kz' || lang === 'kk' ? 'kk' : 'ru'
export const legalDocumentUrl = (kind, lang) => `/legal/${LEGAL_VERSION}/${kind}-${documentLanguage(lang)}.pdf`
