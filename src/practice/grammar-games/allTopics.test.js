// @vitest-environment jsdom
//
// Критерий приёмки ТЗ №5: во всех 125 темах каждая игра проходится до экрана
// результата без ошибок. Темы — настоящие, из прототипа методиста
// (data/jtsgrammar-games.html), движок — порт. Решатель отвечает верно, читая
// ответ из состояния игры (snapshot().R), и крутит фальшивые часы: таймеры,
// интервал «Гонки» и кадры «Лови правильное».
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mountGrammarGames } from './engine.js'
import { stagesOf } from './stages.js'

const HTML = path.join(__dirname, '..', '..', '..', 'data', 'jtsgrammar-games.html')
const lines = fs.readFileSync(HTML, 'utf8').split(/\r?\n/)
const literal = (name) => JSON.parse(lines.find((l) => l.startsWith(`const ${name}=`)).slice(`const ${name}=`.length).replace(/;\s*$/, ''))
const LEVELS = literal('LEVELS')
const PROGRAM = literal('PROGRAM')
const TOPICS = literal('TOPICS')
const index = {
  levels: LEVELS,
  program: PROGRAM,
  topics: TOPICS.map((tp) => ({ id: tp.id, lv: tp.lv, n: tp.n, icon: tp.icon, color: tp.color, title: tp.title, sub: tp.sub, games: stagesOf(tp) })),
}
const BODY = Object.fromEntries(TOPICS.map((tp) => [tp.id, tp]))

let errors = []
const onError = (e) => errors.push(e.message || String(e.error))
beforeAll(() => window.addEventListener('error', onError))
afterAll(() => window.removeEventListener('error', onError))

// Один ход решателя: верный ответ, если игра его сейчас ждёт; сколько крутить часы после него.
function step(g, R, root) {
  const $ = (sel) => root.querySelector(sel)
  const $$ = (sel) => [...root.querySelectorAll(sel)]
  const click = (el) => el && el.click()
  const okOpt = (item) => $(`#o${item.opts.findIndex((o) => o.ok)}`)
  switch (g) {
    case 'pick': case 'trans': case 'listen':
      if (!R.lock) click(okOpt(R.items[R.i]))
      return 2500
    case 'boss':
      if (!R.lock) click(okOpt(R.items[R.i % R.items.length]))
      return 2200
    case 'match': {
      if (R.lock || R.open.length) return 500
      const p = R.cards.find((c, k) => !R.done.has(k)).p
      for (const side of [0, 1]) click($$('.mc')[R.cards.findIndex((c) => c.p === p && c.side === side)])
      return 500
    }
    case 'sort': {
      const k = R.items.findIndex((x, i) => !R.placed.includes(i))
      if (k < 0) return 600
      click($$('.chip2').find((b) => JSON.parse(b.dataset.args)[0] === k))
      click($$('.bucket')[R.items[k].c])
      return 600
    }
    case 'build': {
      if (R.solved || R.sel.length) return 1400
      const used = new Set()
      for (const w of R.target) {
        const k = R.pool.findIndex((p, i) => !used.has(i) && !p.extra && p.w === w)
        used.add(k)
        click($$('.bub')[k])
      }
      click($('[data-act="bcheck"]'))
      return 1400
    }
    case 'fix': {
      const it = R.items[R.i]
      if (R.step === 0) click($$('.sentence .word')[it.w])
      if (R.step === 1) click($(`#fo${R.opts.indexOf(it.c)}`))
      return 1500
    }
    case 'place':
      if (!R.lock) click($$('.zone').find((z) => JSON.parse(z.dataset.args)[0] === R.items[R.i].z))
      return 1400
    case 'type': {
      const inp = $('#tin')
      if (inp && !inp.disabled) {
        inp.value = R.items[R.i].a
        click($('[data-act="typeCheck"]'))
      }
      return 1400
    }
    case 'dialog': {
      const l = R.items[R.i]
      if (l && l.a && !R.lock && $('.chatopts')) click($(`#o${R.opts.indexOf(l.a)}`))
      return 2700
    }
    case 'race':
      if (!R.started) click($('[data-act="raceGo"]'))
      else if (!R.lock && !R.ending) click($(R.items[R.i].truth ? '#bt' : '#bf'))
      return 600
    case 'catch':
      if (!R.clouds) click($('[data-act="catchGo"]'))
      else for (const c of R.clouds) if (!c.dead && c.ok) c.el.click()
      return 100
  }
  throw new Error(`нет решателя для ${g}`)
}

describe('каждая игра каждой из 125 тем доходит до результата', () => {
  it('прототип — 125 тем', () => {
    expect(TOPICS).toHaveLength(125)
  })

  for (const tp of TOPICS) {
    it(`${tp.id} — ${tp.title.ru}`, async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
      errors = []
      const consoleError = vi.spyOn(console, 'error')
      const host = document.createElement('div')
      document.body.append(host)
      const shadow = host.attachShadow({ mode: 'open' })
      shadow.innerHTML = '<div class="gg"></div>'
      const root = shadow.querySelector('.gg')
      const results = []
      const api = mountGrammarGames(root, {
        index,
        progress: {},
        loadTopic: async (id) => BODY[id],
        loadGloss: async () => ({}),
        onResult: (topicId, game, stars) => {
          results.push([game, stars])
          return null
        },
        asset: { img: (n) => `/img/${n}.webp`, emoji: (c) => `/e/${c}`, emojiList: [] },
        lang: 'ru',
        level: tp.lv,
      })
      try {
        await api.go('topic', tp.id)
        for (const g of stagesOf(tp)) {
          await api.go('game', g)
          const limit = g === 'catch' ? 900 : 400
          let n = 0
          while (api.snapshot().view !== 'result' && n++ < limit) {
            const wait = step(g, api.snapshot().R, root)
            vi.advanceTimersByTime(wait)
          }
          expect(api.snapshot().view, `${tp.id} · ${g}`).toBe('result')
        }
        expect(results.map(([g]) => g)).toEqual(stagesOf(tp))
        // Верные ответы — три звезды; «Лови правильное» — по числу пойманных облаков, но не ноль.
        for (const [g, stars] of results) expect(stars, `${tp.id} · ${g}`).toBe(g === 'catch' ? Math.max(1, stars) : 3)
        expect(errors).toEqual([])
        expect(consoleError).not.toHaveBeenCalled()
      } finally {
        api.destroy()
        host.remove()
        consoleError.mockRestore()
        vi.useRealTimers()
      }
    }, 60_000)
  }
})
