import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { uploadMedia, attachMaterialAnswer, removeMaterialAnswer } from '../../api.js'
import { ALLOWED_EXTENSIONS, homeworkStateKey, isAllowedFile } from './homeworkFormat.js'
import { isMaterialGraded, materialCard, needsAnswerFile } from './materialAssignments.js'
import useMaterialOpen from './useMaterialOpen.js'
import HomeworkFileList from './HomeworkFileList.jsx'

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')

/**
 * Часть-материал внутри ленты домашней работы (одна домашка на занятие, spec
 * §5, §9) — сокращённый вариант того, что MaterialAssignmentDetail показывает
 * отдельным экраном для непривязанной выдачи: тот же «Открыть задание»
 * (useMaterialOpen — общий код с тем экраном) и тот же файл-ответ у карточки
 * урока. Своей «Сдать» здесь нет и не будет: сдаётся вся домашняя работа
 * одной кнопкой (HomeworkDetail), сервер сам проверяет каждую часть по
 * статусу родителя.
 *
 * `editable` — состояние САМОЙ РАБОТЫ (`canAttach(hw)` уровнем выше, в
 * HomeworkExercises): работа сдана — действий с частью больше нет вовсе,
 * остаётся только открыть и посмотреть (рамка уходит в режим только для
 * чтения тем же механизмом, что и у обычной выдачи материала).
 */
export default function HomeworkMaterialPart({ part, token, editable, onOpenCard, onSaved }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const { frameSrc, opening, openError, open, lookingUp } = useMaterialOpen(part, token, onOpenCard)

  const card = materialCard(part)
  const stateKey = homeworkStateKey(card)
  const attachable = editable && needsAnswerFile(part) && !isMaterialGraded(part) && !busy && !opening

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
        onSaved?.(await attachMaterialAnswer(token, part.id, file.name, url))
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
      onSaved?.(await removeMaterialAnswer(token, part.id, file.id))
    } catch {
      setError(t('homework.removeFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hw-block hw-block--material">
      <div className="hw-block__head">
        <h3 className="hw-block__title">{card.title}</h3>
        <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
      </div>
      {/* Что именно задано — снимок подписей с сервера: заголовок сам по себе
          называет материал целиком, а задают из него обычно один блок или одну
          стадию (тот же приём, что в HomeworkList и MaterialAssignmentDetail). */}
      {card.stageTitlesSnapshot && <p className="hw-assigned">{card.stageTitlesSnapshot}</p>}

      {frameSrc ? (
        <div className="hw-frame">
          {/* allow="autoplay" — разрешение выдаётся документу, а материал живёт
              в своём iframe; у заданий на слух без этого молчала бы запись. */}
          <iframe src={frameSrc} title={card.title} className="hw-frame__iframe" allow="autoplay" />
          <a className="hw-frame__full" href={frameSrc} target="_blank" rel="noopener noreferrer">
            {t('homework.openFullScreen')}
          </a>
        </div>
      ) : (
        <button type="button" className="hw-submit hw-submit--batch" disabled={opening || lookingUp} onClick={open}>
          {opening ? t('homework.opening') : t('homework.open')}
        </button>
      )}
      {(openError || error) && <p className="hw__error">{openError || error}</p>}

      {/* Работа сдана (или на проверке, или проверена) — с частью больше нечего
          делать, кроме как её открыть: своей кнопки сдачи у части нет, а после
          сдачи всей работы прикладывать файл к отдельной части уже нечем —
          состав ответа зафиксирован под тем, что откроет преподаватель. */}
      {editable && needsAnswerFile(part) && (
        <div className="hw-material-part__answer">
          <h4 className="hw-block__title">{t('homework.myAnswer')}</h4>
          <p className="hw__hint">{t('homework.cardAnswerHint')}</p>
          <HomeworkFileList
            files={part.files}
            emptyLabel={t('homework.answerEmpty')}
            onRemove={attachable ? removeFile : undefined}
          />
          {attachable && (
            <div className="hw-upload">
              <input
                id={`hw-upload-part-${part.id}`}
                className="hw-upload__input"
                type="file"
                multiple
                accept={ACCEPT}
                disabled={busy}
                onChange={pickFiles}
              />
              <label className="hw-upload__btn" htmlFor={`hw-upload-part-${part.id}`}>
                {busy ? t('homework.uploading') : t('homework.attach')}
              </label>
              <span className="hw__hint">{t('homework.formats')}</span>
            </div>
          )}
        </div>
      )}

      {/* Преподаватель закрыл всю работу без сдачи — «Проверено» тут соврало бы:
          эту часть никто не открывал (materialCard теперь прокидывает флаг). */}
      {card.closedWithoutSubmission && <p className="hw__hint">{t('homework.closedNoSubmission')}</p>}
    </section>
  )
}
