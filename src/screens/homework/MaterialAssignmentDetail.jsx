import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  startMaterialAssignment,
  materialAssignmentRenderUrl,
  uploadMedia,
  attachMaterialAnswer,
  removeMaterialAnswer,
} from '../../api.js'
import { homeworkStateKey, ALLOWED_EXTENSIONS, isAllowedFile } from './homeworkFormat.js'
import { isInteractiveMaterial, isLessonCard, needsAnswerFile, isMaterialGraded } from './materialAssignments.js'
import HomeworkFileList from './HomeworkFileList.jsx'

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')

/**
 * Задание с живого урока, открытое в «Домашней работе».
 *
 * Кнопки «Отправить на проверку» здесь нет: у назначенного материала нет
 * статусной машины домашки — ни сдачи, ни возврата на доработку. Интерактив
 * шлёт ответы сам через bridge-скрипт, а балл ставит преподаватель в админке.
 *
 * А вот ВЛОЖЕНИЕ есть, и только у выданной карточки урока (needsAnswerFile):
 * закрыть её иначе нечем — проверяемых заданий в теории нет, сессии она не
 * заводит, и со сроком по умолчанию такая работа краснела бы просроченной
 * навсегда. Приложенный файл и есть «я сделал».
 */
export default function MaterialAssignmentDetail({ card, token, onOpenCard, onSaved }) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'
  const a = card.assignment
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const stateKey = homeworkStateKey(card)
  const due = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const open = async () => {
    setError(null)
    // Задана одна карточка живого урока — открываем сам урок в кабинете, а не
    // файл в новой вкладке: у карточки бывает аудио с относительным путём и
    // картинки из словарной колоды того же урока, вне урока они не работают.
    if (isLessonCard(a)) {
      onOpenCard?.({ catalogLessonId: a.catalogLessonId, cardId: a.cardId })
      return
    }
    // Обычный файл (PDF/видео/ссылка) открывается как есть. Интерактив идёт
    // через render-эндпоинт: там в страницу внедряется bridge-скрипт, а для
    // материала с проверкой сначала стартует сессия — иначе ответы ученика
    // не дойдут до преподавателя. Повторный старт возвращает ту же сессию.
    if (!isInteractiveMaterial(a)) {
      if (a.fileUrl) window.open(a.fileUrl, '_blank', 'noopener')
      return
    }
    setBusy(true)
    try {
      const session = a.isGraded ? await startMaterialAssignment(token, a.id) : null
      window.open(materialAssignmentRenderUrl(a.materialId, a.id, token, session?.id), '_blank', 'noopener')
    } catch {
      setError(t('homework.openFailed'))
    } finally {
      setBusy(false)
    }
  }

  // Пока работу не проверили, ученик волен доложить и убрать файл. После
  // оценки состав вложений зафиксирован: балл уже стоит под тем, что
  // преподаватель открывал, — то же правило, что и у домашки.
  const attachable = needsAnswerFile(a) && !isMaterialGraded(a) && !busy

  const pickFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    // Инпут очищаем сразу: иначе выбор того же файла второй раз не вызовет
    // change, и повторная попытка после ошибки молча ничего не сделает.
    event.target.value = ''
    if (!files.length) return
    setError(null)

    const wrongFormat = files.find((file) => !isAllowedFile(file.name))
    if (wrongFormat) {
      setError(t('homework.badFormat', { name: wrongFormat.name }))
      return
    }

    setBusy(true)
    try {
      for (const file of files) {
        const { url } = await uploadMedia(token, file)
        if (!url) throw new Error('upload returned no url')
        onSaved?.(await attachMaterialAnswer(token, a.id, file.name, url))
      }
    } catch {
      setError(t('homework.uploadFailed'))
    } finally {
      setBusy(false)
    }
  }

  const removeFile = async (file) => {
    setError(null)
    setBusy(true)
    try {
      onSaved?.(await removeMaterialAnswer(token, a.id, file.id))
    } catch {
      setError(t('homework.removeFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hw-detail">
      <div className="hw-detail__head">
        <h2 className="hw-detail__title">{card.title}</h2>
        <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
      </div>
      <div className="hw-detail__meta">
        <span>{t('homework.lessonTask')}</span>
        {due && <span>{t('homework.due', { date: due })}</span>}
      </div>

      <section className="hw-block">
        <h3 className="hw-block__title">{t('homework.task')}</h3>
        <button type="button" className="hw-submit" disabled={busy} onClick={open}>
          {t('homework.open')}
        </button>
        {error && <p className="hw__error">{error}</p>}
      </section>

      {needsAnswerFile(a) && (
        <section className="hw-block">
          <h3 className="hw-block__title">{t('homework.myAnswer')}</h3>
          {/* Единственный способ закрыть такое задание — приложить файл, и
              сказать об этом надо до того, как ученик начнёт искать кнопку
              «Отправить», которой здесь нет. */}
          <p className="hw__hint">{t('homework.cardAnswerHint')}</p>
          <HomeworkFileList
            files={a.files}
            emptyLabel={t('homework.answerEmpty')}
            onRemove={attachable ? removeFile : undefined}
          />
          {attachable && (
            <div className="hw-upload">
              <input
                id={`hw-upload-material-${a.id}`}
                className="hw-upload__input"
                type="file"
                multiple
                accept={ACCEPT}
                disabled={busy}
                onChange={pickFiles}
              />
              <label className="hw-upload__btn" htmlFor={`hw-upload-material-${a.id}`}>
                {busy ? t('homework.uploading') : t('homework.attach')}
              </label>
              <span className="hw__hint">{t('homework.formats')}</span>
            </div>
          )}
        </section>
      )}

      {(card.grade != null || a.teacherFeedback) && (
        <section className="hw-block hw-block--review">
          <h3 className="hw-block__title">{t(card.grade != null ? 'homework.review' : 'homework.feedback')}</h3>
          {card.grade != null && (
            <div className="hw-grade">
              <span className="hw-grade__num">{card.grade}</span>
              <span className="hw-grade__label">{t('homework.grade')}</span>
            </div>
          )}
          {a.teacherFeedback && <p className="hw-comment">{a.teacherFeedback}</p>}
        </section>
      )}
    </div>
  )
}
