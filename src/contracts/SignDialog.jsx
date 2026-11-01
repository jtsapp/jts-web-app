'use client'
import {useEffect,useState} from 'react'
import {getPaperContract,preparePaperContract,getContractPdf,submitContractScan,getContractScanPdf} from '../api.js'
import {addScanFiles,cleanIin,formFrom,isPdf,missingFields,requestBody} from './contractLogic.js'
import {useContractT,contractError} from './texts.js'
import {MtModal,useBusy} from '../matching/ui.jsx'
import ContractPdfPreview from './ContractPdfPreview.jsx'

export default function SignDialog({token,contract,party,onClose,onSigned}){
  const {t}=useContractT();const [detail,setDetail]=useState(null),[form,setForm]=useState(null),[scan,setScan]=useState(null),[files,setFiles]=useState([]),[confirmed,setConfirmed]=useState(false),[signedOn,setSignedOn]=useState(today),[error,setError]=useState(''),[preview,setPreview]=useState(null);const [busy,run]=useBusy()
  useEffect(()=>{let alive=true;getPaperContract(token,contract.id).then(d=>{if(!alive)return;setDetail(d);setScan(d.scan);setForm({...formFrom(d.prefill,party),tariffVariants:d.tariffVariants||[]});if(d.scan?.signedOn)setSignedOn(d.scan.signedOn)}).catch(e=>alive&&setError(contractError(e)));return()=>{alive=false}},[token,contract.id,party])
  const set=patch=>setForm(old=>({...old,...patch})),missing=form?missingFields(form):['loading'],editable=!!detail?.contract?.canSign&&(detail.contract.status==='PENDING'||detail.contract.status==='SCAN_REJECTED'),prepared=!!detail?.prepared
  const prepare=()=>run(async()=>{setError('');try{const view=await preparePaperContract(token,contract.id,requestBody(form));setDetail(old=>({...old,contract:view,prepared:true}));const blob=await getContractPdf(token,contract.id);if(!blob)throw new Error(t('paper.error'));setPreview(blob)}catch(e){setError(contractError(e))}})
  const choose=e=>{const next=addScanFiles(files,Array.from(e.target.files||[]));setFiles(next.files);setError(next.error);e.target.value=''}
  const upload=()=>run(async()=>{if(!files.length||!confirmed||!signedOn)return;setError('');try{const value=await submitContractScan(token,contract.id,files,signedOn,confirmed);setScan(value);setFiles([]);setDetail(old=>({...old,contract:{...old.contract,status:'SCAN_REVIEW',canSign:false}}));onSigned?.()}catch(e){setError(contractError(e))}})
  const readScan=()=>run(async()=>{try{setPreview(await getContractScanPdf(token,scan.id))}catch(e){setError(contractError(e))}})
  return <MtModal title={t('paper.title')} onClose={onClose} label={contract.title}><div className="mt-stack" data-testid="paper-dialog"><p>{t('paper.steps')}</p>{error&&<div role="alert" className="mt-banner mt-banner--warn">{t(error)}</div>}
    {editable&&form&&<form className="mt-stack" onSubmit={e=>{e.preventDefault();if(!missing.length&&!busy)prepare()}}>
      <Field label={t('form.fullName')} value={form.fullName} onChange={v=>set({fullName:v})}/><Field label={t('form.iin')} value={form.iin} onChange={v=>set({iin:cleanIin(v)})} inputMode="numeric"/><Field label={t('form.phone')} value={form.phone} onChange={v=>set({phone:v})}/>
      {party==='TEACHER'?<><Field label={t('form.email')} value={form.email} onChange={v=>set({email:v})}/><Field label={t('form.idNumber')} value={form.idNumber} onChange={v=>set({idNumber:v})}/><Field label={t('form.idIssuedBy')} value={form.idIssuedBy} onChange={v=>set({idIssuedBy:v})}/><Field type="date" label={t('form.idIssuedAt')} value={form.idIssuedAt} onChange={v=>set({idIssuedAt:v})}/><Field label={t('form.address')} value={form.address} onChange={v=>set({address:v})}/></>:<>
        <label className="gp-field"><span>{t('form.learner')}</span><select className="mt-select" value={form.learner} onChange={e=>set({learner:e.target.value})}>{['SELF','CHILD','OTHER'].map(kind=><option key={kind} value={kind}>{t('form.learner.'+kind)}</option>)}</select></label>
        {form.learner!=='SELF'&&<><Field label={t('form.learnerName')} value={form.learnerName} onChange={v=>set({learnerName:v})}/><Field label={t('form.learnerIin')} value={form.learnerIin} onChange={v=>set({learnerIin:cleanIin(v)})} inputMode="numeric"/></>}
        {!!form.tariffVariants.length&&<label className="gp-field"><span>{t('form.tariffVariant')}</span><select className="mt-select" value={form.tariffVariant} onChange={e=>set({tariffVariant:e.target.value})}><option value="">—</option>{form.tariffVariants.map(v=><option key={v}>{v}</option>)}</select></label>}
        <label className="mt-row"><input type="checkbox" checked={form.photoConsent} onChange={e=>set({photoConsent:e.target.checked})}/>{t('form.photoConsent')}</label>
      </>}
      <label className="mt-row"><input type="checkbox" checked={form.agreed} onChange={e=>set({agreed:e.target.checked})}/>{t('form.agreed')}</label><button type="submit" className="mt-btn" disabled={!!missing.length||busy}>{t('paper.prepare')}</button>
    </form>}
    {editable&&prepared&&<section className="mt-stack"><h3>{t('paper.upload')}</h3><p className="mt-muted">{t('paper.files')}</p><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple onChange={choose} disabled={busy} aria-label={t('paper.upload')}/>{!!files.length&&<ol className="mt-stack" data-testid="scan-files">{files.map((f,i)=><li key={i+f.name} className="mt-row"><span>{f.name}</span><button type="button" className="mt-btn mt-btn--line" disabled={busy} onClick={()=>setFiles(old=>old.filter((_,j)=>j!==i))}>{t('paper.remove')}</button></li>)}</ol>}{!!files.length&&files.length<20&&!isPdf(files[0])&&<p className="mt-muted">{t('paper.more')}</p>}<Field type="date" label={t('paper.signedOn')} value={signedOn} onChange={setSignedOn} max={today()}/><label className="mt-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t('paper.confirm')}</label><button type="button" className="mt-btn" disabled={!files.length||!confirmed||!signedOn||busy} onClick={upload}>{t('paper.submit')}</button></section>}
    {scan&&<section className="mt-card" data-testid="scan-status"><b>{t('scan.'+scan.status)}</b><p>{scan.fileName} · {t('paper.version')} {scan.version}</p>{scan.note&&<p>{scan.note}</p>}{scan.reviewer&&<p>{scan.reviewer}</p>}<button type="button" className="mt-btn mt-btn--line" onClick={readScan}>{t('paper.readScan')}</button></section>}
    <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('form.cancel')}</button>
    {preview&&<ContractPdfPreview blob={preview} name={`${detail?.contract?.number||'contract'}.pdf`} onClose={()=>setPreview(null)}/>}
  </div></MtModal>
}
function Field({label,value,onChange,...props}){return <label className="gp-field"><span className="gp-field__label">{label}</span><input className="mt-input" value={value||''} onChange={e=>onChange(e.target.value)} {...props}/></label>}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
