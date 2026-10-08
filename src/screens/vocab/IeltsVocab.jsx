import { useMemo } from 'react'
import { IconPlay, IconSpeaker } from './VocabIcons.jsx'
import { vocabKey } from './vocabLearned.js'
import { practiceQueue, setCardMeta, wordStatus } from './ieltsVocab.js'

// IELTS Vocabulary в «Словаре» (Figma «IELTS new», раздел «Словарь», 92:6134): полка наборов по темам экзамена и
// экран набора. Данные и прогресс приносит VocabularyPage; здесь только разметка.

const ILLUSTRATED = new Set(['environment', 'education', 'technology', 'health', 'work', 'society', 'culture', 'travel'])

function topicName(set, lang) {
  const tp = set?.topic && typeof set.topic === 'object' ? set.topic : null
  return (tp && (lang === 'kk' ? tp.kk : tp.ru)) || ''
}

function metaText(t, meta) {
  if (meta.kind === 'done') return t('vocab.ielts.done', { n: String(meta.n), total: String(meta.total) })
  if (meta.kind === 'due') return t('vocab.ielts.due', { n: String(meta.n) })
  if (meta.kind === 'progress') return t('vocab.ielts.learnedOf', { n: String(meta.n), total: String(meta.total) })
  return t('vocab.home.words', { n: meta.total })
}

/** Полка «IELTS Vocabulary» на главной «Словаря»: карточка темы с иллюстрацией и прогрессом. */

// Картинка раздела: загруженная в web-admin (imageUrl каталога, MinIO), иначе — своя иллюстрация стартовых тем
const coverOf = (x) => x?.imageUrl || (ILLUSTRATED.has(x?.category) ? `/ielts/vocab/${x.category}.webp` : null)

export function IeltsShelf({ t, lang, sets, summaries, onOpen }) {
  if (!sets?.length) return null
  return (
    <div className="vp-sec" id="vsec-ielts">
      <div className="vp-sec-hd">
        <div>
          <h2>{t('vocab.ielts.title')}</h2>
          <p>{t('vocab.ielts.sub')}</p>
        </div>
        <button type="button" className="vp-sec-arrow" onClick={() => onOpen(sets[0])} aria-label={t('vocab.ielts.title')}>→</button>
      </div>
      <div className="vp-row">
        {sets.map((s) => {
          const meta = setCardMeta(summaries?.[s.scope], s.questionCount || 0)
          return (
            <button type="button" key={s.id} className="vp-ielts-card" onClick={() => onOpen(s)}>
              <span className="vp-ielts-card__txt">
                <b lang="en">{s.title}</b>
                <span className="nm">{topicName(s, lang)}</span>
                <span className={`meta is-${meta.kind}`}>{metaText(t, meta)}</span>
              </span>
              {coverOf(s) && <img src={coverOf(s)} alt="" aria-hidden="true" width="84" height="84" loading="lazy" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Экран набора: прогресс, «Повторить» / «Учить новые» и слова со статусом. */
export function IeltsSetScreen({ t, lang, set, words, states, loading, speak, onBack, onPractice }) {
  const total = words.length
  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, due: 0, learned: 0 }
    for (const w of words) c[wordStatus(states?.[vocabKey(w)])]++
    return c
  }, [words, states])
  const review = practiceQueue(words, states, 'review')
  const fresh = practiceQueue(words, states, 'new')
  const pct = total ? Math.round((counts.learned / total) * 100) : 0

  return (
    <section className="vp-pad vp-iset">
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <div className="vp-iset__hd">
        <div>
          <div className="vp-iset__kicker">{t('vocab.ielts.title')}</div>
          <h1 lang="en">{set.title}</h1>
          <p className="vp-lead">{topicName(set, lang)}</p>
        </div>
        {coverOf(set) && <img src={coverOf(set)} alt="" aria-hidden="true" width="96" height="96" />}
      </div>

      <div className="vp-iset__progress">
        <div className="vp-iset__bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        <span>{t('vocab.ielts.progress', { n: String(counts.learned), total: String(total), due: String(counts.due) })}</span>
      </div>

      <div className="vp-iset__actions">
        {review.length > 0 && (
          <button type="button" className="vp-btn" onClick={() => onPractice(review)}>
            <span className="vp-play" aria-hidden="true"><IconPlay /></span>
            {t('vocab.ielts.review', { n: String(review.length) })}
          </button>
        )}
        {fresh.length > 0 && (
          <button type="button" className={`vp-btn${review.length ? ' ghost' : ''}`} onClick={() => onPractice(fresh)}>
            {!review.length && <span className="vp-play" aria-hidden="true"><IconPlay /></span>}
            {t('vocab.ielts.learnNew', { n: String(fresh.length) })}
          </button>
        )}
        {!review.length && !fresh.length && total > 0 && (
          <button type="button" className="vp-btn ghost" onClick={() => onPractice(words)}>{t('vocab.ielts.practiceAll')}</button>
        )}
      </div>
      <p className="vp-iset__hint">{t('vocab.ielts.hint')}</p>

      {loading ? <p className="vp-state">…</p> : (
        <ul className="vp-iset__words">
          {words.map((w) => {
            const st = wordStatus(states?.[vocabKey(w)])
            const tr = (lang === 'kk' ? w.kk : w.ru) || w.ru || ''
            return (
              <li key={w.id}>
                <button type="button" className="vp-spk" onClick={() => speak(w.en)} aria-label={t('vocab.ielts.listen', { word: w.en })}><IconSpeaker /></button>
                <span className="vp-iset__w">
                  <b lang="en">{w.en}</b>
                  {w.ipa && <span className="ipa">/{w.ipa}/</span>}
                  <span className="tr">{tr}</span>
                </span>
                <span className={`vp-iset__st is-${st}`}>{t(`vocab.ielts.st.${st}`)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
