'use client'

// Экран результата: «нашёл все N» и весь пул сцены с озвучкой — порт finish()
// прототипа (jtswords.html:~530). Список здесь не украшение: слово только что
// узнавали на слух, и это первый экран, где его видно написанным вместе с
// переводом.

import { useI18n } from '../../i18n.jsx'
import { spriteUrl } from '../../practice/words/assets.js'
import { translate } from '../../practice/words/loc.js'
import { IconPlay, IconSound } from './WordsIcons.jsx'

export default function WordsResult({ scene, pool, wordLang, voice, onAgain, onCatalog }) {
  const { t } = useI18n()

  return (
    <div className="wd-result">
      <div className="wd-result__card" style={{ '--wd-tint': scene.tint, '--wd-tint2': scene.tint2 }}>
        <span className="wd-result__kicker">{scene.name}</span>
        <h1>{t('words.result.title', { n: pool.length })}</h1>
        <p>{t('words.result.hint')}</p>
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

      <div className="wd-result__btns">
        <button type="button" className="wd-btn wd-btn--primary" onClick={onAgain}>
          {t('words.playAgain')} <IconPlay />
        </button>
        <button type="button" className="wd-btn wd-btn--ghost" onClick={onCatalog}>
          {t('words.otherScenes')}
        </button>
      </div>
    </div>
  )
}
