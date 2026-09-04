'use client'

// Рендер заданий теста: по одному компоненту на тип задания из банка школы.
//
// Вынесено из PlacementTestPage — теми же компонентами рисует задания пробный
// урок (screens/trial/TrialLessonPage.jsx). Разделены именно рендереры: логика
// «что спросить» у теста и урока разная (у урока — сценарий преподавателя со
// слайдами), а «как показать задание и собрать ответ» обязано совпадать, иначе
// одно и то же задание в двух местах ведёт себя по-разному.

import { useState, useEffect, useRef, useMemo } from 'react'
import { audioUrl } from './engine.js'
import { seededShuffle } from './engine.generated.js'
import { T } from './strings.js'

// Слова для сборки предложения: эталон — ответ без финальной точки (так его
// сравнивает scoreOrderWords в движке).
export function orderWordsOf(item) {
  return item.answer.replace(/\.$/, '').split(' ')
}

// ─── словарь: слово → значение на языке интерфейса ───────────────────────
// Движок ждёт индекс выбранной опции (0..3), −1 — «не знаю», null — пропуск:
// vocabScore считает и попадания, и поправку на угадывание.
export function VocabQuestion({ item, vocab, draft, setDraft, lang }) {
  const gloss = (w) => (vocab[w] && (vocab[w][lang] || vocab[w].en)) || w
  return (
    <>
      <p className="plc-hint">{T(lang, 'meaningOf')}:</p>
      <p className="plc-stem plc-stem--word">{item.w}</p>
      <div className="plc-list">
        {item.options.map((w, i) => (
          <button
            key={w + i}
            type="button"
            className={`plc-opt ${draft.optIndex === i ? 'on' : ''}`}
            onClick={() => setDraft({ optIndex: i })}
          >
            {gloss(w)}
          </button>
        ))}
        <button
          type="button"
          className={`plc-opt plc-opt--idk ${draft.optIndex === -1 ? 'on' : ''}`}
          onClick={() => setDraft({ optIndex: -1 })}
        >
          {T(lang, 'idk')}
        </button>
      </div>
    </>
  )
}

// ─── аудирование: запись + все её вопросы на одном экране ────────────────
export function ListeningGroup({ group, draftFor, setDraftFor, lang }) {
  const [plays, setPlays] = useState(0)
  const ref = useRef(null)
  const max = group.src.playsAllowed || 2
  return (
    <>
      <audio ref={ref} src={audioUrl(group.src.file)} preload="none" />
      <button
        className="plc-audio"
        disabled={plays >= max}
        onClick={() => {
          setPlays((p) => p + 1)
          // Число прослушиваний уходит в лог каждого вопроса записи.
          group.items.forEach((item) => setDraftFor(item.id)({ plays: plays + 1 }))
          ref.current?.play().catch(() => {})
        }}
      >
        {T(lang, 'play')} <span className="plc-plays">{max - plays}</span>
      </button>
      {group.items.map((item, k) => (
        <div key={item.id} className="plc-q">
          <QuestionBody item={item} n={k + 1} draft={draftFor(item.id)} setDraft={setDraftFor(item.id)} lang={lang} />
        </div>
      ))}
    </>
  )
}

// ─── тело задания по типу ────────────────────────────────────────────────
export function QuestionBody({ item, n, media, draft, setDraft, lang }) {
  // Порядок вариантов перемешивается один раз на задание: иначе он менялся бы
  // на каждый рендер, и студент терял бы уже выбранный ответ из виду. Хук
  // стоит до любых ранних выходов — порядок хуков обязан совпадать.
  const order = useMemo(() => {
    if (!item?.options?.length) return []
    const idx = item.options.map((_, i) => i)
    return item.fixedOrder ? idx : seededShuffle(idx, Math.random)
  }, [item])

  if (!item) return null
  const num = n ? `${n}. ` : ''

  if (item.type === 'tfns') return <Tfns item={item} n={n} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'order' && item.steps) return <OrderSteps item={item} n={n} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'order') return <OrderWords item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'bankfill') return <Bankfill item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'match') return <MatchPairs item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.block === 'minpair') return <MinPair item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.block === 'writing') {
    const words = (draft.text || '').trim().split(/\s+/).filter(Boolean).length
    return (
      <>
        <p className="plc-stem">{item.stem}</p>
        <textarea
          className="plc-textarea"
          rows={7}
          value={draft.text || ''}
          onChange={(e) => setDraft({ text: e.target.value })}
        />
        <p className="plc-count">{words} {T(lang, 'minWords')}{item.minWords || ''}</p>
      </>
    )
  }
  if (item.block === 'clip') return <Clip item={item} media={media} draft={draft} setDraft={setDraft} order={order} lang={lang} />

  if (item.options?.length) {
    return (
      <>
        {item.stem && <p className="plc-stem">{num}{item.stem}</p>}
        <div className="plc-list">
          {order.map((oi) => (
            <button
              key={oi}
              type="button"
              className={`plc-opt ${draft.optIndex === oi ? 'on' : ''}`}
              onClick={() => setDraft({ optIndex: oi, shownOrder: order })}
            >
              {item.options[oi].t}
            </button>
          ))}
        </div>
      </>
    )
  }

  // Открытый ответ: cloze_open, wform, transform, open_short.
  return (
    <>
      <p className="plc-stem">{num}{item.stem}</p>
      {item.keyword && <p className="plc-hint">{item.keyword}</p>}
      <input
        className="plc-input"
        value={draft.text || ''}
        onChange={(e) => setDraft({ text: e.target.value })}
        autoComplete="off"
        spellCheck="false"
        aria-label="answer"
      />
    </>
  )
}

// Верно / Неверно / Не сказано — строка на каждое утверждение.
function Tfns({ item, n, draft, setDraft, lang }) {
  const answers = draft.answers || []
  const set = (k, v) => {
    const next = answers.slice()
    next[k] = v
    setDraft({ answers: next })
  }
  return (
    <>
      <p className="plc-stem">{n ? `${n}. ` : ''}{T(lang, 'tfnsHint')}</p>
      {item.statements.map((st, k) => (
        <div key={k} className="plc-tf">
          <span className="plc-tf__text">{st.t}</span>
          <span className="plc-tf__btns">
            {['T', 'F', 'NS'].map((v) => (
              <button
                key={v}
                type="button"
                className={`plc-tf__btn ${answers[k] === v ? 'on' : ''}`}
                onClick={() => set(k, v)}
              >
                {T(lang, v === 'T' ? 'tfT' : v === 'F' ? 'tfF' : 'tfNS')}
              </button>
            ))}
          </span>
        </div>
      ))}
    </>
  )
}

// События записи в услышанном порядке: клик добавляет в последовательность,
// повторный клик — убирает.
function OrderSteps({ item, n, draft, setDraft, lang }) {
  const shuffled = useMemo(() => seededShuffle(item.steps.slice(), Math.random), [item])
  const seq = draft.seq || []
  return (
    <>
      <p className="plc-stem">{n ? `${n}. ` : ''}{item.stem || T(lang, 'orderSeqHint')}</p>
      <div className="plc-list">
        {shuffled.map((step) => {
          const at = seq.indexOf(step)
          return (
            <button
              key={step}
              type="button"
              className={`plc-opt ${at >= 0 ? 'on' : ''}`}
              onClick={() =>
                setDraft({ seq: at >= 0 ? seq.filter((x) => x !== step) : [...seq, step] })
              }
            >
              {at >= 0 && <b className="plc-seqn">{at + 1}</b>}{step}
            </button>
          )
        })}
      </div>
    </>
  )
}

// Сборка предложения из слов (интерактивная грамматика).
function OrderWords({ item, draft, setDraft, lang }) {
  const words = useMemo(() => seededShuffle(orderWordsOf(item), Math.random), [item])
  const arr = draft.arr || []
  return (
    <>
      <p className="plc-stem">{T(lang, 'orderHint')}</p>
      <div className="plc-slots">
        {arr.length ? (
          arr.map((w, k) => (
            <button
              key={w + k}
              type="button"
              className="plc-tile on"
              onClick={() => setDraft({ arr: arr.filter((_, j) => j !== k) })}
            >
              {w}
            </button>
          ))
        ) : (
          <span className="plc-slots__empty">{T(lang, 'orderYour')}</span>
        )}
      </div>
      <div className="plc-bank">
        {words.map((w, i) => {
          // Повторяющиеся слова различаем позицией: i-я копия слова занята,
          // когда в собранном уже лежит не меньше копий, чем её номер.
          const copyNo = words.slice(0, i + 1).filter((x) => x === w).length
          const used = arr.filter((x) => x === w).length >= copyNo
          return (
            <button
              key={w + i}
              type="button"
              className={`plc-tile ${used ? 'used' : ''}`}
              disabled={used}
              onClick={() => setDraft({ arr: [...arr, w] })}
            >
              {w}
            </button>
          )
        })}
      </div>
      {arr.length > 0 && (
        <button className="plc-ghost plc-reset" onClick={() => setDraft({ arr: [] })}>{T(lang, 'reset')}</button>
      )}
    </>
  )
}

// Заполнение пропусков словами из набора: слово встаёт в первый пустой
// пропуск, клик по заполненному пропуску освобождает его.
export function Bankfill({ item, draft, setDraft, lang }) {
  const gaps = draft.gaps || []
  const parts = useMemo(() => item.text.split(/__(\d)__/), [item])
  const put = (w) => {
    const next = gaps.slice()
    const free = item.answers.findIndex((_, k) => !next[k])
    if (free < 0) return
    next[free] = w
    setDraft({ gaps: next })
  }
  const clear = (k) => {
    const next = gaps.slice()
    next[k] = undefined
    setDraft({ gaps: next })
  }
  return (
    <>
      <p className="plc-stem">{T(lang, 'bankfillHint')}</p>
      <p className="plc-bftext">
        {parts.map((part, i) =>
          i % 2 === 0 ? (
            <span key={i}>{part}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={`plc-gap ${gaps[+part - 1] ? 'on' : ''}`}
              onClick={() => clear(+part - 1)}
            >
              {gaps[+part - 1] || part}
            </button>
          ),
        )}
      </p>
      <div className="plc-bank">
        {item.bankWords.map((w, i) => {
          const copyNo = item.bankWords.slice(0, i + 1).filter((x) => x === w).length
          const used = gaps.filter((x) => x === w).length >= copyNo
          return (
            <button
              key={w + i}
              type="button"
              className={`plc-tile ${used ? 'used' : ''}`}
              disabled={used}
              onClick={() => put(w)}
            >
              {w}
            </button>
          )
        })}
      </div>
    </>
  )
}

// Соединение пар: элемент слева, затем его пара справа.
function MatchPairs({ item, draft, setDraft, lang }) {
  const [sel, setSel] = useState(null)
  const rights = useMemo(() => seededShuffle(item.pairs.map((_, i) => i), Math.random), [item])
  const map = draft.map || []
  const pickRight = (ri) => {
    if (sel == null) return
    const next = map.slice()
    // Правая часть одна на связь: выбор снимает её с прежней левой.
    const prev = next.indexOf(ri)
    if (prev >= 0) next[prev] = undefined
    next[sel] = ri
    setDraft({ map: next })
    setSel(null)
  }
  return (
    <>
      <p className="plc-stem">{T(lang, 'matchHint')}</p>
      <div className="plc-match">
        <div className="plc-match__col">
          {item.pairs.map(([l], i) => (
            <button
              key={i}
              type="button"
              className={`plc-opt ${sel === i ? 'sel' : ''} ${map[i] != null ? 'on' : ''}`}
              onClick={() => setSel(i === sel ? null : i)}
            >
              {map[i] != null && <b className="plc-seqn">{rights.indexOf(map[i]) + 1}</b>}{l}
            </button>
          ))}
        </div>
        <div className="plc-match__col">
          {rights.map((ri, k) => (
            <button
              key={ri}
              type="button"
              className={`plc-opt ${map.includes(ri) ? 'on' : ''}`}
              onClick={() => pickRight(ri)}
            >
              <b className="plc-seqn">{k + 1}</b>{item.pairs[ri][1]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// Видеоклип с вариантами: файл приходит из манифеста (сам item несёт только
// source), лимит воспроизведений — как в бандле.
function Clip({ item, media, draft, setDraft, order, lang }) {
  const [plays, setPlays] = useState(0)
  const ref = useRef(null)
  const max = media?.playsAllowed || 2
  return (
    <>
      {item.stem && <p className="plc-stem">{item.stem}</p>}
      <video ref={ref} className="plc-video" src={audioUrl(media?.file)} preload="metadata" playsInline />
      <button
        className="plc-audio"
        disabled={plays >= max}
        onClick={() => {
          setPlays((p) => p + 1)
          setDraft({ plays: plays + 1 })
          ref.current?.play().catch(() => {})
        }}
      >
        {T(lang, 'play')} <span className="plc-plays">{max - plays}</span>
      </button>
      <div className="plc-list">
        {order?.map((oi) => (
          <button
            key={oi}
            type="button"
            className={`plc-opt ${draft.optIndex === oi ? 'on' : ''}`}
            onClick={() => setDraft({ optIndex: oi, shownOrder: order })}
          >
            {item.options[oi].t}
          </button>
        ))}
      </div>
    </>
  )
}

// Минимальные пары: два слова, одно прозвучало. Порядок пары перемешан —
// иначе правильный ответ всегда стоял бы первой кнопкой и блок можно было бы
// закрыть не слушая. Файлов озвучки в бандле пока нет — как и он, падаем на
// синтез речи браузера.
export function MinPair({ item, draft, setDraft, lang }) {
  const opts = useMemo(() => seededShuffle([item.word, item.distractor], Math.random), [item])
  const say = () => {
    const a = new Audio(audioUrl(item.file))
    a.play().catch(() => {
      try {
        const u = new SpeechSynthesisUtterance(item.sentence || item.word)
        u.lang = 'en-GB'
        speechSynthesis.cancel()
        speechSynthesis.speak(u)
      } catch {
        /* нет синтеза — студент отвечает по написанию */
      }
    })
  }
  return (
    <>
      <p className="plc-stem">{T(lang, 'introMinpair')}</p>
      <button className="plc-audio" onClick={say}>{T(lang, 'play')}</button>
      <div className="plc-list">
        {opts.map((w, i) => (
          <button
            key={w}
            type="button"
            className={`plc-opt ${draft.optIndex === i ? 'on' : ''}`}
            // Пишем и само слово: варианты перемешаны на клиенте, по индексу
            // сервер ответ не перепроверит.
            onClick={() => setDraft({ optIndex: i, word: w, fraction: w === item.word ? 1 : 0 })}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── говорение: запись с микрофона, последний раздел полного варианта ────
// Порт recordItem/sectionSpeaking из бандла: RMS-метр считает секунды живой
// речи, SpeechRecognition (если есть) снимает транскрипт, жёсткий стоп 35с.
// Без микрофона раздел пропускается с флагом speaking_skipped — как в бандле.
// Вся механика записи — в модульной функции: у неё есть таймеры и Date.now(),
// которым не место в теле компонента.
