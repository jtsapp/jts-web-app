import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { LEGAL_VERSION, LEGAL_DOCUMENTS, legalDocumentUrl } from './legalDocuments.js'

it('ships all original document exports with verifiable immutable contents', () => {
  const manifest = JSON.parse(readFileSync(new URL(`../../public/legal/${LEGAL_VERSION}/manifest.json`, import.meta.url)))
  expect(manifest.version).toBe(LEGAL_VERSION)
  expect(manifest.documents).toHaveLength(6)
  for (const kind of LEGAL_DOCUMENTS) for (const language of ['ru', 'kk']) {
    const entry = manifest.documents.find((d) => d.kind === kind && d.language === language)
    const bytes = readFileSync(new URL(`../../public${legalDocumentUrl(kind, language)}`, import.meta.url))
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256)
  }
  expect(legalDocumentUrl('offer', 'en')).toBe(`/legal/${LEGAL_VERSION}/offer-ru.pdf`)
  expect(legalDocumentUrl('privacy', 'kz')).toBe(`/legal/${LEGAL_VERSION}/privacy-kk.pdf`)
})
