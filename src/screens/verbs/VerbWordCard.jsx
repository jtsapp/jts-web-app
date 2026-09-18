'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { translateWord } from '../../lib/wordTranslate.js'
import { saveReadingKeyword } from '../../practice/reading/saveKeyword.js'
import { cleanWord, lookupWord } from '../../practice/verbs/engine.js'

// Карточка перевода слова из предложения. У прототипа тут был свой «Мой
// словарь» в localStorage и режим host, в котором выделение забирает сайт;
// сайт — это мы, поэтому слово уходит в общий «Словарь» ученика тем же путём,
// что ключевые слова «Чтения» (saveReadingKeyword: /mobile/saved-words на
// ru и kk плюс банк повторений).
//
// Перевод — сначала офлайн-словарь раздела (формы глаголов и слова
// предложений, ru И kk), без него — общий сетевой переводчик, только ru:
// казахский он портит, и пустая строка честнее плохого перевода.
//
// Родитель перемонтирует карточку на каждое слово (key), поэтому стейт здесь
// всегда про одно слово и сбрасывать его вручную не нужно.
export default function VerbWordCard({ word, at, host, dict, token, onClose }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const [net, setNet] = useState(null) // { state: 'ready'|'empty', ru } — ответ сети
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const w = cleanWord(word)
  const hit = lookupWord(word, dict)
  // Форму глагола сохраняем словарной (went → go): в «Словаре» нужна лемма,
  // перевод у неё тот же.
  const entry = hit
    ? { en: hit.lemma || w, form: w, ru: hit.ru, kk: hit.kk, source: 'dict' }
    : net && net.state === 'ready'
      ? { en: w, form: w, ru: net.ru, kk: '', source: 'net' }
      : null
  const state = entry ? 'ready' : !w || (net && net.state === 'empty') ? 'empty' : 'loading'

  useEffect(() => {
    if (hit || !w) return undefined
    let alive = true
    translateWord(w, 'ru')
      .then((res) => {
        if (alive) setNet(res && res.tr ? { state: 'ready', ru: res.tr } : { state: 'empty' })
      })
      .catch(() => alive && setNet({ state: 'empty' }))
    return () => {
      alive = false
    }
  }, [hit, w])

  // Размер карточки известен только после отрисовки; двигаем её до того, как
  // браузер покажет кадр, прямо в стиле — перерисовка React тут не нужна.
  // Встаёт НАД предложением (at.above — его верх): под ним поле ответа, и
  // карточка снизу ложилась прямо на него. Вниз, под слово, — только если
  // сверху не хватает экрана.
  // Пересчёт и по смене state: пришёл перевод из сети — карточка выросла.
  useLayoutEffect(() => {
    const el = ref.current
    const box = host.current
    if (!el || !box) return
    const max = Math.max(0, box.clientWidth - el.offsetWidth - 4)
    el.style.left = `${Math.max(0, Math.min(at.left, max))}px`
    const above = at.above - el.offsetHeight - 8
    const fits = box.getBoundingClientRect().top + above >= 8
    el.style.top = `${fits ? above : at.below + 8}px`
  }, [at, host, state])

  // Закрытие — клик мимо, Escape, ресайз (смещение посчитано от ширины блока).
  useEffect(() => {
    const away = (e) => {
      const node = e.target instanceof Element ? e.target : e.target && e.target.parentElement
      if (!node || (!node.closest('.vb-pop') && !node.closest('.vb-w'))) onClose()
    }
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const onSave = async () => {
    if (!entry || saved || saving) return
    setSaving(true)
    const ok = await saveReadingKeyword(token, { en: entry.en, ru: entry.ru, kk: entry.kk }, 'verbs')
    setSaving(false)
    if (ok) setSaved(true)
  }

  return (
    <div className="vb-pop" ref={ref} style={{ left: at.left, top: at.below + 8 }} role="dialog" aria-label={t('verbs.translation')}>
      <button type="button" className="vb-pop__close" onClick={onClose} aria-label={t('common.close')}>
        ✕
      </button>
      <div className="vb-pop__en" lang="en">
        {entry ? entry.form : w || word}
        {entry && entry.en !== entry.form && <small> → {entry.en}</small>}
      </div>
      {state === 'loading' && <div className="vb-pop__hint">…</div>}
      {state === 'empty' && <div className="vb-pop__hint">{t('verbs.noTranslation')}</div>}
      {state === 'ready' && entry && (
        <>
          <div className="vb-pop__row">
            <span className="vb-pop__flag">RU</span>
            <span lang="ru">{entry.ru}</span>
          </div>
          {entry.kk && (
            <div className="vb-pop__row">
              <span className="vb-pop__flag">KZ</span>
              <span lang="kk">{entry.kk}</span>
            </div>
          )}
          <div className="vb-pop__hint">{t(entry.source === 'net' ? 'verbs.netSource' : 'verbs.vocabSource')}</div>
          <button type="button" className={`vb-pop__save${saved ? ' is-saved' : ''}`} disabled={saved || saving} onClick={onSave}>
            {saved ? t('lesson.inVocab') : t('lesson.addToVocab')}
          </button>
        </>
      )}
    </div>
  )
}
