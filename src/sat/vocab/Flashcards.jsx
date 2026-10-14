import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { playTts } from '../../lib/speech.js'
import { plural } from '../../lib/plural.js'
import EmptyState from '../../ielts/ui/EmptyState.jsx'
import { NotesIcon, PlayCircleIcon } from '../icons.jsx'
import { TranslateIcon } from '../../ielts/icons.jsx'
import { NEXT_Q, displayWord } from '../model/vocab.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'

const POS = { v: 'verb', n: 'noun', adj: 'adjective', adv: 'adverb' }

/** Слово вслух: голос Soniox, не ответил — синтез устройства (так делает всё приложение, см. src/lib/speech.js). */
export function say(word) {
  playTts(word, {
    lang: 'en',
    onFail: () => {
      try {
        const u = new window.SpeechSynthesisUtterance(word)
        u.lang = 'en-US'
        window.speechSynthesis.speak(u)
      } catch {
        /* озвучить нечем — карточка работает и без звука */
      }
    },
  })
}

/**
 * Карточки (Figma SAT 18): слово — нажатие или пробел — определение, перевод и пример; дальше одна кнопка «Далее»
 * (B10, прототип b9d1797a: вместо Again / Hard / Good / Easy) — карточка уходит в расписание SM-2 как обычное «Good»
 * (качество 4). Кнопка появляется только после переворота; с клавиатуры — стрелка вправо или Enter.
 * Очередь — сначала повторения, потом новые до дневной цели.
 */
export default function Flashcards({ q, cards, goal, today, busy, onGrade }) {
  const { t, lang } = useI18n()
  const [flipped, setFlipped] = useState(false)
  const word = q.items[0]
  const card = word ? cards[word.id] : null

  // новая карточка — лицом вверх: экран пересоздаёт этот компонент с ключом по слову

  const grade = useCallback((g) => {
    if (!word || busy) return
    onGrade(word.id, g)
  }, [word, busy, onGrade])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target?.closest?.('input, textarea, select, .ih-dialog')) return
      if (e.key === ' ' && !e.target?.closest?.('button')) {
        e.preventDefault()
        setFlipped((f) => !f)
        return
      }
      if (!flipped) return
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.target?.closest?.('button, [role="button"]'))) {
        e.preventDefault()
        grade(NEXT_Q)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flipped, grade])

  const done = Math.min(today, goal)
  return (
    <div className="st-vc">
      <div className="st-vc__progress">
        <b>{t('sat.vc.today', { n: String(done), goal: String(goal) })}</b>
        <div className="st-vc__bar" aria-hidden="true"><i style={{ width: `${Math.round((done / goal) * 100)}%` }} /></div>
        {word && (
          <span className="st-vc__left">{t('sat.vc.left', { due: plural(t, lang, 'sat.vc.reviews', q.due), fresh: plural(t, lang, 'sat.vc.fresh', q.fresh) })}</span>
        )}
      </div>
      {!word ? (
        <EmptyState icon={<TranslateIcon size={28} />} title={t('sat.vc.noneTitle')} text={t('sat.vc.noneText')} />
      ) : (
        <>
          <div
            className={`st-card st-vc__card ${flipped ? 'is-flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={t(flipped ? 'sat.vc.hide' : 'sat.vc.flip')}
            onClick={(e) => {
              if (e.target.closest('.st-vc__say')) return
              setFlipped((f) => !f)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setFlipped((f) => !f)
            }}
          >
            <div className="st-vc__chips">
              <span className="ih-chip ih-chip--sm"><span>{t(`sat.vc.cat.${word.category}`)}</span></span>
              <span className={`st-vc__state ${card ? 'is-review' : 'is-new'}`}>{t(card ? 'sat.vc.review' : 'sat.vc.new')}</span>
              <span className="st-spacer" />
              <button type="button" className="st-vc__say" aria-label={t('sat.vc.say')} title={t('sat.vc.say')} onClick={() => say(displayWord(word.word))}>
                <PlayCircleIcon size={22} />
              </button>
            </div>
            <div className="st-vc__word">
              <b>{displayWord(word.word)}</b>
              {word.pos?.length > 0 && <small>{word.pos.map((p) => POS[p] || p).join(' · ')}</small>}
            </div>
            {flipped ? (
              <div className="st-vc__back">
                <p className="st-vc__def">{word.definition}</p>
                {word.ru && lang === 'ru' && <p className="st-vc__ru">{word.ru}</p>}
                {word.example && <p className="st-vc__ex"><NotesIcon size={18} />{word.example}</p>}
              </div>
            ) : (
              <p className="st-vc__hint">{t('sat.vc.tapToFlip')}</p>
            )}
          </div>
          <div className="st-vc__grades st-vc__next" hidden={!flipped}>
            <button type="button" className="ih-cta" disabled={busy} onClick={() => grade(NEXT_Q)}>
              {t('sat.vc.next')}<ArrowForwardIcon size={18} />
            </button>
          </div>
          <p className="st-muted st-vc__keys">{t('sat.vc.keysNext')}</p>
        </>
      )}
    </div>
  )
}
