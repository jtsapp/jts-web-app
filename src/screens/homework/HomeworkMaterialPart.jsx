import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { uploadMedia, attachMaterialAnswer, removeMaterialAnswer } from '../../api.js'
import { ALLOWED_EXTENSIONS, homeworkStateKey, isAllowedFile } from './homeworkFormat.js'
import { assignmentScope, isMaterialGraded, materialCard, needsAnswerFile } from './materialAssignments.js'
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
 *
 * `onTouched(part.id)` — ученик начал работать в рамке части. Любое его действие
 * там — уже работа (решение владельца 29.09), и «Отправить на проверку» обязана
 * ожить сразу. Сам ход мост рамки сохраняет на сервер, но список работ с сервера
 * об этом не знает до перезагрузки — раньше кнопка так и стояла серой, и сдать
 * сделанный урок было нечем.
 */
export default function HomeworkMaterialPart({ part, token, editable, onOpenCard, onSaved, onTouched }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const { frameSrc, opening, openError, open, lookingUp } = useMaterialOpen(part, token, onOpenCard)
  const frameRef = useRef(null)
  const reportedRef = useRef(false)

  // Мост в рамке (MaterialBridgeScriptInjector, режим live) на каждый настоящий
  // клик, ввод и выбор шлёт родителю `mirror` и тем же обработчиком откладывает
  // сохранение хода на сервер — это и есть сигнал «ученик работает». Верим только
  // своей рамке: на странице бывают рамки других частей и чужие виджеты, а
  // postMessage может прислать кто угодно. Прокрутку мост шлёт тем же `mirror`,
  // но хода не сохраняет: сервер её не засчитает, и ожившая по ней кнопка
  // упиралась бы в отказ «Работа пустая».
  useEffect(() => {
    if (!frameSrc) return undefined
    const onMessage = (event) => {
      const frame = frameRef.current
      if (!frame || event.source !== frame.contentWindow) return
      const data = event.data
      if (data?.source !== 'jts-bridge' || data?.type !== 'mirror' || data.eventType === 'scroll') return
      if (reportedRef.current) return
      reportedRef.current = true
      onTouched?.(part.id)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [frameSrc, onTouched, part.id])

  const card = materialCard(part)
  const stateKey = homeworkStateKey(card)
  const scope = assignmentScope(part)
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
      {/* Шапка — как у пачки вопросов в той же ленте: название, под ним
          приглушённая строка, статус справа. Что именно задано — вторым планом:
          заголовок называет материал целиком, а задают из него обычно блок,
          задания или стадию (assignmentScope — то же правило, что в HomeworkList
          и MaterialAssignmentDetail). */}
      <div className="hw-block__head">
        <div className="hw-part__head">
          <h3 className="hw-block__title">{card.title}</h3>
          {scope && <span className="hw-part__scope">{scope.key ? t(scope.key) : scope.text}</span>}
        </div>
        <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
      </div>

      {frameSrc ? (
        <div className="hw-frame">
          {/* allow="autoplay" — разрешение выдаётся документу, а материал живёт
              в своём iframe; у заданий на слух без этого молчала бы запись. */}
          <iframe ref={frameRef} src={frameSrc} title={card.title} className="hw-frame__iframe" allow="autoplay" />
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
