import { useMemo } from 'react'
import { plural } from '../../lib/plural.js'
import { IconPlay, IconSpeaker } from './VocabIcons.jsx'
import { vocabKey } from './vocabLearned.js'
import { practiceQueue, setCardMeta, wordStatus } from './ieltsVocab.js'
import PhoneBar from './PhoneBar.jsx'

// IELTS Vocabulary в «Словаре» (Figma «IELTS new», раздел «Словарь», 92:6134): полка наборов по темам экзамена и
// экран набора. Данные и прогресс приносит VocabularyPage; здесь только разметка.

const ILLUSTRATED = new Set(['environment', 'education', 'technology', 'health', 'work', 'society', 'culture', 'travel'])

function topicName(set, lang) {
  const tp = set?.topic && typeof set.topic === 'object' ? set.topic : null
  const name = (tp && (lang === 'kk' ? tp.kk : tp.ru)) || ''
  // у подсписков AWL заголовок уже «AWL · Sublist 1» — второй «AWL · …» под ним лишний
  return set?.category === 'awl' ? name.replace(/^AWL\s*·\s*/, '') : name
}

function metaText(t, meta, lang) {
  if (meta.kind === 'done') return t('vocab.ielts.done', { n: String(meta.n), total: String(meta.total) })
  // «2 слова к повторению», а не «2 слов»: число склоняет слово (lib/plural.js)
  if (meta.kind === 'due') return plural(t, lang, 'vocab.ielts.due', meta.n)
  if (meta.kind === 'progress') return t('vocab.ielts.learnedOf', { n: String(meta.n), total: String(meta.total) })
  return t('vocab.home.words', { n: meta.total })
}

/** Полка «IELTS Vocabulary» на главной «Словаря»: карточка темы с иллюстрацией и прогрессом. */

// Картинка раздела: загруженная в web-admin (imageUrl каталога, MinIO), иначе — своя иллюстрация стартовых тем
const coverOf = (x) => x?.imageUrl || (ILLUSTRATED.has(x?.category) ? `/ielts/vocab/${x.category}.webp` : null)

/** Наборы Academic Word List (category «awl») — своя полка под темами: 10 подсписков не должны теснить 8 тем экзамена. */
export const isAwlSet = (s) => s?.category === 'awl'

// onMore — «>» полки: на телефоне это список наборов (IeltsCatalog), на компьютере — первый набор, как раньше.
export function IeltsShelf({ t, lang, sets, summaries, onOpen, onMore, kind = 'topics' }) {
  if (!sets?.length) return null
  const awl = kind === 'awl'
  const title = awl ? t('vocab.ielts.awl.title') : t('vocab.ielts.title')
  return (
    <div className="vp-sec" id={awl ? 'vsec-ielts-awl' : 'vsec-ielts'}>
      <div className="vp-sec-hd">
        <div>
          <h2>{title}</h2>
          <p>{awl ? t('vocab.ielts.awl.sub') : t('vocab.ielts.sub')}</p>
        </div>
        <button type="button" className="vp-sec-arrow" onClick={() => (onMore ? onMore() : onOpen(sets[0]))} aria-label={title}>→</button>
      </div>
      <div className="vp-row">
        {sets.map((s) => {
          const meta = setCardMeta(summaries?.[s.scope], s.questionCount || 0)
          return (
            <button type="button" key={s.id} className="vp-ielts-card" onClick={() => onOpen(s)}>
              <span className="vp-ielts-card__txt">
                <b lang="en">{s.title}</b>
                <span className="nm">{topicName(s, lang)}</span>
                <span className={`meta is-${meta.kind}`}>{metaText(t, meta, lang)}</span>
              </span>
              {coverOf(s) ? (
                <img src={coverOf(s)} alt="" aria-hidden="true" width="84" height="84" loading="lazy" />
              ) : isAwlSet(s) ? (
                // картинки у подсписков нет — номер подсписка: по нему AWL и учат (1 — самые частотные слова)
                <span className="vp-ielts-card__num" aria-hidden="true">{String(s.title || '').replace(/\D+/g, '') || '#'}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Слово в примере подсвечено, как в макете («Carbon <mark>emission</mark>s…»); без разметки — только React-узлы. */
function markWord(text, word) {
  const s = String(text || '')
  const at = word ? s.toLowerCase().indexOf(String(word).toLowerCase()) : -1
  if (at < 0) return s
  return [s.slice(0, at), <mark key="w">{s.slice(at, at + word.length)}</mark>, s.slice(at + word.length)]
}

// «AWL · Sublist 1» → «Sublist 1»: в списке подсписков и на их экране AWL уже сказано вкладкой и надзаголовком.
const awlShort = (title) => String(title || '').replace(/^AWL\s*·\s*/, '')

/** Надпись над названием набора в списке (макет: «40 СЛОВ · В ПРОЦЕССЕ»), регистр — стилем. */
function kickText(t, meta) {
  if (meta.kind === 'done') return t('vocab.ielts.kick.done', { total: String(meta.total) })
  if (meta.kind === 'due') return t('vocab.ielts.kick.due', { total: String(meta.total), n: String(meta.n) })
  if (meta.kind === 'progress') return t('vocab.ielts.kick.progress', { total: String(meta.total) })
  return t('vocab.home.words', { n: meta.total })
}

/**
 * Список наборов IELTS Vocabulary (Figma «Mobile» → «IELTS Vocabulary», кадры 1–2): вкладки «Тематические наборы»
 * и «Academic Word List», строка набора с кольцом изученного. Открывается только с телефона — на компьютере обе
 * полки и так видны на главной «Словаря».
 */
export function IeltsCatalog({ t, lang, sets, summaries, tab, onTab, onBack, onOpen }) {
  const topics = sets.filter((s) => !isAwlSet(s))
  const awlSets = sets.filter(isAwlSet)
  const cur = (tab === 'awl' && awlSets.length) || !topics.length ? 'awl' : 'topics'
  const awl = cur === 'awl'
  const list = awl ? awlSets : topics

  return (
    <section className="vp-pad vp-icat">
      <PhoneBar title={t('vocab.ielts.title')} onBack={onBack} backLabel={t('vocab.back')} />
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <h1>{awl ? t('vocab.ielts.awl.title') : t('vocab.ielts.pick')}</h1>
      <p className="vp-lead">{awl ? t('vocab.ielts.awl.lead', { n: String(awlSets.length) }) : t('vocab.ielts.sub')}</p>
      {topics.length > 0 && awlSets.length > 0 && (
        <div className="vp-seg" role="tablist">
          <button type="button" role="tab" aria-selected={!awl} className={`vp-seg__btn${awl ? '' : ' is-on'}`} onClick={() => onTab('topics')}>
            {t('vocab.ielts.tabTopics', { n: String(topics.length) })}
          </button>
          <button type="button" role="tab" aria-selected={awl} className={`vp-seg__btn${awl ? ' is-on' : ''}`} onClick={() => onTab('awl')}>
            {t('vocab.ielts.tabAwl', { n: String(awlSets.length) })}
          </button>
        </div>
      )}
      <h2 className="vp-icat__h">{awl ? t('vocab.ielts.awl.heading', { n: String(awlSets.length) }) : t('vocab.ielts.topics')}</h2>
      <div className="vp-icat__list">
        {list.map((s) => {
          const total = s.questionCount || 0
          const sum = summaries?.[s.scope]
          const meta = setCardMeta(sum, total)
          const learned = sum?.learned || 0
          const pct = total ? Math.min(100, Math.round((learned / total) * 100)) : 0
          return (
            <button type="button" key={s.id} className={`vp-irow is-${meta.kind}${awl ? ' is-awl' : ''}`} onClick={() => onOpen(s)}>
              {!awl && coverOf(s) ? <img src={coverOf(s)} alt="" aria-hidden="true" width="56" height="56" loading="lazy" /> : null}
              <span className="vp-irow__txt">
                <span className="vp-irow__kick">{awl ? awlShort(s.title) : kickText(t, meta)}</span>
                <b lang="en">{awl ? awlShort(s.title) : s.title}</b>
                <span className="vp-irow__sub">{awl ? t('vocab.home.words', { n: total }) : topicName(s, lang)}</span>
              </span>
              <span className="vp-ring" style={{ '--p': pct }}>{learned}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Экран набора: прогресс, «Повторить» / «Учить новые» и слова со статусом. */
export function IeltsSetScreen({ t, lang, set, words, states, loading, speak, phone, onBack, onPractice }) {
  const total = words.length
  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, due: 0, learned: 0 }
    for (const w of words) c[wordStatus(states?.[vocabKey(w)])]++
    return c
  }, [words, states])
  const review = practiceQueue(words, states, 'review')
  const fresh = practiceQueue(words, states, 'new')
  const pct = total ? Math.round((counts.learned / total) * 100) : 0

  const awl = isAwlSet(set)

  return (
    <section className="vp-pad vp-iset">
      {phone && <PhoneBar title={awl ? t('vocab.ielts.awl.title') : set.title} onBack={onBack} backLabel={t('vocab.back')} />}
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <div className="vp-iset__hd">
        <div>
          {/* Телефон по макету называет вид набора («Тематический набор», «Academic Word List»), а счёт изученного
              ставит строкой под названием — полосы прогресса и подсказки про коробки у него нет. */}
          <div className="vp-iset__kicker">{phone ? (awl ? t('vocab.ielts.awl.title') : t('vocab.ielts.kindTopic')) : t('vocab.ielts.title')}</div>
          <h1 lang="en">{phone && awl ? awlShort(set.title) : set.title}</h1>
          <p className="vp-lead">
            {topicName(set, lang)}
            {phone && total > 0 ? `${topicName(set, lang) ? ' · ' : ''}${t('vocab.ielts.learnedOf', { n: String(counts.learned), total: String(total) })}` : ''}
          </p>
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
                {/* Карточка слова телефона: пример и подпись набора, как на карточках «Словаря». */}
                {phone && w.example ? <span className="vp-iset__ex" lang="en">{markWord(w.example, w.en)}</span> : null}
                {phone && <span className="vp-iset__foot">IELTS · {set.title}</span>}
                <span className={`vp-iset__st is-${st}`}>{t(`vocab.ielts.st.${st}`)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
