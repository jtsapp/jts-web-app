import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { publishBirgePost, uploadBirgeMedia } from './birgeApi.js'
import { DEFAULT_TOPIC, TOPICS } from './labels.js'
import {
  TEXT_MAX,
  canAddPart,
  canPublish,
  counter,
  emptyDraft,
  fullText,
  insertAt,
  photoSlots,
  photosUploading,
  publishBody,
  tooShort,
} from './draft.js'
import { readRecent, rememberEmoji } from './emoji.js'
import { PHOTO_ACCEPT, shrinkPhoto } from './photo.js'
import { STEP_MS, checkSteps, stepStates } from './steps.js'
import { failureOutcome, publishOutcome, retryMinutes } from './outcome.js'
import { highlightParts } from './highlight.js'
import EmojiPanel from './EmojiPanel.jsx'
import { PhotoIcon, SmileIcon } from './icons.jsx'

const PHOTO_ERROR = {
  too_big: 'birge.photo.tooBig',
  not_image: 'birge.photo.notImage',
  heic: 'birge.photo.heic',
  decode: 'birge.photo.decode',
}

function initialOf(name) {
  const s = (name || '').trim()
  return s ? Array.from(s)[0].toUpperCase() : '?'
}

// Автовысота поля, как в прототипе: высота по содержимому. scrollHeight 0 бывает у скрытого поля — тогда не трогаем,
// иначе поле схлопнулось бы в ноль.
function grow(el) {
  if (!el) return
  el.style.height = 'auto'
  if (el.scrollHeight) el.style.height = `${el.scrollHeight}px`
}

function Counter({ text }) {
  const c = counter(text)
  return c.show ? <span className={`brg-cnt${c.over ? ' is-over' : ''}`}>{c.len}/{TEXT_MAX}</span> : null
}

function Outcome({ outcome, copy, onOpenFeedback }) {
  const { t } = useI18n()
  const parts = outcome.hits.length && copy ? highlightParts(copy, outcome.hits) : []
  return (
    <div className={`brg-res brg-res--${outcome.tone}`} role="status">
      <b>{t(outcome.titleKey)}</b>
      {outcome.reasons.length > 0 && (
        <p>{t('birge.res.rejected.reasons', { reasons: outcome.reasons.map((key) => t(key)).join(', '), risk: outcome.risk ?? '—' })}</p>
      )}
      {parts.length > 0 && (
        <p className="brg-res__copy">
          {parts.map((part, i) => (part.mark ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
        </p>
      )}
      <p>{outcome.message ?? t(outcome.textKey, outcome.vars)}</p>
      {outcome.feedback && onOpenFeedback && (
        <button type="button" className="brg-link" onClick={() => onOpenFeedback(outcome.feedbackId)}>
          {t('birge.res.feedback.open')}
        </button>
      )}
    </div>
  )
}

/**
 * Форма «Новая ветка» (kind="thread") и ответа в ветке (kind="comment") — один редактор, как в прототипе; у ответа
 * нет темы и продолжений. Фото пережимается и уходит на проверку сразу при выборе (§3.1); пока запрос публикации
 * идёт — шаги проверки, затем итог по таблице §3.3 (outcome.js).
 */
export default function Composer({ kind = 'thread', token, authorName, parentId = null, onPublished, onOpenFeedback }) {
  const { t } = useI18n()
  const thread = kind === 'thread'
  const [draft, setDraft] = useState(emptyDraft)
  const [topic, setTopic] = useState(DEFAULT_TOPIC)
  // Последняя позиция курсора: field -1 — основное поле, 0..3 — продолжение. Смайлик встаёт сюда.
  const [caret, setCaret] = useState({ field: -1, pos: null })
  const [pop, setPop] = useState(false)
  const [recent, setRecent] = useState(() => readRecent())
  // Ошибка фото — ключ словаря и подстановки: у 429 в тексте минуты ожидания.
  const [photoError, setPhotoError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [steps, setSteps] = useState(null)
  const [tick, setTick] = useState(0)
  const [finished, setFinished] = useState(false)
  const [outcome, setOutcome] = useState(null)
  // Копия отправленного текста для подсветки отказа: поле к тому времени ученик мог уже начать править.
  const [copy, setCopy] = useState('')
  const mainRef = useRef(null)
  const partRefs = useRef([])
  const focusPart = useRef(null)
  const seq = useRef(0)
  const shrinking = useRef(0)
  const previews = useRef(new Set())

  // Превью фото — объектные URL; уходя с экрана, отпускаем их, иначе картинки висят в памяти вкладки.
  useEffect(() => {
    const urls = previews.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  useLayoutEffect(() => {
    partRefs.current.length = draft.parts.length
    grow(mainRef.current)
    partRefs.current.forEach(grow)
  }, [draft.text, draft.parts])

  // «Дополните ветку» сразу ставит курсор в новое продолжение — как в прототипе.
  useEffect(() => {
    if (focusPart.current == null) return
    partRefs.current[focusPart.current]?.focus()
    focusPart.current = null
  }, [draft.parts.length])

  // Шаги тикают, пока ждём ответа (прототип: по 550 мс на шаг).
  useEffect(() => {
    if (!busy || finished) return undefined
    const id = setInterval(() => setTick((n) => n + 1), STEP_MS)
    return () => clearInterval(id)
  }, [busy, finished])

  const setField = (field, value) =>
    setDraft((d) => (field < 0 ? { ...d, text: value } : { ...d, parts: d.parts.map((p, i) => (i === field ? value : p)) }))
  const track = (field) => (e) => setCaret({ field, pos: e.target.selectionStart })

  function pickEmoji(emoji) {
    const field = caret.field >= 0 && caret.field < draft.parts.length ? caret.field : -1
    const current = field < 0 ? draft.text : draft.parts[field]
    const next = insertAt(current, field === caret.field ? caret.pos : null, emoji)
    if (!next) return
    setField(field, next.text)
    setCaret({ field, pos: next.pos })
    setRecent(rememberEmoji(emoji, recent))
  }

  function forget(url) {
    URL.revokeObjectURL(url)
    previews.current.delete(url)
  }

  function dropPhoto(key, preview) {
    forget(preview)
    setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p.key !== key) }))
  }

  async function addPhotos(files) {
    setPhotoError(null)
    // Фото, которые ещё пережимаются, места не заняли, но займут — иначе два быстрых выбора дали бы пятое фото.
    const room = photoSlots(draft) - shrinking.current
    if (files.length > room) setPhotoError({ key: 'birge.photo.tooMany' })
    for (const file of files.slice(0, Math.max(0, room))) {
      shrinking.current += 1
      let shrunk
      try {
        shrunk = await shrinkPhoto(file)
      } catch (err) {
        setPhotoError({ key: PHOTO_ERROR[err?.code] || 'birge.photo.decode' })
        continue
      } finally {
        shrinking.current -= 1
      }
      seq.current += 1
      const key = `p${seq.current}`
      const preview = URL.createObjectURL(shrunk.blob)
      previews.current.add(preview)
      setDraft((d) => ({ ...d, photos: [...d.photos, { key, preview, status: 'uploading', id: null }] }))
      // Фото уходит на проверку сразу (§3.1): пока ученик дописывает текст, сервер его уже посмотрел.
      uploadBirgeMedia(token, shrunk.blob, 'photo.jpg')
        .then((res) => {
          if (res?.id == null) throw new Error('нет id вложения')
          setDraft((d) => ({ ...d, photos: d.photos.map((p) => (p.key === key ? { ...p, status: 'ready', id: res.id } : p)) }))
        })
        .catch((err) => {
          // Загрузки фото — под тем же антиспамом, что публикации (§3.7): на 429 — «через N мин», а не «не удалось».
          setPhotoError(
            err?.status === 429 ? { key: 'birge.res.rateLimit', vars: { n: retryMinutes(err) } } : { key: 'birge.photo.uploadFailed' },
          )
          dropPhoto(key, preview)
        })
    }
  }

  function addPart() {
    if (!canAddPart(draft)) return
    focusPart.current = draft.parts.length
    setDraft((d) => ({ ...d, parts: [...d.parts, ''] }))
  }

  function removePart(i) {
    setDraft((d) => ({ ...d, parts: d.parts.filter((_, j) => j !== i) }))
    setCaret({ field: -1, pos: null })
  }

  async function publish() {
    if (busy || !canPublish(draft, kind)) return
    const sent = draft
    setPop(false)
    setBusy(true)
    setFinished(false)
    setTick(0)
    setOutcome(null)
    setSteps(checkSteps(sent.photos.length))
    setCopy(thread ? fullText(sent) : sent.text.trim())
    let result
    try {
      result = publishOutcome(await publishBirgePost(token, publishBody(sent, { kind, topic, parentId })))
    } catch (err) {
      result = failureOutcome(err)
      // Ответа с решением нет — проверки не было, и шаги «проверено» врали бы.
      setSteps(null)
    }
    setFinished(true)
    setOutcome(result)
    setBusy(false)
    // После отказа фото годятся для повтора (вложения отклонённого поста сервер переносит); убираем только удалённые
    // проверкой (removedMediaIds).
    const removed = new Set(result.removedMediaIds)
    const gone = result.clear ? sent.photos : sent.photos.filter((p) => removed.has(p.id))
    gone.forEach((p) => forget(p.preview))
    if (result.clear) {
      setDraft(emptyDraft())
      setCaret({ field: -1, pos: null })
    } else if (gone.length) {
      setDraft((d) => ({ ...d, photos: d.photos.filter((p) => !removed.has(p.id)) }))
    }
    if (result.post) onPublished?.(result.post)
  }

  const states = steps ? stepStates(steps.length, tick, finished) : []
  const initial = initialOf(authorName)
  const placeholder = t(thread ? 'birge.compose.placeholder' : 'birge.compose.replyPlaceholder')
  const noPhotoRoom = busy || photoSlots(draft) === 0

  return (
    <section className={`brg-card brg-composer${thread ? '' : ' brg-composer--reply'}`}>
      <div className="brg-cw">
        <div className="brg-cl" aria-hidden="true">
          <span className="brg-av">{initial}</span>
          {thread && (
            <>
              <span className="brg-vline" />
              <span className="brg-av brg-av--xs">{initial}</span>
            </>
          )}
        </div>
        <div className="brg-cr">
          <div className="brg-who">
            <b>{authorName}</b>
            {thread && (
              <>
                <span className="brg-who__sep" aria-hidden="true">
                  ›
                </span>
                <select aria-label={t('birge.compose.topic')} value={topic} disabled={busy} onChange={(e) => setTopic(e.target.value)}>
                  {TOPICS.map((key) => (
                    <option key={key} value={key}>
                      {t(`birge.topic.${key}`)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="brg-field">
            <textarea
              ref={mainRef}
              rows={1}
              maxLength={TEXT_MAX}
              value={draft.text}
              readOnly={busy}
              placeholder={placeholder}
              aria-label={placeholder}
              onChange={(e) => {
                setField(-1, e.target.value)
                track(-1)(e)
              }}
              onClick={track(-1)}
              onKeyUp={track(-1)}
              onFocus={() => setPop(false)}
            />
            <Counter text={draft.text} />
          </div>
          {draft.photos.length > 0 && (
            <div className="brg-mrow">
              {draft.photos.map((p, i) => (
                <div key={p.key} className={`brg-mitem${p.status === 'uploading' ? ' is-loading' : ''}`}>
                  <img src={p.preview} alt={t('birge.card.photo', { n: i + 1 })} />
                  <button type="button" className="brg-x" aria-label={t('birge.compose.removePhoto')} disabled={busy} onClick={() => dropPhoto(p.key, p.preview)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="brg-tools">
            <label className={`brg-tool${noPhotoRoom ? ' is-off' : ''}`} title={t('birge.compose.photo')}>
              <PhotoIcon />
              <input
                type="file"
                hidden
                multiple
                accept={PHOTO_ACCEPT}
                aria-label={t('birge.compose.photo')}
                disabled={noPhotoRoom}
                onChange={(e) => {
                  // Список копируем до сброса value: сброс нужен, чтобы то же фото можно было выбрать снова.
                  const files = Array.from(e.target.files || [])
                  e.target.value = ''
                  addPhotos(files)
                }}
              />
            </label>
            <button
              type="button"
              className={`brg-tool${pop ? ' is-on' : ''}`}
              title={t('birge.compose.emoji')}
              aria-label={t('birge.compose.emoji')}
              aria-expanded={pop}
              disabled={busy}
              onClick={() => setPop((v) => !v)}
            >
              <SmileIcon />
            </button>
            {pop && <EmojiPanel recent={recent} onPick={pickEmoji} onClose={() => setPop(false)} />}
          </div>
          {photoError && (
            <p className="brg-error" role="alert">
              {t(photoError.key, photoError.vars)}
            </p>
          )}
          {thread &&
            draft.parts.map((value, i) => (
              <div className="brg-part" key={i}>
                <textarea
                  ref={(el) => {
                    partRefs.current[i] = el
                  }}
                  rows={1}
                  maxLength={TEXT_MAX}
                  value={value}
                  readOnly={busy}
                  placeholder={t('birge.compose.partPlaceholder')}
                  aria-label={t('birge.compose.partPlaceholder')}
                  onChange={(e) => {
                    setField(i, e.target.value)
                    track(i)(e)
                  }}
                  onClick={track(i)}
                  onKeyUp={track(i)}
                  onFocus={() => setPop(false)}
                />
                <Counter text={value} />
                <button type="button" className="brg-x brg-x--soft" aria-label={t('birge.compose.removePart')} disabled={busy} onClick={() => removePart(i)}>
                  ×
                </button>
              </div>
            ))}
          {thread && canAddPart(draft) && (
            <button type="button" className="brg-addpart" disabled={busy} onClick={addPart}>
              {t('birge.compose.addPart')}
            </button>
          )}
        </div>
      </div>
      <div className="brg-foot">
        <span className="brg-hint">
          {tooShort(draft, kind)
            ? t('birge.compose.tooShort')
            : photosUploading(draft)
              ? t('birge.compose.uploading')
              : t('birge.compose.hint')}
        </span>
        <button type="button" className="brg-btn" disabled={busy || !canPublish(draft, kind)} onClick={publish}>
          {t('birge.compose.publish')}
        </button>
      </div>
      {(steps || outcome) && (
        <div className="brg-pipe" aria-live="polite">
          {steps?.map((step, i) => (
            <div key={step.id} className={`brg-step brg-step--${states[i]}`}>
              <span className="brg-step__d" aria-hidden="true" />
              {t(step.key, step.vars)}
            </div>
          ))}
          {outcome && <Outcome outcome={outcome} copy={copy} onOpenFeedback={onOpenFeedback} />}
        </div>
      )}
    </section>
  )
}
