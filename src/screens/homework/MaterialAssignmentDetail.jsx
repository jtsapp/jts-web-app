import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  uploadMedia,
  attachMaterialAnswer,
  removeMaterialAnswer,
  submitMaterialAssignment,
} from '../../api.js'
import { homeworkStateKey, ALLOWED_EXTENSIONS, isAllowedFile } from './homeworkFormat.js'
import { assignmentScope, needsAnswerFile, isMaterialGraded } from './materialAssignments.js'
import useMaterialOpen from './useMaterialOpen.js'
import HomeworkFileList from './HomeworkFileList.jsx'

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')

/**
 * Задание с живого урока, открытое в «Домашней работе».
 *
 * Цикл тот же, что у обычной домашки, и считает его СЕРВЕР: ASSIGNED → SUBMITTED →
 * (IN_REVIEW) → COMPLETED, а с доработкой — обратно в NEEDS_REVISION и снова на сдачу.
 * Ответы по заданиям уходят сами, мостом из рамки урока; «Сдать» — это отдельное слово
 * ученика «я закончил», без него работа висела бы заданной навсегда.
 *
 * <p>Возвращённая работа открывается там же, где ученик её бросил: ответы прошлой
 * попытки не стираются, он видит свои ошибки и правит их (прежний счёт у преподавателя
 * лежит снимком попытки). «Сдана» и «взята в проверку» для ученика — одно и то же
 * «работа у преподавателя»: делать ему нечего, и разделять их незачем.
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
  // «Открыть задание»: куда ведёт нажатие и рамка — общая логика с частью-
  // материалом внутри ленты домашней работы (HomeworkMaterialPart), см.
  // useMaterialOpen.js. При выборе другой выдачи состояние не сбрасывается
  // здесь — экран монтирует компонент с key по её id (см. HomeworkPage.jsx), и
  // рамка уходит вместе с прежней карточкой.
  const { frameSrc, opening, openError, open, lookingUp } = useMaterialOpen(a, token, onOpenCard)

  const stateKey = homeworkStateKey(card)
  const scope = assignmentScope(a)
  const due = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // Пока работу не проверили, ученик волен доложить и убрать файл. После
  // оценки состав вложений зафиксирован: балл уже стоит под тем, что
  // преподаватель открывал, — то же правило, что и у домашки.
  const attachable = needsAnswerFile(a) && !isMaterialGraded(a) && !busy && !opening

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
            пролистает урок. Правило строки общее с преподавателем (assignmentScope):
            сырой текст выданного блока не показывается никогда. */}
        {scope && <p className="hw-assigned">{scope.key ? t(scope.key) : scope.text}</p>}
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
          // lookingUp — пока ищем урок каталога по ссылке (см. useMaterialOpen):
          // нажатие до ответа увело бы ученика открывать файл, а не урок.
          <button type="button" className="hw-submit" disabled={opening || lookingUp} onClick={open}>
            {opening ? t('homework.opening') : t('homework.open')}
          </button>
        )}
        {(openError || error) && <p className="hw__error">{openError || error}</p>}
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

      {/* Работу вернули: что именно исправить — первое, что ученик должен увидеть,
          поэтому отдельной рамкой и ВЫШЕ кнопки, а не в общем «Отзыве» внизу, где
          она читается как оценка уже закрытой работы. */}
      {a.status === 'NEEDS_REVISION' && (
        <section className="hw-block hw-returned">
          <h3 className="hw-block__title">{t('homework.returnedTitle')}</h3>
          {a.teacherFeedback && <p className="hw-comment">{a.teacherFeedback}</p>}
          <p className="hw__hint">{t('homework.returnedHint')}</p>
        </section>
      )}

      {/* Сдача. Показываем, пока работа у ученика: и в первый раз, и после
          возврата — иначе доработка ни к чему не ведёт. У преподавателя
          (сдана / взята в проверку) и у проверенной сдавать нечего. */}
      {(a.status === 'ASSIGNED' || a.status === 'NEEDS_REVISION') && (
        <section className="hw-block">
          <button type="button" className="hw-submit" disabled={busy} onClick={submit}>
            {busy ? t('homework.submitting')
              : t(a.status === 'NEEDS_REVISION' ? 'homework.resubmitWork' : 'homework.submitWork')}
          </button>
          <p className="hw__hint">{t('homework.submitHint')}</p>
        </section>
      )}
      {/* Взята в проверку — для ученика то же самое «работа у преподавателя»:
          делать ему нечего, и разделять эти два состояния незачем. */}
      {(a.status === 'SUBMITTED' || a.status === 'IN_REVIEW') && (
        <p className="hw__hint">{t('homework.submittedWaiting')}</p>
      )}

      {/* Отзыв проверенной работы. Возвращённую сюда НЕ пускаем: её комментарий —
          это «что исправить», он уже стоит рамкой выше, и вторым разом внизу
          читался бы как оценка закрытой работы. */}
      {a.status !== 'NEEDS_REVISION' && (card.grade != null || a.teacherFeedback) && (
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
