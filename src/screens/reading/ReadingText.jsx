'use client'

import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { genreOf } from '../../practice/reading/genres.js'
import { loc } from '../../practice/reading/loc.js'
import { readMin, sentences, wordCount } from '../../practice/reading/engine.js'
import { speak } from '../../practice/workbook/voice.js'
import ReadingArticle from './ReadingArticle.jsx'
import ReadingTasks from './ReadingTasks.jsx'
import useReadingVoice from './useReadingVoice.js'

// Читалка: слева текст, справа задания (viewRead прототипа, :745). На узком
// экране две панели превращаются в вкладки — на телефоне читать текст в
// половину ширины невозможно.
export default function ReadingText({ text, dict, ensureDict, onFont, onSettings, onFinish }) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState('text')
  const g = genreOf(text.genre)

  const lines = useMemo(() => text.text.flatMap((p) => sentences(p)), [text])
  const voice = useReadingVoice(lines)
  // Смену текста обрабатывает не эффект, а key={text.id} на этом компоненте
  // (ReadingPage): вкладка и озвучка сбрасываются самим перемонтированием,
  // и новый текст не открывается на заданиях предыдущего.

  const toggleVoice = () => {
    if (voice.playing) voice.stop()
    else {
      // Слушать задания бессмысленно — озвучка всегда возвращает на текст.
      if (tab !== 'text') setTab('text')
      voice.start()
    }
  }

  return (
    <>
      <div className="rd-toolbar" role="toolbar" aria-label={t('reading.settings.title')}>
        <div className="rd-tabs" role="tablist">
          <button
            type="button" role="tab" id="rd-tab-text" aria-controls="rd-pane-text"
            aria-selected={tab === 'text'} onClick={() => setTab('text')}
          >
            📖 {t('reading.text')}
          </button>
          <button
            type="button" role="tab" id="rd-tab-ex" aria-controls="rd-pane-ex"
            aria-selected={tab === 'ex'} onClick={() => setTab('ex')}
          >
            ✏️ {t('reading.tasks')} ({text.exercises.length})
          </button>
        </div>
        <div className="rd-tb">
          <button type="button" className="rd-tb__btn" onClick={() => onFont(-1)} aria-label="A−">A−</button>
          <button type="button" className="rd-tb__btn" onClick={() => onFont(1)} aria-label="A+">A+</button>
          <button
            type="button"
            className={`rd-tb__btn${voice.playing ? ' is-on' : ''}`}
            aria-pressed={voice.playing}
            onClick={toggleVoice}
            aria-label={t('reading.listen')}
          >
            🔊
          </button>
          <button type="button" className="rd-tb__btn" onClick={onSettings} aria-label={t('reading.settings.title')}>⚙</button>
        </div>
      </div>

      <div className="rd-grid2" data-tab={tab}>
        <aside className="rd-pane rd-pane--text" id="rd-pane-text" role="tabpanel" aria-labelledby="rd-tab-text">
          <div className={`rd-texthero rd-g-${text.genre}`}>
            <span className="rd-texthero__emoji" aria-hidden="true">{text.cover.emoji}</span>
            <h1 lang="en">{text.title}</h1>
            <div className="rd-texthero__meta">
              <span>{text.level} · {t('reading.levelName.' + text.level.toLowerCase())}</span>
              <span>{g.emoji} {t('reading.genre.' + text.genre)}</span>
              <span>⏱ {readMin(text.text)} {t('reading.min')}</span>
              <span>📝 {wordCount(text.text)} {t('reading.words')}</span>
            </div>
          </div>

          <div className="rd-task"><b>🎯 {t('reading.task')}</b> {loc(text.task, lang)}</div>

          <section className="rd-panel">
            <h2 className="rd-label">🔑 {t('reading.keyWords')}</h2>
            <ul className="rd-words">
              {text.words.map((w) => (
                <li key={w.en} className="rd-word">
                  <div className="rd-word__main">
                    <div className="rd-word__top">
                      <span className="rd-word__en" lang="en">{w.en}</span>
                      <span className="rd-word__tr">{w.tr}</span>
                    </div>
                    <div className="rd-word__row"><span className="rd-flag">RU</span><span lang="ru">{w.ru}</span></div>
                    <div className="rd-word__row"><span className="rd-flag">KZ</span><span lang="kk">{w.kz}</span></div>
                    <div className="rd-word__ex" lang="en">“{w.ex}”</div>
                  </div>
                  <button type="button" className="rd-say" onClick={() => speak([w.en])} aria-label={`🔊 ${w.en}`}>🔊</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rd-panel">
            <div className="rd-listen">
              {!voice.playing ? (
                <button type="button" className="rd-btn rd-btn--secondary" onClick={() => voice.start()}>
                  🔊 {t('reading.listen')}
                </button>
              ) : (
                <>
                  <button type="button" className="rd-btn rd-btn--secondary" onClick={voice.pauseResume}>
                    {voice.paused ? `▶ ${t('reading.resume')}` : `⏸ ${t('reading.pause')}`}
                  </button>
                  <button type="button" className="rd-btn rd-btn--ghost" onClick={voice.stop}>⏹ {t('reading.stop')}</button>
                </>
              )}
            </div>
            <p className="rd-hint">💬 {t('reading.tapWord')}</p>
            <ReadingArticle text={text} dict={dict} ensureDict={ensureDict} speakingIndex={voice.index} />
          </section>
        </aside>

        <section className="rd-pane rd-pane--ex" id="rd-pane-ex" role="tabpanel" aria-labelledby="rd-tab-ex">
          <ReadingTasks text={text} />
          <div className="rd-finish">
            <p>🏁 {t('reading.finishHint')}</p>
            <button type="button" className="rd-btn rd-btn--primary" onClick={onFinish}>
              {t('reading.finish')} →
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
