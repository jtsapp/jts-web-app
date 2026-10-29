import { useI18n } from '../i18n.jsx'
import { LEGAL_DOCUMENTS, legalDocumentUrl } from '../lib/legalDocuments.js'

export default function LegalDocumentsLinks({ language, cards = false }) {
  const { t, lang } = useI18n()
  return <ul className="legal-links">
    {LEGAL_DOCUMENTS.map((kind) => <li key={kind}>
      <a href={legalDocumentUrl(kind, language || lang)} target="_blank" rel="noopener noreferrer">
        {cards && <svg className="legal-link-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 3v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>}
        <span className="legal-link-label">{t(`legal.${kind}`)}</span> <span className="legal-link-arrow" aria-hidden="true">↗</span>
      </a>
    </li>)}
  </ul>
}
