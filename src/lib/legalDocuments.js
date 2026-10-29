// Immutable exports of the owner's original documents; see public/legal/*/manifest.json.
export const LEGAL_VERSION = '2026-10-29'
export const LEGAL_DOCUMENTS = ['offer', 'privacy', 'payment-security']
export const documentLanguage = (lang) => lang === 'kz' || lang === 'kk' ? 'kk' : 'ru'
export const legalDocumentUrl = (kind, lang) => `/legal/${LEGAL_VERSION}/${kind}-${documentLanguage(lang)}.pdf`

// A token can arrive before OTP/Google profile completion. Do not interrupt authentication.
const AUTH_SCREENS = new Set(['welcome', 'chat', 'phone', 'otp', 'login-password', 'complete-registration', 'set-password', 'success'])
export function isLegalDocumentsScreen(screen) {
  return typeof screen === 'string' && screen.length > 0 && !screen.startsWith('reg-') && !AUTH_SCREENS.has(screen)
}
