import { useI18n } from '../../i18n.jsx'
import HomeworkFileList from './HomeworkFileList.jsx'
import HomeworkExercises from './HomeworkExercises.jsx'
import { ALLOWED_EXTENSIONS, canAttach, canSubmit, homeworkStateKey } from './homeworkFormat.js'

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')

function formatDate(value, locale) {
  if (!value) return null
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Одна домашняя работа: задание преподавателя, ответ ученика и результат проверки.
 *
 * Проверенную работу трогать уже нельзя — файлы после оценки не досылаются
 * (это же правило стоит и на бэкенде), поэтому у COMPLETED тут нет ни загрузки,
 * ни удаления, ни кнопки отправки.
 */
export default function HomeworkDetail({ hw, token, busy, error, onUpload, onRemoveFile, onSubmit, onSaved, onAnswered, draftAnswered = 0 }) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'

  if (!hw) return <div className="hw-detail hw-detail--empty"><p className="hw__hint">{t('homework.pickOne')}</p></div>

  const stateKey = homeworkStateKey(hw)
  const attachable = canAttach(hw)
  const submittable = canSubmit(hw, draftAnswered)
  const due = formatDate(hw.dueDate, locale)

  const pickFiles = (event) => {
    const files = Array.from(event.target.files || [])
    // input сохраняет выбор: без сброса повторная загрузка того же файла
    // (после ошибки формата) не вызвала бы change.
    event.target.value = ''
    if (files.length) onUpload(files)
  }

  return (
    <div className="hw-detail">
      <div className="hw-detail__head">
        <h2 className="hw-detail__title">{hw.title}</h2>
        <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
      </div>
      <div className="hw-detail__meta">
        {hw.createdByName && <span>{t('homework.from', { name: hw.createdByName })}</span>}
        {due && <span>{t('homework.due', { date: due })}</span>}
      </div>

      {/* Файлы от преподавателя и задания с урока — разная работа: одно скачивают
          и присылают ответом, другое решают прямо здесь. Поэтому у них разные
          заголовки и разный фон, а не один общий список. */}
      <section className="hw-block hw-block--files">
        <div className="hw-block__head">
          <h3 className="hw-block__title">{t('homework.taskFiles')}</h3>
          {hw.materials?.length > 0 && <span className="hw-block__count">{hw.materials.length}</span>}
        </div>
        <HomeworkFileList files={hw.materials} emptyLabel={t('homework.taskEmpty')} />
      </section>

      {/* Задания, добавленные преподавателем прямо с живого урока. Секции нет,
          когда их нет: домашка бывает и просто файлом. */}
      <HomeworkExercises key={hw.id} hw={hw} token={token} onSaved={onSaved} onAnswered={onAnswered} />

      <section className="hw-block">
        <h3 className="hw-block__title">{t('homework.myAnswer')}</h3>
        <HomeworkFileList
          files={hw.submissions}
          emptyLabel={t('homework.answerEmpty')}
          onRemove={attachable && !busy ? onRemoveFile : undefined}
        />

        {attachable && (
          <div className="hw-upload">
            <input
              id={`hw-upload-${hw.id}`}
              className="hw-upload__input"
              type="file"
              multiple
              accept={ACCEPT}
              disabled={busy}
              onChange={pickFiles}
            />
            <label className="hw-upload__btn" htmlFor={`hw-upload-${hw.id}`}>
              {busy ? t('homework.uploading') : t('homework.attach')}
            </label>
            <span className="hw__hint">{t('homework.formats')}</span>
          </div>
        )}

        {error && <p className="hw__error">{error}</p>}

        {attachable && (
          <button
            type="button"
            className="hw-submit"
            disabled={!submittable || busy}
            onClick={onSubmit}
          >
            {t('homework.submit')}
          </button>
        )}
        {hw.status === 'SUBMITTED' && <p className="hw__hint">{t('homework.waitingReview')}</p>}
      </section>

      {/* Отзыв преподаватель пишет и до проверки — тогда это ещё не «Проверка»,
          а просто его слова о работе. */}
      {(hw.grade != null || hw.teacherComment) && (
        <section className="hw-block hw-block--review">
          <h3 className="hw-block__title">{t(hw.grade != null ? 'homework.review' : 'homework.feedback')}</h3>
          {hw.grade != null && (
            <div className="hw-grade">
              <span className="hw-grade__num">{hw.grade}</span>
              <span className="hw-grade__label">{t('homework.grade')}</span>
            </div>
          )}
          {hw.teacherComment && <p className="hw-comment">{hw.teacherComment}</p>}
        </section>
      )}
    </div>
  )
}
