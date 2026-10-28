'use client'
import {useEffect,useState} from 'react'
import {MtModal} from '../matching/ui.jsx'
import {useContractT} from './texts.js'

export default function ContractPdfPreview({blob,name='contract.pdf',onClose}){
  const {t}=useContractT();const [url,setUrl]=useState('')
  useEffect(()=>{const value=URL.createObjectURL(blob);setUrl(value);return()=>URL.revokeObjectURL(value)},[blob])
  return <MtModal title={name} onClose={onClose}><div className="mt-row" style={{gap:12}}><button type="button" className="mt-btn mt-btn--line" onClick={onClose}>← {t('paper.back')}</button><a className="mt-btn" href={url} download={name}>{t('row.pdf')}</a></div>{url&&<iframe src={url} title={name} style={{width:'100%',height:'70vh',border:0,marginTop:12}}/>}</MtModal>
}
