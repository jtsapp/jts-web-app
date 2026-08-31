import { useEffect, useRef, useState } from 'react'
import { searchDictionary, getSavedWords } from '../../api.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Словарь школы прямо в уроке.
 *
 * У преподавателя такая панель есть давно, у ученика её не было: чтобы посмотреть
 * слово, он уходил из урока в раздел «Словарь» и терял место в задании.
 *
 * Две вкладки, и обе нужны прямо на уроке:
 *
 * - «Мои слова» — личный словарь ученика (`/mobile/saved-words`). Именно сюда
 *   преподаватель кладёт слово кнопкой «В словарь», и увидеть его ученик должен
 *   не уходя в отдельный раздел. Открыта первой: панель называется «Ваш словарь».
 * - «Словарь школы» — общий список, курируемый админкой (`/dictionaries/search`),
 *   тот же, что открыт преподавателю.
 *
 * Свёрнут по умолчанию: в колонке уже стоят звонок, темы и чат, и четвёртая
 * раскрытая карточка вытолкнула бы чат за пределы экрана. Листом поверх урока
 * (`defaultOpen`) — наоборот, раскрыт: там кроме словаря ничего нет, и лишний
 * клик по заголовку означал бы пустой экран в ответ на «Ваш словарь».
 */
export default function LessonDictionary({ token, defaultOpen = false }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const [tab, setTab] = useState('mine')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // Порядковый номер запроса: ответы приходят не в том порядке, в каком уходили,
  // и медленный ответ по старому запросу перетирал бы свежий список.
  const seqRef = useRef(0)

  // Личный словарь: один запрос на раскрытие панели, без поиска по серверу —
  // своих слов у ученика десятки, а не тысячи, и фильтровать их можно на месте.
  useEffect(() => {
    if (!open || !token) return
    getSavedWords(token, (fresh) => setMine(Array.isArray(fresh) ? fresh : []))
      .then((rows) => setMine(Array.isArray(rows) ? rows : []))
      .catch(() => setMine([]))
  }, [open, token])

  const mineFiltered = (() => {
    const q = query.trim().toLowerCase()
    if (!q) return mine
    return mine.filter((w) =>
      String(w.word || '').toLowerCase().includes(q) ||
      String(w.translation || '').toLowerCase().includes(q))
  })()

  useEffect(() => {
    if (!open || !token || tab !== 'school') return undefined
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
  }, [open, query, token, tab])

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
          <div className="lw-dict__tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'mine'}
                    className={`lw-dict__tab ${tab === 'mine' ? 'is-on' : ''}`}
                    onClick={() => setTab('mine')}>
              {t('lesson.ws.dictionaryMine')}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'school'}
                    className={`lw-dict__tab ${tab === 'school' ? 'is-on' : ''}`}
                    onClick={() => setTab('school')}>
              {t('lesson.ws.dictionarySchool')}
            </button>
          </div>

          <label className="lw-dict__search">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('lesson.ws.dictionarySearch')}
              aria-label={t('lesson.ws.dictionarySearch')}
            />
          </label>

          {tab === 'mine' ? (
            mineFiltered.length ? (
              <ul className="lw-dict__list">
                {mineFiltered.map((w) => (
                  <li className="lw-dict__row" key={w.id ?? `${w.word}-${w.translation}`}>
                    <span className="lw-dict__word">{w.word}</span>
                    <span className="lw-dict__tr">{w.translation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lw-dict__state">{t('lesson.ws.dictionaryMineEmpty')}</p>
            )
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </section>
  )
}
