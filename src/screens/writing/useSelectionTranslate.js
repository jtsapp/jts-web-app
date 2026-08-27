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
    // Карточка живёт вне React-дерева и появляется без фокуса, поэтому
    // скринридер о ней не узнает сам: role=status + aria-live читают перевод
    // вслух, как только он подставился. aria-atomic — чтобы читалась вся
    // карточка («слово, RU …, KK …»), а не одна изменившаяся строка.
    tip.setAttribute('role', 'status')
    tip.setAttribute('aria-live', 'polite')
    tip.setAttribute('aria-atomic', 'true')
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

    function show(text, x, y, topY) {
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

      // Ставит карточку под словом, а если снизу не помещается — над ним.
      // Вызывается дважды: сразу (грубо, чтобы не мигала) и после render(),
      // когда высота уже настоящая.
      function placeTip(bottomY, topOfWord) {
        const h = tip.offsetHeight || 140
        const below = bottomY + 14 + h <= window.innerHeight
        const top = below ? bottomY + 14 : Math.max(8, (topOfWord ?? bottomY) - h - 10)
        tip.style.top = top + window.scrollY + 'px'
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
      // По вертикали карточка встаёт под словом, но у нижней кромки экрана
      // так видна была только её шапка (строки RU/KK уезжали за край, на
      // телефоне это нижние ~150 px любого текста) — тогда переворачиваем её
      // над словом. Высоту меряем уже после вставки содержимого: до него
      // offsetHeight нулевой, поэтому позицию доуточняет placeTip() из render().
      placeTip(y, topY)

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
          placeTip(y, topY)
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
        // Содержимое подставлено — высота стала настоящей, доуточняем позицию.
        placeTip(y, topY)
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

    // Слово под курсором — чтобы переводить тапом, как в «Книжках», а не
    // только перетаскиванием: точное выделение мышью по короткому слову
    // получается «через раз», и раздел выглядел сломанным. Слова здесь рисует
    // React, оборачивать их в спаны (приём TapText/BookDetail) нельзя — правим
    // чужой DOM и ловим рассинхрон при перерисовке; поэтому берём слово из
    // точки клика через caret-API и просто выделяем его: подсветку рисует сам
    // браузер, а дальше работает обычная ветка перевода выделения.
    function caretNodeAt(x, y) {
      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y)
        return r ? { node: r.startContainer, offset: r.startOffset } : null
      }
      if (document.caretPositionFromPoint) {
        const p = document.caretPositionFromPoint(x, y)
        return p ? { node: p.offsetNode, offset: p.offset } : null
      }
      return null
    }

    // Латиница с апострофами и дефисами: «don't», «e-mail» — одно слово.
    const WORD_CHAR = /[A-Za-z'’-]/

    function selectWordAt(x, y) {
      const pos = caretNodeAt(x, y)
      if (!pos || !pos.node || pos.node.nodeType !== 3) return false
      const text = pos.node.textContent || ''
      let start = Math.min(pos.offset, text.length)
      let end = start
      while (start > 0 && WORD_CHAR.test(text[start - 1])) start--
      while (end < text.length && WORD_CHAR.test(text[end])) end++
      const word = text.slice(start, end)
      if (!word || !/[A-Za-z]/.test(word)) return false
      try {
        const range = document.createRange()
        range.setStart(pos.node, start)
        range.setEnd(pos.node, end)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      } catch {
        return false
      }
      return true
    }

    // Тап по служебным элементам не перехватываем: у чипов и вариантов ответа
    // клик — это ход в упражнении, перевод там остаётся на выделении.
    // .wr-tile и .wr-dropcol — не кнопки, а div'ы с onClick (банк идей и план):
    // тап по ним снимает плитку с плана / кладёт фишку в колонку, и без них
    // тап-перевод делал ход в задании ЗАОДНО с переводом, а карточка потом
    // показывала слово из перерисованной разметки.
    const INTERACTIVE =
      'button, [role="button"], a, input, textarea, select, label, .wr-editor, .wr-tile, .wr-dropcol'

    // Те же элементы для стража клика ниже: всё, у чего клик — действие, а не
    // просто текст. Модалку (.wr-modal) сюда не берём намеренно — её фон
    // закрывает окно по клику и обязан срабатывать даже с живым выделением
    // внутри карточки.
    const CLICKABLE = 'button, [role="button"], a, label, .wr-tile, .wr-dropcol'

    // Порт selectionHandler (10235–10252): отложка 10 мс — браузер успевает
    // схлопнуть/зафиксировать выделение после mouseup, до неё selection ещё
    // прошлое.
    // После touchend браузер досылает «мышиную» пару mousedown/mouseup — то же
    // касание приходило в обработчик дважды: mousedown успевал спрятать только
    // что показанную карточку, а mouseup показывал её заново и второй раз гонял
    // перевод в сеть (четыре запроса на один тап вместо двух). Мышиные события
    // сразу после касания игнорируем.
    let lastTouchAt = 0
    const AFTER_TOUCH_MS = 800

    // Палец, проехавший больше этого, — прокрутка, а не тап по слову: без
    // порога КАЖДЫЙ свайп по тексту заканчивался карточкой перевода на
    // случайном слове, до которого доехал экран (на телефоне это читалось как
    // тот же «рандом», только с другой стороны).
    const TAP_SLOP_PX = 10
    let touchStart = null
    function onTouchStart(e) {
      const t = e && e.touches && e.touches[0]
      touchStart = t ? { x: t.clientX, y: t.clientY } : null
    }

    function onSelect(e) {
      if (e && e.type === 'touchend') lastTouchAt = Date.now()
      else if (Date.now() - lastTouchAt < AFTER_TOUCH_MS) return
      // Клик внутри самой карточки (например, «+ в мои слова») не должен
      // перепоказывать её поверх кнопки.
      if (e && e.target && tip.contains(e.target)) return
      // Координаты нужны и для тапа, и для позиции карточки; у touchend своих
      // clientX/Y нет — берём их из завершившегося касания.
      const touch = e && e.changedTouches && e.changedTouches[0]
      const px = touch ? touch.clientX : e && e.clientX
      const py = touch ? touch.clientY : e && e.clientY
      setTimeout(() => {
        let sel
        try {
          sel = window.getSelection()
        } catch {
          return
        }
        // Ничего не выделено — это обычный тап: пробуем перевести слово под
        // пальцем. Не вышло (пусто, служебный элемент) — прячем карточку.
        if (!sel || sel.isCollapsed) {
          const target = e && e.target
          // Тапом переводим только внутри поверхности урока: слушатели висят на
          // document, и без этой проверки тап по шапке/сайдбару молча выделял
          // слово в интерфейсе (текст там user-select:none, карточка не
          // показывалась — но выделение оставалось висеть).
          const inSection = target && target.closest && target.closest('[data-selectable]')
          const overInteractive = target && target.closest && target.closest(INTERACTIVE)
          const scrolled =
            touch &&
            touchStart &&
            (Math.abs(px - touchStart.x) > TAP_SLOP_PX || Math.abs(py - touchStart.y) > TAP_SLOP_PX)
          if (!scrolled && inSection && !overInteractive && px != null && py != null && selectWordAt(px, py)) {
            try {
              sel = window.getSelection()
            } catch {
              hide()
              return
            }
          } else {
            hide()
            return
          }
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
        // Запасные координаты — из события (у touchend их берём из касания
        // выше): e.clientX у touchend нет вовсе, и карточка улетала на середину
        // экрана, если прямоугольник выделения посчитать не удалось.
        let x = px != null ? px : window.innerWidth / 2
        let y = py != null ? py : 100
        // Верх выделения нужен, чтобы у нижней кромки экрана перевернуть
        // карточку НАД словом, а не поверх него.
        let topY = y
        try {
          // Центр-низ прямоугольника выделения точнее координат события
          // (у touchend их и вовсе нет).
          const r = sel.getRangeAt(0).getBoundingClientRect()
          if (r && r.width) {
            x = r.left + r.width / 2
            y = r.bottom
            topY = r.top
          }
        } catch {
          /* нет range — остаёмся на координатах события */
        }
        show(text, x, y, topY)
      }, 10)
    }

    function onDown(e) {
      if (Date.now() - lastTouchAt < AFTER_TOUCH_MS) return
      if (tip.classList.contains('on') && !tip.contains(e.target)) hide()
    }

    // Выделение внутри кнопки-материала не должно считаться ходом. Браузер
    // шлёт click, если mousedown и mouseup пришлись на один элемент, — то есть
    // «протащил мышью по слову-чипу, чтобы перевести» ставило это слово в
    // строку, а по варианту ответа — засчитывало неверный ответ. Гасим такой
    // click в фазе перехвата, до обработчиков React.
    //
    // Ложных срабатываний нет ровно потому, что список CLICKABLE — это те же
    // элементы, которым writing.css вернул user-select:text: нажатие на
    // выделяемый текст схлопывает выделение уже на mousedown, и к моменту click
    // гасить нечего. NB: на элементе с user-select:none браузер выделение НЕ
    // сбрасывает (проверено), поэтому «чужое» выделение висело бы и блокировало
    // такую кнопку — служебных кнопок в списке нет намеренно.
    function onClickCapture(e) {
      const target = e.target
      if (!target || !target.closest) return
      const btn = target.closest(CLICKABLE)
      if (!btn) return
      let sel
      try {
        sel = window.getSelection()
      } catch {
        return
      }
      if (!sel || sel.isCollapsed || !String(sel).trim()) return
      let inside = false
      try {
        inside = sel.containsNode(btn, true)
      } catch {
        inside = false
      }
      if (!inside) return
      e.stopPropagation()
      e.preventDefault()
    }

    document.addEventListener('mouseup', onSelect)
    document.addEventListener('touchend', onSelect)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('mousedown', onDown)
    document.addEventListener('click', onClickCapture, true)

    return () => {
      document.removeEventListener('mouseup', onSelect)
      document.removeEventListener('touchend', onSelect)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('click', onClickCapture, true)
      if (hideTimer) clearTimeout(hideTimer)
      if (abortCtl) abortCtl.abort()
      tip.remove()
    }
  }, [enabled])
}
