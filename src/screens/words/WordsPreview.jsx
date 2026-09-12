'use client'

// Превью сцены: список её слов с озвучкой и кнопка старта (renderPreview
// прототипа, jtswords.html:~505). Смысл экрана — дать послушать слова ДО
// задания: иначе первый раунд превращается в проверку незнакомого, а не
// узнавание.

import { useEffect } from 'react'
import { useI18n } from '../../i18n.jsx'
import { sceneCoverUrl, spriteUrl } from '../../practice/words/assets.js'
import { translate } from '../../practice/words/loc.js'
import { IconPlay, IconSound } from './WordsIcons.jsx'

export default function WordsPreview({ scene, pool, wordLang, voice, onStart }) {
  const { t } = useI18n()

  // Записи первого захода тянем заранее: пауза перед первым словом читается
  // как поломка, а не как загрузка.
  useEffect(() => {
    voice.preload(pool.slice(0, 12))
    return () => voice.stop()
  }, [pool, voice])

  return (
    <div className="wd-preview">
      <div className="wd-preview__hero" style={{ '--wd-tint': scene.tint, '--wd-tint2': scene.tint2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- картинки раздела пережаты офлайн (WebP) и лежат в public: next/image добавил бы прокси на 1100 файлов без выигрыша. */}
        <img className="wd-preview__cover" src={sceneCoverUrl(scene.id)} alt="" decoding="async" />
        <div className="wd-preview__text">
          <span className="wd-preview__kicker">{t('words.scene')}</span>
          <h1>{scene.name}</h1>
          <p>{t('words.preview.hint', { n: pool.length })}</p>
          <button type="button" className="wd-btn wd-btn--primary" onClick={onStart}>
            {t('words.startScene')} <IconPlay />
          </button>
        </div>
      </div>

      <div className="wd-words">
        {pool.map((w) => (
          <button key={w.id} type="button" className="wd-word" onClick={() => voice.play(w)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- картинки раздела пережаты офлайн (WebP) и лежат в public: next/image добавил бы прокси на 1100 файлов без выигрыша. */}
            <img src={spriteUrl(w.id)} alt="" loading="lazy" decoding="async" />
            <span className="wd-word__text">
              <b>{w.word}</b>
              {translate(w, wordLang) && <em>{translate(w, wordLang)}</em>}
            </span>
            <IconSound />
          </button>
        ))}
      </div>

      <div className="wd-preview__foot">
        <button type="button" className="wd-btn wd-btn--primary" onClick={onStart}>
          {t('words.startScene')} <IconPlay />
        </button>
      </div>
    </div>
  )
}
