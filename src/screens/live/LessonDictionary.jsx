import { useEffect, useRef, useState } from 'react'
import { searchDictionary, getSavedWords, saveWord } from '../../api.js'
import { translateWord } from '../../lib/wordTranslate.js'
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
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const [tab, setTab] = useState('mine')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // Перевод набранного, когда школьного банка не хватило. Банк курируется
  // админкой и на уроке почти всегда пуст — а ученику в этот момент нужен
  // перевод, а не сообщение о том, что слова нет.
  const [fallback, setFallback] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

  // Перевод ищем в обеих вкладках. «Мои слова» — личный список из десятков
  // записей, и не найдя слово там, ученик упирался в пустоту: искать его дальше
  // было негде, хотя переводчик рядом.
  useEffect(() => {
    if (!open || !token) return undefined
    const seq = ++seqRef.current
    setLoading(true)
    setFailed(false)
    // Ищем по уже набранному, но не на каждую букву: список длинный, а сервер
    // один на всех участников урока.
    setFallback(null)
    setSaved(false)
    const translateIfEmpty = (rows) => {
      const word = query.trim()
      if (rows.length || !word) return
      translateWord(word, lang === 'kk' ? 'kk' : 'ru')
        .then((t) => {
          if (seqRef.current !== seq) return
          const tr = String(t?.tr || '').trim()
          if (tr) setFallback({ word, translation: tr, alternates: t.alternates || [] })
        })
        .catch(() => { /* переводчик недоступен — останется «ничего не найдено» */ })
    }
    const id = setTimeout(() => {
      if (tab === 'mine') {
        setLoading(false)
        // Своё уже отфильтровано на месте (mineFiltered) — сюда попадаем только
        // тогда, когда в личном списке совпадений нет.
        translateIfEmpty(mineFiltered)
        return
      }
      searchDictionary(token, query)
        .then((rows) => {
          if (seqRef.current !== seq) return
          setItems(rows)
          setLoading(false)
          translateIfEmpty(rows)
        })
        .catch(() => {
          if (seqRef.current !== seq) return
          setItems([])
          setLoading(false)
          setFailed(true)
          // Банк не ответил — перевод всё равно нужен.
          translateIfEmpty([])
        })
    }, query ? 300 : 0)
    return () => clearTimeout(id)
    // mineFiltered пересобирается на каждый рендер — в зависимостях его быть не
    // должно, иначе эффект уходит в цикл. Читается он в момент срабатывания.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, token, tab, lang, mine])

  /**
   * Забрать переведённое слово себе.
   *
   * Тем же путём, что и тап-перевод по тексту урока (saveWord → /mobile/saved-words):
   * слово попадает и в «Мои слова», и в «Практику по словарю». Раньше перевод
   * показывался, а забрать его было нечем — ученик переписывал слово руками.
   */
  function saveFallback() {
    if (!fallback || !token || saving || saved) return
    setSaving(true)
    saveWord(token, {
      word: fallback.word,
      translation: fallback.translation,
      alternates: fallback.alternates.length ? fallback.alternates.join(', ') : undefined,
      language: lang === 'kk' ? 'kk' : 'ru',
      source: 'Словарь урока',
    })
      .then(() => {
        setSaved(true)
        // Свой список сразу подтягиваем: слово должно оказаться в «Моих словах»,
        // а не появиться там только после переоткрытия панели.
        return getSavedWords(token).then((rows) => setMine(Array.isArray(rows) ? rows : []))
      })
      .catch(() => { /* не сохранилось — кнопка остаётся нажимаемой */ })
      .finally(() => setSaving(false))
  }

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
            ) : fallback ? null : (
              <p className="lw-dict__state">{t('lesson.ws.dictionaryMineEmpty')}</p>
            )
          ) : (
            <>
              {loading && <p className="lw-dict__state">{t('schedule.loading')}</p>}
              {!loading && failed && <p className="lw-dict__state">{t('lesson.ws.dictionaryFailed')}</p>}
              {!loading && !failed && items.length > 0 && (
                <ul className="lw-dict__list">
                  {items.map((d) => (
                    <li className="lw-dict__row" key={d.id ?? `${d.word}-${d.translatedWord}`}>
                      <span className="lw-dict__word">{d.word}</span>
                      <span className="lw-dict__tr">{d.translatedWord}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && !failed && items.length === 0 && !fallback && (
                <p className="lw-dict__state">{t('lesson.ws.dictionaryEmpty')}</p>
              )}
            </>
          )}

          {/* Карточка перевода — под обеими вкладками: в «Моих словах» она и есть
              тот самый поиск дальше своего списка. */}
          {fallback && (
            <div className="lw-dict__fallback">
              <span className="lw-dict__word">{fallback.word}</span>
              <span className="lw-dict__tr">{fallback.translation}</span>
              {fallback.alternates.length > 0 && (
                <span className="lw-dict__alt">{fallback.alternates.join(' · ')}</span>
              )}
              <button type="button" className="lw-dict__save"
                      disabled={saving || saved} onClick={() => saveFallback()}>
                {t(saved ? 'lesson.ws.dictionarySaved' : 'lesson.ws.dictionarySave')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
