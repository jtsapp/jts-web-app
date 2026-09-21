import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  startMaterialAssignment,
  materialAssignmentRenderUrl,
  uploadMedia,
  attachMaterialAnswer,
  removeMaterialAnswer,
  submitMaterialAssignment,
} from '../../api.js'
import { homeworkStateKey, ALLOWED_EXTENSIONS, isAllowedFile } from './homeworkFormat.js'
import { isInteractiveMaterial, isLessonCard, needsAnswerFile, isMaterialGraded } from './materialAssignments.js'
import HomeworkFileList from './HomeworkFileList.jsx'

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')

/**
 * Задание с живого урока, открытое в «Домашней работе».
 *
 * Сдача у выданной работы ЕСТЬ (ASSIGNED → SUBMITTED → COMPLETED, считает сервер), но
 * возврата на доработку нет: повторной попытки и версий ответа у материала не бывает —
 * преподаватель ставит балл и комментарий. Ответы по заданиям уходят сами, мостом из
 * рамки урока; «Сдать» — это отдельное слово ученика «я закончил», без него работа
 * висела бы заданной навсегда.
 *
 * А ВЛОЖЕНИЕ есть только у выданной карточки урока (needsAnswerFile):
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
  // Адрес встроенной рамки — null, пока ученик не открыл задание. Держим именно
  // адрес, а не флаг: у материала с проверкой в него входит id стартованной
  // сессии, и пересобрать его из пропсов потом нечем. При выборе другой выдачи
  // состояние не сбрасывается здесь — экран монтирует компонент с key по её id
  // (см. HomeworkPage.jsx), и рамка уходит вместе с прежней карточкой.
  const [frameSrc, setFrameSrc] = useState(null)

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
    // Обычный файл (PDF/видео/ссылка) открывается как есть: встроить чужую
    // ссылку нельзя — X-Frame-Options чужого сайта отдаст пустую рамку.
    if (!isInteractiveMaterial(a)) {
      if (a.fileUrl) window.open(a.fileUrl, '_blank', 'noopener')
      return
    }
    // Интерактив — ПРЯМО ЗДЕСЬ, рамкой на этой же странице, а не новой вкладкой:
    // домашнюю работу ученик должен делать в своём кабинете. Render-эндпоинт под
    // это и сделан (см. его javadoc: «for display inside an iframe», и токен там
    // принимается запросом именно потому, что обычный GET рамки заголовков не
    // несёт), а мост внутри уже умеет и сохранять ответы, и показывать выданный
    // блок. Для материала с проверкой сначала стартует сессия — иначе ответы не
    // дойдут до преподавателя; повторный старт возвращает ту же.
    setBusy(true)
    try {
      const session = a.isGraded ? await startMaterialAssignment(token, a.id) : null
      setFrameSrc(materialAssignmentRenderUrl(a.materialId, a.id, token, session?.id))
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

  /**
   * «Сдать работу» — ученик говорит, что закончил.
   *
   * <p>Можно ли сдавать (решено ли хоть что-то из заданного), решает сервер: здесь
   * нельзя даже узнать, какие задания ему выдали и что он в них натыкал — ответы
   * живут в рамке урока, а не на этом экране.
   */
  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      onSaved?.(await submitMaterialAssignment(token, a.id))
    } catch (e) {
      // 400 у этой ручки один: сдавать нечего. Текст сюда не доезжает (authPost
      // тело отказа не разбирает), поэтому подписываем по коду — решает по-прежнему
      // сервер, здесь только перевод его «нет» на человеческий.
      setError(t(e?.status === 400 ? 'homework.submitNothingDone' : 'homework.submitWorkFailed'))
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
        {/* Что именно задали. Без этой строки на экране одна кнопка: заголовок —
            название материала ЦЕЛИКОМ, а задают из него обычно один блок или одну
            стадию, и ученику неоткуда узнать какой, пока он не откроет и не
            пролистает урок. Ту же строку видит преподаватель в форме оценки. */}
        {a.stageTitlesSnapshot && <p className="hw-assigned">{a.stageTitlesSnapshot}</p>}
        {frameSrc ? (
          <div className="hw-frame">
            {/* allow="autoplay" — по той же причине, что и у рамки живого урока:
                разрешение выдаётся документу, а материал живёт в своём iframe;
                у заданий на слух без этого молчала бы запись. */}
            <iframe
              src={frameSrc}
              title={card.title}
              className="hw-frame__iframe"
              allow="autoplay"
            />
            {/* Урок — страница со своими стадиями, и в колонке кабинета ему тесно.
                Кому нужно во всю ширину — прежний путь никуда не делся. */}
            <a className="hw-frame__full" href={frameSrc} target="_blank" rel="noopener noreferrer">
              {t('homework.openFullScreen')}
            </a>
          </div>
        ) : (
          <button type="button" className="hw-submit" disabled={busy} onClick={open}>
            {busy ? t('homework.opening') : t('homework.open')}
          </button>
        )}
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

      {/* Сдача. Показываем, пока работа у ученика: сданную и проверённую сдавать
          заново нечем — попытка у материала одна (см. javadoc компонента). */}
      {a.status === 'ASSIGNED' && (
        <section className="hw-block">
          <button type="button" className="hw-submit" disabled={busy} onClick={submit}>
            {busy ? t('homework.submitting') : t('homework.submitWork')}
          </button>
          <p className="hw__hint">{t('homework.submitHint')}</p>
        </section>
      )}
      {a.status === 'SUBMITTED' && (
        <p className="hw__hint">{t('homework.submittedWaiting')}</p>
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
