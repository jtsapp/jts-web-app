'use client'

import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { acceptContractOffer, getContractPdf } from '../api.js'
import { isOffer, signable } from '../contracts/contractLogic.js'
import { useContractT, contractError } from '../contracts/texts.js'
import { useContracts } from '../contracts/useContracts.js'
import SignDialog from '../contracts/SignDialog.jsx'
import ContractPdfPreview from '../contracts/ContractPdfPreview.jsx'
import { useBusy, useToast } from '../matching/ui.jsx'

// Оферта принимается галочкой; договор распечатывают, подписывают от руки и загружают скан на проверку.
export default function ContractsPage({ token, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useContractT()
  const state = useContracts(token)
  const [signing, setSigning] = useState(null)
  const [preview,setPreview]=useState(null)
  const [offerAccepted, setOfferAccepted] = useState(false)
  const [busy, run] = useBusy()
  const [toastNode, toast] = useToast()

  const openPdf = async (contract) => {
    try {
      const blob = await getContractPdf(token, contract.id)
      if (blob) setPreview(blob)
      else toast(t('Не удалось открыть PDF'))
    } catch (e) { toast(t(contractError(e))) }
  }

  const accept = () =>
    run(async () => {
      try {
        await acceptContractOffer(token)
        toast(t('offer.done'))
        setOfferAccepted(false)
        await state.reload()
      } catch (e) {
        toast(t(contractError(e)))
      }
    })

  let body
  if (state.status === 'loading') body = <p className="mt-muted">{t('loading')}</p>
  else if (state.status === 'unavailable') body = <p className="mt-muted" data-testid="contracts-unavailable">{t('unavailable')}</p>
  else if (!state.items.length) body = <p className="mt-muted">{t('empty')}</p>
  else {
    body = (
      <div className="gp-list" data-testid="contracts">
        {state.items.map((contract) => (
          <article key={contract.id ?? contract.kind} className="mt-card gp-item" data-testid={`contract-${contract.kind}`}>
            <div className="gp-item__main">
              <span className="gp-item__title">{contract.title}</span>
              <span className="gp-item__meta">
                {contract.number ? t('row.number', { number: contract.number }) : ''}
                {contract.clientSignedAt ? ` · ${t('row.signed', { date: formatDate(contract.clientSignedAt, lang) })}` : ''}
              </span>
              <div className="gp-chips">
                <span className={`mt-pill ${pillClass(contract.status)}`}>{t('status.' + contract.status)}</span>
              </div>
              {contract.status === 'UNAVAILABLE' && <span className="gp-field__hint">{t('row.preparing')}</span>}
              {isOffer(contract) && signable(contract) && (
                <label className="mt-row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={offerAccepted} onChange={(e) => setOfferAccepted(e.target.checked)} data-testid="offer-accept" />
                  <span>{t('offer.accept')}</span>
                </label>
              )}
            </div>
            <div className="gp-item__act">
              {isOffer(contract) && signable(contract) && (
                <>
                  <button type="button" className="mt-btn mt-btn--line mt-btn--sm" onClick={() => openPdf(contract)}>{t('row.read')}</button>
                  <button type="button" className="mt-btn" disabled={!offerAccepted || busy} onClick={accept}>{t('offer.button')}</button>
                </>
              )}
              {!isOffer(contract) && contract.id!=null && <button type="button" className="mt-btn" onClick={() => setSigning(contract)}>{t('row.sign')}</button>}
              {contract.id != null && !signable(contract) && <button type="button" className="mt-btn mt-btn--line mt-btn--sm" onClick={() => openPdf(contract)}>{t('row.pdf')}</button>}
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="contracts" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="mt gp">
        <div className="mt-wrap">
          <h1 className="mt-h1">{t('title')}</h1>
          <p className="gp-lead">{t('lead')}</p>
          {body}
        </div>
      </div>
      {signing && (
        <SignDialog
          token={token}
          contract={signing}
          party="STUDENT"
          onClose={() => { setSigning(null); state.reload() }}
          onSigned={() => state.reload()}
        />
      )}
      {toastNode}
      {preview&&<ContractPdfPreview blob={preview} onClose={()=>setPreview(null)}/>}
    </LearningLayout>
  )
}

function pillClass(status) {
  if (status === 'SIGNED') return 'mt-pill--ok'
  if (status === 'PENDING') return 'mt-pill--warn'
  return 'mt-pill--gray'
}

function formatDate(iso, lang) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const locale = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}
