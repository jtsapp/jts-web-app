import { useEffect, useRef, useState } from 'react'
import { searchDictionary } from '../../api.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Словарь школы прямо в уроке.
 *
 * У преподавателя такая панель есть давно, у ученика её не было: чтобы посмотреть
 * слово, он уходил из урока в раздел «Словарь» и терял место в задании.
 *
 * Это школьный словарь (тот же `/dictionary/search`, что у преподавателя), а не
 * личный список сохранённых слов: личный живёт в разделе «Словарь» и пополняется
 * тап-переводом. Здесь нужен общий — чтобы посмотреть слово, которое встретилось
 * в задании прямо сейчас.
 *
 * Свёрнут по умолчанию: в колонке уже стоят звонок, темы и чат, и четвёртая
 * раскрытая карточка вытолкнула бы чат за пределы экрана.
 */
export default function LessonDictionary({ token }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // Порядковый номер запроса: ответы приходят не в том порядке, в каком уходили,
  // и медленный ответ по старому запросу перетирал бы свежий список.
  const seqRef = useRef(0)

  useEffect(() => {
    if (!open || !token) return undefined
    const seq = ++seqRef.current
    setLoading(true)
    setFailed(false)
    // Ищем по уже набранному, но не на каждую букву: список длинный, а сервер
    // один на всех участников урока.
    const id = setTimeout(() => {
      searchDictionary(token, query)
        .then((rows) => {
          if (seqRef.current !== seq) return
          setItems(rows)
          setLoading(false)
        })
        .catch(() => {
          if (seqRef.current !== seq) return
          setItems([])
          setLoading(false)
          setFailed(true)
        })
    }, query ? 300 : 0)
    return () => clearTimeout(id)
  }, [open, query, token])

  return (
    <section className={`lw-dict ${open ? 'lw-dict--open' : ''}`}>
      <button
        type="button"
        className="lw-dict__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="lw-dict__title">{t('lesson.ws.dictionary')}</span>
        <span className={`lw-dict__chev ${open ? 'lw-dict__chev--open' : ''}`} aria-hidden="true">›</span>
      </button>

      {open && (
        <div className="lw-dict__body">
          <label className="lw-dict__search">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('lesson.ws.dictionarySearch')}
              aria-label={t('lesson.ws.dictionarySearch')}
            />
          </label>

          {loading && <p className="lw-dict__state">{t('schedule.loading')}</p>}
          {!loading && failed && <p className="lw-dict__state">{t('lesson.ws.dictionaryFailed')}</p>}

          {!loading && !failed && (
            items.length ? (
              <ul className="lw-dict__list">
                {items.map((d) => (
                  <li className="lw-dict__row" key={d.id ?? `${d.word}-${d.translatedWord}`}>
                    <span className="lw-dict__word">{d.word}</span>
                    <span className="lw-dict__tr">{d.translatedWord}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lw-dict__state">{t('lesson.ws.dictionaryEmpty')}</p>
            )
          )}
        </div>
      )}
    </section>
  )
}
