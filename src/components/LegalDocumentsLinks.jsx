import { useI18n } from '../i18n.jsx'
import { LEGAL_DOCUMENTS, legalDocumentUrl } from '../lib/legalDocuments.js'

export default function LegalDocumentsLinks({ language }) {
  const { t, lang } = useI18n()
  return <ul className="legal-links">
    {LEGAL_DOCUMENTS.map((kind) => <li key={kind}>
      <a href={legalDocumentUrl(kind, language || lang)} target="_blank" rel="noopener noreferrer">
        {t(`legal.${kind}`)} <span aria-hidden="true">↗</span>
      </a>
    </li>)}
  </ul>
}
