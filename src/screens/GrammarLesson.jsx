import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '../i18n.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { loadGrammarLevel } from '../practice/grammar/grammarData.js'
import { uiStr } from '../practice/grammar/strings.js'
import RichBlock from '../practice/grammar/RichContent.jsx'
import ActivityPlayer from '../practice/grammar/ActivityPlayer.jsx'

// Экран урока грамматики (полноэкранный takeover внутри LearningLayout).
// Три вкладки — Теория (карусель блоков) / Примеры / Практика (движок упражнений).
// Тяжёлый контент уровня подгружается по требованию и кэшируется в grammarData.

const TABS = [{ key: 'theory' }, { key: 'examples' }, { key: 'practice' }]

// Блок теории считается «примером», если несёт разговор/ситуации/разбор/таблицу
// примеров — по классам внутри HTML или по смыслу заголовка. Раздельной вкладки
// «Примеры» в источнике нет — собираем её из этих блоков (см. отчёт).
function isExampleBlock(b) {
  const h = b.html || ''
  // Классы в извлечённом HTML префиксованы g- (см. extract-grammar.js).
  if (/class="[^"]*\bg-(chat|sits|breakdown)\b/.test(h)) return true
  if (/<summary>[^<]*example/i.test(h)) return true
  return /example|conversation|real-life|situation|context|breakdown|everyday/i.test(b.title || '')
}

export default function GrammarLesson({ level, units, unit, token, onExit, onOpenUnit }) {
  const { lang } = useI18n()
  const [data, setData] = useState(null) // {learn, learnTr, activities}
  const [error, setError] = useState(false)
  const [tab, setTab] = useState('theory')
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    setTab('theory')
    setSlide(0)
    // Каталог мог быть прокручен — урок открываем с начала.
    window.scrollTo({ top: 0 })
    loadGrammarLevel(level)
      .then((lvl) => {
        if (!alive) return
        const u = lvl && lvl.units ? lvl.units[unit.id] : null
        if (u) setData(u)
        else setError(true)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [level, unit.id])

  // Следующий урок — по порядку юнитов уровня.
  const nextUnit = useMemo(() => {
    if (!units) return null
    const i = units.findIndex((u) => u.id === unit.id)
    return i >= 0 && i < units.length - 1 ? units[i + 1] : null
  }, [units, unit.id])

  const exampleBlocks = useMemo(
    () => (data ? data.learn.map((b, i) => ({ b, i })).filter((x) => isExampleBlock(x.b)) : []),
    [data],
  )

  return (
    <div className="gr-lesson">
      {/* Крошки: назад к каталогу + Unit N / Грамматика */}
      <div className="gr-lesson__bar">
        <button className="gr-back" onClick={onExit}>
          <ChevronLeftIcon size={18} /> {uiStr(lang, 'nav_back')}
        </button>
        <div className="gr-lesson__crumb">
          <b>Unit {unit.id}</b>
          <span>{uiStr(lang, 'crumb_grammar')}</span>
        </div>
      </div>

      {/* Панель вкладок (выход из урока — «Назад» в крошках выше) */}
      <div className="gr-lesson__toolbar">
        <div className="gr-tabs">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              className={`gr-tab ${tab === tb.key ? 'on' : ''}`}
              onClick={() => setTab(tb.key)}
            >
              {uiStr(lang, 'tab_' + tb.key)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="gr-note gr-note--err">{uiStr(lang, 'lesson_error')}</div>}
      {!data && !error && <div className="gr-loading">{uiStr(lang, 'lesson_loading')}</div>}

      {data && tab === 'theory' && (
        <Theory
          unit={unit}
          learn={data.learn}
          learnTr={data.learnTr}
          lang={lang}
          slide={slide}
          setSlide={setSlide}
          onFinish={() => setTab('practice')}
        />
      )}

      {data && tab === 'examples' && (
        <Examples unit={unit} blocks={exampleBlocks} learnTr={data.learnTr} lang={lang} />
      )}

      {data && tab === 'practice' && (
        <ActivityPlayer
          activities={data.activities}
          unitTitle={unit.title}
          lang={lang}
          token={token}
          onExit={onExit}
          onNextLesson={nextUnit ? () => onOpenUnit(nextUnit) : null}
        />
      )}
    </div>
  )
}

// ——— Теория: карусель блоков с точками и «Дальше» ———
function Theory({ unit, learn, learnTr, lang, slide, setSlide, onFinish }) {
  const total = learn.length
  const cur = Math.min(slide, total - 1)
  const block = learn[cur]
  const last = cur === total - 1

  return (
    <div className="gr-theory">
      {/* Шапка юнита — только на первом слайде (как в дизайне) */}
      {cur === 0 && (
        <div className="gr-lhero">
          <span className="gr-lhero__badge">UNIT {unit.id}</span>
          <h1 dangerouslySetInnerHTML={{ __html: unit.title }} />
          <p dangerouslySetInnerHTML={{ __html: unit.desc }} />
        </div>
      )}

      <div className="gr-slide">
        <RichBlock block={block} tr={learnTr[cur]} lang={lang} />
      </div>

      <div className="gr-dots" role="tablist" aria-label={uiStr(lang, 'theory_slides')}>
        {learn.map((_, i) => (
          <button
            key={i}
            className={`gr-dot ${i === cur ? 'on' : ''}`}
            aria-label={`Слайд ${i + 1}`}
            aria-selected={i === cur}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>

      <div className="gr-slide-nav">
        {cur > 0 && (
          <button className="gr-btn gr-btn--soft" onClick={() => setSlide(cur - 1)}>
            {uiStr(lang, 'nav_back')}
          </button>
        )}
        <button
          className="gr-btn gr-btn--primary"
          onClick={() => (last ? onFinish() : setSlide(cur + 1))}
        >
          {last ? uiStr(lang, 'theory_to_practice') : uiStr(lang, 'theory_next')}
        </button>
      </div>
    </div>
  )
}

// ——— Примеры: модельные предложения + блоки-примеры из теории ———
function Examples({ unit, blocks, learnTr, lang }) {
  return (
    <div className="gr-examples">
      <div className="gr-block">
        <h2 className="gr-block__h">{uiStr(lang, 'examples_model')}</h2>
        {/* классы g-* — как в извлечённом HTML (см. extract-grammar.js) */}
        <div className="gr-rich">
          <div className="g-chat">
            <div className="g-msg g-a" dangerouslySetInnerHTML={{ __html: unit.exA }} />
            <div className="g-msg g-b" dangerouslySetInnerHTML={{ __html: unit.exB }} />
          </div>
        </div>
      </div>

      {blocks.length ? (
        blocks.map(({ b, i }) => <RichBlock key={i} block={b} tr={learnTr[i]} lang={lang} />)
      ) : (
        <div className="gr-note">{uiStr(lang, 'examples_more')}</div>
      )}
    </div>
  )
}
