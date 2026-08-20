import { useI18n } from '../../i18n.jsx'
import { fileExtension } from './homeworkFormat.js'

// Иконка по расширению: PDF и картинка ведут себя по-разному при открытии,
// и это единственное, что о файле известно заранее.
function FileGlyph({ fileName }) {
  const pdf = fileExtension(fileName) === 'pdf'
  return (
    <span className={`hw-file__glyph ${pdf ? 'hw-file__glyph--pdf' : 'hw-file__glyph--img'}`} aria-hidden="true">
      {pdf ? 'PDF' : 'IMG'}
    </span>
  )
}

/**
 * Список файлов задания или ответа.
 *
 * Ссылка со скачиванием, а не превью: файл лежит в хранилище под своим именем,
 * и ученику нужно именно «сохранить и открыть», а картинку браузер и так
 * покажет во вкладке.
 */
export default function HomeworkFileList({ files, emptyLabel, onRemove }) {
  const { t } = useI18n()
  if (!files?.length) return <p className="hw__hint">{emptyLabel}</p>

  return (
    <ul className="hw-files">
      {files.map((file) => (
        <li key={file.id} className="hw-file">
          <FileGlyph fileName={file.fileName} />
          <a className="hw-file__name" href={file.url} target="_blank" rel="noreferrer noopener" download={file.fileName}>
            {file.fileName}
          </a>
          {onRemove && (
            <button
              type="button"
              className="hw-file__remove"
              aria-label={t('homework.removeFile', { name: file.fileName })}
              onClick={() => onRemove(file)}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
