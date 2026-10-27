import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import LearningLayout from '../components/LearningLayout.jsx'
import {
  getCabinetFeedback, getCabinetFeedbackMessages, getCabinetFeedbackTargets, getCabinetFeedbackHistory,
  replyCabinetFeedback, submitCabinetFeedback, uploadCabinetFeedbackFile,
} from '../api.js'
import { feedbackText } from './feedback-translations.js'
import './feedbackCenter.css'

const TYPES = [
  ['GOOD_REVIEW', 'Хороший отзыв о преподавателе', 'like', 'Хороший урок'],
  ['TEACHER_COMPLAINT', 'Жалоба на преподавателя', 'report', 'Другое'],
  ['MANAGER_COMPLAINT', 'Жалоба на менеджера', 'support', 'Другое'],
  ['PLATFORM', 'Жалоба на платформу', 'bug', 'Ошибка сайта или приложения'],
]
const EMPTY = { targets: [], managers: [] }

function Icon({ name, ...props }) {
  const paths = {
    like: <><path d="M7 10v11H3V10h4Zm0 0 5-8c3 0 2 4 1 7h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7" /></>,
    report: <><path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5Z" /><path d="M12 7v6m0 3v1" /></>,
    support: <><path d="M4 15v-3a8 8 0 0 1 16 0v3M4 12H2v6h4v-6Zm16 0h2v6h-4v-6Zm0 6c0 3-4 3-8 3M8 11l2-4m6 4-2-4" /><path d="M9 15h.01M15 15h.01M9 18c2 1 4 1 6 0" /></>,
    bug: <><rect x="7" y="7" width="10" height="14" rx="5" /><path d="m9 7-2-4m8 4 2-4M3 10h4m10 0h4M3 15h4m10 0h4M4 20l4-2m8 0 4 2M10 11h4m-4 4h4" /></>,
    send: <><path d="m3 3 19 9L3 21l4-9-4-9Zm4 9h15" /></>,
    attach: <path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2m-8 14L16 5" />,
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}

function attachments(raw) {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw
    return Array.isArray(list) ? list.map(item => typeof item === 'string' ? { url: item } : item)
      .filter(item => item && /^https?:\/\//i.test(item.url)) : []
  } catch { return [] }
}
function errorText(error) {
  return error?.serverMessage || 'Не удалось выполнить запрос. Попробуйте ещё раз.'
}

export default function FeedbackCenter({ token, onBack, userName, userLevel, onNav, onProfile }) {
  const { lang } = useI18n()
  const tr = (source, params) => feedbackText(lang, source, params)
  const [targets, setTargets] = useState(EMPTY)
  const [targetsLoading, setTargetsLoading] = useState(true)
  const [targetsError, setTargetsError] = useState(false)
  const [items, setItems] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState(false)
  const [threadVersion, setThreadVersion] = useState(0)
  const [type, setType] = useState(null)
  const [chosenTeacherId, setChosenTeacherId] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')
  const [files, setFiles] = useState([])
  const [replyFiles, setReplyFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const mutation = useRef(false)
  const generation = useRef(0)
  const listRequest = useRef(0)
  const heading = useRef(null)
  const selectedItem = items.find(item => item.id === selected)
  const definition = TYPES.find(row => row[0] === type)
  const needsTeacher = type === 'GOOD_REVIEW' || type === 'TEACHER_COMPLAINT'
  const targetOptions = targets.targets || EMPTY.targets
  const preferredTeacher = targets.currentTeacher || (targetOptions.length === 1 ? targetOptions[0] : null)
  const targetUserId = chosenTeacherId || (preferredTeacher ? String(preferredTeacher.id) : '')
  const teacher = targetOptions.find(row => String(row.id) === targetUserId)
  const manager = targets.currentManager || (targets.managers?.length === 1 ? targets.managers[0] : null)
  const locked = busy || uploading
  const statusLabel = (status, item) => item.feedbackType === 'GOOD_REVIEW' ? tr('Доставлено') : tr(({ 'Новая': 'Новое', 'На рассмотрении': 'В работе', 'Передана': 'В работе', 'Решена': 'Решено', 'Отклонена': 'Отклонено', 'Отозвана': 'Отозвано' })[status] || status)
  const date = value => value ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+05:00`).toLocaleString(lang === 'kk' || lang === 'kz' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { timeZone: 'Asia/Almaty' }) : ''

  async function loadTargets(scope = generation.current) {
    setTargetsLoading(true); setTargetsError(false)
    try {
      const data = await getCabinetFeedbackTargets(token)
      if (scope === generation.current) setTargets(data || EMPTY)
    } catch { if (scope === generation.current) setTargetsError(true) }
    finally { if (scope === generation.current) setTargetsLoading(false) }
  }
  async function loadList(scope = generation.current) {
    const request = ++listRequest.current
    const current = () => scope === generation.current && request === listRequest.current
    setListLoading(true); setListError(false)
    try {
      const data = await getCabinetFeedback(token)
      if (current()) setItems(Array.isArray(data) ? data : [])
    } catch { if (current()) setListError(true) }
    finally { if (current()) setListLoading(false) }
  }
  useEffect(() => {
    const scope = ++generation.current
    setTargets(EMPTY); setItems([]); setSelected(null); setType(null)
    setChosenTeacherId(''); setBody(''); setFiles([]); setReply(''); setReplyFiles([]); setError(''); setNotice('')
    void loadTargets(scope); void loadList(scope)
    return () => { generation.current++ }
    // Requests belong to the signed-in session, not to each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    setMessages([]); setHistory([]); setReply(''); setReplyFiles([]); setThreadError(false)
    if (!selected) { setThreadLoading(false); return }
    let alive = true
    setThreadLoading(true)
    Promise.all([getCabinetFeedbackMessages(token, selected), getCabinetFeedbackHistory(token, selected)])
      .then(([rows, events]) => { if (alive) { setMessages(Array.isArray(rows) ? rows : []); setHistory(Array.isArray(events) ? events : []) } })
      .catch(() => { if (alive) setThreadError(true) })
      .finally(() => { if (alive) setThreadLoading(false) })
    return () => { alive = false }
  }, [selected, token, threadVersion])

  useEffect(() => { if (type) heading.current?.focus({ preventScroll: true }) }, [type])

  async function uploadFiles(input, forReply) {
    if (mutation.current) return
    const picked = Array.from(input || [])
    const current = forReply ? replyFiles : files
    const accepted = picked.filter(file => /\.(jpe?g|png|pdf)$/i.test(file.name) && file.size > 0 && file.size <= 10 * 1024 * 1024)
    setError(accepted.length !== picked.length ? 'Разрешены JPG, PNG и PDF размером до 10 МБ каждый.' : '')
    const remain = 5 - current.length
    if (accepted.length > remain) setError('Можно приложить не больше 5 файлов.')
    const queue = accepted.slice(0, Math.max(0, remain))
    if (!queue.length) return
    mutation.current = true; setUploading(true)
    const scope = generation.current
    try {
      for (const file of queue) {
        try {
          const result = await uploadCabinetFeedbackFile(token, file)
          if (!/^https?:\/\//i.test(result?.url || '')) throw new Error('Invalid attachment')
          if (scope === generation.current) (forReply ? setReplyFiles : setFiles)(rows => [...rows, { name: file.name, url: result.url }])
        } catch (err) { if (scope === generation.current) setError(errorText(err)) }
      }
    } finally { mutation.current = false; setUploading(false) }
  }

  async function submit(event) {
    event.preventDefault()
    if (mutation.current || !definition || !body.trim() || needsTeacher && (!targetUserId || targetsLoading || targetsError)) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    const scope = generation.current
    try {
      const created = await submitCabinetFeedback(token, {
        feedbackType: type, targetUserId: needsTeacher ? Number(targetUserId) : type === 'MANAGER_COMPLAINT' ? manager?.id ?? null : null,
        category: definition[3], body: body.trim(), attachmentsJson: files,
      })
      if (scope !== generation.current) return
      listRequest.current++
      setListLoading(false)
      setItems(rows => [created, ...rows.filter(item => item.id !== created.id)])
      setSelected(created.id); setType(null); setBody(''); setFiles([])
      setNotice(type === 'GOOD_REVIEW' ? 'Спасибо! Ваш отзыв отправлен преподавателю.' : 'Обращение отправлено по назначению.')
      // A failed GET must never turn a successful POST into an unsent draft.
      setListError(false)
    } catch (err) { if (scope === generation.current) setError(errorText(err)) }
    finally { mutation.current = false; setBusy(false) }
  }

  async function sendReply(event) {
    event.preventDefault()
    if (mutation.current || !selected || threadLoading || threadError || (!reply.trim() && !replyFiles.length)) return
    mutation.current = true; setBusy(true); setError('')
    const scope = generation.current
    try {
      const message = await replyCabinetFeedback(token, selected, { body: reply.trim(), attachmentsJson: replyFiles })
      if (scope !== generation.current) return
      setReply(''); setReplyFiles([]); setMessages(rows => [...rows, message])
    } catch (err) { if (scope === generation.current) setError(errorText(err)) }
    finally { mutation.current = false; setBusy(false) }
  }

  function changeType(next) {
    if (mutation.current) return
    setType(next); setBody(''); setFiles([]); setError(''); setNotice('')
    setChosenTeacherId('')
  }
  function filePicker(forReply = false) {
    const rows = forReply ? replyFiles : files
    const setter = forReply ? setReplyFiles : setFiles
    return <div className="fc__files">
      <label className="fc__filebtn"><Icon name="attach" width="18" height="18" />{uploading ? tr('Загружаем…') : tr(forReply ? 'Прикрепить файл к ответу' : 'Скриншот или файл')}
        <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" disabled={locked || rows.length >= 5} onChange={e => { void uploadFiles(e.target.files, forReply); e.target.value = '' }} />
      </label>
      <small>{tr('JPG, PNG или PDF · до 10 МБ · до 5 файлов')}</small>
      {rows.map((file, index) => <span className="fc__file" key={`${file.url}-${index}`}><a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a><button type="button" className="fc__remove" disabled={locked} aria-label={tr('Удалить файл {name}', { name: file.name })} onClick={() => setter(current => current.filter((_, i) => i !== index))}>×</button></span>)}
    </div>
  }
  function fileLinks(raw) {
    return attachments(raw).map((file, index) => <a className="fc__attachment" key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noopener noreferrer"><Icon name="attach" width="16" height="16" />{file.name || `${tr('Вложение')} ${index + 1}`}</a>)
  }

  return <LearningLayout userName={userName} userLevel={userLevel} token={token} active="feedback" onNav={onNav} onProfile={onProfile}>
    <div className="fc">
      <header className="fc__head">
        {onBack && <button type="button" className="fc__back" onClick={onBack}>← {tr('Назад')}</button>}
        <h1>Feedback</h1>
        <p>{tr('Выберите, о чём хотите написать. Мы сами передадим обращение тому, кто за это отвечает.')}</p>
      </header>
      <div className="fc__types" aria-label={tr('Тип обратной связи')}>
        {TYPES.map(([key, label, icon]) => <button type="button" key={key} className={`fc__type ${type === key ? 'is-active' : ''} ${key === 'GOOD_REVIEW' ? 'fc__type--positive' : ''}`} aria-pressed={type === key} aria-controls="feedback-form" disabled={locked} onClick={() => changeType(key)}>
          <Icon name={icon} /><span>{tr(label)}</span>
        </button>)}
      </div>
      {error && <div className="fc__error" role="alert">{tr(error)}</div>}
      {notice && <div className="fc__notice" role="status">{tr(notice)}</div>}

      {definition && <section className="fc__panel fc__compose" id="feedback-form" aria-labelledby="feedback-form-title">
        <h2 id="feedback-form-title" ref={heading} tabIndex={-1}>{tr(definition[1])}</h2>
        <form onSubmit={submit} aria-label={tr('Новое обращение')}>
          {needsTeacher && <>
            {targetsLoading ? <p role="status">{tr('Загружаем…')}</p> : targetsError ? <div className="fc__error" role="alert">{tr('Не удалось загрузить преподавателей.')} <button className="fc__textbtn" type="button" onClick={() => loadTargets()}>{tr('Повторить')}</button></div> : targetOptions.length > 1 ? <label>{tr('Преподаватель')}<select required value={targetUserId} onChange={e => setChosenTeacherId(e.target.value)} disabled={locked}><option value="">{tr('Выберите преподавателя')}</option>{targetOptions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label> : <p className="fc__target">{tr('Ваш преподаватель:')} <b>{teacher?.name || tr('Преподаватель пока не назначен')}</b></p>}
          </>}
          {type === 'MANAGER_COMPLAINT' && <p className="fc__target">{tr('Ваш менеджер:')} <b>{manager?.name || tr('Определится по вашему аккаунту')}</b></p>}
          <label>{tr(type === 'GOOD_REVIEW' ? 'Что понравилось?' : 'Что случилось?')} <span className="fc__required">*</span>
            <textarea required rows="4" maxLength={2000} value={body} disabled={locked} onChange={e => setBody(e.target.value)} placeholder={tr('Напишите пару предложений')} />
            <small>{body.length}/2000</small>
          </label>
          {filePicker()}
          <div className="fc__actions"><button className="fc__submit" type="submit" disabled={locked || !body.trim() || needsTeacher && (!targetUserId || targetsLoading || targetsError)}><Icon name="send" width="18" height="18" />{busy ? tr('Отправляем…') : tr('Отправить')}</button><button className="fc__cancel" type="button" disabled={locked} onClick={() => changeType(null)}>{tr('Отмена')}</button></div>
        </form>
      </section>}

      {(items.length > 0 || listLoading || listError) && <section className="fc__panel fc__inbox" aria-labelledby="feedback-inbox-title">
        <div className="fc__panelhead"><h2 id="feedback-inbox-title">{tr('Мои обращения')}</h2><button className="fc__textbtn" type="button" disabled={listLoading || locked} onClick={() => loadList()}>{tr('Обновить')}</button></div>
        {listLoading && <p role="status">{tr('Загружаем…')}</p>}
        {listError && <p className="fc__error" role="alert">{tr('Не удалось загрузить обращения.')} <button className="fc__textbtn" type="button" onClick={() => loadList()}>{tr('Повторить')}</button></p>}
        <div className="fc__cases">{items.map(item => <button type="button" key={item.id} disabled={locked} aria-pressed={selected === item.id} className={`fc__case ${selected === item.id ? 'is-active' : ''}`} onClick={() => { setSelected(item.id); setError('') }}>
          <span className="fc__casehead"><b>{tr(TYPES.find(row => row[0] === item.feedbackType)?.[1] || item.category)}</b><span className={`fc__status ${item.status === 'Решена' ? 'fc__status--done' : ''}`}>{statusLabel(item.status, item)}</span></span>
          <time>{date(item.createdAt)}</time><small>{item.body}</small>
        </button>)}</div>
        {selectedItem && <div className="fc__thread" aria-busy={threadLoading}>
          <h3>{tr('Переписка')} · №{selectedItem.id}</h3>
          {threadLoading && <p role="status">{tr('Загружаем…')}</p>}
          {threadError && <p className="fc__error" role="alert">{tr('Не удалось загрузить переписку.')} <button className="fc__textbtn" type="button" onClick={() => setThreadVersion(value => value + 1)}>{tr('Повторить')}</button></p>}
          {!threadLoading && !threadError && <>
            {(messages.length ? messages : [{ ...selectedItem, id: 'original', authorName: userName }]).map(message => <article className="fc__message" key={message.id}><div className="fc__messagehead"><b>{message.authorName}</b><time>{date(message.createdAt)}</time></div><p>{message.body}</p>{fileLinks(message.attachmentsJson)}</article>)}
            {selectedItem.decisionComment && <aside className="fc__decision"><b>{tr('Решение по обращению')}</b><p>{selectedItem.decisionComment}</p></aside>}
            {history.length > 0 && <details className="fc__history"><summary>{tr('История и решения')}</summary>{history.map(event => <article key={event.id}><time>{date(event.createdAt)}</time><b>{event.fromStatus && `${statusLabel(event.fromStatus, selectedItem)} → `}{statusLabel(event.toStatus, selectedItem)}</b>{event.comment && <p>{event.comment}</p>}</article>)}</details>}
            {selectedItem.status !== 'Отозвана' && <form onSubmit={sendReply} className="fc__reply" aria-label={tr('Ответить')}>
              <label>{tr('Сообщение в переписку')}<textarea rows="3" maxLength={2000} value={reply} disabled={locked} onChange={e => setReply(e.target.value)} placeholder={tr('Сообщение в переписку')} /></label>
              {filePicker(true)}
              <button className="fc__submit" type="submit" disabled={locked || (!reply.trim() && !replyFiles.length)}>{busy ? tr('Отправляем…') : tr('Ответить')}</button>
            </form>}
          </>}
        </div>}
      </section>}
    </div>
  </LearningLayout>
}
