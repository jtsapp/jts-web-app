// Кто ещё держит микрофон — чтобы «ухо» позывного Луны его отдавало.
//
// Микрофон берут ~20 мест: звонок тьютора, Ситуации, Караоке, Шэдоуинг, IELTS
// Speaking, Аркада, Глаголы, SpeakSpin, шаги курса, кнопка микрофона самой Луны…
// Вписывать «ухо» в каждое — забыть в двадцать первом, поэтому арбитр один и
// смотрит на сам браузер: оборачивает getUserMedia и start() у SpeechRecognition
// (Аркада, Глаголы и живая акустика IELTS слушают через него, а не через поток).
//
// Чужой запрос микрофона сначала синхронно зовёт onClaim — «ухо» гасит свой поток
// ДО того, как раздел получит свой: iPhone плохо делит микрофон между потоками, и
// раздел мог бы получить тишину. Занят — с самого запроса (пока браузер спрашивает
// разрешение, «ухо» не должно схватить микрофон обратно) и пока жива хоть одна
// чужая дорожка или идёт чужое распознавание. Живость дорожки — опросом
// readyState: после track.stop() браузер события ended не шлёт.
//
// Не видит код, который сохранил ссылку на getUserMedia ДО установки арбитра; в
// приложении таких мест нет — все зовут navigator.mediaDevices.getUserMedia в момент
// записи. Ставится, только пока ученик включил позывной: без него браузерные
// функции нетронуты.

const POLL_MS = 1000

let own = 0
let state = null

/** Вызов getUserMedia самого «уха» — его арбитр не считает чужим. fn — синхронный. */
export function withOwnMic(fn) {
  own += 1
  try {
    return fn()
  } finally {
    own -= 1
  }
}

function computeBusy(s) {
  for (const t of s.tracks) if (t.readyState === 'ended') s.tracks.delete(t)
  return s.tracks.size > 0 || s.recs.size > 0
}

function refresh() {
  if (!state) return
  const busy = computeBusy(state)
  if (busy === state.busy) return
  state.busy = busy
  for (const fn of state.listeners) fn(busy)
}

function claim() {
  for (const fn of state.claims) fn()
}

function wrapGetUserMedia(md, restore) {
  const orig = md.getUserMedia
  const hadOwn = Object.prototype.hasOwnProperty.call(md, 'getUserMedia')
  md.getUserMedia = function getUserMedia(constraints) {
    if (own > 0 || !state || !constraints?.audio) return orig.call(this, constraints)
    claim()
    const pending = { readyState: 'live' }
    state.tracks.add(pending)
    refresh()
    return orig.call(this, constraints).then(
      (stream) => {
        if (state) {
          state.tracks.delete(pending)
          for (const t of stream.getAudioTracks()) state.tracks.add(t)
          refresh()
        }
        return stream
      },
      (err) => {
        if (state) {
          state.tracks.delete(pending)
          refresh()
        }
        throw err
      },
    )
  }
  restore.push(() => {
    if (hadOwn) md.getUserMedia = orig
    else delete md.getUserMedia
  })
}

function wrapRecognition(proto, restore) {
  const orig = proto.start
  proto.start = function start(...args) {
    if (!state) return orig.apply(this, args)
    claim()
    const rec = this
    const done = () => {
      rec.removeEventListener?.('end', done)
      rec.removeEventListener?.('error', done)
      if (state) {
        state.recs.delete(rec)
        refresh()
      }
    }
    rec.addEventListener?.('end', done)
    rec.addEventListener?.('error', done)
    state.recs.add(rec)
    refresh()
    try {
      return orig.apply(this, args)
    } catch (err) {
      done()
      throw err
    }
  }
  restore.push(() => {
    proto.start = orig
  })
}

function install(win) {
  const restore = []
  const md = win.navigator?.mediaDevices
  if (md?.getUserMedia) wrapGetUserMedia(md, restore)
  const seen = new Set()
  for (const key of ['SpeechRecognition', 'webkitSpeechRecognition']) {
    const proto = win[key]?.prototype
    if (!proto?.start || seen.has(proto)) continue
    seen.add(proto)
    wrapRecognition(proto, restore)
  }
  return restore
}

/**
 * Поставить арбитра. Одиночка со счётчиком: снимается, когда снят последний.
 * @param {{ onClaim?: () => void, win?: object }} [opts]
 * @returns {{ isBusy: () => boolean, subscribe: (fn: (busy: boolean) => void) => () => void, uninstall: () => void }}
 */
export function installMicArbiter({ onClaim, win = globalThis.window } = {}) {
  if (!win) return { isBusy: () => false, subscribe: () => () => {}, uninstall: () => {} }
  if (!state) {
    state = { refs: 0, restore: [], tracks: new Set(), recs: new Set(), listeners: new Set(), claims: new Set(), busy: false, timer: null }
    state.restore = install(win)
    state.timer = setInterval(refresh, POLL_MS)
  }
  const mine = state
  mine.refs += 1
  if (onClaim) mine.claims.add(onClaim)
  const subs = new Set()
  let gone = false
  return {
    isBusy: () => (state === mine ? computeBusy(mine) : false),
    subscribe(fn) {
      mine.listeners.add(fn)
      subs.add(fn)
      return () => {
        mine.listeners.delete(fn)
        subs.delete(fn)
      }
    },
    uninstall() {
      if (gone) return
      gone = true
      if (onClaim) mine.claims.delete(onClaim)
      for (const fn of subs) mine.listeners.delete(fn)
      mine.refs -= 1
      if (mine.refs > 0 || state !== mine) return
      clearInterval(mine.timer)
      for (const undo of mine.restore) undo()
      state = null
    },
  }
}
