import { useCallback, useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'
import { initVoices, speak as ttsSpeak } from '../practice/vocab/audio.js'
import {
  getVocabCatalog,
  getVocabScope,
  openLessonVocab,
  saveStudentVocab,
  deleteStudentVocabWord,
} from '../api.js'
import VocabPractice from './vocab/VocabPractice.jsx'
import { topVocabMisses } from './vocab/vocabMisses.js'
import { learnedCount } from './vocab/vocabLearned.js'
import { IconSpeaker, IconPlay, IconRefresh, IconTrash, IconX } from './vocab/VocabIcons.jsx'

const vocabLang = (lang) => (lang === 'kk' ? 'kk' : 'ru')

function lessonOf(scope, no) {
  if (!scope?.lessons) return null
  return scope.lessons[String(no)] || scope.lessons[no] || null
}

function cardsOf(lesson) {
  return Array.isArray(lesson?.cards) ? lesson.cards : []
}

function exampleHtml(card) {
  const raw = card.example || card.ex || ''
  if (!raw) return ''
  const word = card.en || ''
  return String(raw)
    .replace(/\{\{(.+?)\}\}/g, '<mark>$1</mark>')
    .replace(/___+/g, word ? `<mark>${word}</mark>` : '___')
}

function trOf(card, lang) {
  if (!card) return ''
  if (lang === 'kk') {
    return card.kk || card.translationKz || card.ru || card.translationRu || ''
  }
  return card.ru || card.translationRu || card.kk || card.translationKz || ''
}

const CAT_ORDER = ['tech', 'biz', 'health', 'science']

export default function VocabularyPage({ userLevel = 'A1', userName, token, onNav, onProfile, isDemoAccount }) {
  const { lang, t } = useI18n()
  const vlang = vocabLang(lang)
  const [screen, setScreen] = useState('home')
  const [index, setIndex] = useState(null)
  const [indexError, setIndexError] = useState(false)
  const [indexLoading, setIndexLoading] = useState(!!token)
  const [scope, setScope] = useState(null)
  const [scopeMeta, setScopeMeta] = useState(null)
  const [activeLevel, setActiveLevel] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [mine, setMine] = useState(null)
  const [practiceCards, setPracticeCards] = useState(null)
  const [practiceTitle, setPracticeTitle] = useState('')
  const [practiceBack, setPracticeBack] = useState('lesson')
  const [practiceScopeId, setPracticeScopeId] = useState(null)
  const [toast, setToast] = useState('')
  const [topMiss, setTopMiss] = useState([])
  const [learnedTick, setLearnedTick] = useState(0)

  const refreshTopMiss = useCallback(() => {
    setTopMiss(topVocabMisses(token, 3))
  }, [token])

  useEffect(() => {
    refreshTopMiss()
  }, [refreshTopMiss, screen])

  const flash = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  const speak = useCallback(
    (text) => {
      initVoices()
      ttsSpeak(text, { onNoVoice: () => flash(t('vocab.lesson.noVoice')) })
    },
    [flash, t],
  )

  useEffect(() => {
    initVoices()
  }, [])

  useEffect(() => {
    if (!token) {
      setIndexLoading(false)
      return
    }
    let alive = true
    setIndexLoading(true)
    getVocabCatalog(token, (data) => {
      if (!alive) return
      setIndex(data)
      setIndexError(false)
      setIndexLoading(false)
    })
      .then((data) => {
        if (!alive) return
        setIndex(data)
        setIndexError(false)
        setIndexLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setIndex(null)
        setIndexError(true)
        setIndexLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let alive = true
    openLessonVocab('saved', token, (data) => {
      if (alive) setMine(data)
    })
      .then((data) => {
        if (alive) setMine(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const loadScope = (id, meta, levelId) => {
    if (!token) return
    const apply = (data) => {
      setScope(data)
      setScopeMeta(meta || { id })
      setActiveLevel(levelId || meta?.id || null)
      setScreen(meta?.kind === 'field' ? 'field-lessons' : 'levels')
    }
    getVocabScope(token, id, apply)
      .then(apply)
      .catch(() => flash(t('vocab.home.empty')))
  }

  const openMine = () => {
    if (!token) return
    const apply = (data) => {
      setMine(data)
      setScreen('mine')
    }
    openLessonVocab('saved', token, apply)
      .then(apply)
      .catch(() => flash(t('vocab.lesson.error')))
  }

  const startPractice = (cards, title, backScreen = 'lesson', scopeId = null) => {
    setPracticeCards(cards)
    setPracticeTitle(title || t('vocab.practiceTitle'))
    setPracticeBack(backScreen)
    setPracticeScopeId(scopeId)
    setScreen('practice')
  }

  const entitlement = usePracticeEntitlement('vocab', token)
  const shell = (children) => (
    <LearningLayout userName={userName} userLevel={userLevel} active="vocab" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="vp">
        {children}
        {toast ? <div className="v-toast v-show"><span>{toast}</span></div> : null}
      </div>
    </LearningLayout>
  )

  if (!entitlement.loading && !entitlement.allowed) {
    return shell(<PracticeLimitScreen limit={entitlement.limit} onBack={() => onNav?.('practice')} isDemoAccount={isDemoAccount} source={entitlement.source} sourceName={entitlement.sourceName} />)
  }

  if (screen === 'practice' && practiceCards) {
    return shell(
      <VocabPractice
        cards={practiceCards}
        lang={vlang}
        title={practiceTitle}
        token={token}
        scopeId={practiceScopeId}
        onExit={() => {
          refreshTopMiss()
          setLearnedTick((n) => n + 1)
          setScreen(practiceBack)
        }}
        speak={speak}
      />,
    )
  }

  if (screen === 'lesson' && lesson) {
    return shell(
      <LessonWords
        t={t}
        lang={vlang}
        lesson={lesson}
        meta={scopeMeta}
        speak={speak}
        onBack={() => setScreen(scopeMeta?.kind === 'field' ? 'field-lessons' : 'levels')}
        onPractice={() => startPractice(cardsOf(lesson), lesson.title, 'lesson', scopeMeta?.id || activeLevel || null)}
      />,
    )
  }

  if (screen === 'mine') {
    return shell(
      <MineScreen
        t={t}
        lang={vlang}
        session={mine}
        token={token}
        speak={speak}
        flash={flash}
        onBack={() => setScreen('home')}
        onChanged={setMine}
        onPractice={() => {
          const cards = (mine?.words || []).map((w) => ({
            id: w.id,
            en: w.word,
            ru: w.translationRu,
            kk: w.translationKz,
            ipa: w.ipa,
            example: '',
          }))
          startPractice(cards, t('vocab.home.mine'), 'mine')
        }}
      />,
    )
  }

  if ((screen === 'levels' || screen === 'field-lessons') && scope) {
    return shell(
      <BrowseLessons
        t={t}
        lang={vlang}
        index={index}
        scope={scope}
        meta={scopeMeta}
        activeLevel={activeLevel}
        onBack={() => setScreen(scopeMeta?.kind === 'field' ? 'fields' : 'home')}
        onLevel={(lv) => {
          if (scopeMeta?.kind === 'field') {
            setActiveLevel(lv)
            return
          }
          loadScope(lv, { id: lv, name: lv, kind: 'level' }, lv)
        }}
        onOpen={(item) => {
          setLesson(item)
          setScreen('lesson')
        }}
      />,
    )
  }

  if (screen === 'fields') {
    return shell(
      <FieldsScreen
        t={t}
        lang={vlang}
        index={index}
        onBack={() => setScreen('home')}
        onPick={(f) => loadScope(f.id || f.key, { ...f, kind: 'field' })}
      />,
    )
  }

  const levels = index?.levels || []
  const fields = index?.fields || []
  const mineWords = mine?.words || []

  return shell(
    <section className="vp-pad">
      <h1>{t('vocab.home.title')}</h1>
      <p className="vp-lead">{t('vocab.home.pickWay')}</p>
      {indexLoading && <p className="vp-state">…</p>}
      {indexError && !levels.length && !indexLoading && <p className="vp-state">{t('vocab.home.empty')}</p>}

      <div className="vp-sec">
        <div className="vp-sec-hd">
          <div>
            <h2>{t('vocab.home.core')}</h2>
            <p>{t('vocab.home.coreByLevel')}</p>
          </div>
          <button type="button" className="vp-sec-arrow" onClick={() => levels[0] && loadScope(levels[0].id, { ...levels[0], kind: 'level' })} aria-label="more">→</button>
        </div>
        <div className="vp-row">
          {levels.map((lv) => {
            const n = learnedCount(token, lv.id)
            return (
            <button
              type="button"
              key={lv.id}
              className="vp-lvl-card"
              data-lv={lv.id}
              onClick={() => loadScope(lv.id, { ...lv, kind: 'level' })}
            >
              <div className="code">{lv.id}</div>
              <div className="nm">{lv.name}</div>
              <div className={`meta${n === 0 ? ' is-zero' : ''}`}>{t('vocab.learned', { n })}</div>
            </button>
            )
          })}
        </div>
      </div>

      <div className="vp-sec">
        <div className="vp-sec-hd">
          <div>
            <h2>{t('vocab.home.field')}</h2>
            <p>{t('vocab.home.fieldByJob')}</p>
          </div>
          <button type="button" className="vp-sec-arrow" onClick={() => setScreen('fields')} aria-label="more">→</button>
        </div>
        <div className="vp-row">
          {fields.slice(0, 8).map((f) => (
            <button type="button" key={f.id || f.key} className="vp-fld-card" onClick={() => loadScope(f.id || f.key, { ...f, kind: 'field' })}>
              <span className="ic">{f.ic || '◆'}</span>
              <b>{(vlang === 'kk' ? f.kk : f.ru) || f.en || f.key}</b>
              <span className="meta">{t('vocab.home.words', { n: f.cards || f.words || 0 })}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="vp-sec">
        <div className="vp-sec-hd">
          <div>
            <h2>{t('vocab.home.mine')}</h2>
            <p>{t('vocab.home.mineSaved')}</p>
          </div>
          <button type="button" className="vp-sec-arrow" onClick={openMine} aria-label="more">→</button>
        </div>
        <div className="vp-row">
          {mineWords.length === 0 && <p className="vp-state">{t('vocab.lesson.empty')}</p>}
          {mineWords.slice(0, 8).map((w) => (
            <button type="button" key={w.id || w.word} className="vp-mine-chip" onClick={openMine}>
              <b>{w.word}</b>
              <span className="tr">{trOf(w, vlang)}</span>
              <span
                className="vp-spk"
                role="presentation"
                onClick={(e) => { e.stopPropagation(); speak(w.word) }}
              ><IconSpeaker /></span>
            </button>
          ))}
        </div>
      </div>

      {topMiss.length > 0 && (
        <div className="vp-sec">
          <div className="vp-sec-hd">
            <div>
              <h2>{t('vocab.home.top3')}</h2>
              <p>{t('vocab.home.top3Lead')}</p>
            </div>
          </div>
          <div className="vp-top3">
            <div className="vp-top3-hd">
              <span aria-hidden="true"><IconRefresh /></span>
              {t('vocab.prac.review')}
            </div>
            {topMiss.map((w) => (
              <div className="vp-top3-row" key={w.word}>
                <button type="button" className="vp-spk" onClick={() => speak(w.word)} aria-label={t('vocab.lesson.listen')}>
                  <IconSpeaker />
                </button>
                <b>{w.word}</b>
                <span>{vlang === 'kk' ? (w.kk || w.ru) : (w.ru || w.kk)}</span>
              </div>
            ))}
            <button
              type="button"
              className="vp-btn wide"
              style={{ marginTop: 14 }}
              onClick={() => {
                const cards = topMiss.map((w) => ({
                  id: w.word,
                  en: w.word,
                  ru: w.ru,
                  kk: w.kk,
                }))
                startPractice(cards, t('vocab.home.top3'), 'home')
              }}
            >
              <span className="vp-play" aria-hidden="true"><IconPlay /></span>
              {t('vocab.startPractice')}
            </button>
          </div>
        </div>
      )}
    </section>,
  )
}

function FieldsScreen({ t, lang, index, onBack, onPick }) {
  const fields = index?.fields || []
  const groups = useMemo(() => {
    const map = {}
    for (const f of fields) {
      const cat = f.cat || 'other'
      if (!map[cat]) map[cat] = []
      map[cat].push(f)
    }
    const keys = [...CAT_ORDER.filter((c) => map[c]), ...Object.keys(map).filter((c) => !CAT_ORDER.includes(c))]
    return keys.map((k) => ({ cat: k, items: map[k] }))
  }, [fields])
  const nameOf = (f) => (lang === 'kk' ? f.kk : f.ru) || f.en || f.key

  return (
    <section className="vp-pad">
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <h1>{t('vocab.pickField')}</h1>
      <p className="vp-lead">{t('vocab.pickFieldLead')}</p>
      {groups.map((g) => (
        <div className="vp-unit" key={g.cat}>
          <h3>{t(`vocab.cat.${g.cat}`) === `vocab.cat.${g.cat}` ? g.cat : t(`vocab.cat.${g.cat}`)}</h3>
          <div className="vp-fld-grid">
            {g.items.map((f) => (
              <button type="button" key={f.id || f.key} className="vp-fld-card" onClick={() => onPick(f)}>
                <span className="ic">{f.ic || '◆'}</span>
                <b>{nameOf(f)}</b>
                <span className="meta">{t('vocab.home.words', { n: f.cards || f.words || 0 })}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function BrowseLessons({ t, lang, index, scope, meta, activeLevel, onBack, onLevel, onOpen }) {
  const isField = meta?.kind === 'field'
  const levels = index?.levels || []
  const title = isField
    ? ((lang === 'kk' ? meta.kk : meta.ru) || meta.en || meta.id)
    : t('vocab.pickLevel')
  const lead = isField ? t('vocab.fieldLessonsLead') : t('vocab.pickLevelLead')
  const units = scope.units || []

  return (
    <section className="vp-pad">
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <div className="vp-page-hd">
        <div>
          <h1>{title}</h1>
          <p className="vp-lead">{lead}</p>
        </div>
      </div>
      <div className="vp-tabs">
        {levels.map((lv) => (
          <button
            type="button"
            key={lv.id}
            className={`vp-tab${(activeLevel || meta?.id) === lv.id ? ' on' : ''}`}
            onClick={() => onLevel(lv.id)}
          >
            {lv.id}
            <span className="n">{lv.cards || 0}</span>
          </button>
        ))}
      </div>
      {isField && activeLevel && <h3 style={{ margin: '0 0 14px' }}>{t('vocab.levelOf', { id: activeLevel })}</h3>}
      {units.map((unit) => {
        const items = (unit.lessons || []).map((no) => lessonOf(scope, no)).filter(Boolean)
        return (
          <div className="vp-unit" key={unit.no || unit.title}>
            <h3>{unit.title}</h3>
            <div className="vp-lessons">
              {items.map((item) => (
                <button type="button" key={item.no} className="vp-lesson" onClick={() => onOpen(item)}>
                  <div className="body">
                    <div className="kicker">{t('vocab.lessonTag', { n: item.no })}</div>
                    <b>{item.title}</b>
                    <span className="cnt">{t('vocab.home.words', { n: cardsOf(item).length })}</span>
                  </div>
                  <span className="ring">0</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function LessonWords({ t, lang, lesson, meta, speak, onBack, onPractice }) {
  const cards = cardsOf(lesson)
  const source = meta?.kind === 'field'
    ? ((lang === 'kk' ? meta.kk : meta.ru) || meta.en || meta.id)
    : t('vocab.home.core')
  const level = meta?.id || meta?.key || ''

  return (
    <section className="vp-pad">
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <div className="vp-page-hd">
        <div>
          <div className="kicker" style={{ color: 'var(--vp-violet)', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            {t('vocab.lessonTag', { n: lesson.no })}
          </div>
          <h1>{lesson.title}</h1>
        </div>
        <div className="actions">
          <button type="button" className="vp-btn vp-practice-desk" onClick={onPractice} disabled={!cards.length}>
            <span className="vp-play" aria-hidden="true"><IconPlay /></span>
            {t('vocab.startPractice')}
          </button>
        </div>
      </div>
      <div className="vp-words">
        {cards.map((card) => (
          <div className="vp-wcard" key={card.id || card.en}>
            <div className="top">
              <b>{card.en}</b>
              <button type="button" className="vp-spk" onClick={() => speak(card.en)} aria-label="speak"><IconSpeaker /></button>
            </div>
            <div className="tr">{trOf(card, lang)}</div>
            {exampleHtml(card) ? (
              <div className="ex" dangerouslySetInnerHTML={{ __html: exampleHtml(card) }} />
            ) : card.def ? (
              <div className="ex">{card.def}</div>
            ) : null}
            <div className="foot">{source} · {level} · {t('vocab.lesson.lesson')} {lesson.no}</div>
          </div>
        ))}
      </div>
      {cards.length > 0 && (
        <div className="vp-sticky-cta">
          <button type="button" className="vp-btn" onClick={onPractice}>
            <span className="vp-play" aria-hidden="true"><IconPlay /></span>
            {t('vocab.startPractice')}
          </button>
        </div>
      )}
    </section>
  )
}

function MineScreen({ t, lang, session, token, speak, flash, onBack, onChanged, onPractice }) {
  const [openAdd, setOpenAdd] = useState(false)
  const [detail, setDetail] = useState(null)
  const [word, setWord] = useState('')
  const [tr, setTr] = useState('')
  const words = session?.words || []

  const add = () => {
    if (!word.trim() || !tr.trim()) return
    const body = { word: word.trim(), source: 'manual' }
    if (lang === 'kk') body.translationKz = tr.trim()
    else body.translationRu = tr.trim()
    saveStudentVocab(token, body)
      .then(() => openLessonVocab('saved', token))
      .then((next) => {
        onChanged(next)
        setWord('')
        setTr('')
        setOpenAdd(false)
        flash(t('vocab.addOk'))
      })
      .catch(() => flash(t('vocab.addFail')))
  }

  const remove = (id) => {
    deleteStudentVocabWord(token, id)
      .then(() => openLessonVocab('saved', token))
      .then((next) => {
        onChanged(next)
        setDetail(null)
      })
      .catch(() => flash(t('vocab.delFail')))
  }

  return (
    <section className="vp-pad">
      <button type="button" className="vp-back" onClick={onBack}>← {t('vocab.back')}</button>
      <div className="vp-page-hd">
        <div>
          <h1>{t('vocab.home.mine')}</h1>
          <p className="vp-lead">{t('vocab.mineLead')}</p>
        </div>
        <div className="actions">
          <button type="button" className="vp-btn vp-practice-desk" onClick={onPractice} disabled={!words.length}>
            <span className="vp-play" aria-hidden="true"><IconPlay /></span>
            {t('vocab.startPractice')}
          </button>
        </div>
      </div>
      <div className="vp-mine-tools">
        <button type="button" className="vp-btn ghost" onClick={() => setOpenAdd(true)}>{t('vocab.add')}</button>
      </div>
      {!words.length && <p className="vp-state">{t('vocab.lesson.empty')}</p>}
      <div className="vp-words">
        {words.map((w) => (
          <button type="button" className="vp-wcard" key={w.id || w.word} onClick={() => setDetail(w)}>
            <div className="top">
              <b>{w.word}</b>
              <span
                className="vp-spk"
                role="presentation"
                onClick={(e) => { e.stopPropagation(); speak(w.word) }}
              ><IconSpeaker /></span>
            </div>
            <div className="tr">{trOf(w, lang)}</div>
            <div className="foot">{w.source || t('vocab.home.mine')}</div>
          </button>
        ))}
      </div>
      {words.length > 0 && (
        <div className="vp-sticky-cta">
          <button type="button" className="vp-btn" onClick={onPractice}>
            <span className="vp-play" aria-hidden="true"><IconPlay /></span>
            {t('vocab.startPractice')}
          </button>
        </div>
      )}

      {detail && (
        <div className="vp-modal" onClick={() => setDetail(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <div className="mhd">
              <b>{detail.word}</b>
              {detail.id != null && (
                <button type="button" className="icon-btn danger" onClick={() => remove(detail.id)} aria-label="delete"><IconTrash /></button>
              )}
              <button type="button" className="icon-btn" onClick={() => setDetail(null)} aria-label="close"><IconX /></button>
            </div>
            <div className="mlbl">{t('vocab.translation')}</div>
            <div className="mval">{trOf(detail, lang)}</div>
            {(detail.example || detail.ex) && (
              <>
                <div className="mlbl">{t('vocab.example')}</div>
                <div className="mval">{detail.example || detail.ex}</div>
              </>
            )}
            <div className="macts">
              <button type="button" className="vp-btn ghost" onClick={() => speak(detail.word)}>
                <IconSpeaker /> {t('vocab.listenWord')}
              </button>
              <button type="button" className="vp-btn" onClick={() => speak(trOf(detail, lang))}>
                <IconSpeaker /> {t('vocab.listenTr')}
              </button>
            </div>
          </div>
        </div>
      )}

      {openAdd && (
        <div className="vp-modal" onClick={() => setOpenAdd(false)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{t('vocab.add')}</h2>
            <label>{t('vocab.addWord')}</label>
            <input value={word} onChange={(e) => setWord(e.target.value)} />
            <label>{t('vocab.addTr')}</label>
            <input value={tr} onChange={(e) => setTr(e.target.value)} />
            <button type="button" className="vp-btn wide" style={{ marginTop: 16 }} onClick={add}>{t('vocab.save')}</button>
          </div>
        </div>
      )}
    </section>
  )
}
