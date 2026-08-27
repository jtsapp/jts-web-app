import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { buildGloss, glossLookup, wordByWord } from '../../practice/writing/gloss.js'
import { wordsOf } from '../../practice/writing/engine.js'
import { addMyWord, cachedTranslation, rememberTranslation } from '../../practice/writing/writingStore.js'
import { translateWord } from '../../lib/wordTranslate.js'

// Максимум выделения — как в прототипе и на сервере (/api/writing/translate):
// переводим фразу из урока, а не главу; больше — сигнал скрипта.
const MAX_CHARS = 240

// Подпись источника перевода — порт SRC_LABEL прототипа (10133–10138) на
// i18n-ключи. word/phrase собраны из данных текущего жанра, поэтому вместо
// прототипного «phrase bank» честнее «from this genre»; live/cache — просто
// «translation» (движок перевода для ученика неважен).
const SRC_LABEL_KEY = {
  ui: 'writing.tip.srcDict',
  word: 'writing.tip.srcGenre',
  phrase: 'writing.tip.srcGenre',
  gloss: 'writing.tip.srcWordByWord',
  cache: 'writing.tip.srcAi',
  live: 'writing.tip.srcAi',
}

// Тултип перевода выделения — порт «всплывающей карточки» прототипа
// (10141–10258). Хук ничего не рендерит: div.wr-tpop живёт ПРЯМО в
// document.body (эффект создаёт и убирает его сам), потому что позиция
// абсолютная по координатам выделения и React-дереву он не принадлежит.
// Каскад перевода: глоссарий уровня → localStorage-кэш → POST
// /api/writing/translate (только с токеном, 12 сек) → пословный подстрочник.
export default function useSelectionTranslate({ levelData, token, enabled }) {
  const { t } = useI18n()

  // buildGloss(null) отдаёт только UI_GLOSS — тултип полезен и вне уровня.
  const gloss = useMemo(() => buildGloss(levelData || null), [levelData])

  // Слушатели на document вешаются один раз (на enabled), а gloss/token/t
  // меняются — свежие значения ходят через ref, чтобы не перевешивать DOM.
  // Синхронизация — эффектом (не в рендере): он успевает до любого mouseup.
  const ctxRef = useRef({ gloss: {}, token: null, t: (k) => k })
  useEffect(() => {
    ctxRef.current = { gloss, token, t }
  }, [gloss, token, t])

  useEffect(() => {
    if (!enabled) return undefined

    const tip = document.createElement('div')
    tip.className = 'wr-tpop'
    document.body.appendChild(tip)

    // seq защищает от гонки: ответ сети для старого выделения не должен
    // перерисовать тултип нового (или спрятанного) — hide() и show() двигают
    // счётчик, поздний ответ сравнивает свой номер и молча умирает.
    let seq = 0
    let abortCtl = null
    let hideTimer = null

    function hide() {
      seq++
      tip.classList.remove('on')
      if (abortCtl) {
        abortCtl.abort()
        abortCtl = null
      }
    }

    function show(text, x, y) {
      const { gloss: g, token: tok, t: tt } = ctxRef.current
      const my = ++seq
      if (abortCtl) {
        abortCtl.abort()
        abortCtl = null
      }
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }

      tip.innerHTML = ''
      const head = document.createElement('div')
      head.className = 'wr-tpop__en'
      head.textContent = text.length > 90 ? text.slice(0, 90) + '…' : text
      tip.appendChild(head)
      const body = document.createElement('div')
      tip.appendChild(body)
      const foot = document.createElement('div')
      foot.className = 'wr-tpop__foot'
      tip.appendChild(foot)
      tip.classList.add('on')

      // Ширина согласована с css (min(300px, 100vw-16px)) — клампим центр
      // выделения так, чтобы карточка не вылезала за вьюпорт.
      const w = Math.min(300, window.innerWidth - 16)
      tip.style.left = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8)) + 'px'
      tip.style.top = Math.max(8, y + window.scrollY + 14) + 'px'

      function line(label, value) {
        const row = document.createElement('div')
        row.className = 'wr-tpop__line'
        const tag = document.createElement('i')
        tag.className = 'wr-tpop__lang'
        tag.textContent = label
        row.appendChild(tag)
        const span = document.createElement('span')
        span.textContent = value
        row.appendChild(span)
        return row
      }

      function render(res) {
        body.innerHTML = ''
        foot.textContent = ''
        if (!res) {
          const none = document.createElement('div')
          none.className = 'wr-tpop__line'
          none.textContent = tt('writing.tip.offline')
          body.appendChild(none)
          return
        }
        body.appendChild(line('RU', res.ru))
        body.appendChild(line('KK', res.kk))
        foot.textContent = tt(SRC_LABEL_KEY[res.src] || 'writing.tip.srcAi')
        if (wordsOf(text).length === 1) {
          const add = document.createElement('button')
          add.type = 'button'
          add.className = 'wr-tpop__add'
          add.textContent = tt('writing.tip.addWord')
          add.addEventListener('click', () => {
            // Нормализация слова — из прототипа (10184): нижний регистр,
            // только латиница/апострофы/дефисы — так же слова кладёт панель
            // «My words», дедуп в addMyWord сходится сам.
            const clean = text.toLowerCase().replace(/[^a-z'-]/g, '')
            if (clean) addMyWord(clean)
            add.textContent = '✓ ' + tt('writing.tip.added')
            add.disabled = true
            hideTimer = setTimeout(hide, 900)
          })
          foot.appendChild(add)
        }
      }

      const local = glossLookup(g, text)
      if (local) {
        render(local)
        return
      }
      const cached = cachedTranslation(text)
      if (cached) {
        render({ ru: cached.ru, kk: cached.kk, src: 'cache' })
        return
      }

      const pending = document.createElement('div')
      pending.className = 'wr-tpop__line'
      pending.textContent = tt('writing.tip.translating')
      body.appendChild(pending)

      // Фолбэк «как в Книгах»: переводчик читалки (lib/wordTranslate.js, gtx +
      // общий кэш jts_word_tr_v2) двумя вызовами — ru и kk. Это путь анонима
      // (роут Haiku требует Bearer) и страховка на 429/сбой Haiku: тултип
      // обязан переводить всегда, как это уже делает раздел книг.
      function tryGtx(my) {
        Promise.all([translateWord(text, 'ru'), translateWord(text, 'kk')])
          .then(([ru, kk]) => {
            if (my !== seq) return
            if (ru?.tr && kk?.tr) {
              rememberTranslation(text, ru.tr, kk.tr)
              render({ ru: ru.tr, kk: kk.tr, src: 'live' })
            } else {
              render(wordByWord(g, text))
            }
          })
          .catch(() => {
            if (my !== seq) return
            render(wordByWord(g, text))
          })
      }

      if (!tok) {
        tryGtx(my)
        return
      }

      // 12 сек — таймаут прототипа (translateRemote, 10215); AbortController
      // вместо флага done: hide() и новое show() ещё и рвут сам запрос.
      abortCtl = new AbortController()
      const ctl = abortCtl
      const timer = setTimeout(() => ctl.abort(), 12000)
      fetch('/api/writing/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ text }),
        signal: ctl.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error('http ' + r.status)
          return r.json()
        })
        .then((data) => {
          clearTimeout(timer)
          if (my !== seq) return
          if (data && typeof data.ru === 'string' && data.ru && typeof data.kk === 'string') {
            rememberTranslation(text, data.ru, data.kk)
            render({ ru: data.ru, kk: data.kk, src: 'live' })
          } else {
            tryGtx(my)
          }
        })
        .catch(() => {
          clearTimeout(timer)
          if (my !== seq) return
          tryGtx(my)
        })
    }

    // Порт selectionHandler (10235–10252): отложка 10 мс — браузер успевает
    // схлопнуть/зафиксировать выделение после mouseup, до неё selection ещё
    // прошлое.
    function onSelect(e) {
      // Клик внутри самой карточки (например, «+ в мои слова») не должен
      // перепоказывать её поверх кнопки.
      if (e && e.target && tip.contains(e.target)) return
      setTimeout(() => {
        let sel
        try {
          sel = window.getSelection()
        } catch {
          return
        }
        if (!sel || sel.isCollapsed) {
          hide()
          return
        }
        const text = String(sel.toString()).trim()
        if (!text || text.length > MAX_CHARS || !/[A-Za-z]/.test(text)) {
          hide()
          return
        }
        // В редакторе Блокнота не мешаем печатать — как в прототипе
        // (#padEditor), здесь редактор помечен классом .wr-editor.
        const anchor = sel.anchorNode
        const host = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentNode)
        if (host && host.closest && host.closest('.wr-editor')) {
          hide()
          return
        }
        let x = e && e.clientX ? e.clientX : window.innerWidth / 2
        let y = e && e.clientY ? e.clientY : 100
        try {
          // Центр-низ прямоугольника выделения точнее координат события
          // (у touchend их и вовсе нет).
          const r = sel.getRangeAt(0).getBoundingClientRect()
          if (r && r.width) {
            x = r.left + r.width / 2
            y = r.bottom
          }
        } catch {
          /* нет range — остаёмся на координатах события */
        }
        show(text, x, y)
      }, 10)
    }

    function onDown(e) {
      if (tip.classList.contains('on') && !tip.contains(e.target)) hide()
    }

    document.addEventListener('mouseup', onSelect)
    document.addEventListener('touchend', onSelect)
    document.addEventListener('mousedown', onDown)

    return () => {
      document.removeEventListener('mouseup', onSelect)
      document.removeEventListener('touchend', onSelect)
      document.removeEventListener('mousedown', onDown)
      if (hideTimer) clearTimeout(hideTimer)
      if (abortCtl) abortCtl.abort()
      tip.remove()
    }
  }, [enabled])
}
