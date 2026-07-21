import { useState, useEffect, useRef } from 'react'

// Общие детали заданий Словаря.
//
// Контракт задания: компонент получает { item, ctx }.
//   item = { type, w, pool }            — слово-цель и набор для отвлекающих
//   ctx  = { T, lang, scope, S, speak, sfx, buzz, grade, correct, wrong,
//            distractors, tr, altTr, advance, groupWin }
// Задание само решает, когда ответ дан, и зовёт ctx.correct / ctx.wrong
// (одиночные) либо ctx.groupWin (групповые: match/memory/dragmatch).

// Премиальная иллюстрация слова — слои, свечение, искры (illusHTML прототипа).
export function Illus({ w, cls = '' }) {
  if (w.img) {
    return (
      <div className={`v-illus v-cine ${cls}`}>
        <div className="v-ph-img" style={{ backgroundImage: `url('${w.img}')` }} />
        <div className="v-scrim" />
        <div className="v-emo-badge">{w.emo}</div>
      </div>
    )
  }
  return (
    <div className={`v-illus v-scene v-premium ${cls}`}>
      <span className="v-halo" />
      <span className="v-glow" />
      <span className="v-orb v-o1" />
      <span className="v-orb v-o2" />
      <span className="v-orb v-o3" />
      <span className="v-spark v-s1">✦</span>
      <span className="v-spark v-s2">✦</span>
      <span className="v-spark v-s3">✦</span>
      <div className="v-shine" />
      <div className="v-emo">{w.emo}</div>
    </div>
  )
}

// Кнопка «прослушать» с индикацией проигрывания.
export function SpeakBtn({ text, ctx, className = 'v-spk', children = '🔊', ...rest }) {
  const [playing, setPlaying] = useState(false)
  return (
    <button
      type="button"
      className={`${className}${playing ? ' v-playing' : ''}`}
      aria-label={ctx.T.listen}
      onClick={() => ctx.speak(text, { onStart: () => setPlaying(true), onEnd: () => setPlaying(false) })}
      {...rest}
    >
      {children}
    </button>
  )
}

// Однократное озвучивание при появлении задания (прототип делал setTimeout).
export function useAutoSpeak(text, ctx, delay = 140) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    const id = setTimeout(() => ctx.speak(text), delay)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/* ─────────────── «Выбери один из четырёх» ───────────────
   Общая механика семи заданий прототипа (choose, listen, imagepick, defmatch,
   context, dialogue, collocation): 4 варианта, после клика верный подсвечивается
   зелёным, ошибочный — красным, остальные гаснут. Отличаются только стимулом
   и содержимым кнопок, поэтому здесь один компонент вместо семи копий. */
export function PickOne({ ask, small, prompt, options, grid, onPicked, ctx, w, wrongAnswer }) {
  const [picked, setPicked] = useState(null)

  const choose = (opt) => {
    if (picked) return
    ctx.sfx('tap')
    setPicked(opt)
    const ok = !!opt.correct
    onPicked && onPicked(ok, opt)
    ctx.grade(w, ok, false)
    if (ok) ctx.correct(w)
    else ctx.wrong(w, wrongAnswer)
  }

  const cls = (opt) => {
    if (!picked) return ''
    if (opt.correct) return ' v-right'
    if (opt === picked) return ' v-wrong'
    return ' v-dim'
  }

  return (
    <>
      <div className="v-q-ask">
        {ask}
        {small && <small>{small}</small>}
      </div>
      {prompt}
      <div className={grid ? 'v-imggrid' : 'v-opts'}>
        {options.map((o, i) => (
          <button
            key={o.key ?? i}
            type="button"
            className={(grid ? 'v-imgtile' : 'v-choice') + cls(o)}
            disabled={!!picked}
            onClick={() => choose(o)}
          >
            {o.node}
          </button>
        ))}
      </div>
    </>
  )
}

// 4 варианта: цель + 3 отвлекающих, перемешанные (как в прототипе).
export function buildOptions(w, item, ctx, render) {
  const opts = ctx.shuffle([w, ...ctx.distractors(w, 3, item.pool)])
  return opts.map((o) => ({ key: o.id, correct: o.id === w.id, word: o, node: render(o) }))
}
