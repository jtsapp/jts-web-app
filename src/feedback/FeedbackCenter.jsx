import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import {
  getCabinetFeedback, getCabinetFeedbackMessages, getCabinetFeedbackTargets,
  replyCabinetFeedback, submitCabinetFeedback, uploadCabinetFeedbackFile,
} from '../api.js'
import './feedbackCenter.css'

const TYPES = [
  ['GOOD_REVIEW', 'Хороший отзыв преподавателю'],
  ['TEACHER_COMPLAINT', 'Жалоба на преподавателя'],
  ['MANAGER_COMPLAINT', 'Обращение к менеджеру'],
  ['PLATFORM', 'Проблема с платформой'],
]
const CATEGORIES = {
  GOOD_REVIEW: ['Хороший урок', 'Поддержка преподавателя', 'Понятное объяснение'],
  TEACHER_COMPLAINT: ['Качество занятия', 'Расписание и опоздание', 'Коммуникация', 'Другое'],
  MANAGER_COMPLAINT: ['Коммуникация', 'Организация обучения', 'Другое'],
  PLATFORM: ['Ошибка сайта или приложения', 'Проблема с уроком', 'Другое'],
}

function attachments(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}

function errorText(error) {
  return error?.serverMessage || error?.message || 'Не удалось выполнить запрос. Попробуйте ещё раз.'
}

export default function FeedbackCenter({ token, onBack }) {
  const { lang } = useI18n()
  const [targets, setTargets] = useState({ targets: [], managers: [] })
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [type, setType] = useState('GOOD_REVIEW')
  const [targetUserId, setTargetUserId] = useState('')
  const [category, setCategory] = useState(CATEGORIES.GOOD_REVIEW[0])
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const ru = lang !== 'en' && lang !== 'kk'
  const categories = CATEGORIES[type]
  const needsTeacher = type === 'GOOD_REVIEW' || type === 'TEACHER_COMPLAINT'
  const targetOptions = targets.targets || []
  const selectedName = useMemo(() => items.find(item => item.id === selected)?.category || '', [items, selected])

  const refresh = async () => {
    const [targetData, feedback] = await Promise.all([getCabinetFeedbackTargets(token), getCabinetFeedback(token)])
    setTargets(targetData || { targets: [], managers: [] })
    setItems(Array.isArray(feedback) ? feedback : [])
  }

  useEffect(() => {
    let alive = true
    Promise.all([getCabinetFeedbackTargets(token), getCabinetFeedback(token)])
      .then(([targetData, feedback]) => {
        if (!alive) return
        setTargets(targetData || { targets: [], managers: [] })
        setItems(Array.isArray(feedback) ? feedback : [])
      })
      .catch(err => { if (alive) setError(errorText(err)) })
    return () => { alive = false }
  }, [token])

  useEffect(() => {
    if (!selected) { setMessages([]); return undefined }
    let alive = true
    getCabinetFeedbackMessages(token, selected)
      .then(rows => { if (alive) setMessages(Array.isArray(rows) ? rows : []) })
      .catch(err => { if (alive) setError(errorText(err)) })
    return () => { alive = false }
  }, [selected, token])

  async function uploadFiles(input) {
    const picked = Array.from(input || [])
    const accepted = picked.filter(file => /\.(jpe?g|png|pdf)$/i.test(file.name) && file.size <= 10 * 1024 * 1024)
    if (accepted.length !== picked.length) setError('Разрешены JPG, PNG и PDF размером до 10 МБ каждый.')
    const remain = 5 - files.length
    if (accepted.length > remain) setError('Можно приложить не больше 5 файлов.')
    const queue = accepted.slice(0, Math.max(0, remain))
    if (!queue.length) return
    const uploaded = []
    setUploading(true)
    try {
      for (const file of queue) {
        try {
          const result = await uploadCabinetFeedbackFile(token, file)
          uploaded.push({ name: file.name, url: result.url })
        } catch (err) { setError(errorText(err)) }
      }
      setFiles(current => [...current, ...uploaded])
    } finally { setUploading(false) }
  }

  async function submit(event) {
    event.preventDefault()
    if (!body.trim() || (needsTeacher && !targetUserId)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const created = await submitCabinetFeedback(token, {
        feedbackType: type, targetUserId: targetUserId ? Number(targetUserId) : null,
        category, body, attachmentsJson: files,
      })
      await refresh()
      setSelected(created.id); setBody(''); setFiles([])
      setNotice(type === 'GOOD_REVIEW' ? 'Отзыв отправлен преподавателю. Начисление токенов выполнено автоматически, если лимит за месяц ещё не использован.' : 'Обращение отправлено по назначению.')
    } catch (err) { setError(errorText(err)) }
    finally { setBusy(false) }
  }

  async function sendReply(event) {
    event.preventDefault()
    if (!selected || (!reply.trim() && !files.length)) return
    setBusy(true); setError('')
    try {
      await replyCabinetFeedback(token, selected, { body: reply, attachmentsJson: files })
      setReply(''); setFiles([])
      setMessages(await getCabinetFeedbackMessages(token, selected))
    } catch (err) { setError(errorText(err)) }
    finally { setBusy(false) }
  }

  function changeType(next) {
    setType(next); setCategory(CATEGORIES[next][0]); setTargetUserId(''); setError('')
  }

  return (
    <main className="fc">
      <header className="fc__head">
        <button type="button" className="fc__back" onClick={onBack}>← {ru ? 'Назад' : 'Back'}</button>
        <h1>{ru ? 'Обратная связь' : 'Feedback'}</h1>
        <p>{ru ? 'Отзыв или обращение попадёт нужной команде. Адресат определяется автоматически.' : 'Your message is routed to the right team automatically.'}</p>
      </header>
      {error && <div className="fc__error" role="alert">{error}</div>}
      {notice && <div className="fc__notice" role="status">{notice}</div>}

      <section className="fc__panel">
        <h2>{ru ? 'Новое обращение' : 'New message'}</h2>
        <form onSubmit={submit}>
          <label>{ru ? 'Тип' : 'Type'}
            <select value={type} onChange={e => changeType(e.target.value)}>{TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          </label>
          {needsTeacher && <label>{ru ? 'Преподаватель' : 'Teacher'}
            <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)}><option value="">{ru ? 'Выберите преподавателя' : 'Select a teacher'}</option>{targetOptions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </label>}
          <label>{ru ? 'Тема' : 'Topic'}
            <select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label>{ru ? 'Сообщение' : 'Message'}
            <textarea rows="4" maxLength={2000} value={body} onChange={e => setBody(e.target.value)} placeholder={ru ? 'Опишите ситуацию или отзыв' : 'Describe your message'} />
            <small>{body.length}/2000</small>
          </label>
          <div className="fc__files">
            <label className="fc__filebtn">{uploading ? (ru ? 'Загружаем…' : 'Uploading…') : ru ? 'Прикрепить JPG, PNG или PDF' : 'Attach JPG, PNG or PDF'}<input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" disabled={uploading} onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} /></label>
            {files.map((file, index) => <span key={`${file.url}-${index}`}>{file.name}<button type="button" onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>×</button></span>)}
          </div>
          <button className="fc__submit" type="submit" disabled={busy || uploading || !body.trim() || (needsTeacher && !targetUserId)}>{busy ? '…' : ru ? 'Отправить' : 'Send'}</button>
        </form>
      </section>

      <section className="fc__panel">
        <h2>{ru ? 'Мои обращения' : 'My messages'}</h2>
        <div className="fc__cases">
          <button type="button" className={`fc__case ${selected == null ? 'is-active' : ''}`} onClick={() => setSelected(null)}>
            {ru ? 'Выберите обращение, чтобы открыть переписку' : 'Select a message to view the conversation'}
          </button>
          {items.map(item => <button type="button" key={item.id} className={`fc__case ${selected === item.id ? 'is-active' : ''}`} onClick={() => setSelected(item.id)}>
            <b>{item.category}</b><span>{item.status} · {new Date(item.createdAt).toLocaleDateString()}</span><small>{item.body}</small>
          </button>)}
        </div>
        {selected && <div className="fc__thread">
          <h3>{selectedName || (ru ? 'Переписка' : 'Conversation')}</h3>
          {messages.map(message => <article className="fc__message" key={message.id}><b>{message.authorName}</b><time>{new Date(message.createdAt).toLocaleString()}</time><p>{message.body}</p>{attachments(message.attachmentsJson).map((url, index) => <a key={`${url}-${index}`} href={typeof url === 'string' ? url : url.url} target="_blank" rel="noopener">{typeof url === 'string' ? `Вложение ${index + 1}` : url.name || `Вложение ${index + 1}`}</a>)}</article>)}
          <form onSubmit={sendReply} className="fc__reply">
            <textarea rows="3" maxLength={2000} value={reply} onChange={e => setReply(e.target.value)} placeholder={ru ? 'Сообщение в переписку' : 'Reply'} />
            <label className="fc__filebtn">{uploading ? (ru ? 'Загружаем…' : 'Uploading…') : ru ? 'Прикрепить файл к ответу' : 'Attach to reply'}<input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" disabled={uploading} onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} /></label>
            {files.map((file, index) => <span key={`reply-${file.url}-${index}`}>{file.name}<button type="button" onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>×</button></span>)}
            <button className="fc__reply-submit" type="submit" disabled={busy || uploading || (!reply.trim() && !files.length)}>{ru ? 'Ответить' : 'Reply'}</button>
          </form>
        </div>}
      </section>
    </main>
  )
}
