'use client'

// Четыре фото задания. Порядок показа — round.order (номер на бейдже — позиция
// в нём), а не порядок подписей сцены: иначе верное фото всегда лежало бы на
// одном и том же месте.
//
// Выбирать нельзя, пока не дослушано и пока не загрузились ВСЕ четыре картинки
// (об этом сообщает onReady): иначе студент отвечал бы по видимой части. Кнопка
// закрытой картинки — aria-disabled, а не disabled: клик по ней всё равно нужен,
// чтобы вернуть фокус на Play.

import { useCallback, useEffect, useRef, useState } from 'react'
import { IMAGE_SIZES, imagePath, imageSrcSet } from '../../practice/listenchoose/data.js'
import { LcIcon } from './LcIcons.jsx'

function Photo({ scene, index, alt, retry, onStatus }) {
  const ref = useRef(null)
  // Картинка из кэша браузера могла загрузиться раньше, чем React повесил
  // onLoad, — проверяем готовность сами.
  useEffect(() => {
    const el = ref.current
    if (el && el.complete && el.naturalWidth > 0) onStatus(index, 'loaded')
  }, [onStatus, index, retry])
  // Повтор дописывает метку в адрес: иначе браузер отдал бы из кэша тот же
  // битый ответ.
  const suffix = retry ? `?retry=${retry}` : ''
  return (
    <img
      key={retry}
      ref={ref}
      alt={alt}
      lang="en"
      width={512}
      height={384}
      decoding="async"
      loading="eager"
      sizes={IMAGE_SIZES}
      srcSet={imageSrcSet(scene, index, suffix)}
      src={`${imagePath(scene, index, 512)}${suffix}`}
      onLoad={() => onStatus(index, 'loaded')}
      onError={() => onStatus(index, 'failed')}
    />
  )
}

export default function LcPictures({ question, options, round, heard, imagesReady, t, onPick, onZoom, onReady }) {
  // { <индекс фото>: 'loaded' | 'failed' }; пусто = ещё грузится.
  const [status, setStatus] = useState({})
  const [retries, setRetries] = useState({})
  // Один стабильный обработчик на все четыре фото: иначе эффект «уже из кэша»
  // перезапускался бы на каждом рендере.
  const report = useCallback((oi, s) => setStatus((prev) => (prev[oi] === s ? prev : { ...prev, [oi]: s })), [])

  // Ждём, пока каждое фото ОТВЕТИТ — загрузилось или не смогло. Пока ждали
  // ровно 'loaded', один отсутствующий файл держал ворота закрытыми навсегда:
  // все четыре варианта оставались aria-disabled, под ними висело «картинка
  // грузится», а «Try again» дёргал тот же несуществующий адрес — задание
  // превращалось в тупик, и набор нельзя было закончить.
  //
  // Плитку с битым файлом при этом ОБЯЗАНО быть можно выбрать: рисунка на ней
  // нет (`.lc-opt img` прозрачна до `is-loaded`), поверх лежит карточка
  // «Try again», и пока та не стала сквозной для кликов, открытый гейт
  // превращал такую плитку в гарантированную ошибку — если верный ответ
  // именно она, нажать было физически нечем. См. `pointer-events` у
  // `.lc-imgretry` в listenchoose.css.
  const allSettled = [0, 1, 2, 3].every((i) => status[i] === 'loaded' || status[i] === 'failed')
  useEffect(() => {
    onReady(allSettled)
  }, [allSettled, onReady])

  return (
    <div className="lc-grid" role="group" aria-label="Picture choices">
      {round.order.map((oi, di) => {
        const st = status[oi]
        const isWrong = round.wrong.includes(oi)
        const isAnswer = oi === question.answer
        const showMark = isWrong || (round.resolved && isAnswer)
        const closed = round.resolved || !heard || !imagesReady || isWrong
        const cls = [
          'lc-opt',
          st === 'loaded' && 'is-loaded',
          st === 'failed' && 'is-failed',
          round.resolved && round.correct && isAnswer && 'is-correct',
          round.resolved && !round.correct && isAnswer && 'is-revealed',
          isWrong && 'is-wrong',
        ]
          .filter(Boolean)
          .join(' ')
        const label = `${t('listenchoose.picture')} ${di + 1}: ${options[oi]}${isWrong ? ' — incorrect' : round.resolved && isAnswer ? ' — correct' : ''}`
        return (
          <div className="lc-opt-wrap" key={oi}>
            <button
              type="button"
              className={cls}
              data-option={oi}
              aria-label={label}
              aria-disabled={closed}
              aria-busy={st === undefined}
              aria-keyshortcuts={String(di + 1)}
              onClick={() => onPick(oi)}
            >
              <Photo scene={question.scene} index={oi} alt={options[oi]} retry={retries[oi] || 0} onStatus={report} />
              <span className="lc-badge" aria-hidden="true">
                {di + 1}
              </span>
              <span className="lc-mark" hidden={!showMark} aria-hidden="true">
                {isWrong ? '×' : '✓'}
              </span>
            </button>
            <button type="button" className="lc-zoom" aria-label={`${t('listenchoose.zoom')} ${di + 1}`} onClick={() => onZoom(di)}>
              <LcIcon name="zoom" />
            </button>
            {st === 'failed' && (
              <div className="lc-imgretry">
                <span>{t('listenchoose.imageError')}</span>
                <button
                  type="button"
                  // Статус НЕ сбрасываем: 'failed' — такой же «ответ», как и
                  // 'loaded'. Сбрасывали в undefined — и гейт закрывался
                  // обратно на все четыре плитки, а карточка «Try again»
                  // вместе с ним исчезала (`st === 'failed'` переставал быть
                  // истиной). Повтор, который не ответил ни load, ни error
                  // (офлайн, висящий прокси), запирал задание насмерть — ровно
                  // тот тупик, который эта правка и убирает. Перезагрузку
                  // картинки делает смена ключа `retry` у <Photo>.
                  onClick={() => setRetries((prev) => ({ ...prev, [oi]: Date.now() }))}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
