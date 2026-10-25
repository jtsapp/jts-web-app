'use client'

// «Скорочтение» — экран Скорочтения из прототипа кабинета (data/jts-student-cabinet.html: pSpeed и функции
// sr*), перенесённый почти дословно, как «Грамматика · игры» и «Числа»: выбор текста и скорости, образец с
// подсветкой слов, телесуфлёр с отсчётом 3-2-1 и записью, итог с процентом, звёздами, своим темпом и записью.
// Экран SpeedReadingPage монтирует его в Shadow DOM: классы прототипа (.card, .cbtn, .chero) совпадают с
// глобальными классами сайта.
//
// От прототипа отличается только связь с приложением (спека, часть B3):
// - тексты — cfg.texts с бэкенда, а не литерал SR_TEXTS; попытки — cfg.attempts и cfg.submitAttempt (на
//   сервер уходят только цифры, запись — никуда, Д6); монеты — из ответа бэкенда, тостом прототипа;
// - образец — запись ElevenLabs с разметкой слов (cfg.playSample на общем <audio> с onTime), а не
//   синтез браузера с onboundary; нет образца — cfg.ensureSample при открытии текста, кнопка «Готовим
//   образец…»; 1x — темп образца (sample.wpm), без него — 150 сл/мин;
// - запись — cfg.openRecorder (WAV 16 кГц, потолок 3 мин), живая подсветка — cfg.startLive со сторожем
//   «распознавание молчит»; итог — по cfg.transcribe (/api/transcribe), не ответил — по живому
//   распознаванию, нет ни того, ни другого — «оценка недоступна» (Д7); пока считаем — шаг «Проверяем запись»;
// - «Скачать запись» — тот же WAV; «Мои попытки» — сервер и этот заход, плеер только у попыток этого захода;
// - кнопки «Назад» в Практику у движка нет — она у экрана; экран «нет микрофона» — шаги под сайт, а не
//   «скачайте файл и откройте в Chrome»;
// - inline onclick разметки → data-act/data-arg и один делегированный обработчик (inline-обработчик в тени
//   ищет глобальную функцию, которой у модуля нет); значки Material Symbols → SVG (icons.js); тосты —
//   внутри корня; звуки beep — свой AudioContext, будится в клике «Начать запись», закрывается в destroy();
// - починки: стоп во время отсчёта возвращает к выбору (прототип считал длительность от прошлой попытки);
//   кадр бегущей строки считает время от performance.now(), а не от метки кадра; список образца прокручивается
//   к звучащему слову (прототип вычитал отступ списка и всегда сбрасывал прокрутку наверх); пока браузер
//   спрашивает микрофон, на экране ожидание с «Отменой», а не рабочий выбор текста (выбор посреди запроса
//   разводил текст попытки и текст итога); числа цифрами в распознанном засчитываются (rules.js expandHeard).

import { SPEEDS, BASE_WPM, AUTO_STOP_MS, srWords, alignHeard, resultOf, speedWpm, paceSeconds, scrollMs, sampleIndexAt, todayCount } from './rules.js'
import { attemptBody } from './data.js'
import { icon } from './icons.js'

/**
 * @param {HTMLElement} root  корень раздела (.sr) в Shadow DOM
 * @param {object} cfg  см. docs/superpowers/plans/2026-10-25-speed-reading-web.md, Task 8
 */
export function mountSpeedReading(root, cfg) {
  const {
    texts = [],
    img = () => '',
    playSample = () => {},
    stopSample = () => {},
    ensureSample = async () => ({ status: 'unavailable' }),
    canRecord = () => false,
    openRecorder = async () => {
      throw new Error('нет записи')
    },
    startLive = () => null,
    transcribe = async () => null,
    submitAttempt = async () => null,
    scrollTop = () => {},
    initialText = null,
  } = cfg
  let lang = cfg.lang || 'ru'
  let serverTries = Array.isArray(cfg.attempts) ? cfg.attempts.slice() : []
  const ac = new AbortController()
  let dead = false
  const timers = new Set()
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (!dead) fn()
    }, ms)
    timers.add(id)
    return id
  }
  const blobUrls = new Set()
  const $ = (id) => root.querySelector(`#${id}`)

  const X = (ru, kk, en) => (lang === 'kk' ? kk : lang === 'en' ? en : ru)
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || o.ru || '')
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  /* ---- звуки: мягкие «колокольчики» прототипа ---- */
  let AC = null
  // Контекст создаётся и будится в клике «Начать запись»: отсчёт идёт таймерами, и на iPhone контекст,
  // созданный вне нажатия, остался бы немым.
  function wakeAudio() {
    try {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
      if (!AC && Ctx) AC = new Ctx()
      // iOS после микрофона оставляет контекст «interrupted», а не «suspended» — будим любой неработающий.
      if (AC && AC.state !== 'running') AC.resume()
    } catch {
      AC = null
    }
  }
  function beep(type) {
    if (!AC) return
    try {
      const now = AC.currentTime + 0.01
      const bell = (f, d, vol, len) => {
        ;[[f, 1], [f * 2, 0.25], [f * 3, 0.06]].forEach(([fr, k]) => {
          const o = AC.createOscillator()
          const g = AC.createGain()
          o.type = 'sine'
          o.frequency.value = fr
          g.gain.setValueAtTime(0.0001, now + d)
          g.gain.linearRampToValueAtTime(vol * k, now + d + 0.012)
          g.gain.exponentialRampToValueAtTime(0.0001, now + d + len)
          o.connect(g)
          g.connect(AC.destination)
          o.start(now + d)
          o.stop(now + d + len + 0.05)
        })
      }
      if (type === 'ok') {
        bell(784, 0, 0.11, 0.45)
        bell(1175, 0.08, 0.09, 0.6)
      } else if (type === 'win') [523, 659, 784, 1047].forEach((f, k) => bell(f, k * 0.11, 0.09, 0.7))
      else bell(660, 0, 0.08, 0.3)
    } catch {
      /* звук — украшение */
    }
  }
  function toast(m) {
    const d = root.ownerDocument.createElement('div')
    d.className = 'toast'
    d.setAttribute('role', 'status')
    d.textContent = m
    root.append(d)
    later(() => d.remove(), 1800)
  }
  // «+4 монеты», «+5 монет», «+1 монета»: число монет задаёт админка, склонение нужно любое.
  function coinWord(n) {
    if (lang === 'kk') return 'тиын'
    if (lang === 'en') return n === 1 ? 'coin' : 'coins'
    const d = n % 10
    const dd = n % 100
    return d === 1 && dd !== 11 ? 'монета' : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'монеты' : 'монет'
  }
  const coinImg = () => {
    const src = img('coin')
    return src ? `<img src="${esc(src)}" alt="">` : '🪙'
  }

  /* ================= Скорочтение (Speak fast and clear!) ================= */
  const byId = new Map(texts.map((t) => [t.id, t]))
  const SR = {
    step: 'start',
    text: byId.has(initialText) ? initialText : texts[0]?.id,
    mult: 1,
    tries: [],
  }
  const srText = () => byId.get(SR.text) || texts[0]
  const srWpm = (tx = srText()) => speedWpm(tx?.sample?.wpm || BASE_WPM, SR.mult)
  // Состояние образца текста без записи: loading | unavailable | error.
  const sampleState = new Map()

  function needSample(tx) {
    if (!tx || tx.sample || sampleState.has(tx.id)) return
    sampleState.set(tx.id, 'loading')
    let asked
    try {
      asked = Promise.resolve(ensureSample(tx.id))
    } catch (e) {
      asked = Promise.reject(e)
    }
    asked
      .then((res) => {
        if (dead) return
        if (res?.status === 'ready' && res.sample) {
          tx.sample = res.sample
          sampleState.delete(tx.id)
        } else sampleState.set(tx.id, res?.status === 'unavailable' ? 'unavailable' : 'error')
        if (SR.step === 'start' && SR.text === tx.id && !SRL) render()
      })
      .catch(() => {
        if (dead) return
        sampleState.set(tx.id, 'error')
        if (SR.step === 'start' && SR.text === tx.id && !SRL) render()
      })
  }

  function srSetText(id) {
    if (!byId.has(id)) return
    SR.text = id
    needSample(byId.get(id))
    if (SRL) srListenStop()
    else render()
  }
  function srSetMult(m) {
    if (!SPEEDS.includes(m)) return
    SR.mult = m
    if (SRL) srListenStop()
    else render()
  }

  /* ---- образец озвучки: запись ElevenLabs, та же скорость, подсветка слов ---- */
  let SRL = null // { id, k } — звучащий образец
  function srListen() {
    if (SRL) {
      srListenStop()
      return
    }
    const tx = srText()
    if (!tx) return
    if (!tx.sample) {
      // Прошлый запрос образца сорвался — кнопка «Повторить» спрашивает снова.
      if (sampleState.get(tx.id) === 'error') {
        sampleState.delete(tx.id)
        needSample(tx)
        render()
      }
      return
    }
    const n = srWords(tx.body).length
    const my = { id: tx.id, k: -1 }
    SRL = my
    render()
    // Звук — в тике нажатия: разрешение iPhone выдаётся жесту и общему элементу озвучки.
    playSample(tx.sample.url, SR.mult, {
      onTime: (t) => {
        if (SRL !== my) return
        const k = sampleIndexAt(tx.sample.words, t, n)
        if (k === my.k) return
        my.k = k
        root.querySelectorAll('#srlist span').forEach((sp, i) => {
          sp.classList.toggle('on', i === k)
          sp.classList.toggle('done', i < k)
        })
        const el = $(`srl${k}`)
        const box = $('srlist')
        // У .srlist position:relative — offsetTop слова уже от списка.
        if (el && box) box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2)
      },
      onEnd: () => {
        if (SRL !== my) return
        SRL = null
        render()
      },
      onFail: () => {
        if (SRL !== my) return
        SRL = null
        render()
        toast(X('Не удалось включить образец', 'Үлгіні қосу мүмкін болмады', "Couldn't play the model"))
      },
    })
  }
  function srListenStop() {
    const was = SRL
    SRL = null
    if (was) {
      stopSample()
      render()
    }
  }

  function listenButton(tx) {
    const st = sampleState.get(tx.id)
    if (!tx.sample && st !== 'error') {
      const label =
        st === 'unavailable'
          ? X('Образец недоступен', 'Үлгі қолжетімсіз', 'The model is unavailable')
          : X('Готовим образец…', 'Үлгіні дайындап жатырмыз…', 'Preparing the model…')
      return `<button class="cbtn line" data-act="listen" disabled>${icon(st === 'unavailable' ? 'headphones' : 'hourglass')}${label}</button>`
    }
    if (!tx.sample)
      return `<button class="cbtn line" data-act="listen">${icon('refresh')}${X('Повторить образец', 'Үлгіні қайта сұрау', 'Try the model again')}</button>`
    return `<button class="cbtn line" data-act="listen">${icon(SRL ? 'stop_circle' : 'headphones')}${SRL ? X('Остановить образец', 'Үлгіні тоқтату', 'Stop the model') : X('Послушать образец', 'Үлгіні тыңдау', 'Listen to the model')} · ${SR.mult}x</button>`
  }

  /* ---- попытки: сервер + этот заход ---- */
  function allTries() {
    const own = new Set(SR.tries.map((t) => t.id).filter((id) => id != null))
    const server = serverTries
      .filter((a) => !own.has(a.id))
      .map((a) => ({
        server: true,
        text: a.textId,
        title: a.title,
        mult: a.speed,
        dur: a.durationSec || 0,
        pct: a.percent,
        stars: a.stars,
        at: a.createdAt ? new Date(a.createdAt) : null,
        createdAt: a.createdAt,
      }))
    return [...SR.tries.filter((t) => !t.demo), ...server]
  }
  // Попытки этого захода, которых нет в списке с сервера (он взят при открытии экрана), — к счёту «сегодня».
  const sessionToday = () => {
    const known = new Set(serverTries.map((a) => a.id))
    return SR.tries.filter((t) => !t.demo && (t.id == null || !known.has(t.id))).map((t) => ({ createdAt: t.at.toISOString() }))
  }

  function pSpeed() {
    const tx = srText()
    if (!tx) return ''
    const has = canRecord()
    const wpm = srWpm(tx)
    const words = srWords(tx.body)
    return `<div class="srstart"><div class="srava"><img src="${esc(img('dexter'))}" alt=""></div><h2>${X('Скорочтение', 'Жылдам оқу', 'Speed reading')} <span class="cpill st-new" style="vertical-align:middle">new</span></h2>
 <p class="muted">${X('Включи диктофон и читай вслух текст, который бежит снизу вверх. Успей прочитать всё быстро и чётко! Потом послушай свою запись и посмотри, сколько слов получилось.', 'Диктофонды қосып, төменнен жоғары жылжып бара жатқан мәтінді дауыстап оқы. Барлығын жылдам әрі анық оқып үлгер! Содан кейін жазбаңды тыңдап, қанша сөз шыққанын көр.', 'Turn on the recorder and read aloud the text that scrolls up. Read it all fast and clear! Then listen to yourself and see how many words you got.')}</p>
 <div class="srnote">🎧 ${X('Разрешите доступ к микрофону и говорите в тихом месте', 'Микрофонға рұқсат беріп, тыныш жерде сөйлеңіз', 'Allow microphone access and speak in a quiet place')}</div>
 ${has ? '' : `<div class="srnote" style="background:#FFE4EE;color:#C2185B">${X('Этот браузер не умеет записывать звук. Откройте сайт в Chrome или Safari.', 'Бұл браузер дыбыс жаза алмайды. Сайтты Chrome немесе Safari-де ашыңыз.', 'This browser cannot record audio. Please open the site in Chrome or Safari.')}</div>`}
 <h3 class="srh">${X('Текст', 'Мәтін', 'Text')}</h3><div class="srtexts">${texts.map((t) => `<button class="${SR.text === t.id ? 'on' : ''}" data-act="text" data-arg="${esc(t.id)}"><span class="ic">${esc(t.icon)}</span><b>${esc(L(t.title))}</b><small>${esc(t.level)} · ${srWords(t.body).length} ${X('слов', 'сөз', 'words')}</small></button>`).join('')}</div>
 <h3 class="srh">${X('Скорость', 'Жылдамдық', 'Speed')}</h3><div class="cseg srspd">${SPEEDS.map((m) => `<button class="${SR.mult === m ? 'on' : ''}" data-act="speed" data-arg="${m}">${m}x</button>`).join('')}</div>
 <p class="muted" style="font-size:13.5px;margin:10px 0 0">${X('1x — темп носителя', '1x — тасымалдаушы қарқыны', '1x = native pace')} · ${wpm} ${X('сл/мин', 'сөз/мин', 'wpm')} · ≈ ${paceSeconds(words.length, wpm)} ${X('секунд', 'секунд', 'seconds')}</p>
 <div class="srlisten">${listenButton(tx)}
 ${SRL ? `<div class="srlist" id="srlist">${words.map((w, i) => `<span id="srl${i}">${esc(w)}</span>`).join(' ')}</div>` : `<span class="muted" style="font-size:13px">${X('Послушай, как правильно читать этот текст, — с той же скоростью', 'Бұл мәтінді қалай дұрыс оқу керегін тыңда — сол жылдамдықпен', 'Hear how to read this text correctly — at the same speed')}</span>`}</div>
 <button class="cbtn srgo" data-act="begin">${icon('mic')}${X('Начать запись', 'Жазуды бастау', 'Start recording')}</button><button class="cbtn line" style="margin-top:8px;width:100%;justify-content:center" data-act="demo">${icon('play_circle')}${X('Посмотреть демо без микрофона', 'Микрофонсыз демоны көру', 'Watch a demo without a microphone')}</button>
 <div class="muted" style="font-size:13px;margin-top:10px">${X('Уровень', 'Деңгей', 'Level')} ${esc(tx.level)} · ${X('Попыток сегодня', 'Бүгінгі әрекеттер', 'Tries today')}: ${todayCount([...serverTries, ...sessionToday()])} · <span class="srcoin">${coinImg()} ${X('монеты — раз в день за текст, прочитанный на ★', 'тиындар — күніне бір рет, ★ алған мәтін үшін', 'coins once a day per text read for ★')}</span></div></div>`
  }

  /* ---- запись ---- */
  let SRX = null // живая попытка: rec, live, raf, demo
  let waitSeq = 0 // запрос микрофона: «Отмена» и повторный запрос делают прежний ответ браузера ненужным
  async function srBegin(demo) {
    if (SRX || SR.step === 'count') return
    if (SRL) {
      SRL = null
      stopSample()
    }
    wakeAudio()
    const tx = srText()
    if (!tx) return
    // Текст и темп попытки фиксируются здесь: итог, подпись и тело попытки берут их отсюда, а не из выбора на экране.
    SR.cur = tx
    SR.curMult = SR.mult
    SR.curWpm = srWpm(tx)
    SR.words = srWords(tx.body)
    SR.heard = []
    SR.asr = false
    SR.liveDead = false
    SR.t0 = 0
    SR.step = 'count'
    const my = ++waitSeq
    const go = (x) => {
      if (dead || my !== waitSeq || SR.step !== 'count') {
        x.rec?.cancel()
        return
      }
      if (SRL) {
        SRL = null
        stopSample()
      }
      SRX = x
      SR.step = 'rec'
      SR.count = 3
      render()
      scrollTop()
      srCountdown(x)
    }
    if (demo) return go({ demo: true })
    if (!canRecord()) {
      SR.step = 'nomic'
      SR.err = 'nosupport'
      render()
      return
    }
    render() // «Ждём доступ к микрофону…»: окно браузера может висеть, сколько ученик его не трогает
    try {
      const rec = await openRecorder({ onLimit: () => SRX?.rec === rec && srStop() })
      go({ rec })
    } catch (e) {
      if (dead || my !== waitSeq || SR.step !== 'count') return
      SR.step = 'nomic'
      SR.err = (e && e.name) || ''
      render()
    }
  }

  function srWaitView() {
    return `<div class="srstart"><div class="srava"><img src="${esc(img('dexter'))}" alt=""></div><h2>${X('Ждём доступ к микрофону…', 'Микрофонға рұқсат күтілуде…', 'Waiting for the microphone…')}</h2>
 <p class="muted">${X('Разрешите микрофон в окне браузера — и начнётся отсчёт.', 'Браузер терезесінде микрофонға рұқсат беріңіз — сонда кері санақ басталады.', 'Allow the microphone in the browser window and the countdown will start.')}</p>
 <span class="srwait">${icon('hourglass')}${X('Ждём ответ браузера', 'Браузердің жауабын күтудеміз', 'Waiting for the browser')}</span>
 <button class="cbtn line" style="margin-top:16px;width:100%;justify-content:center" data-act="cancel">${icon('arrow_back')}${X('Отмена', 'Болдырмау', 'Cancel')}</button></div>`
  }

  function srNoMic() {
    return `<div class="ph"><button class="cbtn sm" data-act="back">${icon('arrow_back')}${X('Скорочтение', 'Жылдам оқу', 'Speed reading')}</button></div>
 <div class="srstart"><div class="srava" style="background:linear-gradient(110deg,#FF5E7E,#9047FF)"><img src="${esc(img('dexter'))}" alt=""></div><h2>${X('Нет доступа к микрофону', 'Микрофонға рұқсат жоқ', 'No microphone access')}</h2>
 <p class="muted">${SR.err === 'nosupport' ? X('Этот браузер не умеет записывать звук.', 'Бұл браузер дыбыс жаза алмайды.', 'This browser cannot record audio.') : X('Браузер не дал доступ к микрофону.', 'Браузер микрофонға рұқсат бермеді.', 'The browser did not allow the microphone.')}</p>
 <div class="srsteps"><div><b>1</b><span>${X('Нажмите «Начать запись». Когда браузер спросит про микрофон — нажмите «Разрешить».', '«Жазуды бастау» батырмасын басыңыз. Браузер микрофон туралы сұрағанда — «Рұқсат ету» басыңыз.', 'Press “Start recording”. When the browser asks about the microphone, press “Allow”.')}</span></div>
 <div><b>2</b><span>${X('Если раньше нажали «Блокировать»: значок 🔒 слева от адреса → Микрофон → Разрешить, затем обновите страницу.', 'Бұрын «Бұғаттау» басқан болсаңыз: мекенжайдың сол жағындағы 🔒 белгісі → Микрофон → Рұқсат ету, содан кейін бетті жаңартыңыз.', 'If you pressed “Block” before: the 🔒 icon left of the address → Microphone → Allow, then reload the page.')}</span></div>
 <div><b>3</b><span>${X('Не помогло — откройте сайт в Google Chrome или Safari и проверьте, что микрофон подключён.', 'Көмектеспесе — сайтты Google Chrome немесе Safari-де ашып, микрофон қосулы екенін тексеріңіз.', 'Still not working? Open the site in Google Chrome or Safari and check that the microphone is connected.')}</span></div></div>
 <button class="cbtn srgo" data-act="begin">${icon('refresh')}${X('Попробовать снова', 'Қайта көру', 'Try again')}</button>
 <button class="cbtn line" style="margin-top:8px;width:100%;justify-content:center" data-act="demo">${icon('play_circle')}${X('Посмотреть демо без микрофона', 'Микрофонсыз демоны көру', 'Watch a demo without a microphone')}</button>
 <div class="muted" style="font-size:12px;margin-top:10px">${esc(SR.err === 'nosupport' ? '' : SR.err || '')}</div></div>`
  }

  function srRecView() {
    return `<div class="tele" id="tele"><div class="tele-top"><span class="recdot" id="recdot"></span><span id="rectime">0:00</span><b>${X('Читай быстро и чётко!', 'Жылдам әрі анық оқы!', 'Speak fast and clear!')}</b><button class="cbtn sm white" data-act="stop">${icon('stop')}${X('Стоп', 'Тоқта', 'Stop')}</button></div>
 <div class="tele-view"><div class="tele-line"></div><div class="tele-text" id="teletext"><h4>${X('Читай быстро и чётко!', 'Жылдам әрі анық оқы!', 'Speak fast and clear!')}</h4>${SR.words.map((w, i) => `<span id="tw${i}">${esc(w)}</span>`).join(' ')}</div>
 <div class="tele-count" id="telecount">${SR.count || ''}</div></div><div class="tele-bar"><i id="telebar"></i></div></div>`
  }

  function srCountdown(x) {
    if (SRX !== x || SR.step !== 'rec') return
    const c = $('telecount')
    if (!c) return
    if (SR.count > 0) {
      c.textContent = SR.count
      c.classList.remove('cnt')
      void c.offsetWidth
      c.classList.add('cnt')
      beep('pop')
      SR.count--
      later(() => srCountdown(x), 800)
    } else {
      c.textContent = ''
      srRecord(x)
    }
  }

  function srRecord(x) {
    SR.t0 = performance.now()
    beep('ok')
    if (x.demo) {
      SR.asr = true
      SR.demoMask = SR.words.map(() => Math.random() < 0.9)
    } else {
      try {
        x.rec.start()
      } catch {
        toast(X('Запись не запустилась', 'Жазба басталмады', "Recording didn't start"))
        srStop(true)
        render()
        return
      }
      x.live = startLive({
        onWords: (words) => {
          if (SRX !== x || SR.liveDead) return
          SR.heard = words
          if (words.length) SR.asr = true
          srMark()
        },
        // Распознавание молчит или отказало — подсветка до конца попытки выключена, итог посчитает сервер.
        onDead: () => {
          if (SRX === x) SR.liveDead = true
        },
      })
    }
    const total = scrollMs(SR.words.length, SR.curWpm)
    const el = $('teletext')
    const view = el && el.parentNode
    const H = el ? el.scrollHeight : 0
    const VH = view ? view.clientHeight : 0
    const tick = () => {
      if (SRX !== x || SR.step !== 'rec') return
      const t = performance.now() - SR.t0
      const p = Math.min(1, t / total)
      const e2 = $('teletext')
      if (e2) e2.style.transform = `translateY(${VH * 0.42 - H * p}px)`
      const b = $('telebar')
      if (b) b.style.width = `${p * 100}%`
      if (x.demo) {
        const n = Math.floor(SR.words.length * Math.max(0, p - 0.04))
        SR.heard = SR.words.filter((w, i) => i < n && SR.demoMask[i])
        srMark()
      }
      const rt = $('rectime')
      if (rt) {
        const s = Math.floor(t / 1000)
        rt.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
      }
      if (t > total + AUTO_STOP_MS) {
        srStop()
        return
      }
      x.raf = requestAnimationFrame(tick)
    }
    x.raf = requestAnimationFrame(tick)
  }

  function srMark() {
    const ok = alignHeard(SR.words, SR.heard)
    ok.forEach((v, i) => {
      const s = $(`tw${i}`)
      if (s) s.classList.toggle('said', v)
    })
  }

  function srStop(silent) {
    if (SRL) {
      SRL = null
      stopSample()
    }
    if (!SRX) return
    const x = SRX
    if (x.raf) cancelAnimationFrame(x.raf)
    x.raf = null
    x.live?.stop()
    // Стоп во время отсчёта: записи ещё нет — просто обратно к выбору.
    if (silent || !SR.t0) {
      SRX = null
      x.rec?.cancel()
      SR.step = 'start'
      if (!silent) render()
      return
    }
    SR.dur = (performance.now() - SR.t0) / 1000
    srFinish(x)
  }

  function srScoringView() {
    return `<div class="srstart"><div class="srava"><img src="${esc(img('read'))}" alt=""></div><h2>${X('Проверяем запись…', 'Жазбаны тексеріп жатырмыз…', 'Checking your recording…')}</h2>
 <p class="muted">${X('Распознаём, что ты прочитал, — это займёт несколько секунд.', 'Не оқығаныңды танып жатырмыз — бірнеше секунд кетеді.', 'Recognising what you read — this takes a few seconds.')}</p>
 <span class="srwait">${icon('hourglass')}${X('Считаем результат', 'Нәтижені есептеп жатырмыз', 'Counting your result')}</span></div>`
  }

  async function srFinish(x) {
    const tx = SR.cur
    const words = SR.words
    const dur = SR.dur || 0
    const mult = SR.curMult
    const wpmTarget = SR.curWpm
    let wav = null
    let heard = null
    let scoredBy = 'none'
    if (x.demo) {
      heard = SR.heard
      scoredBy = 'demo'
    } else {
      SR.step = 'scoring'
      render()
      wav = await x.rec.stop().catch(() => null)
      if (dead || SRX !== x) return
      const said = wav ? await Promise.resolve(transcribe(wav, ac.signal)).catch(() => null) : null
      if (dead || SRX !== x) return
      const live = SR.asr && SR.heard.length > 0
      // Пустой ответ сервера при словах живого распознавания — скорее тихая запись, чем молчание ученика:
      // тогда итог по живому, а не «0 % по серверу».
      if (typeof said === 'string' && (srWords(said).length || !live)) {
        heard = srWords(said)
        scoredBy = 'server'
      } else if (live) {
        heard = SR.heard
        scoredBy = 'browser'
      }
    }
    SRX = null
    const ok = heard ? alignHeard(words, heard) : null
    const read = ok ? ok.filter(Boolean).length : null
    const { pct, stars, wpm: realWpm } = resultOf({ read, words: words.length, dur })
    const url = wav ? URL.createObjectURL(wav) : null
    if (url) blobUrls.add(url)
    const tr = { url, demo: !!x.demo, text: tx.id, wpm: wpmTarget, mult, dur, words: words.length, read, ok, pct, stars, realWpm, scoredBy, at: new Date(), id: null, coins: null, saving: !x.demo }
    SR.tries.unshift(tr)
    SR.last = tr
    SR.step = 'result'
    beep('win')
    render()
    scrollTop()
    if (!x.demo) srSave(tr)
  }

  function srSave(tr) {
    const body = attemptBody({ textId: tr.text, speed: tr.mult, durationSec: tr.dur, wordsTotal: tr.words, wordsRead: tr.read ?? 0, percent: tr.pct, stars: tr.stars ?? 0, wpm: tr.realWpm, scoredBy: tr.scoredBy })
    Promise.resolve()
      .then(() => submitAttempt(body))
      .then((resp) => {
        if (dead) return
        tr.saving = false
        tr.coins = Number(resp?.coins) || 0
        tr.id = resp?.attempt?.id ?? null
        if (tr.coins > 0) toast(`+${tr.coins} ${coinWord(tr.coins)}`)
        updateSave(tr)
      })
      .catch((e) => {
        if (dead) return
        tr.saving = false
        // Ответ сервера (текст скрыли, пока ученик читал) и обрыв сети — разные подсказки.
        tr.saveFailed = e?.status ? 'refused' : 'network'
        updateSave(tr)
      })
  }
  // Строка «сохранено / монеты» меняется на месте: полная перерисовка итога оборвала бы запись в плеере.
  function updateSave(tr) {
    const el = $('srsave')
    if (el && SR.last === tr && SR.step === 'result') el.innerHTML = saveLine(tr)
  }
  function saveLine(tr) {
    if (tr.demo) return ''
    if (tr.saving) return `<span class="srwait">${icon('hourglass')}${X('Сохраняем попытку…', 'Әрекетті сақтап жатырмыз…', 'Saving your try…')}</span>`
    if (tr.saveFailed === 'refused') return `⚠️ ${X('Попытку не приняли: текст изменили или скрыли', 'Әрекет қабылданбады: мәтін өзгертілген не жасырылған', 'Your try was not accepted: the text was changed or hidden')}`
    if (tr.saveFailed) return `⚠️ ${X('Попытка не сохранилась — проверьте интернет', 'Әрекет сақталмады — интернетті тексеріңіз', "Your try wasn't saved — check your connection")}`
    if (tr.coins > 0) return `${coinImg()} +${tr.coins} ${coinWord(tr.coins)}`
    return `✓ ${X('Попытка сохранена', 'Әрекет сақталды', 'Try saved')}`
  }

  const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  function whenOf(t) {
    if (!t.at || Number.isNaN(t.at.getTime())) return ''
    const today = stamp(new Date()) === stamp(t.at)
    const hm = t.at.toTimeString().slice(0, 5)
    return today ? hm : `${t.at.getDate()}.${String(t.at.getMonth() + 1).padStart(2, '0')} ${hm}`
  }

  function srResultView() {
    const tr = SR.last
    const tx = byId.get(tr.text) || srText()
    const pct = tr.pct
    const realWpm = tr.realWpm
    const stars = tr.stars
    const tries = allTries()
    return `<div class="ph"><button class="cbtn sm" data-act="back">${icon('arrow_back')}${X('Скорочтение', 'Жылдам оқу', 'Speed reading')}</button></div>
 <div class="chero"><img class="m" src="${esc(img(pct != null && pct < 30 ? 'sleep' : 'cheer'))}" alt="" style="margin:-10px 0 -14px 0"><div style="flex:1;min-width:220px"><p style="opacity:.85;font-weight:700">${esc(tx.icon)} ${esc(L(tx.title))} · ${esc(tx.level)}</p><h2>${pct != null ? `${X('Прочитано', 'Оқылды', 'Read')} ${pct}%` : X('Запись готова!', 'Жазба дайын!', 'Recording ready!')}</h2>
 <p>${Math.round(tr.dur)} ${X('сек', 'сек', 'sec')} · ${X('скорость', 'жылдамдық', 'speed')} ${tr.mult}x (${tr.wpm} ${X('сл/мин', 'сөз/мин', 'wpm')})${realWpm ? ` · ${X('твой темп', 'сенің қарқының', 'your pace')} ${realWpm} ${X('сл/мин', 'сөз/мин', 'wpm')}` : ''}</p>${stars != null ? `<div style="font-size:26px;letter-spacing:4px;margin-top:6px" aria-label="${stars} / 3">${'★'.repeat(stars)}<span style="opacity:.35">${'★'.repeat(3 - stars)}</span></div>` : ''}
 <div class="srsave" id="srsave">${saveLine(tr)}</div></div></div>
 <div class="card"><h3>🎧 ${X('Послушай себя', 'Өзіңді тыңда', 'Listen to yourself')}</h3>${tr.url ? `<audio controls src="${esc(tr.url)}" style="width:100%"></audio>` : `<div class="srnote" style="max-width:none;margin:0">${tr.demo ? X('Это демо без микрофона: в настоящей игре здесь будет запись голоса студента. Результат ниже — пример.', 'Бұл микрофонсыз демо: нақты ойында мұнда студенттің дауыс жазбасы болады. Төмендегі нәтиже — мысал.', 'This is a demo without a microphone: in the real game the student’s recording appears here. The result below is an example.') : X('Запись не получилась: браузер не отдал звук.', 'Жазба шықпады: браузер дыбысты бермеді.', "The recording didn't work: the browser returned no audio.")}</div>`}
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="cbtn" data-act="begin">${icon('mic')}${X('Записать ещё раз', 'Қайта жазу', 'Record again')}</button>${tr.url ? `<a class="cbtn line" href="${esc(tr.url)}" download="speed-${esc(tr.text)}-${stamp(tr.at)}.wav">${icon('download')}${X('Скачать запись', 'Жазбаны жүктеу', 'Download')}</a>` : ''}${tx.sample ? `<button class="cbtn line" data-act="listen">${icon(SRL ? 'stop_circle' : 'volume_up')}${SRL ? X('Остановить образец', 'Үлгіні тоқтату', 'Stop the model') : X('Послушать образец', 'Үлгіні тыңдау', 'Listen to the model')} · ${SR.mult}x</button>` : ''}</div></div>
 <div class="card"><h3>${X('Что получилось', 'Не шықты', 'How it went')}</h3>${tr.ok ? `<p class="muted" style="font-size:13.5px;margin-top:-4px">${X('Зелёные слова — распознаны в твоей речи, серые — пропущены или нечётко.', 'Жасыл сөздер — сөйлеуіңде танылған, сұрлары — өткізіп алынған не анық емес.', 'Green words were recognised in your speech, grey ones were skipped or unclear.')}</p><div class="srres">${srWords(tx.body).map((w, i) => `<span class="${tr.ok[i] ? 'g' : 'm'}">${esc(w)}</span>`).join(' ')}</div>` : `<p class="muted">${X('Оценка недоступна: распознавание речи не ответило. Послушай запись и сравни с текстом:', 'Бағалау қолжетімсіз: сөйлеуді тану жауап бермеді. Жазбаны тыңдап, мәтінмен салыстыр:', "No score this time: speech recognition didn't respond. Listen to the recording and compare it with the text:")}</p><div class="srres">${esc(tx.body)}</div>`}</div>
 ${tries.length > 1 ? `<div class="card srtries"><h3>${X('Мои попытки', 'Менің әрекеттерім', 'My tries')}</h3>${tries.map((t) => tryRow(t)).join('')}</div>` : ''}`
  }

  function tryRow(t) {
    const tt = byId.get(t.text)
    const name = tt ? L(tt.title) : L(t.title) || t.text
    const pct = t.pct != null ? ` · ${t.pct}%` : ''
    const right = t.url ? `<audio controls src="${esc(t.url)}"></audio>` : t.server ? `<span class="cpill st-grey">${t.stars ? '★'.repeat(t.stars) : '—'}</span>` : `<span class="cpill st-grey">${X('без записи', 'жазбасыз', 'no audio')}</span>`
    return `<div class="lrow"><div class="ic" style="background:#F3EBFF">${esc(tt?.icon || '📄')}</div><div class="ti"><b>${esc(name)} · ${t.mult}x</b><span>${esc(whenOf(t))} · ${Math.round(t.dur)} ${X('сек', 'сек', 'sec')}${pct}</span></div>${right}</div>`
  }

  /* ---- отрисовка и события ---- */
  function view() {
    if (SR.step === 'rec') return srRecView()
    if (SR.step === 'nomic') return srNoMic()
    if (SR.step === 'result') return srResultView()
    if (SR.step === 'scoring') return srScoringView()
    if (SR.step === 'count') return srWaitView()
    return pSpeed()
  }
  function render() {
    if (dead) return
    root.innerHTML = view()
  }

  const ACTIONS = {
    text: (id) => srSetText(id),
    speed: (m) => srSetMult(Number(m)),
    listen: () => srListen(),
    begin: () => srBegin(false),
    demo: () => srBegin(true),
    stop: () => srStop(),
    cancel: () => {
      if (SR.step !== 'count') return
      waitSeq++
      SR.step = 'start'
      render()
    },
    back: () => {
      if (SRL) srListenStop()
      SR.step = 'start'
      render()
      scrollTop()
    },
  }
  root.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest?.('[data-act]')
      if (!el || !root.contains(el) || el.disabled) return
      ACTIONS[el.dataset.act]?.(el.dataset.arg)
    },
    { signal: ac.signal },
  )

  needSample(srText())
  render()

  return {
    setLang(l) {
      lang = l || 'ru'
      // Посреди записи не перерисовываем: бегущая строка измерена под текущую разметку.
      if (SR.step !== 'rec') render()
    },
    setAttempts(list) {
      serverTries = Array.isArray(list) ? list.slice() : []
      if (SR.step === 'start') render()
    },
    destroy() {
      if (dead) return
      dead = true
      ac.abort()
      timers.forEach((id) => clearTimeout(id))
      timers.clear()
      if (SRL) {
        SRL = null
        stopSample()
      }
      if (SRX) {
        if (SRX.raf) cancelAnimationFrame(SRX.raf)
        SRX.live?.stop()
        SRX.rec?.cancel()
        SRX = null
      }
      blobUrls.forEach((u) => URL.revokeObjectURL(u))
      blobUrls.clear()
      try {
        AC?.close()
      } catch {
        /* уже закрыт */
      }
      AC = null
      root.innerHTML = ''
    },
  }
}
