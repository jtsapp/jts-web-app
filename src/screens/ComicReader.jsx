'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExpandIcon,
  CollapseIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { translateWord, cleanWord } from '../lib/wordTranslate.js'
import { canSaveWords, saveTappedWord } from '../lib/saveTappedWord.js'
import { loadComic, getComicPage, setComicPage } from '../practice/comics/comicsData.js'
import { comicKey } from '../practice/comics/comicsShape.js'
import { usePinchZoom } from '../practice/comics/usePinchZoom.js'
import { MAX_ZOOM } from '../practice/comics/zoom.js'
import {
  requestElementFullscreen,
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
} from '../lib/elementFullscreen.js'

// Читалка комикса: одна страница на экран, вперёд-назад стрелками, свайпом и
// клавишами. Пролистывание, а не вертикальная лента — так страница целиком
// попадает в экран (у комикса композиция страничная, разрезать её скроллом
// значит потерять развороты).
//
// Если страница пришла с репликами — рядом появляется панель: текст в порядке
// чтения, слово тапается и переводится (тот же gtx, что в «Книжках»), перевод
// фразы приходит готовым. Бэкенд реплики сейчас НЕ отдаёт, поэтому панели
// просто нет — пустой блок «на этой странице нет реплик» на каждой странице
// был бы мёртвым интерфейсом. Появятся данные — панель включится сама.
//
// На телефоне и планшете страницу увеличивают двумя пальцами или двойным
// тапом (см. usePinchZoom.js): мелкий текст баллонов на экране телефона иначе
// не прочесть. Увеличенный лист водят пальцем, и он не листается — ни тапом,
// ни свайпом, пока его не вернут к обычному размеру.
//
// На компьютере то же самое мышью и тачпадом: Ctrl + колесо или щипок
// тачпада, двойной клик, кнопки −/+ на сцене и клавиши + − 0. На ноутбуке
// страница вписана в высоту экрана, и баллон без зума мелкий так же, как на
// телефоне. Увеличенный лист тянут мышью и водят колесом.
//
// Кликабельных зон поверх самой картинки нет намеренно: координаты баллонов,
// снятые зрением модели, врут — до половины рамок ложится на пустой рисунок.
//
// Комикс приходит одним ответом (`/mobile/comics/{id}`), но картинки грузим
// лениво и держим в DOM только соседей текущей страницы: 214 живых <img>
// съедали бы память на мобиле.
const PRELOAD = 2

// Реплики, которые не разбирают пословно: звук нарисован, вывеска — часть
// картинки. Показываем, но приглушённо.
const QUIET = new Set(['sfx', 'sign'])

// Клавиша переключения полного экрана в обеих раскладках.
const FULL_KEYS = new Set(['f', 'F', 'а', 'А'])
const ZOOM_IN_KEYS = new Set(['+', '='])
const ZOOM_OUT_KEYS = new Set(['-', '_'])

// Через столько бездействия в полном экране гаснут панель и подсказка: они
// висят поверх страницы, а читают её, а не их.
const IDLE_MS = 2600

export default function ComicReader({ comic, token, onBack, onWordSaved }) {
  const { t, lang } = useI18n()
  const tl = lang === 'kk' ? 'kk' : 'ru'
  // Ключ закладки, а не адрес запроса: адресуется комикс по id (см. loadComic).
  const key = comicKey(comic)
  const [doc, setDoc] = useState(null)
  const [i, setI] = useState(0)
  const [failed, setFailed] = useState(false)
  // Раскрытые переводы реплик — индексы блоков на текущей странице.
  const [shown, setShown] = useState(() => new Set())
  // {word, translation, alternates, loading, saving, saved}
  const [pop, setPop] = useState(null)
  // Отсекает ответы перевода/сохранения от уже закрытой карточки.
  const seqRef = useRef(0)

  // Полный экран. Читалка живёт внутри оболочки «Обучения»: сверху шапка, слева
  // сайдбар, снизу подвал — на ноутбуке от страницы комикса остаётся полоска, а
  // упирается она именно в высоту. По кнопке уводим в полный экран корень
  // читалки, а не всю страницу: тогда сайдбар с шапкой выпадают из раскладки.
  //
  // Где Fullscreen API не сработал — на iOS Safari его нет вовсе, во встроенных
  // вебвью запрос отклоняют политикой — включаем свой оверлей: тот же корень
  // становится fixed на весь вьюпорт. Адресная строка тогда остаётся, но прятать
  // режим от всей мобильной половины пользователей из-за этого незачем.
  const rootRef = useRef(null)
  // Узел держим ещё и состоянием: в полном экране он служит целью портала для
  // карточки перевода (см. ниже), а её рисует render.
  const [rootEl, setRootEl] = useState(null)
  const setRoot = useCallback((node) => {
    rootRef.current = node
    setRootEl(node)
  }, [])
  const [nativeFull, setNativeFull] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const full = nativeFull || overlay

  // Зум. Цель жестов — сцена, увеличиваем текущую картинку. Сцена появляется
  // только с загруженным комиксом, поэтому узел держим состоянием: на нём
  // хук и вешает слушатели.
  const [stageEl, setStageEl] = useState(null)
  const imgRef = useRef(null)
  const zoom = usePinchZoom({
    stage: stageEl,
    imgRef,
    // Тап по увеличенному листу не листает: лист разглядывают, а случайный
    // тап выкинул бы на следующую страницу.
    onTap: (zoomed) => {
      setPop(null)
      if (!zoomed) go(1)
    },
    onSwipe: (d) => go(d),
  })
  const { reset: resetZoom, zoomIn, zoomOut } = zoom

  useEffect(
    () =>
      onFullscreenChange(() => {
        const isNative = getFullscreenElement() === rootRef.current
        setNativeFull(isNative)
        // Настоящий полный экран пришёл позже, чем мы сдались и включили свой
        // оверлей, — оверлей тогда лишний.
        if (isNative) setOverlay(false)
      }),
    [],
  )

  // Уходя с экрана (кнопка «Назад», размонтирование) полный экран отпускаем —
  // иначе браузер остаётся в нём уже поверх каталога.
  useEffect(
    () => () => {
      if (getFullscreenElement() === rootRef.current) exitFullscreen()
    },
    [],
  )

  // Свой оверлей закрывает страницу целиком, и прокрутка под ним только мешает:
  // колесо уводило бы каталог, к которому из-под оверлея уже не вернуться.
  useEffect(() => {
    if (!overlay) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [overlay])

  // Панель и подсказка гаснут в простое и возвращаются на любое движение:
  // страница в полном экране занимает всю высоту, а панель висит поверх неё.
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!full) return undefined
    let t = setTimeout(() => setIdle(true), IDLE_MS)
    const wake = () => {
      setIdle(false)
      clearTimeout(t)
      t = setTimeout(() => setIdle(true), IDLE_MS)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel']
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      clearTimeout(t)
      events.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [full])

  const toggleFull = useCallback(async () => {
    setIdle(false)
    // Раскладка сейчас поменяется целиком — сдвиг увеличенного листа под
    // старую сцену стал бы бессмысленным.
    resetZoom()
    if (getFullscreenElement() === rootRef.current) {
      exitFullscreen()
      return
    }
    if (overlay) {
      setOverlay(false)
      return
    }
    const ok = await requestElementFullscreen(rootRef.current)
    if (!ok) setOverlay(true)
  }, [overlay, resetZoom])

  useEffect(() => {
    let alive = true
    loadComic(token, comic).then((d) => {
      if (!alive) return
      if (!d?.pages?.length) {
        setFailed(true)
        return
      }
      setDoc(d)
      // Закладка — номер страницы (1-based), индекс — 0-based.
      setI(Math.min(d.pages.length, getComicPage(key)) - 1)
    })
    return () => {
      alive = false
    }
  }, [token, comic, key])

  const total = doc?.pages?.length || 0
  const go = useCallback(
    (d) => {
      // Зум сбрасываем ДО смены страницы: transform висит на самом <img>, а
      // соседние картинки остаются в DOM — увеличенная иначе так и вернулась
      // бы увеличенной при листании назад.
      resetZoom()
      setI((k) => Math.min(total - 1, Math.max(0, k + d)))
      setShown(new Set())
      setPop(null)
    },
    [total, resetZoom],
  )

  // Закладку пишем на смену страницы, а не на выход: вкладку закрывают молча.
  useEffect(() => {
    if (doc && total) setComicPage(key, i + 1)
  }, [doc, total, key, i])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1)
      // F — привычный по плеерам и читалкам переключатель полного экрана;
      // «а» — та же клавиша в русской раскладке.
      else if (FULL_KEYS.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFull()
      // + − 0 — зум листа. С Ctrl/⌘ это штатный зум всего сайта, его не трогаем.
      // «=» — та же клавиша, что «+», без Shift.
      else if (ZOOM_IN_KEYS.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) zoomIn()
      else if (ZOOM_OUT_KEYS.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) zoomOut()
      else if (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey) resetZoom(true)
      else if (e.key === 'Escape') {
        // Свой оверлей закрываем сами. В нативном полном экране Esc забирает
        // браузер — по нему из читалки не выходим, иначе одно нажатие и
        // свернуло бы экран, и закрыло комикс.
        if (pop) setPop(null)
        else if (overlay) {
          resetZoom()
          setOverlay(false)
        }
        else if (!nativeFull) onBack?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onBack, pop, overlay, nativeFull, toggleFull, resetZoom, zoomIn, zoomOut])

  const onWord = (raw) => {
    const w = cleanWord(raw)
    if (!w) return
    const seq = ++seqRef.current
    setPop({ word: w, translation: '', alternates: [], loading: true, saving: false, saved: false })
    translateWord(w, tl)
      .then(
        (x) =>
          seqRef.current === seq &&
          setPop((p) => p && { ...p, translation: x.tr, alternates: x.alternates, loading: false }),
      )
      .catch(() => seqRef.current === seq && setPop((p) => p && { ...p, loading: false }))
  }

  // Сохраняем только в свой словарь ученика, не токеном экрана (у гостя это
  // общий демо-токен) — см. saveTappedWord. Сбой виден на кнопке.
  const onSave = async () => {
    if (!pop?.translation || pop.saving || pop.saved) return
    const seq = seqRef.current
    setPop((p) => p && { ...p, saving: true, failed: false })
    const res = await saveTappedWord({
      word: pop.word,
      translation: pop.translation,
      alternates: pop.alternates.length ? pop.alternates.join(', ') : undefined,
      language: tl,
      source: doc?.title || comic?.title,
    })
    if (seqRef.current === seq) {
      setPop((p) => p && { ...p, saving: false, saved: res.status === 'saved', failed: res.status === 'failed' })
    }
    if (res.status === 'saved') onWordSaved?.(res.saved)
  }

  const bar = (
    <div className="cr__bar">
      <button type="button" className="cr__back" onClick={onBack}>
        <ChevronLeftIcon size={18} />
        {t('common.back')}
      </button>
      {/* Кнопка слева, а не в конце строки: в правом верхнем углу зоны контента
          висит переключатель языка, и справа она оказывалась под ним. */}
      <button
        type="button"
        className="cr__full"
        onClick={toggleFull}
        aria-pressed={full}
        title={full ? t('comics.exitFull') : t('comics.full')}
      >
        {full ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
        <span className="cr__fullLabel">{full ? t('comics.exitFull') : t('comics.full')}</span>
      </button>
      {doc && (
        <>
          <div className="cr__title">
            {doc.title}
            <span className="cr__author">{doc.author}</span>
          </div>
          <div className="cr__count">
            {i + 1} / {total}
          </div>
        </>
      )}
    </div>
  )

  if (failed) {
    return (
      <div className="cr" ref={setRoot}>
        {bar}
        <div className="cr__empty">{t('comics.failed')}</div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="cr" ref={setRoot}>
        {bar}
        <div className="cr__empty">{t('practice.loading')}</div>
      </div>
    )
  }

  const rootClass = ['cr', full && 'cr--full', overlay && 'cr--overlay', full && idle && 'cr--idle']
    .filter(Boolean)
    .join(' ')
  const page = doc.pages[i]
  // Соседние страницы держим смонтированными и скрытыми — браузер успевает их
  // скачать, и перелистывание не моргает белым.
  const near = doc.pages.filter((p, k) => Math.abs(k - i) <= PRELOAD)
  const blocks = page.blocks || []

  return (
    <div className={rootClass} ref={setRoot} onClick={() => setPop(null)}>
      {bar}

      <div className={blocks.length ? 'cr__body' : 'cr__body cr__body--wide'}>
        <div className={zoom.zoomed ? 'cr__stage cr__stage--zoomed' : 'cr__stage'} ref={setStageEl}>
          <button
            type="button"
            className="cr__nav cr__nav--prev"
            onClick={() => go(-1)}
            disabled={i === 0}
            aria-label={t('comics.prev')}
          >
            <ChevronLeftIcon size={22} />
          </button>

          <div className="cr__page">
            {near.map((p) => (
              <img
                key={p.n}
                ref={p.n === page.n ? imgRef : undefined}
                src={p.url}
                // Размеры бэкенд не всегда отдаёт. Без них резервируем место
                // пропорцией страницы книги, иначе на загрузке страница
                // «прыгает» и сбивает чтение.
                width={p.w}
                height={p.h}
                style={p.w && p.h ? undefined : { aspectRatio: '1249 / 1920' }}
                alt={t('comics.pageAlt', { n: p.n, total })}
                className={p.n === page.n ? 'cr__img' : 'cr__img cr__img--off'}
                draggable={false}
                // Соседей грузим заранее, текущую — сразу: lazy на ней даёт
                // задержку в момент перелистывания.
                loading={p.n === page.n ? 'eager' : 'lazy'}
                decoding="async"
                // Клик и тап по листу разбирает хук зума (с ожиданием
                // двойного) и листает через onTap.
              />
            ))}
          </div>

          {/* Мышью: шаги −/+ и сброс по цифре. Видны только там, где есть
              мышь или тачпад (CSS, hover + fine pointer): пальцам хватает
              щипка, а панель на телефоне накрывала бы лист. */}
          <div className="cr__zoom">
            <button
              type="button"
              className="cr__zoomBtn"
              onClick={zoomOut}
              disabled={!zoom.zoomed}
              aria-label={t('comics.zoomOut')}
              title={t('comics.zoomOut')}
            >
              <ZoomOutIcon size={16} />
            </button>
            <button
              type="button"
              className="cr__zoomPct"
              onClick={() => resetZoom(true)}
              disabled={!zoom.zoomed}
              aria-label={t('comics.unzoom')}
              title={t('comics.unzoom')}
            >
              {Math.round(zoom.scale * 100)}%
            </button>
            <button
              type="button"
              className="cr__zoomBtn"
              onClick={zoomIn}
              disabled={zoom.scale >= MAX_ZOOM}
              aria-label={t('comics.zoomIn')}
              title={t('comics.zoomIn')}
            >
              <ZoomInIcon size={16} />
            </button>
          </div>

          {/* Двойной тап и щипок знают не все — кнопка возвращает обычный
              размер явно. На компьютере её роль играет цифра в панели выше. */}
          {zoom.zoomed && (
            <button
              type="button"
              className="cr__unzoom"
              onClick={(e) => {
                e.stopPropagation()
                resetZoom(true)
              }}
              aria-label={t('comics.unzoom')}
              title={t('comics.unzoom')}
            >
              <ZoomOutIcon size={18} />
            </button>
          )}

          <button
            type="button"
            className="cr__nav cr__nav--next"
            onClick={() => go(1)}
            disabled={i >= total - 1}
            aria-label={t('comics.next')}
          >
            <ChevronRightIcon size={22} />
          </button>
        </div>

        {blocks.length > 0 && (
        <aside className="cr__text" onClick={(e) => e.stopPropagation()}>
          <h2 className="cr__textTitle">{t('comics.textTitle')}</h2>
          {(
            <ol className="cr__lines">
              {blocks.map((b, k) => (
                <li key={k} className={`cr__line ${QUIET.has(b.kind) ? 'cr__line--quiet' : ''}`}>
                  <p className="cr__en">
                    {b.en.split(/(\s+)/).map((tok, ti) =>
                      /\s+/.test(tok) || !cleanWord(tok) ? (
                        tok
                      ) : (
                        <span key={ti} className="cr__w" onClick={() => onWord(tok)}>
                          {tok}
                        </span>
                      ),
                    )}
                  </p>
                  {(b[tl] || b.ru) &&
                    (shown.has(k) ? (
                      <p className="cr__ru">{b[tl] || b.ru}</p>
                    ) : (
                      <button
                        type="button"
                        className="cr__show"
                        onClick={() => setShown((s) => new Set(s).add(k))}
                      >
                        {t('comics.showTr')}
                      </button>
                    ))}
                </li>
              ))}
            </ol>
          )}
        </aside>
        )}
      </div>

      <div className="cr__progress" aria-hidden="true">
        <i style={{ width: `${total ? ((i + 1) / total) * 100 : 0}%` }} />
      </div>
      {/* На сенсорном экране стрелок и клика нет — там своя подсказка. */}
      <p className="cr__hint">
        <span className="cr__hintMouse">{t('comics.hint')}</span>
        <span className="cr__hintTouch">{t('comics.hintTouch')}</span>
      </p>

      {/* Карточку перевода уводим в body: у обёртки экрана (.scr-in) есть
          transform анимации входа, а он делает её containing block для
          position:fixed — иначе карточка обрезается нижней кромкой экрана.
          В полном экране цель другая — корень читалки: пока элемент в top
          layer, браузер рисует только его поддерево, и карточка из body была бы
          не видна. Сам корень не трансформирован, fixed там честный. */}
      {pop &&
        createPortal(
          <div className="cr-pop" onClick={(e) => e.stopPropagation()}>
            <div className="cr-pop__word">{pop.word}</div>
            {pop.loading ? (
              <div className="cr-pop__tr cr-pop__tr--wait">…</div>
            ) : pop.translation ? (
              <>
                <div className="cr-pop__tr">{pop.translation}</div>
                {pop.alternates.length > 0 && (
                  <div className="cr-pop__alt">{pop.alternates.join(', ')}</div>
                )}
                {canSaveWords() ? (
                  <button
                    type="button"
                    className="cr-pop__save"
                    onClick={onSave}
                    disabled={pop.saving || pop.saved}
                  >
                    {pop.saved ? t('comics.saved') : pop.failed ? t('comics.saveFailed') : t('comics.save')}
                  </button>
                ) : (
                  <div className="cr-pop__hint">{t('comics.saveLogin')}</div>
                )}
              </>
            ) : (
              <div className="cr-pop__tr cr-pop__tr--wait">{t('comics.noTr')}</div>
            )}
            <button
              type="button"
              className="cr-pop__close"
              onClick={() => setPop(null)}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>,
          (full && rootEl) || document.body,
        )}
    </div>
  )
}
